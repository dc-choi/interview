---
tags: [messaging]
status: done
verified_at: 2026-08-31
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Consumer Group", "소비자 그룹"]
---

# 소비자 그룹 (Consumer Group)

여러 소비자가 하나의 메시지 스트림을 분담하여 병렬로 처리하는 메커니즘. 새 메시지는 그룹 내 한 소비자에게 전달되지만, ACK 전에 장애가 나면 다른 소비자에게 다시 전달될 수 있으므로 exactly-once를 뜻하지 않는다.

## 왜 필요한가
단일 소비자로는 처리량이 부족할 때, 소비자를 수평 확장하여 처리 속도를 높인다. 소비자 그룹이 없으면 모든 소비자가 같은 메시지를 중복 수신한다.

## Redis Streams

### 그룹 생성
```
XGROUP CREATE mystream mygroup $ MKSTREAM
```
- $: 새 메시지부터 소비
- 0: 처음부터 소비

### 메시지 읽기
```
XREADGROUP GROUP mygroup consumer1 COUNT 10 BLOCK 2000 STREAMS mystream >
```
- >: 아직 전달되지 않은 새 메시지만 읽기
- BLOCK: 새 메시지가 올 때까지 대기

### 처리 확인 (ACK)
```
XACK mystream mygroup 1234567890-0
```
ACK하지 않은 메시지는 PEL(Pending Entries List)에 남아 재처리 가능

### 메시지 인계 (XCLAIM)
```
XCLAIM mystream mygroup consumer2 3600000 1234567890-0
```
장시간 미처리 메시지를 다른 소비자에게 인계

## Kafka Consumer Group 비교

| 항목 | Redis Streams | Kafka |
|------|--------------|-------|
| 파티션 개념 | 하나의 Stream은 ID 순서가 있는 로그, 확장은 여러 Stream으로 직접 분할 | 파티션 기반 |
| 리밸런싱 | 자동 재할당 없음. 새 entry는 경쟁 소비하고, 미ACK entry는 `XAUTOCLAIM` 또는 `XCLAIM`으로 명시적 인계 | Group Coordinator가 파티션을 재할당 |
| 오프셋 관리 | PEL 기반 | 오프셋 커밋 |
| 메시지 영속성 | Redis 설정에 따라 없음, RDB, AOF 또는 둘 다 | 디스크 기반 |
| 처리량 | 중소규모 | 대규모 |
| 순서 | entry ID는 추가 순서. 그룹의 병렬 consumer는 완료와 부수효과를 재정렬할 수 있음 | 파티션 내 레코드 순서. 병렬 처리 시 완료 순서는 별도 제어 필요 |

## Kafka 리밸런싱
소비자가 추가/제거되면 파티션 할당이 재조정된다.
- Eager: 전체 파티션 해제 후 재할당 (일시 중단)
- Cooperative: 유지 가능한 할당은 보존하고 이동할 파티션을 점진적으로 재할당해 전체 중단 영향을 줄임

### Heartbeat와 poll 진행성은 다르다

Apache Kafka Java consumer 4.3 기준으로 heartbeat는 소비자의 생존을, `poll()` 호출 간격은 처리 루프의 진행을 확인한다. `max.poll.interval.ms` 안에 다음 `poll()`을 호출하지 못하면 소비자가 실패한 것으로 간주되어 리밸런싱이 시작된다. 따라서 제한과 비교해야 하는 값은 한 메시지의 처리 시간이라고 단정할 수 없고, 앞선 `poll()` 호출부터 다음 호출까지 걸린 전체 시간이다. 다만 한 레코드의 처리가 이 제한보다 길면 같은 문제가 생긴다.

`session.timeout.ms`는 classic group protocol에서 heartbeat가 끊긴 소비자를 실패로 판단하는 시간이다. consumer group protocol에서는 broker의 `group.consumer.session.timeout.ms`가 이 역할을 한다. `group.instance.id`를 사용하는 정적 멤버는 poll 간격을 초과해도 즉시 파티션을 넘기지 않고 heartbeat를 중단한 뒤 session timeout까지 기다리지만, 처리 병목 자체가 해결되는 것은 아니다.

### 반복 리밸런싱 진단 순서

1. consumer 로그에서 리밸런싱 시각과 주기를 확인한다.
2. `poll()` 사이의 경과 시간, 한 번에 반환된 레코드 수, 핸들러 지연의 p50, p95, p99를 함께 측정한다.
3. DB와 외부 API 지연, 재시도, GC처럼 처리 시간을 늘린 구간을 분리한다.
4. consumer lag과 파티션별 처리량을 확인해 특정 파티션이나 레코드에만 병목이 있는지 구분한다.

### 완화와 근본 개선을 분리한다

- `max.poll.interval.ms` 상향은 장애 중 리밸런싱 반복을 줄이는 임시 완화다. 값을 크게 잡을수록 진행하지 못하는 소비자를 감지하고 파티션을 다시 할당하는 시점도 늦어진다.
- `max.poll.records`를 낮추면 한 번의 `poll()`이 반환하는 작업량을 제한할 수 있다. 내부 fetch 동작을 바꾸지는 않으며, 한 레코드 자체가 매우 느린 문제도 해결하지 못한다.
- 근본 개선은 poll 사이의 임계 경로를 줄이는 것이다. 개별 DB 쓰기를 batch write로 바꾸거나 불필요한 왕복, 느린 쿼리와 과도한 재시도를 줄인다. batch 크기는 처리량뿐 아니라 p99 지연, 트랜잭션 시간, lock과 로그 부하를 함께 보고 정한다.
- consumer 수를 늘리는 방법은 사용할 파티션과 하류 시스템의 여유 용량이 있을 때만 처리량을 높인다. 한 핸들러가 poll 제한을 넘는 문제는 고치지 못하고, 공유 DB의 경합을 키울 수 있다.
- 처리 시간을 예측하기 어렵다면 작업을 별도 스레드로 넘길 수 있다. 단, Kafka consumer 객체는 thread-safe하지 않으므로 poll은 consumer thread에서 계속하고 처리 중인 파티션은 pause한다. 자동 커밋을 끄고 실제 처리가 끝난 뒤 offset을 커밋하며, 순서, backpressure, 파티션 회수와 멱등성까지 함께 설계해야 한다.

### 운영 사례

한 운영 사례에서는 한 메시지가 약 46,000건의 MSSQL 쓰기를 유발해 10분으로 설정한 poll 제한을 넘었다. 제한을 30분으로 올려 반복 리밸런싱을 먼저 완화하고, 기존 JPA 저장 구간의 반복 DB 작업을 `JdbcTemplate.batchUpdate`로 바꿔 처리 시간을 줄였다. 다만 전후 지연, 처리량, lag가 공개되지 않아 개선 폭은 재현 가능한 성능 근거가 아니라 정성적 결과로만 해석해야 한다.

## 출처
- [Redis 공식 문서, Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/)
- [Redis 공식 문서, Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Apache Kafka 공식 문서, Consumer Groups](https://kafka.apache.org/documentation/#intro_consumers)
- [Apache Kafka 4.3 공식 문서, Consumer and Share Consumer Configs](https://kafka.apache.org/43/configuration/consumer-configs/)
- [Apache Kafka 4.3 Javadoc, KafkaConsumer](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Kafka Rebalancing과 메시지 처리 병목 개선 — Nextree](https://www.nextree.io/kafka-rebalancinggwa-mesiji-ceori-byeongmog-gaeseon/)

## 관련 문서
- [[MQ-Kafka|Kafka]]
- [[MQ-Kafka-Consumer|Kafka 컨슈머 구현]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[Redis|Redis Messaging]]
- [[Delivery-Semantics|전달 보장]]
