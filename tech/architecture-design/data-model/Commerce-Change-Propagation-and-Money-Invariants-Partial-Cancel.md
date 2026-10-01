---
tags: [architecture, ecommerce, data-model, cancellation, refund, point, coupon, concurrency]
status: done
verified_at: 2026-10-01
category: "Architecture - Data Model"
aliases: ["Commerce Partial Cancel", "부분 취소와 환불 ledger", "부분 취소 금액 불변식"]
---

# 부분 취소와 환불 ledger

부분 취소는 flag가 아니라 누적 가능한 금액 ledger다. 이 문서는 [[Commerce-Change-Propagation-and-Money-Invariants|커머스 변경 전파와 금액 불변식]]의 부분 취소 절을 떼어 내, 재화 우선순위, 동시 취소와 실제로 자주 나는 결함까지 다룬다.

## 취소 단위와 불변식

최소 단위는 취소한 order line, option, quantity와 각 재화의 배분 결과를 표현해야 한다. 전체 취소를 `orderItemId = -1` 같은 sentinel로 표시하지 말고 cancellation type과 nullable relation에 constraint를 두거나 header/line을 분리한다. 결제가 끝난 line에 결제 완료 상태를 두면 부분 취소 대상과 이미 취소된 line을 구분하기 쉽다.

```text
0 <= 누적 취소 수량 <= 주문 수량
0 <= 누적 PG 환불액 <= 원 PG 승인액
0 <= 재화별 누적 환불 <= 재화별 원 결제액
전체 취소가 끝나면 재화별 누적 환불 = 원 결제 구성 - 정책상 공제(반품 배송비 등)
주문 할인 배분 합 = 원 할인액, 반올림 잔여 포함
환불 현금 + 복원 point/coupon 효과 = 정책상 취소 보상액
동일 취소 요청의 재시도는 결과를 한 번만 만든다
```

권장 흐름은 검증, 금액 계산, 의도 저장, PG 요청, 결과 반영, 후처리다. 금액을 먼저 계산해야 PG에 보낼 부분 취소 금액이 정해진다. 외부 PG 호출과 local DB를 하나의 transaction으로 묶을 수 없으므로 idempotency key, pending state와 timeout 뒤 조회/복구를 설계한다. Stripe도 부분 환불을 여러 번 허용하지만 누적액은 미환불 잔액을 넘을 수 없다. Stripe는 엔드포인트 실행이 시작된 요청의 결과를 성공과 실패 모두 저장해 같은 idempotency key의 재시도에 돌려준다. 매개변수 검증 실패나 동시에 실행 중인 요청과의 충돌로 실행이 시작되지 않았다면 결과를 저장하지 않으므로 재시도할 수 있다. 24시간 이상 지난 key는 정리될 수 있고 정리 뒤 같은 key는 새 요청으로 처리된다. 오래 남은 pending 취소는 재전송보다 provider 조회로 수렴시킨다.

## 재화 우선순위와 coupon 조건 붕괴

현금, point와 coupon 할인을 함께 쓴 주문을 부분 취소하면 두 정책이 결과를 바꾼다.

1. **coupon 조건 붕괴**: 최소 주문 금액 같은 조건이 남은 주문에서 깨질 때 그 할인을 유지할지 회수할지 정한다. 회수하면 남은 상품을 할인 없이 다시 계산하므로 같은 취소라도 환불액이 줄어든다.
2. **재화 우선순위**: 정한 보상액을 현금과 point 중 무엇으로 먼저 돌려줄지, 회수할 때 무엇에서 먼저 뺄지 정한다.

```text
가상 예시: A 60,000 + B 40,000, coupon 10,000(최소 주문 80,000), point 20,000, PG 70,000
B를 부분 취소하면 남은 A 60,000은 최소 주문 금액에 못 미친다
- coupon 유지: 보상액 = 40,000 - B에 배분된 할인 4,000 = 36,000
- coupon 회수: 이미 낸 90,000 - 할인 없는 A 60,000 = 30,000
- 보상액 30,000의 재화: point 우선이면 point 20,000 + PG 10,000, PG 우선이면 PG 30,000
```

point와 coupon을 함께 쓴 주문은 coupon 잔여 처리 뒤 point 환불까지 이어져 경우의 수가 가장 많다. 순차 소진(우선순위) 대신 원 결제 구성 비율대로 나누는 배분도 가능하다. 결제수단별 비율 배분은 [[Commerce-Overview|커머스 개요]]의 결제형 중개 수수료 계산과 같은 구조다. 어느 방식이든 위 불변식을 지키고 point 만료일 복원, PG 수수료 처리와 고객 고지를 함께 정한다. 기준액 미달 때 할인을 취소할지는 [[Commerce-Pricing|가격과 할인 정책]]의 클레임 기준 결정이다.

부분 취소를 한 줄 요구로 받으면 개발자가 이런 금액 case 표를 만들어 기획에 역제안하고 정책을 확정받는다. 금액 오류는 단순 장애로 끝나지 않고 회사 손실로 이어지므로 정책 없이 구현을 시작하지 않는다.

## 동시 부분 취소와 취소 잔액 row

매 요청마다 과거 취소 row를 합산해 남은 금액을 계산하면, 동시에 들어온 두 요청이 같은 합계를 읽고 둘 다 상한을 통과할 수 있다.

- 주문 단위 취소 잔액 row(남은 취소 가능 금액, 재화별 잔액, coupon 복원 상태, version)를 두고 조건부 update나 version CAS로 갱신한다. 취소의 주체가 주문이면 key도 결제 시도가 아니라 주문이다.
- 잔액 갱신을 PG 성공 뒤에만 하면 version 충돌에서 진 요청은 이미 PG 환불을 마친 뒤일 수 있다. PG 호출 전에 잔액을 pending으로 예약해 확정하고, 실패는 예약 해제로, timeout은 PG 조회로 수렴시킨다.
- 계산 결과에는 환불 금액과 함께 coupon 복원 여부 같은 판정을 담고, 취소 line과 거래 이력에 취소 금액, point와 coupon 정보를 남긴다.
- 검증, 계산, PG 요청, 결과 반영 함수를 결제 흐름과 같은 모양으로 맞추면 두 흐름을 함께 유지하기 쉽다.

## 실패 패턴: 보상 point 미회수와 복원 판정 재발동

- **구매 보상 point 무한 증식**: 결제로 지급한 보상 point를 부분 취소에서 회수하지 않으면, 구매와 부분 취소를 반복해 취소된 금액의 보상이 계속 쌓인다. 사용한 point의 복원과 지급한 보상 point의 회수는 방향이 다른 두 흐름이다. 부분 취소가 한 번이라도 나면 그 결제의 보상을 전액 회수할지 취소 비율만큼 회수할지, 이미 쓴 보상은 어떻게 회수할지([[Commerce-Review-and-Benefit-Policy#리뷰 형식과 보상|적립 회수 정책]]) 정한다.
- **coupon 복원 판정 재발동**: 한 번 켜진 복원 flag가 저장된 채 다음 부분 취소에서 다시 적용되면 coupon이 잘못 복원된다. 복원 여부는 매 취소마다 취소 이력과 정책 조건으로 다시 판정하고, redemption reversal을 unique key로 한 번만 기록한다. boolean 하나로는 누적 이력을 정확히 표현하기 어렵다.
- 두 결함 모두 요구사항 시나리오와 금액 case로 만든 테스트에서 드러났다. 금액 계산은 pure policy로 분리해 table test와 property test를 적용한다. 단건 취소보다 여러 차례 부분 취소를 이어 붙인 sequence로 검증하고 홀수 금액 반올림, 마지막 잔여 취소, coupon/point 혼합, 동시 취소와 PG timeout을 포함한다.
- 부분 취소 로직은 order line과 option 같은 주문, 결제 데이터 구조에 의존한다. 구조가 바뀌면 함께 다시 검증한다.

## 출처

- [Stripe, Refunds API](https://docs.stripe.com/api/refunds)
- [Stripe, Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [제미니 강사, 부분 취소와 금액 오류](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392805)
- [제미니 강사, 부분 취소 요구사항과 재화 우선순위](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392802)
- [제미니 강사, 부분 취소 금액 계산과 취소 잔액](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392803)

## 관련 문서

- [[Commerce-Change-Propagation-and-Money-Invariants|커머스 변경 전파와 금액 불변식]]
- [[Commerce-Change-Propagation-and-Money-Invariants-Settlement|정산 배치와 금액 기준]]
- [[Ecommerce-Shopping-Mall-ERD|이커머스 도메인 모델링]]
- [[Payment-System-Principles|결제 시스템 원칙]]
- [[Payment-Reconciliation-Worker|결제 대사 worker]]
- [[Idempotency-Key|Idempotency Key]]
