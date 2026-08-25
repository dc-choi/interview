---
tags: [nestjs, event-emitter, event-driven, decoupling]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Events", "@nestjs/event-emitter", "OnEvent"]
---

# NestJS Events — @nestjs/event-emitter

인프로세스 옵저버 구현 (내부는 eventemitter2). 발행자와 리스너를 분리해 한 이벤트에 서로 독립인 리스너 여럿을 붙인다. `EventEmitterModule.forRoot()`로 켜며, **선언적 리스너 등록은 onApplicationBootstrap 시점**이다.

## 발행과 구독

```ts
// 발행
constructor(private eventEmitter: EventEmitter2) {}
this.eventEmitter.emit('order.created', new OrderCreatedEvent({ orderId: 1 }));

// 구독
@OnEvent('order.created')
handleOrderCreatedEvent(payload: OrderCreatedEvent) { ... }
```

- forRoot 옵션: `wildcard`(기본 false — 켜면 `order.*` 매칭과 이벤트명 배열 가능), `delimiter`(기본 `.`), `maxListeners`(기본 10 — 초과 시 누수 경고, `verboseMemoryLeak`로 이벤트명 표시), `ignoreErrors`.
- `@OnEvent` 옵션: `{ async: true }`(비동기 실행), `prependListener`, `suppressErrors`.
- **구독자는 request-scoped 불가** (공식 경고).

## 함정 1 — 리스너 에러는 기본 억제

`suppressErrors`의 **기본값이 true** — 리스너에서 던진 에러가 기본적으로 밖으로 전파되지 않는다. 이벤트 처리 실패를 감지하려면 리스너 안에서 자체 로깅/알림을 하거나 `suppressErrors: false`로 던지게 바꾼다.

## 함정 2 — 부트스트랩 전 발행은 유실

onApplicationBootstrap 완료 전(모듈 생성자, onModuleInit)에 emit하면 EventSubscribersLoader가 리스너 등록을 못 끝낸 상태라 이벤트가 유실될 수 있다. 그 시점에 발행해야 하면:

```ts
await this.eventEmitterReadinessWatcher.waitUntilReady();
this.eventEmitter.emit('order.created', ...);
```

부트스트랩 완료 후 발행에는 불필요.

## 경계 — 인프로세스라는 것

- 인스턴스 N개면 이벤트는 **발행한 프로세스 안에서만** 전달된다. 인스턴스 간 전파, 영속, 재시도가 필요하면 브로커로 ([[Event-Driven-Patterns]], [[Messaging-Broker-Comparison]]).
- 같은 트랜잭션 보장이 필요한 통보를 이벤트로 끊으면 정합성이 깨진다 — 그 경우는 Facade가 정공법 ([[NestJS-Circular-Dependency-Overview|순환 의존 전략 비교]]).

## 관련 문서

- [[NestJS-Circular-Dependency-Refactoring|순환 의존 리팩토링 (Event 패턴 활용처)]]
- [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴 (브로커 레벨)]]
- [[NestJS-Lifecycle|Lifecycle (onApplicationBootstrap, 리스너 정리)]]

## 출처
- [NestJS — Events](https://docs.nestjs.com/techniques/events)
