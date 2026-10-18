---
tags: [palantir, transforms, identity, graph, incremental]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry transform 식별자와 알고리즘 계약"]
---

# Transform 식별자와 알고리즘 계약

공식 code example은 구현 아이디어를 제공하지만 문법, 데이터 분포와 상태 전제까지 보장하는 production 계약은 아니다. 아래는 2024년 제출 예제를 2026년 10월 본문과 대조한 결과이며 실제 Foundry runtime에서 실행하지 않았다.

## Stable key는 직렬화 규칙까지 안정적이어야 한다

Ontology primary key는 unique/non-null/stable해야 한다. 매 build random/monotonic ID를 만들면 같은 실체의 edit 연결과 변경 추적이 흔들린다. 자연키가 될 field를 결합하고 필요하면 hash로 고정 길이 식별자를 만든다.

`concat_ws`와 SHA-256 자체가 uniqueness를 만들지는 않는다. Delimiter가 값에 포함되는 경우, null 처리, type/순서와 정규화를 고정하고 중복 검사를 한다. Hash는 이미 충돌한 serialization을 복구하지 못한다. 계층 node ID도 level+이름만으로 충분한지, 다른 parent 아래 같은 이름이 가능한지 확인해 path를 포함한다.

Notional generation은 synthesizer field spec과 row count로 자료를 만든다. Seed와 key 충돌을 별도로 통제하며 synthetic임을 명시한다. Fake data의 정상 흐름만으로 결측/중복/경계값 검증을 대체하지 않는다.

## Incremental은 누적 가능한 연산을 요구한다

`ctx.is_incremental`로 분기하고 schema와 함께 previous output을 읽어 replace할 수 있다. 그러나 batch별 `count_distinct` 합은 transaction 사이 재등장한 값을 중복 집계한다. 전역 distinct에는 key state/중복 제거 또는 재계산이 필요하다.

Snapshot input과 previous output을 primary key left-anti join해 새 key만 append하는 패턴은 기존 key의 update/delete를 반영하지 않는다. Append-only identity 조건을 명시한다. Empty input abort는 정상 pointer 전진이며 실패 재처리와 다르다.

Multi-input/output은 `@transform`에 이름을 명시하고 각 output에 직접 write한다. 반환 하나를 쓰는 `transform_df`와 구분한다. Empty dataframe이라는 예제도 실제 dummy row 하나와 timestamp를 만들므로 row 수와 heartbeat 의미를 확인한다.

## Matching과 spatial join은 후보 생성이다

이름 정제→token explode→Soundex blocking→후보 join→Jaro similarity는 비교 비용을 줄이는 흐름이다. 언어/철자별 true match 누락과 false positive를 검증하고 예시 threshold 0.75를 업무 기준으로 고정하지 않는다.

Fuzzy snippet에는 decorator/인자 이름 불일치, select comma 누락과 다른 dataframe의 score 참조가 있다. Null-safe 정제와 numeric UDF return type도 확인한다. 설명을 실행 가능한 코드로 간주하지 않는다.

Shapefile은 `.shp`와 `.prj`/`.cpg` 등 sidecar를 같이 읽고 원 CRS를 확인해 EPSG:4326으로 변환한다. Centroid/geohash와 buffer join은 좌표축/거리 단위/invalid geometry를 검증한다. 30km는 예시이며 left join 미매칭 null을 보존할지 결정한다.

## Tree는 방향과 방문 집합을 검증한다

Flattening은 node/parent/level/path와 stable key로 self-link를 구성한다. Tree/DAG, 다중 parent와 cycle의 허용 여부를 정한다. Partition별 pandas/NetworkX는 연결된 component가 같은 partition에 있어야 관계를 잃지 않고 가장 큰 group은 worker memory에 들어가야 한다.

Vertex BFS 예제는 loop에서 `currentNode` 대신 root인 `exampleObject.child`를 읽어 깊은 tree를 탐색하지 못한다. 현재 node child와 stable RID visited가 필요하다. 결과 interface는 direct/intermediate edge, orphan RID와 grouping을 표현한다. NetworkX 예제의 vertex `child`/edge `child_id`도 union 전에 맞춰야 한다.

Child/grandchild search-around는 link 방향과 union 중복 의미를 확인한다. Round-robin assignment는 analyst 0명일 때 종료하며 매 호출 index 0에서 시작하므로 전역 공정성/동시 실행 상태를 유지하지 않는다. Timestamp 차이를 24시간으로 나눈 floor는 elapsed day이며 지역 달력 날짜 차이가 아니다.

## 출처

- [Palantir, Code examples](https://www.palantir.com/docs/foundry/code-examples)
- [Palantir, Stable primary keys](https://www.palantir.com/docs/foundry/code-examples/common-operations-code-repositories)
- [Palantir, Repository metadata examples](https://www.palantir.com/docs/foundry/code-examples/dataset-metadata-operations-code-repositories)
- [Palantir, Common transforms](https://www.palantir.com/docs/foundry/code-examples/common-operations-transforms)
- [Palantir, Common object Functions](https://www.palantir.com/docs/foundry/code-examples/common-operations-functions-on-objects)
- [Palantir, Incremental transforms](https://www.palantir.com/docs/foundry/code-examples/incremental-transforms-transforms)
- [Palantir, Fuzzy matching](https://www.palantir.com/docs/foundry/code-examples/fuzzy-matching-transforms)
- [Palantir, Geospatial computation](https://www.palantir.com/docs/foundry/code-examples/geospatial-computation-transforms)
- [Palantir, Graph and tree transforms](https://www.palantir.com/docs/foundry/code-examples/graph-and-tree-structured-datasets-transforms)
- [Palantir, Graph and tree object Functions](https://www.palantir.com/docs/foundry/code-examples/graph-and-tree-structured-datasets-functions-on-objects)
- [Palantir, Notional generation](https://www.palantir.com/docs/foundry/code-examples/notional-data-generation-transforms)

## 관련 문서

- [[Palantir-Incremental-Transactions-and-Compaction|증분 transaction 계약]]
- [[Palantir-File-Parsing-and-Error-Outputs|파일 parsing]]
