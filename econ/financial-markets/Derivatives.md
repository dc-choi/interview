---
tags: [econ, finance]
status: done
category: "Economics"
aliases: ["파생상품", "Derivatives"]
verified_at: 2026-10-03
---

# 파생상품

> 한 줄 요약: 파생상품은 기초자산이나 기준 변수에서 가치가 파생되는 계약이다. 기존 위험을 줄이거나 새로운 위험을 질 수 있으며, 목적과 전체 포지션, 레버리지와 결제 조건을 함께 봐야 한다.

## 1. 파생상품이란 무엇인가

파생상품은 **기초자산, 금리, 지수 같은 기준 변수에서 가치가 파생되는 계약**이다. 옵션 프리미엄처럼 파생상품 계약 자체도 현재 시장가치를 가진다. 미래 현금흐름이나 가격 위험을 이전, 관리하거나 시장 전망을 표현하는 데 사용한다.

## 2. 기본형 — 선도, 선물, 옵션, 스왑

- **선도(forward)**: 미래의 거래 가격, 수량과 시점 등을 당사자가 맞춤 합의하는 장외(OTC) 계약. 농부가 구매자와 수확물 가격을 미리 정하거나 수출 기업이 은행과 선물환을 계약하는 예가 여기에 해당한다. 양쪽에 이행 의무가 있다.
- **선물(futures)**: 거래소가 수량, 만기 등 조건을 표준화한 미래 매매 계약. 양쪽에 이행 의무가 있고 청산기관이 결제를 관리한다. 선도와 선물은 목적이 비슷해도 거래 구조와 현금흐름이 다르다.
- **옵션(option)**: 매수자가 프리미엄을 부담하고 정해진 가격에 살(콜) 또는 팔(풋) **권리**를 얻는 계약. 매수자에게 행사 의무는 없지만, 매도자는 행사와 배정에 따라 결제나 인도 의무를 진다. 행사 가능 시점과 자동행사 조건은 계약별로 다르다.
- **스왑(swap)**: 두 당사자가 미래의 현금흐름을 맞교환하는 계약. 변동금리 이자를 고정금리로 바꾸는 금리스왑이 대표적이다.

선물은 일일정산으로 손익을 주고받고, 계약에 따라 최종적으로 현금결제하거나 실물을 인도한다. 인도 의무가 생기기 전 상쇄거래로 포지션을 닫을 수도 있지만 체결이 보장되지는 않는다. 거래 장소와 청산 여부는 별개이며, 일부 장외 선도도 중앙청산과 담보를 사용한다.

## 3. 무엇에 쓰나 — 헤지, 투기, 차익거래

같은 도구가 목적에 따라 정반대 성격을 띤다.

- **헤지(위험 관리)**: 기존 또는 예상 거래의 위험을 상쇄하려는 포지션이다. 수출 기업이 예상 외화 수입을 선물환으로 고정하면 환율 변동 노출을 줄일 수 있다. 실제 수입의 금액과 시점 불일치, 헤지 대상과 수단의 가격 관계가 예상과 달라지는 **베이시스 위험(basis risk)**, 거래상대방과 유동성 위험은 남을 수 있다.
- **투기**: 가격 방향에 베팅해 수익을 노린다. 위험을 줄이는 게 아니라 새로 진다.
- **차익거래**: 이론적으로 같은 현금흐름의 가격 차이를 상쇄 포지션으로 포착한다. 실제 거래에는 실행, 자금조달, 거래상대방과 모델 위험이 있어 완전한 무위험 이익이 아닐 수 있다.

헤지인지 투기인지는 파생상품만 떼어 보지 않고 기존 자산, 부채와 예상 거래를 합쳐 판단한다. 헤지 목적이라도 과도한 수량이나 잘못 맞춘 만기는 새로운 위험을 만들 수 있다.

## 4. 레버리지, 증거금과 유동성

선물 등은 적은 증거금으로 큰 계약 규모에 노출될 수 있어 **레버리지**가 생긴다. 가격 변화에 따른 손익이 투입 자금 대비 커질 수 있다. 옵션 매수도 프리미엄 대비 큰 가격 노출을 가질 수 있지만, 모든 파생상품 포지션의 위험이나 손실 한도가 같은 것은 아니다.

**선물 증거금은 계약 이행을 위한 담보이며 매매대금의 일부나 최대 손실액이 아니다.** 일일정산 손실이나 증거금 요건 상승으로 추가 자금이 필요할 수 있다. 이를 충족하지 못하면 포지션이 강제 청산될 수 있고, 청산 뒤에도 계좌의 부족액을 갚아야 할 수 있다.

- **시장 유동성 위험**: 거래 상대 주문 부족이나 거래 제한으로 원하는 때와 가격에 상쇄거래를 체결하지 못할 수 있다.
- **자금 유동성 위험**: 최종적으로 헤지 효과가 있어도 증거금 납부가 먼저 필요하면 그 시점의 현금 부족으로 포지션을 유지하지 못할 수 있다.
- **거래상대방 위험**: 계약 상대가 의무를 이행하지 못할 위험이다. 중앙청산과 담보는 이를 관리하지만 시장 손실이나 모든 이행 위험을 없애지는 않는다.

## 5. 시스템 리스크

파생상품 거래로 기관들이 연결되면 한 곳의 부실이 다른 기관으로 번질 수 있다. 2008년 금융위기 때 AIG는 주택 관련 증권의 손실과 신용부도스왑(CDS)의 담보 요구로 유동성 압박을 받았다. AIG의 부실은 거래상대방의 손실과 금융시스템 불안으로 이어질 위험이 있었다. CDS는 부도 지급뿐 아니라 부도 전의 평가손실과 담보 납부도 부담이 될 수 있음을 보여준다 → [[Business-Cycle|경기순환]].

## 6. 핵심 개념

- **선도, 선물, 옵션, 스왑**: 계약 구조와 권리, 의무를 구분
- **헤지 vs 투기**: 기존 노출을 포함한 전체 포지션으로 판단
- **레버리지**: 수익과 손실을 함께 증폭
- **증거금과 결제**: 담보와 최대 손실을 구분하고 납부, 인도 의무를 확인
- **시스템 리스크**: 연결이 만드는 전염

## 7. 흔한 오해

- **파생상품은 모두 도박이다** → 위험 이전과 가격 노출에 쓰이는 계약이다. 헤지인지 투기인지는 사용 목적과 실제 노출에 달려 있으며, 헤지에도 비용과 잔여 위험이 있다.
- **옵션 매수와 매도의 손실 한도는 같다** → 옵션만 단독 매수한 포지션의 손실은 프리미엄으로 한정된다(거래비용 제외). 행사나 자동행사로 생긴 주식 또는 선물 포지션에는 별도의 손실과 자금 의무가 생길 수 있다. 기초자산 가격 상한이 없고 보유 자산이나 상쇄 포지션으로 보호되지 않은 **uncovered short call**은 이론상 손실 상한이 없다. 증거금을 납부해도 이 손실 상한이 생기지는 않는다. 기초가격 하한이 0인 주식 등의 short put은 만기 기준 `행사가 × 계약 수 × 계약 승수 - 총 수취 프리미엄`이 최대 손실이다(비용 제외). 음수 가격이 가능한 선물 옵션에는 이 하한을 적용할 수 없다. covered option이나 spread는 보유 자산과 다른 leg까지 함께 봐야 한다.
- **헤지하면 모든 불확실성이 사라지고 상승 여력도 포기한다** → 헤지는 특정 위험 노출을 줄이는 것이며 basis, 수량과 시점 불일치 때문에 잔여 위험이 남을 수 있다. 선도나 선물로 가격을 고정한 범위에서는 유리한 움직임도 상쇄하지만, 보호적 옵션은 프리미엄을 내고 유리한 방향의 상승 여력을 유지할 수 있다.

예를 들어 행사가 10, 만기 기초선물 가격 -20이면 풋의 단위당 내재가치는 30으로, 기초가격 0일 때의 10을 넘는다. 실제 손익에는 계약 승수와 수취 프리미엄도 반영한다. CME는 2020년 에너지 선물의 음수 가격에 대응하는 옵션 가격모형을 공지했으며, 계약별 가격과 결제 조건을 확인해야 한다.

## 출처

검증 범위(2026-10-03): 선도와 선물의 거래 구조, 옵션 권리와 의무, 손실 한도, 증거금과 결제, 헤지의 잔여 위험을 대조했다. AIG와 음수 가격은 역사적 사례이며, 현재 계약별 증거금률과 만기, 인도, 자동행사 세부 규칙을 확인한 날짜는 아니다.

- [CFTC Glossary, basis risk](https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/CFTCGlossary/index.htm) — 베이시스, 헤지, 거래상대방 위험과 자동행사
- [Economic Purpose of Futures Markets and How They Work — CFTC](https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/economicpurpose.html) — 헤지와 일일정산의 현금흐름, 청산기관의 역할
- [CME Group, Futures Contracts Compared to Forwards](https://www.cmegroup.com/education/courses/introduction-to-futures/futures-contracts-compared-to-forwards) — 표준화와 거래소, 맞춤형과 장외 거래의 차이
- [CME Group, Understanding Futures Expiration & Contract Roll](https://www.cmegroup.com/education/courses/introduction-to-futures/understanding-futures-expiration-contract-roll) — 상쇄거래와 현금결제, 실물 인도
- [CME Group, Margin: Know What's Needed](https://www.cmegroup.com/education/courses/introduction-to-futures/margin-know-what-is-needed) — 증거금의 성격과 추가 납부, 청산
- [CME Group, Cleared Only OTC London Gold Forwards & OTC London Silver Forwards](https://www.cmegroup.com/trading/metals/files/cleared-only-gold-and-silver-forwards.pdf) — 중앙청산과 담보를 사용하는 장외 선도의 구조 예시
- [CME Group, 101 Overview: Delivery](https://www.cmegroup.com/articles/brochures-and-handbooks/101-overview-delivery.html) — 인도 의무와 이행 실패 위험
- [Cboe, Risk Disclosure Statement for Futures and Options on Futures](https://cdn.cboe.com/resources/general/Combined_Risk_Disclosure_Statement_for_Futures_and_Options.pdf) — 증거금을 넘는 손실, 청산 뒤 부족액, 옵션 행사와 유동성 위험
- [FINRA, Options](https://www.finra.org/investors/investing/investment-products/options) — 옵션 매수자와 매도자의 권리, 의무와 uncovered call의 손실 위험
- [Cboe, Equity Options – Short Put – American Style, Key Information Document](https://cdn.cboe.com/resources/participant_resources/kid/EN/Equity_Option_Short_Put_KID.pdf) — 주식 풋 매도의 만기 손익과 최대 손실
- [CME Group, protective put example](https://www.cmegroup.com/education/articles-and-reports/trading-micro-e-mini-options)
- [CME Group, Clearing Advisory 20-171 — Negative Futures Prices and Options Pricing Model](https://www.cmegroup.com/content/dam/cmegroup/notices/clearing/2020/04/Chadv20-171.pdf)
- [Interconnectedness and Systemic Risk — Federal Reserve, Janet L. Yellen](https://www.federalreserve.gov/newsevents/speech/yellen20130104a.htm) — AIG의 CDS 담보 요구와 유동성 압박
- [American International Group — Federal Reserve, Ben S. Bernanke](https://www.federalreserve.gov/newsevents/testimony/bernanke20090324a.htm) — AIG의 손실과 부실 시 거래상대방, 금융시스템 위험

## 관련 문서

- [[Risk-and-Return|위험과 수익]] — 파생상품이 옮기고 키우는 대상
- [[Financial-System-Overview|금융시스템 개관]] — 위험 이전이라는 시장 기능
- [[금융시장(Financial Markets)]] — 지도
