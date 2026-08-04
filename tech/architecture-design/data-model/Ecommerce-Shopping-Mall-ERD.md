---
tags: [architecture, data-model, ecommerce, catalog, order, payment, settlement]
status: done
verified_at: 2026-08-04
category: "Architecture - 데이터 모델"
aliases: ["Ecommerce ERD", "Shopping Mall ERD", "이커머스 ERD"]
---

# 이커머스 도메인 모델링

커머스는 상품 CRUD의 집합이 아니다. 카탈로그, 고객 행동, 할인 자산, 주문, 외부 결제와 정산이 서로 다른 생명주기와 실패 경계를 가진다. 화면이나 현재 table을 그대로 개념도로 옮기기보다 **정책, 원본 데이터, 금액과 시점의 의미**를 먼저 정의한다.

## 요구사항에서 정책을 찾는다

기획 화면만 보고 구현을 시작하면 다음 질문이 뒤늦게 schema와 API를 흔든다.

- 목록은 어떤 조건으로 필터링/정렬하며 데이터 변경 중 paging 일관성이 필요한가?
- 리뷰는 주문 1건, 수량 1개, 상품 1개 중 무엇을 기준으로 몇 번 쓸 수 있는가?
- 상품이 판매 중지되거나 주문이 취소되면 리뷰, 찜과 장바구니는 어떻게 보이는가?
- point/coupon은 언제 예약, 확정, 만료, 복원되며 누가 소유하는가?
- PG timeout 때 결제가 성공했는지 모르는 상태를 어떻게 확인하고 복구하는가?
- 정산 완료 뒤 환불은 어느 차수에서 상계하며 누가 승인하는가?

팀 규모, 운영 인력, 트래픽, RDB 중심 여부는 해법의 입력이다. 특정 강의의 소규모 팀 가정이나 현재 code 구조를 모든 서비스의 정답으로 확대하지 않는다.

## 개념 지도와 경계

| 영역 | 핵심 개념 | 주된 불변식 |
|---|---|---|
| Catalog | Product, Option, Category, Price | 판매 가능 option과 현재 표시 정보 |
| Engagement | Review, Question/Answer, Favorite | 작성 권한, 공개 범위, 대상 존재 |
| Benefit | Point Ledger, Coupon/Entitlement | 잔액, 소유권, 사용/복원 횟수 |
| Cart | Cart, Cart Item | 임시 선택과 원하는 수량 |
| Order | Order, Order Line, Price Snapshot | 구매 의도와 확정 금액의 재현 |
| Payment | Payment Attempt, Provider Event | 외부 승인과 내부 상태의 수렴 |
| Cancel | Cancellation, Refund/Benefit Reversal | 누적 취소액과 수량 상한 |
| Settlement | Settlement Target, Transfer | 원천 거래 추적과 중복 이체 방지 |

경계는 곧 class, module 또는 table 하나라는 뜻이 아니다. 변경 이유와 불변식을 응집시키는 논리적 지도다. 읽기 API는 여러 경계의 projection을 조합할 수 있지만, 한 component가 다른 component의 내부 상태를 임의로 수정하게 하지는 않는다.

## 이 문서가 유지하는 기준 패턴

### 거래 연관 데이터는 soft delete를 기본으로 한다

상품, 주문, 결제, 쿠폰 사용, review처럼 환불, 분쟁, 재처리와 감사에 다시 필요한 row는 `deleted_at`을 두고 soft delete하는 것을 이 문서의 기준으로 유지한다. 삭제 뒤에도 주문 snapshot과 외래 키 의미가 보존되어야 하기 때문이다.

- 일반 사용자의 기본 query에서는 삭제 row를 숨긴다.
- 관리자 복구/감사 경로는 권한을 분리해 삭제 row를 조회한다.
- 보존 기간이 끝났거나 개인정보 삭제 의무가 생기면 archive, anonymization 또는 hard delete를 별도 절차로 수행한다.
- cache, search index와 통계 projection에도 삭제 event를 전파한다.

따라서 기준은 거래 연관 데이터의 soft delete다. 다만 임시 upload, 재생성 가능한 cache처럼 증거 가치가 없는 row까지 영구 보존한다는 뜻은 아니다.

### Cart, Order, Order Publish의 3단계를 유지한다

```text
shopping_carts -> shopping_orders -> shopping_order_publishes
임시 선택          구매 신청/금액 확정       결제 성공 후 발행
```

- `shopping_carts`: 결제 전까지 바뀔 수 있는 임시 선택과 수량이다.
- `shopping_orders`: 구매 의도, 서버가 계산한 가격, 할인과 주문 시점 snapshot을 확정한다.
- `shopping_order_publishes`: PG 승인 뒤 외부에 효력이 생긴 주문 발행 기록이며 승인 근거, 취소/환불과 정산 추적의 출발점이다.

결제 실패와 재시도, 여러 payment attempt, 승인 뒤 후처리 실패를 주문 한 row의 status 변경만으로 뭉개지 않는 것이 이 분리의 목적이다. `order_publishes`라는 이름은 이 vault의 기준 모델이며, 다른 시스템에서는 `order_confirmation`, `payment_capture` 또는 별도 event/ledger로 같은 경계를 표현할 수 있다.

## 상품 목록과 상세

목록은 검색 조건, 정렬 tie-breaker와 pagination 계약을 먼저 정한다. 작은 backoffice에는 offset/limit도 충분하지만, 깊은 page와 잦은 변경이 문제라면 안정적인 복합 정렬 키를 가진 keyset pagination을 검토한다.

상품 상세가 review, coupon과 Q&A를 보여준다고 Product aggregate가 모두 소유해야 하는 것은 아니다. API composition이나 read model로 화면을 조합하고 각 정보의 실패 허용 범위를 정한다.

- 상품 기본 정보와 구매에 필요한 가격/재고는 강한 경로로 제공한다.
- review 요약처럼 부가 정보는 별도 query, timeout 또는 fallback을 둘 수 있다.
- 주문은 현재 상품 가격을 재조회하지 않고 구매 시점의 이름, option, 단가와 할인 근거를 snapshot한다.
- 거래에 연결된 상품은 위 기준대로 soft delete하고 주문 snapshot을 보존한다. 거래와 무관한 임시 데이터는 보존 요구에 따라 hard delete할 수 있다.

## Review, Q&A와 Favorite

### Review

구매 인증 review라면 단순 `(user_id, product_id)`보다 작성 자격의 근거인 order line을 보존한다. 여러 개 구매, 재구매, 부분 취소와 option별 review 정책을 명시하고 unique key도 그 정책을 반영한다.

- 별점 범위와 평균 집계에 삭제/비공개 review를 포함할지 정한다.
- 수정 가능 기간, 신고/블라인드와 답글 권한은 policy로 분리한다.
- reward point 지급은 review 저장과 같은 뜻이 아니다. idempotent 지급 ledger와 취소/reversal 규칙을 둔다.
- 여러 target을 지원하는 polymorphic key는 일반 FK가 약해진다. target별 table, registry 또는 orphan 검증 비용을 비교한다.

### Q&A

Question과 Answer는 작성자, 공개 범위와 lifecycle이 다르므로 명시적인 개념으로 둘 수 있다. 비밀 글은 응답에서 가리는 것만으로 충분하지 않다. 목록, 상세, 검색, 알림과 관리자 query 모두 같은 authorization policy를 거쳐야 한다.

### Favorite

`UNIQUE(user_id, target_id)`로 중복을 막고, 원하는 최종 상태를 표현하는 `PUT`/`DELETE`를 쓰면 빠른 재시도에도 수렴하기 쉽다. client가 보낸 현재 상태를 진실로 믿고 toggle하면 stale UI와 동시 요청이 상태를 뒤집을 수 있다. 찜한 시각과 상품 수정 시각은 의미가 다르므로 별도 field로 보존한다.

## Point와 Coupon

Point는 금전성 자산처럼 **불변 ledger와 잔액 projection**을 함께 둔다.

```text
PointEntry(id, accountId, amount, reason, sourceType, sourceId, expiresAt)
PointBalance(accountId, available, version)
```

- 동일 원천의 적립/사용/복원이 한 번만 기록되도록 idempotency key와 unique constraint를 둔다.
- 잔액이 음수가 되지 않도록 조건부 update, row lock 또는 version CAS를 사용한다.
- optimistic lock 하나가 retry, 사용자 오류와 외부 결제 보상을 자동 해결하지는 않는다.
- 모든 가입자에게 빈 잔액 row를 미리 만들지, 최초 사용 때 만들지는 규모와 query 단순성으로 정한다.
- 만료가 있으면 어느 entry부터 차감하는지, 취소 시 원래 만료일을 되살리는지 정책을 기록한다.

Coupon definition과 사용자가 받은 entitlement를 분리한다. 적용 대상, 정액/정률, 상한, 최소 금액, 유효 기간은 definition에, 발급 시점 조건과 사용 이력은 entitlement/redemption에 남긴다. 목록에 보이는 쿠폰과 checkout에서 실제 사용할 수 있는 쿠폰은 검증 시점이 다르다.

## Cart에서 Order로

Cart는 임시 의사 표현이다. table 하나가 없어도 논리적 aggregate일 수 있고, 반대로 공유/비회원/복수 cart가 필요하면 명시적 Cart와 membership이 필요하다.

- Cart Item은 product보다 구매 가능한 option/SKU와 수량을 가리킨다.
- 담을 때와 주문할 때 사이의 가격, 재고, 판매 상태와 최대 수량을 다시 검증한다.
- client가 보낸 총액을 승인 금액으로 사용하지 않고 서버가 가격, 할인과 배송비를 계산한다.
- 바로 구매와 cart 구매는 공통 `CreateOrder` command로 정규화하되 원천 channel은 감사용으로 남긴다.
- 내부 PK와 외부 노출용 order key를 분리할 수 있지만, 예측 불가능성만으로 authorization을 대신하지 않는다.

주문이 생성되는 시점, 재고 예약과 만료, coupon/point 예약 또는 확정 시점을 하나의 상태 전이 계약으로 만든다. 현재 catalog가 바뀌어도 과거 주문 금액을 다시 계산할 수 있어야 한다.

Order 생성, 취소와 재고 차감/복원은 단순 setter 묶음이 아니라 불변식을 지키는 domain behavior다. Service는 transaction 안에서 authoritative ID로 managed entity를 조회하고 use case를 조율하며, entity의 의미 있는 method가 상태 전이를 수행하게 한다. Cascade는 같은 생명주기를 소유하는 범위에만 두고, 동시 주문의 재고 상한은 DB constraint, lock 또는 version CAS로도 지킨다.

주문 검색 조건은 parameter binding을 사용하는 JPQL, Criteria 또는 typed query builder로 조립한다. 문자열 연결로 사용자 입력을 query에 삽입하지 않고, 조건 조합이 커지면 별도 query repository와 projection으로 command model에서 분리한다.

## Payment, Cancel과 Settlement

```text
Order -> PaymentAttempt -> ProviderEvent
      -> Cancellation -> Refund/Point/Coupon Reversal
      -> SettlementTarget -> SettlementTransfer
```

- PG 요청에는 provider가 지원하는 idempotency key를 쓰고 내부에도 request/result를 남긴다.
- timeout은 실패가 아니라 결과 미확정일 수 있다. provider 조회와 webhook으로 수렴시킨다.
- webhook은 raw body 기반 서명 검증, event 중복 제거와 out-of-order 처리가 필요하다.
- Payment row를 무조건 immutable로 만들 필요는 없지만 승인, 실패와 환불 증거를 덮어써서 잃지 않는다.
- Cancellation은 원 주문 line, 수량, 현금 환불, point/coupon reversal과 reason을 추적한다.

정산은 대상 적재, 계산, 이체를 분리하면 재실행과 검토가 쉬워진다. cron이 API를 호출할지 batch framework를 쓸지는 규모와 복구 요구의 선택이지 정합성 보장이 아니다. 정산 완료 뒤 취소는 다음 차수의 음수 조정/상계로 표현하고, PG/주문/환불/실제 이체를 주기적으로 대사한다.

## NestJS와 TypeORM 적용

- module 경계는 도메인 책임을 드러내되 화면 query를 위해 projection/query service를 둔다.
- 같은 DB의 order, ledger와 reservation 변경은 제공된 transactional EntityManager 하나로 처리한다.
- PG call과 DB transaction을 오래 묶지 않고 pending state, idempotency와 recovery worker로 연결한다.
- favorite, review 자격, point entry와 settlement target에 업무상 unique constraint를 둔다.
- 상태 전이, 금액 배분, 만료와 복원 규칙은 순수 policy로 분리해 table/property test를 작성한다.

## 출처

- [Stripe, Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe, Webhook signature verification](https://docs.stripe.com/webhooks/signature)
- [TypeORM, Transactions](https://typeorm.io/docs/transactions/)
- 강의 준비: [소개](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354217), [구성](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354078), [상황 정의](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354077), [프로젝트 구조](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354079)
- 상품 목록: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354096), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354097), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354098)
- 상품 상세: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354099), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354120), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354121)
- Review: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354100), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354119), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354122)
- Q&A: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354101), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354118), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354123)
- Favorite: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354102), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354117), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354124)
- Point: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354103), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354116), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354125)
- Coupon: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354104), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354115), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354126)
- Cart: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354105), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354114), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354127)
- Order: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354106), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354113), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354128)
- Payment: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354107), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354112), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354129)
- Cancel: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354108), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354111), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354130)
- Settlement: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354109), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354110), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354131)
- 마무리: [전체 개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354093), [다음 단계](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354094), [학습 방향](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354662)
- 김영한 강사, 활용 1 커머스 모델: [요구사항 분석](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24281), [구현 요구사항](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24286), [애플리케이션 아키텍처](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24287), [상품 엔티티 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24293), [주문, 주문상품 엔티티 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24297), [주문 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24299), [주문 검색 기능 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24301)

## 관련 문서

- [[Commerce-Change-Propagation-and-Money-Invariants|커머스 변경 전파와 금액 불변식]]
- [[Payment-System-Principles|결제 시스템 원칙]]
- [[Soft-Delete-and-Data-Lifecycle|Soft delete와 데이터 생명주기]]
- [[Pagination-Optimization|Pagination 최적화]]
- [[Transactional-Outbox|Transactional Outbox]]
