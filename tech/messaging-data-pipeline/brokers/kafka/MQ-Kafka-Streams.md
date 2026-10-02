---
tags: [messaging, kafka, event-streaming, stream-processing]
status: done
verified_at: 2026-10-02
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Streams", "카프카 스트림즈", "State Store", "KStream KTable"]
---

# Kafka Streams

> 상위 인덱스: [[MQ-Kafka|Kafka]]
> 부분 검증 범위: 2026-10-02에 Apache Kafka 4.1 문서로 task 병렬성, 상태 복구, 테이블 의미, 윈도우, EOS와 예외 정책을 대조했다. 아래 진화 경로는 발표에서 착안한 조건부 예시이며, 발표 전체나 특정 서비스의 성능을 검증한 것은 아니다.

일반 애플리케이션을 그대로 스트림 처리 클러스터로 만드는 라이브러리. 별도의 대형 처리 플랫폼(Spark, Flink) 없이, 스프링/자바 애플리케이션 코드 안에서 파티션 단위 병렬 처리와 로컬 상태 저장을 수행한다. 매번 RDB를 조회하지 않고 이벤트 흐름과 상태를 나눠 처리한다.

## 왜 Streams로 가는가 (진화 경로)

이벤트 밀도가 높은 도메인(예: 음식배달의 주문, 배차, 픽업, 전달)에서 아래와 같은 구조 전환을 검토할 수 있다. 필수 도입 순서나 보편적인 처리량 임계치는 아니다.

1. **RDB + 스케줄러**: 예를 들어 1분마다 지연 주문과 미배차 주문을 조회한다. 반복 전량 조회가 병목이 되는지는 인덱스, 조회 범위, 데이터량과 실행 주기를 측정해 판단한다.
2. **메시지 큐 분산 (SQS 등)**: 작업을 잘게 나눠 여러 워커가 분담. 각 워커가 중앙 RDB에서 데이터를 다시 조회하는 설계라면 **DB 의존은 그대로**다. 전달과 순서 보장은 큐 종류와 설정별로 확인하고, 실패 재처리는 [[Idempotency-Key|멱등성]]을 고려해 설계한다.
3. **Kafka + Kafka Streams**: 이벤트를 [[MQ-Kafka-Internals|파티션]]으로 분산하고, 필요한 **상태를 로컬에 누적**해 반복 DB 조회를 줄인다. 레코드를 계속 처리하지만 실제 지연은 lag, 복구와 결과 발행 설정에 달려 있다.

같은 키를 같은 파티션으로 보내는 분배 전략이 유지되면 그 파티션의 offset 순서로 처리한다. 이는 이벤트 발생 시각순이나 여러 파티션의 전역 순서를 보장하지 않는다. Streams는 [[Consumer-Group|컨슈머 그룹]] 기반 분산 처리 위에 **task와 로컬 상태 저장소**를 얹는다.

## 애플리케이션이 곧 스트림 처리 클러스터

- 같은 Kafka 클러스터에서 같은 `application.id`와 토폴로지를 사용하는 인스턴스들은 **task를 나눠 처리**한다. task에 입력 파티션이 연결되고, task가 각 인스턴스의 stream thread에 할당된다.
- **active task 수와 전체 stream thread 수가 처리 병렬성을 제한**한다. 단일 입력 토픽의 10개 파티션으로 10개 task만 생기는 토폴로지라면 인스턴스를 11대 띄워도 모두가 active 처리를 할 수는 없다.
- 여러 sub-topology나 repartition 토픽이 있으면 전체 task 수를 함께 확인한다. active task를 받지 않은 인스턴스도 standby 상태 복제나 GlobalKTable 갱신을 수행할 수 있으므로 인스턴스 전체가 유휴라고 단정하지 않는다.
- 서버 개발자에게 익숙한 애플리케이션 코드 안에서 토폴로지(map, filter, join, aggregate)를 선언한다.

## 상태 저장소 (State Store)

로컬 상태를 저장하고 조회하는 저장소다. DSL의 기본 구현은 **RocksDB**(디스크 영속 저장, JVM 힙 밖 메모리 사용)이고 인메모리 옵션도 있다. 레코드 캐시는 상태 저장소와 별도의 기능이다.

- 이벤트가 들어올 때마다 이전 상태와 비교하거나 최신 상태를 갱신 → **매번 RDB 조회 없이** 계산. 예: 지역별 진행 중 주문 수를 전량 조회 대신 이벤트를 누적해 유지.
- 변경 로깅이 활성화된 일반 상태 저장소는 **changelog 토픽**을 재생해 장애나 task 이동 후 상태를 복구한다. key-value store changelog는 기본 `compact`, window store changelog는 `delete,compact` 정책을 쓴다.
- 모든 저장소에 별도 changelog가 생기는 것은 아니다. source KTable은 `reuse.ktable.source.topics` 최적화로 입력 토픽을 복구 로그로 재사용할 수 있다. 일반 저장소에서 `withLoggingDisabled()`로 백업을 끄면 changelog 복구와 standby를 기대할 수 없다.
- **standby replica**를 두면 다른 인스턴스가 changelog를 미리 따라 읽어, 장애 시 복구(restore) 시간을 줄인다. 지원되는 저장소와 인스턴스 수를 확인하고 `num.standby.replicas`를 설정한다. 복구 시간은 운영 지연에 영향을 준다.

## KStream vs KTable

같은 토픽도 흐름으로 볼지 최신 상태로 볼지에 따라 다른 추상화를 쓴다.

| | KStream | KTable |
|---|---|---|
| 의미 | 이벤트 하나하나의 흐름 (insert) | 키별 상태 갱신 (upsert), null 값은 키 삭제 |
| 비유 | 흐르는 CCTV 영상 | 현재 상황판 |
| 예 | 주문 생성, 배차 수락, 픽업 완료 이벤트 | 주문 ID별 현재 상태, 지역별 현재 주문 수 |
| 토픽 보존 | 계산에 필요한 이벤트 이력 보존 | 최신 상태 복구에는 compaction이 유용하며, KTable 타입 자체가 입력 토픽을 compacted로 바꾸지는 않음 |

- 기본 비버전 source KTable은 **같은 키가 같은 입력 파티션으로 모인다는 전제**에서, 그 파티션의 가장 큰 offset에 해당하는 값을 최신으로 반영한다. 입력이 키로 분배되지 않으면 테이블이 잘못 구성될 수 있다. 발생 시각상 최신 값과는 다르며, versioned state store를 쓰면 timestamp 기반 의미가 적용된다.
- **GlobalKTable**: 모든 인스턴스가 입력 토픽의 모든 파티션을 읽어 전체 테이블을 복제한다. KStream과의 조인에 co-partition 제약이 없고, 각 인스턴스에 담을 수 있는 크기의 참조 데이터(가맹점 정보 등)에 적합하다.
- KStream ↔ KTable은 변환 가능(`toTable`, `toStream`). 다만 `toStream()`은 테이블의 갱신 흐름을 내보내며 이미 덮어쓴 원본 이벤트 이력을 복구하지 않는다. 집계 결과는 KTable이다.

## 윈도우 집계

실시간 운영 지표는 대부분 시간 구간 집계로 만든다. 예: 최근 1분 주문 수, 최근 30초 지역 배차 성공률, 5분 단위 지연 건수.

| 윈도우 | 동작 | 특징 |
|---|---|---|
| **Tumbling** | 고정 크기, 겹치지 않게 딱딱 절단 | 구간이 정확히 1개, 구간별 집계 |
| **Hopping** | 고정 크기 + 고정 advance로 밀며 **겹침 허용** | advance < size면 한 이벤트가 여러 창에 |
| **Sliding** | 레코드 타임스탬프 차이로 창을 정의 | `JoinWindows`의 조인과 `SlidingWindows`의 윈도우 집계 양쪽에 사용, 실제 데이터 밀도에 반응 |
| **Session** | 활동 간격(gap)으로 구간 구분 | 유저 세션처럼 경계가 유동적 |

- **grace period**: 창 종료 후 out-of-order 레코드를 받아들일 허용 구간이다. `TimeWindows`(Tumbling/Hopping)의 창은 `[start, end)`이며, `stream-time >= window-end + grace`가 되면 해당 창의 집계에서 레코드를 제외한다. stream-time은 처리한 레코드의 timestamp로 진행하므로 입력이 멈추면 wall-clock만 흘러도 창이 닫히지는 않는다. 다른 윈도우의 경계 조건은 해당 API 기준으로 확인한다.
- 집계는 기본적으로 중간 결과를 계속 갱신한다. 창이 닫힌 뒤 최종 결과만 보내려면 `suppress(Suppressed.untilWindowCloses(...))` 같은 발행 정책이 필요하다. grace 이후 집계 제외는 원본 Kafka 레코드의 삭제를 뜻하지 않는다.

## 정확히 한 번 (EOS) vs 앱 레벨 실패 전략

- 기본 처리 보장은 `at_least_once`다. `processing.guarantee=exactly_once_v2`를 설정하면 **stream task의 입력 offset, 상태 changelog와 Kafka 출력**을 하나의 트랜잭션으로 커밋해, 처리 중 장애로 같은 입력 레코드를 재처리해도 결과가 중복 반영되지 않게 한다. 출력 소비자는 `read_committed`로 커밋된 결과를 읽어야 한다.
- EOS는 입력 토픽에 서로 다른 offset으로 들어온 **업무상 중복 이벤트**를 제거하지 않는다. 같은 이벤트가 두 번 발행됐다면 이벤트 ID 기반 중복 제거 등은 별도로 필요하다.
- 단, EOS는 **Kafka 안**에서만 성립. 다음은 여전히 앱이 설계해야 한다.
  - **Kafka 발행 전 원천 이벤트의 내구성**: 프로듀서가 죽어도 원천을 재생할 수 있으면 복구할 수 있다. 유일한 사본이 메모리에만 있었다면 유실될 수 있으므로, DB 변경과 함께 이벤트를 남겨야 하는 흐름은 [[Transactional-Outbox|Outbox]] 같은 영속 발행 경로를 검토한다.
  - **외부 시스템 부작용**(결제, 알림 발송)은 트랜잭션 밖 → 멱등 처리 또는 재처리 안전성 확보.
  - **Streams 처리 예외**: 4.1의 기본 `processing.exception.handler`는 `LogAndFailProcessingExceptionHandler`다. retry나 DLQ로 자동 이동하지 않으므로 복구, 재시도와 격리 정책을 별도로 설계한다. `CONTINUE`는 실패를 무시하고 다음 처리를 계속하는 선택이며, 예외 핸들러에서 별도 Producer로 쓴 DLQ 기록은 Streams EOS에 포함되지 않는다.
- 요지: 안정성을 Kafka에만 맡기지 말고 애플리케이션 레벨 실패 복구 흐름을 명시적으로 만든다.

## 운영 지표

- **컨슈머 랙(lag)**: 유입 속도 > 처리 속도면 랙이 쌓인다. 랙 증가는 곧 실시간성 붕괴 신호 — 가장 먼저 봐야 할 지표.
- **리밸런싱과 복구**: 인스턴스 증감이나 배포로 task가 재할당될 수 있다. 이동하는 task는 상태 복구가 필요하면 active 처리를 시작하기까지 지연된다. 중단 범위는 리밸런싱 프로토콜과 할당에 따라 달라지므로 모든 task가 복구 내내 멈춘다고 단정하지 않는다. 배포 전략, static membership, standby와 복구 lag를 함께 고려한다.
- **정합성 대사(reconciliation)**: 스트림 집계 결과가 원천 데이터와 맞는지 주기적으로 검증. 실행 여부뿐 아니라 결과의 정합성을 확인한다.

## 면접 체크포인트

- 상태 저장소가 장애 후 어떻게 복구되나 → changelog 또는 재사용한 source 토픽, standby와 로깅 비활성화의 예외
- KStream과 KTable의 차이 → 이벤트 흐름 vs 키별 상태 갱신, compaction은 보존 정책
- Kafka Streams의 EOS 범위 → 같은 입력 offset의 재처리 보장, 업무상 중복과 외부 부작용은 별도
- grace는 실제 시간을 기다리는가 → 레코드 timestamp로 진행하는 stream-time 기준, 최종 결과 발행은 별도 설정
- 병렬성을 무엇으로 판단하나 → sub-topology별 입력과 repartition, 전체 task 수와 stream thread 수

## 출처

- [카카오모빌리티 — 실시간 대규모 배차 시스템과 Kafka Streams](https://www.youtube.com/watch?v=PvAlbOm9WN8)
- [Apache Kafka 4.1, Kafka Streams DSL](https://kafka.apache.org/41/streams/developer-guide/dsl-api/)
- [Apache Kafka 4.1, Streams Architecture](https://kafka.apache.org/41/streams/architecture/)
- [Apache Kafka 4.1, Streams Core Concepts](https://kafka.apache.org/41/streams/core-concepts/)
- [Apache Kafka 4.1, Configuring a Streams Application](https://kafka.apache.org/41/streams/developer-guide/config-streams/)
- [Apache Kafka 4.1, Kafka Streams Configs](https://kafka.apache.org/41/configuration/kafka-streams-configs/)
- [Apache Kafka 4.1, Processor API](https://kafka.apache.org/41/streams/developer-guide/processor-api/)
- [Apache Kafka 4.1, Managing Streams Application Topics](https://kafka.apache.org/41/streams/developer-guide/manage-topics/)
- [Apache Kafka 4.1.1 API, Windows](https://kafka.apache.org/41/javadoc/org/apache/kafka/streams/kstream/Windows.html)
- [Apache Kafka 4.1.1 — KStreamWindowAggregate 소스](https://github.com/apache/kafka/blob/4.1.1/streams/src/main/java/org/apache/kafka/streams/kstream/internals/KStreamWindowAggregate.java)
- [Apache Kafka 4.1.1 — StreamsBuilder 소스](https://github.com/apache/kafka/blob/4.1.1/streams/src/main/java/org/apache/kafka/streams/StreamsBuilder.java)
- [Apache Kafka 4.1.1 — PartitionGrouper 소스](https://github.com/apache/kafka/blob/4.1.1/streams/src/main/java/org/apache/kafka/streams/processor/internals/PartitionGrouper.java)

## 관련 문서

- [[MQ-Kafka|Kafka 인덱스]]
- [[MQ-Kafka-Patterns|Kafka 실전 패턴]]
- [[MQ-Kafka-Consumer|컨슈머 구현]]
- [[Consumer-Group|Consumer Group]]
- [[Idempotency-Key|멱등성 키]]
- [[Geospatial-Matching|실시간 공간 매칭 (H3, 시간 분할)]]
- [[Event-Sourcing|Event Sourcing]]
