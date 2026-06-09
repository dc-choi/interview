---
tags: [messaging, kafka, partition, capacity-planning]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Partition Sizing", "카프카 파티션 개수 산정", "파티션 산정식"]
---

# Kafka 파티션 개수 산정

토픽의 초기 파티션 수는 한 번 정하면 늘리기는 쉬워도 줄이기는 어렵다. 파티션을 줄이면 키 해싱 분배가 바뀌어 키 기반 순서 보장이 깨지기 때문이다. 너무 적으면 처리량과 장애 복구가 막히고, 너무 많으면 브로커 메타데이터, 리밸런싱 시간, 플랫폼 파티션 한도 같은 비용이 커진다. 모든 상황에 맞는 정답을 찾는 게 목적이 아니라, 토픽을 만드는 사람이 같은 기준으로 적정 초기값을 판단하는 산정식을 두는 게 목적이다.

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

## 면접 체크포인트

- 파티션은 왜 늘리긴 쉽고 줄이긴 어려운가 — 키 해싱 재분배로 키 단위 순서 보장이 깨짐
- 산정의 실질 결정 변수는 종종 Kafka가 아니라 컨슈머의 레코드당 처리 시간 L
- 장애 복구를 산정에 넣어야 하는 이유 — 복구 중에도 신규 유입이 계속됨
- 플랫폼 파티션 한도(예: eCKU 3,000)가 처리량 한도보다 먼저 병목이 될 수 있음
- 실측값이 더 높아도 보수적으로 공식값을 쓰는 이유 — 변동성과 안전 마진
- 파티션 과다의 비용 — 브로커 파일 핸들과 메모리, 리밸런싱 시간, 리더 선출 부하, end-to-end latency 증가
- 플랫폼이 바뀌면(AWS MSK 등) 처리량과 파티션 한도를 다시 대입해 재측정해야 함

## 출처

- [채널톡 — 카프카 파티션 개수, 어떻게 정할까](https://tech.channel.io/ko/articles/17439f55)

## 관련 문서

- [[MQ-Kafka|Kafka (토픽, 파티션, 세그먼트, KRaft)]]
- [[Consumer-Group|Consumer Group]]
- [[Delivery-Semantics|전달 보장]]
- [[Kinesis|Kinesis (Shard 기반 산정과 유사 구조)]]
- [[Messaging-Broker-Comparison|브로커 비교]]
