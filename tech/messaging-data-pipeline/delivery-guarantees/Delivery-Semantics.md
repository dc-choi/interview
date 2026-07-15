---
tags: [messaging]
status: done
verified_at: 2026-07-15
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Delivery Semantics", "전달 보장"]
---

# 전달 보장 (Delivery Semantics)

메시지 시스템에서 메시지가 소비자에게 전달되는 보장 수준. 세 가지 수준이 있으며, 각각 트레이드오프가 다르다.

## 세 가지 전달 보장

### At-Most-Once (최대 한 번)
메시지가 한 번 전달되거나 전달되지 않을 수 있다. 유실 가능, 중복 없음.
- 메시지 발행 후 확인(ACK) 없이 삭제
- 가장 빠르고 단순
- 적합: 로그 수집, 메트릭 (일부 유실 허용)

### At-Least-Once (최소 한 번)
메시지가 반드시 한 번 이상 전달된다. 유실 없음, 중복 가능.
- 소비자가 처리 완료 후 ACK 전송
- ACK 실패 시 재전달 → 중복 발생
- 멱등성(Idempotency) 처리 필수
- 적합: 결제, 주문 등 유실이 치명적인 경우

### Exactly-Once (정확히 한 번)
정의된 처리 경계 안에서 메시지의 효과가 한 번만 반영되는 것을 목표로 한다. broker 전달, 소비자 처리, 외부 저장소 쓰기를 모두 묶는 종단간 보장은 각 시스템의 경계를 따져야 한다.
- ACK 유실과 재시도 때문에 broker 전달 횟수와 비즈니스 효과의 횟수는 같지 않을 수 있음
- 실무에서는 At-Least-Once + 멱등성, 중복 제거, 트랜잭션을 조합해 effectively-once 효과를 구현
- 높은 구현 복잡도와 성능 비용
- Kafka의 Exactly-Once Semantics (EOS): 트랜잭션 기반 Producer-Consumer

## 시스템별 지원 현황

| 시스템 | At-Most-Once | At-Least-Once | Exactly-Once |
|--------|-------------|---------------|--------------|
| Kafka | 지원 | 기본값 | 트랜잭션 기반 |
| RabbitMQ | 지원 | 기본값 | 미지원 (앱 레벨 구현) |
| SQS | 지원 | Standard 기본 | FIFO의 5분 발행 중복 제거, message group 순서. 소비자 재처리는 별도 대비 |
| Redis Streams | 지원 | XACK 기반 | 미지원 |

## FIFO 큐의 보장 경계
SQS는 FIFO를 exactly-once processing이라고 설명하지만, 구체적인 메커니즘은 `MessageDeduplicationId`의 5분 발행 중복 제거와 message group 안의 순서 보장이다. consumer가 visibility timeout 전에 처리 후 삭제하지 못하면 메시지가 다시 보이고 중복 효과가 생길 수 있으므로, 처리 시간을 반영한 timeout과 멱등한 handler가 필요하다.

## At-Least-Once 구현의 두 축

### 소비자 측 — 멱등성 (Consumer Idempotency)
중복 메시지를 안전하게 처리하는 패턴. 상세 구현은 [[Idempotency-Key|멱등성 키]] 참고.

### 생산자 측 — 발행 신뢰성 (Transactional Outbox)
비즈니스 데이터와 Outbox 레코드를 같은 DB 트랜잭션으로 저장한다. broker 발행은 별도 relay가 수행하므로 DB commit과 broker publish가 하나의 원자적 트랜잭션이 되는 것은 아니며, relay 재시도에 따른 중복 발행을 소비자 멱등성으로 흡수해야 한다. 상세 패턴은 [[Transactional-Outbox|Transactional Outbox]] 참고.

소비자 측 멱등성 + 생산자 측 Outbox가 짝을 이루어 **end-to-end at-least-once 신뢰성**을 확보한다.

## 출처

- [Amazon SQS Developer Guide — FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html)
- [Amazon SQS Developer Guide — Outage recovery scenarios](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/designing-for-outage-recovery-scenarios.html)
- [AWS Prescriptive Guidance — Transactional Outbox Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## 관련 문서
- [[At-Least-Once]]
- [[Idempotency-Key]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[MQ-Kafka|Kafka]]
