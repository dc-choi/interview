---
tags: [palantir, foundry, quiver, event-set, range, reference-profile]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Quiver 이벤트, 시간 범위와 기준 프로파일"]
---

# Quiver 이벤트, 시간 범위와 기준 프로파일

Event set은 start/end timestamp가 정한 구간의 집합이다. 단순 highlight를 넘어 series를 구간별로 분리하고 비교하거나 집계하는 입력으로 쓴다. 표시가 겹친다는 것, 실제 event가 중복이라는 것과 관측 조건이 충족되었다는 것은 서로 다르다.

## Event 생성과 변환

Object set/transform table/dataset에서 start/end 열을 골라 event set을 만들 수 있다. Ontology event capability가 있으면 필드가 자동 선택되지만 capability가 없는 object도 timestamp 속성으로 만들 수 있다. Linked event set은 single object 또는 series의 root object에서 link를 탐색한다. 수동 range나 time-series search 결과도 event set으로 만든다.

Event set의 backing transform table은 event당 한 행을 가지며 score, label, tooltip과 색상을 보강할 수 있다. Object tooltip은 object column이 있어야 한다. Display aggregation은 많은 event를 화면에서 묶는 기능이며 실제 dedup과 구분한다. Deduplicate event set은 겹친 event를 dedup하지만 property 보존/우선순위의 상세 계약은 짧은 reference에 없다.

Time shift는 start/end를 앞뒤로 이동한다. Event indicator는 시점별 동시 event 수를 series로 만들고 duration이 0인 event는 plot하지 않는다. 이벤트가 화면에 보이지 않는 것만으로 원천에 없다고 결론 내리지 않는다. Timeline은 object set만 받고 coloring은 single-event threshold 안에서 지원되므로 큰 범위의 표시를 확인한다.

## 검색은 실제 계산점에서 판정한다

Time series search는 점을 순서대로 검사한다. 조건을 처음 만족한 점에서 열고, 연속으로 만족하는 동안 유지하며, 조건을 벗어난 점 또는 series 끝에서 닫는다. 닫는 점은 event에 포함되지 않지만 마지막 점도 조건을 만족하면 예외적으로 포함된다. 그리기 위한 보간 선이 threshold를 통과한 위치를 시작 timestamp로 쓰는 것은 아니다.

Threshold는 numeric/enum 조건, AND/OR와 다른 series 비교를 지원한다. Bounded는 upper/lower 밖을 찾으며 경계와 같은 값은 기본적으로 event를 만들지 않지만 설정 가능하다. Formula는 Boolean 결과를 사용하고 Multi는 transform table 각 행을 검색하며 1,000행으로 제한된다. Minimum/maximum duration 조건을 적용하면 짧거나 긴 구간을 제외할 수 있다.

Search full extent는 비용이 클 수 있다. Chart axis 또는 defined range로 검색 범위를 정할 수 있으므로, zoom과 event 목록이 결합된 분석에서는 현재 검색 범위를 함께 표시한다.

Search를 Automation으로 변환할 때 Multi는 지원하지 않는다. Single root object가 필요하고 root property/linked sensor 및 지원된 operation만 사용할 수 있다. 탐색 분석이 생성되었다는 사실을 자동 alert의 실행 가능성으로 대신하지 않는다.

## Range와 relative time

Time range는 두 timestamp, numeric range는 두 value다. 선택을 저장하면 typed parameter가 생기고 여러 chart가 이를 공유할 수 있다. 단순 range selection은 저장된 range parameter와 달리 영구 보관되지 않는다. Range statistics는 time axis 하나와 numeric axis 하나를 가진 호환 plot의 min/max/average를 계산한다.

Absolute time은 실제 날짜, relative time은 alignment timestamp부터의 duration이다. Relative time options는 series start/end/fixed timestamp에 맞출 수 있다. 별도 Relative time card는 sunset 단계이며 신규 구성에는 plot의 toggle 사용을 권한다. 시간 이동과 event-relative 정렬을 실제 timestamp의 동일성으로 해석하지 않는다.

Event comparison은 event마다 해당 series 구간을 잘라 시작을 zero로 맞춘 grouped series를 만든다. Shift/align-to-date는 다른 시점에 맞추는 transform이다. Event statistics는 event별 한 결과점을 반환하며 interval aggregate의 start-inclusive/end-exclusive 규칙을 확인한다. Segment statistics card는 sunset이며 Event statistics 사용을 권한다.

## Reference profile의 모집단

Reference profile은 정상으로 선정한 golden batch/process run을 상대시간에 맞춰 같은 시점의 mean과 standard deviation으로 기대 범위를 만든다. 개별 카드 설명은 mean ± standard deviation, guide는 배수 n을 포함한다. 선택 가능한 배수와 default는 실제 설정에서 확인한다.

여러 sensor/event를 결합할 때 공통 key가 필요하다. Linked series aggregation의 event option은 series object와 event object를 key로 inner join한 뒤 event 범위로 filter하고 start 기준 relative time으로 맞춘 뒤 집계한다. 잘못된 key나 many-to-many 매칭은 기준 집합 자체를 바꿀 수 있다.

Golden batch의 선정 기준, version, sensor 단위, 정렬 기준, interpolation과 제외 event를 기록해야 비교 결과를 설명할 수 있다. Mean ± n standard deviation을 미래 데이터의 보장 범위나 통계적 confidence interval로 간주하지 않는다. 반복 운영에 사용할 때 derived series/Ontology 구조는 별도 배포와 권한 조건을 확인한다.

## 적용 점검

이상 event 수가 바뀌면 원천 변화뿐 아니라 검색 range, interpolation, duration 조건, dedup, 경계 포함과 reference cohort 변화를 차례로 확인한다. 이 문서는 event 검색/Automation을 실제 실행하지 않았다.

## 출처

- [Palantir Quiver, Quiver / Detailed card index / Align series to event set](https://www.palantir.com/docs/foundry/quiver/card-align-series-to-event-set)
- [Palantir Quiver, Quiver / Detailed card index / Align to date](https://www.palantir.com/docs/foundry/quiver/card-align-to-date)
- [Palantir Quiver, Quiver / Detailed card index / Bollinger bands](https://www.palantir.com/docs/foundry/quiver/card-bollinger-bands)
- [Palantir Quiver, Quiver / Detailed card index / Deduplicate event set](https://www.palantir.com/docs/foundry/quiver/card-deduplicate-event-set)
- [Palantir Quiver, Quiver / Detailed card index / Event comparison plot](https://www.palantir.com/docs/foundry/quiver/card-event-comparison-plot)
- [Palantir Quiver, Quiver / Detailed card index / Event indicator series](https://www.palantir.com/docs/foundry/quiver/card-event-indicator-series)
- [Palantir Quiver, Quiver / Detailed card index / Event set from ranges](https://www.palantir.com/docs/foundry/quiver/card-event-set-from-ranges)
- [Palantir Quiver, Quiver / Detailed card index / Event set from tabular data](https://www.palantir.com/docs/foundry/quiver/card-event-set-from-tabular-data)
- [Palantir Quiver, Quiver / Detailed card index / Event statistics](https://www.palantir.com/docs/foundry/quiver/card-event-statistics)
- [Palantir Quiver, Quiver / Detailed card index / Extract time series bound](https://www.palantir.com/docs/foundry/quiver/card-extract-time-series-bound)
- [Palantir Quiver, Quiver / Detailed card index / Linked event set](https://www.palantir.com/docs/foundry/quiver/card-linked-event-set)
- [Palantir Quiver, Quiver / Detailed card index / Linked series aggregation](https://www.palantir.com/docs/foundry/quiver/card-linked-series-aggregation)
- [Palantir Quiver, Quiver / Detailed card index / Reference profile bounds](https://www.palantir.com/docs/foundry/quiver/card-reference-profile-bounds)
- [Palantir Quiver, Quiver / Detailed card index / Relative time [Sunset]](https://www.palantir.com/docs/foundry/quiver/card-relative-time-series)
- [Palantir Quiver, Quiver / Detailed card index / Segment statistics [Sunset]](https://www.palantir.com/docs/foundry/quiver/card-segment-statistics)
- [Palantir Quiver, Quiver / Detailed card index / Shift time series](https://www.palantir.com/docs/foundry/quiver/card-shift-time-series)
- [Palantir Quiver, Quiver / Detailed card index / Time series bounds](https://www.palantir.com/docs/foundry/quiver/card-time-series-bounds)
- [Palantir Quiver, Quiver / Detailed card index / Time series search](https://www.palantir.com/docs/foundry/quiver/card-time-series-search)
- [Palantir Quiver, Quiver / Detailed card index / Time shift event set](https://www.palantir.com/docs/foundry/quiver/card-time-shift-event-set)
- [Palantir Quiver, Quiver / Card references / Event set](https://www.palantir.com/docs/foundry/quiver/cards-index-event-sets)
- [Palantir Quiver, Quiver / Time series / Analyze events data](https://www.palantir.com/docs/foundry/quiver/timeseries-analyze-events-data)
- [Palantir Quiver, Quiver / Time series / Parameterize and pivot time series](https://www.palantir.com/docs/foundry/quiver/timeseries-parameterize-pivot)
- [Palantir Quiver, Quiver / Time series / Time and value ranges](https://www.palantir.com/docs/foundry/quiver/timeseries-ranges)
- [Palantir Quiver, Quiver / Time series / Reference profiles](https://www.palantir.com/docs/foundry/quiver/timeseries-reference-profiles)
- [Palantir Quiver, Quiver / Time series / Compare series in relative time](https://www.palantir.com/docs/foundry/quiver/timeseries-relative-time)
- [Palantir Quiver, Quiver / Time series / Search for anomalies](https://www.palantir.com/docs/foundry/quiver/timeseries-search-anomalies)

## 관련 문서

- [[Palantir-Quiver]]
- [[Palantir-Quiver-Analysis-and-Versioning|Quiver 분석 그래프와 버전 관리]]
- [[Palantir-Quiver-Object-Sets-and-Charts|Quiver 객체 집합, 탐색과 차트의 정확도]]
- [[Palantir-Quiver-Transform-Tables-and-Datasets|Quiver transform table과 dataset의 계산 계약]]
- [[Palantir-Quiver-Formula-and-Value-Contracts|Quiver 수식, 값 변환과 빈값 계약]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation|Quiver 시계열 보간, 시간창과 집계]]
- [[Palantir-Quiver-Regression-and-Forecasting|Quiver 회귀, 예측과 분포 해석]]
- [[Palantir-Quiver-Dashboards-and-Embedding|Quiver 대시보드, 임베딩과 권한 전파]]
- [[Palantir-Quiver-Functions-AIP-and-Vega|Quiver 재사용 함수, AIP와 Vega의 경계]]
