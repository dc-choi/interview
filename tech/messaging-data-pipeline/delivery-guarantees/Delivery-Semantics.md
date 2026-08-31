---
tags: [messaging]
status: done
verified_at: 2026-08-31
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Delivery Semantics", "전달 보장"]
---

# 전달 보장 (Delivery Semantics)

메시지 시스템에서 메시지가 소비자에게 전달되고 처리되는 보장 수준. 흔히 세 가지 용어를 쓰지만, 보장 경계가 broker 전달인지 소비자 효과인지 먼저 밝혀야 한다.

## 세 가지 전달 보장

### At-Most-Once (최대 한 번)
정의된 경계에서 메시지가 한 번 전달되거나 전달되지 않을 수 있다. 유실 가능, 재전달 없음.
- producer는 응답이 불확실한 발행을 재시도하지 않거나, consumer는 처리 전에 ACK 또는 offset을 기록
- 가장 빠르고 단순
- 적합: 로그 수집, 메트릭 (일부 유실 허용)

### At-Least-Once (최소 한 번)
처리 완료를 기록하기 전 실패하면 같은 메시지가 다시 전달될 수 있는 모델이다. 유실 위험을 줄이는 대신 중복을 허용한다.
- consumer가 처리 완료 후 ACK 또는 offset을 기록
- 처리 효과 뒤 기록에 실패하면 재전달되어 중복 효과가 생길 수 있음
- 중복 효과를 허용할 수 없으면 멱등성 또는 중복 제거를 설계
- 적합: 결제, 주문 등 유실이 치명적인 경우

### Exactly-Once (정확히 한 번)
정의된 처리 경계 안에서 메시지의 효과가 한 번만 반영되는 것을 목표로 한다. broker 전달, 소비자 처리, 외부 저장소 쓰기를 모두 묶는 종단간 보장은 각 시스템의 경계를 따져야 한다.
- ACK 유실과 재시도 때문에 broker 전달 횟수와 비즈니스 효과의 횟수는 같지 않을 수 있음
- 실무에서는 At-Least-Once + 멱등성, 중복 제거, 트랜잭션을 조합해 effectively-once 효과를 구현
- 높은 구현 복잡도와 성능 비용
- Kafka의 Exactly-Once Semantics (EOS): Kafka 토픽에서 읽어 Kafka 토픽으로 쓰는 경계에서 transactional producer가 출력과 소비 offset을 원자적으로 묶는다. downstream consumer는 `read_committed`여야 abort된 레코드를 보지 않는다. 외부 DB나 API 효과는 그 시스템과의 조정 또는 멱등성, 중복 제거가 별도로 필요하다 ([[Idempotent-Consumer|멱등 컨슈머]])

## 시스템별 구성 예와 보장 경계

같은 제품도 producer, consumer 설정과 처리 완료를 기록하는 순서에 따라 전달 의미가 달라진다.

| 시스템 | At-Most-Once | At-Least-Once | Exactly-Once |
|--------|-------------|---------------|--------------|
| Kafka | 처리 전 offset commit | 처리 후 offset commit | Kafka topic read-process-write와 `read_committed` 한정, 외부 부수효과는 별도 조정 또는 멱등 |
| RabbitMQ | automatic ACK | 처리 후 manual ACK와 재전달 | broker 단독으로 미지원, 앱 레벨 구현 |
| SQS | 자체 보장 없음, 비즈니스 효과는 업무 저장소의 원자적 claim 또는 UNIQUE 중복 제거로 제한 | Standard queue의 서비스 보장 | FIFO의 5분 발행 중복 제거와 message group 순서, 소비자 재처리는 별도 대비 |
| Redis Streams | 처리 전 cursor 확정 또는 XACK | 처리 후 XACK, stale PEL을 XAUTOCLAIM/XCLAIM으로 회수 | 미지원 |

## FIFO 큐의 보장 경계
SQS는 FIFO를 exactly-once processing이라고 설명하지만, 구체적인 메커니즘은 `MessageDeduplicationId`의 5분 발행 중복 제거와 message group 안의 순서 보장이다. consumer가 visibility timeout 전에 처리 후 삭제하지 못하면 메시지가 다시 보이고 중복 효과가 생길 수 있으므로, 처리 시간을 반영한 timeout과 멱등한 handler가 필요하다.

## At-Least-Once 구현의 두 축

### 소비자 측 — 멱등성 (Consumer Idempotency)
중복 메시지를 안전하게 처리하는 패턴. 상세 구현은 [[Idempotency-Key|멱등성 키]] 참고.

### 생산자 측 — 발행 신뢰성 (Transactional Outbox)
비즈니스 데이터와 Outbox 레코드를 같은 DB 트랜잭션으로 저장한다. broker 발행은 별도 relay가 수행하므로 DB commit과 broker publish가 하나의 원자적 트랜잭션이 되는 것은 아니며, relay 재시도에 따른 중복 발행을 소비자 멱등성으로 흡수해야 한다. 상세 패턴은 [[Transactional-Outbox|Transactional Outbox]] 참고.

소비자 측 멱등성 + 생산자 측 Outbox는 end-to-end at-least-once 설계의 두 핵심 축이다. 발행 재시도, 재처리 기간, 관측과 대사까지 함께 설계해야 한다.

## 출처

- [Amazon SQS Developer Guide, FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html)
- [Amazon SQS Developer Guide, Outage recovery scenarios](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/designing-for-outage-recovery-scenarios.html)
- [AWS Prescriptive Guidance, Transactional Outbox Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Apache Kafka 4.3, Design](https://kafka.apache.org/43/design/design/)
- [RabbitMQ, Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [Redis, Streams](https://redis.io/docs/latest/develop/data-types/streams/)

## 관련 문서
- [[At-Least-Once]]
- [[Idempotency-Key]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[MQ-Kafka|Kafka]]
