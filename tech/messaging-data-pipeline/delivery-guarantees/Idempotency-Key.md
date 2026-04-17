---
tags: [messaging]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Idempotency Key", "멱등성 키"]
---

# 멱등성 키 (Idempotency Key)

같은 요청이 여러 번 실행되어도 결과가 동일하도록 보장하기 위한 고유 식별자

## 왜 필요한가
At-Least-Once 전달에서 메시지 중복 처리가 불가피하다. 멱등성 키로 "이미 처리된 요청"을 식별하여 중복 실행을 방지한다.

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
  result JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);
```
장점: 트랜잭션 보장, 영속성
단점: 쿼리 비용

### Redis (SET + TTL)
```
SET idempotency:{key} {status} NX EX 86400
```
장점: 빠른 조회, 자동 만료
단점: 영속성 불보장, 장애 시 유실 가능

## TTL 정리
멱등성 레코드를 영구 보관하면 저장소가 무한 증가한다. 적절한 TTL을 설정하여 오래된 레코드를 자동 삭제한다.
- 일반 API: 24시간
- 결제: 7일 이상
- 이벤트 처리: 메시지 재시도 윈도우의 2배

## 실전 사례: Stripe Idempotency Key
Stripe API는 Idempotency-Key 헤더를 지원한다. 같은 키로 요청하면 원본 응답을 그대로 반환하여 이중 결제를 방지한다.

## 관련 문서
- [[At-Least-Once]]
- [[Delivery-Semantics|전달 보장]]
- [[Deduplication|Deduplication 전략]]
