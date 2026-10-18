---
tags: [palantir, foundry, time-series]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 시계열 identity, schema와 sync"]
---

# Foundry 시계열 identity, schema와 sync

Foundry 시계열은 관측점, 시계열을 찾는 참조와 Ontology 객체 metadata를 분리한다. Sync가 존재한다는 것만으로 객체의 시계열이 올바르게 연결되거나 모든 최신 관측이 조회된다고 보장하지 않는다. 아래는 2026-10-16 공식 문서 기준이며 실제 sync를 생성하지 않았다.

## 세 가지 데이터 계약

| 구성 | 저장하는 것 |
|---|---|
| Time-series data | series ID, timestamp, value의 관측 행 |
| Sync | dataset/stream을 색인해 series ID로 조회하는 resource |
| Object backing dataset/TSP | object primary key와 series ID 참조, label/unit 등의 metadata |

일반 TSP는 object type의 string property를 시계열 참조로 설정한다. TSP 자체를 primary key나 title로 사용할 수 없다. 업무 ID와 series ID가 같더라도 별도 property로 매핑한다. 빈 참조나 sync와 다른 series ID는 해당 객체의 series를 불러오지 못한다.

모든 객체에 같은 종류의 관측이 있으면 root object의 TSP, 일부만 가지거나 sensor 구성이 다양한 경우 linked sensor object가 적합하다. Sensor type은 default TSP 하나, root link와 sensor name이 필요하며 한 root에 연결된 sensor 이름은 고유해야 한다. Primary key와 sensor name, series ID는 서로 다른 책임이다.

## Sync schema와 타입

Series ID는 string, timestamp는 Timestamp 또는 Long, value는 Integer/Float/Double/String이다. Long timestamp는 seconds/milliseconds/microseconds/nanoseconds를 명시한다. String value는 categorical series이며 series별 최대 10,000 variant를 넘으면 해당 series ID가 error 상태로 조회되지 않는다고 명시한다.

Glossary는 정확히 세 열을 설명하지만 sync reference에는 optional streaming ingestion-time Timestamp도 있다. 구성 화면의 지원 schema를 확인하고 공통 최소 세 열과 추가 metadata를 구분한다. 한 sync의 value column에 numeric과 categorical을 혼합할 수 없다.

하나의 series 전체 값은 한 sync에 있어야 한다. 여러 backing dataset을 view로 묶는 최적화는 그 view를 하나의 sync로 조회하는 별도 구성이다. 여러 sync의 qualified ID를 사용한다는 것을 한 series를 여러 독립 sync로 임의 분할해 합친다는 뜻으로 해석하지 않는다.

## Qualified series ID

여러 sync를 받는 TSP는 OSv2가 필요하고 `seriesId`와 `syncRid`를 가진 JSON string 참조를 사용한다. 문서의 형식 계약은 newline/space 없는 JSON이다. Series ID만으로 우연히 다른 sync의 series와 연결되지 않도록 한다. Optimized sync builds는 TSP/qualified-ID 조회만 사용할 때 권장되며 global series-ID uniqueness를 요구하지 않는다.

Sensor TSP가 numeric/categorical sync를 함께 사용하면 sensor별 `Is categorical` Boolean이 필요하다. Sensor unit/interpolation은 sensor object configuration에서 지정한다. Unit formatter는 주로 axis label 등의 표시 설정이므로 자동 수치 변환이라고 생각하지 않는다.

## Pipeline 설계와 원본 추적

넓은 sensor table은 unpivot하여 measurement name/value로 나누고 object ID와 measurement를 조합해 series ID를 구성한다. Sensor metadata는 관측점과 분리하여 sensor당 한 행을 만든다. Key 구성의 separator 충돌, null 제거와 duplicate timestamp 정책은 명시적으로 정한다.

좌표 시계열은 latitude/longitude TSP를 각각 만들고 track capability에 연결할 수 있다. 위치 history를 scalar numeric series로 처리하는 경우와 geotemporal series를 쓰는 경우는 별도 데이터 모델 선택이다. Timestamp와 object identity가 맞는지 확인한다.

공개 tutorial에는 example ID 불일치와 산술 불일치가 있다. 예를 들어 항공 집계의 33+34가 77로 표시되고 airport ID가 series ID에서 다르게 쓰인 표가 있다. 좌표 tutorial도 backing schema에 ship ID를 남기는 표와 그 열을 drop하라는 문장이 충돌한다. 표의 값을 정답 fixture나 무손실 pipeline recipe로 복사하지 않는다.

Sensor tutorial은 series ID를 primary key로 재사용할 수 있다고 표현하지만 현재 TSP setup은 TSP property를 primary key로 금지한다. 값 자체가 같은 별도 비-TSP key property를 두는 방식과 property 매핑 제약을 구분한다.

## 구성 소유권

Pipeline Builder에서 만든 sync는 Builder가 관리 가능한 설정을 다음 pipeline 실행 때 덮어쓴다. Catalog에서 mapping을 직접 수정했더라도 영구히 유지된다고 가정하지 않는다. Sync를 저장/빌드한 것과 Ontology mapping을 저장하고 초기 indexing이 끝난 것은 다른 단계다.

기존 sync와 겹치는 ID를 새 sync로 overwrite하는 고급 설정은 기존 sync를 실패하게 만들며 stream input에는 제공되지 않는다. 가역적 화면 편집처럼 취급하지 않는다. 이 문서는 실제 데이터 이동이나 overwrite를 실행하지 않았다.

## 출처

- [Palantir Time series, time-series](https://www.palantir.com/docs/foundry/time-series)
- [Palantir Time series, create-or-select-ts-ot](https://www.palantir.com/docs/foundry/time-series/create-or-select-ts-ot)
- [Palantir Time series, create-sensor-ot](https://www.palantir.com/docs/foundry/time-series/create-sensor-ot)
- [Palantir Time series, geospatial-time-series-ontology](https://www.palantir.com/docs/foundry/time-series/geospatial-time-series-ontology)
- [Palantir Time series, geospatial-time-series-pipeline](https://www.palantir.com/docs/foundry/time-series/geospatial-time-series-pipeline)
- [Palantir Time series, geospatial-time-series-use-case](https://www.palantir.com/docs/foundry/time-series/geospatial-time-series-use-case)
- [Palantir Time series, geospatial-time-series-use-case-map](https://www.palantir.com/docs/foundry/time-series/geospatial-time-series-use-case-map)
- [Palantir Time series, sensor-object-end-to-end](https://www.palantir.com/docs/foundry/time-series/sensor-object-end-to-end)
- [Palantir Time series, sensor-object-end-to-end-ontology](https://www.palantir.com/docs/foundry/time-series/sensor-object-end-to-end-ontology)
- [Palantir Time series, sensor-object-end-to-end-operational](https://www.palantir.com/docs/foundry/time-series/sensor-object-end-to-end-operational)
- [Palantir Time series, sensor-object-end-to-end-pipeline](https://www.palantir.com/docs/foundry/time-series/sensor-object-end-to-end-pipeline)
- [Palantir Time series, time-series-concepts-glossary](https://www.palantir.com/docs/foundry/time-series/time-series-concepts-glossary)
- [Palantir Time series, time-series-overview](https://www.palantir.com/docs/foundry/time-series/time-series-overview)
- [Palantir Time series, time-series-properties](https://www.palantir.com/docs/foundry/time-series/time-series-properties)
- [Palantir Time series, time-series-properties-use-case](https://www.palantir.com/docs/foundry/time-series/time-series-properties-use-case)
- [Palantir Time series, time-series-properties-use-case-ontology](https://www.palantir.com/docs/foundry/time-series/time-series-properties-use-case-ontology)
- [Palantir Time series, time-series-properties-use-case-operational](https://www.palantir.com/docs/foundry/time-series/time-series-properties-use-case-operational)
- [Palantir Time series, time-series-properties-use-case-pipeline](https://www.palantir.com/docs/foundry/time-series/time-series-properties-use-case-pipeline)
- [Palantir Time series, time-series-setup](https://www.palantir.com/docs/foundry/time-series/time-series-setup)
- [Palantir Time series, time-series-syncs](https://www.palantir.com/docs/foundry/time-series/time-series-syncs)
- [Palantir Time series, time-series-time-series-catalog](https://www.palantir.com/docs/foundry/time-series/time-series-time-series-catalog)
- [Palantir Time series, time-series-usage](https://www.palantir.com/docs/foundry/time-series/time-series-usage)

## 관련 문서

- [[Palantir-Time-Series]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation]]
- [[Palantir-Time-Series-Indexing-Performance-and-Usage|Foundry 시계열 색인, hydration과 사용량]]
- [[Palantir-Time-Series-Derived-Series-and-Access|Foundry derived series, 버전과 접근 권한]]
- [[Palantir-Time-Series-Alerting-State-and-Replay|Foundry 시계열 alerting의 상태, 지연과 재평가]]
- [[Palantir-Time-Series-Functions-and-Calculation-Semantics|Foundry 시계열 함수와 계산 의미]]
