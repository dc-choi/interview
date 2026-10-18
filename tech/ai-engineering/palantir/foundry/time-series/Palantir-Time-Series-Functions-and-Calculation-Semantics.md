---
tags: [palantir, foundry, time-series]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 시계열 함수와 계산 의미"]
---

# Foundry 시계열 함수와 계산 의미

시계열 함수 호출에서는 실행 환경과 반환 schema, 시점 정렬을 함께 확인한다. FoundryTS query를 실행하는 transform과 Ontology SDK를 쓰는 Functions는 다른 API 경로다.

## 환경별 접근

FoundryTS는 Code Repository/Workbook의 Python query library다. Transform에서 query한 결과는 dataset이며 새 time series로 쓰려면 series ID/timestamp/value schema와 sync를 별도로 구성한다. Project 밖 resource에는 object backing dataset 또는 sync와 backing dataset reference가 필요하다. Workbook input에 추가한 것과 Project reference가 갖춰진 것도 구분한다.

FoundryTS는 Functions와 호환되지 않는다. Python Functions는 OSDK TSP의 `to_pandas`/`to_polars`로 timestamp/value dataframe을 읽는다. Legacy TypeScript는 first/last V2, aggregate/derivative/time range 메서드를, TypeScript V2 OSDK는 getAllPoints/getFirstPoint/getLastPoint와 absolute/relative range를 설명한다. 다른 세대의 method를 혼용하지 않는다.

## Function-backed series

Python function이 serialized numeric time series를 반환하면 sync 없이 Quiver에서 query-time series로 사용할 수 있다. `timestamp`는 pandas timestamp, `value`는 numeric이며 `TimeSeries.serialize`의 `list[bytes]` 결과를 tagged function version으로 노출한다. Categorical output은 미지원이다.

Getting-started/overview는 `timeseries_sdk.types`를 import하고 Functions 예시는 `timeseries_sdk.functions.types`를 사용한다. SDK version에 맞는 경로를 확인해야 하며 여기서 어느 하나를 실행 검증된 정답으로 선택하지 않는다. 예시 일부도 alias가 다른 pandas 이름을 참조하므로 복사 후 실행 검증이 필요하다.

Query-time forecasting은 요청 parameter/model/input data에 따라 달라질 수 있다. Built-in cache/streaming execution 지원 설명만으로 cache invalidation, 재현 가능한 model fit과 예측 interval 정확도를 추가 보장하지 않는다.

## Interpolation과 관측점

Numeric TSP default internal interpolation은 LINEAR, categorical은 PREVIOUS다. Internal은 LINEAR/NEAREST/PREVIOUS/NEXT/NONE이고 외부 before/after는 NEAREST/NONE이다. Linear는 numeric만 지원한다.

여러 series 결합에서 모두 interpolation이 있으면 timestamp 합집합, 하나라도 NONE이면 NONE series들의 timestamp 교집합을 계산 기준으로 삼는다. 다만 endpoint 밖에 external interpolation이 없으면 그 시각의 값이 없어 결과가 만들어지지 않을 수 있다. 모든 source timestamp의 합집합이 곧 무결측 결과 보장은 아니다.

Resampling으로 생성한 값과 원래 측정값을 구분하고 unit label을 변환계수로 오해하지 않는다. Formula/filter/aggregate와 Combine의 차이, window 경계와 time-weighted aggregate는 Quiver 계약에서 이어서 확인한다. 실제 SDK, model과 numeric result는 실행하지 않았다.

## 출처

- [Palantir Time series, foundryts](https://www.palantir.com/docs/foundry/time-series/foundryts)
- [Palantir Time series, function-backed-time-series-getting-started](https://www.palantir.com/docs/foundry/time-series/function-backed-time-series-getting-started)
- [Palantir Time series, function-backed-time-series-overview](https://www.palantir.com/docs/foundry/time-series/function-backed-time-series-overview)
- [Palantir Time series, interpolation-overview](https://www.palantir.com/docs/foundry/time-series/interpolation-overview)
- [Palantir Time series, time-series-in-functions](https://www.palantir.com/docs/foundry/time-series/time-series-in-functions)

## 관련 문서

- [[Palantir-Time-Series]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation]]
- [[Palantir-Time-Series-Identity-Schema-and-Sync|Foundry 시계열 identity, schema와 sync]]
- [[Palantir-Time-Series-Indexing-Performance-and-Usage|Foundry 시계열 색인, hydration과 사용량]]
- [[Palantir-Time-Series-Derived-Series-and-Access|Foundry derived series, 버전과 접근 권한]]
- [[Palantir-Time-Series-Alerting-State-and-Replay|Foundry 시계열 alerting의 상태, 지연과 재평가]]
