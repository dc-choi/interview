---
tags: [messaging, kafka, partition, capacity-planning]
status: done
verified_at: 2026-09-30
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Partition Sizing", "카프카 파티션 개수 산정", "파티션 산정식", "Kafka 자동 토픽 생성"]
---

# Kafka 파티션 개수 산정

토픽의 초기 파티션 수는 한 번 정하면 되돌리기 어렵다. Kafka는 토픽의 파티션 수 축소를 지원하지 않으므로(공식 문서 Modifying topics), 줄이려면 파티션 수가 더 적은 새 토픽으로 데이터를 옮기고 기존 토픽을 정리해야 한다. 늘리는 건 `kafka-topics --alter`로 가능하지만 공짜는 아니다. 기본 파티셔너가 `hash(key) % partition_count`로 대상을 고르기 때문에 파티션 수가 바뀌면 같은 키가 이전과 다른 파티션으로 갈 수 있고, 이미 쌓인 데이터의 배치는 그대로 남아 키 단위 순서 보장이 그 경계에서 끊긴다. 너무 적으면 처리량과 장애 복구가 막히고, 너무 많으면 브로커 메타데이터, 리밸런싱 시간, 플랫폼 파티션 한도 같은 비용이 커진다. 모든 상황에 맞는 정답을 찾는 게 목적이 아니라, 토픽을 만드는 사람이 같은 기준으로 적정 초기값을 판단하는 산정식을 두는 게 목적이다.

## 산정식

파티션 수는 프로듀서가 쓰는 양과 컨슈머가 읽어내야 하는 양 중 더 큰 쪽이 결정한다.

- `required_partitions = ceil( max( producer_peak / ingress_per_partition, consumer_requirement / egress_per_partition ) )`
- `consumer_requirement = max( producer_avg × (1 + consumer_down_time / catchup_time), producer_peak )`

`ingress_per_partition`은 파티션 하나가 받아낼 수 있는 쓰기 처리량, `egress_per_partition`은 파티션 하나에서 컨슈머가 빼낼 수 있는 읽기 처리량이다.

## 프로듀서 요구량

토픽은 피크 시점에도 프로듀서가 쓰는 데이터를 받아내야 하므로 평균이 아니라 `producer_peak_throughput`을 쓴다. 이를 `ingress_per_partition`으로 나눈 값이 프로듀서 측 최소 파티션 수다.

## 컨슈머 요구량

두 시나리오 중 큰 쪽을 택한다.

1. 실시간 피크 처리 — 유입 피크를 실시간으로 소비 (`producer_peak`)
2. 장애 복구 — 컨슈머가 `consumer_down_time` 동안 멈춰 쌓인 lag을 `catchup_time` 안에 따라잡아야 한다.

복구 시나리오에서 `(1 + down_time / catchup_time)` 배수가 핵심이다. 밀린 데이터를 따라잡는 동안에도 새 데이터가 계속 유입되기 때문에, 단순히 쌓인 양만 나눠선 안 되고 평균 유입량에 이 배수를 곱한 만큼을 소화할 수 있어야 한다. 예를 들어 4일 중단 후 1일 안에 복구하려면 평균 유입의 `1 + 4/1 = 5`배 처리 능력이 필요하다.

## per-partition 처리량의 실측

파티션 수를 좌우하는 두 상수는 플랫폼 문서값을 그대로 믿지 말고 실측해 검증한다.

### ingress (쓰기)

파티션 수를 1개부터 16개까지 늘려가며 총 처리량을 측정한다. 최대값만 보면 일시적 스파이크에 속으므로, 1분 윈도우 기준 변동계수(CV)가 0.15 이하인 안정 구간의 값을 채택한다. 실측값이 플랫폼 계획값보다 높게 나와도(예: 실측 19MB/s vs 공식 6MB/s) 안전성을 위해 보수적으로 공식값을 쓰는 선택이 합리적이다.

### egress (읽기) — 핵심 통찰

egress는 Kafka가 읽어줄 수 있는 속도로 결정되지 않는다. 실제로는 컨슈머의 레코드당 처리 시간(L)이 결정한다. 순차 처리 모델에서 L에 따라 처리량이 급격히 추락한다.

| 레코드당 처리 시간 L | per-partition 처리량 |
|---|---|
| 0ms | 약 25.6MB/s |
| 50ms | 약 0.1MB/s |

즉 L이 0에서 50ms로만 늘어도 처리량이 약 256배 떨어진다. **파티션 수는 Kafka 성능이 아니라 컨슈머 비즈니스 로직의 처리 시간에 좌우될 수 있다.** egress는 밀린 것만 재생하는 backlog-only replay 방식으로 측정한다.

## 기본값과 파티션 한도 트레이드오프

매니지드 Kafka는 처리량 한도와 별개로 파티션 개수 자체에 한도가 있고, 이 한도가 먼저 병목이 되곤 한다. Confluent Cloud Enterprise의 1 eCKU 예시:

- Ingress 60MB/s
- 파티션 한도 3,000개 — 처리량보다 이 개수 한도가 실질 병목

기본값은 이 한도를 넘기지 않도록 역산해서 잡는다. 경계식은 `(ingress × catch_up_multiplier) / egress_per_partition ≤ 3,000`이다.

| 항목 | 선택지 | 결정 | 이유 |
|---|---|---|---|
| 기준값 | 실측 vs 공식 | 공식값 | 안전성 우선 |
| 처리 모델 | 병렬 vs 순차 | 순차(L=50ms) | 도입 초기 단순성 |
| catch-up 목표 | 빠를수록 | 4일 중단 / 1일 복구 | 파티션 한도 내 수렴 |
| egress 안전계수 | 추가 적용 | 미적용 | 대신 레코드 처리 시간 기준으로 통제 |

catch-up 배수 5와 egress 0.1MB/s를 기본값으로 잡으면, egress 0.1MB/s를 유지하기 위해 개발자가 레코드당 처리 시간을 50ms 이하로 유지하는 운영 규율을 지는 대신, 파티션 수가 처리량이 아닌 개수 한도로 1 eCKU를 초과하는 일을 막는다.

## 계산 예시

프로듀서 평균 10MB/s, 피크 30MB/s 토픽 (catch-up 배수 5, ingress 6MB/s, egress 0.1MB/s):

- 프로듀서 기준: 30 / 6 = 5개
- 컨슈머 요구량: `max(10 × 5, 30) = 50MB/s` → 50 / 0.1 = 500개
- 최종: `max(5, 500) = 500개`

파티션 수가 Kafka 성능이 아니라 컨슈머 처리 시간과 장애 복구 요구로 결정된 사례다.

## 자동 토픽 생성은 산정을 우회한다

이 산정식은 토픽을 명시적으로 만든다는 전제 위에 있다. client가 없는 토픽의 metadata를 조회하거나 처음 발행할 때 broker가 토픽을 자동으로 만들면 산정 없이 broker 기본값으로 토픽이 생긴다.

| 설정 | 위치 | 기본값 (Apache Kafka 4.3, KafkaJS 문서 기준) |
|---|---|---|
| `auto.create.topics.enable` | broker | `true` |
| `num.partitions` | broker | `1`. 자동 생성 토픽에 적용 |
| `default.replication.factor` | broker | `1`. 자동 생성 토픽에 적용 |
| `min.insync.replicas` | broker | `1` |
| `allow.auto.create.topics` | Java consumer | `true`. broker가 허용할 때만 생성 |
| `allowAutoTopicCreation` | KafkaJS producer, consumer | `true` |

4.3 문서 기준으로 자동 생성 토픽의 partition 수와 replication factor는 broker에 명시한 값을 쓰고, 없으면 controller 설정값을 쓴다. 이 경로로 생긴 토픽은 다음 문제를 안고 시작한다.

- **병렬성과 내구성 부재**: partition이 1개면 consumer를 늘려도 한 group 안의 병렬 처리가 늘지 않는다. replica가 1개면 그 broker를 잃을 때 데이터도 잃고, `acks=all`과 `min.insync.replicas`가 지킬 follower가 없다 ([[MQ-Kafka-Internals#문제에서 출발한 mental model|복제 규칙]]).
- **사후 증설 비용**: 나중에 partition을 늘리면 위 첫 문단처럼 key의 partition 매핑이 바뀌어 key 단위 순서가 그 시점에 끊긴다.
- **조용한 이름 오타**: 발행 측 토픽 이름이 틀리면 오류 없이 새 토픽이 생기고 consumer는 아무것도 받지 못한다 ([[MQ-Kafka-Consumer#발행은 됐는데 후처리가 일어나지 않을 때|소비 누락 진단]]).

운영 규칙은 다음과 같다.

- 운영 broker는 `auto.create.topics.enable=false`로 두고, 토픽은 IaC나 admin 절차로 partition 수, replication factor, `min.insync.replicas`, retention을 명시해 만든다.
- client 옵션은 broker가 허용할 때만 의미가 있고 Java producer에는 자동 생성을 끄는 client 설정이 없다(4.3 producer configs 기준). 최종 통제점은 broker 설정이다. KafkaJS `allowAutoTopicCreation` 같은 client 옵션은 로컬 개발 편의로만 켠다.
- 관리형 Kafka는 기본값이 다르다. 2026-09-30 확인 기준 Amazon MSK Provisioned의 기본 설정은 `auto.create.topics.enable=false`, 3개 AZ cluster에서 `default.replication.factor=3`과 `min.insync.replicas=2`이고, Confluent Cloud는 자동 생성이 기본 비활성이다. 제품과 cluster 유형별 문서로 다시 확인한다.

## 면접 체크포인트

- 파티션 수는 왜 되돌리기 어려운가 — 축소는 Kafka가 지원하지 않아 새 토픽 이관이 필요하고, 증설도 `hash(key) % partition_count`가 바뀌어 키 단위 순서 보장이 그 시점에 끊김
- 산정의 실질 결정 변수는 종종 Kafka가 아니라 컨슈머의 레코드당 처리 시간 L
- 장애 복구를 산정에 넣어야 하는 이유 — 복구 중에도 신규 유입이 계속됨
- 플랫폼 파티션 한도(예: eCKU 3,000)가 처리량 한도보다 먼저 병목이 될 수 있음
- 실측값이 더 높아도 보수적으로 공식값을 쓰는 이유 — 변동성과 안전 마진
- 파티션 과다의 비용 — 브로커 파일 핸들과 메모리, 리밸런싱 시간, 리더 선출 부하, end-to-end latency 증가
- 플랫폼이 바뀌면(AWS MSK 등) 처리량과 파티션 한도를 다시 대입해 재측정해야 함
- 자동 토픽 생성이 산정과 복제 설정을 우회하는 경로와 운영 broker에서 끄는 이유

## 출처

- [채널톡 — 카프카 파티션 개수, 어떻게 정할까](https://tech.channel.io/ko/articles/17439f55)
- [Apache Kafka 4.3 Documentation, Modifying topics](https://kafka.apache.org/43/operations/basic-kafka-operations/#modifying-topics)
- [Apache Kafka 4.3 Documentation, Broker Configs](https://kafka.apache.org/43/configuration/broker-configs/)
- [Apache Kafka 4.3 Documentation, Consumer Configs](https://kafka.apache.org/43/configuration/consumer-configs/)
- [KafkaJS Documentation, Producing Messages](https://kafka.js.org/docs/producing)
- [Amazon MSK Developer Guide, Default Amazon MSK configuration](https://docs.aws.amazon.com/msk/latest/developerguide/msk-default-configuration.html)
- [Confluent Cloud Documentation, Topics overview](https://docs.confluent.io/cloud/current/topics/overview.html)
- [Confluent Cloud Documentation, Kafka Cluster Types (Enterprise eCKU limits)](https://docs.confluent.io/cloud/current/clusters/cluster-types.html)
- [인프런, 김빌, Kafka 이론](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273696)
- [인프런, 김빌, Kafka 로 비지니스 로직 리펙토링!](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273698)

## 관련 문서

- [[MQ-Kafka|Kafka (토픽, 파티션, 세그먼트, KRaft)]]
- [[Consumer-Group|Consumer Group]]
- [[Delivery-Semantics|전달 보장]]
- [[Kinesis|Kinesis (Shard 기반 산정과 유사 구조)]]
- [[Messaging-Broker-Comparison|브로커 비교]]
