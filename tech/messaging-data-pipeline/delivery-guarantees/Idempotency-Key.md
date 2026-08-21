---
tags: [messaging]
status: done
verified_at: 2026-08-21
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Idempotency Key", "멱등성 키"]
---

# 멱등성 키 (Idempotency Key)

같은 요청이 여러 번 실행되어도 결과가 동일하도록 보장하기 위한 고유 식별자

## 왜 필요한가
At-Least-Once 전달에서 메시지 중복 처리가 불가피하다. 멱등성 키로 같은 업무 요청을 식별하고 처리 상태와 결과를 연결한다. 키 자체가 완료나 원자성을 보장하지는 않는다.

## 고유 식별자 종류
- eventId: 이벤트 시스템에서 발급
- requestId: API 클라이언트가 생성 (UUID v4)
- paymentId: 결제 시스템 고유 ID
- transactionId: 트랜잭션 추적용
- 해시 기반: 요청 본문의 해시값 (동일 입력 = 동일 해시)

## 중복 감지 저장소

### 데이터베이스 (UNIQUE 제약)
```sql
CREATE TABLE idempotency_records (
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  status ENUM('PROCESSING', 'COMPLETED', 'FAILED'),
  owner_token VARCHAR(36),
  heartbeat_at TIMESTAMP NULL,
  result JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);
```
장점: 트랜잭션 보장, 영속성
단점: 쿼리 비용

같은 DB의 짧은 업무 쓰기는 이 레코드와 한 트랜잭션으로 묶는다. crash 시 둘 다 rollback되므로 durable `PROCESSING` lease가 필요 없다. 오래 걸리거나 외부 효과가 있는 작업은 claim을 별도 트랜잭션에서 `PROCESSING`으로 커밋하고, 신선한 lease는 ACK하지 않으며 만료된 lease만 새 owner가 회수한다. 완료 UPDATE에도 owner 조건을 둔다.

### Redis (claim lease + TTL)
```text
SET idempotency:{key} PROCESSING:{owner_token} NX EX {lease_seconds}
```
장점: 빠른 원자적 claim, 자동 만료
단점: `SET NX`는 완료 기록이 아니다. 처리 전에 이를 완료 marker로 쓰면 crash 뒤 작업이 유실된다. 긴 작업은 owner token을 확인하며 lease를 연장하고, 완료 전이는 Lua 등으로 owner 조건을 검사한다. Redis 장애와 failover 때 claim이 유실될 수 있으므로 같은 DB의 업무 쓰기는 Inbox 트랜잭션을 우선하고 외부 효과는 provider 멱등 키와 대사로 보호한다.

## TTL 정리
멱등성 레코드를 영구 보관하면 저장소가 무한 증가한다. TTL은 임의의 고정값이 아니라 실제 중복 가능 기간보다 길게 잡는다.
- 일반 API: 클라이언트 재시도와 응답 재사용 윈도
- 결제와 외부 API: provider가 키를 보관하는 계약과 업무상 대사 기간
- 이벤트 처리: 큐 보존, DLQ redrive와 수동 재처리 윈도

## 실전 사례: Stripe Idempotency Key

- API v1: 같은 파라미터와 키로 재시도하면 보관 기간 안에서 첫 status code와 body를 다시 반환한다. 키는 최소 24시간 뒤 삭제될 수 있고, 파라미터가 달라지면 오류다.
- API v2: 같은 API, 계정 또는 sandbox와 키를 30일 안에 사용해야 같은 요청으로 본다. 성공 요청은 새 부수효과 없이 갱신된 응답을 반환하지만 실패 요청은 다시 실행할 수 있어 v1과 의미가 다르다.

## 출처

- [Stripe API — Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe API v2 overview — Idempotency](https://docs.stripe.com/api-v2-overview#idempotency)

## 관련 문서
- [[At-Least-Once]]
- [[Delivery-Semantics|전달 보장]]
- [[Idempotent-Consumer|Deduplication]]
