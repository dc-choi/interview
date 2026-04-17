---
tags: [messaging]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Consumer Group", "소비자 그룹"]
---

# 소비자 그룹 (Consumer Group)

여러 소비자가 하나의 메시지 스트림을 분담하여 병렬로 처리하는 메커니즘. 각 메시지는 그룹 내 하나의 소비자만 수신한다.

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
| 파티션 개념 | 없음 (자동 분배) | 파티션 기반 |
| 리밸런싱 | 수동 (XCLAIM) | 자동 (Group Coordinator) |
| 오프셋 관리 | PEL 기반 | 오프셋 커밋 |
| 메시지 영속성 | 메모리+AOF | 디스크 기반 |
| 처리량 | 중소규모 | 대규모 |
| 순서 보장 | 전체 순서 | 파티션 내 순서 |

## Kafka 리밸런싱
소비자가 추가/제거되면 파티션 할당이 재조정된다.
- Eager: 전체 파티션 해제 후 재할당 (일시 중단)
- Cooperative: 변경된 파티션만 재할당 (무중단)

## 관련 문서
- [[MQ-Kafka|Kafka]]
- [[Redis|Redis Messaging]]
- [[Delivery-Semantics|전달 보장]]
