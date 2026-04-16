---
tags: [web, websocket, stomp, messaging, pubsub, spring]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["STOMP", "STOMP Protocol", "STOMP 서브 프로토콜"]
---

# STOMP 서브 프로토콜

STOMP(Simple Text Oriented Messaging Protocol)는 WebSocket 위에서 동작하는 **텍스트 기반 메시징 서브 프로토콜**이다. WebSocket이 프레임 포맷만 제공하고 메시지 구조는 애플리케이션에 맡기는 한계를, STOMP가 HTTP와 유사한 명령(frame) 형식으로 보완한다.

## 왜 필요한가

- WebSocket 자체는 **메시지 포맷을 정의하지 않는다** — 서버·클라이언트가 매번 고유 포맷을 만들어야 함
- 구조화된 메시지(발행·구독·확인·인증)를 서브 프로토콜로 표준화하면, **메시지 브로커와 WebSocket 클라이언트를 통합**해 pub/sub을 쉽게 구현할 수 있다
- 핸드셰이크 시 `Sec-WebSocket-Protocol: v12.stomp`로 합의

## STOMP 프레임 구조

HTTP와 유사하게 `COMMAND / Headers / Body` 3단 구성.

```
SEND
destination:/publish/messages
content-type:application/json
content-length:42

{"roomId":5,"message":"hi"}
^@
```

- `^@`(null byte)가 프레임 종결 문자
- 주요 COMMAND: `CONNECT`, `SEND`, `SUBSCRIBE`, `UNSUBSCRIBE`, `ACK`, `NACK`, `DISCONNECT`, `MESSAGE`(서버→클라), `RECEIPT`, `ERROR`

## 핵심 개념: Destination · Broker

- **Destination** — 토픽/큐 경로. 관례적으로 `/topic/*`은 pub/sub 브로드캐스트, `/queue/*`은 p2p
- **Message Broker** — Destination 단위로 메시지를 라우팅하는 컴포넌트
  - **Simple Broker**: 애플리케이션 메모리 기반. 개발·소규모
  - **Full Broker(RabbitMQ·ActiveMQ)**: STOMP를 네이티브 지원하는 외부 브로커. 확장·영속성·클러스터링
- **Application Destination Prefix** — 컨트롤러 메서드로 라우팅할 경로 prefix. `/publish/*` → `@MessageMapping` 매핑

## Spring에서의 STOMP 설정 모델

- `@EnableWebSocketMessageBroker` — STOMP 기반 메시지 브로커 활성화
- `registerStompEndpoints()` — 핸드셰이크 엔드포인트(`/ws-connection`) 등록, SockJS fallback 여부 선택
- `configureMessageBroker()` — Simple/External 브로커 선택, `/topic`·`/queue` prefix 등록
- `setApplicationDestinationPrefixes()` — 서버 라우팅 prefix(예: `/publish`)
- `@MessageMapping("/messages")` — 클라가 `/publish/messages`로 보낸 SEND를 처리
- `SimpMessagingTemplate.convertAndSend("/topic/rooms/5", payload)` — 브로커로 발행 → 구독자에게 팬아웃

## 메시지 흐름

1. 클라이언트가 `CONNECT`로 세션 수립, 이어서 `SUBSCRIBE /topic/rooms/5`
2. 다른 클라이언트가 `SEND /publish/messages` + body로 발행
3. 서버(`@MessageMapping`)가 처리 후 `convertAndSend("/topic/rooms/5", msg)`
4. Broker가 해당 destination의 구독자 전원에게 `MESSAGE` 프레임 전송
5. 구독자 콜백 실행

## 확장 고려사항

- **서버 인스턴스가 여러 대** → Simple Broker는 인스턴스 내부에만 팬아웃되므로 한계. **Redis Pub/Sub 또는 RabbitMQ STOMP**로 교체해 모든 서버에 전파
- **인증** — 핸드셰이크(`CONNECT`)에서 토큰을 헤더로 전달 → `ChannelInterceptor`로 검증 후 `SimpMessageHeaderAccessor.setUser()`로 세션에 붙임
- **순서 보장** — 같은 사용자·같은 destination 내에서는 브로커가 순서를 유지. Pub/Sub 백본(Redis) 도입 시 채널 키 설계로 보장
- **ACK 모드** — 기본 `auto`. 브로커에서 at-least-once가 필요하면 `client` 모드 + `ACK`/`NACK`

## 흔한 함정

- **비즈니스 로직을 `@MessageMapping` 컨트롤러에 몰아넣기** → HTTP 컨트롤러와 동일하게 Application Service로 위임
- **Simple Broker로 스케일 아웃** → 인스턴스 간 메시지가 섞이지 않음. External Broker 또는 Redis relay 필수
- **Destination에 사용자별 식별자를 그대로 노출** → 탐침으로 타인 채널 구독 가능. 서버 측 권한 체크(`@SubscribeMapping` or Interceptor) 필수
- **SockJS 없이 브라우저만 지원한다고 가정** → 일부 네트워크에서 WebSocket이 막히면 fallback 불가

## 면접 체크포인트

- STOMP가 WebSocket 위에 얹히는 **서브 프로토콜**인 이유(WebSocket의 포맷 부재)
- Destination · Broker · Application Destination Prefix의 구분
- Simple Broker와 External Broker의 차이, 확장 시 선택 기준
- `@MessageMapping`과 `convertAndSend`의 역할 분리
- STOMP 세션 인증을 어디서 처리하는가(ChannelInterceptor)
- Redis Pub/Sub·RabbitMQ를 relay로 쓰는 이유

## 출처
- [Tecoble — WebSocket과 STOMP 실습](https://tecoble.techcourse.co.kr/post/2021-09-05-web-socket-practice/)

## 관련 문서
- [[WebSocket|WebSocket]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Redis-Architecture|Redis Architecture]]
