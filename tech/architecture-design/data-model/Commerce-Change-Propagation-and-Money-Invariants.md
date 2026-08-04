---
tags: [architecture, ecommerce, data-model, payment, cancellation, settlement, migration]
status: done
verified_at: 2026-08-04
category: "Architecture - Data Model"
aliases: ["Commerce Change Propagation", "커머스 변경 영향", "커머스 금액 불변식"]
---

# 커머스 변경 전파와 금액 불변식

커머스의 작은 화면 변경은 상품, 주문, 결제, 취소와 정산의 데이터 의미를 바꿀 수 있다. 구현 file 수보다 먼저 **어떤 actor, 수량, 금액과 시점의 의미가 변하는지**를 추적해야 한다.

## 변경 영향 지도를 먼저 그린다

| 요구사항 | 직접 변경 | 함께 확인할 경계 |
|---|---|---|
| 상품 option 도입 | product, option, cart item | order line snapshot, review 대상, 재고, 취소, 정산 |
| brand/seller 찜 | favorite target | FK, 목록 조합, 삭제 상품, client 호환성 |
| 다회/정률 coupon | coupon entitlement | 사용 횟수, 최소 금액, 동시 결제, 취소 복원 |
| 공유 장바구니 | cart membership | 초대/만료, 권한, 개인 cart migration, 주문 소유자 |
| 주문 요청자와 결제자 분리 | order/payment actor | coupon/point 소유자, 취소 권한, 감사 기록 |
| 부분 취소 | cancellation line | 할인/point 배분, PG 환불, 잔여 수량, 정산 반전 |
| 가맹점별 정산 주기 | settlement window | cutoff/timezone, 환불 반영, 재실행과 대사 |

각 변경마다 source of truth, 기존 row, mixed-version 기간, API consumer와 운영 보고서까지 확인한다. 코드 search만으로 끝내지 않고 schema, query, batch와 실제 event 흐름을 대조한다.

## 상품 option 전환

기존 주문이 product만 가리키다가 option을 필수로 참조하게 되면 새 column 하나의 문제가 아니다. 과거 주문의 의미와 이후 재현 가능성을 보존해야 한다.

1. option table과 nullable reference를 먼저 추가한다.
2. option 없는 기존 product에 의미가 맞는 기본 option을 생성할지 정책으로 결정한다.
3. cart/order/review의 기존 row를 backfill하고 누락과 중복을 검증한다.
4. application을 dual-read 또는 새 column 우선으로 전환한다.
5. 모든 writer가 새 reference를 채우는지 metric으로 확인한다.
6. `NOT NULL`, FK와 unique constraint를 검증한 뒤 old path를 제거한다.

기본 option 생성이 모든 domain에 맞는 것은 아니다. 과거 주문은 당시 상품명, option명과 가격의 snapshot을 보존해야 하며 현재 catalog row로 다시 계산하지 않는다. 무중단이 필요 없으면 점검 배포가 더 단순하고 안전한 선택일 수 있다.

## 여러 종류의 찜 대상

`target_type + target_id` polymorphic association은 한 table로 확장하기 쉽지만 일반 FK로 각 대상의 존재를 보장하기 어렵다. 선택지는 다음과 같다.

- product/brand/seller별 favorite table로 강한 FK와 단순 query를 유지한다.
- 공통 target registry를 두고 favorite가 registry를 참조한다.
- polymorphic key를 사용하되 application validation, unique constraint와 orphan 정리 job을 운영한다.

찜 목록에 상품 정보를 합칠 때 ID별 반복 조회를 만들지 않고 batch query나 projection을 쓴다. 삭제/비공개 상품을 숨길지 tombstone으로 보여줄지는 기획 정책이다. `updatedAt` 비교 하나만으로 사용자가 관심 있는 변경을 정확히 뜻한다고 가정하지 않는다.

## 공유 장바구니는 권한 모델이다

공유 여부를 cart item에 전파하기보다 cart와 membership/access grant에 둔다. item은 자신이 어느 종류 cart에 속했는지 몰라도 되는 편이 변경 범위를 줄인다.

```text
Cart(id, type, ownerId, version)
CartMember(cartId, userId, role, status, expiresAt)
CartItem(cartId, optionId, quantity, addedBy, version)
Invite(tokenHash, cartId, role, expiresAt, consumedAt)
```

- 링크를 아는 것과 cart 접근 권한을 얻는 것을 구분한다.
- invite token 원문은 저장하지 않고 만료, 회수, 일회성 여부를 정한다.
- add/update/delete마다 membership과 role을 검증한다.
- 같은 item의 동시 수정에는 version 또는 원자적 quantity update를 사용한다.
- 주문 전환 시 cart의 현재 상태가 아니라 확정된 order snapshot을 만든다.

모든 사용자에게 개인 cart row를 미리 만들지 lazy creation을 유지할지는 규모와 query 단순성의 tradeoff다. migration 비용과 빈 row 수를 측정해 결정한다.

## coupon은 정의와 보유권을 분리한다

Coupon definition과 사용자가 받은 entitlement를 분리하면 정책 변경 뒤에도 발급 당시 조건을 추적하기 쉽다.

```text
CouponDefinition(type, value, minOrder, validWindow, maxUses)
CouponEntitlement(userId, couponId, issuedTermsSnapshot, usedCount, version)
CouponRedemption(entitlementId, paymentId, amount, status, idempotencyKey)
```

- 정액/정률 할인에는 상한, 적용 대상, 반올림과 최소 결제 금액을 함께 정의한다.
- 사용 가능 목록과 checkout 검증은 목적이 다르다. 목록 표시 정책이 실제 사용 검증을 약화시키면 안 된다.
- 다회권의 `usedCount < maxUses`는 조건부 update, row lock 또는 reservation으로 원자화한다.
- optimistic lock 충돌을 사용자 결제 완료 뒤 단순 실패로 돌려서는 안 된다. 차감 시점, 제한된 retry와 보상 정책을 함께 정한다.
- coupon 미적용은 무의미한 enum 값보다 optional discount나 명시적 tagged result가 더 자연스러울 수 있다.

취소 시 coupon 복원은 coupon entity 혼자 정할 수 없다. 전체 주문, 부분 취소 누계, 사용 조건과 정책 version을 본 cancellation policy가 redemption을 reversal할지 결정하고 이력을 남긴다.

## 주문자, 결제자와 소유권

주문 생성자, 상품 수령자, 결제 수단 소유자와 취소 요청자는 서로 다를 수 있다. 하나의 `userId`에 의미를 겹치지 않는다.

- order에는 requester/buyer/recipient 역할을 명시한다.
- payment에는 payer와 provider transaction ID를 기록한다.
- point와 coupon은 누구의 자산을 사용했는지 snapshot으로 남긴다.
- 조회와 취소 권한은 각 actor의 역할별 policy로 검사한다.

객체 전체를 넘기면 확장성이 생긴다는 규칙은 없다. component 경계에는 필요한 ID와 immutable command를 전달해 조회 시점, authorization과 transaction을 명확히 한다.

## 부분 취소와 환불 ledger

부분 취소는 flag가 아니라 누적 가능한 금액 ledger다. 최소 단위는 취소한 order line, option, quantity와 각 재화의 배분 결과를 표현해야 한다. 전체 취소를 `orderItemId = -1` 같은 sentinel로 표시하지 말고 cancellation type과 nullable relation에 constraint를 두거나 header/line을 분리한다.

핵심 불변식은 다음과 같다.

```text
0 <= 누적 취소 수량 <= 주문 수량
0 <= 누적 PG 환불액 <= 원 PG 승인액
주문 할인 배분 합 = 원 할인액, 반올림 잔여 포함
환불 현금 + 복원 point/coupon 효과 = 정책상 취소 보상액
동일 취소 요청의 재시도는 결과를 한 번만 만든다
```

권장 흐름은 검증, 금액 계산, 의도 저장, PG 요청, 결과 반영, 후처리다. 외부 PG 호출과 local DB를 하나의 transaction으로 묶을 수 없으므로 idempotency key, pending state와 timeout 뒤 조회/복구를 설계한다. Stripe도 부분 환불을 여러 번 허용하지만 누적액은 미환불 잔액을 넘을 수 없다.

금액 계산은 pure policy로 분리해 table test와 property test를 적용한다. 정상 case 외에 홀수 금액 반올림, 여러 차례 부분 취소, 마지막 잔여 취소, coupon/point 혼합, 동시 취소와 PG timeout을 검증한다.

## 정산은 원천 거래를 재구성할 수 있어야 한다

정산은 현재 payment row의 최종 상태만 읽기보다 승인, 환불과 조정 ledger에서 대상 금액을 만든다. 각 settlement target은 원천 transaction, merchant, order line, gross/discount/refund/fee와 policy version을 추적할 수 있어야 한다.

- 집계 window의 timezone, inclusive/exclusive 경계와 cutoff를 명시한다.
- 최근 매출 기준 수수료라면 거래일, 정산 실행일 중 어느 기준인지 정한다.
- 가맹점별 N일 주기는 대상 적재 범위와 이체 시점이 같은 N일을 의미하는지 분리한다.
- batch 재실행은 같은 target/transfer를 중복 생성하지 않도록 unique key와 checkpoint를 둔다.
- PG, order/refund ledger와 실제 이체 결과를 주기적으로 reconciliation한다.

어제 데이터만 읽는 job에 3일 주기 이체 조건만 붙이면 3일치가 아니라 하루치만 보낼 수 있다. schedule 변경 전에 **source window, calculation과 transfer** 세 단계를 따로 검증한다.

## NestJS와 TypeORM 구현 경계

- `synchronize: false`와 versioned migration을 사용하고 expand/backfill/contract를 별도 release로 나눈다.
- `QueryRunner` transaction은 local DB write만 보호한다. PG call은 transaction 밖의 상태 machine과 복구로 다룬다.
- `@VersionColumn`, 조건부 `UPDATE`나 pessimistic lock 중 충돌 빈도와 실패 비용에 맞는 방식을 선택한다.
- unique constraint로 idempotency key, redemption과 settlement target의 중복을 마지막 방어선에서 막는다.
- projection/batch loader로 component 분리가 N+1을 숨기지 않는지 실제 SQL을 확인한다.

## 교정해야 할 단정

- nullable column을 추가했다가 바로 삭제하는 것이 안전한 migration 순서는 아니다.
- 여러 대상을 한 polymorphic table에 넣는 것이 항상 유연하거나 무결한 모델은 아니다.
- optimistic lock을 붙이는 것만으로 결제 후 coupon 충돌의 사용자 경험이 해결되지 않는다.
- 객체 전체 전달이 ID/command 전달보다 항상 확장성 높은 것은 아니다.
- 부분 취소의 coupon 복원은 boolean 하나로 모든 이력을 정확히 표현하기 어렵다.
- 컴포넌트를 많이 나누어도 query와 transaction 경계가 좋아진다고 보장되지 않는다.

## 출처

- [Stripe, Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe, Refunds API](https://docs.stripe.com/api/refunds)
- [TypeORM, Migration setup](https://typeorm.io/docs/migrations/setup/)
- [제미니 강사, 상품 option과 migration](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392734)
- [제미니 강사, 여러 종류의 찜과 migration](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392786)
- [제미니 강사, 다회 coupon과 동시성](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392790)
- [제미니 강사, 공유 장바구니](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392794)
- [제미니 강사, 주문자와 결제자 분리](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392800)
- [제미니 강사, 부분 취소와 금액 오류](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392805)
- [제미니 강사, 정산 window와 주기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392808)

## 관련 문서

- [[Ecommerce-Shopping-Mall-ERD|이커머스 ERD 패턴]]
- [[Schema-Migration-Large-Table|대용량 schema migration]]
- [[Payment-System-Principles|결제 시스템 원칙]]
- [[Idempotency-Key|Idempotency Key]]
- [[Isolation-Level|DB 격리 수준]]
