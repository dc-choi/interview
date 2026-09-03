---
tags: [web, websocket, redis, pubsub, chat, realtime, reactive, webflux]
status: done
verified_at: 2026-09-03
category: "웹&네트워크(Web&Network)"
aliases: ["Realtime Chat Architecture", "실시간 채팅 아키텍처", "WebSocket + Redis Pub/Sub"]
---

# 실시간 채팅 시스템 아키텍처

실시간 채팅, 라이브 스트리밍, 알림 시스템의 표준 패턴: **WebSocket**(클라이언트 연결) + **Pub/Sub**(서버 간 메시지 팬아웃) + **논블로킹 I/O**(Reactor/리액티브). 채팅 SaaS나 푸시 알림 서비스로 해결하지 못하는 요구(초당 수만 건, 특수 로직)가 있을 때 자체 구현하며, 대표적 시행착오는 세션 누수, 프런트 렌더링 폭증.

## 핵심 명제

- **실시간성 = WebSocket** — 양방향, 저지연 (폴링, SSE로는 한계)
- **수평 확장 = Pub/Sub** — 서버 인스턴스가 여러 대일 때 클라이언트가 어느 서버에 붙든 모든 서버가 같은 메시지 전달
- **논블로킹 I/O 필수** — 서버당 수만 커넥션을 유지하려면 스레드-per-connection은 실패. WebFlux, Node.js, Netty 같은 이벤트 루프 기반
- **스케일 병목은 애플리케이션이 아닌 다운스트림** — DB, 외부 API 호출을 임계 경로에서 분리
- **프런트엔드 렌더링이 숨은 병목** — 초당 수백 건 메시지가 DOM에 쏟아지면 UI 블로킹

## 핵심 요구사항

일반 HTTP 서비스와 달리 **지속 연결**(수분~수시간), **높은 동시성**(서버당 1만~10만), **낮은 지연**(수십 ms), **브로드캐스트 증폭**(한 방 수천 명), **순서 보장**, **연결 복구**(재연결 + 누락 복구)가 필요.

## 통신 프로토콜 선택

| 방식 | 장단점 | 채팅 적합도 |
|---|---|---|
| **Long Polling** | HTTP 호환, 매번 연결, 지연 큼 | ✗ |
| **SSE** | HTTP 자동 재연결, **단방향** | △ 알림, 피드만 |
| **WebSocket** | 양방향, 저지연, 표준, 프록시 이슈 | ✅ 채팅 표준 |
| **HTTP/3 WebTransport** | UDP, QUIC, 초기 단계 | 미래 |

## 표준 아키텍처

```
클라이언트 (WebSocket)
    ↓
[LB / Sticky Session]
    ↓
채팅 서버 N대 (WebFlux, Netty, Node)
    ↓ 영구 메시지 기록
[내구성 경로: DB / Redis Streams / Kafka]  (messageId, roomSequence 기록)
    ↓ 저장 성공 후 ACK, 이벤트 발행
[Redis Pub/Sub] ──→ 채팅 서버들  (연결된 구독자 실시간 팬아웃)

[휘발 상태: Redis]  [과거 메시지 조회: DB / Stream / Log API]
```

**분리된 책임**:
- **WebSocket**: 실시간 이벤트만 (메시지 전송, 수신)
- **REST API**: 관리 기능 (방 생성, 프로필, 입장 전 과거 메시지 조회)
- **Redis**: 방 상태, 접속자 수, 휘발 데이터
- **Redis Pub/Sub**: at-most-once로 연결된 서버와 세션에만 실시간 팬아웃. 보존, 재전송, 수신 ACK 책임 없음
- **내구성 경로**: DB, 영속성을 구성한 Redis Streams, 적절한 복제와 ACK를 설정한 Kafka에 메시지와 방별 sequence 기록
- **DB / Stream / Log API**: 과거 메시지와 sequence 범위 재조회

## 구현 원칙 5가지

### 1. WebSocket 프로토콜 최소화

서버가 처리하는 WS 명령은 `MESSAGE_REQ` 하나면 충분. 방 생성, 입장, 프로필 등은 REST로 분리. 커맨드 분기가 많아지면 디버깅, 버전 관리가 어려워짐.

### 2. RDB 직접 접근 배제

이벤트 루프에서 블로킹 RDB 쿼리를 기다리면 전체 커넥션이 블로킹. 휘발 데이터(방 생존, 접속자 수)는 Redis로 처리하고, 영구 메시지는 논블로킹 저장소 클라이언트나 전용 writer로 DB, Redis Streams, Kafka에 먼저 기록한다. Redis Pub/Sub은 이 경로의 버퍼가 아니라 저장 후 연결된 구독자에게 이벤트를 보내는 용도다.

### 3. 리액티브 스택

```java
// WebFlux 예시
public Mono<Void> handle(WebSocketSession session) {
  Mono<Void> input = session.receive().concatMap(msg ->
      messageStore.append(roomId, msg) // durable write returns messageId and roomSequence
          .flatMap(saved -> pubSub.publish(roomId, saved))).then();
  Flux<WebSocketMessage> output = pubSub.subscribe(roomId).map(session::textMessage);
  return session.send(output).and(input);
}
```

위 축약 예제는 저장 후 팬아웃만 보여 주며 ACK 프레임 전송은 생략했다. 실제 프로토콜에서는 `append` 결과를 같은 outbound 흐름에 합쳐 송신자에게 `ACK(messageId, roomSequence)`를 보내야 한다. 재연결하거나 sequence gap을 감지한 클라이언트는 마지막 `roomSequence`를 보내고, REST API가 `sequence > lastSequence`를 재조회해 Pub/Sub 미수신분을 복구한다.

### 4. Heartbeat / Ping-Pong

25초 주기로 ping→pong. 좀비 커넥션 감지 + 프록시(LB, CDN) idle timeout(보통 60초) 회피.

### 5. Sticky Session vs Stateless

- **Sticky**: LB가 세션을 특정 서버에 고정. 구현 쉬움, 확장성 제한
- **Stateless + Pub/Sub**: 어느 서버든 Pub/Sub으로 메시지 전달. 확장성 최상

## 주요 시행착오

### 1. WebSocket 세션 누수 (Max sessions 초과)

WebFlux에서 `ServerWebExchange.getSession()`을 호출하는 것만으로 세션이 store에 등록되지는 않는다. 세션에 attribute를 넣거나 `start()`를 호출해 started 상태로 만든 뒤 응답이 커밋될 때 `InMemoryWebSessionStore`에 저장된다. 아래 나쁜 예처럼 핸드셰이크마다 토큰을 넣고 만료시키지 않으면 누적되어 `Max sessions limit reached`로 신규 연결이 거부될 수 있다. 해결은 **`WebSocketHandler` 데코레이터 패턴**으로 HTTP 세션 생성을 피하고 `WebSocketSession.getAttributes()`에만 저장하는 것이다.

```java
// 나쁜 예: HTTP 세션 생성
exchange.getSession().doOnNext(s -> s.getAttributes().put(KEY, token));

// 좋은 예: WebSocketSession에만 저장
WebSocketHandler decorated = session -> {
  session.getAttributes().put(KEY, token);
  return delegate.handle(session);
};
```

### 2. 어드민 화면 렌더링 폭증

수만 명 라이브 방에서 어드민이 초당 수백 건 메시지를 React state에 그대로 push → 매 메시지 리렌더로 브라우저 멈춤. 해결은 **리스트 가상화**(`react-virtualized`로 화면 밖 DOM 제거, 부분적)와 **메시지 배칭**(결정적):

```js
const BATCH_SIZE = 50;
const BATCH_INTERVAL = 50; // ms

const onMessage = (msg) => {
  bufferRef.current.push(msg);
  if (bufferRef.current.length >= BATCH_SIZE) {
    flush();
  } else if (!timerRef.current) {
    timerRef.current = setTimeout(flush, BATCH_INTERVAL);
  }
};

const flush = () => {
  setMessages(prev => [...prev, ...bufferRef.current]);
  bufferRef.current = [];
  timerRef.current = null;
};
```

50개 쌓이거나 50ms 경과 시 한 번에 state 업데이트. **가상화 + 배칭** 조합이 최적.

## 외부 솔루션 검토 vs 자체 구현

| 고려 요소 | Sendbird, PubNub | FCM | 자체 구현 |
|---|---|---|---|
| 초기 도입 속도 | 빠름 | 빠름 | 느림 |
| 요구사항 유연성 | 제한적 | 푸시 알림용이며 양방향 채팅 전송을 대체하지 않음. Android는 단일 기기당 분당 240건 제한 | 자유 |
| 비용 | 사용량 기반, 커지면 부담 | 저렴 | 인프라 + 인건비 |
| 운영 부담 | 적음 | 적음 | 큼 |
| 벤더 종속 | 있음 | 있음 | 없음 |

**자체 구현이 정당화되는 경우**:
- 지속 연결과 양방향 전송이 필요해 푸시 알림 모델로 요구를 충족할 수 없음
- 비즈니스 로직(실시간 선물, 경매, 인증)과 깊이 결합
- 레이턴시가 중요한 도메인 (게임, 라이브 스트림)
- 이미 리액티브, WebSocket 운영 경험 있는 팀

## 스케일링 고려사항

- **커넥션 분산**: LB가 sticky가 아닌 일반 분산 + Pub/Sub로 backhaul
- **영구 메시지와 복구**: Redis Pub/Sub은 현재 연결의 실시간 팬아웃만 담당한다. DB, Redis Streams, Kafka 같은 내구성 경로에 먼저 기록하고 ACK하며, 재연결 시 `lastSequence` 이후를 재조회하고 `messageId`로 중복을 제거한다
- **Hot Room**: 한 방에 수만 명 접속 시 특정 Pub/Sub 채널에 트래픽 집중 → 샤딩, 다중 채널
- **Presence**: 접속자 목록은 Set(수는 `SCARD`)이나 heartbeat 타임스탬프를 score로 둔 Sorted Set(수는 `ZCARD`, 유령 커넥션은 `ZREMRANGEBYSCORE`로 정리)으로 관리. HyperLogLog는 제거가 불가해 현재 접속자 수가 아니라 기간별 고유 방문 집계용
- **연결 감시**: Heartbeat + idle 커넥션 타임아웃 + 서버 재시작 시 우아한 종료(graceful shutdown)

## 흔한 함정

- **WebSocket 위에 모든 기능 올리기** — REST로 가능한 것까지 WS로 → 디버깅 지옥
- **RDB 동기 호출** — 이벤트 루프 블로킹 → 전체 커넥션 지연
- **Sticky Session 맹신** — 한 서버 장애 시 해당 사용자 일괄 재연결
- **Heartbeat 없음** — 좀비 커넥션, 프록시 idle timeout으로 유령 접속 발생
- **어드민 DOM 폭증 무시** — 메시지 많은 방에서 관리자 화면이 먼저 죽음
- **Presence를 실시간 DB 쿼리로** — 커넥션 수천 개 * 쿼리 = 즉시 장애
- **Pub/Sub 전달만으로 영구 순서를 가정** — 연결이 끊긴 동안의 이벤트는 Pub/Sub에서 복구할 수 없다. 방별 `roomSequence`를 저장하고 재조회 결과로 순서를 맞춘다

## 면접 체크포인트

- **WebSocket vs SSE vs Long Polling** 선택 기준
- 표준 아키텍처 구성: **WebSocket + Pub/Sub + 리액티브 스택**
- 수평 확장에서 **Pub/Sub의 역할**
- **세션 누수** 원인과 데코레이터 패턴 회피
- **프런트 렌더링 병목**과 메시지 배칭 전략
- 자체 구현 vs 외부 SaaS 판단 기준
- **Hot Room, Presence, Heartbeat** 같은 스케일링 고려 포인트
- Redis Pub/Sub vs Kafka 선택 기준 (보존 필요 여부)

## 출처
- [Firebase, FCM Throttling and Quotas](https://firebase.google.com/docs/cloud-messaging/throttling-and-quotas) (2026-08-26 확인)
- [Redis, Redis Pub/sub](https://redis.io/docs/latest/develop/pubsub/) (2026-08-26 확인)
- [Apache Kafka, Introduction](https://kafka.apache.org/documentation/) (2026-08-26 확인)
- [Reactor Core, Flux.concatMap](https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Flux.html)
- [Spring Framework, InMemoryWebSessionStore](https://raw.githubusercontent.com/spring-projects/spring-framework/main/spring-web/src/main/java/org/springframework/web/server/session/InMemoryWebSessionStore.java)
- [우아한형제들 기술블로그 — 배민쇼핑라이브를 만드는 기술: 채팅 편](https://techblog.woowahan.com/5268/)

## 관련 문서
- [[WebSocket|WebSocket]]
- [[Fan-Out-Architecture|Fan-out Architecture]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴]]
- [[Cache-Strategies|Cache 전략]]
- [[Redis-Architecture|Redis Architecture]]
- [[Latency-Optimization|레이턴시 최적화]]
