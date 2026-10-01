---
tags: [reliability, payment, reconciliation, scheduler, idempotency]
status: done
verified_at: 2026-09-30
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
- `from <= paidAt < to`처럼 반개구간을 사용하고 경계를 일부 겹쳐 다시 읽는다. provider 조회가 양 끝을 모두 포함하면 인접 구간이 경계 시각의 결제를 두 번 돌려준다.
- 조회 기준 시각이 생성, 승인, 최종 상태 변경 중 무엇인지 API마다 확인하고 구간 경계와 겹침 폭을 그 기준으로 정한다.
- provider transaction ID로 deduplicate한다.
- page 전체를 성공적으로 저장하기 전 cursor를 전진시키지 않는다.
- 오래된 구간을 다시 검사하는 backfill job을 별도로 둔다. provider의 최대 조회 기간이나 page 깊이 제한보다 긴 구간은 나눠 수집한다.
- `to`를 현재보다 grace period만큼 과거로 닫으면 조회 중 새 결제가 구간에 들어와 page가 밀리는 일을 줄인다. 조회 중 상태가 바뀌어 결과에서 빠지는 건은 offset page를 앞으로 당겨 누락을 만들 수 있으므로 겹침 재조회나 cursor 조회로 보완한다.

#### page 수집 종료 조건

다음 page를 요청할지 이전 응답으로 판단하므로 page 수집은 본질적으로 순차다. 전체 건수를 먼저 주는 API라면 page 계획을 세워 rate limit 안에서 동시에 받을 수 있다. 종료 판단은 provider가 명시한 신호를 먼저 쓴다.

| 종료 신호 | 추가 요청 | 실패 모드 |
|---|---|---|
| 다음 page 번호, 전체 건수, 다음 cursor | 없음 | 조회 중 건수가 바뀌면 전체 건수로 세운 page 계획이 어긋난다 |
| 마지막 page가 page 크기보다 작음 | 총 건수가 page 크기의 배수일 때 빈 page 1회 | provider가 요청보다 작은 page를 주면 첫 page에서 끝났다고 오판해 나머지를 조용히 누락한다. 배수일 때의 추가 요청은 범위를 넘은 page라 빈 page 대신 오류(V1은 400)로 응답될 수 있다 |
| 빈 page | 항상 1회 | 범위를 넘은 page를 오류로 응답하는 API가 있다 |

page 크기 3에서 빈 page까지 읽는 조건과 크기 미달에서 멈추는 조건의 요청 수는 다음과 같다. 두 연산자의 경계 포함 차이는 [[JavaScript-Async-Iterable-Pipelines|비동기 이터러블 파이프라인]]에서 다룬다.

| 총 건수 | `takeWhile(length > 0)` | `takeUntil(length < 3)` |
|---|---|---|
| 8 (3, 3, 2) | 4회 | 3회 |
| 9 (3, 3, 3) | 4회 | 4회 |
| 0 | 1회 | 1회 |

- 무한 page 후보(`range(1, Infinity)`) 대신 최대 page 수를 상한으로 둔다. provider가 page 인자를 무시하고 가득 찬 page를 반복하면 크기 기준 종료 조건이 끝내 참이 되지 않는다. 새 page가 이미 본 ID만 담고 있어도 진행이 멈춘 것으로 본다.
- 상한에 닿거나 진행이 멈춘 구간은 수집 불완전으로 기록하고 자동 보정을 막는다. 아래 자동 보정 조건의 page 완전성이 이 기록을 확인한다.
- page 크기, 조회 기간과 깊이 제한은 provider 버전마다 바뀌므로 코드 상수가 아니라 adapter 설정과 계약 테스트로 관리한다.

2026-09-30 PortOne 공식 명세 기준 값은 다음과 같다.

- V1(`api.iamport.kr`) 결제상태기준 복수조회: 검색 기간은 최대 90일이고 `from`(>=)과 `to`(<=)를 모두 포함한다. 기준 시각은 최종 상태별로 달라(paid는 결제완료, cancelled는 취소 시각) paid 조회는 구간 안에서 승인된 뒤 취소된 건을 돌려주지 않는다. 역방향 대조는 cancelled 조회를 따로 한다. `limit`은 기본 20건, 설명상 최대 1000건이지만 응답 `list` 설명은 최대 20개라 명세 안에서도 엇갈리므로 응답의 `next`(없으면 0)와 `total`로 종료한다. 데이터 범위를 넘은 page는 400 응답으로 명세되어 있다.
- V2 결제 다건 조회(page 기반): 기본 size 10, `(number + 1) * size`가 60,000을 넘을 수 없다.
- V2 결제 대용량 다건 조회(cursor 기반): 결제 건 생성 시각 기준이고 `size`는 기본 10, 최대 1000, `from` 기본값은 `until`의 90일 전이다. 응답은 결제 건마다 cursor만 주고 종료 필드가 없으며, 명세는 page가 `size`만큼 찬다고 보장하지 않으므로 빈 `items` 응답과 위 상한으로 끝을 판단한다. 크기 미달 종료는 마지막이 아닌 page가 항상 가득 찬다는 것을 계약 테스트로 확인한 뒤에만 쓴다. 이 API는 unstable로 표기되어 Stable API 하위호환성 보장 대상이 아니며 정책과 무관하게 변경되거나 지원 종료될 수 있다. 주 수집 경로로 쓰면 계약 테스트를 유지하고, stable인 page 기반 `GET /payments`로 전환할 경로를 둔다. 그 API의 기본 조회 기준은 상태 승인 시점이므로 `filter.timestampType`을 `CREATED_AT`으로 지정해 생성 시각 기준을 맞춘다.

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

#### 내부 원장 조회와 대조

수집한 결제의 merchant order ID를 모아 내부 주문을 한 번에 조회한다(`WHERE id IN (...)`).

- ID 목록이 크면 DB와 driver의 bind parameter 한도에 맞춰 chunk로 나눈다.
- 대조 전에 내부 ID를 `Set`으로 바꾼다. 배열 `includes` 대조는 결제 수와 주문 수의 곱만큼 비교한다.
- 결제 완료 주문만 조회하면 주문서 없음과 결제 반영 누락이 같은 취소 후보로 합쳐진다. 상태와 무관하게 주문을 가져와 주문이 없으면 취소 후보로 두고, 결제 대기 주문이면 금액과 주문 유효성을 확인해 결제 완료로 수렴시킬지 먼저 검토한다.

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

provider가 key를 보존하는 기간이 지나면 같은 key도 새 요청으로 처리될 수 있다. PortOne V2의 멱등성 보장 기간은 3시간(추후 변경 가능)이고 Stripe는 24시간 이상 지난 key를 정리할 수 있다. 오래 멈췄다 재개한 조치는 재시도 전에 결제 상태부터 조회한다. 취소 가능 잔액 검증(PortOne V1 `checksum`, V2 `currentCancellableAmount`)을 함께 보내면 요청자가 아는 잔액과 provider 잔액이 다를 때 취소가 수행되지 않는다.

자동 보정 policy는 보수적으로 시작한다.

- 내부 주문이 실제로 존재하지 않는가
- 승인 후 grace period가 지났는가
- 이미 취소/환불 중인 attempt가 없는가
- 전액/부분 취소 가능 기간과 금액이 맞는가
- 결제수단이 즉시 취소되는가. PortOne V1 명세 기준 가상계좌와 KCP 휴대폰소액결제 익월 환불은 환불 계좌 정보와 별도 특약이 필요하고 익영업일에 처리된다
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
- 총 건수가 page 크기의 배수이거나 provider가 요청보다 작은 page를 줘도 누락 없이 끝나는가
- page 인자를 무시하는 provider에서 상한에 걸려 수집 불완전으로 기록되는가
- 같은 page와 webhook을 반복 처리해도 결과가 같은가
- timeout 뒤 재시도가 이중 취소를 만들지 않는가
- 내부 반영 지연 중 정상 결제를 성급히 취소하지 않는가
- 부분 취소와 여러 payment attempt를 올바르게 matching하는가
- worker 두 개가 같은 discrepancy를 동시에 잡아도 한 번만 조치하는가
- 오래된 watermark와 provider 장애 뒤 backfill이 가능한가

## 출처

- [PortOne REST API V2, 조회/취소, 멱등 키와 하위호환성 정책](https://developers.portone.io/api/rest-v2?v=v2)
- [PortOne REST API V1, 결제상태기준 복수조회와 결제취소](https://developers.portone.io/api/rest-v1/payment?v=v1)
- [PortOne REST API V2, 결제 다건 조회와 커서 기반 대용량 조회](https://developers.portone.io/api/rest-v2/payment?v=v2)
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
