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

## 출처

- [Oil prices and outlook — U.S. Energy Information Administration](https://www.eia.gov/energyexplained/oil-and-petroleum-products/prices-and-outlook.php)
- [What drives crude oil prices: Spot Prices — U.S. Energy Information Administration](https://www.eia.gov/finance/markets/crudeoil/spot_prices.php)
- [World Oil Transit Chokepoints — U.S. Energy Information Administration](https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/) — 2026-03-03 갱신 자료의 항로와 우회 제약

## 관련 문서

- [[Inflation|인플레이션과 디플레이션]]
- [[News-Causal-Chain-Drill|경제 뉴스 인과관계 연습]]
- [[거시경제(Macroeconomics)|거시경제 지도]]
