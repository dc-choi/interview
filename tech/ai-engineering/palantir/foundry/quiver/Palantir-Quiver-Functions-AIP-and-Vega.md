---
tags: [palantir, foundry, quiver, visual-function, aip, vega]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Quiver 재사용 함수, AIP와 Vega의 경계"]
---

# Quiver 재사용 함수, AIP와 Vega의 경계

Visual function은 Quiver 카드의 논리를 반복 적용하는 publishable resource다. Code function, AIP가 생성한 카드와 Vega spec은 각각 실행 위치, 타입과 재사용 범위가 다르므로 하나의 함수 개념으로 묶지 않는다.

## Visual function의 입력, 출력과 변경

Visual function은 0개 이상의 metric/object set/single object/time series 입력과 한 개의 출력을 가진다. Chart와 table은 input/output으로 지원하지 않으며 함수 논리에서도 visualization/table card를 포함할 수 없다. Boolean/time/number/string/string-array/time-range 같은 출력별 card가 있다.

Visual function은 분석 입력에 논리를 적용하며 underlying dataset이나 Ontology를 변경하지 않는다. Ontology Action을 호출하는 Action button의 writeback과 구분한다. Function resource는 folder 권한을 상속하고 따로 공유할 수 있으며, version을 고정하거나 auto-update를 선택한다. 업데이트는 republish한 새 version으로 관리한다.

Visual function의 재사용은 Quiver 내부 범위다. Code function은 외부 code repository에서 작성되고 Workshop 등 다른 consumer에서도 사용할 수 있지만 실제 지원 언어/return type은 개별 함수 계약을 확인한다. Overview의 TypeScript 예시를 모든 code function의 언어 제한으로 확대하지 않는다.

Row/column read-time access control은 function에서 보이는 데이터를 filter하지만 output까지 보호를 전파하지 않는다. 결과는 dashboard embed/export/share될 수 있으므로 필요한 marking/CBAC를 별도로 구성한다.

## Code function의 결과 타입

Object-set function은 object set, primitive function은 scalar/typed array를 반환한다. Categorical function은 `TwoDimensionalAggregation` 또는 `ThreeDimensionalAggregation`을 반환해야 한다. Python code function time series는 정해진 time-series 형식의 `list[bytes]`를 반환하며 categorical output은 미지원이다.

Code function card는 기본 생성 당시 최신 version에 고정되고 auto-update를 켜면 최신을 추적한다. Function 선택 후 나타나는 실제 parameter를 연결한다. Signature가 바뀌면 downstream card의 호환성도 확인한다.

Derived property from function on objects는 `ObjectSet<ObjectType>` 입력과 `FunctionsMap<ObjectType, CustomType>` 출력이 필요하다. Map key의 object ID가 table 객체와 맞아야 하고 value는 primitive다. 수치에는 Double/Integer를 Float보다 권장한다. 이 카드의 prose는 Boolean/string/number/time 열을 말하지만 짧은 Output type은 String만 적어 불일치한다. 실제 signature와 UI를 확인해 결정한다.

Multipass attribute는 현재 사용자 또는 user ID의 metadata를 반환하는 조회다. Display name을 권한 식별자나 불변 key로 대체하지 않는다. 공개 지식 문서에는 실제 사용자 속성값을 저장하지 않는다.

## AIP 생성과 검토

AIP Generate는 natural-language 의도로 card/graph를 제안하며 object/object-set 중심으로 지원한다. Follow-up이 있는 제안은 여러 단계를 구성할 수 있다. AIP Configure는 기존 설정 변경을 제안하고 선택된 변경을 적용한다. Time-series Configure는 chart container가 아니라 선택한 series에 작용한다. Enrollment별 기능 차이가 있다.

AIP는 object set의 전체 row 대신 property value hint를 사용한다. String은 최대 100 unique value, numeric은 min/max/average다. 이 summary만으로 희소 category, 모든 예외나 분포를 확인했다고 판단하지 않는다. 생성된 threshold, column mapping과 필터를 확인하고 적용 후 실제 데이터 범위를 검토한다.

## Vega spec과 데이터 참조

Vega/Vega-Lite는 JSON spec으로 visualization을 정의한다. Transform table과 array를 입력으로 받으며 array는 `ARRAY_VALUES` 한 열의 table로 해석한다. Object set에서 Vega를 만들면 backing transform table이 analysis contents에 생성될 수 있다.

`$A`는 table data, `$A.column_name`은 column ID string, scalar card ID는 설정 값으로 해석된다. Resolved spec preview는 모든 입력 data point를 포함해 클 수 있다. 외부 public Vega editor에 민감한 resolved data를 넣지 않는다. Quiver Vega는 50,000 object 제한이 명시되므로 큰 규모의 object/dataset chart와 구분한다.

Template 적용은 기존 editor 값을 덮어쓰며 비운 field는 parameter 이름을 default로 쓴다. Autoscale/default styling은 embed 크기와 appearance를 조절한다. AIP가 만든 spec도 입력 ID, 계산과 selection 계약을 확인해야 한다. 예시의 `...`와 일부 단편은 완전한 실행 JSON이 아니다.

## Vega-Lite selection은 object drill-down과 다르다

Point/interval selection output을 켜고 parameter 이름을 각각 `quiverDefaultClick`/`quiverDefaultBrush`로 정해야 Quiver table로 출력한다. 각각 하나만 output하며 non-empty encodings가 필요하다. Point는 encoding field/value 행, interval은 continuous bounds 또는 discrete value array를 출력한다.

선택은 input을 자동 filter하지 않는다. 출력 값을 이용해 원래 table/object set의 filter를 따로 구성해야 한다. Interval은 color/shape 같은 non-axis encoding을 지원하지 않고 Vega 내부에서 aggregate한 field도 해당 축 selection을 할 수 없다. 필요한 집계는 Quiver에서 먼저 수행한다.

Box plot/confidence interval은 selection 미지원이며 pie/waterfall/GeoJSON map 등은 point만 지원하는 경우가 있다. Spec compile 성공을 valid data selection의 증거로 대신하지 않는다. 실제 visualization과 function runtime은 이 문서에서 시험하지 않았다.

## 출처

- [Palantir Quiver, Quiver / Detailed card index / Code function object set](https://www.palantir.com/docs/foundry/quiver/card-code-function-object-set)
- [Palantir Quiver, Quiver / Detailed card index / Code function time series](https://www.palantir.com/docs/foundry/quiver/card-code-function-timeseries)
- [Palantir Quiver, Quiver / Detailed card index / Code function value](https://www.palantir.com/docs/foundry/quiver/card-code-function-value)
- [Palantir Quiver, Quiver / Detailed card index / Derived property from function on objects](https://www.palantir.com/docs/foundry/quiver/card-derived-property-from-function-on-objects)
- [Palantir Quiver, Quiver / Detailed card index / Code function categorical plot](https://www.palantir.com/docs/foundry/quiver/card-function-on-objects-plot)
- [Palantir Quiver, Quiver / Detailed card index / Multipass attribute](https://www.palantir.com/docs/foundry/quiver/card-multipass-attribute)
- [Palantir Quiver, Quiver / Detailed card index / Vega plot](https://www.palantir.com/docs/foundry/quiver/card-vega-plot)
- [Palantir Quiver, Quiver / Detailed card index / Visual function boolean](https://www.palantir.com/docs/foundry/quiver/card-visual-function-boolean)
- [Palantir Quiver, Quiver / Detailed card index / Visual function date/time](https://www.palantir.com/docs/foundry/quiver/card-visual-function-datetime)
- [Palantir Quiver, Quiver / Detailed card index / Visual function metric](https://www.palantir.com/docs/foundry/quiver/card-visual-function-metric)
- [Palantir Quiver, Quiver / Detailed card index / Visual function property select](https://www.palantir.com/docs/foundry/quiver/card-visual-function-property-select)
- [Palantir Quiver, Quiver / Detailed card index / Visual function string](https://www.palantir.com/docs/foundry/quiver/card-visual-function-string)
- [Palantir Quiver, Quiver / Detailed card index / Visual function time range](https://www.palantir.com/docs/foundry/quiver/card-visual-function-time-range)
- [Palantir Quiver, Quiver / Transform references / Functions](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-functions)
- [Palantir Quiver, Quiver / Transform references / User information](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-user-info)
- [Palantir Quiver, Quiver / Vega plots](https://www.palantir.com/docs/foundry/quiver/cards-vega-plot)
- [Palantir Quiver, Quiver / Analysis / AIP features](https://www.palantir.com/docs/foundry/quiver/quiver-aip)
- [Palantir Quiver, Quiver / Visual functions / Create and use visual functions](https://www.palantir.com/docs/foundry/quiver/visual-functions-create)
- [Palantir Quiver, Quiver / Visual functions / Overview](https://www.palantir.com/docs/foundry/quiver/visual-functions-overview)

## 관련 문서

- [[Palantir-Quiver]]
- [[Palantir-Quiver-Analysis-and-Versioning|Quiver 분석 그래프와 버전 관리]]
- [[Palantir-Quiver-Object-Sets-and-Charts|Quiver 객체 집합, 탐색과 차트의 정확도]]
- [[Palantir-Quiver-Transform-Tables-and-Datasets|Quiver transform table과 dataset의 계산 계약]]
- [[Palantir-Quiver-Formula-and-Value-Contracts|Quiver 수식, 값 변환과 빈값 계약]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation|Quiver 시계열 보간, 시간창과 집계]]
- [[Palantir-Quiver-Events-Ranges-and-Reference-Profiles|Quiver 이벤트, 시간 범위와 기준 프로파일]]
- [[Palantir-Quiver-Regression-and-Forecasting|Quiver 회귀, 예측과 분포 해석]]
- [[Palantir-Quiver-Dashboards-and-Embedding|Quiver 대시보드, 임베딩과 권한 전파]]
