---
tags: [palantir, foundry, pipeline-builder, join, cardinality]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 조인과 행 수 계약"]
---

# Pipeline Builder 조인과 행 수 계약

Join의 핵심은 매칭 조건, 남길 입력 행과 매칭 한 건당 출력 행 수다. 열을 적게 선택했다고 매칭 수가 줄어드는 것은 아니다. 아래는 2026-10-16 공식 transform 설명과 예시 기준이며 실제 join은 실행하지 않았다.

## 행 보존 조건

| 조인 | 남는 행 |
|---|---|
| Inner | 조건을 만족한 양쪽의 조합 |
| Left | 왼쪽을 보존하고 미매칭 오른쪽 열은 null |
| Full outer | 양쪽 미매칭 행도 보존 |
| Semi | 오른쪽에 매칭이 있는 왼쪽 행 |
| Anti | 오른쪽에 매칭이 없는 왼쪽 행 |
| Cross | 모든 왼쪽 행과 모든 오른쪽 행의 Cartesian product |

일반 Join은 열 쌍으로 join type을 선택한다. Complex 계열은 Boolean expression으로 비교, 논리 조합 등 조건을 정하고 출력 열을 schema predicate로 선택한다. Complex inner/left/outer/cross/semi/anti는 Batch/Faster, 일반 Join은 Batch/Faster/Streaming을 지원한다.

오른쪽에 같은 키가 여러 개면 inner/left는 왼쪽 한 행에서 여러 결과를 만들 수 있다. 매칭 유무만 필요하면 semi/anti의 왼쪽 행 선택 의미를 구분한다. Cross join은 입력 행 수의 곱만큼 커질 수 있다.

## Null과 같은 이름의 열

Left join의 equality 예시에서는 null 키끼리 매칭하지 않는다. Null을 업무상 같은 미상 값으로 묶어야 한다면 그 의도를 별도로 표현해야 한다. 단순히 양쪽 값이 비어 있다는 이유로 같은 개체로 확정하지 않는다.

Right prefix로 이름 충돌을 구분할 수 있다. Full outer 예시에서 같은 이름의 키가 coalesce되어 출력되는 경우도 있으므로, 단일 출력 열만 보고 어느 입력이 기여했는지 추정하지 않는다. 원천 구분이 필요하면 prefix나 별도 식별 열을 남긴다.

## KNN은 유일한 정답을 찾는 기능이 아니다

일반 KNN join은 Numeric distance expression으로 각 왼쪽 행의 가까운 오른쪽 행을 찾고 rank 열을 남긴다. Batch 전용이며 동점 때문에 k보다 많은 행이 나올 수 있다. Null distance는 가장 먼 거리로 간주한다.

문서에 k=2일 때 출력이 두 배 이상이라는 설명이 있지만, 오른쪽 유효 후보 수가 적거나 없는 모든 입력까지 하한을 보장한 것으로 해석하지 않는다. 거리 기준과 동점 정책, 실제 후보 수를 함께 확인한다. 유사도처럼 값이 클수록 가까운 metric을 거리 expression과 같은 방향으로 넘기지 않는다.

## Lookup과 mapping의 제한

Streaming Left lookup join은 왼쪽 행을 보존하며 하나의 왼쪽 행에 붙일 수 있는 오른쪽 행 수의 상한을 지정한다. 공개 상한은 10이고 값이 높으면 성능에 영향을 줄 수 있다. 상한 초과 시 어떤 결과를 선택하거나 오류 처리하는지는 이 페이지의 예시로 확인되지 않는다.

Mapping join은 source의 여러 target 열 값을 mapping table의 값으로 바꾼다. 매핑이 없고 default가 비어 있으면 원래 값을 유지한다. `Assume unique mappings`는 기본적으로 mapping key에 distinct를 적용하며, 끄면 중복 key의 각 매핑에 따라 행이 늘어날 수 있다.

서로 다른 mapping value가 같은 key에 들어 있는 경우 어떤 값을 남기는지 이 계약만으로 확정하지 않는다. Mapping은 단순한 열 타입 변환이 아니라 값 대응과 다대일/일대다 관계의 문제다.

## Cache join의 시간 의미

Streaming Outer caching join은 cache window 안에서 매칭한 행과 양쪽 미매칭 행을 설명한다. 상세 `outerCachingJoinV3` 계약은 각 쪽에서 event time이 가장 큰 레코드를 보관하고 동점은 processing time으로 구분한다. 모든 과거 행을 유지하는 batch full outer join과 다르다.

Default cache time과 오른쪽 override를 따로 정한다. 오른쪽 cache 0은 오른쪽을 저장하지 않고, default 0에 오른쪽 override를 주면 왼쪽을 저장하지 않게 할 수 있다. TTL이 지난 값은 후속 매칭에 쓰이지 않을 수 있다. 미매칭 결과의 낙관적 emission을 최종 관계 부재로 확정하지 않는다.

Frontend 버전의 짧은 설명과 상세 버전의 상태 정책을 구분한다. 공개 설명만으로 결과 철회, 재접속 replay와 exactly-once 보장을 추가하지 않는다.

## Left lookup V1과 V2의 차이

영어 V1 경로 대신 확보한 공식 중국어 AIP 미검증 번역은 Streaming left lookup을 설명한다. 미매칭 왼쪽은 오른쪽 값 null로 남고, 복합 key는 모든 지정 key가 맞아야 하며, 같은 key의 오른쪽 두 행은 해당 왼쪽 행을 두 결과로 늘리는 예시가 있다.

V1 목록에는 V2의 오른쪽 매칭 행 수 상한 parameter가 없다. V2의 공개 최대 10을 V1의 계약으로 소급하거나, V1 이름에 lookup이 있다는 이유로 오른쪽 key 유일성을 가정하지 않는다.

## 출처

- [Palantir, Join](https://www.palantir.com/docs/foundry/pb-functions-transform/joinV2)
- [Palantir, Inner join](https://www.palantir.com/docs/foundry/pb-functions-transform/complexInnerJoinV1)
- [Palantir, Left join](https://www.palantir.com/docs/foundry/pb-functions-transform/complexLeftJoinV1)
- [Palantir, Outer join](https://www.palantir.com/docs/foundry/pb-functions-transform/complexOuterJoinV1)
- [Palantir, Cross join](https://www.palantir.com/docs/foundry/pb-functions-transform/complexCrossJoinV1)
- [Palantir, Semi join](https://www.palantir.com/docs/foundry/pb-functions-transform/complexSemiJoinV1)
- [Palantir, Anti join](https://www.palantir.com/docs/foundry/pb-functions-transform/complexAntiJoinV1)
- [Palantir, KNN join](https://www.palantir.com/docs/foundry/pb-functions-transform/complexKnnJoinV1)
- [Palantir, Left lookup join](https://www.palantir.com/docs/foundry/pb-functions-transform/leftLookupJoinV2)
- [Palantir, Mapping join](https://www.palantir.com/docs/foundry/pb-functions-transform/mappingJoinV1)
- [Palantir, Outer caching join](https://www.palantir.com/docs/foundry/pb-functions-transform/outerCachingJoinV3)
- [Palantir, Outer caching join frontend contract](https://www.palantir.com/docs/foundry/pb-functions-transform/frontendOuterCachingJoinV3)

- [Palantir, leftLookupJoinV1 (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/pb-functions-transform/leftLookupJoinV1/)

## 관련 문서

- [[Palantir-Pipeline-Geospatial-Join-Contracts|공간 join의 거리와 무효 값]]
- [[Palantir-Pipeline-Streaming-State-Contracts|이벤트 시간과 상태]]
- [[Palantir-Text-and-Vector-Similarity-Contracts|거리와 유사도 방향]]
- [[Palantir-Pipeline-Transforms|변환 지도]]
