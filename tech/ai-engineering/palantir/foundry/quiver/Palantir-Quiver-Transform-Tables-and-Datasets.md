---
tags: [palantir, foundry, quiver, transform-table, dataset, join]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Quiver transform table과 dataset의 계산 계약"]
---

# Quiver transform table과 dataset의 계산 계약

Transform table은 브라우저에서 유연한 가공, 직접 값 편집과 batch time series 분석을 수행하는 local table이다. Dataset은 backend 계산을 사용해 큰 규모의 join과 aggregation을 수행한다. 두 경로를 바꾸면 규모뿐 아니라 타입, identity와 결과 의미도 달라질 수 있다.

## 실행 위치와 행 수

| 경로 | 계산과 제약 |
|---|---|
| Transform table | 최대 50,000행. 생성과 join 이후에도 제한 적용. 일부 가이드는 객체 입력을 50k 미만으로 표현 |
| Manual entry transform table | 최대 5,000행. string/number/Boolean/time/time series를 직접 입력 |
| Dataset | transform table의 50k 제한을 사용하지 않는 backend 계산. Time series 연산/직접 값 편집과 기능 동등하지 않음 |

Transform table의 각 transformation은 순서대로 계산한다. 일반적으로 보이는 page의 행만 계산하지만 chart, aggregation과 join은 전체 table 계산이 필요할 수 있다. Sparkline 셀 하나도 독립 time-series query로 계산/과금된다. 시계열 batch는 50k hard limit보다 훨씬 전에 느려질 수 있어 가이드는 1,000행 이하를 권한다.

Dataset에서 transform table로 전환할 수 있지만 반대 전환은 지원하지 않는다. Backend를 사용한다는 이유로 모든 연산이 무제한이거나 같은 정확도라고 가정하지 않는다.

## 입력을 바꿀 때 보존되는 것

Object set 입력은 객체당 한 행과 primary key를 만들고 prominent property를 기본 표시한다. Chart나 pivot 입력은 표시된 category/집계 결과를 가져오며 underlying object 연결을 잃는다. Time series plot은 tick 또는 sampled bucket 행으로, time series chart는 plot 하나당 한 행으로 변환한다.

Sampled series table에는 bucket의 earliest/latest, min/max, mean과 count를 표시한다. Unsampled는 primary key/timestamp/value를 가진 raw tick이다. Timezone 표시는 기본 UTC이며 column에서 바꿀 수 있다. 표시 형식 변경을 timestamp 값 변경으로 해석하지 않는다.

Object set dataset은 materialization export dataset을 우선 사용하고 없으면 backing datasource dataset을 시도한다. Materialization의 반영 시점과 datasource가 포함하는 edit 범위를 확인해야 하며, 현재 객체 조회 결과와 자동으로 동일하다고 간주하지 않는다. Foundry dataset 직접 입력은 Beta이며 enrollment에 따라 다르다.

## Join, group과 identity

Linked-object join은 Ontology relation을 사용한 inner join이다. 결과 primary key는 양쪽 key를 합치며, one-to-many는 행을 늘릴 수 있다. One-to-one/many-to-one이라는 schema 관계도 미매칭 inner 행까지 보존한다는 뜻은 아니다.

일반 transform table join은 match all/any와 여러 column pair, retain column과 prefix를 구성한다. 가이드는 left/inner/full, 개별 Join to transform table 카드는 left/inner/right를 열거한다. 지원 집합을 임의로 합치지 말고 실제 editor/버전에서 확인한다. Dataset join의 개별 계약은 left/inner/right다.

Cross join은 양쪽 모든 행 조합을 만든다. Group by는 key별 한 행과 나머지 열의 array를 만들고, Joined group by는 group array를 원래 행에 붙인다. 집계가 필요하면 array aggregation을 추가한다. Array가 되었다고 평균이나 합이 자동 계산된 것은 아니다.

Union은 기본적으로 column ID로 열을 맞춘다. 표시 이름을 rename해도 column ID는 바뀌지 않는다. 수동 mapping은 ID/타입 호환 문제를 조정할 수 있다. Manual entry는 기본 random key를 만들며 사용자 지정 key도 가능하다. Row selector의 key 선택과 0부터 시작하는 row index 선택은 재정렬/갱신에 대한 의미가 다르다.

## 타입과 피벗의 차이

Geoshape/vector/struct/byte/array property는 transform table에서 문자열로 취급된다. Ontology array `[a,b]`와 native transform array를 구분한다. 문자열 split으로 array를 만들 수 있어도 원래 복합 schema를 자동 복원하는 것은 아니다.

Object pivot은 array 값을 개별 dimension으로 펼치지만 transform pivot은 stringified array 전체를 한 값으로 취급한다. Transform pivot은 no-value dimension을 표시하고 object pivot은 이를 생략한다. Struct/vector bucketing도 transform 경로의 문자열화 후에는 같지 않다.

Segmented category limit의 정렬도 다르다. Object chart는 unsegmented series로 category를 결정하고 transform table chart는 category별 segment 합을 정렬하므로 같은 입력이어도 화면의 category가 달라질 수 있다.

## SQL과 expression 경계

Ontology SQL(Beta)은 object set과 다른 Ontology SQL 결과를 받아 select/filter/join/aggregate하고 transform table로 바꿀 수 있다. Object set SQL의 권장 경로다. Dataset SQL은 SparkSQL syntax/functions/operators를 사용하며 Ontology SQL이 지원하지 않는 경우의 fallback이다. 두 dialect를 같은 것으로 취급하지 않는다.

Expression은 Contour expression language로 열 추가/교체, filter, aggregate와 window 연산을 수행하고 dataset을 반환한다. Quiver의 scalar/time-series formula language와 다르다. AIP가 생성한 SQL/expression도 실제 입력, null/중복과 결과 행 수를 검토해야 한다.

## 적용 점검

가공 경로를 선택할 때 입력 규모, backend/browser 위치, time-series 필요성, edit 반영 시점과 identity 보존을 함께 본다. Table의 page만 정상 표시된 사실로 전체 join/aggregate가 검증되었다고 결론 내리지 않는다. 이 문서는 런타임 실행을 검증하지 않았다.

## 출처

- [Palantir Quiver, Quiver / Detailed card index / Categorical plot from dataset](https://www.palantir.com/docs/foundry/quiver/card-categorical-plot-dataset)
- [Palantir Quiver, Quiver / Detailed card index / Create values](https://www.palantir.com/docs/foundry/quiver/card-create-values)
- [Palantir Quiver, Quiver / Detailed card index / Cross join transform tables](https://www.palantir.com/docs/foundry/quiver/card-cross-join-transform-tables)
- [Palantir Quiver, Quiver / Detailed card index / Dataset SQL](https://www.palantir.com/docs/foundry/quiver/card-dataset-sql)
- [Palantir Quiver, Quiver / Detailed card index / Edit values](https://www.palantir.com/docs/foundry/quiver/card-edit-values)
- [Palantir Quiver, Quiver / Detailed card index / Expression](https://www.palantir.com/docs/foundry/quiver/card-expression)
- [Palantir Quiver, Quiver / Detailed card index / Filter dataset](https://www.palantir.com/docs/foundry/quiver/card-filter-dataset)
- [Palantir Quiver, Quiver / Detailed card index / Filter transform table](https://www.palantir.com/docs/foundry/quiver/card-filter-transform-table)
- [Palantir Quiver, Quiver / Detailed card index / Foundry dataset](https://www.palantir.com/docs/foundry/quiver/card-foundry-dataset-beta)
- [Palantir Quiver, Quiver / Detailed card index / Group by](https://www.palantir.com/docs/foundry/quiver/card-group-by)
- [Palantir Quiver, Quiver / Detailed card index / Join datasets](https://www.palantir.com/docs/foundry/quiver/card-join-datasets)
- [Palantir Quiver, Quiver / Detailed card index / Join to linked objects](https://www.palantir.com/docs/foundry/quiver/card-join-to-linked-objects)
- [Palantir Quiver, Quiver / Detailed card index / Join to transform table](https://www.palantir.com/docs/foundry/quiver/card-join-to-transform-table)
- [Palantir Quiver, Quiver / Detailed card index / Joined group by](https://www.palantir.com/docs/foundry/quiver/card-joined-group-by)
- [Palantir Quiver, Quiver / Detailed card index / Manual entry transform table](https://www.palantir.com/docs/foundry/quiver/card-manual-entry-transform-table)
- [Palantir Quiver, Quiver / Detailed card index / Numeric aggregation (dataset)](https://www.palantir.com/docs/foundry/quiver/card-numeric-aggregation-dataset)
- [Palantir Quiver, Quiver / Detailed card index / Object set dataset](https://www.palantir.com/docs/foundry/quiver/card-object-set-dataset)
- [Palantir Quiver, Quiver / Detailed card index / Ontology SQL](https://www.palantir.com/docs/foundry/quiver/card-ontology-sql)
- [Palantir Quiver, Quiver / Detailed card index / Pivot table](https://www.palantir.com/docs/foundry/quiver/card-pivot-table)
- [Palantir Quiver, Quiver / Detailed card index / Pivot transform table](https://www.palantir.com/docs/foundry/quiver/card-pivot-transform-table)
- [Palantir Quiver, Quiver / Detailed card index / Rename columns](https://www.palantir.com/docs/foundry/quiver/card-rename-columns)
- [Palantir Quiver, Quiver / Detailed card index / Select columns](https://www.palantir.com/docs/foundry/quiver/card-select-columns)
- [Palantir Quiver, Quiver / Detailed card index / Set math (dataset)](https://www.palantir.com/docs/foundry/quiver/card-set-math-dataset)
- [Palantir Quiver, Quiver / Detailed card index / Transform table](https://www.palantir.com/docs/foundry/quiver/card-transform-table)
- [Palantir Quiver, Quiver / Detailed card index / Transform table aggregation](https://www.palantir.com/docs/foundry/quiver/card-transform-table-aggregation)
- [Palantir Quiver, Quiver / Detailed card index / Transform table column values](https://www.palantir.com/docs/foundry/quiver/card-transform-table-column-values)
- [Palantir Quiver, Quiver / Detailed card index / Categorical plot from transform table](https://www.palantir.com/docs/foundry/quiver/card-transform-table-plot)
- [Palantir Quiver, Quiver / Detailed card index / Transform table row selector](https://www.palantir.com/docs/foundry/quiver/card-transform-table-row-selector)
- [Palantir Quiver, Quiver / Detailed card index / Union (transform table)](https://www.palantir.com/docs/foundry/quiver/card-union-transform-table)
- [Palantir Quiver, Quiver / Detailed card index / Unique column values (dataset)](https://www.palantir.com/docs/foundry/quiver/card-unique-column-values-dataset)
- [Palantir Quiver, Quiver / Card references / Dataset](https://www.palantir.com/docs/foundry/quiver/cards-index-datasets)
- [Palantir Quiver, Quiver / Transform tables](https://www.palantir.com/docs/foundry/quiver/cards-transform-table)
- [Palantir Quiver, Quiver / Transform references / Index of transform table transformations](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index)
- [Palantir Quiver, Quiver / Transform references / Edit columns](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-edit-columns)
- [Palantir Quiver, Quiver / Transform references / Filter](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-filter)
- [Palantir Quiver, Quiver / Transform references / Group](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-group)
- [Palantir Quiver, Quiver / Transform references / Join](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-join)
- [Palantir Quiver, Quiver / Transform references / Transform table computation differences](https://www.palantir.com/docs/foundry/quiver/transform-table-computation-differences)

## 관련 문서

- [[Palantir-Quiver]]
- [[Palantir-Quiver-Analysis-and-Versioning|Quiver 분석 그래프와 버전 관리]]
- [[Palantir-Quiver-Object-Sets-and-Charts|Quiver 객체 집합, 탐색과 차트의 정확도]]
- [[Palantir-Quiver-Formula-and-Value-Contracts|Quiver 수식, 값 변환과 빈값 계약]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation|Quiver 시계열 보간, 시간창과 집계]]
- [[Palantir-Quiver-Events-Ranges-and-Reference-Profiles|Quiver 이벤트, 시간 범위와 기준 프로파일]]
- [[Palantir-Quiver-Regression-and-Forecasting|Quiver 회귀, 예측과 분포 해석]]
- [[Palantir-Quiver-Dashboards-and-Embedding|Quiver 대시보드, 임베딩과 권한 전파]]
- [[Palantir-Quiver-Functions-AIP-and-Vega|Quiver 재사용 함수, AIP와 Vega의 경계]]
