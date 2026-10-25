---
tags: [econ, investing, technical-analysis, candlestick, validation]
status: done
category: "Economics"
aliases: ["캔들과 차트 패턴의 검증", "Technical Pattern Validation"]
---

# 캔들과 차트 패턴의 검증

차트 패턴의 이름, 패턴이 완성됐다는 판정, 매매 후 수익은 서로 다른 정보다. 모양을 알아보는 능력만으로 비용을 뺀 투자 성과를 입증할 수 없다. 이 문서는 2026-10-22 확인한 거래소 교육 자료와 연구 초록에서 출발해 판독과 성과 검증의 경계를 정리하고, 뒤에 더한 절은 절마다 확인일과 자료를 밝힌다.

## 캔들에 들어 있는 정보

캔들 하나는 정해진 구간의 시가, 고가, 저가와 종가를 표현한다. 몸통은 시가와 종가 사이, 꼬리는 그 구간의 고가와 저가를 나타낸다. 상승과 하락의 색상은 프로그램 설정에 따라 달라지므로 색만으로 판독하지 않는다.

시간 기반 차트는 일정 시간이 지날 때, 틱 차트는 정해진 거래 횟수가 쌓일 때 새 봉을 만든다. 같은 자산도 5분봉과 일봉, 틱 차트에서 보이는 모양은 달라질 수 있으므로 비교할 때 봉의 생성 기준부터 맞춘다.

## 반전 패턴의 모양과 확인 조건

다음은 CME 교육 자료에 나온 판독 관행이다. 미래 가격을 보장하는 규칙이나 검증된 승률표가 아니다.

| 패턴 | 관찰하는 구조 | 확인에서 구분할 것 |
|---|---|---|
| 머리어깨 | 상승 흐름에서 고점, 더 높은 고점, 첫 고점과 비슷한 고점이 이어짐 | 어깨와 머리 사이 저점을 잇는 목선 아래로 내려가는 것을 통상적인 반전 확인 신호로 본다 |
| 이중 바닥 | 저점 뒤 반등하고, 다시 비슷한 저점을 만든 뒤 상승 | 두 저점 사이의 고점을 넘는지 확인한다. 저점 두 개만 보고 완성으로 단정하지 않는다 |
| 삼중 천정 | 비슷한 수준의 고점을 세 번 형성 | 고점 사이의 저점 아래로 내려가는지 확인한다. 두 번째 고점에서 끝날지 세 번째까지 갈지는 사전에 확정되지 않는다 |

패턴은 진행 중일 때보다 지나간 차트에서 찾기 쉽다. 검증에서는 패턴을 확정할 수 있었던 시점과 실제 주문 가능 시점을 분리한다. 사후에 완성된 모양을 과거 시점의 신호로 사용하면 [[Backtesting-Pitfalls|미래 정보 누수]]가 된다.

### 앞선 추세에 따라 이름이 바뀌는 캔들

CandleCharts의 분류에서 몸통이 작고 한쪽 꼬리가 긴 캔들은 모양이 같아도 앞선 추세에 따라 다른 이름과 방향 해석을 받는다. 아래 표는 2026-10-25 CandleCharts 교육 페이지와 Fidelity 교육 자료로 대조한 판독 관행이며, 예측 규칙이나 승률이 아니다.

| 모양 | 하락 추세 뒤 | 상승 추세 뒤 |
|---|---|---|
| 작은 몸통이 고가와 저가 범위의 위쪽에 있고, 아래꼬리가 길며 위꼬리는 거의 없음 | 해머(Hammer), 강세 해석 | 교수형(Hanging Man), 약세 해석 |
| 작은 몸통이 고가와 저가 범위의 아래쪽에 있고, 위꼬리가 길며 아래꼬리는 거의 없음 | 역해머(Inverted Hammer), 강세 해석 | 유성형(Shooting Star), 약세 해석 |

모양만으로 판정을 끝내지 않는다. CandleCharts에서 표의 네 캔들 중 캔들별 확인 문장이 있는 것은 교수형과 역해머뿐이다. 교수형은 다음 봉이 교수형 몸통 아래에서 시작하는 약세 확인을 요구하고, 몸통 아래에서 마감하면 더 나은 확인으로 본다. 역해머는 다음 봉이 역해머 종가보다 높게 시작하고 특히 높게 마감하는 확인이 있을 때 강세 반전 신호로 본다. 해머와 유성형에 대해서는 캔들별 확인 문장을 찾지 못했고, 확인한 자료 중에는 캔들 패턴으로 보이는 모양이 완성되고 특정 방향의 돌파로 활성화되기 전에는 행동하지 않도록 주의하라는 Fidelity 웨비나 자료의 일반 원칙만 남는다. 백테스트에서는 신호로 쓸 수 있는 시점을 해당 캔들의 마감이 아니라 정해 둔 확인 조건을 판정할 수 있는 시점으로 둔다.

세부 기준도 자료마다 다르다. CandleCharts는 해머와 교수형의 몸통 색을 흰색과 검은색 모두 허용하고, 아래꼬리는 전형적인 해머에서 몸통 높이의 2배 이상, 교수형에서 원칙적으로 2배에서 3배로 제시한다. Fidelity 웨비나 자료는 두 캔들을 몸통 색으로 구분한다. 확인한 자료 중 앞선 추세를 판정하는 기간이나 수치 기준을 정한 곳은 없으므로, 검증 전에 추세 판정 규칙, 꼬리 비율, 색 조건과 확인 규칙을 고정한다.

강세, 약세라는 분류도 검증된 방향이 아니다. Fidelity의 ETP 차트 도움말은 Recognia가 식별하는 이벤트 중 해머와 역해머를 강세, 교수형과 유성형을 약세로 나열한다. Fidelity의 2020년 웨비나 자료는 기술적 분석 교재를 인용해 교수형이 어느 방향으로든 무작위로 돌파되고 약간의 상승 편향이 있다고 설명한다. 해당 슬라이드는 표본, 기간과 성공 기준을 제시하지 않으므로 어느 쪽도 아래 성과 검증 질문을 거치기 전까지 매매 근거로 쓰지 않는다.

## 이동평균 교차와 투자 주체의 의도를 구분한다

단순이동평균(SMA)은 정한 기간의 가격을 같은 가중치로 평균한 값이다. 기간이 길수록 가격 변동을 더 평활하게 만들지만 최근 변화에 대한 반응은 늦어진다. 짧은 기간의 이동평균이 긴 기간의 이동평균 아래로 교차하는 것을 데드크로스라고 부르며, 50일선과 200일선 조합이 대표적인 예다. 비교할 때 기간뿐 아니라 SMA인지 최근 가격에 더 큰 가중치를 주는 EMA인지도 맞춘다.

이 계산의 입력은 가격이므로 교차만으로 기관이나 외국인이 투자 관점을 바꿨다거나 반대매매가 발생했다고 판정할 수는 없다. 이는 지표의 입력에서 도출되는 해석 한계다. 투자 주체별 거래나 강제 청산에 관한 주장은 별도의 거래 자료와 사건 근거가 필요하다.

실무 검토에서는 신호가 완성된 시점, 진입과 청산 조건, 비용과 재진입 규칙을 먼저 고정한다. 골든크로스나 데드크로스 하나로 기계적으로 매매하지 않으며, 장기 보유와 추세 매매를 사후에 바꿔 붙여 성과를 설명하지 않는다. 교차의 정의와 매매 판단의 한계는 2026-10-24 Fidelity 자료와 대조했고, 특정 시장의 예측력이나 수익성은 검증하지 않았다.

## 통계적 정보와 매매 수익을 구분한다

Lo, Mamaysky와 Wang의 연구는 차트 모양을 주관적으로 고르는 문제를 줄이기 위해 비모수 커널 회귀로 패턴 인식을 자동화했다. 미국 주식의 과거 자료에서 특정 패턴을 조건으로 한 수익률 분포와 무조건부 분포를 비교했고, 일부 지표가 추가 정보를 제공한다고 보고했다.

이 결과만으로 임의의 패턴 요약표 전체, 별점별 승률, 현재 시장의 비용 차감 후 수익성을 입증할 수는 없다. 이번에 확인한 연구 범위는 공식 초록이며 개별 패턴의 상세 추정치나 매매 전략을 재현하지 않았다.

성과를 평가할 때는 다음을 별도 질문으로 둔다. 아래는 SEC의 성과 표시 점검과 [[Backtesting-Pitfalls|백테스트 검증 원칙]]을 차트 규칙에 적용한 절차다.

1. 어떤 시장, 종목과 봉 단위에서 어떤 조건으로 패턴을 인정하는가.
2. 신호가 완성된 뒤 언제 진입하고, 언제 청산하며, 실패를 어떻게 정의하는가.
3. 수수료와 체결 비용을 빼고도 비교 기준보다 나은가.
4. 좋은 사례뿐 아니라 실패 사례와 상승장, 하락장 구간을 함께 포함했는가.
5. 규칙을 만들 때 쓰지 않은 자료에서도 결과가 유지되는가. 시도한 규칙 수는 얼마인가.
6. 제시된 성과가 백테스트인지 실제 운용 기록인지 구분했는가.

별점에 표본, 기간, 성공의 정의와 계산법이 없으면 성공 확률로 환산하지 않는다. 백테스트는 가상 성과이며 과거의 실제 수익도 미래 수익을 보장하지 않는다.

## 후속 학습 범위

여러 이름을 암기하기보다 정의와 검증 상태를 분리해 학습한다. 이 문서에서 구조와 확인 조건을 대조한 것은 머리어깨, 이중 바닥, 삼중 천정, 교수형, 역해머이고, 해머와 유성형은 모양과 추세 조건만 대조했다. 네 캔들 모두 예측력과 비용 차감 후 성과는 검증하지 않았다. 다음 이름들은 추가 학습 후보이며 정의, 분류와 예측력을 검증했다는 뜻이 아니다.

- 캔들 후보: 상승 장악형, 하락 장악형, 샛별형, 석별형.
- 여러 봉에 걸친 패턴 후보: 역 머리어깨, 울프 웨이브, 상승 깃발, 하락 삼각형, 하락 깃발.

각 후보는 공개된 원저자 자료나 거래소 교육 자료에서 정의를 확인한 뒤 동일한 봉 단위와 진입, 청산 규칙으로 검토한다. 이번 정리는 위에 나온 패턴 전체의 효과 검증이나 매수, 매도 신호 채택이 아니다.

## 출처

- [Fidelity, Simple Moving Average (SMA)](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/sma)
- [Moving average stock signal — Fidelity](https://www.fidelity.com/viewpoints/active-investor/moving-averages) — 이동평균 교차의 정의와 기계적 매매의 한계만 확인, 본문의 시황 전망은 반영하지 않음
- [CME Group, Technical Analysis, Chart Types: candlestick, line, bar](https://www.cmegroup.com/education/courses/technical-analysis/chart-types-candlestick-line-bar)
- [CME Group, Technical Analysis, Technical Patterns: Reversals](https://www.cmegroup.com/education/courses/technical-analysis/technical-patterns-reversals)
- [Foundations of Technical Analysis: Computational Algorithms, Statistical Inference, and Empirical Implementation — NBER, Andrew W. Lo, Harry Mamaysky, Jiang Wang](https://www.nber.org/papers/w7613) — 공식 검색 반환의 초록 확인. 페이지 직접 조회는 403으로 실패했으며 논문 전체를 검증하지 않았다.
- [Investor Bulletin: Performance Claims — SEC, Investor.gov](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-47)
- [CandleCharts, Candlestick Patterns](https://candlecharts.com/candlestick-training/candlestick-patterns) — 해머, 교수형, 역해머, 유성형의 모양, 추세 조건과 확인 문장만 확인했으며 페이지에 효과 통계는 없음
- [Identifying Chart Patterns with Technical Analysis — Fidelity](https://www.fidelity.com/bin-public/060_www_fidelity_com/documents/learning-center/Idenitfying-Chart-Patterns.pdf) — 2020년 웨비나 자료의 캔들 일반 설명과 교수형, 해머, 유성형, 역해머 슬라이드만 확인. 성과 문장은 교재 인용이며 표본과 기간은 제시되지 않음
- [Fidelity, ETP Advanced Chart & Technical Analysis Help](https://www.fidelity.com/help/research/etf/advancedChart.shtml) — Recognia 분류의 강세, 약세 이벤트 목록만 확인

## 관련 문서

- [[Backtesting-Pitfalls|백테스트의 함정]]
- [[Behavioral-Biases-Risk|행동 편향과 리스크 관리]]
- [[Investment-Strategies|투자 전략]]
