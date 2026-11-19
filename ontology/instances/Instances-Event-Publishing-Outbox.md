---
tags: [ai, ontology, instances, messaging, reliability]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["이벤트 발행 온톨로지 선언: Outbox"]
ontology_concepts:
  - {id: dual-write-problem, type: Problem, label: "Dual Write Problem", aliases: ["이중 쓰기 문제", "DB 저장 후 이벤트 유실", "커밋 후 이벤트 발행 실패", "DB 쓰기와 메시지 발행 사이의 유실", "커밋 후 이벤트 유실"], evidence: "[[Transactional-Outbox#문제: Dual Write Problem]]"}
  - {id: transactional-outbox, type: Approach, label: "Transactional Outbox", aliases: ["Transactional Outbox Pattern", "Outbox Pattern", "Outbox 패턴", "트랜잭셔널 아웃박스", "아웃박스 패턴"], evidence: "[[Transactional-Outbox#Transactional Outbox Pattern]]"}
  - {id: xa-2pc-distributed-transaction, type: Approach, label: "XA/2PC 분산 트랜잭션", aliases: ["XA/2PC Distributed Transaction", "XA 분산 트랜잭션"], evidence: "[[Distributed-Transaction-Strategies#선택지 비교]]"}
  - {id: relay-continuous-operation, type: Condition, label: "Relay 상시 실행과 장애 감시, 복구", aliases: ["Relay Continuous Operation", "Relay 운영 전제", "Relay 장애 감시와 복구"], evidence: "[[Transactional-Outbox#왜 되는가]]"}
  - {id: consumer-idempotency-guaranteed, type: Condition, label: "소비자 측 멱등 처리 보장", aliases: ["소비자 중복 흡수", "소비자 멱등성 전제"], evidence: "[[Transactional-Outbox#Transactional Outbox Pattern]]"}
  - {id: xa-2pc-support-on-both-sides, type: Condition, label: "양쪽 시스템의 XA/2PC 지원", aliases: ["XA/2PC Support on Both Sides", "DB와 메시지 큐의 XA/2PC 지원"], evidence: "[[Transactional-Outbox#문제: Dual Write Problem]]"}
  - {id: outbox-at-least-once-duplicate-publish, type: Tradeoff, label: "at-least-once 중복 발행", aliases: ["At-least-once Duplicate Publish", "Outbox 중복 발행", "발행 중복 가능성", "유실을 중복으로 바꿈"], evidence: "[[Transactional-Outbox#Transactional Outbox Pattern]]"}
  - {id: xa-2pc-support-availability-ops-cost, type: Tradeoff, label: "XA/2PC 지원 범위, 가용성과 운영 비용", aliases: ["XA/2PC Support Scope, Availability and Operating Cost", "2PC 가용성과 운영 비용"], evidence: "[[Transactional-Outbox#문제: Dual Write Problem]]"}
  - {id: polling-latency-and-db-load-acceptable, type: Condition, label: "폴링 지연과 DB 조회 부하 감당 가능", aliases: ["Polling Latency and DB Load Acceptable", "허용 지연과 DB 조회 부하 감당"], evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {id: cdc-capability-or-low-latency-need, type: Condition, label: "CDC 운영 역량 보유 또는 낮은 지연 필요", aliases: ["CDC Capability or Low Latency Need"], evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {id: native-change-stream-db-in-use, type: Condition, label: "변경 스트림을 내장한 DB 사용 중", aliases: ["Native Change Stream DB in Use"], evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {id: polling-latency-and-claim-control, type: Tradeoff, label: "폴링 지연과 claim, 중복 발행 제어 부담", aliases: ["Polling Latency and Claim Control"], evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {id: cdc-operational-overhead, type: Tradeoff, label: "CDC 운영 요소 증가", aliases: ["CDC Operational Overhead", "Debezium, Kafka Connect 운영 부담"], evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {id: product-bound-change-stream-semantics, type: Tradeoff, label: "순서, 보존, 중복 의미의 DB 제품 종속", aliases: ["Product-bound Change Stream Semantics", "변경 스트림 제품 의미 종속"], evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {id: multi-instance-relay-duplicate-publish, type: Problem, label: "다중 인스턴스 Relay의 중복 발행", aliases: ["Multi-instance Relay Duplicate Publish", "Relay 여러 인스턴스 중복 발행", "스케줄러 중복 실행으로 같은 이벤트 중복 발행", "같은 outbox 행을 여러 Relay가 동시에 읽음"], evidence: "[[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]]"}
  - {id: row-level-claim, type: Approach, label: "행 단위 claim", aliases: ["Row-level Claim", "FOR UPDATE SKIP LOCKED claim", "SKIP LOCKED 행 claim", "FOR UPDATE SKIP LOCKED"], evidence: "[[Transactional-Outbox#행 단위 claim]]"}
  - {id: single-runner-election, type: Approach, label: "단일 러너 선출", aliases: ["Single Runner Election", "Relay 리더 선출", "advisory lock 단일 Relay"], evidence: "[[Transactional-Outbox#단일 러너 선출]]"}
  - {id: claim-state-and-stranded-row-recovery, type: Tradeoff, label: "claim 상태 컬럼과 좌초 회수 로직 추가", aliases: ["Claim State and Stranded Row Recovery", "좌초 행 회수 부담"], evidence: "[[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]]"}
  - {id: single-runner-throughput-limit-and-stall, type: Tradeoff, label: "단일 인스턴스 처리량 한계와 발행 정지", aliases: ["Single Runner Throughput Limit and Stall", "러너 정지 시 발행 전체 정지"], evidence: "[[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]]"}
  - {id: out-of-order-event-delivery, type: Problem, label: "이벤트 순서 뒤바뀜", aliases: ["이벤트 순서 역전", "Out-of-order Events", "순서가 뒤바뀌어 도착", "이벤트 순서 보장 안 됨"], evidence: "[[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]]"}
  - {id: stale-payload-application, type: Problem, label: "오래된 payload 적용", aliases: ["Stale Payload", "오래된 상태 스냅샷 적용", "오래된 update 적용", "stale update"], evidence: "[[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]]"}
  - {id: zero-payload, type: Approach, label: "Zero Payload", aliases: ["Zero Payload 전략", "식별자만 싣는 이벤트", "이벤트에 ID만 싣고 원본 재조회"], evidence: "[[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]]"}
  - {id: zero-payload-requery-cost, type: Tradeoff, label: "조회 1회 추가와 source DB 부하", aliases: ["Zero Payload 재조회 비용", "재조회 source DB 부하"], evidence: "[[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]]"}
  - {id: subscriber-needs-current-state-only, type: Condition, label: "구독자가 현재 상태만 필요", aliases: ["현재 상태만 필요한 구독자", "중간 상태 전이가 필요 없는 구독자"], evidence: "[[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]]"}
  - {id: version-guard, type: Approach, label: "version guard", aliases: ["버전 가드", "sequence guard", "단조 증가 version 비교", "entity version compare-and-set", "오래된 값 거부"], evidence: "[[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]]"}
  - {id: after-commit-callback-publish, type: Approach, label: "after-commit callback 발행", aliases: ["AFTER_COMMIT 리스너에서 메시지 발행", "@TransactionalEventListener AFTER_COMMIT 발행", "afterCommit callback 발행", "커밋 후 콜백에서 이벤트 발행"], evidence: "[[Transactional-Outbox#문제: Dual Write Problem]]"}
  - {id: event-published-before-failed-db-write, type: Problem, label: "이벤트 발행 후 DB 저장 실패", aliases: ["롤백된 변경의 이벤트 발행", "rollback 뒤 이벤트 발송", "DB 저장 전 이벤트 선발행"], evidence: "[[Transactional-Outbox#문제: Dual Write Problem]]"}
  - {id: local-collector-forwarding, type: Approach, label: "로컬 수집기 경유 전달", aliases: ["Fluent Bit 경유 Kafka 전달", "로컬 수집기 버퍼", "Fluent Bit으로 이벤트 발행"], evidence: "[[Transactional-Outbox#로컬 수집기 버퍼도 간극을 닫지 못한다]]"}
  - {id: allow-duplicate-publish, type: Approach, label: "중복 발행 허용", aliases: ["Allow Duplicate Publish", "Relay 중복 발행 허용", "제어 없이 발행"], evidence: "[[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]]"}
  - {id: broker-and-consumer-load-scale-with-instances, type: Tradeoff, label: "브로커 비용과 소비자 부하가 인스턴스 수에 비례", aliases: ["중복 발행 비용", "인스턴스 수만큼 브로커 비용"], evidence: "[[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]]"}
  - {id: publish-io-outside-claim-transaction, type: Condition, label: "발행 I/O를 claim 트랜잭션 밖에서 수행", aliases: ["claim 트랜잭션 안 브로커 호출 금지", "발행 network I/O는 claim transaction 밖"], evidence: "[[Transactional-Outbox#행 단위 claim]]"}
  - {id: fact-based-event, type: Approach, label: "사실 기반 이벤트", aliases: ["목적이 아닌 사실을 발행", "무엇이 일어났다 이벤트", "명령 대신 사실 이벤트"], evidence: "[[Transactional-Outbox#이벤트 설계 — 목적이 아닌 사실을 발행]]"}
  - {id: command-style-event-coupling, type: Problem, label: "발행자가 구독자의 행동을 지시하는 이벤트", aliases: ["명령형 이벤트", "Command 이벤트 결합", "구독자 추가 시 발행자 수정"], evidence: "[[Transactional-Outbox#이벤트 설계 — 목적이 아닌 사실을 발행]]"}
ontology_relations:
  - {subject: "concept:transactional-outbox", predicate: addresses, target: "concept:dual-write-problem", evidence: "[[Transactional-Outbox#Transactional Outbox Pattern]]"}
  - {subject: "concept:transactional-outbox", predicate: has_tradeoff, target: "concept:outbox-at-least-once-duplicate-publish", evidence: "[[Transactional-Outbox#어느 축도 중복을 없애지는 못한다]]"}
  - {subject: "concept:transactional-outbox", predicate: requires, target: "concept:consumer-idempotency-guaranteed", evidence: "[[Transactional-Outbox#Transactional Outbox Pattern]]"}
  - {subject: "concept:transactional-outbox", predicate: requires, target: "concept:relay-continuous-operation", evidence: "[[Transactional-Outbox#왜 되는가]]"}
  - {subject: "concept:xa-2pc-distributed-transaction", predicate: addresses, target: "concept:dual-write-problem", evidence: "[[Transactional-Outbox#문제: Dual Write Problem]]"}
  - {subject: "concept:xa-2pc-distributed-transaction", predicate: alternative_to, target: "concept:transactional-outbox", evidence: "[[Transactional-Outbox#문제: Dual Write Problem]]"}
  - {subject: "concept:xa-2pc-distributed-transaction", predicate: requires, target: "concept:xa-2pc-support-on-both-sides", evidence: "[[Transactional-Outbox#문제: Dual Write Problem]]"}
  - {subject: "concept:xa-2pc-distributed-transaction", predicate: has_tradeoff, target: "concept:xa-2pc-support-availability-ops-cost", evidence: "[[Transactional-Outbox#문제: Dual Write Problem]]"}
  - {subject: "concept:polling-relay", predicate: has_tradeoff, target: "concept:polling-latency-and-claim-control", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:polling-relay", predicate: requires, target: "concept:polling-latency-and-db-load-acceptable", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:cdc-relay", predicate: has_tradeoff, target: "concept:cdc-operational-overhead", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:cdc-relay", predicate: requires, target: "concept:cdc-capability-or-low-latency-need", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:db-native-change-stream-relay", predicate: has_tradeoff, target: "concept:product-bound-change-stream-semantics", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:db-native-change-stream-relay", predicate: requires, target: "concept:native-change-stream-db-in-use", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:row-level-claim", predicate: addresses, target: "concept:multi-instance-relay-duplicate-publish", evidence: "[[Transactional-Outbox#행 단위 claim]]"}
  - {subject: "concept:row-level-claim", predicate: has_tradeoff, target: "concept:claim-state-and-stranded-row-recovery", evidence: "[[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]]"}
  - {subject: "concept:single-runner-election", predicate: addresses, target: "concept:multi-instance-relay-duplicate-publish", evidence: "[[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]]"}
  - {subject: "concept:single-runner-election", predicate: has_tradeoff, target: "concept:single-runner-throughput-limit-and-stall", evidence: "[[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]]"}
  - {subject: "concept:idempotent-consumer", predicate: addresses, target: "concept:duplicate-message-processing", evidence: "[[Transactional-Outbox#어느 축도 중복을 없애지는 못한다]]"}
  - {subject: "concept:zero-payload", predicate: addresses, target: "concept:stale-payload-application", evidence: "[[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]]"}
  - {subject: "concept:zero-payload", predicate: has_tradeoff, target: "concept:zero-payload-requery-cost", evidence: "[[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]]"}
  - {subject: "concept:zero-payload", predicate: requires, target: "concept:subscriber-needs-current-state-only", evidence: "[[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]]"}
  - {subject: "concept:version-guard", predicate: addresses, target: "concept:out-of-order-event-delivery", evidence: "[[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]]"}
  - {subject: "concept:after-commit-callback-publish", predicate: addresses, target: "concept:event-published-before-failed-db-write", evidence: "[[Transactional-Outbox#문제: Dual Write Problem]]"}
  - {subject: "concept:transactional-outbox", predicate: addresses, target: "concept:event-published-before-failed-db-write", evidence: "[[Transactional-Outbox#왜 되는가]]"}
  - {subject: "concept:local-collector-forwarding", predicate: requires, target: "concept:consumer-idempotency-guaranteed", evidence: "[[Transactional-Outbox#로컬 수집기 버퍼도 간극을 닫지 못한다]]"}
  - {subject: "concept:allow-duplicate-publish", predicate: has_tradeoff, target: "concept:broker-and-consumer-load-scale-with-instances", evidence: "[[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]]"}
  - {subject: "concept:allow-duplicate-publish", predicate: requires, target: "concept:consumer-idempotency-guaranteed", evidence: "[[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]]"}
  - {subject: "concept:row-level-claim", predicate: requires, target: "concept:publish-io-outside-claim-transaction", evidence: "[[Transactional-Outbox#행 단위 claim]]"}
  - {subject: "concept:fact-based-event", predicate: addresses, target: "concept:command-style-event-coupling", evidence: "[[Transactional-Outbox#이벤트 설계 — 목적이 아닌 사실을 발행]]"}
  - {subject: "concept:dynamodb-streams-relay", predicate: broader, target: "concept:db-native-change-stream-relay", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:cosmos-db-change-feed-relay", predicate: broader, target: "concept:db-native-change-stream-relay", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:cockroachdb-changefeed-relay", predicate: broader, target: "concept:db-native-change-stream-relay", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
---

# 이벤트 발행 온톨로지 선언: Outbox

Dual Write 문제와 Transactional Outbox, 분산 트랜잭션 대안에 대한 개념 33개와 타입 관계 33개를 선언한다. 본문 지식은 여기에 두지 않고, 각 선언의 `evidence`가 가리키는 원문 섹션이 근거다.

선언은 `ontology/candidates/event-publishing.jsonl`에서 원문 대조 검증을 통과한 후보만 옮긴 것이다. 새 선언은 후보 파일에 먼저 추가해 검증한 뒤 한 줄로 옮기고, 원문 heading이 바뀌면 `evidence`를 함께 고친다.

상위: [[Ontology-Instances]]
