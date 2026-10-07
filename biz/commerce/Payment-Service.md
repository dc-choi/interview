---
tags: [business, commerce, payment, fintech]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["Payment Service", "페이 서비스", "간편결제", "PG", "VAN"]
verified_at: 2026-07-21
---

# 결제 서비스 (PG, VAN, 간편결제)

## 카드 결제의 4단계

| 단계 | 내용 | 주체 |
|---|---|---|
| 주문서 | 주문 정보 확정, 결제 요청 시작 | 쇼핑몰 (가맹점) |
| 인증 | 카드 보유자 인증과 거래 위험 확인 | 발급사, 인증 서비스, PG 등 거래 구조별 참여자 |
| 승인 | 가맹점, acquirer 경로를 거쳐 발급사에 승인 요청 | 가맹점, PG/acquirer, 카드 네트워크, 발급사 |
| 매입 | 승인 거래를 제출하고 clearing, settlement | acquirer, 네트워크, 발급사, PG 등 계약 구조별 참여자 |

카드 결제에서는 승인과 매입의 구분이 취소, 환불 경로를 이해하는 출발점이다. 다만 API에서 취소와 환불을 부르는 이름, 매입 시점, 허용 기한은 수단과 제공자 계약에 따라 다르다. 고객의 취소 승인, 카드 청구 반영과 가맹점 정산 공제를 구분한다. [[Payment-Participants-and-Lifecycle|참여자와 거래 생명주기]], [[POS-Split-Payment-and-Refund|부분 취소와 환불]]에 계약별 확인 항목을 정리했다.

## 플레이어

- **가맹점(쇼핑몰)** — 결제를 요청하는 주체
- **PG (Payment Gateway)** — 온라인 가맹점을 대신해 카드사와 계약하고 결제를 대행하는 대표 가맹점
- **VAN (Value Added Network)** — 카드사와 가맹점 사이의 승인 중계와 단말기 (주로 오프라인)
- **카드사, acquirer, 카드 네트워크** — 발급, 가맹점 매입, 승인과 clearing 경로를 나눠 맡는다. 국내 계약 구조에서는 PG와 VAN의 역할이 추가된다.

한국은 PG와 VAN이 끼는 다층 구조다. 플랫폼과 은행이 직결되던 단층 구조(2018년 6월 넷츠유니온(网联) 경유 의무화 전의 중국형 간편결제)와 비교하면 수수료 단계가 많고, 이 분산 구조가 국내 핀테크의 속도를 늦춘 배경으로 꼽힌다.

## 간편결제의 실체: 토큰

간편결제는 저장 결제수단, 사용자 인증, 토큰화와 결제 라우팅을 조합한 서비스다. PAN은 카드사만 저장할 수 있는 것이 아니다. PCI DSS 적용 범위 안에서 가맹점, processor, acquirer, issuer와 service provider가 저장, 처리, 전송할 수 있다. 토큰은 PAN 노출 범위를 줄이지만, 네트워크 토큰, processor token, merchant vault token과 정기결제용 billing key는 발급 주체와 사용 범위가 다르다. 어떤 주체가 token vault와 PAN을 보유하는지 계약과 아키텍처로 확인한다.

역사적 기원도 보안이다 — 대규모 개인정보 유출 사태와 개인정보보호법 시행(2011)이 카드번호를 반복 입력, 저장하지 않는 결제 구조를 앞당겼다 ([[Commerce-Korea-History-2010-2013|한국 이커머스 역사 2010-2013]]).

## 페이 서비스의 스펙트럼

페이는 단일한 것이 아니라 4단계 중 어디까지 제공하는가의 조합이다:

| 제공 범위 | 형태 |
|---|---|
| 인증만 | 기본 간편결제 (카드번호 입력 대체) |
| 인증 + 승인 | 확장형 |
| 인증 + 승인 + 매입 | 종합형 (PG 겸업) |
| 주문서 + 인증 + 승인 + 매입 | 통합 결제 솔루션 — 회원과 배송지 정보까지 얹은 Open ID형 |

포털형 페이는 간편결제가 아니라 주문서(회원 정보, 배송지)까지 가져가는 통합 솔루션이다 — 주문형(주문서 제공)과 결제형(인증, 승인, 매입 대행)의 결합. 그래서 페이를 둘러싼 독과점 분쟁의 본질은 결제 기술이 아니라 **구매 동선(주문서)의 소유권 싸움**이다.

실무에서는 인증 대행, wallet/token 제공, gateway, acquiring과 매입 대행 범위를 계약별로 구분한다. 정기결제는 merchant-initiated transaction 지원, 고객 동의, credential-on-file와 token 정책의 문제이며 특정 승인 대행형에서만 가능하다고 일반화할 수 없다.

## 카드 네트워크의 역할과 수수료 경제

2026-10-02에는 이 절의 계약 범위, 분쟁 규칙과 2024 공시 수치를 공식 출처와 부분 대조했다. 아래 100달러 수수료 예시와 양면 시장 해석은 기존 입문서의 관점이며 공식 요율표나 모든 계약의 설명은 아니다.

Visa, Mastercard 같은 카드 네트워크는 직접 카드를 발급하거나 소비자에게 신용을 제공하는 발급사와 역할이 다르다. 통상적인 4자 모델에서는 카드 소지자와 발급사, 가맹점과 매입사를 연결하며, 카드 회원과 가맹점 관계는 주로 발급사와 매입사가 관리한다. 이것이 네트워크가 은행과만 계약한다는 뜻은 아니다. Visa는 금융기관, 가맹점과 다른 사업 파트너와의 인센티브 계약을 공시하고, Mastercard 참가 자격도 적법한 금융 거래 권한을 가진 다른 법인을 포함한다. 네트워크 참가 계약, 카드 회원 계약, 가맹점 수납 계약과 별도 서비스/인센티브 계약을 구분한다. ([Visa 2024 10-K, Note 1](https://www.sec.gov/Archives/edgar/data/1403161/000140316124000058/v-20240930.htm), [Mastercard Rules, 1.1.1과 5.1](https://www.mastercard.com/content/dam/mccom/shared/business/support/rules-pdfs/mastercard-rules.pdf)) 역할은 넷이다.

1. 메시지 전달 — 승인 요청과 응답을 라우팅하는 통신 네트워크
2. 정산 — 참여 기관 간 순액 정산과 자금 이동 조율
3. 인센티브 설계 — 수수료 배분으로 참여자 행동 유도
4. 규칙과 분쟁 — 규정 제정과 집행, 중재 절차 제공

한 입문서(2026년 6월 기준)의 미국 신용카드 100달러 거래 예시로 보는 수수료 배분:

| 항목 | 비율 | 수취 주체 |
|---|---|---|
| 가맹점 수수료 합계 (merchant discount rate) | 2.5% | 아래 셋의 합 |
| interchange | 2% | 발급사 |
| 결제 프로세서 몫 | 0.35% | 프로세서 |
| network assessment fee | 0.15% | 네트워크 |

- 위 예시에서는 수수료 대부분이 네트워크가 아니라 발급사로 간다. 입문서는 이를 카드 발급과 사용을 늘리기 위한 양면 시장의 참여 유인으로 설명한다. Interchange는 발급사의 리워드와 마일리지 재원을 뒷받침할 수 있지만 실제 배분과 리워드 정책은 지역, 카드 종류와 계약에 따라 다르다.
- 분쟁은 발급사와 매입사의 차지백 대응, 사전 중재를 거쳐 네트워크 중재로 이어질 수 있다. 중재와 이의제기 수수료를 600달러와 1,000달러의 공통값으로 일반화하지 않는다. Visa 공개 규칙 1.10.2.3은 거래금액과 review fee의 책임을 규정하며, Mastercard 가이드도 별도의 중재와 이의제기 절차를 둔다. 실제 비용은 적용 수수료표와 acquirer/processor 계약에서 확인한다. 소액 거래에서 환불이 유리한지는 회수 가능성과 처리 비용을 비교한 판단이다. ([Visa Core Rules, 1.10.2](https://cis.visa.com/content/dam/VCOM/download/about-visa/visa-rules-public.pdf), [Mastercard Chargeback Guide, Arbitration Case Filing](https://www.mastercard.com/content/dam/public/mastercardcom/na/global-site/documents/chargeback-guide.pdf))
- 순액 정산은 자금 이동 규모를 줄일 수 있지만, 신용 위험이 순 포지션에 비례한다고 단정할 수는 없다. Visa의 2024 회계연도 평균 일일 정산 익스포저는 843억 달러였고, 2024-09-30 현재 고객의 정산 불이행에 대비해 일일 정산에 배정한 가용 유동성은 112억 달러였다. 전자는 미정산 Visa 거래에 대한 보증 익스포저, 후자는 불이행 대비 유동성이므로 필요 자본의 단순 비율로 해석하지 않는다. 정산 시차, 상대방 신용과 담보 등 위험 완화 장치를 함께 본다. ([Visa 2024 10-K, Liquidity와 Note 12](https://www.sec.gov/Archives/edgar/data/1403161/000140316124000058/v-20240930.htm), [Mastercard 2024 10-K, Note 22](https://www.sec.gov/Archives/edgar/data/1141391/000114139125000011/ma-20241231.htm))
- 네트워크 효과는 양방향이다. 카드가 늘면 가맹점이 늘고 가맹점이 늘면 카드가 는다. 입문서는 이 효과로 진입 장벽과 시장 집중을 설명한다. 거래 성사를 단일 목적 함수로, 사기 방지와 공정성을 그 아래 제약 조건으로 단정하지 않는다. Visa 공개 규칙 1.10.2.2는 중재 판단 시 공정성을 고려할 수 있다고 명시한다. ([Visa Core Rules, 1.10.2.2](https://cis.visa.com/content/dam/VCOM/download/about-visa/visa-rules-public.pdf))
- 위 수수료 배분 예시는 미국 신용카드 기준이다. 체크카드, 수수료 상한 규제 시장, 한국 가맹점 수수료율에 그대로 적용하지 않는다. 한국의 PG와 VAN이 끼는 다층 구조는 위 플레이어 절을 따른다.

## 결제 데이터: 주체별 시야

결제 한 건에서 나오는 데이터의 가시 범위는 주체뿐 아니라 API 필드, 계약, 토큰화, 동의와 법적 근거에 따라 달라진다. 아래는 전형적인 최소 범위의 예시다:

| 주체 | 보이는 데이터 |
|---|---|
| 이커머스(가맹점) | 회원, 상품과 카테고리와 브랜드, 결제금액, 결제수단 |
| 페이 운영사 | 개인 식별, 결제처, 금액, 수단 |
| PG | 결제처, 금액, 수단 |
| 카드사 | 결제처, 금액 |
| 은행 | 총 지출, 사용처 |

가맹점은 주문과 SKU를 직접 다루므로 대체로 가장 상세한 상품 정보를 갖는다. 결제 사업자도 가맹점이 전달한 주문명, line item이나 계약 범위에 따라 일부 상품 정보를 받을 수 있어 가맹점만 보유한다고 단정하지 않는다. 데이터 확장 전략의 예시:

1. **주문서형 페이** — 주문서를 가져가면 회원, 상품, 배송지, 결제까지 전부 보인다 (페이커머스).
2. **결제수단형 + 상품명 필수화** — 결제 API 정책으로 상품명을 필수값으로 만들어, 단순 결제수단이면서도 상품 단위 데이터를 수집한다.
3. **PLCC(상업자 표시 신용카드)** — 카드사와 브랜드가 혜택, 분석과 마케팅을 협업할 수 있지만 고객정보와 결제정보의 공유 범위는 계약, 동의, 개인정보 처리 역할과 법적 근거에 의해 제한된다.
4. **영수증 수집** — 상품 상세를 직접 전달받지 못하는 사업자가 상품명이 담긴 영수증 이미지로 데이터 범위를 넓히는 방식이다. 임대몰과 개별 브랜드의 주문 시스템이 분리돼 있으면 몰 운영사가 상품 상세를 받지 못할 수 있다. 다만 영수증 수집만이 오프라인 상품 데이터의 확보 경로는 아니다.
5. **POS 주문 연동** — 매장의 주문 시스템과 연결해 상품 내역과 결제 내역을 함께 받는 방식이다. 토스플레이스의 주문 모델은 상품 목록과 결제 내역을 포함하며, 주문 조회 API로 이를 조회할 수 있다. 조회 범위는 연동한 매장과 제공자 계약에 한정된다. ([토스플레이스, 주문 모델](https://docs.tossplace.com/reference/open-api/order/order-model.html), [주문 조회](https://docs.tossplace.com/reference/open-api/order/order-methods.html), 2026-10-06 부분 대조)

포인트 보상은 페이 재사용과 추가 거래 데이터를 유도할 수 있다. 회원정보, 구매 상품, 결제처와 결제 패턴을 결합하면 민감한 생활 프로파일이 될 수 있으므로 목적 제한, 최소 수집, 보유기간과 이용자 권리를 함께 설계해야 한다. 적법하게 사용할 수 있는 데이터만 개인화([[Personalization-Recommendation|개인화와 추천]])의 원료가 된다.

### 결제 단말 보급과 데이터 연동 범위

단말기 설치 수를 곧바로 외부 서비스가 분석할 수 있는 매장 수로 계산하지 않는다. 2026-10-06 확인한 토스플레이스 가이드는 단말의 기능 확장과 POS의 주문, 매출, ERP 연동을 구분한다. App API는 앱이 설치된 매장에서만 정보 조회와 웹훅 수신이 가능하다고 명시한다. ([연동 이해하기](https://docs.tossplace.com/guide/understanding.html), [App API](https://docs.tossplace.com/reference/open-api/app.html))

이 구분을 사업 검토에 적용하면 단말 보급, 데이터 접근이 열린 매장, 필요한 상품 필드가 채워진 주문을 따로 확인해야 한다. POS와 연결됐다는 사실만으로 다른 검색, 광고 플랫폼에도 데이터가 전달된다고 추정하지 않는다. 제휴와 연동 범위를 각각 확인하고, 매장 분석 상품의 가치는 실제 확보한 데이터의 범위와 품질로 판단한다. 주문 정본, 권한과 중복 이벤트 처리의 기술 계약은 [[POS-Offline-and-Integration|POS 외부 연동]]에서 다룬다.

## 디지털 상품 판매와 MoR

Merchant of Record(MoR)는 최종 구매자에게 법적으로 판매하는 주체다. PG나 결제 프로세서를 쓰면 판매자 자신이 판매 주체라 국가별 부가가치세와 판매세 등록, 신고, 환불과 차지백을 직접 떠안는다. MoR 플랫폼은 상품을 넘겨받아 구매자에게 파는 구조라 결제 처리, 세금 계산과 징수와 납부, 환불과 차지백, PCI 준수를 플랫폼이 맡고 판매자는 정산금을 받는다(2026-09-29 각 공식 문서 기준).

- Paddle은 SaaS, 모바일 앱, AI와 디지털 상품 회사를 위한 MoR로, Lemon Squeezy도 MoR로 스스로를 정의한다. Gumroad는 2025-01-01부터 모든 판매에서 MoR로 판매세와 VAT를 징수하고 납부한다. 그래서 플랫폼을 고를 때는 MoR 여부보다 구독 결제, 라이선스 관리, 결제 API처럼 필요한 기능과 수수료를 비교한다.
- 1인 기업이 해외 구매자에게 디지털 상품을 팔 때 국가별 세금 등록 부담을 줄이는 것이 MoR의 핵심 가치다. 판매자의 소득세 신고는 그대로 남는다.
- 대가는 수수료와 통제권이다. 수수료에 세무와 분쟁 처리 비용이 들어 있으므로 PG 요율과 숫자만 비교하지 않고 각 가격 페이지로 확인한다. 결제 화면, 환불 판단, 구매자 데이터와 지원 결제수단은 플랫폼 정책을 따른다. 매출이 커지면 직접 결제와 세무 대응 비용과 다시 비교한다.

### 판매 운영 기능과 결제 책임을 나눠 비교한다

강의, 뉴스레터와 커뮤니티를 운영하는 기능은 MoR라는 계약상 역할과 다른 비교 축이다. 2026-10-07에 공식 제품 페이지와 도움말에서 확인한 기능은 다음과 같다. 기능이 겹칠 수 있으므로 서로 배타적인 제품 분류로 쓰지 않는다.

| 운영할 것 | 공식 기능의 예시 | 결제와 별도로 확인할 것 |
|---|---|---|
| 강의와 지식 상품 | Kajabi의 강의, 코칭, 커뮤니티와 멤버십 | 콘텐츠 제공, 수강 권한과 운영 흐름 |
| 뉴스레터 | beehiiv의 발행, 웹사이트, 광고 네트워크와 유료 구독 | 발행과 구독자 관리, 수익화 기능의 이용 조건 |
| 이메일 마케팅 | Kit의 이메일 발송, 자동화, 디지털 상품과 유료 뉴스레터 | 고객 유입부터 후속 발송까지의 연결 |
| 커뮤니티와 강의 | Skool의 그룹, Classroom과 일회성 강의 구매 | 그룹 구독과 개별 강의 접근 조건 |

이 표는 제품 적합성을 검토할 질문을 정리한 것이며 수익 보장이나 도입 추천이 아니다. 위 운영 기능을 제공한다는 사실만으로 판매세, 환불과 차지백 책임까지 이전됐다고 판단하지 않는다. 실제 결제 경로의 판매 주체와 계약을 확인하고, 앞 절의 MoR 사례와 구분한다. 기능별 요금제, 판매자 국가와 정산 지원은 도입 시 다시 확인한다.

### PG 없이 계좌이체 받기

소액 판매나 사이드 프로젝트는 PG 계약 대신 무통장 입금을 받고, 입금 알림을 받아 주문과 자동으로 맞춰 주는 입금 확인 자동화 서비스(예: 페이액션, 2026-09-30 공식 사이트 기준 PG 가입, 심사와 결제 수수료 없음을 내세움)를 붙일 수 있다. 카드 결제를 원하는 구매자는 받을 수 없고, 입금자명과 금액으로 매칭하므로 동명이인과 금액 불일치는 수동 확인이 필요하다. 환불은 카드 취소가 아니라 계좌로 돌려보내는 별도 처리이고, 현금영수증 발급 요청 대응과 통신판매업자의 구매안전서비스(에스크로) 적용 여부도 판매자가 직접 확인한다.

## 면접 체크포인트

- 결제 시스템 설계 질문에서 승인과 매입의 분리(취소 vs 환불 분기), PG 연동의 멱등성(중복 승인 방지)을 짚으면 도메인 이해가 드러난다.
- 카드 네트워크의 역할과 발급사 몫인 interchange를 구분하고, 분쟁 단계별 비용과 계약 범위를 확인하는 관점을 수수료 모델 논의에 쓴다.
- 간편결제 연동에서는 저장 결제수단의 보유 주체, 토큰의 종류와 사용 범위, 사용자 동의와 인증을 확인한다. [[Commerce-Order|커머스 주문 도메인]]의 원클릭 결제는 상점의 빌링키 보관만을 전제로 하지 않는다. Apple Pay, Google Pay, Link처럼 지갑이나 결제사업자가 제공하는 방식도 있으며 지원 국가, 브라우저, 통화와 이용자 설정을 확인한다. ([Stripe Express Checkout](https://docs.stripe.com/elements/express-checkout-element), 2026-10-03 이 항목 부분 대조)
- 페이 도입의 사업 효과(수수료 수익, 락인, 익명성)는 [[Commerce-Member|커머스 회원 도메인]]의 자체 페이 참조.

## 출처
- [토스플레이스, 연동 이해하기](https://docs.tossplace.com/guide/understanding.html)
- [토스플레이스, App API](https://docs.tossplace.com/reference/open-api/app.html)
- [토스플레이스, 주문 - 개념 상세](https://docs.tossplace.com/reference/open-api/order/order-model.html)
- [토스플레이스, 주문 - 주문 조회](https://docs.tossplace.com/reference/open-api/order/order-methods.html)
- [페이 서비스가 뭔지 이해해보자 — 도그냥 (Brunch)](https://brunch.co.kr/@windydog/101)
- [데이터 관점에서 보는 네이버페이 — 도그냥 (Brunch)](https://brunch.co.kr/@windydog/212)
- [오프라인 유통이 생각보다 데이터를 못 모으는 이유 — 도그냥 (Brunch)](https://brunch.co.kr/@windydog/299)
- [What do Visa and Mastercard do? An introduction to card networks — tautology.town](https://tautology.town/2026/06/01/card-networks.html)
- [Visa와 Mastercard는 무슨 일을 할까? 카드 네트워크 입문 — GeekNews](https://news.hada.io/topic?id=33453)
- [Visa 2024 Annual Report (Form 10-K) — SEC](https://www.sec.gov/Archives/edgar/data/1403161/000140316124000058/v-20240930.htm)
- [Mastercard 2024 Annual Report (Form 10-K) — SEC](https://www.sec.gov/Archives/edgar/data/1141391/000114139125000011/ma-20241231.htm)
- [Visa, Core Rules and Product and Service Rules (2026-04-18)](https://cis.visa.com/content/dam/VCOM/download/about-visa/visa-rules-public.pdf)
- [Mastercard, Rules (2026-06-02)](https://www.mastercard.com/content/dam/mccom/shared/business/support/rules-pdfs/mastercard-rules.pdf)
- [Mastercard, Chargeback Guide Merchant Edition (2025-05-13)](https://www.mastercard.com/content/dam/public/mastercardcom/na/global-site/documents/chargeback-guide.pdf)
- [PCI Security Standards Council — PCI DSS](https://www.pcisecuritystandards.org/standards/pci-dss/)
- [EMVCo — Payment Tokenisation](https://www.emvco.com/emv-technologies/payment-tokenisation/)
- [China's Central Bank notions all online payment connect to a unified platform by middle of 2018 — CGTN](https://news.cgtn.com/news/7a597a4d78557a6333566d54/index.html) — 2018-06-30부터 은행 계좌 연계 온라인 결제의 넷츠유니온 경유
- [Paddle — What is Paddle?](https://developer.paddle.com/get-started/how-paddle-works/)
- [Lemon Squeezy — Merchant of Record](https://docs.lemonsqueezy.com/help/payments/merchant-of-record)
- [Gumroad — Gumroad is becoming a Merchant of Record](https://gumroad.com/blog/p/gumroad-is-becoming-a-merchant-of-record-more-updates)
- [Kajabi, 제품 기능](https://www.kajabi.com/)
- [beehiiv, 뉴스레터 플랫폼과 기능](https://www.beehiiv.com/)
- [Kit, 이메일 마케팅과 수익화 기능](https://kit.com/)
- [Skool Help Center, What is Classroom?](https://help.skool.com/article/166-what-is-classroom)
- [Skool Help Center, How to set up one time course purchases?](https://help.skool.com/article/168-how-to-set-up-one-time-course-purchases)
- [PayAction — 페이액션](https://payaction.app/)

## 관련 문서
- [[Payment-Domain|결제 참여자, 수수료, 정산과 세무 증빙]]
- [[Payment-Domain-Engineering|결제 입력, 토큰화, POS와 실패 복구]]
- [[Commerce-Order|커머스 주문 도메인]] — 결제 프로세스, 저장 결제수단과 주문서 재개
- [[Commerce-Member|커머스 회원 도메인]] — 자체 페이의 다중 효과
- [[In-App-Purchase|인앱결제]] — 결제시스템 강제와 수수료
- [[Commerce-Overview|커머스 도메인 개요]]
