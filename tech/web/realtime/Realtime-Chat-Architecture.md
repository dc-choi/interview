---
tags: [web, websocket, redis, pubsub, chat, realtime, reactive, webflux]
status: done
verified_at: 2026-09-03
category: "웹&네트워크(Web&Network)"
aliases: ["Realtime Chat Architecture", "실시간 채팅 아키텍처", "WebSocket + Redis Pub/Sub"]
---

# 실시간 채팅 시스템 아키텍처

실시간 채팅의 대표 구성은 **WebSocket**(클라이언트 연결) + **Pub/Sub**(서버 간 메시지 팬아웃) + **논블로킹 I/O**(Reactor/리액티브)다. 전송 방식과 동시성 모델은 요구에 따라 달라지며, 자체 구현은 SaaS의 기능, 비용, 데이터 통제와 팀의 운영 역량을 비교해 선택한다. 아래 세션 누수와 프런트 렌더링 폭증은 배민쇼핑라이브의 공개 사례에서 얻은 교훈이다.

## 핵심 명제

- **전송 방식은 통신 방향과 빈도로 선택** — WebSocket은 같은 연결에서 양방향 전송을 지원한다. SSE 수신 + HTTP 송신도 채팅에 쓸 수 있고, Long Polling도 대안이다
- **수평 확장에는 서버 간 전달 경로 필요** — 방 채널 Pub/Sub이나 연결 레지스트리 기반 라우팅으로 수신자의 연결을 가진 서버에 보낸다
- **동시성 모델과 연결 용량을 함께 검증** — 플랫폼 스레드를 연결마다 할당하면 메모리와 스케줄링 비용이 커진다. 이벤트 루프가 대표 대안이며, 가상 스레드도 지원되는 블로킹 I/O에서 다른 작업에 OS 스레드를 내줄 수 있다 (Oracle JDK 26 문서 기준)
- **병목은 측정으로 확인** — DB와 외부 API뿐 아니라 애플리케이션 CPU, 송신 버퍼, 네트워크와 느린 수신자가 병목이 될 수 있다
- **프런트엔드도 병목 후보** — 메시지마다 state와 DOM을 갱신하면 높은 수신 빈도에서 렌더링 비용이 커질 수 있다

## 핵심 요구사항

**지속 연결**, **동시 연결 수**, **지연 목표**, **브로드캐스트 증폭**, **대화별 순서**, **연결 복구**(재연결 + 누락 복구)를 요구사항으로 정한다. 서버당 연결 수와 지연은 메시지 크기, 빈도, 하드웨어와 네트워크에 따라 달라지므로 보편 수치로 고정하지 않고 부하 테스트로 확인한다. 메시지 보존과 유실 허용 범위도 용도별로 정한다. 단체방은 쓰기 한 건이 멤버 수만큼 전달되며, 이 특성에서 나오는 수신자 기준 라우팅, 오프라인 알림과 이력 저장소 설계는 [[Realtime-Chat-Architecture-Delivery-and-Storage|메시지 전달 경로와 이력 저장소]]에서 다룬다.

## 통신 프로토콜 선택

| 방식 | 장단점 | 채팅 적합도 |
|---|---|---|
| **Long Polling** | 이벤트나 타임아웃까지 응답 대기, 응답 뒤 재요청. HTTP 연결 재사용 가능 | HTTP 호환과 fallback이 필요할 때 후보, 재요청 비용 고려 |
| **SSE** | HTTP 응답으로 서버 → 클라이언트 전송, EventSource 자동 재연결 | 수신은 SSE, 송신은 HTTP로 나누면 채팅 가능 |
| **WebSocket** | 같은 연결에서 양방향 전송, 프록시 호환성 확인 필요 | 빈번한 양방향 이벤트에 적합 |
| **WebTransport (HTTP/3)** | QUIC 기반 스트림과 데이터그램 | 다중 스트림이나 비신뢰 전송이 필요할 때 지원 환경을 확인해 검토 |

프로토콜 특성은 RFC 6202, WHATWG SSE, RFC 6455와 W3C WebTransport 명세를 따른다. 지연 우위는 실제 통신 경로와 워크로드에서 측정한다.

## 아키텍처 예시

다음은 내구성 경로와 Redis 팬아웃을 조합한 구성 예시다. 서버 간 전달은 수신자 기준 라우팅으로도 구성할 수 있다.

```
클라이언트 (WebSocket)
    ↓
[LB: 신규 연결 분산]
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
- **DB / Stream / Log API**: 과거 메시지와 sequence 범위 재조회 (저장소 선택과 키 설계는 [[Realtime-Chat-Architecture-Delivery-and-Storage#메시지 이력 저장소|이력 저장소]])

## 구현 원칙 5가지

### 1. WebSocket 프로토콜 최소화

메시지 송신은 `MESSAGE_REQ`처럼 작은 명령 집합으로 시작하고, 방 생성과 프로필 조회 등은 REST로 분리할 수 있다. ACK, 재인증과 구독 변경 등 실제 요구가 생기면 해당 명령과 응답 계약을 정의한다.

### 2. 이벤트 루프의 블로킹 접근 격리

이벤트 루프에서 블로킹 RDB 쿼리를 기다리면 그 루프가 맡은 다른 연결의 처리가 지연된다. RDB 자체를 배제할 필요는 없으며, 논블로킹 클라이언트나 별도 실행기로 블로킹 접근을 격리한다. 휘발 데이터(방 생존, 접속자 수)는 Redis로 처리할 수 있고, 영구 메시지는 DB, Redis Streams, Kafka 같은 내구성 경로에 먼저 기록한다. Redis Pub/Sub은 이 경로의 버퍼가 아니라 저장 후 연결된 구독자에게 이벤트를 보내는 용도다.

### 3. 리액티브 스택 예시

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

RFC 6455의 Ping/Pong으로 상대의 응답 여부를 확인한다. 주기와 응답 제한 시간은 실제 경로의 가장 짧은 idle timeout, 네트워크 지연과 배터리 비용에 맞춘다. 공개 사례의 25초는 구현값이며, AWS ALB의 기본 idle timeout 60초도 변경 가능한 제품 설정이다 (2026-10-02 공식 문서 확인).

### 5. 연결 고정과 재연결

- **연결 수명 동안의 고정**: 열린 WebSocket은 이를 수락한 서버에 유지된다. AWS ALB는 업그레이드 완료 뒤 쿠키 기반 stickiness를 사용하지 않는다
- **재연결과 서버 간 전달**: 재연결은 다른 서버로 갈 수 있으므로 연결 레지스트리와 Pub/Sub 등으로 메시지를 라우팅하고 내구성 경로에서 복구한다. 연결 상태는 서버에 남으며, 복구에 필요한 상태를 공유하면 재연결을 특정 서버에 묶을 필요가 줄어든다

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
  } else if (timerRef.current === null) {
    timerRef.current = setTimeout(flush, BATCH_INTERVAL);
  }
};

const flush = () => {
  clearTimeout(timerRef.current);
  const batch = bufferRef.current;
  bufferRef.current = [];
  timerRef.current = null;
  if (batch.length > 0) setMessages(prev => [...prev, ...batch]);
};
```

예시에서는 50개가 쌓이거나 50ms로 예약한 타이머가 실행되면 한 번에 state를 업데이트한다. 예약 타이머를 취소하고 버퍼를 따로 보관해야, 나중에 실행되는 React updater가 비워진 버퍼를 읽지 않는다. ref 초기값은 각각 `[]`, `null`로 두고 unmount 시 타이머와 메시지 리스너를 정리한다. 가상화는 DOM 수를 줄이며 배칭은 업데이트 빈도를 줄인다. 수치와 보관할 메시지 수는 실제 렌더링 비용에 맞춰 조정한다.

## 외부 솔루션 검토 vs 자체 구현

| 고려 요소 | Sendbird, PubNub | FCM | 자체 구현 |
|---|---|---|---|
| 초기 도입 속도 | 빠름 | 빠름 | 느림 |
| 요구사항 유연성 | 제한적 | 푸시 알림용이며 양방향 채팅 전송을 대체하지 않음. Android는 단일 기기당 분당 240건 제한 | 자유 |
| 비용 | 사용량 기반, 커지면 부담 | 저렴 | 인프라 + 인건비 |
| 운영 부담 | 적음 | 적음 | 큼 |
| 벤더 종속 | API, 데이터 모델에 따라 있음 | 푸시 제공자에 종속 | 선택한 DB, 클라우드와 운영 도구에 따라 있음 |

**자체 구현이 정당화되는 경우**:
- 지속 연결과 양방향 전송이 필요해 푸시 알림 모델로 요구를 충족할 수 없음
- 비즈니스 로직(실시간 선물, 경매, 인증)과 깊이 결합
- 레이턴시가 중요한 도메인 (게임, 라이브 스트림)
- 이미 리액티브, WebSocket 운영 경험 있는 팀

## 스케일링 고려사항

- **커넥션 분산**: LB는 신규 연결을 분산하고 열린 연결은 해당 서버에 유지한다. 서버 간 메시지는 Pub/Sub이나 수신자 기준 라우팅으로 전달한다
- **영구 메시지와 복구**: Redis Pub/Sub은 현재 연결의 실시간 팬아웃만 담당한다. DB, Redis Streams, Kafka 같은 내구성 경로에 먼저 기록하고 ACK하며, 재연결 시 `lastSequence` 이후를 재조회하고 `messageId`로 중복을 제거한다
- **Hot Room**: 한 방에 수만 명 접속 시 특정 Pub/Sub 채널에 트래픽 집중 → 샤딩, 다중 채널
- **Presence**: 접속자 목록은 Set(수는 `SCARD`)이나 heartbeat 타임스탬프를 score로 둔 Sorted Set(수는 `ZCARD`, 유령 커넥션은 `ZREMRANGEBYSCORE`로 정리)으로 관리. HyperLogLog는 제거가 불가해 현재 접속자 수가 아니라 기간별 고유 방문 집계용
- **연결 감시**: Heartbeat + idle 커넥션 타임아웃 + 서버 재시작 시 우아한 종료(graceful shutdown)

## 흔한 함정

- **WebSocket 위에 모든 기능 올리기** — REST로 가능한 것까지 WS로 → 디버깅 지옥
- **이벤트 루프에서 블로킹 호출** — 해당 루프가 맡은 연결의 처리가 지연된다. Redis나 외부 API도 클라이언트 방식에 따라 같은 문제가 생긴다
- **연결 고정을 복구 전략으로 간주** — 쿠키 sticky 설정과 무관하게 서버 장애 시 그 서버의 WebSocket 연결은 재연결과 복구가 필요하다
- **Heartbeat 없음** — 좀비 커넥션, 프록시 idle timeout으로 유령 접속 발생
- **어드민 DOM 폭증 무시** — 메시지 많은 방에서 관리자 화면이 먼저 죽음
- **Presence 조회 비용 무시** — 연결과 조회 빈도에 비례한 부하를 측정하고 공유 상태나 캐시를 검토한다
- **Pub/Sub 전달만으로 영구 순서를 가정** — 연결이 끊긴 동안의 이벤트는 Pub/Sub에서 복구할 수 없다. 방별 `roomSequence`를 저장하고 재조회 결과로 순서를 맞춘다

## 면접 체크포인트

- **WebSocket vs SSE vs Long Polling** 선택 기준
- 대표 구성 **WebSocket + Pub/Sub + 리액티브 스택**과 다른 전송, 동시성 모델을 고르는 조건
- 수평 확장에서 **Pub/Sub의 역할**
- **세션 누수** 원인과 데코레이터 패턴 회피
- **프런트 렌더링 병목**과 메시지 배칭 전략
- 자체 구현 vs 외부 SaaS 판단 기준
- **Hot Room, Presence, Heartbeat** 같은 스케일링 고려 포인트
- Redis Pub/Sub vs Kafka 선택 기준 (보존 필요 여부)
- 방 채널 브로드캐스트와 수신자 기준 라우팅의 차이, 오프라인 알림 모듈을 분리하는 이유

## 출처

2026-10-02 부분 검증: 전송 방식, 가상 스레드 대안, ALB의 연결 고정과 idle timeout, React updater 동작을 공식 자료와 대조했다. 기존 Spring 세션 예시와 SaaS 비용, 제품별 할당량 전체를 다시 검증한 기록은 아니다.

- [RFC 6202, Known Issues and Best Practices for the Use of Long Polling and Streaming in Bidirectional HTTP](https://www.rfc-editor.org/rfc/rfc6202)
- [WHATWG, Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [RFC 6455, The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455.html)
- [W3C, WebTransport](https://www.w3.org/TR/webtransport/)
- [Oracle JDK 26, Virtual Threads](https://docs.oracle.com/en/java/javase/26/core/virtual-threads.html)
- [Spring Framework, WebFlux Overview](https://docs.spring.io/spring-framework/reference/web/webflux/new-framework.html#webflux-concurrency-model)
- [AWS, Edit target group attributes for your Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html#sticky-sessions)
- [AWS, Edit attributes for your Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html#connection-idle-timeout)
- [React, useState](https://react.dev/reference/react/useState)
- [Firebase, FCM Throttling and Quotas](https://firebase.google.com/docs/cloud-messaging/throttling-and-quotas) (2026-08-26 확인)
- [Redis, Redis Pub/sub](https://redis.io/docs/latest/develop/pubsub/) (2026-08-26 확인)
- [Apache Kafka, Introduction](https://kafka.apache.org/documentation/) (2026-08-26 확인)
- [Reactor Core, Flux.concatMap](https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Flux.html)
- [Spring Framework, InMemoryWebSessionStore](https://raw.githubusercontent.com/spring-projects/spring-framework/main/spring-web/src/main/java/org/springframework/web/server/session/InMemoryWebSessionStore.java)
- [우아한형제들 기술블로그 — 배민쇼핑라이브를 만드는 기술: 채팅 편](https://techblog.woowahan.com/5268/)
- [인프런, Hong, Chat Application에 대한 시스템 디자인 설계 1편](https://www.inflearn.com/courses/lecture?courseId=336089&unitId=272704)
- [인프런, Hong, Chat Application에 대한 시스템 디자인 설계 2편](https://www.inflearn.com/courses/lecture?courseId=336089&unitId=272612)

## 관련 문서
- [[Realtime-Chat-Architecture-Delivery-and-Storage|메시지 전달 경로와 이력 저장소]]
- [[WebSocket|WebSocket]]
- [[Fan-Out-Architecture|Fan-out Architecture]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴]]
- [[Cache-Strategies|Cache 전략]]
- [[Redis-Architecture|Redis Architecture]]
- [[Latency-Optimization|레이턴시 최적화]]
