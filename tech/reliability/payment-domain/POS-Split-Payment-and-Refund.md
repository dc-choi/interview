---
tags: [pos, payment, refund]
status: done
verified_at: 2026-10-02
category: "Reliability"
aliases: ["분할 결제와 부분 환불"]
---

# 분할 결제와 부분 환불

분할 결제는 한 주문의 청구액을 여러 결제 거래로 충당하는 구조다. 부분 환불은 이미 승인된 거래의 일부를 되돌리는 구조다. 품목별 가격 배분과 결제 수단별 환불 배분은 서로 다른 축이다.

## 주문 품목과 결제 거래

30,000원 주문을 카드 A 10,000원, 카드 B 15,000원, 현금 5,000원으로 결제한 학습 예시를 생각한다. 8,000원 품목을 반품하더라도 어느 결제 거래에서 얼마를 환불할지는 별도 정책이 필요하다.

| 축 | 보존할 데이터 |
|---|---|
| 품목 금액 | 원단가, 수량, 할인 배분, 과세 구분과 환불 가능 금액 |
| 결제 거래 | 결제 수단, 공급자 거래 ID, 원승인액, 누적 취소액 |
| 환불 요청 | 환불 사유, 품목/금액, 논리 요청 ID와 대상 거래 |
| 환불 결과 | 외부 취소 식별자, 성공/실패/결과 미확인과 처리 시각 |

현금 우선, 최근 거래 우선, 품목에 연결된 거래 우선 등의 배분은 설계 선택이다. 수단별 제약과 고객 동의를 반영하고, 다른 사람의 카드나 현금 계좌로 임의 반환하지 않는다.

## 부분 취소는 기능 표와 거래 상태로 판단한다

지원 여부는 PG, 카드 종류, 해외 결제, 에스크로, 가상계좌 입금 상태와 계약 특약에 따라 달라진다. 공급자의 거래별 `isPartialCancelable` 같은 기능 정보가 있다면 해당 값과 공식 제약을 함께 사용한다. 모든 해외 카드나 모든 에스크로가 일괄 불가능하다는 표는 최신 거래의 판단 근거가 될 수 없다.

토스페이먼츠의 현재 취소 가이드에는 다음 조건이 있다.

- `cancelAmount`를 생략하면 전체 취소, 지정하면 부분 취소 요청이다.
- 가상계좌는 입금 전 일부 금액만 취소할 수 없지만 입금 후에는 부분 취소가 가능하며 환불 계좌 정보 등의 조건이 있다.
- 배송 정보가 등록된 에스크로 거래는 구매자의 수령/구매 확정 상태 등 부분 취소 조건을 확인한다.
- 취소 결과의 `cancels` 배열과 취소 거래 식별자를 통해 여러 취소를 구분한다.

이 조건을 다른 사업자의 API에 그대로 적용하지 않는다. 원거래 잔여 취소 가능 금액과 시점별 상태를 조회하고, 결제 수단과 계약의 최신 허용 범위를 확인한다.

토스페이먼츠 결제창에서 받은 가상계좌 환불 계좌 정보는 자동 환불 지시가 아니다. 가이드의 `virtualAccount.refundReceiveAccount`는 결제창을 띄운 뒤 30분 동안만 조회할 수 있으며 이후 `null`일 수 있다. 승인 직후 필요한 정보를 안전하게 보존하고 실제 취소 요청에 전달한다. 정보 조회 창의 만료를 원거래 취소 기한이나 고객 입금 여부와 혼동하지 않는다.

## 지갑 복합결제와 POS 분할 결제

여러 카드 승인으로 나눈 POS 분할과 하나의 지갑 거래 안의 카드/머니/포인트 조합은 다르다. 토스페이먼츠의 간편결제 응답은 `card.amount`, 충전식 금액 `easyPay.amount`, 적립식 금액 `easyPay.discountAmount`로 구성 수단을 구분한다. 응답에 존재하는 조합별로 합계를 확인하고 `totalAmount`와 대사한다.

2026-10-02 간편결제 계약의 예에서 카드+포인트 부분 취소는 주결제수단을 먼저 차감한다. 이를 POS의 여러 외부 승인 거래에 적용하는 공통 우선순위로 옮기지 않는다. 포인트 복원과 카드 취소 금액은 공급자 결과에 맞춰 보존하고 수단 조합별 지원 범위를 확인한다.

Referenced refund는 원거래 ID로 환불을 연결해 원승인액과 누적 환불을 검증한다. Adyen Terminal API의 원거래 식별자는 tender reference와 PSP reference를 함께 포함한다. Offline 거래는 PSP reference가 뒤늦게 생기므로 복구 후 webhook의 참조 또는 허용된 tender reference/거래일/단말 조합으로 연결한다. Unreferenced refund를 단순한 조회 실패의 대안으로 실행하지 않는다.

## 여러 거래의 환불은 원자적이지 않다

카드 A의 취소는 성공하고 카드 B의 취소는 타임아웃일 수 있다. 주문 환불을 하나의 boolean으로 처리하면 일부 성공을 숨기거나 중복 환불하게 된다. 환불 요청 전체의 목표 금액과 각 외부 거래의 진행 상태를 나누어 저장한다.

중복 요청을 막는 DB 제약과 공급자 멱등키를 함께 쓰되, 동시 환불 요청이 같은 잔여액을 사용하지 않도록 예약 또는 조건부 갱신이 필요하다. 외부 요청 전후의 실패는 재조회로 복구하며 결과 미확인 거래에 새 키로 취소를 반복하지 않는다.

주문/결제 묶음 키는 관련 내역을 연결할 수 있지만 네트워크를 넘어 원자성을 보장하지 않는다. 공급자가 묶음 기능을 제공해도 각 구성 거래의 실패와 보상 계약을 읽어야 한다.

## 돈과 후속 효과를 별도로 완료한다

환불 승인 뒤 재고 복원, 포인트 취소, 현금영수증 정정과 주문 표시가 실패할 수 있다. 외부 환불 성공을 유지하면서 미완료 효과를 재처리하도록 상태를 남긴다. 환불 행을 삭제하거나 원결제를 덮어쓰면 정산 대사와 이력 설명이 어려워진다.

이미 가맹점에 지급된 거래의 취소는 다음 정산금에서 상계되거나 별도 반환을 요구할 수 있다. 고객의 취소 승인, 카드 명세 반영과 가맹점 정산 공제는 시점이 다르므로 하나의 완료 시간을 약속하지 않는다.

## 확인 질문

- 2개 결제 중 1개만 환불 성공했을 때 재시작이 그 성공분을 다시 취소하지 않는가?
- 부분 환불의 합계가 원승인액과 품목의 순액을 각각 넘지 않는가?
- 포인트와 증빙 처리가 실패해도 자금 환불 결과를 잃지 않는가?
- 고객 안내와 관리자 화면에 결과 미확인 상태가 나타나는가?

## 환불 기록과 실제 반환을 나눈다

Square의 현금, 수표와 기타 tender 환불은 장부 기록이며 Square가 해당 자금을 반환하는 기능이 아니다. 현금 반환을 별도로 수행한다. 품목 환불은 품목별 세금/할인을 반영하지만 단순 금액 환불의 보고서 처리와 같다고 가정하지 않는다. 처리 수수료 반환 여부와 환불 가능 기간도 공급자/국가 계약에 종속된다.

Adyen unreferenced refund는 원거래를 직접 참조하지 않고 단말에 제시한 카드로 금액을 돌려주는 경로다. 중복 환불과 다른 카드 반환을 막을 대사, 권한과 한도 관리가 상점에 추가로 필요하며 국가, MCC와 지갑별 제한이 있다. 초기 `Success`가 비동기 환불 완료를 뜻하지 않을 수 있으므로 `REFUND_WITH_DATA` 결과를 확인한다.

공급자별 현금성 수단도 환불 의미가 다르다. 토스페이먼츠 휴대폰 결제는 당월 취소와 통신사 계약 변경 조건이 있고, 알뜰폰의 재승인형 부분취소는 잔액 한도가 필요할 수 있다. 상품권은 원 계정/잔액으로 복원하며 종류에 따라 전체 취소만 가능하다. 이 조건을 카드 부분환불의 공통 규칙으로 만들지 않는다.

## 출처

- [토스페이먼츠, 휴대폰 결제](https://docs.tosspayments.com/resources/glossary/mobile-payment)
- [토스페이먼츠, 상품권 결제](https://docs.tosspayments.com/resources/glossary/gift-certificate)
- [Square, Manage customer refunds](https://squareup.com/help/us/en/article/6116-process-refunds)
- [Adyen, Unreferenced refunds](https://docs.adyen.com/point-of-sale/basic-tapi-integration/refund-payment/unreferenced)
- [Adyen, Referenced refund](https://docs.adyen.com/point-of-sale/basic-tapi-integration/refund-payment/referenced)
- [토스페이먼츠, 간편결제](https://docs.tosspayments.com/resources/glossary/easypay)
- [토스페이먼츠, 간편결제 응답 확인](https://docs.tosspayments.com/guides/v2/easypay-response)
- [토스페이먼츠, 결제 취소](https://docs.tosspayments.com/guides/v2/cancel-payment)
- [토스플레이스, 결제 API](https://docs.tossplace.com/reference/open-api/payment.html)
- [쪼개고 되돌리기 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-17.html)
- [PortOne, 부분 취소가 불가한 케이스](https://help.portone.io/content/impossible-partial-cancel)

## 관련 문서

- [[POS-Order-and-Discount]]
- [[Payment-Unknown-Outcome-and-Reversal]]
- [[Payment-Tax-Evidence]]
- [[Payment-Settlement-and-Advance]]
