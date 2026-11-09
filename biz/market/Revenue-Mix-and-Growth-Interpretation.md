---
tags: [business, market, revenue, financial-analysis, growth]
status: done
verified_at: 2026-11-09
category: "비즈니스&제품(Business&Product)"
aliases: ["Revenue Mix and Growth Interpretation", "매출 구성과 성장률 해석"]
---

# 매출 구성과 성장률 해석

사업의 전체 매출에서 차지하는 비중과 해당 사업의 매출 증가율은 다른 지표다. 분모인 전체 매출이 더 빨리 늘면 특정 사업의 매출이 증가해도 그 비중은 낮아진다.

## 금액, 비중과 변화율을 함께 계산한다

- 사업 비중 = 같은 기간 사업 매출 / 전체 매출
- 전년 동기 증가율 = `(이번 기간 매출 - 전년 같은 기간 매출) / 전년 같은 기간 매출`
- 구성 비중의 변화는 퍼센트포인트로, 금액의 증가는 금액 또는 증가율로 적는다.

다각화가 수익성을 높였는지는 이 값만으로 알 수 없다. 부문 이익, 공통비와 투자, 고객 집중도와 현금흐름을 추가로 본다. 공시의 항목명과 범위도 그대로 유지한다.

## 공시 수치로 읽는 예

Alphabet의 2026-10-28 공시에서 3분기 매출은 다음과 같다. 단위는 백만 달러이며 같은 분기끼리 비교했다.

| 항목 | 2025년 3분기 | 2026년 3분기 | 계산 |
|---|---:|---:|---|
| Google Search & other | 56,567 | 63,350 | 전년 대비 약 12.0% 증가 |
| Google Cloud | 15,157 | 30,709 | 약 102.6% 증가 |
| 전체 매출 | 102,346 | 127,577 | 약 24.7% 증가 |

이번 분기 Search & other 비중은 `63,350 / 127,577`, 약 49.7%다. Google Cloud는 약 24.1%다. Search & other를 검색만의 별도 매출로 임의로 축소하지 않는다. 전체 매출에서 Search & other를 뺀 나머지의 증가율은 약 40.4%이며 같은 공시 표에서 계산한 값이다.

검색 사업의 금액이 줄었다는 결론과 비중이 절반 아래라는 결론은 다르다. 제공된 GeekNews 발췌의 사상 최초 및 직전 31개 분기 범위는 과거 전 분기 공시를 대조하지 않았으므로 확인 후보로 남긴다. 매출 비중만으로 검색의 경쟁력 약화, AI의 인과 효과나 투자 수익을 확정하지 않는다.

## 두 회사의 매출을 가이던스로 비교할 때

다음 분기 매출 순위를 예상할 때는 실적과 전망을 섞지 않고, 각 회사가 제시한 범위의 양 끝을 비교한다. 단위는 십억 달러다.

| 항목 | AMD | Intel |
|---|---:|---:|
| 2026년 3분기 매출 실적 | 13.4 (13,377백만) | 16.5 |
| 2026년 4분기 매출 전망 | 약 17, ±3% (약 16.49~17.51) | 15.0~16.0 |
| 공시일 | 2026-11-03 | 2026-10-29 |

AMD 전망의 하단이 Intel 전망의 상단보다 높으므로, 두 회사가 각자 범위 안에서 실적을 내면 4분기 매출은 AMD가 크다. 아직 전망이며 실적 공시로 다시 확인한다.

같은 공시에서 AMD의 Data Center 부문은 8,546백만 달러로 전년 대비 97% 늘었고, 전체 매출의 약 63.9%다(공시 표로 계산). 부문 이름이 비슷해도 범위가 같다고 가정하지 않는다. Intel 공시는 부문 매출에 부문 간 거래가 포함된다고 밝히며, 3분기 부문 간 제거액이 6,291백만 달러다. 그래서 Intel Products, Intel Foundry와 All Other 부문 매출의 합은 연결 매출보다 크다. 부문 비중을 계산할 때는 분모가 연결 매출인지, 제거 전 부문 합계인지 적는다.

## 확인할 질문

- 실적과 전망을 구분하고, 전망은 범위의 양 끝으로 비교했는가
- 부문 매출에 부문 간 거래가 포함되는가
- 두 숫자가 같은 통화, 기간과 회계 범위인가
- 분모가 전체 기업인지 특정 부문인지 분명한가
- 성장률 변화와 구성 비중 변화를 구분했는가
- 일회성 수익, 인수 효과와 환율 효과를 확인했는가
- 수익성과 현금흐름을 매출 증가로 대신 판단하지 않았는가

## 출처

- [Alphabet Announces Third Quarter 2026 Results — Alphabet, SEC Exhibit 99.1](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000080/googexhibit991q32026.htm) — 2026-10-28, 2026-11-02 매출 표와 항목명 확인. 비중과 변화율은 표의 수치로 직접 계산
- Google 검색, 처음으로 Alphabet 매출의 절반 아래로 내려감 — GeekNews, 2026-10-30 제공 발췌. 최초 여부와 과거 31개 분기 범위 미확인
- [AMD Reports Third Quarter 2026 Financial Results — AMD, SEC Form 8-K Exhibit](https://www.sec.gov/Archives/edgar/data/0000002488/000000248826000188/q32026991.htm) — 2026-11-03, 2026-11-09 부문 매출과 4분기 전망 확인. Data Center 비중은 표의 수치로 계산
- [Intel Reports Third-Quarter 2026 Financial Results — Intel](https://www.intc.com/news-events/press-releases/detail/1786/intel-reports-third-quarter-2026-financial-results) — 2026-10-29, 2026-11-09 부문 매출, 부문 간 제거액과 4분기 전망 확인
- [AMD expects to outsell Intel in Q4 for the first time in history — Tom's Hardware](https://www.tomshardware.com/pc-components/cpus/amd-expects-to-outsell-intel-in-q4-for-the-first-time-in-history-usd17b-guidance-would-exceed-intels-projections) — 비교의 계기 기사, 본문은 열람하지 못해 수치는 위 공시로만 확인. 2027년 Data Center 비중 전망은 공시에 없어 옮기지 않음

## 관련 문서

- [[Market-Analysis|시장 분석]]
- [[Metrics-Framework|지표 설계]]
- [[Startup-Financial-Discipline|매출, 이익과 현금의 구분]]
