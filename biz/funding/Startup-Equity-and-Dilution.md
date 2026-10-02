---
tags: [business, funding, equity, dilution]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["스타트업 지분과 희석", "Cap Table", "Pre-money와 Post-money"]
verified_at: 2026-10-02
---

# 스타트업 지분과 희석

지분 투자는 회사에 들어오는 돈, 기존 주주의 지분 변화, 투자자가 얻는 권리를 함께 보는 결정이다. 이 문서는 계산과 계약 검토의 기초를 다룬다. 사용자의 투자 계획이나 현재 주주 구성을 전제하지 않는다.

검증 기준은 2026-10-02다. SEC 자료는 용어와 계산 원리를, YC 자료는 해당 SAFE 양식의 구조를 확인하는 데 사용했다. 미국의 발행 규제나 계약 효력을 한국 회사에 적용하지 않는다. 한국 계약은 준거법, 정관, 실제 문서와 발행 절차를 별도로 확인한다.

## 신주와 구주: 회사에 들어오는 돈부터 구분

- **현금 신주 투자**: 회사가 새 주식을 발행하고 투자자가 회사에 대금을 납입한다. 회사의 조달 현금과 발행 주식 수가 늘어난다.
- **기존 주주 보유 구주 매매**: 투자자가 기존 주주의 주식을 산다. 매매대금은 매도 주주에게 간다. 이 거래만으로 회사의 조달 현금이나 발행 주식 수가 늘지는 않는다.
- **혼합 거래**: 신주 대금과 구주 대금을 나누어 계산한다. 발표된 투자 규모 전부를 회사의 운영 현금으로 넣으면 자금 계획을 과대평가할 수 있다.

SEC는 구주 거래를 투자자 사이의 기존 증권 거래로 설명한다. 위 구분은 이 거래 구조에서 현금의 수취인을 확인하는 방법이다. 자기주식 매각 등 회사가 매도인이 되는 거래는 별도 검토한다. [SEC What is a private secondary market?](https://www.sec.gov/files/oasb-prvt-sec-mrkt-building-block.pdf)

수수료, 납입 일정과 지급 조건을 반영한 실제 가용 현금은 [[Startup-Financial-Discipline|현금 규율과 런웨이]]에서 계산한다. 기업가치 숫자는 통장 잔액이나 지금 매각할 수 있는 금액과 다르다.

## Pre-money와 Post-money: 단순 신주 투자 계산

Pre-money는 이번 투자 직전의 지분 가치, Post-money는 이번 투자 직후의 지분 가치다. 같은 기업가치 숫자라도 어느 시점인지에 따라 투자자의 지분율이 달라진다. [SEC Glossary, Valuation](https://www.sec.gov/resources-small-businesses/glossary)

다음 식은 **전액 현금 신주 투자, 같은 주당 가격, 기존 전환증권과 옵션 없음, 옵션 풀 변경 없음, 수수료와 다른 동시 거래 없음**을 가정한다. 여기의 기업가치는 지분 가치이며 기업 전체 가치(EV)와 혼용하지 않는다.

```text
Post-money = Pre-money + 신규 투자금
신규 투자자 지분율 = 신규 투자금 / Post-money
기존 주주 전체 지분율 = Pre-money / Post-money
주당 발행가격 = Pre-money / 투자 전 주식 수
신규 발행 주식 수 = 신규 투자금 / 주당 발행가격
```

가상의 회사에 기존 주식 10,000주가 있고 Pre-money 8억 원에 신주 투자 2억 원을 받는 예다.

| 항목 | 계산 | 결과 |
| --- | --- | --- |
| Post-money | 8억 원 + 2억 원 | 10억 원 |
| 주당 발행가격 | 8억 원 / 10,000주 | 80,000원 |
| 신규 주식 | 2억 원 / 80,000원 | 2,500주 |
| 투자자 지분 | 2,500주 / 12,500주 | 20% |
| 기존 주주 전체 지분 | 10,000주 / 12,500주 | 80% |

반대로 **Post-money 8억 원에 2억 원 투자**라면 같은 단순 조건에서 투자자 지분은 25%, Pre-money는 6억 원이다. Pre/Post 표기가 없는 제안은 이 차이부터 확인한다. 표의 금액은 교육용 가정이다.

## Cap table과 Fully diluted: 분모를 먼저 확정

Cap table은 주주와 증권 종류, 보유 수량 등을 정리한 자본 구성표다. 지분율만 적으면 전환 조건이나 옵션으로 늘어날 주식 수를 놓칠 수 있다. [SEC Glossary, Capitalization Table](https://www.sec.gov/resources-small-businesses/glossary)

- **현재 발행 주식 기준**과 **전환, 행사 등을 가정한 Fully diluted 기준**을 구분한다.
- 분석에는 보통주, 우선주 전환 가정, 부여한 옵션과 워런트, 미부여 옵션 풀, SAFE와 전환증권의 예상 주식 수를 각각 표시한다.
- 포함할 항목과 계산 시점은 계약에서 확인한다. Fully diluted라는 이름만으로 모든 계약의 분모가 같다고 가정하지 않는다. YC도 기존 SAFE와 Post-money SAFE의 Company Capitalization에 포함하는 항목을 다르게 정의한다. [YC SAFE User Guide, B.4와 B.5](https://bookface-static.ycombinator.com/assets/ycdc/SAFE%20User%20Guide-a47c6588327d73aa2799e61ed7c2cae9f1a0ee9acfa9c43b62039dc06e715832.pdf)
- 미부여 옵션 풀은 계산용 예약분과 실제 발행 주식을 구분한다. 풀의 신설이나 확대를 투자 전 분모에 넣는지, 투자 뒤에 반영하는지에 따라 누가 희석을 부담하는지가 달라진다.

계약 검토용 표에는 투자 전, 전환 후, 옵션 풀 변경 후, 신주 납입 후를 따로 보여준다. 이는 오류를 찾기 위한 분석 순서이며 모든 계약의 법적 처리 순서를 뜻하지 않는다.

## 연속 투자: 지분율 감소를 더하지 않는다

추가 매수, 옵션 풀 변경, 전환증권과 특별한 조정 조항이 없는 단순 신주 투자에서는 기존 지분율에 매 라운드의 잔존 비율을 곱한다. 희석은 신주 발행으로 기존 주주의 소유 비율이 줄어드는 현상이다. [SEC Glossary, Dilution](https://www.sec.gov/resources-small-businesses/glossary)

처음 100%였던 주주가 첫 라운드 뒤 80%가 되고, 다음 라운드에서 새 투자자가 투자 직후 20%를 얻으면 기존 주주의 지분은 `80% × 80% = 64%`다. 20%포인트씩 빼서 60%로 계산하지 않는다.

지분율 하락만으로 보유 지분의 경제적 가치가 하락했다고 확정할 수는 없다. 회사 가치와 증권별 권리도 달라질 수 있다. 후속 투자 참여권이 있어도 실제 추가 투자금과 행사 조건을 확인해야 지분 유지 여부를 계산할 수 있다.

## 지분율, 경제권과 의결권은 별개

주식 종류에 따라 의결권과 경제적 권리가 달라질 수 있다. 창업자에게 보통주, 외부 투자자에게 우선주가 발행되는 경우가 많다는 설명을 모든 회사의 규칙으로 일반화하지 않는다. [SEC Common Startup Securities](https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/common-startup-securities)

검토할 항목은 배당, 잔여재산 분배 순서, 전환과 상환 조건, 의결권, 이사회 구성, 특정 의사결정의 사전 동의, 후속 발행 시 조정 조건이다. 같은 지분율이라도 이 조건이 다르면 수익 배분과 의사결정 범위가 달라질 수 있다. [SEC Raising Later-Stage Capital](https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/raising-later-stage-capital)

매각이나 청산 때 지분율에 총금액만 곱하기 전에 부채, 비용과 증권별 배분 조건을 확인한다. 낮은 매각가, 높은 매각가, 후속 투자 실패의 경우를 나누어 검토한다. 이는 계약 검토를 위한 분석 제안이며 특정 한국 계약의 배분 결과를 확정하는 설명이 아니다.

## SAFE: 미래 지분 권리와 현재 주식을 구분

SAFE는 특정 사건이 생기면 미래 지분을 받도록 약정하는 계약이다. 계약 체결 자체를 현재 주식 보유와 동일하게 취급하지 않는다. SEC는 전환 사건이 발생하기 전 SAFE 보유자가 회사의 소유 지분을 갖지 않는다고 설명한다. [SEC Common Startup Securities](https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/common-startup-securities)

- YC의 SAFE는 대출이 아니며 이자와 만기가 없는 구조다. 이를 SAFE라는 이름을 붙인 모든 나라의 계약에 적용하지 않는다.
- **Valuation cap**은 해당 양식의 전환 가격을 정하는 상한 조건이다. cap을 현재 확정 기업가치로 읽지 않는다. 실제 전환 지분은 cap, 할인, 후속 투자 가격과 분모에 따라 계산한다.
- YC Post-money SAFE에서 post-money는 SAFE 자금 전체 반영 후를 뜻하며 후속 priced round의 신규 투자금 반영 후까지 뜻하지 않는다. 후속 투자와 옵션 풀 변경으로 다시 희석될 수 있다. [YC SAFE](https://www.ycombinator.com/safe)
- 투자금/cap 계산만으로 최종 지분을 확정하지 않는다. YC 가이드도 후속 투자 가치가 cap보다 낮거나 가까우면 예상보다 많은 지분으로 전환될 수 있다고 설명한다. [YC SAFE User Guide, Quick Start Guide와 B.3](https://bookface-static.ycombinator.com/assets/ycdc/SAFE%20User%20Guide-a47c6588327d73aa2799e61ed7c2cae9f1a0ee9acfa9c43b62039dc06e715832.pdf)

YC는 미국 회사용 양식과 일부 비미국 관할 양식을 구분한다. 해당 페이지의 양식을 한국 회사에 그대로 적용할 수 있다고 판단하지 않는다. 국내 조건부지분인수계약의 법적 요건, 세무와 회계 처리는 이 문서에서 검증하지 않았다.

## 결정 전에 확인할 질문

아래는 공개 자료를 바탕으로 구성한 검토 질문이며 투자 유치를 선택하라는 권고가 아니다.

1. 필요한 회사 현금은 얼마이고, 신주 대금에서 비용을 뺀 금액은 언제 들어오는가?
2. Pre/Post와 발행가격의 분모에 전환증권, 옵션과 미부여 풀이 어떻게 들어가는가?
3. 이번 투자, 옵션 풀 확대와 후속 투자 뒤의 지분표를 각각 계산했는가?
4. 증권별 경제권, 의결권과 동의권이 사업 운영과 다음 조달에 어떤 조건을 붙이는가?
5. 기존 계약의 후속 투자 참여권과 조정 조항, 매도 제한을 확인했는가?
6. 실제 계약, 정관, 결의와 납입 절차가 같은 조건을 담고 있는가?

한국벤처캐피탈협회는 2026-06-30 개정 표준계약서와 해설서 배포를 공지했고, 투자계약서(SPA)와 주주간계약서(SHA)를 분리한 체계를 안내했다. 여기서는 공지의 배포 사실과 구조만 확인했다. 첨부 계약서의 세부 조항이나 특정 거래에 대한 적합성까지 검증한 것은 아니다. [KVCA 배포 안내](https://www.kvca.or.kr/Program/board/listbody.html?a_cd=12&a_gb=board&a_item=0&page=1&po_no=7310&sm=4_3&tm_num=1)

## 이해 확인

1. 다른 조건 없는 신주 투자에서 Pre-money 12억 원, 투자금 3억 원이면 투자자 지분은 얼마인가? 같은 3억 원이 기존 주주 보유 구주의 매매대금이라면 회사 조달 현금은 얼마인가?
2. 현재 60%를 가진 주주가 추가 투자하지 않고, 다음 라운드의 새 투자자가 투자 직후 25%를 얻는다면 기존 주주의 지분은 얼마인가? 옵션 풀 확대가 붙으면 왜 다시 계산해야 하는가?

첫 답은 `3 / (12 + 3) = 20%`, 순수 구주 매매만으로는 회사 조달 현금 0원이다. 둘째 답은 다른 변화가 없다면 `60% × 75% = 45%`다. 옵션 풀은 분모와 희석 부담을 바꾸므로 기존 가정으로 계산을 끝낼 수 없다. 정답을 읽은 사실은 숙련 확인과 구분한다.

## 출처

- [Glossary — U.S. Securities and Exchange Commission](https://www.sec.gov/resources-small-businesses/glossary)
- [What is a private secondary market? — U.S. Securities and Exchange Commission](https://www.sec.gov/files/oasb-prvt-sec-mrkt-building-block.pdf)
- [Common Startup Securities — U.S. Securities and Exchange Commission](https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/common-startup-securities)
- [Raising Later-Stage Capital — U.S. Securities and Exchange Commission](https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/raising-later-stage-capital)
- [SAFE — Y Combinator](https://www.ycombinator.com/safe)
- [Y Combinator, Post-Money SAFE User Guide](https://bookface-static.ycombinator.com/assets/ycdc/SAFE%20User%20Guide-a47c6588327d73aa2799e61ed7c2cae9f1a0ee9acfa9c43b62039dc06e715832.pdf)
- [2026년 개정 벤처투자 표준계약서 및 해설서 배포 안내 — 한국벤처캐피탈협회](https://www.kvca.or.kr/Program/board/listbody.html?a_cd=12&a_gb=board&a_item=0&page=1&po_no=7310&sm=4_3&tm_num=1)

## 관련 문서

- [[자금조달(Funding)|자금 조달]] — 조달 방식과 조건
- [[Startup-Financial-Discipline|현금 규율과 런웨이]] — 조달금의 가용 시점과 지출
- [[Business-Model|비즈니스 모델과 Unit Economics]] — 투자금으로 검증할 사업 구조
- [[Valuation|기업 가치 평가]] — 기업 전체 가치와 지분 가치 구분
- [[Government-Support-Programs|정부 지원사업의 구조]] — 지원금, 대출과 보증의 조건
