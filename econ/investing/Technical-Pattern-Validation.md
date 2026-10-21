---
tags: [econ, investing, technical-analysis, candlestick, validation]
status: done
category: "Economics"
aliases: ["캔들과 차트 패턴의 검증", "Technical Pattern Validation"]
---

# 캔들과 차트 패턴의 검증

차트 패턴의 이름, 패턴이 완성됐다는 판정, 매매 후 수익은 서로 다른 정보다. 모양을 알아보는 능력만으로 비용을 뺀 투자 성과를 입증할 수 없다. 이 문서는 2026-10-22 확인한 거래소 교육 자료와 연구 초록을 바탕으로 판독과 성과 검증의 경계를 정리한다.

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

여러 이름을 암기하기보다 정의와 검증 상태를 분리해 학습한다. 이 문서에서 구조와 확인 조건을 대조한 것은 위 표의 세 패턴이다. 다음 이름들은 추가 학습 후보이며 정의, 분류와 예측력을 검증했다는 뜻이 아니다.

- 캔들 후보: 해머, 상승 장악형, 유성형, 하락 장악형, 샛별형, 석별형.
- 여러 봉에 걸친 패턴 후보: 역 머리어깨, 울프 웨이브, 상승 깃발, 하락 삼각형, 하락 깃발.

각 후보는 공개된 원저자 자료나 거래소 교육 자료에서 정의를 확인한 뒤 동일한 봉 단위와 진입, 청산 규칙으로 검토한다. 이번 정리는 14개 패턴 전체의 효과 검증이나 매수, 매도 신호 채택이 아니다.

## 출처

- [CME Group, Technical Analysis, Chart Types: candlestick, line, bar](https://www.cmegroup.com/education/courses/technical-analysis/chart-types-candlestick-line-bar)
- [CME Group, Technical Analysis, Technical Patterns: Reversals](https://www.cmegroup.com/education/courses/technical-analysis/technical-patterns-reversals)
- [Foundations of Technical Analysis: Computational Algorithms, Statistical Inference, and Empirical Implementation — NBER, Andrew W. Lo, Harry Mamaysky, Jiang Wang](https://www.nber.org/papers/w7613) — 공식 검색 반환의 초록 확인. 페이지 직접 조회는 403으로 실패했으며 논문 전체를 검증하지 않았다.
- [Investor Bulletin: Performance Claims — SEC, Investor.gov](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-47)

## 관련 문서

- [[Backtesting-Pitfalls|백테스트의 함정]]
- [[Behavioral-Biases-Risk|행동 편향과 리스크 관리]]
- [[Investment-Strategies|투자 전략]]
