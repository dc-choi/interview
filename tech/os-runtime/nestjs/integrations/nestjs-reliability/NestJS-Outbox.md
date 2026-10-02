---
tags: [nestjs, outbox, transaction, inbox]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS transaction과 outbox 전달"]
---

# NestJS transaction과 outbox 전달

`@nestjs/outbox`는 업무 row와 message를 같은 DB transaction에 기록하고 relay로 발행한다. 전달은 at-least-once이며 consumer inbox가 중복을 흡수한다. broker receipt와 실제 업무 효과의 완료는 다른 경계다.

## 업무 transaction과 등록

`await outbox.add(tx, messageOrArray)`에는 **업무 transaction callback의 handle**을 넘긴다. TypeORM의 EntityManager, Drizzle의 tx, Prisma interactive transaction client가 해당한다. root DB/manager나 Prisma array transaction에는 필요한 handle이 없으며 store는 OutboxTransactionRequiredError로 거부해야 한다.

payload는 add 시 JSON snapshot으로 고정된다. 기본 ID는 UUIDv7이고 consumer는 이를 deduplicate한다. topic/payload는 필수, headers/key/custom ID/delay 또는 availableAt은 선택이다. delay와 availableAt은 함께 쓰지 않는다.

route는 message당 destination을 하나 선택한다. local handler와 broker 모두 필요하면 message 두 개를 같은 transaction에 추가한다. commit 후 notify는 **이 인스턴스**의 relay를 깨우는 최적화이며 다른 worker는 poll로 찾는다. transaction 안에서 직접 emit하거나 after-commit callback만 사용하는 방식은 crash 간극을 닫지 못한다.

OutboxStore(messages)와 OutboxInboxStore(inbox)는 singleton 생성자에서 이름별 등록한다. 소비 전용 service는 inbox만 등록하고 relay를 끌 수 있다. production의 미등록 store는 시작 오류다. in-memory는 공유/보존뿐 아니라 transaction 참여도 못 해 rollback된 message가 발행될 수 있다.

## 순서와 claim

key가 같은 message는 topic/transport와 관계없이 commit 순서로 발행된다. 같은 key를 쓰는 서로 다른 destination은 한 장애가 다른 destination을 막으므로 stream별 key를 분리한다. 순서는 인스턴스 시계의 UUID가 아니라 store의 sequence와 transaction 직렬화로 정한다.

PostgreSQL add는 key별 transaction advisory lock을 정렬해 잡은 뒤 seq를 배정한다. sequence만으로는 먼저 insert한 transaction이 나중에 commit해 순서가 뒤집힐 수 있다. 정렬된 lock 획득은 여러 key를 함께 쓰는 deadlock을 줄인다.

claim은 짧은 READ COMMITTED transaction에서 claim coordination lock과 FOR UPDATE SKIP LOCKED로 due row를 가져와 lease한다. key의 선행 row가 다른 relay에 있거나 지연 중이면 뒤 row를 먼저 발행하지 않는다. commit 전 선행 row를 다시 봐 SKIP LOCKED나 dead-letter requeue와 경쟁한 key를 되돌린다.

발행 network I/O는 claim transaction 밖에서 수행한다. markPublished/reschedule/deadLetter/release의 쓰기는 lease owner를 WHERE에 포함해 takeover 뒤의 stale relay가 row를 바꾸지 못하게 한다. 실패 history append도 같은 fenced statement다.

## Relay의 시간과 실패

| 옵션 | 기본 |
|---|---|
| pollInterval / batchSize | 1초 / 100 |
| lease / concurrency | 30초 / key group 10개 |
| publishTimeout | lease의 1/3 |
| retry.attempts | 첫 실행 포함 20 |
| backoff | 1초에서 두 배, 최대 5분, equal jitter |

lease는 연장하지 않는다. 남은 lease가 publishTimeout보다 작으면 남은 batch를 release한다. publish timeout은 실패로 세고 handler signal을 abort한다. signal을 무시하면 실제 작업은 남고 같은 process의 retry는 실행 중 inbox 작업을 기다릴 수 있다. 다른 인스턴스의 stale effect는 inbox transaction/resource idempotency로 막는다.

일시 오류는 reschedule, exhausted는 dead-letter로 이동한다. NonRetryableMessageError 또는 retryIf false는 rejected로 즉시 이동한다. 여러 local handler 중 실패가 섞이면 모두 permanent일 때만 즉시 거부하고 성공한 handler는 다음 retry에서 inbox로 건너뛴다. topic handler가 없는 구버전 relay는 rolling deploy를 위해 retry한다.

dead-letter는 key를 막지 않는다. 뒤 message가 앞서 나간 뒤 이전 message를 requeue하면 소비 시점의 원래 순서가 이미 깨졌을 수 있다. 재생 정책과 업무 상태 검증이 필요하다.

## Inbox와 exactly-once 범위

local `@OnOutboxMessage(topic, { consumer })`는 singleton provider에서 발견된다. consumer 이름은 안정적으로 유지한다. 새 이름은 과거 message도 처음 본 것으로 만든다. 같은 message의 여러 local handler는 병렬 실행한다.

| 방식 | 중복 효과 경계 |
|---|---|
| 기본 inbox | 실행 전에 조회, 성공 뒤 기록, 그 사이 crash/다른 인스턴스의 병렬 실행 가능 |
| ctx.processInTransaction(tx, work) | inbox insert와 동일 DB 업무 writes를 한 transaction에서 commit |
| inbox:false | 모든 delivery 실행 |

recordInbox는 `(consumer, messageId)` unique key에 INSERT ON CONFLICT DO NOTHING으로 단일 승자를 정한다. processInTransaction은 기록한 caller만 work를 실행하고 실패하면 함께 rollback한다. same DB writes에 대한 exactly-once이며 외부 메일/결제까지 확장되지 않는다.

외부 consumer는 자신의 DB와 inbox를 소유한다. OutboxInbox.processInTransaction(tx, consumer, id, work)를 사용한다. transport의 도착 순서만으로 async handler commit 순서가 맞지는 않으므로 key별 실행 queue나 broker partition 계약도 필요하다.

TCP/core NATS/Redis의 publish 성공은 process 밖으로 bytes가 나간 의미일 수 있다. consumer crash로 유실될 수 있으므로 durable broker acknowledgement/publisher confirms 등 transport 계약을 별도로 구성한다. ClientProxyTransport의 toPacket으로 record/key/header를 매핑한다.

## Dead letter와 운영

deadLetter/requeue는 delete와 insert를 한 transaction에서 수행하며 original id/seq를 유지한다. requeue는 새 retry budget을 주지만 이미 완료한 consumer는 같은 ID를 skip한다. list/get/requeue/purge 관리 route는 package가 자동 노출하지 않는다. full payload가 있으므로 실제 인가로 보호한다. 빈 filter는 거부하고 all:true만 전체를 선택한다.

inbox retention은 최대 redelivery/requeue 시간보다 길게 설정하고 prune을 직접 실행한다. 그보다 오래된 message를 재생하면 효과가 다시 적용된다. payload 버전도 과거 release의 지연 message까지 지원한다.

stats의 pending/ready/leased/deadLetters/oldestDueAt/lagMs/inFlight와 published/retry-scheduled/dead-lettered/lease-lost event를 관측한다. delay message는 due 전 lag에 포함하지 않는다. lease-lost는 이중 전달 가능성이다. 인스턴스 clock 동기화와 connection pool을 request/relay 양쪽에 배정한다.

shutdown hook을 켜면 relay는 onModuleDestroy에서 claim을 멈추고 in-flight publish를 제한 시간까지 기다린 뒤 미시작 lease를 반환한다. DB/client는 onApplicationShutdown에서 닫아 drain 중 connection을 유지한다. API-only와 application-context relay-only worker를 분리할 수 있다.

## ORM과 검증 경계

- TypeORM은 active queryRunner가 있는 manager를 확인한다. row move는 lock 후 같은 transaction, simple fenced write는 affected를 확인한다.
- Prisma는 interactive tx에 parameterized raw query로 row lock, SKIP LOCKED, per-key 조건, JSON history append/DELETE RETURNING을 표현한다. P2025만 expected loser로 변환한다.
- Drizzle는 transaction의 rollback 형태와 query builder의 조건부 returning을 사용한다.
- PostgreSQL sequence/type, bigint 변환, timestamps와 JSON null을 ORM별로 맞춘다. Prisma pg adapter의 DB session timezone은 UTC로 유지한다.
- contract suite의 동시성은 실제 production DB engine/major version과 pool에서 검증한다. PGlite의 단일 연결은 transaction overlap의 증거가 아니다.

BullMQ의 job을 같은 PostgreSQL에 넣어도 Queue.add가 별도 pool/autocommit이면 outbox transaction이 아니다. 내부 enqueue SQL 함수에 직접 의존하면 schema/signature와 commit lock 계약에 묶인다. relay에서 stable message ID를 jobId로 전달하는 방식도 job 보존 기간 안의 중복 방지만 제공한다.

## 출처

- [NestJS Documentation, Transactional outbox](https://docs.nestjs.com/reliability/outbox)

## 소비 순서와 커밋을 분리해서 검증

공식 주문/분석 sample은 한 DB의 주문과 outbox를 같은 transaction에 저장하고, 별도 분석 DB에서 message ID의 inbox record와 revenue 변경을 함께 commit한다. TCP 발행 완료 직후 분석 DB를 조회하는 대신 완료 조건을 기다린다. 전송 완료는 소비 완료가 아니다.

relay가 같은 key로 발행한 순서를 asynchronous handler가 뒤집을 수 있어 sample consumer는 key별 Promise queue를 둔다. 이 queue는 **한 process**의 실행만 직렬화한다. 여러 consumer instance가 같은 key를 처리하는 환경은 broker partition/배분, DB 동시성 또는 durable 실행 계약을 추가로 확인한다. sample의 local queue만으로 분산 순서를 보장했다고 해석하지 않는다.

메일 sample은 실제 발송이 아니라 logger를 호출하는 stand-in이다. 기본 inbox의 성공 기록과 외부 메일 발송 사이 crash 간극도 남는다. 저장소 contract 테스트의 concurrent 옵션이 true여도 PGlite 단일 연결은 실제 transaction overlap을 만들지 않으므로 별도 PostgreSQL pool 테스트의 실행/skip 여부를 확인한다.

## 관련 문서

- [[Transactional-Outbox]]
- [[Transactional-Outbox-Relay]]
- [[NestJS-Idempotency]]
- [[NestJS-Events-and-Jobs]]
- [[NestJS-Distributed-Locks]]
- [NestJS sample, ordered asynchronous consumer](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/37-outbox/analytics-service/src/analytics.controller.ts)
- [NestJS sample, consumer transaction](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/37-outbox/analytics-service/src/order-stats.service.ts)
- [NestJS sample, real concurrent store contract](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/37-outbox/e2e/drizzle-outbox.store.e2e-spec.ts)
