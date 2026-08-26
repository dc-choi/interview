---
tags: [messaging]
status: done
verified_at: 2026-08-26
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

## 출처
- [Redis 공식 문서, Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/)
- [Redis 공식 문서, Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Apache Kafka 공식 문서, Consumer Groups](https://kafka.apache.org/documentation/#intro_consumers)

## 관련 문서
- [[MQ-Kafka|Kafka]]
- [[Redis|Redis Messaging]]
- [[Delivery-Semantics|전달 보장]]
