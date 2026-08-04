---
tags: [reliability, payment, reconciliation, scheduler, idempotency]
status: done
verified_at: 2026-08-04
category: "Reliability"
aliases: ["Payment Reconciliation Worker", "결제 누락 대사 배치"]
---

# 결제 대사 worker

결제 대사는 PG/provider의 거래 원장과 내부 주문/결제 원장을 주기적으로 비교해 누락, 중복과 상태 불일치를 찾고 수렴시키는 안전망이다. webhook이나 동기 응답을 대체하는 것이 아니라 그 경로가 놓친 상태를 복구한다.

## 한 번의 차집합으로 취소하지 않는다

`provider 결제 - 내부 paid 주문` 차집합은 조사 후보이지 즉시 취소 명령이 아니다. 다음 이유로 정상 거래도 잠시 불일치할 수 있다.

- webhook, replica와 transaction 반영 지연
- 조회 구간의 시계 차이와 page 경계 이동
- provider 성공 뒤 내부 응답 timeout
- 부분 결제, 부분 취소와 여러 payment attempt
- 내부 조회 장애 또는 배치 자체의 부분 실패

자동 취소 전에는 grace period를 적용하고 provider의 최신 상태와 내부 주문을 다시 조회한다. 금액, currency, merchant order key, payment attempt와 승인 시각까지 맞춘 뒤에도 설명되지 않는 건만 policy에 따라 취소하거나 수동 검토 queue로 보낸다.

## 처리 단계

```text
거래 구간 결정
  -> provider page 수집
  -> 내부 원장 조회
  -> 정규화와 matching
  -> discrepancy 기록
  -> 재확인
  -> 자동 보정 또는 수동 검토
  -> 다음 실행용 watermark 갱신
```

### 1. 안정적인 구간과 page

- provider가 cursor를 주면 cursor를 우선하고, page/offset만 있으면 조회 중 데이터 이동을 고려한다.
- `from <= paidAt < to`처럼 반개구간을 사용하고 경계를 일부 겹쳐 다시 읽는다.
- provider transaction ID로 deduplicate한다.
- page 전체를 성공적으로 저장하기 전 cursor를 전진시키지 않는다.
- 오래된 구간을 다시 검사하는 backfill job을 별도로 둔다.

### 2. canonical record로 정규화

```ts
type ProviderPayment = {
  providerPaymentId: string;
  merchantOrderId: string;
  status: "PAID" | "CANCELLED" | "PARTIAL_CANCELLED" | "FAILED";
  amountMinor: bigint;
  currency: string;
  approvedAt: Date | null;
};
```

provider별 status와 금액 표현을 adapter에서 canonical form으로 바꾼다. 표시용 부동소수점이 아니라 minor unit integer 또는 통화별 scale을 아는 decimal을 사용한다.

### 3. 불일치를 durable하게 기록

discrepancy는 log 한 줄이 아니라 재처리 가능한 record다.

- 비교 구간과 source cursor
- provider/internal 식별자와 관측한 status
- first seen/last checked 시각과 시도 횟수
- 판단 근거, 자동 조치 가능 여부와 최종 결과
- operator 승인과 audit trail

업무 key에 unique constraint를 두어 같은 차이를 여러 worker가 중복 조치하지 않게 한다.

### 4. 재확인 뒤 조치

외부 취소/환불 요청은 provider가 지원하는 `Idempotency-Key`를 사용하고 내부에도 같은 operation key와 응답을 저장한다. timeout은 실패 확정이 아니므로 새 key로 다시 취소하지 않고 동일 key 재시도 또는 결제 상태 조회로 결과를 확인한다.

자동 보정 policy는 보수적으로 시작한다.

- 내부 주문이 실제로 존재하지 않는가
- 승인 후 grace period가 지났는가
- 이미 취소/환불 중인 attempt가 없는가
- 전액/부분 취소 가능 기간과 금액이 맞는가
- 조회 경로가 healthy했고 page가 완전했는가

조건이 애매하거나 금액이 임계값을 넘으면 수동 검토로 보낸다.

## 반복 실행과 부하 제어

- async job 완료 뒤 다음 실행을 예약해 같은 process 안의 overlap을 피한다.
- 여러 instance에서는 lease, distributed lock 또는 single-active queue consumer를 사용한다.
- provider rate limit보다 낮은 bounded concurrency를 두고 429/5xx에는 jitter를 포함한 backoff를 적용한다.
- cancellation API와 조회 API가 같은 quota를 공유하는지 확인한다.
- shutdown 때 새 page 수집을 중단하고 현재 cursor/discrepancy 저장을 마친다.
- queue lag, last successful watermark, discrepancy age/amount와 correction 실패를 alert한다.

단순 `Promise.all`은 동시 실행 도구일 뿐 scheduler lock, cursor durability, 취소 멱등성과 판단 policy를 제공하지 않는다.

## NestJS와 TypeORM 경계

- `ProviderPaymentReader`: provider page와 단건 상태 조회
- `PaymentReconciliationService`: matching과 discrepancy policy
- `PaymentCorrectionPort`: 취소/환불 같은 외부 명령
- `ReconciliationRun`/`PaymentDiscrepancy` entity: cursor, 상태와 audit 저장
- queue processor 또는 scheduler adapter: trigger, lease와 concurrency

외부 API 호출을 DB transaction 안에서 오래 기다리지 않는다. `PENDING_ACTION`을 transaction으로 선점하고 commit한 뒤 외부 요청을 수행하며, 결과를 별도 transaction으로 반영한다. crash 뒤에는 같은 operation key로 재개한다.

## 테스트

- page 경계에서 새 거래가 생겨도 누락하지 않는가
- 같은 page와 webhook을 반복 처리해도 결과가 같은가
- timeout 뒤 재시도가 이중 취소를 만들지 않는가
- 내부 반영 지연 중 정상 결제를 성급히 취소하지 않는가
- 부분 취소와 여러 payment attempt를 올바르게 matching하는가
- worker 두 개가 같은 discrepancy를 동시에 잡아도 한 번만 조치하는가
- 오래된 watermark와 provider 장애 뒤 backfill이 가능한가

## 출처

- [PortOne REST API V2, 조회/취소와 멱등 키](https://developers.portone.io/api/rest-v2?v=v2)
- [Stripe, idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe, webhook best practices](https://docs.stripe.com/webhooks)
- [결제 누락 scheduler API](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19718)
- [provider 결제 page 수집](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19719)
- [내부 주문 조회](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19720)
- [비교와 결제 취소](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19721)
- [반복 실행](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19722)

## 관련 문서

- [[Payment-System-Principles|결제 시스템 원칙]]
- [[External-API-Integration-Patterns|외부 API 연동 패턴]]
- [[JavaScript-Async-Iterable-Pipelines|JavaScript 비동기 이터러블 파이프라인]]
- [[Idempotency|HTTP 멱등성]]
- [[Transactional-Outbox|Transactional Outbox]]
