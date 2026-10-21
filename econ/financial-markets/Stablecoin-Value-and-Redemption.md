---
tags: [econ, stablecoin, currency, reserves, liquidity]
status: done
verified_at: 2026-10-22
category: "Economics"
aliases: ["스테이블코인 가치와 상환", "Stablecoin Value and Redemption"]
---

# 스테이블코인의 가치와 상환

달러 스테이블코인은 토큰의 가치를 달러에 연동하려는 수단이다. 여기서는 USDC처럼 달러 표시 준비자산을 두는 구조를 다룬다. 알고리즘형 등 다른 안정화 방식까지 같은 담보와 상환 계약을 가진 것으로 보지 않는다.

## 발행, 이전과 상환은 다른 거래다

USDC의 기본 발행 흐름은 이용자의 달러 송금, 발행사의 토큰 발행, 준비자산 보유다. 상환은 토큰을 유통에서 빼고 준비자산에서 달러를 지급하는 반대 흐름이다. 실제 지급액에는 수수료가 반영될 수 있다.

| 구분 | 바뀌는 것 | 구분할 숫자 |
|---|---|---|
| 신규 발행 | 유통 토큰과 이를 뒷받침할 준비자산 | 발행액, 유통잔액 |
| 기존 토큰 이전 | 토큰 보유자 | 이전액, 거래량 |
| 상환 | 유통 토큰 감소와 달러 지급 | 상환액, 순발행액 |

가상의 토큰 100개가 열 번 이전되면 이전량 합계는 1,000개다. 신규 발행이나 소각이 없다면 유통잔액은 여전히 100개다. 따라서 거래량 증가를 같은 규모의 준비자산 증가나 국채 신규 매입으로 환산할 수 없다. 이 계산은 발행과 이전의 차이를 설명하는 예이며 실제 시장 통계가 아니다.

## 준비자산의 액수와 상환 가능성을 나눠 본다

USDC의 공개 준비자산 항목에는 은행 예금, 단기 미국 국채와 익일물 국채 역레포가 있다. 준비자산 전부를 국채라고 표현하지 않는다. 공개 잔액의 기준일과 구성, 발행 및 상환 흐름을 함께 확인한다.

달러 상환 약속이 있어도 모든 보유자가 같은 경로로 즉시 상환할 수 있는 것은 아니다. 2026-10-22 확인한 Circle의 **EEA 밖 보유자용 USDC Terms**는 직접 상환에 적격 Circle Mint 계정과 약관 준수 등을 요구한다. 단순 보유와 직접 상환 자격은 다르며, EEA에는 별도 문서가 적용된다.

상환은 다음 세 층으로 점검한다.

1. 준비자산의 가치와 유동성이 충분한가?
2. 내가 이용할 수 있는 상환 주체, 계정 자격과 지급 경로는 무엇인가?
3. 발행사 처리 시간, 은행 결제 시간과 거래소 매도 비용은 각각 얼마인가?

예를 들어 2026-10-22 확인한 Circle Mint 안내는 완전한 상환 요청을 수락한 때부터 Standard 처리를 통상 2영업일 이내로 안내하며 이후 은행 결제 시간이 추가된다고 명시한다. 심사나 결제망 장애 등으로 더 걸릴 수 있다. 이는 블록체인 전송 완료 시간이나 모든 보유자의 현금화 시간과 같지 않다. 처리 옵션과 수수료는 이용 시점에 다시 확인한다.

## 국채 수요와 정부 부채 감소는 다르다

준비자산으로 단기 국채를 더 보유하면 해당 만기의 국채 수요가 늘어날 수 있다. 그러나 이미 국채를 보유하던 투자자가 보유 수단만 바꾼 것인지, 새로운 투자자가 들어온 것인지에 따라 순증 효과가 달라진다. 단기 국채 수요를 장기 국채 수요의 대체로도 보지 않는다.

2026년 9월 FRBSF 분석은 발행사의 보유 증가를 미국 정부의 자금조달 수요보다 작은 규모로 평가하고, 미래 확대는 추세 지속을 가정한 전망으로 구분한다. 국채를 사는 경로가 늘었다고 정부의 상환 의무가 없어지는 것은 아니다.

상환 신뢰가 흔들리면 먼저 현금화하려는 요청이 몰릴 수 있다. 준비자산을 보유했다는 사실과 스트레스 상황의 유동성은 별도 조건이다. 이러한 위험은 토큰 거래와 은행 및 국채 시장을 연결하지만, 상환 증가가 곧 금융시장 전체의 붕괴를 뜻하지는 않는다.

## 원화 손익과 추가 수익 상품

단순 환산식은 다음과 같다. 실제 매매에서는 거래소 가격, 환전 스프레드와 수수료도 반영한다.

```text
원화 환산액 = 토큰 수 × 토큰당 달러 가격 × 달러당 원화 환율
```

가상으로 100개를 보유하고 토큰당 가격이 1달러로 유지돼도, 환율이 1,400원에서 1,300원으로 내려가면 환산액은 14만 원에서 13만 원으로 줄어든다. 수수료 전 손실률은 약 7.14%다. 달러 연동은 원화 가치의 보장이 아니다.

USDC 약관은 준비자산에서 발생한 이자에 대한 보유자의 권리를 인정하지 않으며, USDC 자체가 보유자에게 이자를 발생시키지 않는다고 명시한다. 따라서 예치나 대여로 제시하는 수익은 토큰 보유와 분리해 상대방, 담보와 출금 조건을 검토한다. FDIC의 보호 대상에도 암호자산 자체는 포함되지 않는다.

## 확인 질문

- 발표된 성장 수치는 거래량인가, 유통잔액인가, 준비자산 보유액인가?
- 직접 상환과 거래소 매도 중 실제로 사용할 수 있는 경로는 무엇인가?
- 달러 가격이 유지돼도 원화 손실이 나는 이유를 설명할 수 있는가?

## 출처

- [Circle, Tokenizing and redeeming USDC](https://help.circle.com/support/en/tokenizing-and-redeeming-usdc?id=kb_article_view&sysparm_article=KB0010781)
- [Circle, Transparency & stability](https://www.circle.com/transparency)
- [Circle, USDC Terms](https://www.circle.com/legal/usdc-terms) — 2026-10-15 개정, EEA 밖 보유자용 약관의 상환 자격과 이자 귀속
- [Circle, USDC/EURC redemption structure](https://help.circle.com/support/en/usdc-eurc-redemption-structure?id=kb_article_view&sysparm_article=KB0010644) — 처리 시간과 은행 결제 시간 구분
- [Stablecoin Issuers’ Growing Appetite for Treasury Securities — Federal Reserve Bank of San Francisco](https://www.frbsf.org/research-and-insights/publications/economic-letter/2026/09/stablecoin-issuers-growing-appetite-for-treasury-securities/) — 2026-09-28 분석, 신규 수요와 보유 수단 전환 및 만기 차이
- [FDIC, Electronic Deposit Insurance Estimator FAQs](https://edie.fdic.gov/fdic_info.html) — 보호 대상 계정 설명의 암호자산 제외 항목

## 관련 문서

- [[Tokenized-Bonds-and-Wholesale-CBDC|국채 토큰화와 기관용 CBDC]]
- [[Exchange-Rates-Balance-of-Payments|환율과 국제수지]]
- [[Risk-and-Return|위험과 수익]]
- [[금융시장(Financial Markets)|금융시장 지도]]
