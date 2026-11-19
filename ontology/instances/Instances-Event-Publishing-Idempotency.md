---
tags: [ai, ontology, instances, messaging, reliability]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["이벤트 발행 온톨로지 선언: 멱등성"]
ontology_concepts:
  - {id: duplicate-message-processing, type: Problem, label: "중복 메시지 처리", aliases: ["Duplicate Message Processing", "같은 메시지 중복 처리", "중복 수신", "중복 전달"], evidence: "[[Idempotent-Consumer#멱등 컨슈머 (Idempotent Consumer)]]"}
  - {id: effect-and-completion-record-partial-failure, type: Problem, label: "부수효과와 완료 기록의 부분 실패", aliases: ["Side Effect and Completion Record Partial Failure", "완료 기록 전 crash로 재처리", "완료 기록 선기록으로 효과 유실"], evidence: "[[Idempotent-Consumer#원자성이 핵심 — check-then-act 레이스]]"}
  - {id: idempotent-consumer, type: Approach, label: "Idempotent Consumer", aliases: ["멱등 컨슈머", "멱등 소비 처리", "Idempotent Consumer Pattern"], evidence: "[[Idempotent-Consumer#멱등 컨슈머 (Idempotent Consumer)]]"}
  - {id: natural-idempotency, type: Approach, label: "자연 멱등 설계", aliases: ["Natural Idempotency", "자연 멱등", "멱등 연산 설계"], evidence: "[[Idempotent-Consumer#1. 자연 멱등 설계 (가장 좋음)]]"}
  - {id: idempotency-key, type: Approach, label: "Idempotency Key", aliases: ["멱등성 키", "멱등 키", "멱등 키 dedup", "멱등 키 + 상태 저장소"], evidence: "[[Idempotency-Key#왜 필요한가]]"}
  - {id: state-machine-guard, type: Approach, label: "상태 머신 가드", aliases: ["State Machine Guard", "조건부 상태 전이", "상태 전이 가드"], evidence: "[[Idempotent-Consumer#3. 상태 머신 가드 (조건부 전이)]]"}
  - {id: inbox-pattern, type: Approach, label: "Inbox Pattern", aliases: ["Inbox 패턴", "인박스 패턴", "consumer inbox"], evidence: "[[Idempotent-Consumer#Inbox 패턴]]"}
  - {id: provider-idempotency-key, type: Approach, label: "provider 멱등 키", aliases: ["Provider Idempotency Key", "외부 provider 멱등 키"], evidence: "[[Idempotent-Consumer#2. 멱등 키 + 상태 저장소]]"}
  - {id: dedup-retention-exceeds-redelivery-window, type: Condition, label: "중복 기록 보존 기간이 재전달 가능 기간보다 김", aliases: ["Dedup Retention Exceeds Redelivery Window", "멱등 키 TTL이 재시도 윈도보다 김", "inbox retention이 redelivery 기간보다 김"], evidence: "[[Idempotency-Key#TTL 정리]]"}
  - {id: atomic-duplicate-check, type: Condition, label: "원자적 중복 체크", aliases: ["Atomic Duplicate Check", "INSERT ON CONFLICT 원자적 claim"], evidence: "[[Idempotent-Consumer#원자성이 핵심 — check-then-act 레이스]]"}
  - {id: effect-in-same-db-as-inbox, type: Condition, label: "업무 효과가 inbox와 같은 DB의 쓰기임", aliases: ["Effect in Same DB as Inbox", "같은 DB 업무 쓰기"], evidence: "[[Idempotent-Consumer#2. 멱등 키 + 상태 저장소]]"}
  - {id: provider-idempotency-contract, type: Condition, label: "외부 provider의 멱등 키 계약", aliases: ["Provider Idempotency Contract", "provider 멱등 계약"], evidence: "[[Idempotent-Consumer#exactly-once의 보장 범위]]"}
  - {id: idempotency-record-storage-growth, type: Tradeoff, label: "멱등성 레코드 저장소 증가", aliases: ["Idempotency Record Storage Growth", "멱등 키 보관 비용"], evidence: "[[Idempotency-Key#TTL 정리]]"}
  - {id: long-or-external-effect-work, type: Condition, label: "오래 걸리거나 외부 효과가 있는 작업", evidence: "[[Idempotent-Consumer#2. 멱등 키 + 상태 저장소]]"}
  - {id: kafka-transactional-read-process-write, type: Approach, label: "Kafka 트랜잭션 read-process-write", aliases: ["토픽 간 read-process-write"], evidence: "[[Idempotent-Consumer#exactly-once의 보장 범위]]"}
  - {id: read-committed-consumption, type: Condition, label: "read_committed 소비", aliases: ["read_committed 격리 소비"], evidence: "[[Idempotent-Consumer#exactly-once의 보장 범위]]"}
  - {id: client-event-id-dedup, type: Approach, label: "클라이언트 event_id 기록", aliases: ["client dedup", "수신 클라이언트 event_id dedup", "알림 event_id 중복 표시 방지"], evidence: "[[Idempotent-Consumer#외부 알림 발송과 클라이언트 `event_id`]]"}
  - {id: repeated-notification-display, type: Problem, label: "같은 이벤트의 반복 표시", aliases: ["알림 중복 표시", "같은 알림 두 번 표시", "중복 푸시 알림"], evidence: "[[Idempotent-Consumer#외부 알림 발송과 클라이언트 `event_id`]]"}
  - {id: client-dedup-not-end-to-end, type: Tradeoff, label: "자동 표시 경로는 client dedup 밖", aliases: ["client dedup은 end-to-end exactly-once 아님", "앱 코드 밖 자동 표시 경로"], evidence: "[[Idempotent-Consumer#외부 알림 발송과 클라이언트 `event_id`]]"}
  - {id: sqs-fifo-content-based-dedup, type: Approach, label: "SQS FIFO content-based dedup", aliases: ["FIFO 큐 content-based dedup", "SQS FIFO 중복 제거"], evidence: "[[Idempotent-Consumer#SQS 특이점]]"}
  - {id: fifo-dedup-five-minute-window, type: Tradeoff, label: "5분 dedup 윈도 밖 중복은 못 막음", aliases: ["FIFO dedup 5분 한계", "5분 윈도 너머 재전달"], evidence: "[[Idempotent-Consumer#SQS 특이점]]"}
  - {id: ambiguous-outcome, type: Problem, label: "결과 불명", aliases: ["결과 불명확", "결과가 불명확한 요청", "성공했는지 모름", "결과를 모르는 네트워크 오류", "timeout 후 성공 여부 불명", "응답 유실", "Ambiguous Outcome"], evidence: "[[Distributed-System-Basics#통신이 끊기면 생기는 두 가지 불확실성]]"}
  - {id: non-idempotent-request-retry, type: Problem, label: "비멱등 요청 반복", aliases: ["POST 재시도 중복 실행", "Non-idempotent Request Retry"], evidence: "[[Idempotency#왜 중요한가]]"}
  - {id: server-issued-resource-id, type: Approach, label: "서버가 먼저 발급한 ID로 실행 요청 식별", aliases: ["서버 발급 ID로 멱등 실행", "주문 ID로 결제 실행 식별", "CREATED 초안 후 실행"], evidence: "[[Idempotency#서버가 먼저 발급한 ID로 실행 요청 식별]]"}
  - {id: draft-expiry-and-cleanup, type: Tradeoff, label: "초안의 만료와 정리 정책 필요", aliases: ["CREATED 초안 정리", "중복 클릭 초안 누적"], evidence: "[[Idempotency#서버가 먼저 발급한 ID로 실행 요청 식별]]"}
  - {id: key-reused-with-different-payload, type: Problem, label: "같은 키에 다른 요청 본문", aliases: ["멱등 키 재사용 충돌", "같은 key의 다른 fingerprint", "KEY_REUSED", "멱등 키에 다른 payload"], evidence: "[[Idempotency#Idempotency Key 헤더]]"}
  - {id: low-collision-idempotency-key, type: Condition, label: "충돌 가능성이 충분히 낮은 키", aliases: ["UUID 같은 멱등 키"], evidence: "[[Idempotency#구현 포인트]]"}
  - {id: automatic-retry-on-communication-failure, type: Approach, label: "통신 장애 후 자동 재시도", aliases: ["응답 유실 후 재전송"], evidence: "[[Idempotency#네트워크 재시도 정책과 결합]]"}
  - {id: request-idempotency-semantics, type: Condition, label: "요청의 멱등성", aliases: ["멱등 요청", "재시도의 의미적 전제", "요청 의미가 멱등"], evidence: "[[Idempotency#왜 중요한가]]"}
  - {id: processing-lease-claim, type: Approach, label: "PROCESSING lease claim", aliases: ["PROCESSING lease", "별도 트랜잭션 claim"], evidence: "[[Idempotency-Key#데이터베이스 (UNIQUE 제약)]]"}
  - {id: same-key-reuse-on-retry, type: Condition, label: "재시도에 같은 키 재사용", aliases: ["멱등 키 영속화", "재시도 간 키 보존", "새 키로 재호출 금지"], evidence: "[[Idempotency-Key#고유 식별자 종류]]"}
  - {id: request-fingerprint, type: Approach, label: "요청 fingerprint", aliases: ["request fingerprint", "요청 본문 해시", "request_hash", "요청 본문 지문"], evidence: "[[Idempotency-Key#고유 식별자 종류]]"}
  - {id: idempotency-key-scope, type: Condition, label: "키 재사용 범위(scope) 분리", aliases: ["scope_id", "사용자별 key scope", "tenant나 actor별 키 범위"], evidence: "[[Idempotency-Key#데이터베이스 (UNIQUE 제약)]]"}
  - {id: owner-conditioned-write, type: Approach, label: "owner 조건 쓰기", aliases: ["owner compare token", "fenced statement", "lease owner를 WHERE에 포함", "완료 UPDATE owner 조건"], evidence: "[[Idempotency-Key#데이터베이스 (UNIQUE 제약)]]"}
  - {id: redis-claim-lease, type: Approach, label: "Redis claim lease + TTL", aliases: ["Redis SET NX lease", "SET NX EX claim", "Redis 멱등성 claim"], evidence: "[[Idempotency-Key#Redis (claim lease + TTL)]]"}
  - {id: redis-cluster-acknowledged-write-loss, type: Tradeoff, label: "Redis Cluster 비동기 복제로 승인한 write 유실", aliases: ["Redis Cluster 장애 시 write 유실", "Redis 비동기 복제 유실"], evidence: "[[Idempotency-Key#Redis (claim lease + TTL)]]"}
  - {id: outcome-reconciliation, type: Approach, label: "결과 대사", aliases: ["객체 조회와 웹훅으로 결과 대사", "요청 기록 대사", "Result Reconciliation"], evidence: "[[Idempotency-Key#오류 응답 재생과 업무 결과 확인]]"}
ontology_relations:
  - {subject: "concept:natural-idempotency", predicate: addresses, target: "concept:duplicate-message-processing", evidence: "[[Idempotent-Consumer#1. 자연 멱등 설계 (가장 좋음)]]"}
  - {subject: "concept:idempotency-key", predicate: addresses, target: "concept:duplicate-message-processing", evidence: "[[Idempotency-Key#왜 필요한가]]"}
  - {subject: "concept:state-machine-guard", predicate: addresses, target: "concept:duplicate-message-processing", evidence: "[[Idempotent-Consumer#3. 상태 머신 가드 (조건부 전이)]]"}
  - {subject: "concept:inbox-pattern", predicate: addresses, target: "concept:duplicate-message-processing", evidence: "[[At-Least-Once#같은 DB의 짧은 작업]]"}
  - {subject: "concept:natural-idempotency", predicate: alternative_to, target: "concept:idempotency-key", evidence: "[[Idempotent-Consumer#면접 체크포인트]]"}
  - {subject: "concept:natural-idempotency", predicate: alternative_to, target: "concept:state-machine-guard", evidence: "[[Idempotent-Consumer#면접 체크포인트]]"}
  - {subject: "concept:idempotency-key", predicate: alternative_to, target: "concept:state-machine-guard", evidence: "[[Idempotent-Consumer#면접 체크포인트]]"}
  - {subject: "concept:idempotency-key", predicate: requires, target: "concept:atomic-duplicate-check", evidence: "[[Idempotent-Consumer#원자성이 핵심 — check-then-act 레이스]]"}
  - {subject: "concept:idempotency-key", predicate: requires, target: "concept:dedup-retention-exceeds-redelivery-window", evidence: "[[Idempotency-Key#TTL 정리]]"}
  - {subject: "concept:idempotency-key", predicate: has_tradeoff, target: "concept:idempotency-record-storage-growth", evidence: "[[Idempotency-Key#TTL 정리]]"}
  - {subject: "concept:inbox-pattern", predicate: addresses, target: "concept:effect-and-completion-record-partial-failure", evidence: "[[Idempotent-Consumer#Inbox 패턴]]"}
  - {subject: "concept:inbox-pattern", predicate: requires, target: "concept:effect-in-same-db-as-inbox", evidence: "[[Idempotent-Consumer#원자성이 핵심 — check-then-act 레이스]]"}
  - {subject: "concept:provider-idempotency-key", predicate: addresses, target: "concept:effect-and-completion-record-partial-failure", evidence: "[[Idempotent-Consumer#원자성이 핵심 — check-then-act 레이스]]"}
  - {subject: "concept:provider-idempotency-key", predicate: requires, target: "concept:provider-idempotency-contract", evidence: "[[Idempotent-Consumer#2. 멱등 키 + 상태 저장소]]"}
  - {subject: "concept:processing-lease-claim", predicate: requires, target: "concept:long-or-external-effect-work", evidence: "[[Idempotent-Consumer#2. 멱등 키 + 상태 저장소]]"}
  - {subject: "concept:kafka-transactional-read-process-write", predicate: requires, target: "concept:read-committed-consumption", evidence: "[[Idempotent-Consumer#exactly-once의 보장 범위]]"}
  - {subject: "concept:kafka-transactional-read-process-write", predicate: addresses, target: "concept:duplicate-message-processing", evidence: "[[Idempotent-Consumer#exactly-once의 보장 범위]]"}
  - {subject: "concept:client-event-id-dedup", predicate: addresses, target: "concept:repeated-notification-display", evidence: "[[Idempotent-Consumer#외부 알림 발송과 클라이언트 `event_id`]]"}
  - {subject: "concept:client-event-id-dedup", predicate: requires, target: "concept:dedup-retention-exceeds-redelivery-window", evidence: "[[Idempotent-Consumer#외부 알림 발송과 클라이언트 `event_id`]]"}
  - {subject: "concept:client-event-id-dedup", predicate: has_tradeoff, target: "concept:client-dedup-not-end-to-end", evidence: "[[Idempotent-Consumer#외부 알림 발송과 클라이언트 `event_id`]]"}
  - {subject: "concept:sqs-fifo-content-based-dedup", predicate: has_tradeoff, target: "concept:fifo-dedup-five-minute-window", evidence: "[[Idempotent-Consumer#SQS 특이점]]"}
  - {subject: "concept:provider-idempotency-key", predicate: addresses, target: "concept:ambiguous-outcome", evidence: "[[Idempotent-Consumer#2. 멱등 키 + 상태 저장소]]"}
  - {subject: "concept:idempotency-key", predicate: addresses, target: "concept:non-idempotent-request-retry", evidence: "[[Idempotency#POST를 멱등하게 만드는 패턴]]"}
  - {subject: "concept:server-issued-resource-id", predicate: addresses, target: "concept:non-idempotent-request-retry", evidence: "[[Idempotency#서버가 먼저 발급한 ID로 실행 요청 식별]]"}
  - {subject: "concept:server-issued-resource-id", predicate: alternative_to, target: "concept:idempotency-key", evidence: "[[Idempotency#서버가 먼저 발급한 ID로 실행 요청 식별]]"}
  - {subject: "concept:server-issued-resource-id", predicate: requires, target: "concept:atomic-duplicate-check", evidence: "[[Idempotency#서버가 먼저 발급한 ID로 실행 요청 식별]]"}
  - {subject: "concept:server-issued-resource-id", predicate: has_tradeoff, target: "concept:draft-expiry-and-cleanup", evidence: "[[Idempotency#서버가 먼저 발급한 ID로 실행 요청 식별]]"}
  - {subject: "concept:request-fingerprint", predicate: addresses, target: "concept:key-reused-with-different-payload", evidence: "[[Idempotency#구현 포인트]]"}
  - {subject: "concept:idempotency-key", predicate: requires, target: "concept:low-collision-idempotency-key", evidence: "[[Idempotency#구현 포인트]]"}
  - {subject: "concept:idempotency-key", predicate: requires, target: "concept:same-key-reuse-on-retry", evidence: "[[Idempotency#응답 재사용과 보존 기간은 API 계약이다]]"}
  - {subject: "concept:automatic-retry-on-communication-failure", predicate: requires, target: "concept:request-idempotency-semantics", evidence: "[[Idempotency#왜 중요한가]]"}
  - {subject: "concept:automatic-retry-on-communication-failure", predicate: addresses, target: "concept:ambiguous-outcome", evidence: "[[Idempotency#네트워크 재시도 정책과 결합]]"}
  - {subject: "concept:outcome-reconciliation", predicate: addresses, target: "concept:ambiguous-outcome", evidence: "[[Idempotency#응답 재사용과 보존 기간은 API 계약이다]]"}
  - {subject: "concept:processing-lease-claim", predicate: alternative_to, target: "concept:inbox-pattern", evidence: "[[Idempotent-Consumer#2. 멱등 키 + 상태 저장소]]"}
  - {subject: "concept:redis-claim-lease", predicate: has_tradeoff, target: "concept:redis-cluster-acknowledged-write-loss", evidence: "[[Idempotency-Key#Redis (claim lease + TTL)]]"}
  - {subject: "concept:redis-claim-lease", predicate: alternative_to, target: "concept:inbox-pattern", evidence: "[[Idempotency-Key#Redis (claim lease + TTL)]]"}
---

# 이벤트 발행 온톨로지 선언: 멱등성

중복 처리 문제, 멱등 컨슈머, 멱등성 키와 HTTP 요청 멱등성에 대한 개념 37개와 타입 관계 36개를 선언한다. 본문 지식은 여기에 두지 않고, 각 선언의 `evidence`가 가리키는 원문 섹션이 근거다.

선언은 `ontology/candidates/event-publishing.jsonl`에서 원문 대조 검증을 통과한 후보만 옮긴 것이다. 새 선언은 후보 파일에 먼저 추가해 검증한 뒤 한 줄로 옮기고, 원문 heading이 바뀌면 `evidence`를 함께 고친다.

상위: [[Ontology-Instances]]
