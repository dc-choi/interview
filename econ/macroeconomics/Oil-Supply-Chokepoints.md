---
tags: [econ, macro, oil, supply-chain, chokepoint]
status: done
verified_at: 2026-10-07
category: "Economics"
aliases: ["원유 공급 병목과 유가", "Oil Supply Chokepoints"]
---

# 원유 공급 병목과 유가

원유 공급은 유전에서 생산한 양뿐 아니라 소비지까지 운송할 수 있는 양에 달려 있다. 해협, 송유관이나 정유시설의 차질은 공급을 늦추고 비용을 높일 수 있다. 가격 반응을 해석하려면 차질의 규모와 기간, 대체 경로, 재고와 추가 생산 여력을 함께 본다.

## 단기 가격이 크게 움직이는 이유

단기간에는 유전의 생산설비를 늘리거나 자동차와 산업설비가 사용하는 연료를 바꾸기 어렵다. 공급과 수요가 가격 변화에 즉시 충분히 반응하지 못하므로 물량 부족을 조정하는 과정에서 가격이 크게 움직일 수 있다. 공급 감소율을 그대로 가격 상승률로 환산할 수는 없다. [EIA의 가격 설명](https://www.eia.gov/energyexplained/oil-and-petroleum-products/prices-and-outlook.php)

현재 공급뿐 아니라 앞으로 공급이 끊길 가능성도 가격에 반영된다. 재고와 추가 생산 여력이 부족하다고 예상하면 위험 프리미엄이 붙을 수 있다. 따라서 가격 상승만으로 실제 물리적 공급 손실을 역산하지 않는다. [EIA의 현물가격 설명](https://www.eia.gov/finance/markets/crudeoil/spot_prices.php)

## 생산, 운송과 재고를 구분한다

| 구분 | 의미 | 확인할 질문 |
|---|---|---|
| 추가 생산 여력 | 현재보다 더 생산할 수 있는 능력 | 언제 증산할 수 있고 얼마나 유지할 수 있는가? |
| 운송 여력 | 생산된 원유를 시장으로 내보내는 경로의 처리 능력 | 우회 경로가 실제로 열려 있고 추가 물량을 받을 수 있는가? |
| 재고 | 이미 생산해 보관한 물량 | 공급 차질을 얼마나 오래 보완할 수 있는가? |

EIA는 spare capacity를 **30일 이내 가동해 최소 90일 유지할 수 있는 생산량**으로 정의한다. 이는 송유관이나 항만의 여유 용량이 아니다. 재고 역시 추가 생산과 다르므로 공급 차질의 예상 기간과 함께 판단한다. [EIA의 추가 생산 여력 정의](https://www.eia.gov/energyexplained/oil-and-petroleum-products/prices-and-outlook.php)

## 우회로도 경로 전체를 봐야 한다

호르무즈 해협은 페르시아만에서 오만만과 아라비아해로 이어진다. 사우디아라비아와 아랍에미리트 등의 송유관은 일부 원유에 우회 경로를 제공하지만, 해협을 통과하던 모든 물량을 대체하는 것은 아니다. 사우디의 동서 송유관은 원유를 홍해 쪽으로 옮기는 경로다. [EIA의 운송 병목 분석](https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/)

홍해와 아덴만 사이에는 바브엘만데브 해협이 있고, 홍해와 지중해 사이에는 수에즈 운하와 SUMED 송유관이 있다. 어떤 경로를 우회할 수 있는지는 출발지와 목적지에 따라 달라진다. 희망봉 항로는 일부 항로에서 바브엘만데브와 수에즈를 피할 수 있지만 운송 거리와 시간이 늘어난다. **희망봉을 도는 것만으로 페르시아만 안의 원유가 호르무즈 밖으로 나오는 것은 아니다.** 마지막 문장은 항로 연결 구조에서 도출한 구분이다.

이 항로 설명은 2026-03-03 갱신된 EIA 자료를 2026-10-07 확인한 기준이다. 현재 통항 여부, 피해 규모, 복구 일정과 운임을 뜻하지 않는다.

## 선박 간 환적과 AIS 공백은 따로 확인한다

유조선끼리 바다에서 화물을 옮기는 선박 간 환적(STS, ship-to-ship transfer)은 화물을 실은 선박의 크기와 선박 추적 자료에 드러나는 모습을 바꿀 수 있다. 그러나 환적만으로 해협을 지나는 경로가 사라지지는 않는다. 해협 안쪽에서 실은 화물을 바깥 해역의 다른 선박으로 옮기려면 그 화물을 실은 선박 가운데 하나는 여전히 해협을 지나야 하므로, 환적 물량은 동원할 선박 수, 환적 위치와 안전 조건에 묶이며 차단 전 통항량과 같다고 보지 않는다(분석 기준).

- **STS의 국제 규칙:** MARPOL 부속서 I 제8장은 STS 작업에 참여하는 유조선이 승인된 STS 작업 계획을 선내에 두도록 요구한다. 당사국의 영해나 배타적 경제수역(EEZ)에서 계획한 STS는 그 국가에 미리 통보해야 한다. [MPA Shipping Circular No. 16 of 2024](https://www.mpa.gov.sg/api/media/206148d2-ec65-4b78-b604-c06a808a6ed2/sc_no_16_of_2024.pdf)
- **AIS(Automatic Identification System):** SOLAS 제V장 regulation 19는 국제 항해에 종사하는 300 총톤 이상의 모든 선박, 국제 항해를 하지 않는 500 총톤 이상의 화물선과 크기와 관계없는 모든 여객선에 AIS 탑재를 요구한다. 탑재 의무는 2002-07-01부터 2008-07-01까지 단계적으로 적용됐다(A.1106(29) Annex 3항). AIS는 선박의 식별 정보, 종류, 위치, 침로, 속력과 항해 상태 등을 육상 기지국(shore station), 다른 선박과 항공기에 자동으로 보낸다. 항해 정보 보호를 정한 국제 협정, 규칙이나 표준이 적용되는 경우를 빼고는 상시 작동해야 하며, 기국은 일부 선박의 탑재를 면제할 수 있다. [IMO, AIS transponders](https://www.imo.org/en/OurWork/Safety/Pages/AIS.aspx)
- **AIS를 끌 수 있는 경우:** IMO 결의 A.1106(29)의 운용 지침(권고)은 선박이 항해 중이거나 정박 중이면 AIS를 작동하도록 하면서도, 계속 작동하면 선박의 안전이나 보안이 위태로워진다고 선장이 판단하거나 보안 사고가 임박하면 끌 수 있게 한다. 이 경우 그 사실과 이유를 항해일지에 기록하고, 위험이 사라지면 바로 다시 켜야 한다. [IMO Resolution A.1106(29), Annex 22항](https://wwwcdn.imo.org/localresources/en/OurWork/Safety/Documents/AIS/Resolution%20A.1106(29).pdf)
- **그림자 선단 결의:** IMO 총회는 2023-12-06 결의 A.1192(33)을 채택했다. 이 결의는 제재 회피, 안전이나 환경 규제 회피, 보험 비용 회피 등을 위해 불법 운항하는 선박을 dark fleet 또는 shadow fleet로 정의하고, 그 행위의 예로 정당한 안전이나 보안상 이유 없이 AIS나 LRIT 송신을 끄거나 실제 선박 식별을 숨기는 일을 든다. 기국에는 자국 선박이 STS 작업의 시기와 장소를 기국에 통보하도록, 특히 대양 한가운데(mid-ocean)에서 환적할 때 그렇게 하도록 STS 작업 계획을 고치게 하는 방안을 검토하라고 촉구한다. 항만국에는 탐지를 피한 선박에 대해 정당한 사유가 있었는지 확인하는 초기 조사 뒤 강화 검사를 권고하고, 연안국에는 regulation 42에 따라 통보된 영해와 EEZ 안의 STS 작업과 통보 이행을 감시하라고 촉구한다. [MPA Shipping Circular No. 16 of 2024, Annex A](https://www.mpa.gov.sg/api/media/206148d2-ec65-4b78-b604-c06a808a6ed2/sc_no_16_of_2024.pdf)

A.1106(29)는 AIS를 싣지 않는 선박이나 탑재를 면제받은 선박이 있고 AIS를 탑재한 선박도 장비를 끈 상태일 수 있으므로 AIS가 주변 교통의 완전하거나 정확한 모습을 보여 주지 않을 수 있다고 경고한다. 따라서 AIS 추적 지도에 선박이 보이지 않는다는 사실로 통항이 없다고 판단하지 않는다. 반대로 A.1192(33)은 육상 기지국이나 위성이 AIS 송신을 받지 못한 사실만으로 불법 활동이 확정되지는 않으며 추가 조사의 사유가 될 수 있다고 적으므로, AIS 공백을 곧바로 불법 운항으로 단정하지도 않는다. 통항량 추정을 비교할 때는 AIS, 위성 영상, 항만 통계 중 어느 자료를 기준으로 했는지 먼저 맞춘다(분석 기준).

부분 확인(2026-11-15): IMO의 AIS 안내, 결의 A.1106(29) 원문과 결의 A.1192(33) 원문(MPA 회람 Annex A)을 대조했다. MARPOL 부속서 I 제8장은 MPA 회람의 요약으로만 확인했으며 STS 사전 통보의 시한, 적용 톤수와 발효일은 MARPOL 원문과 대조하지 못해 적지 않았다. 특정 분쟁 중의 환적 물량, 운임과 선박 가격은 검증하지 않았다.

## 비교하는 유가의 기준부터 맞춘다

유가라는 말이 같은 가격을 뜻하지는 않는다. Brent, WTI와 Dubai/Oman은 서로 다른 원유의 가격 기준이다. 개별 원유와 기준 가격의 차이에는 품질, 운송비와 지역별 수급 등이 반영된다. 따라서 두 기준의 가격 차이를 특정 해협의 위험 프리미엄 하나로 설명하지 않는다. [EIA의 가격 기준 설명](https://www.eia.gov/Todayinenergy/detail.php?id=18571)

뉴스를 비교할 때는 기준 유종, 관측일과 현물 또는 선물 여부를 먼저 맞춘다. 선물이면 계약 월물도 기록한다. 한 기준의 상승과 다른 기준의 하락을 같은 상품의 상반된 움직임으로 읽지 않기 위한 점검 절차다.

부분 확인(2026-11-04): EIA의 2014년 교육 자료에서 가격 기준과 차등 요인만 확인했다. 당시 생산량과 Brent 구성 유종을 현재 사실로 옮기지 않았으며, 현재 시세와 군사 충돌, 주가 전망은 검증하지 않았다.

## 뉴스를 판단하는 순서

다음은 위 개념을 적용하는 점검 절차다.

1. 생산 중단, 수출 경로 차단, 운송 지연 중 무엇이 발생했는지 나눈다.
2. 명목 설비 용량과 실제 운송 물량을 구분하고 자료의 기준일을 확인한다.
3. 대체 경로가 막힌 구간을 피하는지, 목적지까지 연결되는지 확인한다.
4. 재고와 추가 생산이 차질의 규모와 기간을 얼마나 보완할 수 있는지 본다.
5. 실제 공급 손실과 미래 차질에 대한 가격 반응을 구분한다.

가상의 예로 추가 생산이 가능해도 수출 경로가 막혀 있다면 증산만으로 소비지 공급이 회복되지는 않는다. 반대로 재고가 단기 공급을 보완해도 장기 차질까지 해결했다고 볼 수 없다. 유가 급등을 물가나 경기로 연결할 때는 [[Inflation|인플레이션]]과 [[News-Causal-Chain-Drill|경제 뉴스 인과관계 연습]]에서 수요 증가와 공급 차질의 차이를 함께 본다.

## 이해 확인

- 추가 생산 여력과 우회 송유관 용량이 서로 다른 이유를 설명할 수 있는가?
- 실제 공급 중단이 확인되기 전에도 유가가 오를 수 있는 이유는 무엇인가?
- 우회 항로를 평가할 때 출발지와 목적지를 함께 확인해야 하는 이유는 무엇인가?
- AIS 추적 지도에 통항 선박이 거의 보이지 않을 때 실제 물동량을 판단하려면 무엇을 더 확인해야 하는가?

## 출처

- [Benchmarks play an important role in pricing crude oil — U.S. Energy Information Administration](https://www.eia.gov/Todayinenergy/detail.php?id=18571) — 가격 기준과 차등 요인 설명, 2014-10-28
- [Oil prices and outlook — U.S. Energy Information Administration](https://www.eia.gov/energyexplained/oil-and-petroleum-products/prices-and-outlook.php)
- [What drives crude oil prices: Spot Prices — U.S. Energy Information Administration](https://www.eia.gov/finance/markets/crudeoil/spot_prices.php)
- [World Oil Transit Chokepoints — U.S. Energy Information Administration](https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/) — 2026-03-03 갱신 자료의 항로와 우회 제약
- [AIS transponders — International Maritime Organization](https://www.imo.org/en/OurWork/Safety/Pages/AIS.aspx) — SOLAS V/19의 탑재 대상, 송신 정보와 상시 작동 요건, 2026-11-15 대조
- [Resolution A.1106(29), Revised guidelines for the onboard operational use of shipborne AIS — International Maritime Organization](https://wwwcdn.imo.org/localresources/en/OurWork/Safety/Documents/AIS/Resolution%20A.1106(29).pdf) — 2015-12-02 채택, Annex 3항의 단계적 탑재 기간과 AIS 정보의 한계, 22항의 작동과 차단 조건, 2026-11-15 대조
- [Shipping Circular No. 16 of 2024 — Maritime and Port Authority of Singapore](https://www.mpa.gov.sg/api/media/206148d2-ec65-4b78-b604-c06a808a6ed2/sc_no_16_of_2024.pdf) — 2024-12-20 회람의 MARPOL 부속서 I 제8장 요약과 Annex A의 IMO 결의 A.1192(33) 원문, 2026-11-15 대조

## 관련 문서

- [[Inflation|인플레이션과 디플레이션]]
- [[News-Causal-Chain-Drill|경제 뉴스 인과관계 연습]]
- [[거시경제(Macroeconomics)|거시경제 지도]]
- [[Logistics-Control-Tower|물류 관제와 가시성]] — 해상 물류의 병목 신호와 대응
