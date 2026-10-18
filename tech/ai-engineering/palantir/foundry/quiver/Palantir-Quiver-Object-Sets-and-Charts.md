---
tags: [palantir, foundry, quiver, object-set, chart, aggregation]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Quiver 객체 집합, 탐색과 차트의 정확도"]
---

# Quiver 객체 집합, 탐색과 차트의 정확도

Object type은 객체의 schema, object는 한 인스턴스, object set은 여러 인스턴스의 집합이다. Quiver에서는 집합을 필터링하고 Ontology link를 따라 탐색한 뒤 집계나 선택으로 좁혀 간다. 집계 결과와 원본 객체를 같은 데이터로 취급하면 drill-down과 정확도 해석이 어긋난다.

## 집합 연산과 관계 탐색

Filter object set은 현재 객체 또는 linked object의 속성으로 조건을 정한다. AND/OR를 중첩할 수 있다. Set math의 union/intersection/difference는 같은 object type의 집합끼리 수행한다. 다른 타입이 목록에 나타나지 않으면 먼저 타입을 확인한다.

Switch to linked object set(search around)은 관계를 따라 도착한 객체 집합을 반환한다. 시작 객체 속성을 결과 행에 붙이는 join과 다르며, 집합 크기는 커지거나 작아질 수 있다. 양쪽 속성을 한 행에서 계산해야 하면 linked-object transform table join 또는 dataset join을 검토한다.

연결 탐색의 규모 설명에는 차이가 있다. 개별 카드/가이드는 시작 집합이 100k 미만이면 scale 제한이 없고, 100k 초과이면 linked set이 10m 미만이어야 한다고 설명한다. Best practices는 OSv1 입력 100k 미만, OSv2 결과 10m 미만으로 설명한다. 정확히 100k인 경계와 두 설명의 적용 우선순위는 이 자료만으로 확정하지 않는다. Linked-property filter에도 관련 제한이 적용된다.

Defined by property는 다른 object set의 식별자를 속성에 보관해 수동 cohort를 구성하는 특수 집합이다. Status filter는 start/end가 정의한 기간을 사용한다. Open은 선택 기간이 끝나도 열린 객체, closed는 선택 기간 중 닫힌 객체를 대상으로 설명되므로 단순 start-time 필터와 같지 않다. 미상 end와 경계 timestamp의 세부 처리는 확인이 필요하다.

## 차트 선택과 집계 결과

Bar/line/pie/categorical scatter는 속성으로 category와 segment를 나누고 집계를 표시한다. Object set을 직접 받는 차트의 선택은 Selection Object Set을 만들어 원본 객체로 drill-down할 수 있다. Transform table/dataset 기반 차트는 같은 drill-down을 지원하지 않는다.

Cross filter는 root object set과 subscribed chart를 연결해 선택이 집합과 다른 차트를 함께 필터링하게 한다. 지원 목록은 pie, bar, line, categorical scatter다. Vega 선택은 별도의 encoding-value 출력 계약을 사용한다.

수치 scatter는 객체마다 점을 그리므로 50,000개 초과에서 성능 문제가 생길 수 있다. 이는 모든 object chart의 공통 hard limit이라는 뜻은 아니다. Map도 object set을 받아 point, cluster, choropleth, line layer를 구성하고 object selection을 반환한다. Media property는 single object의 media 표시다.

## 집계의 정확도와 저장 엔진

| 집계 | Object set chart의 조건 |
|---|---|
| Unique count | approximate/exact 선택. OSv1은 exact 미지원, 결과 10k 초과 exact는 성능 저하 가능 |
| Percentile | approximate. 기본 relative error 0.1% 또는 absolute error 0.001% 중 하나를 만족한다고 설명 |
| Standard deviation/variance | 부동소수점 오차가 누적될 수 있다. 큰 평균과 작은 분산의 조합에 주의 |
| Percentile/stddev/variance | OSv1(Phonograph) 기반 object type은 미지원 |

위 정확도 설명은 transform table/dataset chart에 그대로 적용하지 않는다. Dataset categorical plot의 집계 목록은 min/max/sum/average/count/unique count이며, transform table plot은 percentile/stddev/variance도 명시한다.

Pivot grand total은 각 셀의 집계를 다시 합치는 aggregate-of-aggregates가 아니라 해당 원본 데이터 전체에 집계한다. 예를 들어 group별 평균의 평균이 전체 평균이 되는 것은 아니다.

Categorical formula는 같은 group-by key끼리 결합한다. 2D는 같은 key의 모든 3D segment에 적용되고, 3D끼리는 group/segment key가 모두 맞아야 한다. Scalar는 모든 category에 적용된다. Overlay는 차트를 겹치는 표시이며 같은 category 정렬과 단위인지 확인한다.

## 내보내기와 재사용

Export Object Set은 필터 정의를 저장해 나중에 조건에 맞는 객체를 포함할 수 있다. Export Static Object Set은 당시 반환된 객체를 기준으로 한다. 정적 집합이라고 객체 속성의 모든 과거 값까지 snapshot으로 고정한다고 확대 해석하지 않는다.

Table/list의 객체 선택, object selector와 property pop-out은 집합에서 single object/metric/time series로 전환한다. Object selector는 dashboard의 입력으로도 쓸 수 있다. Unique property values는 low-cardinality 문자열의 상위 1,000개만 사용한다. 이를 전 값의 완전한 사전으로 쓰지 않는다.

## 적용 점검

집계값을 판단에 사용할 때는 원본 집합, engine, approximate/exact, category limit과 selection의 의미를 함께 기록한다. Chart/table로 바꾼 후에도 객체 identity가 유지되는지는 출력 타입과 변환 경로로 확인한다.

## 번역 경로와 현재 영어 가이드의 차이

영어 `cards-charts`는 확보되지 않아 공식 한국어/중국어 AIP 미검증 번역본을 함께 읽었다. 번역본은 approximate unique count의 평균 오차가 1% 미만이라고 추가 설명하지만, 현재 영어 object-chart guide에는 이 수치가 없다. 이를 현재 전체 입력의 최대 오차 보장으로 채택하지 않는다.

번역본은 derived chart의 stddev/variance도 부동소수점 오차가 있다고 설명한다. 현재 영어 guide의 object-chart accuracy 제한이 transform table/dataset에 적용되지 않는다는 문장은 이런 수치 연산이 오차 없이 정확하다는 보장이 아니다. 구체적인 engine과 집계 경로를 확인한다.

## 출처

- [Palantir Quiver, Quiver / Detailed card index / Bar chart](https://www.palantir.com/docs/foundry/quiver/card-bar-chart)
- [Palantir Quiver, Quiver / Detailed card index / Categorical formula plot](https://www.palantir.com/docs/foundry/quiver/card-categorical-formula-plot)
- [Palantir Quiver, Quiver / Detailed card index / Categorical scatter plot](https://www.palantir.com/docs/foundry/quiver/card-categorical-scatter-plot)
- [Palantir Quiver, Quiver / Detailed card index / Correlation matrix](https://www.palantir.com/docs/foundry/quiver/card-correlation-matrix)
- [Palantir Quiver, Quiver / Detailed card index / Cross filter](https://www.palantir.com/docs/foundry/quiver/card-cross-filter)
- [Palantir Quiver, Quiver / Detailed card index / Defined by property](https://www.palantir.com/docs/foundry/quiver/card-defined-by-property)
- [Palantir Quiver, Quiver / Detailed card index / Filter object set](https://www.palantir.com/docs/foundry/quiver/card-filter-object-set)
- [Palantir Quiver, Quiver / Detailed card index / Heat grid](https://www.palantir.com/docs/foundry/quiver/card-heat-grid)
- [Palantir Quiver, Quiver / Detailed card index / Import saved object set](https://www.palantir.com/docs/foundry/quiver/card-import-saved-object-set)
- [Palantir Quiver, Quiver / Detailed card index / Line chart](https://www.palantir.com/docs/foundry/quiver/card-line-chart)
- [Palantir Quiver, Quiver / Detailed card index / List](https://www.palantir.com/docs/foundry/quiver/card-list)
- [Palantir Quiver, Quiver / Detailed card index / Map](https://www.palantir.com/docs/foundry/quiver/card-map)
- [Palantir Quiver, Quiver / Detailed card index / Media property](https://www.palantir.com/docs/foundry/quiver/card-media-property)
- [Palantir Quiver, Quiver / Detailed card index / Numeric aggregation](https://www.palantir.com/docs/foundry/quiver/card-numeric-aggregation)
- [Palantir Quiver, Quiver / Detailed card index / Numerical scatter plot](https://www.palantir.com/docs/foundry/quiver/card-numerical-scatter-plot)
- [Palantir Quiver, Quiver / Detailed card index / Object property](https://www.palantir.com/docs/foundry/quiver/card-object-property)
- [Palantir Quiver, Quiver / Detailed card index / Object selector](https://www.palantir.com/docs/foundry/quiver/card-object-selector)
- [Palantir Quiver, Quiver / Detailed card index / Object view](https://www.palantir.com/docs/foundry/quiver/card-object-view)
- [Palantir Quiver, Quiver / Detailed card index / Overlay chart](https://www.palantir.com/docs/foundry/quiver/card-overlay-chart)
- [Palantir Quiver, Quiver / Detailed card index / Pie chart](https://www.palantir.com/docs/foundry/quiver/card-pie-chart)
- [Palantir Quiver, Quiver / Detailed card index / Property value select parameter](https://www.palantir.com/docs/foundry/quiver/card-property-value-select-parameter)
- [Palantir Quiver, Quiver / Detailed card index / Segment formula plot](https://www.palantir.com/docs/foundry/quiver/card-segment-formula-plot)
- [Palantir Quiver, Quiver / Detailed card index / Set math](https://www.palantir.com/docs/foundry/quiver/card-set-math)
- [Palantir Quiver, Quiver / Detailed card index / Status filter](https://www.palantir.com/docs/foundry/quiver/card-status-filter)
- [Palantir Quiver, Quiver / Detailed card index / Switch to linked object set](https://www.palantir.com/docs/foundry/quiver/card-switch-to-linked-object-set)
- [Palantir Quiver, Quiver / Detailed card index / Table](https://www.palantir.com/docs/foundry/quiver/card-table)
- [Palantir Quiver, Quiver / Detailed card index / Unique property values](https://www.palantir.com/docs/foundry/quiver/card-unique-property-values)
- [Palantir Quiver, Quiver / Detailed card index / Waterfall plot](https://www.palantir.com/docs/foundry/quiver/card-waterfall-plot)
- [Palantir Quiver, Quiver / Card references / Chart](https://www.palantir.com/docs/foundry/quiver/cards-index-charts)
- [Palantir Quiver, Quiver / Card references / Object](https://www.palantir.com/docs/foundry/quiver/cards-index-objects)
- [Palantir Quiver, Quiver / Objects / Visualize objects with charts](https://www.palantir.com/docs/foundry/quiver/objects-chart-drilldown)
- [Palantir Quiver, Quiver / Objects / Filter object sets](https://www.palantir.com/docs/foundry/quiver/objects-filter)
- [Palantir Quiver, Quiver / Objects / Export an object set](https://www.palantir.com/docs/foundry/quiver/objects-import-export)
- [Palantir Quiver, Quiver / Objects / Search around to linked objects](https://www.palantir.com/docs/foundry/quiver/objects-import-linked)
- [Palantir Quiver, Quiver / Objects / Add objects](https://www.palantir.com/docs/foundry/quiver/objects-overview)
- [Palantir Quiver, Quiver / Objects / Drill down to objects and properties](https://www.palantir.com/docs/foundry/quiver/objects-property-drilldown)

- [Palantir Quiver, cards-charts (한국어 AIP 미검증 번역)](https://palantir.com/docs/kr/foundry/quiver/cards-charts/)
- [Palantir Quiver, cards-charts (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/quiver/cards-charts/)

## 관련 문서

- [[Palantir-Quiver]]
- [[Palantir-Quiver-Analysis-and-Versioning|Quiver 분석 그래프와 버전 관리]]
- [[Palantir-Quiver-Transform-Tables-and-Datasets|Quiver transform table과 dataset의 계산 계약]]
- [[Palantir-Quiver-Formula-and-Value-Contracts|Quiver 수식, 값 변환과 빈값 계약]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation|Quiver 시계열 보간, 시간창과 집계]]
- [[Palantir-Quiver-Events-Ranges-and-Reference-Profiles|Quiver 이벤트, 시간 범위와 기준 프로파일]]
- [[Palantir-Quiver-Regression-and-Forecasting|Quiver 회귀, 예측과 분포 해석]]
- [[Palantir-Quiver-Dashboards-and-Embedding|Quiver 대시보드, 임베딩과 권한 전파]]
- [[Palantir-Quiver-Functions-AIP-and-Vega|Quiver 재사용 함수, AIP와 Vega의 경계]]
