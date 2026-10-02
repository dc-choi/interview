---
tags: [pos, order, discount, money]
status: done
verified_at: 2026-10-02
category: "Reliability"
aliases: ["POS 주문과 할인"]
---

# POS 주문과 할인

POS의 주문은 판매 내역과 청구 금액을 관리하는 객체다. 결제 거래, 조리/출고와 재고 이동은 주문에 연결되지만 같은 생명주기를 갖지 않는다.

## 주문과 결제의 시간축

식당 주문은 테이블을 열고 여러 상품을 추가한 뒤 나중에 결제할 수 있다. 온라인 주문처럼 생성 직후 결제가 진행된다고 가정하면 상품 추가, 주문 이동과 분할 결제를 처리하기 어렵다.

학습용 모델에서는 주문에 여러 결제 거래를 연결하고 `잔여 청구액 = 최종 청구액 - 유효 결제액`을 관리한다. 취소된 결제, 오프라인 대기 결제와 환불을 포함하는 방식은 상태별로 명확히 정한다. 주문 완료와 모든 외부 결제 확정도 별도로 판단한다.

토스플레이스 Open API 문서에는 `REQUESTED`, `OPENED`, `COMPLETED`, `CANCELLED` 등의 주문 상태와 알 수 없는 값 처리를 위한 `UNDEFINED`가 있다. 이 열거형은 해당 API의 표현이다. 자체 시스템에 그대로 복제하기 전에 수락, 이행 완료와 결제 완료의 의미를 확인한다.

재고 차감 시점도 업종에 따라 다르다. 희소 상품은 예약과 원자적 수량 검증이 필요할 수 있고, 음식점의 판매 집계와 원재료 재고는 다른 모델일 수 있다. 모든 POS 재고는 부정확해도 된다고 일반화하지 않는다.

## 가격은 주문 시점의 스냅샷

상품 ID만 저장하면 카탈로그 가격이나 세율이 바뀐 뒤 과거 주문을 재현할 수 없다. 상품명, 단가, 수량, 옵션, 할인, 과세 구분과 계산 결과를 주문에 보존한다. 카탈로그 참조는 현재 상품을 찾는 용도이고 역사적 가격의 정본은 주문 스냅샷이다.

토스플레이스는 매장 식사/포장 옵션, 상품/콤보/임의 상품과 옵션 선택지를 구분한다. 옵션 선택지가 여러 개라면 선택 개수와 수량의 의미도 검증한다. 상품, 옵션과 선택지의 카탈로그 존재 여부와 품절 검증은 가격 합계 검증과 별개다.

현재 주문 생성 API는 청구 금액을 호출자가 계산해 전달하며, 상품 가격의 합계와 다르더라도 요청이 허용될 수 있다고 안내한다. API가 합계를 받아들였다는 사실을 계산의 정확성으로 간주하지 않는다.

## 할인 순서는 결과의 일부다

15,500원 주문에 10% 할인과 2,000원 할인을 적용하는 학습 예시다.

| 순서 | 계산 | 최종 금액 |
|---|---|---:|
| 비율 후 정액 | 15,500 × 90% − 2,000 | 11,950원 |
| 정액 후 비율 | (15,500 − 2,000) × 90% | 12,150원 |

순서, 중복 허용, 적용 대상과 최저 결제액을 규칙으로 보존한다. 할인 계산을 화면과 서버가 서로 다르게 구현하면 승인 금액 검증에 실패하거나 환불 계산이 달라진다.

Square Orders API의 문서상 순서는 품목 비율, 주문 비율, 주문 정액, 품목 정액이다. 주문 정액 할인은 해당 품목들의 기여 비중으로 배분한다. 반면 토스플레이스의 `precedence`는 작은 숫자가 먼저라는 별도의 계약이다. 서로 다른 공급자의 필드와 계산 순서를 섞지 않는다.

## 정수 금액과 할인 배분

학습 예시에서 9,000원과 6,500원 품목에 총 3,550원 할인을 비례 배분하면 이론값은 약 2,061.29원과 1,488.71원이다. 먼저 원 단위로 내리고 소수 부분이 큰 품목에 나머지 1원을 주는 규칙이라면 2,061원과 1,489원이 된다. 합계 할인은 3,550원, 품목별 순액은 6,939원과 5,011원이다.

이 배분은 설계 예시이며 모든 PG의 공식 알고리즘이 아니다. 통화의 최소 단위, 반올림/절사 위치, 잔여 단위 배분 순서와 동률 처리를 결정론적으로 정의한다. 할인 적용 후 과세/면세와 세액의 배분도 해당 공급자의 계약을 따른다.

환불 시 현재 쿠폰 규칙으로 재계산하지 않고 원주문의 할인 배분을 사용한다. 상품 추가나 수량 변경을 허용하는 열린 주문에서는 계산 버전과 변경 내역을 보존하고 이미 승인된 결제액과 잔여 청구액의 관계를 검증한다.

## 가격 계산의 정본과 공급자별 계약

계산을 POS가 맡는 API와 공급자가 맡는 API를 구분한다. Square의 `CalculateOrder`는 주문 생성 없이 `CreateOrder`와 같은 입력의 조정 금액을 미리 계산한다. 반면 토스플레이스 주문 생성은 호출자가 전달한 청구액을 받을 수 있으므로 두 모델을 같은 계산 보장으로 설명하지 않는다.

2026-10-02 Square 문서 기준 조정 계산은 half-to-even 반올림을 사용한다. 0.505를 소수 둘째 자리로 계산하면 0.50, 0.715는 0.72다. 앞의 원 단위 배분 예시는 자체 설계 예시이며 Square의 실제 배분/반올림을 재현한다고 보장하지 않는다.

할인 다음에 service charge, 이후 tax를 계산하지만 service charge의 phase와 과세 여부에 따라 위치가 달라진다. 주문/품목 적용 범위와 비율/정액 여부도 함께 저장한다. 배분 service charge는 품목의 tax를 따르고, `gross_sales_money`에는 배분 charge가 포함되지 않으므로 해당 집계에는 `total_money` 등 목적에 맞는 필드를 사용한다.

할인이 최종 지불액을 줄여도 세금 계산 기준을 줄이지 않는 계약이 있다. Square `CatalogDiscount.modify_tax_basis`는 과세표준 변경 여부, `maximum_amount_money`는 비율 할인의 금액 상한을 표현한다. 국내 세법의 공통 쿠폰 규칙으로 옮기지 않고 공급자 계약과 거래의 세무 조건을 확인한다.

## 자동 할인과 후속 효과

자동 할인은 상품 집합, 수량, 시간 구간, 최소 주문액과 고객 그룹 조건을 카탈로그 규칙으로 표현할 수 있다. 규칙 등록과 주문의 `auto_apply_discounts` 설정은 별도다. 품목별 blocklist와 적용 결과를 보존하면 할인 제외 사유와 이후 환불 금액을 설명할 수 있다.

Square Catalog의 pricing rule 기반 할인은 모든 결제 SDK에 공통 제공되는 기능이 아니다. Reader SDK/Checkout API의 지원 제한과 Catalog로 만든 규칙의 POS 편집 제한을 확인한다. 이전 주문을 현재 카탈로그 규칙으로 다시 계산하지 않는다.

토스플레이스의 적립/혜택 사용 추가는 `(referenceType, referenceId)`로 중복을 구분하고 금액/개수 부호로 적립과 회수, 사용과 취소를 표현한다. Open API로 생성한 주문에 적용하는 ALPHA API다. 현금성 결제 승인이나 카드 환불과 같은 사건으로 합치지 않는다.

## 불변조건

- 품목별 배분 할인 합계와 주문 할인 합계가 일치한다.
- 상품, 옵션, 수량과 할인으로 산출한 청구액이 서버의 기대 금액과 일치한다.
- 과세/면세/세액의 합계가 해당 공급자 스키마와 일치한다.
- 주문 수정과 결제 추가가 동시에 실행될 때 잔여 금액을 중복 사용하지 않는다.
- 결제와 재고, 포인트 반영 실패를 독립적으로 복구할 수 있다.

## 카탈로그, 주문과 포인트의 상태를 분리한다

토스플레이스 Catalog API의 `SOLD_OUT`은 표시 정보이며 상품/옵션 주문을 원천 차단하지 않는다. 판매 상태와 노출 여부, 주문 수락 정책을 분리한다. Delivery API의 플랫폼 할인은 배달 주문서에 표시되지만 매장 결제 내역/매출 리포트의 주문 할인과는 다르다. 고객 부담 금액, 매장 매출과 할인 부담 주체를 같은 필드로 합치지 않는다.

Square Loyalty의 reward 생성은 포인트를 예약하고, 주문 결제 때 `REDEEMED`로 확정한다. 할인 규칙은 특정 catalog version을 참조하므로 현재 규칙으로 과거 주문을 다시 계산하지 않는다. 단순 할인 미리보기와 포인트 예약도 구분한다.

Square metadata는 앱별로 비공개지만 주문 version을 증가시킨다. 다른 앱의 metadata 수정 때 새 값을 볼 수 없어도 version만 증가할 수 있으므로 눈에 보이는 주문 필드가 같다는 이유로 동시 변경이 없었다고 판단하지 않는다. 개인정보와 카드 정보는 metadata에 넣지 않는다.

## 주문 채널과 결제 시점을 분리한다

QR 테이블 주문은 주문 입력 채널이지 결제 승인 프로토콜을 뜻하지 않는다. 토스플레이스의 2024-12-03 안내는 후불 매장에서 모바일 선불 결제와 나갈 때 결제를 선택할 수 있는 베타 기능을 설명한다. 주문별 선불/미결제 상태와 매장 자체의 선불/후불 영업 설정을 구분한다. 현금, 실물 카드와 분할 결제를 나갈 때 처리하던 당시의 제약도 현재 공통 지원 조건으로 일반화하지 않는다.

여러 고객이 같은 테이블 QR에 접속할 수 있으므로 테이블 식별자만으로 주문 중복을 판단하지 않는다. 카탈로그를 POS와 주문 채널이 공유하면 상품 삭제가 양쪽에 영향을 줄 수 있다. 주문 채널의 노출 설정, 품절 표시와 공통 상품 삭제를 서로 다른 변경으로 관리한다.

## 판매, 재고와 조리 출력의 단위를 보존한다

Square의 `CatalogItemVariation`은 판매 단위와 재고 단위를 구분한다. 병으로 보관하고 잔으로 판매하면 `stockable_conversion`으로 단위 관계를 정하며, 재고 수량을 그대로 판매 가능 수량으로 사용하지 않는다. `track_inventory`의 매장별 override와 기본값도 함께 확인한다. SDK의 `ordinal`은 표시 순서용으로 조회 결과에서 연속성/유일성이 보장되지 않으므로 품목 식별 키로 쓰지 않는다.

토스플레이스 주방주문서 안내는 상품/카테고리와 옵션별로 프린터 출력을 분배할 수 있다고 설명한다. 특정 옵션을 출력하려면 그 부모 상품도 출력 대상으로 설정돼 있어야 한다. 카테고리별 묶음, 상품별 묶음과 개별 수량별 낱장 출력은 서로 다른 조리/서빙 단위다. 주문 ID, 결제 거래와 출력 묶음의 개수를 같다고 가정하지 않고 프린터별 배분과 재출력 여부를 따로 관리한다. 출력 순서 변경도 주문 발생 시각이나 승인 상태의 변경이 아니다.

## 출처

- [Square, CatalogItemVariation 공식 Node SDK 정의](https://github.com/square/square-nodejs-sdk/blob/master/src/api/types/CatalogItemVariation.ts)
- [토스플레이스, 주방주문서 설정](https://tossplace.com/story/pos_kitchen)
- [토스플레이스, Catalog API](https://docs.tossplace.com/reference/open-api/catalog.html)
- [토스플레이스, Delivery API](https://docs.tossplace.com/reference/open-api/delivery.html)
- [Square, Redeem Loyalty Points](https://developer.squareup.com/docs/loyalty-api/walkthrough1/redeem-points)
- [Square, Metadata](https://developer.squareup.com/docs/build-basics/metadata)
- [토스플레이스, 혜택 사용 추가](https://docs.tossplace.com/reference/open-api/order/order-redemption-create.html)
- [토스플레이스, 적립 추가](https://docs.tossplace.com/reference/open-api/order/order-accrual-create.html)
- [Square, Square-applied Order Discounts](https://developer.squareup.com/docs/orders-api/apply-taxes-and-discounts/auto-apply-discounts)
- [Square, Automatically Apply Discounts](https://developer.squareup.com/docs/catalog-api/cookbook/auto-apply-discounts)
- [Square, CatalogDiscount](https://developer.squareup.com/reference/square/objects/CatalogDiscount)
- [Square, Order Service Charges](https://developer.squareup.com/docs/orders-api/service-charges)
- [Square, Order Price Adjustments](https://developer.squareup.com/docs/orders-api/price-adjustments)
- [토스플레이스, 주문 API](https://docs.tossplace.com/reference/open-api/order.html)
- [토스플레이스, 주문 생성](https://docs.tossplace.com/reference/open-api/order/order-create.html)
- [토스플레이스, 주문 모델](https://docs.tossplace.com/reference/open-api/order/order-model.html)
- [Square, Apply discounts to orders](https://developer.squareup.com/docs/orders-api/discounts)
- [Square, OrderLineItemDiscount](https://developer.squareup.com/reference/square/objects/OrderLineItemDiscount)
- [포스 안의 네 시계 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-15.html)
- [할인이 내려가는 길 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-16.html)
- [토스플레이스, 토스오더 테이블주문](https://tossplace.gitbook.io/guide/sector/postpaid-store/toss-order-table)
- [토스플레이스, 선불결제 테이블주문](https://tossplace.gitbook.io/guide/sector/postpaid-store/toss-order-table/03) — 2024-12-03 안내의 당시 베타 범위

## 관련 문서

- [[Commerce-Order]]
- [[Commerce-Pricing]]
- [[POS-Split-Payment-and-Refund]]
- [[POS-Offline-and-Integration]]
