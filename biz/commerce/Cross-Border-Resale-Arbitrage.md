---
tags: [business, commerce, cross-border, resale, arbitrage, ebay]
status: done
verified_at: 2026-09-29
category: "비즈니스&제품(Business&Product)"
aliases: ["Cross-Border Resale Arbitrage", "해외 중고 리셀 차익 거래", "일본 중고 이베이 판매"]
---

# 해외 중고 리셀 차익 거래

한 나라의 중고 시장에서 싸게 사서 다른 나라의 마켓플레이스에서 비싸게 파는 사업이다. 대표 경로는 일본 중고 매장과 사이트에서 사서 eBay로 미국 구매자에게 파는 방식이다. AI가 상품 탐색과 마진 계산을 싸게 만들어 진입은 쉬워졌지만, 실제 이익은 물류, 관세, 플랫폼 정책, 반품에서 갈린다.

## 동작 흐름

1. 소싱: 일본 중고 매장과 사이트에서 매입 후보를 찾는다. AI로 대량의 매물을 훑고 판매 시세와 비교할 수 있다.
2. 선별: 판매처의 실제 거래 가격과 비교해 마진이 남는 상품만 남긴다.
3. 물류: 배송 대행지(배대지)로 모아 검수하고 미국으로 보낸다.
4. 판매와 사후 대응: 리스팅, 문의 응대, 배송 추적, 반품과 분쟁을 처리한다.

## 마진 공식

거래별 예상 잔액 = 판매가 − 매입가 − 일본 내 배송비 − 배대지 수수료와 보관료 − 국제 배송비 − 마켓플레이스 수수료 − 결제와 환전 비용 − 판매자가 부담하는 수입 관세와 통관 비용 − 반품, 파손, 분쟁 예상 비용

이 식은 선별을 위한 관리용 추정이며 회계상 순이익이 아니다. 광고, 인건비, 사무실과 도구 비용, 금융비용과 소득세나 법인세 등을 추가로 반영해야 사업 전체의 손익을 판단할 수 있다. 세금 포함 여부와 환율 기준을 맞추고, 판매자가 대신 걷어 납부하는 세금을 매출로 더하지 않는다. 공제 또는 환급 가능한 세금을 비용에 중복 반영하지 않으며, 예상 반품 비용을 회계상 충당부채로 인식할 수 있는지는 별도 요건으로 판단한다([[Commerce-Revenue-Formula|거래액, 매출과 이익]]).

- 판매가는 등록 가격이 아니라 실제로 팔린 가격으로 잡는다.
- 수수료율, 배송비, 관세율은 수시로 바뀌므로 계산기에 고정값으로 박지 않고 기준일과 함께 관리한다.
- 보수적으로 잡는다. 환율 변동, 판매 지연 동안의 보관료, 반품 왕복 배송비까지 넣어도 남는 상품만 산다.

## 선별 기준

| 기준 | 이유 |
|---|---|
| 부피와 무게가 작다 | 국제 배송비가 부피 무게로 매겨져 큰 물건은 마진을 먹는다. |
| 사용이 단순하다 | 설정과 호환성이 복잡한 제품은 문의와 반품이 많다. |
| 상태를 사진과 설명으로 판정하기 쉽다 | 중고 상태 불일치는 반품과 분쟁의 가장 흔한 원인이다. |
| 판매처에 실제 거래 기록이 충분하다 | 시세를 확인할 수 없는 상품은 마진 계산이 추측이 된다. |
| 수입 규제가 없다 | 배터리, 식품, 화장품, 상표권 민감 상품은 통관과 판매가 막힐 수 있다. |

## 먼저 확인할 리스크 (2026-09-29 기준)

- **미국 소액 면세 중단:** 미국은 2025-08-29부터 모든 국가에 대한 800달러 이하 수입품의 de minimis 면세를 중단했고, 2026-06-24 공표한 우편과 비우편 규정에서 무기한 중단을 정했다. 저가라는 이유만으로 무관세를 가정하지 말고 실제 품목, 원산지, 적용 세율과 통관 방식을 확인한다. 다른 법적 면세나 특혜의 적용 여부는 별도 판단이다. 관세를 구매자와 판매자 중 누가 부담하는지 배송 조건에 명시하고 판매자 부담분을 원가에 넣는다.
- **eBay 드롭쉬핑 제한:** eBay는 도매 공급업체를 통한 위탁 발송은 허용하지만, 리스팅한 뒤 다른 소매업체나 마켓플레이스에서 사서 구매자에게 바로 보내는 방식은 허용하지 않는다. 팔린 뒤 일본 매물을 사서 배대지로 바로 보내는 구조는 이 정책에 걸릴 수 있으므로, 재고를 먼저 확보하고 파는 구조로 설계한다. 판매자는 명시한 기간 안의 배송과 구매자 만족에 계속 책임을 진다.
- **배대지 보관과 검수:** 매입 뒤 판매까지 보관 기간이 길어지면 보관료가 쌓이고, 검수 품질에 따라 상태 불일치 분쟁이 생긴다.
- **소싱 자동화의 한계:** 사이트 전수조사를 자동화할 때는 각 사이트의 이용약관과 수집 제한을 확인한다.
- **세무:** 해외 판매 수입의 신고 의무와 수출 관련 세무 처리를 사업 시작 전에 확인한다.

## Mental model

- AI가 싸게 만든 것은 탐색이고, 탐색만으로 얻는 마진은 같은 도구를 쓰는 경쟁자가 늘면서 줄어든다. 오래 남는 차이는 선별 기준, 검수 품질, 물류 계약, 판매자 평판처럼 쌓이는 운영 역량이다([[AI-Commoditization-Differentiation|AI 범용화와 사업 차별화]]).
- 매출과 이익을 구분한다. 연 매출 규모는 수수료, 물류, 관세, 반품을 뺀 이익을 말해 주지 않는다([[Commerce-Revenue-Formula|이커머스 수익 공식]]).
- 정책 리스크는 한 번에 사업 전체를 멈춘다. 관세 제도와 플랫폼 정책의 변경을 비용 항목이 아니라 존립 조건으로 본다.

## 트레이드오프

- 재고를 먼저 사면 판매 전 검수와 재고 확인이 가능하지만, 그것만으로 모든 플랫폼 정책을 충족하지는 않는다. 팔리지 않는 재고와 보관료도 떠안는다.
- 고가 상품은 건당 마진이 크지만 상태 분쟁과 사기 위험도 크다. 저가 상품은 위험이 작지만 고정 물류비와 관세 처리 비용에 마진이 먹힌다.
- 소싱을 자동화할수록 처리량은 늘지만 사람이 검수할 수 있는 양이 병목이 된다.

## 적용 점검

- 최근 실거래 가격 기준으로 모든 비용 항목을 넣은 뒤에도 남는 상품이 몇 개인가.
- 재고를 먼저 확보하는 구조인가, 팔린 뒤 사는 구조인가.
- 관세와 통관 비용을 최신 기준으로 넣었는가.
- 반품과 분쟁 한 건이 생겼을 때 몇 건의 이익이 사라지는가.

## 출처

- [Federal Register, 비우편 de minimis 무기한 중단](https://www.govinfo.gov/content/pkg/FR-2026-06-24/html/2026-12670.htm), [우편 de minimis 무기한 중단과 통관 절차](https://www.govinfo.gov/content/pkg/FR-2026-06-24/html/2026-12669.htm) — 2026-10-02 면세 중단의 범위 대조. 개별 품목 관세율과 우편 세부 절차는 이 문서에서 전수 검증하지 않았다.
- [OpenStax, Variable and Absorption Costing](https://openstax.org/books/principles-managerial-accounting/pages/6-5-compare-and-contrast-variable-and-absorption-costing) — 거래에서 남는 금액과 고정비 반영 후 이익 구분
- [U.S. Customs and Border Protection, CBP modernizes low-value shipment processing](https://www.cbp.gov/newsroom/national-media-release/cbp-modernizes-low-value-shipment-processing)
- [The White House, Suspending Duty-Free De Minimis Treatment for All Countries](https://www.whitehouse.gov/presidential-actions/2025/07/suspending-duty-free-de-minimis-treatment-for-all-countries/)
- [eBay, Drop shipping policy](https://www.ebay.com/help/policies/listing-policies/drop-shipping-policy?id=4176)
- [일본 중고 to eBay 디지털 무역 — Threads, dietthatgirl](https://www.threads.com/@dietthatgirl/post/Dd1gS_REzXN)

## 관련 문서

- [[Commerce-Revenue-Formula|이커머스 수익 공식]]
- [[Commerce-Overview|커머스 도메인 개요]]
- [[AI-Commoditization-Differentiation|AI 범용화와 사업 차별화]]
- [[Pricing-Strategy|가격 정책 설계]]
