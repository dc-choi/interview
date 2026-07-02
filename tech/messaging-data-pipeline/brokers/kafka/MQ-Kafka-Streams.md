---
tags: [messaging, kafka, event-streaming, stream-processing]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Streams", "카프카 스트림즈", "State Store", "KStream KTable"]
---

# Kafka Streams

> 상위 인덱스: [[MQ-Kafka|Kafka]]

일반 애플리케이션을 그대로 스트림 처리 클러스터로 만드는 라이브러리. 별도의 대형 처리 플랫폼(Spark, Flink) 없이, 스프링/자바 애플리케이션 코드 안에서 파티션 단위 병렬 처리와 로컬 상태 저장을 수행한다. 핵심은 매번 RDB를 조회하지 않고 이벤트 흐름과 상태를 나눠 처리하는 것이다.

## 왜 Streams로 가는가 (진화 경로)

이벤트 밀도가 높은 도메인(예: 음식배달 — 주문, 배차, 픽업, 전달이 30분 안에 압축)에서 처리 구조는 보통 아래 순서로 진화한다.

1. **RDB + 스케줄러**: 1분마다 "지연 주문", "미배차 주문" 조회. 시작은 쉽지만 건수가 수십만을 넘으면 배치 서버 한 대가 전량을 조회, 계산하며 반복 조회가 DB 비용과 지연을 폭증시킨다.
2. **메시지 큐 분산 (SQS 등)**: 작업을 잘게 나눠 여러 워커가 분담. 계산은 분산되지만 각 워커가 다시 중앙 RDB에서 데이터를 당겨오므로 **DB 의존은 그대로**. 게다가 [[At-Least-Once|at-least-once]]라 중복, 순서 문제를 앱이 [[Idempotency-Key|멱등성]]으로 감당해야 한다.
3. **Kafka + Kafka Streams**: 이벤트를 [[MQ-Kafka-Internals|파티션]]으로 분산하고, **상태를 로컬에 누적**해 반복 DB 조회 자체를 제거한다. 배치처럼 몇 분 뒤가 아니라 이벤트가 들어오는 즉시 가까운 실시간으로 처리한다.

파티션과 [[Consumer-Group|컨슈머 그룹]]의 기본 규칙(같은 키 → 같은 파티션 → 순서 보장, 파티션 수 = 병렬성 상한)은 Kafka 공통. Streams는 그 위에 **로컬 상태 저장소**를 얹은 것이다.

## 애플리케이션이 곧 스트림 처리 클러스터

- 같은 `application.id`를 가진 애플리케이션 인스턴스 여러 대를 띄우면 각자가 Kafka Streams 인스턴스가 되어 **입력 토픽의 파티션을 나눠 가진다**. 컨슈머 그룹과 동일한 리밸런싱 메커니즘.
- 인스턴스를 늘리면 파티션이 재분배되어 수평 확장. 단, **파티션 수가 병렬성의 천장** — 파티션 10개면 인스턴스 11대째부터는 유휴.
- 서버 개발자에게 익숙한 애플리케이션 코드 안에서 토폴로지(map, filter, join, aggregate)를 선언한다.

## 상태 저장소 (State Store)

Streams의 핵심 무기. 로컬 캐시이자 작은 로컬 DB로, 기본 구현은 **RocksDB**(디스크 백업, 힙 밖)이고 인메모리 옵션도 있다.

- 이벤트가 들어올 때마다 이전 상태와 비교하거나 최신 상태를 갱신 → **매번 RDB 조회 없이** 계산. 예: "지역별 진행 중 주문 수"를 전량 조회 대신 이벤트를 누적해 유지.
- 각 상태 저장소는 **변경 로그(changelog) 토픽**과 연결된다. 상태 갱신이 compacted 토픽에 기록되므로, 장애나 리밸런싱으로 파티션이 다른 인스턴스로 옮겨가도 **changelog를 재생해 상태를 복구**한다.
- **standby replica**를 두면 다른 인스턴스가 changelog를 미리 따라 읽어, 장애 시 복구(restore) 시간을 줄인다. 복구 시간은 곧 처리 지연이므로 운영에서 중요.

## KStream vs KTable

같은 토픽도 흐름으로 볼지 최신 상태로 볼지에 따라 다른 추상화를 쓴다.

| | KStream | KTable |
|---|---|---|
| 의미 | 이벤트 하나하나의 흐름 (insert) | 키별 최신 상태 (upsert, last-value-wins) |
| 비유 | 흐르는 CCTV 영상 | 현재 상황판 |
| 예 | 주문 생성, 배차 수락, 픽업 완료 이벤트 | 주문 ID별 현재 상태, 지역별 현재 주문 수 |
| 토픽 성격 | 일반 로그 | compacted (키별 마지막 값) |

- **GlobalKTable**: 모든 인스턴스에 전체 데이터를 복제. co-partition(같은 키, 같은 파티션 수) 제약 없이 조회, 조인용 참조 테이블로 쓴다. 크기가 작은 메타(가맹점 정보 등)에 적합.
- KStream ↔ KTable 은 서로 변환 가능(`toTable`, `toStream`). 집계 결과는 자연스럽게 KTable.

## 윈도우 집계

실시간 운영 지표는 대부분 시간 구간 집계로 만든다. 예: 최근 1분 주문 수, 최근 30초 지역 배차 성공률, 5분 단위 지연 건수.

| 윈도우 | 동작 | 특징 |
|---|---|---|
| **Tumbling** | 고정 크기, 겹치지 않게 딱딱 절단 | 구간이 정확히 1개, 구간별 집계 |
| **Hopping** | 고정 크기 + 고정 advance로 밀며 **겹침 허용** | advance < size면 한 이벤트가 여러 창에 |
| **Sliding** | 레코드 타임스탬프 차이로 창을 정의 | 집계 전용, 실제 데이터 밀도에 반응 |
| **Session** | 활동 간격(gap)으로 구간 구분 | 유저 세션처럼 경계가 유동적 |

- **grace period**: 늦게 도착한(out-of-order) 이벤트를 얼마나 기다렸다 창을 닫을지. 짧으면 지각 이벤트 유실, 길면 결과 확정이 늦어진다. event-time 기준 처리의 핵심 파라미터.

## 정확히 한 번 (EOS) vs 앱 레벨 실패 전략

- Kafka Streams는 `processing.guarantee=exactly_once_v2`로 **Kafka 경계 안에서** 트랜잭션 기반 정확히 한 번을 제공한다. read-process-write(입력 offset 커밋 + 상태 갱신 + 출력 발행)를 원자적으로 묶어, SQS류 at-least-once와 달리 중복 집계를 막는다.
- 단, EOS는 **Kafka 안**에서만 성립. 다음은 여전히 앱이 설계해야 한다.
  - **프로듀서가 브로커에 쓰기 전 죽으면** 메시지 유실 → 로컬 큐, [[Transactional-Outbox|Outbox]]에 임시 보관 후 재전송.
  - **외부 시스템 부작용**(결제, 알림 발송)은 트랜잭션 밖 → 멱등 처리 또는 재처리 안전성 확보.
  - **컨슈머 처리 실패** → 실패 토픽(retry, DLQ)에 넣고 별도 컨슈머가 재처리(→ [[MQ-Kafka-Consumer|컨슈머 구현]]).
- 요지: 안정성을 Kafka에만 맡기지 말고 애플리케이션 레벨 실패 복구 흐름을 명시적으로 만든다.

## 운영 지표

- **컨슈머 랙(lag)**: 유입 속도 > 처리 속도면 랙이 쌓인다. 랙 증가는 곧 실시간성 붕괴 신호 — 가장 먼저 봐야 할 지표.
- **리밸런싱**: 인스턴스 증감, 배포 때 파티션 재할당 발생. 리밸런싱 중에는 처리가 멈추고, 옮겨간 파티션의 **상태 저장소 복구 시간**만큼 지연이 늘어난다. 배포 전략(rolling, static membership), 윈도우 크기, standby replica를 함께 고려.
- **정합성 대사(reconciliation)**: 스트림 집계 결과가 원천 데이터와 맞는지 주기적으로 검증. 분산 시스템은 "돌아간다"보다 "맞게 돌아간다"가 더 어렵다.

## 면접 체크포인트

- 상태 저장소가 장애 후 어떻게 복구되나 → changelog 토픽 재생, standby replica
- KStream과 KTable의 차이 → 흐름(insert) vs 최신 상태(upsert), 토픽 compaction
- Kafka Streams의 EOS 범위 → Kafka 경계 안만, 외부 부작용은 별도
- 윈도우 종류와 grace period가 필요한 이유 → 지각 이벤트 처리
- 파티션 수가 왜 병렬성 상한인가 → 인스턴스는 파티션 이상 병렬화 불가

## 출처

- [카카오모빌리티 — 실시간 대규모 배차 시스템과 Kafka Streams](https://www.youtube.com/watch?v=PvAlbOm9WN8)

## 관련 문서

- [[MQ-Kafka|Kafka 인덱스]]
- [[MQ-Kafka-Patterns|Kafka 실전 패턴]]
- [[MQ-Kafka-Consumer|컨슈머 구현]]
- [[Consumer-Group|Consumer Group]]
- [[Idempotency-Key|멱등성 키]]
- [[Geospatial-Matching|실시간 공간 매칭 (H3, 시간 분할)]]
- [[Event-Sourcing|Event Sourcing]]
