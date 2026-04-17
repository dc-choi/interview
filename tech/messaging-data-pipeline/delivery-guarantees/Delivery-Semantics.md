---
tags: [messaging]
status: done
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
메시지가 정확히 한 번만 전달된다. 유실 없음, 중복 없음.
- 이론적으로 불가능 (Two Generals' Problem)
- 실무에서는 "effectively once"로 구현: At-Least-Once + 멱등성
- 높은 구현 복잡도와 성능 비용
- Kafka의 Exactly-Once Semantics (EOS): 트랜잭션 기반 Producer-Consumer

## 시스템별 지원 현황

| 시스템 | At-Most-Once | At-Least-Once | Exactly-Once |
|--------|-------------|---------------|--------------|
| Kafka | 지원 | 기본값 | 트랜잭션 기반 |
| RabbitMQ | 지원 | 기본값 | 미지원 (앱 레벨 구현) |
| SQS | 지원 | Standard 기본 | FIFO (발행측만) |
| Redis Streams | 지원 | XACK 기반 | 미지원 |

## FIFO 큐의 오해
SQS FIFO는 "exactly-once"를 발행(publishing) 측에서만 5분 내 보장한다. 소비자 측은 여전히 at-least-once이므로 멱등한 핸들러가 필요하다.

## At-Least-Once 구현의 두 축

### 소비자 측 — 멱등성 (Consumer Idempotency)
중복 메시지를 안전하게 처리하는 패턴. 상세 구현은 [[Idempotency-Key|멱등성 키]] 참고.

### 생산자 측 — 발행 신뢰성 (Transactional Outbox)
DB 쓰기와 메시지 발행의 원자성 보장. 상세 패턴은 [[Transactional-Outbox|Transactional Outbox]] 참고.

소비자 측 멱등성 + 생산자 측 Outbox가 짝을 이루어 **end-to-end at-least-once 신뢰성**을 확보한다.

## 관련 문서
- [[At-Least-Once]]
- [[Idempotency-Key]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[MQ-Kafka|Kafka]]
