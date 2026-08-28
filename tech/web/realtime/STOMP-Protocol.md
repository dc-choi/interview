---
tags: [web, websocket, stomp, messaging, pubsub, spring]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["STOMP", "STOMP Protocol", "STOMP 서브 프로토콜"]
verified_at: 2026-08-28
---

# STOMP 서브 프로토콜

STOMP(Simple Text Oriented Messaging Protocol)는 신뢰할 수 있는 양방향 stream 위에서 동작하는 **프레임 기반 메시징 프로토콜**이다. TCP와 WebSocket 모두에서 사용할 수 있으며, 브라우저에서는 흔히 STOMP-over-WebSocket으로 쓴다. WebSocket이 애플리케이션 메시지 구조를 정의하지 않는 부분을 STOMP의 명령, header, body frame으로 보완한다.

## 왜 필요한가

- WebSocket 자체는 **메시지 포맷을 정의하지 않는다** — 서버, 클라이언트가 매번 고유 포맷을 만들어야 함
- 구조화된 메시지(발행, 구독, 확인, 인증)를 서브 프로토콜로 표준화하면, **메시지 브로커와 WebSocket 클라이언트를 통합**해 pub/sub을 쉽게 구현할 수 있다
- WebSocket transport에서는 핸드셰이크의 `Sec-WebSocket-Protocol`으로 STOMP subprotocol을 합의할 수 있다. raw TCP transport에는 HTTP/WebSocket 핸드셰이크가 없음

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

## 핵심 개념: Destination, Broker

- **Destination** — 토픽/큐 경로. 관례적으로 `/topic/*`은 pub/sub 브로드캐스트, `/queue/*`은 p2p
- **Message Broker** — Destination 단위로 메시지를 라우팅하는 컴포넌트
  - **Simple Broker**: 애플리케이션 메모리 기반. 개발, 소규모
  - **Full Broker(RabbitMQ, ActiveMQ)**: STOMP를 네이티브 지원하는 외부 브로커. 확장, 영속성, 클러스터링
- **Application Destination Prefix** — 컨트롤러 메서드로 라우팅할 경로 prefix. `/publish/*` → `@MessageMapping` 매핑

## Spring에서의 STOMP 설정 모델

- `@EnableWebSocketMessageBroker` — STOMP 기반 메시지 브로커 활성화
- `registerStompEndpoints()` — STOMP-over-WebSocket 핸드셰이크 엔드포인트(`/ws-connection`) 등록, SockJS fallback 여부 선택
- `configureMessageBroker()` — Simple/External 브로커 선택, `/topic`, `/queue` prefix 등록
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

- **서버 인스턴스가 여러 대** → Simple Broker는 인스턴스 내부에만 팬아웃된다. RabbitMQ처럼 STOMP를 지원하는 외부 broker는 Spring의 STOMP broker relay로 연결한다. Redis Pub/Sub를 쓰려면 애플리케이션이 구독한 메시지를 각 인스턴스의 WebSocket session으로 다시 보내는 backplane을 별도로 구현한다
- **인증** — HTTP/WebSocket handshake 인증과 STOMP 인증을 구분한다. STOMP `CONNECT` frame의 header로 토큰을 보냈다면 `ChannelInterceptor`에서 검증하고 `SimpMessageHeaderAccessor.setUser()`로 session에 연결한다
- **순서 보장** — STOMP 사양만으로 destination의 전달 순서를 보장하지 않는다. Spring의 inbound와 outbound channel도 기본적으로 병렬 처리한다. 같은 세션의 outbound 순서가 필요하면 `setPreservePublishOrder(true)`, inbound 순서가 필요하면 `setPreserveReceiveOrder(true)`를 켜고, 외부 브로커와 백본의 보장은 별도로 확인
- **ACK 모드** — 기본 `auto`. 명시적 확인에는 `client` 또는 `client-individual`과 `ACK`/`NACK`을 사용한다. 연결 실패 뒤 durable subscription, redelivery와 `NACK` 처리 방식은 broker별 설정을 확인해야 하며 ACK 모드만으로 at-least-once를 단정하지 않는다

## 흔한 함정

- **비즈니스 로직을 `@MessageMapping` 컨트롤러에 몰아넣기** → HTTP 컨트롤러와 동일하게 Application Service로 위임
- **Simple Broker로 스케일 아웃** → 인스턴스 간 메시지가 공유되지 않음. STOMP broker relay 또는 애플리케이션 수준 backplane 필요
- **Destination에 사용자별 식별자를 그대로 노출** → 탐침으로 타인 채널 구독 가능. Spring Security message authorization 또는 inbound `ChannelInterceptor`에서 SUBSCRIBE destination 권한을 검사한다. `@SubscribeMapping`은 routing annotation이지 권한 경계가 아니다
- **SockJS 없이 브라우저만 지원한다고 가정** → 일부 네트워크에서 WebSocket이 막히면 fallback 불가

## 면접 체크포인트

- STOMP-over-WebSocket에서 STOMP를 **서브 프로토콜**로 협상하는 이유와 raw TCP에서도 사용할 수 있다는 점
- Destination, Broker, Application Destination Prefix의 구분
- Simple Broker와 External Broker의 차이, 확장 시 선택 기준
- `@MessageMapping`과 `convertAndSend`의 역할 분리
- STOMP 세션 인증을 어디서 처리하는가(ChannelInterceptor)
- Redis 애플리케이션 backplane과 RabbitMQ STOMP broker relay의 차이

## 출처
- [STOMP, Specification 1.2](https://stomp.github.io/stomp-specification-1.2.html)
- [Spring Framework, STOMP overview](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/overview.html)
- [Spring Framework, Token Authentication](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html)
- [Spring Framework, Authorization](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/authorization.html)
- [Spring Framework, External Broker](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/handle-broker-relay.html)
- [Spring Framework, Order of Messages](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/ordered-messages.html)
- [Tecoble — WebSocket과 STOMP 실습](https://tecoble.techcourse.co.kr/post/2021-09-05-web-socket-practice/)

## 관련 문서
- [[WebSocket|WebSocket]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Redis-Architecture|Redis Architecture]]
