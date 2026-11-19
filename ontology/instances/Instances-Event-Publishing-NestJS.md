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
---

# 이벤트 발행 온톨로지 선언: NestJS

@nestjs/outbox와 @nestjs/idempotency의 전제와 비용에 대한 개념 20개와 타입 관계 19개를 선언한다. 본문 지식은 여기에 두지 않고, 각 선언의 `evidence`가 가리키는 원문 섹션이 근거다.

선언은 `ontology/candidates/event-publishing.jsonl`에서 원문 대조 검증을 통과한 후보만 옮긴 것이다. 새 선언은 후보 파일에 먼저 추가해 검증한 뒤 한 줄로 옮기고, 원문 heading이 바뀌면 `evidence`를 함께 고친다.

상위: [[Ontology-Instances]]
