---
tags: [business, commerce, marketplace, creator-economy, solo-business]
status: done
verified_at: 2026-11-17
category: "비즈니스&제품(Business&Product)"
aliases: ["Global Seller Platform Fees", "해외 판매 플랫폼 수수료", "Etsy 수수료", "Gumroad 수수료", "Preply 수수료"]
---

# 해외 판매 플랫폼의 수수료와 정산 구조

해외 고객에게 상품, 디지털 파일, 수업을 파는 플랫폼은 수수료를 매기는 기준이 서로 다르다. 같은 플랫폼 안에서도 구매자가 들어온 경로에 따라 요율이 갈리는 경우가 있다. Gumroad는 판매자의 직접 링크와 자체 마켓플레이스의 요율이 다르고, Etsy는 외부 광고를 거친 주문에 수수료를 더 매긴다. Preply는 유입 경로가 아니라 강사의 누적 수업 시간으로 요율을 정한다. 그래서 표시 요율 하나가 아니라 주문 한 건에 붙는 비용 전부를 합쳐 비교한다.

아래 요율은 2026-11-17에 각 플랫폼의 공식 가격 페이지와 도움말로 확인한 값이다. Gumroad 도움말은 렌더링된 페이지의 본문을 열지 못해 공식 공개 저장소의 도움말 원본 파일로 대조했다. 요율은 국가, 통화와 시점에 따라 바뀌므로 판매 전에 다시 확인한다.

## 판단 축

| 축 | 질문 | 수수료에 미치는 영향 |
|---|---|---|
| 구매자 확보 | 플랫폼 검색과 추천이 고객을 데려오는가, 판매자가 링크를 직접 퍼뜨리는가 | 플랫폼이 데려온 고객에 더 높은 요율을 매기는 경우가 있다 |
| 과금 단위 | 등록, 거래, 결제 처리, 환전 중 어디에 붙는가 | 한 건에 여러 수수료가 겹치면 표시 요율의 두 배를 넘을 수 있다 |
| 판매 책임 | 플랫폼이 판매 당사자(Merchant of Record)로서 세금을 징수, 납부하는가 | 세무 처리 부담과 수수료 수준을 함께 비교한다 |
| 대금 수령 | 국내 계좌로 바로 받는가, 중간 결제 계정을 거치는가 | 중간 계정의 출금 최소액과 수수료가 추가될 수 있다 |

## 플랫폼별 구조

### Etsy: 직접 만든 실물, 디지털 상품의 장터

- **등록 수수료**: 등록 1건당 USD 0.20이고 팔리지 않아도 부과된다. 등록은 4개월 뒤 만료되며 자동 갱신하면 다시 USD 0.20이 붙는다. 한 등록에서 여러 수량이 팔리면 추가 수량마다 USD 0.20이 붙는다.
- **거래 수수료**: 주문 총액의 6.5%다. 판매자가 구매자에게 받은 배송비와 선물 포장비도 포함된다.
- **결제 처리 수수료**: 거래 수수료와 별도이며 대금을 받는 은행 계좌의 국가로 요율이 정해진다. 대한민국은 판매 총액(배송비와 해당 판매세 포함)의 6.5%에 주문당 USD 0.30이다.
- **Offsite Ads 수수료**: Etsy가 외부에 낸 광고를 거쳐 들어온 주문에는 주문 총액(상품가, 배송비, 선물 포장비, 일부 관할에서는 세금 포함)의 15%가 더 붙고, 주문당 상한은 USD 100이다. 매월 1일 기준으로(정책 문서 기준, 도움말은 연속 365일 구간으로 적는다) 지난 365일 매출이 USD 10,000에 한 번이라도 도달한 샵은 12%이고, 이후 매출이 줄어도 12%와 의무 참여가 유지된다. 도달한 적 없는 샵은 15%이며 참여를 거부할 수 있다. 광고 클릭 뒤 30일 안에 그 샵에서 한 주문이 대상이다.
- **환전 수수료**: 등록 통화와 대금 계좌의 통화가 달라 환전이 필요하면 2.5%가 붙는다.
- **VAT**: 대한민국 판매자는 VAT ID를 등록하지 않으면 판매자 수수료에 VAT가 부과되고, 결제 처리 수수료에도 VAT가 징수될 수 있다. 세율과 대한민국에서 VAT ID로 인정되는 번호의 종류는 확인한 Etsy 도움말 문서 세 건(수수료 VAT 징수, VAT ID 추가, VAT ID 등록 의무 안내)에 나와 있지 않다.
- **개점 비용**: 개점할 때 1회 set-up fee를 요구할 수 있고 낸 뒤에는 환불되지 않는다. 금액은 Etsy 정책과 도움말에 적혀 있지 않고 지역에 따라 다르며 개점 과정에서 표시된다. Payoneer로 가입하면 USD로 청구된다.
- **대금 수령**: 대한민국 판매자는 Payoneer 결제 계정으로 Etsy Payments에 가입한다. Payoneer의 출금 최소액과 추가 수수료가 적용될 수 있다.

### Gumroad: 전자책, 템플릿 같은 디지털 파일 판매

- **직접 판매**: 판매자의 프로필이나 직접 링크로 들어온 판매는 거래당 10% + USD 0.50이다. 카드 결제 처리 수수료 2.9% + USD 0.30이나 PayPal 수수료는 여기에 포함되지 않고 따로 붙는다.
- **대량 판매 할인**: 한 달의 유료 판매가 USD 20,000에 이르면 그 달의 이후 직접 판매는 5% + USD 0.50이다. 매월 1일에 초기화된다.
- **Discover 판매**: Gumroad의 발견 마켓플레이스로 새 고객이 찾아와 산 거래는 30%이고 결제 처리 수수료가 포함된다.
- **Discover 노출 자격**: 지급 설정을 입력하고, 정상 판매로 잔액 USD 100 이상을 쌓고, 위험 심사를 통과해야 한다(잔액 기준을 넘긴 뒤 평균 3주). 상품은 환불되지 않은 판매가 1건 이상 있고 카테고리를 선택했으며 평점을 켜 두어야 한다.
- **판매 책임**: 2025-01-01부터 Merchant of Record로서 판매세와 VAT를 처리한다.

### Preply: 온라인 1:1 수업

- **체험 수업**: 새 학생과의 체험 수업 수수료는 100%라 강사에게 지급되는 금액이 없다.
- **이후 수업**: 시간당 수업료의 18~33%를 수수료로 뗀다. 누적 수업 0~20시간 33%, 21~50시간 28%, 51~200시간 25%, 201~400시간 22%, 400시간 초과(도움말 표의 표기는 400+) 18%다. 누적 시간은 학생별이 아니라 전체 기준이며 체험 수업도 포함된다.

## 예시: 주문 한 건의 수수료 비교

가정 값이다. 판매세, VAT, 환전, 중간 계정 수수료와 세금은 빼고 플랫폼 수수료만 비교한다.

| 경우 | 매출 | 플랫폼 수수료 | 수수료 비율 |
|---|---|---|---|
| Etsy, 상품 USD 20 + 배송비 USD 5, 등록 1건 | USD 25 | 등록 0.20 + 거래 1.625 + 결제 처리 (1.625 + 0.30) = 약 USD 3.75 | 약 15% |
| 같은 Etsy 주문이 Offsite Ads를 거친 경우(지난 365일 매출이 USD 10,000에 도달한 적 없는 샵) | USD 25 | 위 3.75 + 광고 3.75 = 약 USD 7.50 | 약 30% |
| Gumroad 직접 링크, USD 20, 카드 결제 | USD 20 | 2.00 + 0.50 + 결제 처리 (0.58 + 0.30) = USD 3.38 | 약 16.9% |
| Gumroad Discover, USD 20 | USD 20 | USD 6.00 | 30% |
| Preply 신규 강사, 시간당 USD 20 정규 수업 | USD 20 | USD 6.60 | 33% |
| Preply 400시간 초과, 시간당 USD 20 | USD 20 | USD 3.60 | 18% |

Etsy의 6.5%는 거래와 결제 처리에 각각 붙으므로 한국 판매자의 실제 부담은 표시 요율 한 번보다 크다. Gumroad의 직접 판매도 결제 처리 수수료를 더하면 표시 요율 10%보다 높다. Preply는 새 학생 한 명마다 체험 수업 1회가 무보수이므로 학생당 유지 기간이 짧으면 실효 수수료가 표의 요율보다 높아진다.

## 트레이드오프

- 플랫폼이 데려온 고객에 붙는 높은 요율은 고객 획득 비용을 플랫폼에 넘긴 값으로 볼 수 있다(해석). 자체 채널로 고객을 데려올 수 있으면 직접 링크 경로가, 고객이 없으면 발견 기능의 높은 요율이 광고비보다 쌀 수 있다.
- 플랫폼에 팔로워와 리뷰가 쌓일수록 이탈 비용이 커진다(해석). 고객 연락처와 판매 데이터를 어디까지 가져갈 수 있는지 함께 본다.
- Merchant of Record 플랫폼이 세금에서 처리하는 범위는 그 플랫폼이 징수, 납부하는 판매세와 VAT다. 판매자 본인의 국내 소득과 매출 신고 방식은 별도로 확인한다. MoR의 전체 책임 범위와 판매 운영 플랫폼의 구분은 [[Payment-Service|결제 서비스]]에 있다.

## 적용 점검

- [ ] 등록, 거래, 결제 처리, 광고 경유, 환전, 출금 수수료를 주문 한 건 기준으로 합산했는가
- [ ] 같은 플랫폼에서 직접 링크와 마켓플레이스 발견 경로의 요율 차이를 반영했는가
- [ ] 체험 수업이나 팔리지 않은 등록의 수수료처럼 매출 없이 나가는 비용을 고객 1명 기준으로 넣었는가
- [ ] 요율을 대금 수령 계좌의 국가 기준으로 확인했는가
- [ ] 확인 날짜를 남기고 판매 직전에 공식 페이지를 다시 확인했는가

## 출처

- [Etsy Help, Etsy Fee Basics](https://help.etsy.com/hc/en-us/articles/360035902374) — 등록 수수료와 거래 수수료
- [Etsy Help, What are the Fees and Taxes for Selling on Etsy?](https://help.etsy.com/hc/en-us/articles/115014483627) — 등록 만료와 갱신, 거래 수수료 대상, Offsite Ads 요율과 상한, 환전 수수료, set-up fee
- [Etsy, Fees & Payments Policy](https://www.etsy.com/legal/fees/) — 2026-10-05 개정판. Offsite Ads의 주문 총액 구성과 12% 전환 조건, set-up fee의 청구 방식
- [Etsy Help, How Etsy's Offsite Ads Work](https://help.etsy.com/hc/en-us/articles/360000338367-How-Etsy-s-Offsite-Ads-Work) — 의무 참여와 거부, 30일 귀속, 주문당 상한. 기준 구간을 any consecutive 365 day period로 적어 매월 1일 산정은 위 정책 문서가 근거
- [Etsy Help, What are Payment Processing Fees for Selling on Etsy?](https://help.etsy.com/hc/articles/115015628847) — 국가별 결제 처리 수수료, 대한민국 6.5% + USD 0.30
- [Etsy Help, How VAT Is Collected on Seller Fees](https://help.etsy.com/hc/en-us/articles/360040584433-How-VAT-Is-Collected-on-Seller-Fees) — VAT ID 미등록 판매자의 수수료 VAT
- [Etsy Help, What is Etsy Payments?](https://help.etsy.com/hc/articles/360002120927) — 대한민국 판매자의 Payoneer 가입
- [Etsy Help, How Do I Use a Payoneer Account With Etsy Payments?](https://help.etsy.com/hc/en-us/articles/16999319005207-How-Do-I-Use-a-Payoneer-Account-With-Etsy-Payments) — Payoneer 계정이 필수인 국가 목록의 대한민국
- [Gumroad, Pricing](https://gumroad.com/pricing) — 직접 판매와 Discover 요율, Merchant of Record
- [Gumroad Help Center, Gumroad's fees](https://gumroad.com/help/article/66-gumroads-fees) — 결제 처리 수수료, Discover 30%의 포함 범위, 대량 판매 할인. 본문은 공식 공개 저장소(antiwork/gumroad)의 도움말 원본 파일로 대조
- [Gumroad Help Center, Gumroad Discover](https://gumroad.com/help/article/79-gumroad-discover) — Discover 노출 자격. 본문은 같은 저장소의 도움말 원본 파일로 대조
- [Preply Help Center, Preply commission model](https://help.preply.com/en/articles/4171383-preply-commission-model) — 페이지 표기일 2024-09-19, 체험 수업과 누적 시간별 수수료 표

## 관련 문서

- [[Payment-Service|결제 서비스]] — MoR과 판매 운영 플랫폼의 구분
- [[Marketplace-Seller-Launch|오픈마켓 셀러 첫 상품 출시]] — 국내 마켓 수수료와 정산 비교
- [[Shopee-Cross-Border-Selling|쇼피 역직구 판매]] — 한국 판매자의 해외 마켓 입점과 Payoneer 정산
- [[Commerce-Revenue-Formula|수익 공식]] — 거래액, 매출과 공헌이익
