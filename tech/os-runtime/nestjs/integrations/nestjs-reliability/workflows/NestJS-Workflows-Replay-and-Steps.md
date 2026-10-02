---
tags: [nestjs, workflow, durability, idempotency]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Durable Workflow의 replay와 step"]
---

# NestJS Durable Workflow의 replay와 step

Durable workflow는 여러 side effect와 장시간 대기를 journal에 기록해 restart 뒤 이어 가는 실행이다. `@nestjs/workflows`는 별도 workflow server 대신 application DB의 store와 process 안의 worker를 사용한다.

## Queue, saga와 선택

한 번의 이메일/영상 변환이나 지연 취소에는 기존 queue job과 상태 row가 간단하다. CQRS saga는 process 안에서 event를 command로 바꾸지만 진행 중 기억이 restart에 사라질 수 있다. 여러 단계가 며칠 동안 event/timer를 기다리고 실패 때 완료 작업을 되돌려야 한다면 workflow의 journal과 compensation이 필요해진다. 무거운 작업은 workflow step에서 queue에 맡기고 signal로 완료를 받을 수 있다.

`WorkflowsModule`은 root에 한번 등록한다. `@Workflow(name, options)` class는 ordinary singleton provider이며 `WorkflowRunner<Input, Output>`의 `run(ctx, input)`을 구현한다. 같은 instance가 여러 업무를 처리하므로 `this`에 per-run state를 두지 않는다.

## 완료 결과를 재생하는 실행

`ctx.step(name, fn, options)`은 side effect 결과를 journal에 저장한다. resume 때 `run()`은 처음부터 다시 실행되지만 완료 step은 recorded result를 반환한다. 날짜와 class instance를 그대로 되살리는 방식이 아니라 JSON 형태로 반환하며 첫 실행도 같은 형태다. `Journaled<T>`는 Date가 string으로 바뀌는 계약을 타입에 반영한다.

step은 **at-least-once**다. 외부 결제가 성공한 뒤 journal 기록 전에 죽으면 같은 step을 다시 호출한다. `WorkflowStepContext.idempotencyKey`인 `<instance id>:<step name>`을 외부 API에 전달하거나 DB unique key로 저장해 실제 effect의 중복을 흡수한다. compensation도 자기 idempotency key를 받아 같은 원칙을 적용한다.

기본 step retry는 첫 실행 포함 3회, 1초에서 두 배, 최대 5분, jitter 없음이다. step retry 옵션은 module 옵션 위에 field별로 합쳐진다. 실패한 attempt의 backoff도 durable wait이므로 process가 죽어도 보존한다. `NonRetryableStepError`와 `retryIf` false는 바로 실패한다. timeout은 한 attempt, workflow timeout은 instance의 시작부터 종료까지다.

## Replay 안전성

- HTTP/DB read/write와 feature flag 조회는 step 안에 둔다. 바깥은 기록된 입력/결과에 대한 pure computation만 한다.
- step 바깥의 시간/난수는 journaled `ctx.now()`, `ctx.random()`, `ctx.uuid()`를 쓴다.
- step/sleep/wait/commit 이름은 한 run에서 unique하고 deploy 뒤 기존 journal과 호환되어야 한다.
- step 안에서 ctx 메서드를 중첩 호출하지 않는다. 영구 오류는 step에서 NonRetryableStepError로 throw한다.
- ctx operation과 pure computation만 await하고 실제 timer를 기다리지 않는다.
- `Promise.all()`로 독립 step을 병렬화할 수 있다. `Promise.race()`/`Promise.any()`는 replay-safe하지 않으며 durable 경쟁은 `waitForAny()`로 표현한다.
- engine의 suspension/cancel interrupt를 catch하면 처리하지 않는 것은 다시 throw한다. finally는 suspension마다 실행되므로 side effect를 넣지 않는다.

## 장시간 step과 checkpoint

step context에는 `attempt`, abort `signal`, 저장된 `progress`와 `heartbeat(progress)`가 있다. page 단위 진행을 heartbeat로 저장하면 crash 뒤 마지막 checkpoint부터 재개한다. 저장 전에 처리한 page는 다시 실행될 수 있으므로 append 대신 overwrite 등 idempotency가 필요하다.

`heartbeatTimeout`은 살아 있는 process의 멈춘 attempt, `timeout`은 attempt 전체 기간을 제한한다. shutdown/lease loss/timeout 때 signal이 abort되므로 I/O에 전달한다. worker는 실행 중 lease를 계속 갱신한다. callback이 signal을 무시하면 실제 외부 작업을 강제로 없애지는 못한다.

## 배포의 이름 계약

journal에는 이름이 key이며 idempotency key도 그 이름에 의존한다. step의 rename/remove/reorder는 `WorkflowNonDeterminismError`로 instance를 실패시킬 수 있고 definition error에서는 compensation도 실행하지 않는다. 같은 이름의 body를 다른 의미로 바꾼 것은 engine이 감지하지 못한다.

호환되지 않는 흐름은 `@Workflow(name, { version: 2 })`의 별도 class로 배포하고 이전 class도 providers에 남긴다. 새 instance는 등록된 가장 높은 version으로 시작하며, 기존 instance는 자기 version의 worker가 claim한다. `start({ version })`으로 pin할 수 있다. 이전 version의 unfinished instance가 없어진 뒤 class를 제거한다. retry/timeout 조정과 실행 중인 instance가 아직 도달하지 않은 마지막 지점 뒤 추가는 상황에 따라 같은 version에서 가능하다.

## 출처

- [NestJS Documentation, Durable workflows](https://docs.nestjs.com/reliability/workflows)

## 관련 문서

- [[NestJS-Workflows-Signals-and-Compensation]]
- [[NestJS-Workflows-Storage-and-Transactions]]
- [[NestJS-Events-and-Jobs]]
