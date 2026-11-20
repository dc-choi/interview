---
tags: [ai, ontology, instances, messaging, reliability]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["이벤트 발행 온톨로지 선언: NestJS"]
ontology_concepts:
  - {id: nestjs-outbox, type: Approach, label: "@nestjs/outbox", aliases: ["NestJS Outbox", "NestJS transactional outbox", "NestJS outbox 전달"], evidence: "[[NestJS-Outbox#NestJS transaction과 outbox 전달]]"}
  - {id: outbox-add-business-transaction-handle, type: Condition, label: "outbox.add에 업무 transaction handle 전달", aliases: ["업무 transaction callback의 handle", "OutboxTransactionRequiredError", "outbox.add tx 전달"], evidence: "[[NestJS-Outbox#업무 transaction과 등록]]"}
  - {id: durable-transport-acknowledgement, type: Condition, label: "durable broker acknowledgement 구성", aliases: ["durable broker ack", "transport 계약 별도 구성"], evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {id: shared-key-cross-destination-blocking, type: Problem, label: "같은 key를 쓰는 destination 간 장애 전파", aliases: ["key 공유 destination 막힘", "한 destination 장애가 다른 destination을 막음"], evidence: "[[NestJS-Outbox#순서와 claim]]"}
  - {id: per-stream-key-separation, type: Approach, label: "stream별 key 분리", aliases: ["destination별 key 분리", "stream key 분리"], evidence: "[[NestJS-Outbox#순서와 claim]]"}
  - {id: async-handler-reordering, type: Problem, label: "asynchronous handler의 순서 뒤집힘", aliases: ["async handler 순서 역전", "도착 순서와 commit 순서 불일치", "비동기 handler commit 순서"], evidence: "[[NestJS-Outbox#소비 순서와 커밋을 분리해서 검증]]"}
  - {id: per-key-execution-queue, type: Approach, label: "key별 실행 queue", aliases: ["key별 Promise queue", "key별 직렬 실행 queue", "per-key queue"], evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {id: local-queue-no-distributed-order, type: Tradeoff, label: "local queue만으로 분산 순서 보장 불가", aliases: ["한 process의 실행만 직렬화", "process 내 직렬화 한계"], evidence: "[[NestJS-Outbox#소비 순서와 커밋을 분리해서 검증]]"}
  - {id: nestjs-outbox-default-inbox, type: Approach, label: "@nestjs/outbox 기본 inbox", aliases: ["NestJS 기본 inbox"], evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {id: default-inbox-crash-window, type: Tradeoff, label: "조회와 기록 사이 crash나 병렬 실행 가능", aliases: ["기본 inbox 중복 효과 경계", "inbox 성공 기록과 외부 발송 사이 crash 간극"], evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {id: dead-letter-requeue, type: Approach, label: "dead-letter requeue", aliases: ["DLQ requeue", "dead-letter 재처리", "dead-letter 재생"], evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {id: requeue-breaks-original-order, type: Tradeoff, label: "requeue 시 원래 순서 깨짐", aliases: ["requeue 순서 역전", "dead-letter 재처리 순서 문제"], evidence: "[[NestJS-Outbox#Relay의 시간과 실패]]"}
  - {id: replay-policy-and-business-state-validation, type: Condition, label: "재생 정책과 업무 상태 검증", aliases: ["requeue 재생 정책"], evidence: "[[NestJS-Outbox#Relay의 시간과 실패]]"}
  - {id: stable-message-id-as-job-id, type: Approach, label: "stable message ID를 jobId로 전달", aliases: ["BullMQ jobId 중복 방지", "message ID를 jobId로"], evidence: "[[NestJS-Outbox#ORM과 검증 경계]]"}
  - {id: job-retention-bounded-dedup, type: Tradeoff, label: "job 보존 기간 안의 중복 방지만 제공", aliases: ["BullMQ job 보존 기간 한계"], evidence: "[[NestJS-Outbox#ORM과 검증 경계]]"}
  - {id: nestjs-idempotency, type: Approach, label: "@nestjs/idempotency", aliases: ["NestJS Idempotency", "NestJS 요청 멱등성 키", "IdempotencyModule", "@Idempotent()"], evidence: "[[NestJS-Idempotency#NestJS 요청 멱등성 키]]"}
  - {id: stale-owner-late-write, type: Problem, label: "이전 owner의 late write", aliases: ["이전 시도의 late write", "takeover 뒤 stale relay 쓰기", "lease 만료 뒤 늦은 쓰기"], evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: shared-idempotency-store-in-production, type: Condition, label: "production 공유 store", aliases: ["공유 idempotency store", "production shared store"], evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: effect-repeat-after-5xx-release, type: Tradeoff, label: "효과 뒤 DB 실패 시 5xx release로 효과 반복", aliases: ["5xx release 효과 반복", "외부 효과 후 DB 실패 재실행"], evidence: "[[NestJS-Idempotency#TTL과 효과 이후 실패]]"}
  - {id: idempotency-interceptor-outermost, type: Condition, label: "idempotency interceptor를 바깥에 등록", aliases: ["ClassSerializerInterceptor 등록 순서"], evidence: "[[NestJS-Idempotency#결과 보관과 interceptor 순서]]"}
  - {id: sequence-commit-order-inversion, type: Problem, label: "먼저 insert한 transaction이 나중에 commit해 순서가 뒤집힘", aliases: ["sequence 순서 역전"], evidence: "[[NestJS-Outbox#순서와 claim]]"}
  - {id: per-key-advisory-lock-before-seq, type: Approach, label: "key별 transaction advisory lock 뒤 seq 배정", evidence: "[[NestJS-Outbox#순서와 claim]]"}
  - {id: multi-key-lock-deadlock, type: Problem, label: "여러 key를 함께 쓰는 deadlock", evidence: "[[NestJS-Outbox#순서와 claim]]"}
  - {id: sorted-lock-acquisition, type: Approach, label: "정렬된 lock 획득", aliases: ["lock ordering"], evidence: "[[NestJS-Outbox#순서와 claim]]"}
  - {id: stale-effect-from-other-instance, type: Problem, label: "다른 인스턴스의 stale effect", evidence: "[[NestJS-Outbox#Relay의 시간과 실패]]"}
  - {id: stable-inbox-consumer-name, type: Condition, label: "inbox consumer 이름의 안정적 유지", evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {id: nestjs-outbox-process-in-transaction, type: Approach, label: "ctx.processInTransaction", aliases: ["OutboxInbox.processInTransaction"], evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {id: broker-partition-order-contract, type: Approach, label: "broker partition 계약", evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {id: payload-version-supports-delayed-messages, type: Condition, label: "과거 release의 지연 message까지 payload 버전 지원", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {id: instance-clock-sync, type: Condition, label: "인스턴스 clock 동기화", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {id: connection-pool-for-request-and-relay, type: Condition, label: "connection pool을 request/relay 양쪽에 배정", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {id: nestjs-outbox-shutdown-drain, type: Approach, label: "shutdown hook의 relay drain", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {id: db-client-closed-on-application-shutdown, type: Condition, label: "DB/client를 onApplicationShutdown에서 닫음", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {id: bullmq-internal-enqueue-sql, type: Approach, label: "내부 enqueue SQL 함수에 직접 의존", aliases: ["BullMQ 내부 enqueue SQL 직접 호출"], evidence: "[[NestJS-Outbox#ORM과 검증 경계]]"}
  - {id: enqueue-sql-schema-lock-coupling, type: Tradeoff, label: "schema/signature와 commit lock 계약에 묶임", evidence: "[[NestJS-Outbox#ORM과 검증 경계]]"}
  - {id: transport-done-read-as-consume-done, type: Problem, label: "전송 완료 직후 소비 결과 조회", evidence: "[[NestJS-Outbox#소비 순서와 커밋을 분리해서 검증]]"}
  - {id: wait-for-completion-condition, type: Approach, label: "소비 완료 조건 대기", evidence: "[[NestJS-Outbox#소비 순서와 커밋을 분리해서 검증]]"}
  - {id: nestjs-idempotency-protection-boundary, type: Tradeoff, label: "서로 다른 key의 업무 실행, 외부 결제의 이미 발생한 효과와 DB transaction은 별도 보호 필요", evidence: "[[NestJS-Idempotency#NestJS 요청 멱등성 키]]"}
  - {id: nestjs-idempotency-stream-response-not-stored, type: Tradeoff, label: "StreamableFile, stream, passthrough 없는 @Res는 저장하지 않음", evidence: "[[NestJS-Idempotency#결과 보관과 interceptor 순서]]"}
  - {id: error-replay-as-plain-httpexception, type: Tradeoff, label: "error replay가 plain HttpException으로 재구성됨", evidence: "[[NestJS-Idempotency#결과 보관과 interceptor 순서]]"}
  - {id: small-replay-result, type: Condition, label: "응답 크기의 package 상한이 없어 작은 결과 반환", evidence: "[[NestJS-Idempotency#결과 보관과 interceptor 순서]]"}
  - {id: nestjs-idempotency-in-memory-store, type: Approach, label: "@nestjs/idempotency in-memory store", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: in-memory-store-duplicate-across-restart, type: Tradeoff, label: "restart와 다른 인스턴스에서 중복 실행 허용", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: nestjs-idempotency-postgresql-store, type: Approach, label: "@nestjs/idempotency PostgreSQL store", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: conditional-on-conflict-raw-query, type: Condition, label: "조건부 ON CONFLICT UPDATE (Prisma upsert로 표현할 수 없어 raw query)", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: jsonb-rejects-unicode-nul, type: Problem, label: "PostgreSQL jsonb의 Unicode NUL 거부", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: json-column-for-replay-response, type: Approach, label: "response 저장에 jsonb 대신 json 사용", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: nestjs-idempotency-redis-store, type: Approach, label: "@nestjs/idempotency Redis store", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: redis-lua-error-no-rollback, type: Tradeoff, label: "Lua 오류가 이전 writes를 rollback하지 않음", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: whole-millisecond-duration-validation, type: Condition, label: "duration을 whole millisecond로 검증", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: redis-noeviction-and-persistence, type: Condition, label: "noeviction과 persistence 관리", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {id: lock-ttl-crash-wait, type: Tradeoff, label: "process crash 시 lockTtl(기본 60초) 대기", evidence: "[[NestJS-Idempotency#TTL과 효과 이후 실패]]"}
  - {id: outbox-does-not-bind-external-payment, type: Tradeoff, label: "외부 결제와 DB를 하나의 transaction으로 만들지 않음", evidence: "[[NestJS-Idempotency#TTL과 효과 이후 실패]]"}
  - {id: cors-exposes-idempotency-headers, type: Condition, label: "CORS에 Idempotency-Key와 재생 header 공개", evidence: "[[NestJS-Idempotency#Transport별 중복과 암호화]]"}
  - {id: idempotency-result-aes-gcm-encryption, type: Approach, label: "@nestjs/idempotency 보관 결과(개인/결제)의 AES-256-GCM 암호화", evidence: "[[NestJS-Idempotency#Transport별 중복과 암호화]]"}
  - {id: record-copied-under-other-key, type: Problem, label: "다른 key 아래로 복사한 record", evidence: "[[NestJS-Idempotency#Transport별 중복과 암호화]]"}
  - {id: missing-decryption-key-fail-closed, type: Tradeoff, label: "읽을 key가 없으면 재실행 대신 fail-closed 500", evidence: "[[NestJS-Idempotency#Transport별 중복과 암호화]]"}
  - {id: encryption-adoption-compat-plan, type: Condition, label: "처음 보관부터 암호화하거나 기존 record 만료까지 호환 계획", evidence: "[[NestJS-Idempotency#Transport별 중복과 암호화]]"}
ontology_relations:
  - {subject: "concept:inbox-pattern", predicate: requires, target: "concept:dedup-retention-exceeds-redelivery-window", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {subject: "concept:nestjs-outbox", predicate: broader, target: "concept:transactional-outbox", evidence: "[[NestJS-Outbox#NestJS transaction과 outbox 전달]]"}
  - {subject: "concept:nestjs-outbox", predicate: requires, target: "concept:outbox-add-business-transaction-handle", evidence: "[[NestJS-Outbox#업무 transaction과 등록]]"}
  - {subject: "concept:nestjs-outbox", predicate: requires, target: "concept:durable-transport-acknowledgement", evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {subject: "concept:per-stream-key-separation", predicate: addresses, target: "concept:shared-key-cross-destination-blocking", evidence: "[[NestJS-Outbox#순서와 claim]]"}
  - {subject: "concept:per-key-execution-queue", predicate: addresses, target: "concept:async-handler-reordering", evidence: "[[NestJS-Outbox#소비 순서와 커밋을 분리해서 검증]]"}
  - {subject: "concept:per-key-execution-queue", predicate: has_tradeoff, target: "concept:local-queue-no-distributed-order", evidence: "[[NestJS-Outbox#소비 순서와 커밋을 분리해서 검증]]"}
  - {subject: "concept:nestjs-outbox-default-inbox", predicate: has_tradeoff, target: "concept:default-inbox-crash-window", evidence: "[[NestJS-Outbox#소비 순서와 커밋을 분리해서 검증]]"}
  - {subject: "concept:dead-letter-requeue", predicate: has_tradeoff, target: "concept:requeue-breaks-original-order", evidence: "[[NestJS-Outbox#Relay의 시간과 실패]]"}
  - {subject: "concept:dead-letter-requeue", predicate: requires, target: "concept:replay-policy-and-business-state-validation", evidence: "[[NestJS-Outbox#Relay의 시간과 실패]]"}
  - {subject: "concept:dead-letter-requeue", predicate: requires, target: "concept:dedup-retention-exceeds-redelivery-window", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {subject: "concept:stable-message-id-as-job-id", predicate: has_tradeoff, target: "concept:job-retention-bounded-dedup", evidence: "[[NestJS-Outbox#ORM과 검증 경계]]"}
  - {subject: "concept:owner-conditioned-write", predicate: addresses, target: "concept:stale-owner-late-write", evidence: "[[NestJS-Outbox#순서와 claim]]"}
  - {subject: "concept:nestjs-idempotency", predicate: broader, target: "concept:idempotency-key", evidence: "[[NestJS-Idempotency#NestJS 요청 멱등성 키]]"}
  - {subject: "concept:nestjs-idempotency", predicate: requires, target: "concept:dedup-retention-exceeds-redelivery-window", evidence: "[[NestJS-Idempotency#TTL과 효과 이후 실패]]"}
  - {subject: "concept:nestjs-idempotency", predicate: requires, target: "concept:idempotency-key-scope", evidence: "[[NestJS-Idempotency#Key와 fingerprint]]"}
  - {subject: "concept:nestjs-idempotency", predicate: requires, target: "concept:shared-idempotency-store-in-production", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {subject: "concept:nestjs-idempotency", predicate: has_tradeoff, target: "concept:effect-repeat-after-5xx-release", evidence: "[[NestJS-Idempotency#TTL과 효과 이후 실패]]"}
  - {subject: "concept:nestjs-idempotency", predicate: requires, target: "concept:idempotency-interceptor-outermost", evidence: "[[NestJS-Idempotency#결과 보관과 interceptor 순서]]"}
  - {subject: "concept:per-key-advisory-lock-before-seq", predicate: addresses, target: "concept:sequence-commit-order-inversion", evidence: "[[NestJS-Outbox#순서와 claim]]"}
  - {subject: "concept:sorted-lock-acquisition", predicate: addresses, target: "concept:multi-key-lock-deadlock", evidence: "[[NestJS-Outbox#순서와 claim]]"}
  - {subject: "concept:inbox-pattern", predicate: addresses, target: "concept:stale-effect-from-other-instance", evidence: "[[NestJS-Outbox#Relay의 시간과 실패]]"}
  - {subject: "concept:nestjs-outbox", predicate: requires, target: "concept:stable-inbox-consumer-name", evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {subject: "concept:nestjs-outbox-process-in-transaction", predicate: addresses, target: "concept:effect-and-completion-record-partial-failure", evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {subject: "concept:nestjs-outbox-process-in-transaction", predicate: requires, target: "concept:effect-in-same-db-as-inbox", evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {subject: "concept:nestjs-outbox-process-in-transaction", predicate: alternative_to, target: "concept:nestjs-outbox-default-inbox", evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {subject: "concept:broker-partition-order-contract", predicate: addresses, target: "concept:async-handler-reordering", evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {subject: "concept:per-key-execution-queue", predicate: addresses, target: "concept:async-handler-reordering", evidence: "[[NestJS-Outbox#Inbox와 exactly-once 범위]]"}
  - {subject: "concept:nestjs-outbox", predicate: requires, target: "concept:payload-version-supports-delayed-messages", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {subject: "concept:nestjs-outbox", predicate: requires, target: "concept:instance-clock-sync", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {subject: "concept:nestjs-outbox", predicate: requires, target: "concept:connection-pool-for-request-and-relay", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {subject: "concept:nestjs-outbox-shutdown-drain", predicate: requires, target: "concept:db-client-closed-on-application-shutdown", evidence: "[[NestJS-Outbox#Dead letter와 운영]]"}
  - {subject: "concept:bullmq-internal-enqueue-sql", predicate: has_tradeoff, target: "concept:enqueue-sql-schema-lock-coupling", evidence: "[[NestJS-Outbox#ORM과 검증 경계]]"}
  - {subject: "concept:wait-for-completion-condition", predicate: addresses, target: "concept:transport-done-read-as-consume-done", evidence: "[[NestJS-Outbox#소비 순서와 커밋을 분리해서 검증]]"}
  - {subject: "concept:nestjs-idempotency", predicate: has_tradeoff, target: "concept:nestjs-idempotency-protection-boundary", evidence: "[[NestJS-Idempotency#NestJS 요청 멱등성 키]]"}
  - {subject: "concept:nestjs-idempotency", predicate: requires, target: "concept:same-key-reuse-on-retry", evidence: "[[NestJS-Idempotency#Key와 fingerprint]]"}
  - {subject: "concept:nestjs-idempotency", predicate: requires, target: "concept:new-key-per-intended-operation", evidence: "[[NestJS-Idempotency#Key와 fingerprint]]"}
  - {subject: "concept:nestjs-idempotency", predicate: has_tradeoff, target: "concept:nestjs-idempotency-stream-response-not-stored", evidence: "[[NestJS-Idempotency#결과 보관과 interceptor 순서]]"}
  - {subject: "concept:nestjs-idempotency", predicate: has_tradeoff, target: "concept:error-replay-as-plain-httpexception", evidence: "[[NestJS-Idempotency#결과 보관과 interceptor 순서]]"}
  - {subject: "concept:nestjs-idempotency", predicate: requires, target: "concept:small-replay-result", evidence: "[[NestJS-Idempotency#결과 보관과 interceptor 순서]]"}
  - {subject: "concept:nestjs-idempotency-in-memory-store", predicate: has_tradeoff, target: "concept:in-memory-store-duplicate-across-restart", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {subject: "concept:owner-conditioned-write", predicate: addresses, target: "concept:stale-owner-late-write", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {subject: "concept:nestjs-idempotency-postgresql-store", predicate: requires, target: "concept:conditional-on-conflict-raw-query", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {subject: "concept:json-column-for-replay-response", predicate: addresses, target: "concept:jsonb-rejects-unicode-nul", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {subject: "concept:nestjs-idempotency-redis-store", predicate: has_tradeoff, target: "concept:redis-lua-error-no-rollback", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {subject: "concept:nestjs-idempotency-redis-store", predicate: requires, target: "concept:whole-millisecond-duration-validation", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {subject: "concept:nestjs-idempotency-redis-store", predicate: requires, target: "concept:redis-noeviction-and-persistence", evidence: "[[NestJS-Idempotency#Store의 원자성]]"}
  - {subject: "concept:nestjs-idempotency", predicate: has_tradeoff, target: "concept:lock-ttl-crash-wait", evidence: "[[NestJS-Idempotency#TTL과 효과 이후 실패]]"}
  - {subject: "concept:transactional-outbox", predicate: has_tradeoff, target: "concept:outbox-does-not-bind-external-payment", evidence: "[[NestJS-Idempotency#TTL과 효과 이후 실패]]"}
  - {subject: "concept:nestjs-idempotency", predicate: requires, target: "concept:no-ack-for-in-progress-duplicate", evidence: "[[NestJS-Idempotency#Transport별 중복과 암호화]]"}
  - {subject: "concept:nestjs-idempotency", predicate: requires, target: "concept:cors-exposes-idempotency-headers", evidence: "[[NestJS-Idempotency#Transport별 중복과 암호화]]"}
  - {subject: "concept:idempotency-result-aes-gcm-encryption", predicate: addresses, target: "concept:record-copied-under-other-key", evidence: "[[NestJS-Idempotency#Transport별 중복과 암호화]]"}
  - {subject: "concept:idempotency-result-aes-gcm-encryption", predicate: has_tradeoff, target: "concept:missing-decryption-key-fail-closed", evidence: "[[NestJS-Idempotency#Transport별 중복과 암호화]]"}
  - {subject: "concept:idempotency-result-aes-gcm-encryption", predicate: requires, target: "concept:encryption-adoption-compat-plan", evidence: "[[NestJS-Idempotency#Transport별 중복과 암호화]]"}
---

# 이벤트 발행 온톨로지 선언: NestJS

@nestjs/outbox와 @nestjs/idempotency의 전제와 비용에 대한 개념 58개와 타입 관계 54개를 선언한다. 본문 지식은 여기에 두지 않고, 각 선언의 `evidence`가 가리키는 원문 섹션이 근거다.

선언은 `ontology/candidates/event-publishing*.jsonl`에서 원문 대조 검증을 통과한 후보만 옮긴 것이다. 새 선언은 후보 파일에 먼저 추가해 검증한 뒤 한 줄로 옮기고, 원문 heading이 바뀌면 `evidence`를 함께 고친다.

상위: [[Ontology-Instances]]
