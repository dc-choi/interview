---
tags: [messaging]
status: done
verified_at: 2026-08-31
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Idempotency Key", "멱등성 키"]
---

# 멱등성 키 (Idempotency Key)

같은 요청이 여러 번 실행되어도 결과가 동일하도록 보장하기 위한 고유 식별자

## 왜 필요한가
At-Least-Once 전달에서는 중복 처리가 발생할 수 있다. 멱등성 키로 같은 업무 요청을 식별하고 처리 상태와 결과를 연결한다. 키 자체가 완료나 원자성을 보장하지는 않는다.

## 고유 식별자 종류
- eventId: 이벤트 시스템에서 발급한 업무 이벤트 ID
- idempotency key: API 클라이언트가 한 번의 의도한 작업마다 생성한 UUID 같은 값. 재시도할 때만 같은 키를 재사용
- paymentId: 결제 provider와 합의한 업무 식별자

요청 본문 해시는 키가 아니라 **같은 키로 다른 payload가 들어왔는지 검증하는 fingerprint**로 둔다. 본문이 같아도 서로 다른 두 구매일 수 있으므로 해시만으로 별도 작업을 합치지 않는다. 로그 추적용 request ID나 transaction ID도 재시도 의미가 합의된 경우가 아니면 멱등성 키로 재사용하지 않는다.

## 중복 감지 저장소

### 데이터베이스 (UNIQUE 제약)
```sql
CREATE TABLE idempotency_records (
  scope_id VARCHAR(255) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  status ENUM('PROCESSING', 'COMPLETED', 'FAILED'),
  owner_token VARCHAR(36),
  heartbeat_at TIMESTAMP NULL,
  result JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE (scope_id, operation, idempotency_key)
);
```
장점: 트랜잭션 보장, 영속성
단점: 쿼리 비용

`scope_id`에는 tenant나 actor처럼 키 재사용 범위를 식별할 값을 넣는다. 같은 키를 다시 받으면 `request_hash`까지 비교해 payload가 다르면 거부한다.

트랜잭션을 지원하는 같은 DB의 짧은 업무 쓰기는 이 레코드와 한 트랜잭션으로 묶는다. commit 전 crash면 둘 다 rollback되고, commit 뒤에는 둘 다 확정되므로 durable `PROCESSING` lease가 필요 없다. 오래 걸리거나 외부 효과가 있는 작업은 claim을 별도 트랜잭션에서 `PROCESSING`으로 커밋하고, 신선한 lease는 ACK하지 않으며 만료된 lease만 새 owner가 회수한다. 완료 UPDATE에도 owner 조건을 둔다.

### Redis (claim lease + TTL)
```text
SET idempotency:{scope}:{operation}:{key} PROCESSING:{owner_token} NX EX {lease_seconds}
```
장점: 빠른 원자적 claim, 자동 만료
단점: `SET NX`는 완료 기록이 아니다. 처리 전에 이를 완료 marker로 쓰면 crash 뒤 작업이 유실된다. 긴 작업은 owner token을 확인하며 lease를 연장하고, 완료 전이는 Lua 등으로 owner 조건을 검사한다. 비동기 복제하는 Redis Cluster는 장애 시 승인한 write도 잃을 수 있으므로, 같은 DB의 업무 쓰기는 Inbox 트랜잭션을 우선하고 외부 효과는 provider 멱등 키와 대사로 보호한다.

## TTL 정리
멱등성 레코드를 영구 보관하면 저장소가 무한 증가한다. TTL은 임의의 고정값이 아니라 실제 중복 가능 기간보다 길게 잡는다.
- 일반 API: 클라이언트 재시도와 응답 재사용 윈도
- 결제와 외부 API: provider가 키를 보관하는 계약과 업무상 대사 기간
- 이벤트 처리: 큐 보존, DLQ redrive와 수동 재처리 윈도

## 실전 사례: Stripe Idempotency Key

- API v1: 같은 파라미터와 키로 재시도하면 보관 기간 안에서 첫 status code와 body를 다시 반환한다. 키는 최소 24시간 뒤 삭제될 수 있고, 파라미터가 달라지면 오류다. 단, validation 실패나 동시 실행 충돌처럼 endpoint 실행 전 실패는 결과를 저장하지 않아 재시도할 수 있다.
- API v2: 같은 API, 계정 또는 sandbox와 키를 30일 안에 사용해야 같은 요청으로 본다. 성공 요청은 새 부수효과 없이 갱신된 응답을 반환하지만 실패 요청은 다시 실행할 수 있어 v1과 의미가 다르다.

### 오류 응답 재생과 업무 결과 확인

2026-10-16 Stripe 공식 문서 대조 기준, API v1은 endpoint 실행 뒤 저장한 `500` 응답도 같은 키에 재생한다. **같은 오류가 돌아온다는 사실은 업무가 실행되지 않았다는 증거가 아니다.** 결과가 불명확한 상태에서 새 키로 다시 호출하면 별도 작업이 생길 수 있다.

- 응답을 받지 못한 네트워크 오류는 최초 요청 후 24시간 안에서 같은 키와 파라미터로 재시도한다. 그 뒤에도 결과를 모르면 재호출을 멈추고 관련 객체, 요청 기록과 웹훅으로 대사한다.
- `500`을 받았을 때는 기존 결과부터 확인한다. Stripe의 복구 과정에서 객체가 생성될 수 있고, 저장된 오류 응답은 그대로일 수 있다.
- SDK의 내부 재시도와 별도 SDK 호출 또는 프로세스 재시작 후 재처리를 구분한다. 후자까지 같은 업무로 묶으려면 애플리케이션이 키를 영속화하고 각 시도에 전달한다.
- 검증 예시: 응답 유실 후 같은 키 재전송, 처리 중 동시 호출, 저장된 `500` 재생에서 중복 업무 효과와 로컬 처리 상태를 함께 확인한다. 오류 응답 수만 세어 완료를 판정하지 않는다.

이 절은 API v1의 재시도와 결과 확인 범위를 검증했다. API v2와 자체 멱등성 저장소의 오류 처리 계약은 별도로 확인한다.

## 출처

- [Stripe Docs, Advanced error handling](https://docs.stripe.com/error-low-level)
- [Stripe API, Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe API v2, Idempotency](https://docs.stripe.com/api-v2-overview#idempotency)
- [Redis — SET](https://redis.io/docs/latest/commands/set/)
- [Redis — Scale with Redis Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)

## 관련 문서
- [[At-Least-Once]]
- [[Delivery-Semantics|전달 보장]]
- [[Idempotent-Consumer|Deduplication]]
