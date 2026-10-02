---
tags: [nestjs, workflow, cqrs, encryption]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Workflow의 CQRS 연결과 payload 보안"]
---

# NestJS Workflow의 CQRS 연결과 payload 보안

CQRS event와 workflow를 연결해도 일반 event handler와 saga가 durable해지는 것은 아니다. transaction에서 durable start/signal을 완료하는 부분과 기존 process 안의 event 전달을 구분한다.

## CQRS dispatcher context

`@nestjs/workflows/cqrs`의 `WorkflowsCqrsModule`을 WorkflowsModule/CqrsModule 옆에 등록한다. `@StartOn(event, { id, input, priority, ... })`와 `@SignalOn(event, { signal, key, id, payload })`를 workflow class에 선언한다. start ID는 필수이며 business key에서 정하고 signal ID도 duplicate sender라면 준다.

업무 transaction 안에서 `await eventBus.publish(event, { transaction: tx })` 또는 publishAll을 실행하면 start/signal도 그 transaction을 사용한다. publish는 durable write 뒤 기존 event handler와 saga에 전달한다. 그 handler는 아직 commit 전의 event에 반응할 수 있으며 transaction rollback 때 이미 실행한 외부 효과를 자동 취소하지 않는다.

`@nestjs/cqrs` 12.1 이상의 aggregate commit은 dispatcher context와 반환 대기를 지원하므로 `await aggregate.commit({ transaction: tx })`로 묶을 수 있다. 12.0 이하 경로는 `await publishAll(aggregate.getUncommittedEvents(), { transaction: tx })` 뒤 uncommit한다. commit은 이벤트를 넘기며 먼저 비우므로 실패한 command를 retry할 때 aggregate를 새로 읽는다.

commit 후 publish는 commit/publish 사이 crash 간극이 남는다. context 없는 aggregate commit은 durable workflow write를 업무 transaction 밖에 만들며 unawaited이면 crash/rejection 위험이 있다. mergeObjectContext 계열의 일부 warning과 Publishable aggregate 경로의 warning 유무를 안전 보장으로 사용하지 않는다.

module은 기존 event publisher를 감싸므로 custom publisher도 workflow 기록 뒤 전달받는다. startup 뒤 EventBus.publisher를 갈아 끼우면 연결을 우회하므로 startup 검증이 거부한다. mapped event를 publish하는 API process도 workflow class/store를 등록해야 하고 worker:false를 쓸 수 있다. 최고 version의 StartOn이 새 start를 정하고 여러 version의 SignalOn은 payload/ID 계약에 합의해야 한다.

step 안에서 command를 실행할 때 step의 idempotencyKey를 handler와 외부 API로 전달한다. step에서 시작한 workflow/signal은 생략한 ID를 step key와 호출 위치에서 유도해 retry를 흡수하지만 여러 동일 signal을 병렬로 보낸다면 각각 안정적인 ID를 준다. 일반 domain event handler까지 exactly-once인 것은 아니다.

## Payload codec의 경계

`AesGcmPayloadCodec({ keys: { keyId: base64Key }, current: keyId })`는 32-byte key의 AES-256-GCM으로 input/output, step result/checkpoint, signal payload, custom status, cancel reason, schedule input과 error message/stack을 암호화한다. 저장 위치를 authenticated data로 쓰며 1KiB 이상은 기본 압축한다. secret과 attacker-controlled data의 크기 유출이 문제면 compress:false를 쓴다.

조회/필터/정렬할 ID, workflow/version/status, signal name/key, concurrency/rate key, priority, parent/schedule 연결, journal name과 시간은 평문이다. 이메일 같은 민감값을 ID/key에 넣으면 codec으로 보호되지 않는다.

키 rotation은 새 current로 이후 write를 암호화하며 bulk rewrite하지 않는다. unfinished instance, retained signal과 schedule에 필요한 이전 key를 남긴다. declared schedule input은 확인 시 다시 쓰지만 runtime upsert schedule은 다음 upsert까지 이전 key를 사용하고 pause/resume는 재암호화하지 않는다.

key가 없으면 getStatus가 실패하고 list는 payload 없는 instance를 보이며 worker는 해당 instance를 건너뛴다. 기존 plaintext payload는 codec을 추가해도 읽힌다. DB write 권한자가 ciphertext를 plaintext로 대체하면 읽힐 수 있으므로 codec은 DB writer 자체를 막는 방어가 아니다.

custom WorkflowPayloadCodec은 id/encode/decode를 구현한다. 여러 codec은 첫 것이 encode하고 stored codec ID에 맞는 것으로 decode하므로 이전 codec도 필요한 데이터가 남는 동안 유지한다.

## 출처

- [NestJS Documentation, Durable workflows](https://docs.nestjs.com/reliability/workflows)

## 관련 문서

- [[NestJS-Workflows-Storage-and-Transactions]]
- [[Clean-Architecture-NestJS-CQRS]]
- [[NestJS-Workflows-Operations-and-Schedules]]
