---
tags: [palantir, foundry, quiver, time-series, interpolation, aggregation]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Quiver 시계열 보간, 시간창과 집계"]
---

# Quiver 시계열 보간, 시간창과 집계

시계열은 timestamp와 value의 집합이며 화면에 그린 선과 실제 계산에 사용한 점은 다를 수 있다. Quiver에서는 입력 데이터, interpolation, 조회 범위와 aggregation을 함께 정해야 수치 의미를 재현할 수 있다.

## 입력 경로와 표시 범위

Time series property가 주 경로이며 sync를 직접 읽거나 Python function-backed series를 추가할 수도 있다. Object set/transform table의 timestamp/value 열을 tabular series로 바꿀 수 있지만, 같은 timestamp에 여러 점이 있으면 첫 점만 plot한다. 시간 속성으로 bucket한 categorical chart를 series로 바꾸는 경로도 있다.

Chart는 plot을 담는 container, plot은 개별 series 표시, axis는 view range다. Plot은 한 chart에서만 보이지만 axes는 여러 chart가 공유할 수 있다. Time axis는 기본 연결되므로 pan/zoom이 다른 chart에도 전파된다. 같은 unit의 plot은 같은 chart의 value axis를 공유한다. Unit override와 axis merge는 표시/해석에 영향을 주므로 실제 단위 변환이라고 가정하지 않는다.

기본 표시는 series당 1,000 bucket이다. Tooltip의 min/max/average는 bucket 내부의 값일 수 있으며 raw tick 한 점으로 읽지 않는다. Categorical/tabular/event-indicator/code-function/forecast 계열 point set은 bucketing 없이 전 점을 재계산하며 25,000-point 제한이 명시된다. 이를 모든 time-series 카드의 공통 제한으로 확대하지 않는다.

## Interpolation은 계산 입력이다

Source 상속은 Ontology series formatting 또는 upstream plot 설정을 따른다. Before/after는 첫 점 이전과 마지막 점 이후의 nearest/none, internal은 linear/nearest/next/previous/none을 선택한다. Enum은 linear internal interpolation을 지원하지 않는다.

여러 series의 formula/filter/linear aggregation은 timestamp를 결합할 때 보간을 사용한다. 보간이 없는 series가 있으면 그 series들의 timestamp 교집합이 계산점을 제한한다. 모두 보간 가능하면 입력에 존재하는 timestamp 합집합에서 계산할 수 있다. 선이 threshold와 교차한 시각에 새 관측점이 저절로 생기는 것은 아니다.

Combine time series는 예외다. 실제 같은 timestamp에 존재하는 입력 점만 union operation으로 합치며 interpolation으로 없는 점을 만들지 않는다. Inherit from source 설정은 첫 입력의 interpolation을 결과에 붙인다. 입력 정렬과 결과 표시 설정도 확인한다.

Linear aggregation은 같은 시각의 여러 series를 집계한다. Include partial aggregates가 꺼져 있으면 필요한 값이 없는 시각은 제외할 수 있고, 켜면 존재하거나 보간된 값들로 partial aggregate를 만든다. Sample은 지정한 일정 간격으로 resampling하며 interpolation을 사용해 값을 생성한다. 새 점이 새 측정을 뜻하지는 않는다.

## 집계의 차원과 시간창

| 연산 | 집계 기준 |
|---|---|
| Rolling | 각 입력점의 과거 window부터 현재점 포함. 보통 입력점마다 결과 |
| Periodic | 연속된 고정 duration window별 결과. 데이터가 없는 window는 생략 |
| Cumulative | 시작부터 현재점 포함. 개별 카드의 기본은 view range 내 누적 |
| Numeric aggregation | 전체 입력 series의 한 window를 scalar로 반환. 특정 기간이면 먼저 filter |
| Linear aggregation | 같은 시각의 여러 series를 하나로 결합 |
| Event/segment statistics | interval마다 결과 하나. 시작점 포함, 끝점 제외 |

Single-series aggregate는 sum/mean/stddev/min/max/difference/relative difference/product/count/first/last와 time-weighted average/integral을 제공한다. Multi-series는 sum/mean/stddev/min/max/product를 제공하며 time-weighted aggregate는 지원하지 않는다. Duration/rate change는 interval series의 시간 정밀도(보통 millisecond)를 따른다.

Cumulative와 standalone integral의 기본 범위는 다르다. Integral은 기본 전체 series이고 view-range-only를 켤 수 있다. Zoom 변경이 결과를 바꾸는지는 카드 옵션에서 확인한다. Derivative 기본 rate 단위는 second이며 다른 시간 단위로 바꾸면 y 단위/척도 해석을 확인한다.

## 시간 가중 평균과 적분

점 평균은 각 점을 같은 비중으로 처리한다. Time-weighted average는 값이 지속된 시간으로 가중하고, integral은 면적을 계산한다. Irregular sampling에서는 두 평균이 다를 수 있다.

Integration method의 linear는 인접점 사이 trapezoid, LHS는 앞점 값을 다음 점까지 유지, RHS는 뒷점 값을 이전 점까지 유지한다. Bounds interpolation 기본 None은 window 안의 점들 사이 면적만 포함해 경계와 최근 내부점 사이 gap을 무시한다. Linear/nearest/previous/next를 고르면 경계값을 계산해 그 구간을 포함한다. 경계 gap과 실제 관측 부재를 숨기지 않는다.

Filter의 Gap은 조건에 맞지 않는 부분을 gap으로 남긴다. Continuous는 남은 값 사이를 기본 linear 등의 설정으로 이어준다. Gap을 없앤 시각적 연속성을 관측의 연속성으로 해석하지 않는다. Coalesce series는 첫 non-null/non-error series를 선택하는 fallback이며 timestamp별 union과 다르다.

DSP filter는 Butterworth/Chebyshev/inverse Chebyshev와 low/high/bandpass/bandstop을 제공한다. 노이즈를 줄이는 변환과 원본 보존, 지연/왜곡의 판단을 분리한다. 상세 응답 계수와 경계 처리까지 짧은 reference에서 보장되지는 않는다.

## 비용과 재현성

큰 series는 explicit time filter를 upstream에 두어 불필요한 index hydration을 줄이고 sampling을 검토한다. Sparkline full extent는 셀별 큰 query가 될 수 있다. Streaming은 기본 analysis-wide cache 갱신으로 metric까지 업데이트하지만 비용이 커질 수 있다. Individual-axis streaming과 rolling/growing/fixed view range의 차이를 구분한다.

공유 분석에는 source, timezone, unit, query/filter 범위, sampling, interpolation과 view-range 종속 여부를 남긴다. Display range와 계산 범위가 같다는 가정은 카드별로 확인한다. 실제 수치 실행과 이미지 수식은 이 문서에서 검증하지 않았다.

## 보존된 categorical-to-series 경로

영어 `timeseries-create`는 확보되지 않아 공식 한국어/중국어 AIP 미검증 번역본을 대조했다. 이 경로는 x-axis가 시간이고 표시 data series가 하나인 bar/line/categorical formula chart를 series로 바꾸는 조건을 설명한다. 시간 group-by의 bucket 크기가 결과 세분도를 결정하며, 원래 object set 필터가 바뀌면 파생 series도 바뀐다. 현재 영어 Add time series guide의 categorical-series 설명과 함께 사용하되, 번역 UI 명칭을 최신 editor 메뉴로 보장하지 않는다.

## 출처

- [Palantir Quiver, Quiver / Detailed card index / Backing object from time series](https://www.palantir.com/docs/foundry/quiver/card-backing-object-from-time-series)
- [Palantir Quiver, Quiver / Detailed card index / Coalesce time series](https://www.palantir.com/docs/foundry/quiver/card-coalesce-time-series)
- [Palantir Quiver, Quiver / Detailed card index / Combine time series](https://www.palantir.com/docs/foundry/quiver/card-combine-time-series)
- [Palantir Quiver, Quiver / Detailed card index / Cumulative aggregate](https://www.palantir.com/docs/foundry/quiver/card-cumulative-aggregate)
- [Palantir Quiver, Quiver / Detailed card index / Custom plot (transform table)](https://www.palantir.com/docs/foundry/quiver/card-custom-plot)
- [Palantir Quiver, Quiver / Detailed card index / Derivative](https://www.palantir.com/docs/foundry/quiver/card-derivative)
- [Palantir Quiver, Quiver / Detailed card index / DSP filter](https://www.palantir.com/docs/foundry/quiver/card-dsp-filter)
- [Palantir Quiver, Quiver / Detailed card index / Enum value at time](https://www.palantir.com/docs/foundry/quiver/card-enum-value-at-time)
- [Palantir Quiver, Quiver / Detailed card index / Filter time series](https://www.palantir.com/docs/foundry/quiver/card-filter-time-series)
- [Palantir Quiver, Quiver / Detailed card index / Grouped time series plot](https://www.palantir.com/docs/foundry/quiver/card-grouped-time-series-plot)
- [Palantir Quiver, Quiver / Detailed card index / Integral](https://www.palantir.com/docs/foundry/quiver/card-integral)
- [Palantir Quiver, Quiver / Detailed card index / Latest value for enum time series](https://www.palantir.com/docs/foundry/quiver/card-latest-value-for-enum-time-series)
- [Palantir Quiver, Quiver / Detailed card index / Linear aggregation](https://www.palantir.com/docs/foundry/quiver/card-linear-aggregation)
- [Palantir Quiver, Quiver / Detailed card index / Multi chart time series](https://www.palantir.com/docs/foundry/quiver/card-multi-chart-time-series)
- [Palantir Quiver, Quiver / Detailed card index / Periodic aggregate](https://www.palantir.com/docs/foundry/quiver/card-periodic-aggregate)
- [Palantir Quiver, Quiver / Detailed card index / Rolling aggregate](https://www.palantir.com/docs/foundry/quiver/card-rolling-aggregate)
- [Palantir Quiver, Quiver / Detailed card index / Sample](https://www.palantir.com/docs/foundry/quiver/card-sample)
- [Palantir Quiver, Quiver / Detailed card index / Tabular time series](https://www.palantir.com/docs/foundry/quiver/card-tabular-time-series)
- [Palantir Quiver, Quiver / Detailed card index / Time series end date](https://www.palantir.com/docs/foundry/quiver/card-time-series-end-date)
- [Palantir Quiver, Quiver / Detailed card index / Time series formula](https://www.palantir.com/docs/foundry/quiver/card-time-series-formula)
- [Palantir Quiver, Quiver / Detailed card index / Time series numeric aggregation](https://www.palantir.com/docs/foundry/quiver/card-time-series-numeric-aggregation)
- [Palantir Quiver, Quiver / Detailed card index / Time series property](https://www.palantir.com/docs/foundry/quiver/card-time-series-property)
- [Palantir Quiver, Quiver / Detailed card index / Time series start date](https://www.palantir.com/docs/foundry/quiver/card-time-series-start-date)
- [Palantir Quiver, Quiver / Detailed card index / Time series sync](https://www.palantir.com/docs/foundry/quiver/card-time-series-sync)
- [Palantir Quiver, Quiver / Detailed card index / Time series unit](https://www.palantir.com/docs/foundry/quiver/card-time-series-unit)
- [Palantir Quiver, Quiver / Detailed card index / Value at time](https://www.palantir.com/docs/foundry/quiver/card-value-at-time)
- [Palantir Quiver, Quiver / Card references / Time series](https://www.palantir.com/docs/foundry/quiver/cards-index-time-series)
- [Palantir Quiver, Quiver / Time series / Interpolation](https://www.palantir.com/docs/foundry/quiver/cards-interpolation-usage)
- [Palantir Quiver, Quiver / Transform references / Time series operations](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-timeseries-operations)
- [Palantir Quiver, Quiver / Time series / Time series aggregations](https://www.palantir.com/docs/foundry/quiver/timeseries-aggregations)
- [Palantir Quiver, Quiver / Time series / Batch analyze time series](https://www.palantir.com/docs/foundry/quiver/timeseries-batch-analyze)
- [Palantir Quiver, Quiver / Time series / Time series metrics](https://www.palantir.com/docs/foundry/quiver/timeseries-metric-cards)
- [Palantir Quiver, Quiver / Time series / Add time series](https://www.palantir.com/docs/foundry/quiver/timeseries-overview)
- [Palantir Quiver, Quiver / Time series / Transform time series](https://www.palantir.com/docs/foundry/quiver/timeseries-transform)
- [Palantir Quiver, Quiver / Time series / Visualize time series](https://www.palantir.com/docs/foundry/quiver/timeseries-visualize)

- [Palantir Quiver, timeseries-create (한국어 AIP 미검증 번역)](https://palantir.com/docs/kr/foundry/quiver/timeseries-create/)
- [Palantir Quiver, timeseries-create (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/quiver/timeseries-create/)

## 관련 문서

- [[Palantir-Quiver]]
- [[Palantir-Quiver-Analysis-and-Versioning|Quiver 분석 그래프와 버전 관리]]
- [[Palantir-Quiver-Object-Sets-and-Charts|Quiver 객체 집합, 탐색과 차트의 정확도]]
- [[Palantir-Quiver-Transform-Tables-and-Datasets|Quiver transform table과 dataset의 계산 계약]]
- [[Palantir-Quiver-Formula-and-Value-Contracts|Quiver 수식, 값 변환과 빈값 계약]]
- [[Palantir-Quiver-Events-Ranges-and-Reference-Profiles|Quiver 이벤트, 시간 범위와 기준 프로파일]]
- [[Palantir-Quiver-Regression-and-Forecasting|Quiver 회귀, 예측과 분포 해석]]
- [[Palantir-Quiver-Dashboards-and-Embedding|Quiver 대시보드, 임베딩과 권한 전파]]
- [[Palantir-Quiver-Functions-AIP-and-Vega|Quiver 재사용 함수, AIP와 Vega의 경계]]
