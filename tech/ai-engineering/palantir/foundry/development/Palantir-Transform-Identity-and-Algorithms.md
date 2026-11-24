---
tags: [palantir, transforms, identity, graph, incremental]
status: done
verified_at: 2026-11-25
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry transform 식별자와 알고리즘 계약"]
---

# Transform 식별자와 알고리즘 계약

공식 code example은 구현 아이디어를 제공하지만 문법, 데이터 분포와 상태 전제까지 보장하는 production 계약은 아니다. 아래는 2024년 제출 예제를 2026년 10월 본문과 대조한 결과이고, 날짜를 따로 적은 단락은 그 날짜의 본문 기준이며 실제 Foundry runtime에서 실행하지 않았다.

## Stable key는 직렬화 규칙까지 안정적이어야 한다

Ontology primary key는 unique/non-null/stable해야 한다. 매 build random/monotonic ID를 만들면 같은 실체의 edit 연결과 변경 추적이 흔들린다. 자연키가 될 field를 결합하고 필요하면 hash로 고정 길이 식별자를 만든다.

`concat_ws`와 SHA-256 자체가 uniqueness를 만들지는 않는다. Delimiter가 값에 포함되는 경우, null 처리, type/순서와 정규화를 고정하고 중복 검사를 한다. Hash는 이미 충돌한 serialization을 복구하지 못한다. 계층 node ID도 level+이름만으로 충분한지, 다른 parent 아래 같은 이름이 가능한지 확인해 path를 포함한다.

Notional generation은 synthesizer field spec과 row count로 자료를 만든다. Seed와 key 충돌을 별도로 통제하며 synthetic임을 명시한다. Fake data의 정상 흐름만으로 결측/중복/경계값 검증을 대체하지 않는다.

2026-11-24 본문 기준으로 2024-03-26 제출 예제는 `DataFrameTransformOrchestrator`에 spec, row 수 10,000과 Spark session만 넘기며 seed 인자는 보이지 않는다. 같은 code를 다시 build했을 때 같은 값이 나온다고 가정하지 않는다. `pk`는 `level_1`~`level_4`를 `concat_ws("__", ...)`로 이은 값인데 각 level이 0~9, 0~19, 0~49, 0~99에서 무작위로 뽑히므로 가능한 조합은 100만 개다. 조합이 균등하게 뽑힌다고 가정하면 10,000행에서 같은 조합을 가진 행 쌍의 기댓값은 약 10,000×9,999/2÷1,000,000 ≈ 50쌍이라 중복 key가 거의 확실히 생긴다. 이 열을 primary key로 쓰려면 중복을 제거하거나 row 번호 같은 고유 값을 붙이고 uniqueness 검사를 둔다. 예제는 이름, 전화번호, 주소처럼 실제와 비슷한 값을 만들고, `ThisIsFakeData` 열도 값은 `first_name` 출력이라 합성임은 열 이름으로만 드러난다. 뒤 단계에서 그 열을 빼면 표시가 사라지므로 행 단위 flag나 dataset 수준의 표시로 synthetic임을 남기는 편이 안전하다(예제가 설명하지 않는 판단이다). import 뒤에 놓인 문자열 주석의 `synthetizer` 표기와 import의 `synthesizer`가 다르므로 library 이름은 import 기준으로 확인한다. 2026년 10월 본문과 비교하면 위 2026-11-24 본문은 설명에 이 예제가 Spark에서 돈다는 문장을 더했고, 쓰지 않던 `configure` import를 지웠으며, 특정 project 경로였던 output을 `/<your project>/generated_data` placeholder로, 함수 이름을 `generate_data`로 바꾼 판이다(2026-11-25 재확인). 생성 로직, row 수와 `pk` 구성은 그대로라 위의 중복 key 판단도 유지된다.

## Incremental은 누적 가능한 연산을 요구한다

`ctx.is_incremental`로 분기하고 schema와 함께 previous output을 읽어 replace할 수 있다. 그러나 batch별 `count_distinct` 합은 transaction 사이 재등장한 값을 중복 집계한다. 전역 distinct에는 key state/중복 제거 또는 재계산이 필요하다.

Snapshot input과 previous output을 primary key left-anti join해 새 key만 append하는 패턴은 기존 key의 update/delete를 반영하지 않는다. Append-only identity 조건을 명시한다. 2026년 10월 본문과 비교하면 2026-11-25에 확인한 incremental helper 예제는 `if ctx.is_incremental:`/`else:` 두 분기에 주석만 있어 Python 문법 오류였던 이전 판을 `pass` placeholder로 고쳤다. 분기 골격만 보여 줄 뿐 분기별로 input을 어떻게 다르게 읽는지는 담지 않고, import 줄도 없어 그대로는 실행되지 않는다. Empty input abort가 input pointer를 전진시키는지는 공식 문서끼리 어긋난다. 증분 성능 문서는 abort된 build를 성공으로 보고 pointer를 전진시킨다고 적지만, Abort transactions 문서는 incremental transform에서 job 전체를 abort하면 다음 build가 그 transaction이 없었던 것처럼 input을 다시 읽는다고 적는다. 버리면 안 되는 input에서 abort에 기대지 말고 실제 build로 다음 read 범위를 확인한다.

Multi-input/output은 `@transform`에 이름을 명시하고 각 output에 직접 write한다. 반환 하나를 쓰는 `transform_df`와 구분한다. Empty dataframe이라는 예제도 실제 dummy row 하나와 timestamp를 만들므로 row 수와 heartbeat 의미를 확인한다.

2026-11-25 본문 기준으로 empty input abort, empty dataframe, multi-input/output 세 예제는 Spark `@transform`에서 lightweight `@transform.using`과 Polars로 바뀌었다. ORC 읽기와 fuzzy matching 예제는 여전히 Spark다. Abort 예제는 `source_df.polars()`의 `is_empty()`로 확인한 뒤 `out.abort()` 대신 `ctx.abort_job()`을 호출한다. `abort_job()`은 job 실행을 끝내고 모든 output transaction을 중단하므로, output이 하나일 때는 결과가 같아도 output이 여럿인 transform에 옮기면 output 하나만 건너뛰는 처리가 아니다. Lightweight output API에는 output 단위 `abort()`가 없어 job 전체 중단만 쓸 수 있고, Abort transactions 문서도 증분 build에서 output 일부만 abort하면 증분 상태가 깨지므로 `abort_job`을 권한다. `polars()`의 `lazy` 기본값은 `False`라 이 확인은 input의 전체 view를 eager DataFrame으로 읽는다. 예제는 그 DataFrame을 그대로 쓰므로 낭비가 없지만, 비어 있는지만 보고 다른 데이터를 쓰는 transform에 옮기면 읽기 비용이 커진다. 이전 Spark 판은 `head(1)`로 한 행만 확인했다.

같은 날 multi-input/output 예제는 `pl.concat([input_df_1, input_df_2.select(input_df_1.columns)], how="vertical_relaxed")`로 합친다. `select`는 input 2를 input 1의 column 목록으로 맞추므로 input 2에만 있는 column은 조용히 빠지고, input 1의 column이 input 2에 없으면 이 단계에서 실패한다. `vertical_relaxed`는 type이 어긋난 column을 공통 supertype(예: Int32와 Int64는 Int64)으로 바꾸므로 공통 supertype이 있는 type 차이는 넓은 type으로 흡수된다. Schema 계약이 필요하면 concat 전에 column 집합과 type을 검사한다. `processed_at`은 `pl.lit(datetime.now(timezone.utc))`라 Python이 실행 시점에 한 번 계산한 UTC 시각이 모든 행에 들어간다. 주석은 `@transform_df` 대신 `@transform`을 쓰라고 하지만 코드는 `@transform.using`이므로 decorator는 코드 기준으로 읽는다.

## Matching과 spatial join은 후보 생성이다

이름 정제→token explode→Soundex blocking→후보 join→Jaro similarity는 비교 비용을 줄이는 흐름이다. 언어/철자별 true match 누락과 false positive를 검증하고 예시 threshold 0.75를 업무 기준으로 고정하지 않는다.

Fuzzy snippet에는 decorator/인자 이름 불일치, select comma 누락과 다른 dataframe의 score 참조가 있다. Null-safe 정제와 numeric UDF return type도 확인한다. 설명을 실행 가능한 코드로 간주하지 않는다.

2026-11-25 본문 기준 개정판은 함수 인자를 decorator의 `entities2`, `entities1`로 맞추고 select의 comma를 채웠다. 그러나 filter는 여전히 정의되지 않은 `entities.match_score`를 참조하므로 그대로는 실행되지 않으며 `F.col("match_score")`처럼 고쳐야 한다. `@F.udf()`는 return type을 주지 않으면 StringType이므로 Jaro 점수는 문자열 column이 되고 `> 0.75` 비교는 Spark의 암묵 형변환에 맡겨진다. `DoubleType`을 명시하는 편이 비교 의미가 분명하다. `clean_text`도 null 입력에서 `re.sub`가 실패한다. Spark는 UDF 호출에 조건식의 short circuit을 보장하지 않으므로 `if text is None: return None` 같은 guard를 UDF 안에 둔다.

Shapefile은 `.shp`와 `.prj`/`.cpg` 등 sidecar를 같이 읽고 원 CRS를 확인해 EPSG:4326으로 변환한다. Centroid/geohash와 buffer join은 좌표축/거리 단위/invalid geometry를 검증한다. 30km는 예시이며 left join 미매칭 null을 보존할지 결정한다.

## Tree는 방향과 방문 집합을 검증한다

Flattening은 node/parent/level/path와 stable key로 self-link를 구성한다. Tree/DAG, 다중 parent와 cycle의 허용 여부를 정한다. Partition별 pandas/NetworkX는 연결된 component가 같은 partition에 있어야 관계를 잃지 않고 가장 큰 group은 worker memory에 들어가야 한다.

Vertex BFS 예제는 loop에서 `currentNode` 대신 root인 `exampleObject.child`를 읽어 깊은 tree를 탐색하지 못한다. 현재 node child와 stable RID visited가 필요하다. 결과 interface는 direct/intermediate edge, orphan RID와 grouping을 표현한다.

2026-11-24 transform 예제 본문에서 NetworkX 준비 단계의 vertex 행은 `F.lit(None).cast(T.StringType())`로 빈 `child_id`를 만들어 edge 행과 `unionByName`한다. 두 종류의 행을 같은 schema로 합친 뒤 `_partition_column`별 `applyInPandas`에서 `type`으로 다시 나누는 구조다. Descendant는 `nx.bfs_tree(g, source)`의 node 목록에서 첫 원소(source)를 뺀 값이고, 나가는 edge가 없는 node는 None이다. Ancestor는 `edge_dfs(..., orientation="reverse")`가 내는 `(parent, child, 방향)` 3-tuple에서 parent만 모으고 빈 배열은 Spark 단계에서 null로 바꾼다. 따라서 둘 다 없음은 null이다. Parent가 하나인 tree에서는 역방향 탐색이 한 사슬이라 ancestor가 가까운 parent부터 root 순으로 나오며, `parents_path`의 root부터 가까운 parent 순과 반대다. 다중 parent를 허용하는 DAG에서는 DFS 탐색 순서라 경로가 아니고 같은 조상이 여러 번 나올 수 있으므로 중복 제거 여부를 정한다. 그래프는 `add_edges_from`으로만 만들므로 parent와 child가 모두 없는 고립 vertex는 `g`에 없다. 이런 vertex를 `edge_dfs`의 source로 넘기기 전에 `g.has_node(source)`로 거른다.

Flatten 예제의 `parent_pk`는 `concat_ws("__", parent_level, parent_id)`인데 Spark의 `concat_ws`는 null을 건너뛰므로 최상위 node의 `parent_pk`는 null이 아닌 빈 문자열이 된다. Self-join이나 Ontology link에서 빈 문자열을 null과 같게 볼지 정한다. 또 `parents_path`는 자기 level column까지 넣어 만들므로 열 설명의 부모 id 배열과 달리 자기 자신을 포함하고, 최상위 node는 빈 배열이다. 열 설명 dictionary도 `parent_level`을 사람이 읽는 식별자로 적고 생성한 `title` 열은 설명하지 않아, 설명 문자열을 schema 계약으로 그대로 쓰지 않는다.

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
- [Palantir, LightweightInput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightinput)
- [Palantir, LightweightContext](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightcontext)
- [Palantir, LightweightOutput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightoutput)
- [Palantir, Abort transactions](https://www.palantir.com/docs/foundry/transforms-python/abort-transactions/)
- [Palantir, Maintaining incremental performance](https://www.palantir.com/docs/foundry/building-pipelines/maintaining-incremental-performance)
- [Polars, polars.concat](https://docs.pola.rs/api/python/stable/reference/api/polars.concat.html)
- [Apache Spark, pyspark.sql.functions.udf](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.udf.html)
- [Apache Spark, SQL string functions concat_ws](https://spark.apache.org/docs/latest/api/sql/string-functions/#concat_ws)
- [NetworkX, edge_dfs](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.traversal.edgedfs.edge_dfs.html)
- [NetworkX, bfs_tree](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.traversal.breadth_first_search.bfs_tree.html)

## 관련 문서

- [[Palantir-Incremental-Transactions-and-Compaction|증분 transaction 계약]]
- [[Palantir-File-Parsing-and-Error-Outputs|파일 parsing]]
