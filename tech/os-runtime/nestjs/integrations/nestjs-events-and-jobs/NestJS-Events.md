---
tags: [nestjs, event-emitter, event-driven, decoupling]
status: done
verified_at: 2026-09-22
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

`suppressErrors`의 **기본값이 true** — 리스너에서 던진 에러가 기본적으로 밖으로 전파되지 않는다. 이벤트 처리 실패를 감지하려면 리스너 안에서 자체 로깅/알림을 한다. 기본 리스너 실행 설정에서 발행자가 실패를 받아야 한다면 `suppressErrors: false`로 바꾸고 `await eventEmitter.emitAsync(...)`로 처리 결과를 기다린다. `emit()`를 감싼 동기 `try/catch`만으로는 Promise rejection을 받지 못한다.

## 함정 2 — 부트스트랩 전 발행은 유실

onApplicationBootstrap 완료 전(모듈 생성자, onModuleInit)에 emit하면 EventSubscribersLoader가 리스너 등록을 못 끝낸 상태라 이벤트가 유실될 수 있다. 초기 이벤트는 bootstrap caller가 `app.init()`을 await하고 리스너 등록 성공까지 확인한 뒤 발행한다.

```ts
const app = await NestFactory.create(AppModule);
await app.init();
await app.get(EventEmitterReadinessWatcher).waitUntilReady();
await app.listen(3000);

app.get(EventEmitter2).emit('order.created', new OrderCreatedEvent({ orderId: 1 }));
```

`EventEmitterReadinessWatcher`는 `@nestjs/event-emitter`에서 가져온다. `onModuleInit` 안에서 `waitUntilReady()`를 await하면 이후 bootstrap hook이 시작하지 못해 교착된다. 위처럼 init이 끝난 뒤 기다리면 교착 없이 등록 실패도 받을 수 있다. loader가 등록 오류를 watcher에 기록하고 bootstrap 자체는 완료할 수 있으므로 init 성공만으로 등록 성공을 단정하지 않는다. watcher는 리스너 등록만 확인하며, `emit()`가 리스너 처리 완료나 오류 전파까지 기다려 주는 것은 아니다.

## 경계 — 인프로세스라는 것

- 인스턴스 N개면 이벤트는 **발행한 프로세스 안에서만** 전달된다. 인스턴스 간 전파, 영속, 재시도가 필요하면 브로커로 ([[Event-Driven-Patterns]], [[Messaging-Broker-Comparison]]).
- 같은 트랜잭션 보장이 필요한 통보를 이벤트로 끊으면 정합성이 깨진다 — 그 경우는 Facade가 정공법 ([[NestJS-Circular-Dependency-Overview|순환 의존 전략 비교]]).

## 관련 문서

- [[NestJS-Circular-Dependency-Refactoring|순환 의존 리팩토링 (Event 패턴 활용처)]]
- [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴 (브로커 레벨)]]
- [[NestJS-Lifecycle|Lifecycle (onApplicationBootstrap, 리스너 정리)]]

## 출처
- [NestJS — Events](https://docs.nestjs.com/techniques/events)
- [nestjs/event-emitter, EventSubscribersLoader 3.0.1](https://github.com/nestjs/event-emitter/blob/3.0.1/lib/event-subscribers.loader.ts)
