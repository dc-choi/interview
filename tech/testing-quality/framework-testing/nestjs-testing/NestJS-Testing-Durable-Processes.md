---
tags: [nestjs, testing, outbox, webhooks, workflows]
status: done
verified_at: 2026-10-02
category: "테스트&품질(Testing&Quality)"
---

# NestJS 내구성 처리의 계약 테스트

outbox, webhook과 workflow의 핵심은 정상 호출 결과뿐 아니라 중단과 재전달 뒤에도 업무 효과가 계약대로 남는지다. mock의 성공 응답만으로 transaction, lease와 중복 처리의 정확성을 판단하지 않는다.

## 업무 commit과 전달 경계

1. 업무 row와 message/workflow 시작을 같은 transaction에 기록한다.
2. commit 전에는 relay/worker 효과가 없음을 확인한다.
3. record를 실제로 쓴 **뒤** 오류를 주입해 rollback하고, transaction 밖에서 업무 row와 record가 모두 없음을 확인한다.
4. commit 뒤 relay/worker를 한 번 실행하거나 완료 조건을 기다려 업무 결과를 확인한다.

테스트 자체의 외부 rollback transaction으로 전체를 감싸면 service의 잘못된 commit과 transaction 전파가 가려질 수 있다. 실제 migration으로 만든 test DB를 정리하는 방식을 사용한다. outbox poll loop를 끄고 `runOnce()`를 제어하면 commit 전후 경계를 안정적으로 볼 수 있다.

## Inbox와 lease의 경쟁

| 시나리오 | 확인할 계약 |
|---|---|
| 같은 ID를 여러 connection에서 동시에 처리 | 동일 DB inbox record의 단일 승자와 업무 effect 한 번 |
| inbox 기록 후 업무 write 실패 | 둘 다 rollback, 다음 delivery가 다시 실행 가능 |
| effect 뒤 성공 기록 전 process 중단 | 기본 inbox의 crash 간극 또는 외부 resource idempotency |
| lease 만료 후 다른 worker takeover | stale owner의 완료/실패/history 쓰기가 새 owner를 바꾸지 못함 |
| deadline/AbortSignal 발생 | DB 상태와 실제 handler 종료를 따로 확인 |
| dead letter 재생 | 안정적인 ID, 이미 성공한 consumer skip, retry budget과 history 계약 |

`outboxStoreContract`, `outboxInboxStoreContract`와 webhook/workflow store contract suite는 custom adapter의 원자성 경계를 확인하는 출발점이다. PGlite의 단일 connection에서 concurrent 옵션을 켜도 transaction들이 직렬 실행될 수 있다. 실제 PostgreSQL/MySQL의 production engine/version과 여러 connection을 가진 pool에서 경쟁을 재현한다. server suite가 skip됐다면 그 경쟁 검증은 미실행이다.

## Webhook에 추가되는 계약

수신 verification은 JSON 재직렬화가 아닌 실제 raw body bytes로 signature를 만들고, body 변경, 만료 timestamp, 잘못된 secret과 rotation overlap을 시험한다. GitHub처럼 header의 delivery ID가 서명되지 않은 방식은 payload 기반 ID 정책과 retention도 확인한다.

발송은 HTTP 2xx, retryable 응답, Retry-After, redirect 거부와 410 endpoint disable을 실제 transport 또는 제어 가능한 server로 확인한다. URL validation mock만으로 DNS resolution/pinning과 SSRF 방어가 검증되지는 않는다. transport를 교체했다면 그 custom transport의 보안 계약을 별도로 검증한다.

## Workflow에 추가되는 계약

- 완료된 step을 journal에서 읽는 replay에서 외부 effect가 반복되지 않는지와 미완료 effect 재시도의 idempotency를 확인한다.
- step name/order/version 변경의 non-determinism과 JSON 정규화된 출력 타입을 시험한다.
- signal-before-wait, 같은 signal ID, timeout/signal 경쟁과 waitForAny의 단일 winner를 검증한다.
- commit checkpoint 뒤 보상이 실행되지 않는 경계, 역순 compensation와 compensation 실패 재개를 확인한다.
- start/signal을 업무 transaction에서 rollback했을 때 worker가 관측하지 못하는지, PostgreSQL READ COMMITTED 등 요구 격리 수준을 맞춘다.
- schedule overlap, catch-up과 worker 재시작/재배포의 실제 adoption 조건을 확인한다. fake timer 하나로 DB lease/clock 경쟁을 모두 증명하지 않는다.

## 관련 문서

- [[NestJS-Outbox]]
- [[NestJS-Webhooks]]
- [[NestJS-Workflows]]
- [[NestJS-Testing-Integration]]
- [[Transactional-Test-Antipattern]]

## 출처

- [NestJS Documentation, Transactional outbox](https://docs.nestjs.com/reliability/outbox)
- [NestJS Documentation, Webhooks](https://docs.nestjs.com/http/webhooks)
- [NestJS Documentation, Workflows](https://docs.nestjs.com/reliability/workflows)
- [NestJS sample, commit and rollback test](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/37-outbox/e2e/orders.e2e-spec.ts)
- [NestJS sample, store contract on PGlite and PostgreSQL](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/37-outbox/e2e/drizzle-outbox.store.e2e-spec.ts)
