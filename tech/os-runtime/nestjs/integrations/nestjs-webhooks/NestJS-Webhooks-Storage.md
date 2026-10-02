---
tags: [nestjs, webhook, postgres, mysql, store]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Webhook 저장소와 동시성 계약"]
---

# NestJS Webhook 저장소와 동시성 계약

Webhook endpoint/delivery store와 outbox message/inbox store는 서로 다른 역할이다. 두 저장소가 persistent해야 pending delivery와 incoming dedupe가 restart 뒤에도 유지된다.

## 등록과 migration

`PostgresWebhookStore` 또는 `MySqlWebhookStore`를 singleton provider factory로 만들고 `WebhooksStorage`에 등록한다. 두 contract인 WebhookEndpointStore와 WebhookDeliveryStore를 한 class가 구현할 수 있다. registry는 shape와 중복 등록을 검사하고 module init에 lock된다. 교체는 init 전 `replace: true`로 한다.

미등록은 in-memory default이며 production은 `allowInMemoryStorage: true`를 명시하지 않으면 startup을 거부한다. in-memory를 production에서 허용하는 것은 보존/다중 process 공유를 포기하는 선택이다.

PostgreSQL은 기본 `nest_webhooks` schema의 endpoints/messages/deliveries/delivery_attempts/migrations를 쓴다. MySQL은 database 안의 `nest_webhooks_` table prefix다. endpoint 삭제 뒤 delivery history를 남기기 위해 delivery에서 endpoint로 foreign key를 두지 않는다. message body는 서명 bytes 보존을 위해 text다.

개발/테스트는 startup migrate가 기본이며 production은 꺼진다. deploy 전에 `nest-webhooks migrate`와 `nest-outbox migrate` 또는 제공 migration SQL을 적용한다. `status`는 뒤처진 schema에서 exit 1, `sql`은 migration bookkeeping까지 출력한다. down migration은 없으므로 rollback은 schema를 내리는 절차로 구성하지 않는다. schema가 뒤처지면 startup/호출이 SchemaError로 실패한다.

PostgreSQL migration은 advisory lock 아래 transaction으로 적용한다. MySQL은 DDL이 autocommit되므로 GET_LOCK 아래 statement별 적용과 실패 지점 재개를 사용한다. 외부 migration 도구도 MySQL은 한 statement씩 실행하며 Drizzle custom migration에는 statement breakpoint를 사용한다.

## Executor와 transaction

postgres/mysql subpath의 `fromDrizzle`, `fromTypeOrm`, `fromPrisma`, `fromKysely`, PostgreSQL `fromPg`, MySQL `fromMysql2`를 기존 client와 함께 쓴다. webhook store 자체의 메서드는 업무 tx를 받지 않는다. dispatch와 processInTransaction의 업무 tx 참여는 **outbox store**가 담당한다.

PostgreSQL store는 database default READ COMMITTED를 확인한다. 수신 업무 tx가 더 높은 isolation일 때 동시 중복은 serialization error가 될 수 있어 caller가 실패/retry를 다룬다. MySQL은 READ COMMITTED/REPEATABLE READ를 지원하며 업무 tx의 deadlock 1213은 tx 전체가 rollback됐으므로 caller가 transaction 전체를 다시 실행해야 한다.

MySQL은 8.4/9.x, strict sql_mode와 database 선택이 필요하고 MariaDB 및 NO_BACKSLASH_ESCAPES는 거부한다. prefix는 최대 40자, PostgreSQL schema는 최대 63자다. MySQL의 indexed ID 제한과 incoming ID 최대 255자는 입력 계약에 포함한다.

## Custom store의 원자성

| 연산 | 필요한 경쟁 방어 |
|---|---|
| addEndpointSecret | row lock으로 동시 rotation 모두 보존 |
| recordEndpointFailure | 최초 실패 시점, 한번의 disable 판정 |
| findSubscribedEndpoints | 정확히 같은 tenant, enabled와 type 조건 |
| createDeliveries | message insert와 `(messageId, endpointId)` 중복 흡수 |
| claimDeliveries | due 순서, exclusive lease, 예: FOR UPDATE SKIP LOCKED |
| recordDeliveryAttempt / releaseDeliveries | lease owner를 조건에 넣어 stale write 거부 |
| retryDeliveries | leased delivery 제외를 같은 조건부 write에서 확인 |
| pruneDeliveries | 완료 delivery/history와 orphan message만 삭제, pending 제외 |

read-then-write만으로 이 조건을 구현하면 다른 worker와 경쟁한다. `webhookEndpointStoreContract`와 `webhookDeliveryStoreContract`에 `concurrent: true`를 주어 rotation/fan-out/claim/stale worker/retry 경쟁을 검증한다. PGlite의 단일 연결은 serialized 실행이므로 production DB server와 여러 연결의 pool에서도 실행해야 한다.

## 출처

- [NestJS Documentation, Webhooks](https://docs.nestjs.com/http/webhooks)

## 관련 문서

- [[NestJS-Outbox]]
- [[NestJS-Testing-Durable-Processes]]
