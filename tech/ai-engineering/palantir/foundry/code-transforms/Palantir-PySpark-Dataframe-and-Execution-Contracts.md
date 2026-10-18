---
tags: [palantir, foundry, pyspark, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["PySpark DataFrame과 실행의 경계"]
---

# PySpark DataFrame과 실행의 경계

PySpark DataFrame은 local Python list가 아니라 lazy query plan이다. Column expression으로 전체 데이터의 규칙을 만들고 action 때 cluster가 실행한다. Local Python 변수 변경이 executor의 공유 state를 자동 바꾸지 않으며 broadcast/accumulator도 별도 의미를 가진다.

## Column, schema와 행수

F.col은 현재 연산의 column을 참조하고 df.column은 특정 DataFrame에 묶인다. Join처럼 이름이 겹칠 때는 alias로 구분하고 output 전 ambiguity를 없앤다. Select는 column subset/순서를 고정하고 alias/cast로 contract를 드러낸다. Literal은 F.lit, missing value는 typed F.lit(None)로 표현한다.

Python and/or는 Column을 single boolean으로 평가할 수 없어 &/|/~와 괄호를 쓴다. Filter의 True 여부, when의 first-match와 otherwise 없는 null, null과 NaN을 따로 고려한다. Between는 양끝 inclusive, substring은1-based, SQL LIKE의 %/_와 regex는 다른 matching 언어다.

Join key list는 공통 key column을 하나로 정리하지만 arbitrary predicate는 양쪽 key가 남을 수 있다. Right key가 유일하지 않으면 left row가 늘어나므로 row count/key uniqueness를 검증하고 distinct로 원인을 가리지 않는다. Cross join은 이 reference에서 CROSS_JOIN_ENABLED profile을 요구한다.

Aggregate는 group별 row로 축약하고 window는 원래 row를 보존한다. Window의 partition/order/frame과 tie를 지정하지 않으면 전체 group average와 running average를 혼동할 수 있다. Pivot의 category 수와 output schema도 확인한다. F.count(column)과 count(*)의 null 의미, first/last 대표 row의 순서를 구분한다.

## Driver와 UDF

Collect는 전체를 driver로 옮기므로 큰 dataset은 OOM 위험이 있다. Take/head/show도 action과 data movement 비용이 있으므로 디버깅에 필요한 양만 제한한다. Style guide의 무조건 avoid는 의견이며 작은 scalar/preview 검토까지 기술적으로 불가능하다는 뜻은 아니다.

Python UDF는 executor로 code와 값을 직렬화해 실행하므로 native expression보다 비용이 클 수 있다. Return Spark type과 null/error 입력을 명시한다. UDF 내부 log는 top-level driver log에 자동 포함되지 않아 제한된 debug column/지원 도구를 활용하되 원본 민감값을 불필요하게 저장하지 않는다. Plan의 explain과 row count는 실행/성능 조사 근거이지 전체 데이터 정확성 증명은 아니다.

## Style 안내와 원문 오류

Column helper를 조합하고 input/output select를 명시하면 재사용과 schema 검토가 쉽다. 한 번의 select/list comprehension은 많은 withColumnRenamed chain으로 커진 plan을 줄일 수 있다. Python loop 자체가 모두 cluster의 순차 실행이라는 style-guide 설명은 일반 원리로 받아들이지 않는다.

Style guide는 Column 계산을 마지막 select에 붙이라는 조언과 새 column은 withColumn을 권한다는 조언을 함께 싣는다. 팀의 가독성과 plan 복잡도로 선택하고 이를 engine의 강제 제약으로 문서화하지 않는다. Empty array 예시에 F.array(F.lit(""))를 쓴 것은 실제로 empty-string element 하나이며, struct explode/없는 column drop 실패/잘못된 max/window code 등도 그대로 compile 보장이 아니다.

Dates guide는 milliseconds를 seconds로 환산하는 예시 뒤 SQL이 subsecond를 저장하지 못한다고 주장하지만 같은 corpus의 timestamp/window 예시는 microsecond를 지원한다. 정밀도 제한은 해당 conversion/format 경로에 한정해 검증하고 Timestamp 전체의 제한으로 채택하지 않는다. Aggregation 예시의 input speed6→output7도 source 오기다.

## 부가 metadata, 모델과 connector

Output column_descriptions는 최대800자이고 실제 DataFrame column과 key의 교집합만 적용한다. Typeclass는 column→list of {name,kind}이며 설명과 함께 write_dataframe에 넘길 수 있다. Repository YAML/CSV를 쓰려면 package_data로 artifact에 포함하고 resource_stream 등 package 경로로 읽는다.

Palantir model input은 AIP enablement와 palantir_models/language-model-service-api가 필요하다. Model-specific 또는 generic chat/embedding input을 transform에 선언하고 SDK request/response를 쓴다. Pandas apply 예시는 data를 driver memory에 모으는 경로이므로 distributed LLM throughput의 보장이 아니다. Ontology vector는 Float array cast를 명시한다. Lightweight에서도 model input을 지원한다.

FoundryConnector는 service config/auth header와 alias resolver/fallback으로 input/output을 구성한다. Alias 또는 RID 중 하나를 지정하고 input branch 미지정은 Catalog에 존재하는 첫 fallback, output은 첫 fallback을 선택한다고 구분한다. End transaction/schema 미지정은 latest이므로 반복 run의 고정 snapshot을 보장하지 않는다. Credential을 보호하고 실제 target/range를 확인한다.

Velox는 backend=VELOX와 off-heap profile을 쓰며 fractional profile에는 executor-memory profile도 필요하다. HIGH로 시작하라는 안내는 실험 출발점이고 모든 workload의 성능 향상 보장이 아니다. 상세 API index는 class/decorator 링크 목록이며 연결 API 전부를 이28페이지 범위에서 새로 읽은 것으로 세지 않는다. 실제 Spark job/model 호출은 실행하지 않았다.

## 출처

- [Palantir Python Spark, transforms-python-spark](https://www.palantir.com/docs/foundry/transforms-python-spark)
- [Palantir Python Spark, output-column-metadata](https://www.palantir.com/docs/foundry/transforms-python-spark/output-column-metadata)
- [Palantir Python Spark, overview](https://www.palantir.com/docs/foundry/transforms-python-spark/overview)
- [Palantir Python Spark, palantir-provided-models](https://www.palantir.com/docs/foundry/transforms-python-spark/palantir-provided-models)
- [Palantir Python Spark, pyspark-aggregation](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-aggregation)
- [Palantir Python Spark, pyspark-columns](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-columns)
- [Palantir Python Spark, pyspark-coming-from-python](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-coming-from-python)
- [Palantir Python Spark, pyspark-dates](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-dates)
- [Palantir Python Spark, pyspark-filtering](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-filtering)
- [Palantir Python Spark, pyspark-joins](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-joins)
- [Palantir Python Spark, pyspark-logging](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-logging)
- [Palantir Python Spark, pyspark-math](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-math)
- [Palantir Python Spark, pyspark-other](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-other)
- [Palantir Python Spark, pyspark-overview](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-overview)
- [Palantir Python Spark, pyspark-queries](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-queries)
- [Palantir Python Spark, pyspark-strings](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-strings)
- [Palantir Python Spark, pyspark-style-guide](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-style-guide)
- [Palantir Python Spark, pyspark-syntax-cheat-sheet](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-syntax-cheat-sheet)
- [Palantir Python Spark, pyspark-udfs](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-udfs)
- [Palantir Python Spark, pyspark-window](https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-window)
- [Palantir Python Spark, read-files-repository](https://www.palantir.com/docs/foundry/transforms-python-spark/read-files-repository)
- [Palantir Python Spark, transforms-python-api](https://www.palantir.com/docs/foundry/transforms-python-spark/transforms-python-api)
- [Palantir Python Spark, transforms-python-api-classes](https://www.palantir.com/docs/foundry/transforms-python-spark/transforms-python-api-classes)
- [Palantir Python Spark, transforms-python-foundry-connectors](https://www.palantir.com/docs/foundry/transforms-python-spark/transforms-python-foundry-connectors)
- [Palantir Python Spark, velox-overview](https://www.palantir.com/docs/foundry/transforms-python-spark/velox-overview)

- [Palantir Python transforms, output-column-metadata](https://www.palantir.com/docs/foundry/transforms-python/output-column-metadata)

- [Palantir Python transforms, palantir-provided-models](https://www.palantir.com/docs/foundry/transforms-python/palantir-provided-models)

- [Palantir Python transforms, pyspark-aggregation](https://www.palantir.com/docs/foundry/transforms-python/pyspark-aggregation)

- [Palantir Python transforms, pyspark-columns](https://www.palantir.com/docs/foundry/transforms-python/pyspark-columns)

- [Palantir Python transforms, pyspark-coming-from-python](https://www.palantir.com/docs/foundry/transforms-python/pyspark-coming-from-python)

- [Palantir Python transforms, pyspark-dates](https://www.palantir.com/docs/foundry/transforms-python/pyspark-dates)

- [Palantir Python transforms, pyspark-filtering](https://www.palantir.com/docs/foundry/transforms-python/pyspark-filtering)

- [Palantir Python transforms, pyspark-joins](https://www.palantir.com/docs/foundry/transforms-python/pyspark-joins)

- [Palantir Python transforms, pyspark-logging](https://www.palantir.com/docs/foundry/transforms-python/pyspark-logging)

- [Palantir Python transforms, pyspark-math](https://www.palantir.com/docs/foundry/transforms-python/pyspark-math)

- [Palantir Python transforms, pyspark-other](https://www.palantir.com/docs/foundry/transforms-python/pyspark-other)

- [Palantir Python transforms, pyspark-overview](https://www.palantir.com/docs/foundry/transforms-python/pyspark-overview)

- [Palantir Python transforms, pyspark-queries](https://www.palantir.com/docs/foundry/transforms-python/pyspark-queries)

- [Palantir Python transforms, pyspark-strings](https://www.palantir.com/docs/foundry/transforms-python/pyspark-strings)

- [Palantir Python transforms, pyspark-style-guide](https://www.palantir.com/docs/foundry/transforms-python/pyspark-style-guide)

- [Palantir Python transforms, pyspark-syntax-cheat-sheet](https://www.palantir.com/docs/foundry/transforms-python/pyspark-syntax-cheat-sheet)

- [Palantir Python transforms, pyspark-udfs](https://www.palantir.com/docs/foundry/transforms-python/pyspark-udfs)

- [Palantir Python transforms, pyspark-window](https://www.palantir.com/docs/foundry/transforms-python/pyspark-window)

- [Palantir Python transforms, read-files-repository](https://www.palantir.com/docs/foundry/transforms-python/read-files-repository)

- [Palantir Python transforms, transforms-python-foundry-connectors](https://www.palantir.com/docs/foundry/transforms-python/transforms-python-foundry-connectors)

- [Palantir Python transforms, velox-overview](https://www.palantir.com/docs/foundry/transforms-python/velox-overview)

## 관련 문서

- [[Palantir-Code-Transforms]]
- [[Palantir-Pipeline-Execution-and-Replay]]
