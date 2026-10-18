---
tags: [palantir, foundry, api, ontology, sql, object-set]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 온톨로지 SQL API"]
---

# Ontology SQL의 동기 실행과 Object Set 입력

`POST /api/v2/sqlQueries/executeOntology`는 Ontology에 SQL을 실행하고 Apache Arrow 형식으로 동기 반환한다. Preview이므로 `preview=true`가 필요하며 변경/제거될 수 있다. OAuth2 scope는 `api:sql-queries-execute`와 `api:ontologies-read` 모두다.

## 질의 문맥과 typed parameter

body의 필수 필드는 `query`다. optional `rowLimit`은 최대 반환 행 수, `dryRun`은 실행 없이 parse/validate하며 기본 false다. `branch`를 생략하면 기본 main 브랜치, `scenarioRid`를 생략하면 scenario를 적용하지 않는다. 데이터셋 SQL의 fallbackBranchIds/master 설명을 이 endpoint에 혼용하지 않는다.

`ontologyIdentifier`는 ontology RID 또는 API name이다. `tableProviders`로 SQL table name을 ObjectSet 정의에 연결하려면 ontologyIdentifier도 반드시 제공해야 한다. schema의 optional 표시만 읽으면 이 조건부 필수 관계를 놓친다.

parameters는 순서 있는 `unnamedParameterValues.values` 또는 `namedParameterMapping.mapping`이다. 값은 단순 JSON scalar 모음이 아니라 type을 가진 union이다.

- date/timestamp는 해당 날짜 형식 문자열, long/decimal도 문자열 값이다. integer/short, float/double과 boolean은 각 숫자/boolean 표현을 쓴다.
- null은 별도 유형이며 any는 비정형 value를 담는다. parameter value 유형에는 binary가 없지만 column type에는 binary가 있다.
- list는 동일 type의 값들로 구성하며 elementType도 갖는다. map은 문자열 key에서 typed value로 매핑한다.
- struct는 이름과 값을 가진 순서 있는 element들이다. 이름은 struct field RID 또는 key로 구분한다. 재귀 list/map/struct를 평탄화하지 않는다.

## Table provider로 전달하는 ObjectSet

ObjectSet은 base object type API name, interfaceBase, static object RID 목록, 저장된 reference에서 출발할 수 있다. link/interfaceLink searchAround, union/intersect/subtract, filter, asType, asBaseObjectTypes 등으로 조합한다.

asType은 지정 type과 맞지 않거나 interface를 구현하지 않는 object를 결과에서 제거한다. interfaceBase는 기본적으로 interface에 대응하는 property만 보이므로 `includeAllBaseObjectProperties` 또는 asBaseObjectTypes와 의미를 구별한다. methodInput과 withProperties는 experimental이며 일반 지원으로 단정하지 않는다.

nearestNeighbors는 ANN 검색을 설정한 vector property에만 적용된다. query vector는 저장된 vector와 차원이 같아야 하며, text query는 해당 property의 embedding model로 자동 임베딩한다. numNeighbors는 1~500, optional similarityThreshold는 0~1이다. relevance 순서에서 score를 얻을 수 있지만 일반 object set과 union/intersect/subtract로 합치면 score가 반환되지 않을 수 있다.

## Derived property의 집계와 선택

withProperties는 추가 derived property 이름과 정의를 연결한다. 산술 add/subtract/multiply/divide/negate/absoluteValue, least/greatest, date/timestamp의 DAYS/MONTHS/QUARTERS/YEARS 추출과 property 참조를 지원하는 구조다.

selection은 MethodObjectSet에 대한 count/sum/min/max/avg, approximateDistinct/exactDistinct, approximatePercentile, get, collectList/collectSet을 담는다. MANY 쪽 link에서 get을 쓰면 cardinality가 늘어나므로 오류가 나며 collectList/collectSet을 사용하도록 명세가 설명한다.

collectList와 collectSet의 limit 상한은 100이다. property가 없는 object는 제외되어 non-null 값만 반환하며 아무 값도 없으면 빈 목록이다. 반환 목록 길이를 전체 개수로 간주하지 않고 별도 count 또는 cardinality 집계를 사용한다. exactDistinct는 approximate 방식보다 느릴 수 있다.

## Filter를 구성할 때의 경계

여러 filter는 `field` 또는 `propertyIdentifier` 중 하나를 지정하며 둘을 동시에 쓰지 않는다. property selector는 API name, struct field, title/primary key, propertyWithLoadLevel을 구분한다. load level은 배열 reducer 적용, struct main value 추출, 둘 다 적용 또는 noLoadLevel이다. 적용 불가능한 type이면 무시되며 selector는 experimental이고 filter/sort에서 동작하지 않을 수 있다.

비교 lt/lte/gt/gte/eq, in, contains, isNull과 and/or/not을 조합할 수 있다. **in의 빈 배열은 모든 object를 매칭한다.** 빈 선택을 결과 없음으로 바꾸고 싶다면 호출 측에서 따로 처리해야 한다. string의 eq/in full term matching은 Ontology Manager의 Selectable 설정이 필요하다.

텍스트 조건은 wildcard, regex, containsAllTerms/containsAnyTerm, 순서 있는 term 조건, interval을 구분한다. regex는 non-analyzed text, interval은 analyzed text에 적용된다. startsWith는 이름이 부정확한 deprecated alias이며 containsAllTermsInOrderPrefixLastTerm이 권장된다. SQL 일반 prefix 연산과 동일하다고 가정하지 않는다.

interval은 allOf/anyOf/match, 마지막 token prefix, fuzzy를 조합한다. ordered와 maxGaps로 순서/간격을 제어하며 fuzzy edit distance는 0/1/2, 기본 2다. term 조건의 optional fuzzy와는 서로 다른 구조다.

relativeDateRange는 질의 실행 시각을 기준으로 지정 timezone의 자정으로 반올림한다. start는 포함, end는 제외이며 DAY/WEEK/MONTH/YEAR offset을 쓴다. 음수는 과거다. UTC 자정이나 고정 시간 차이로만 변환하면 날짜 경계가 달라진다.

공간 filter는 distance+unit, bounding box, polygon의 포함/교차/비교차를 지원한다. GeoJSON 좌표 순서는 경도, 위도이며 optional 세 번째 높이가 올 수 있다. geoShapeV2는 envelope 또는 GeoJSON 문자열과 INTERSECTS/DISJOINT/WITHIN/CONTAINS를 지정한다. GeoJSON의 geometry 객체와 문자열 입력을 혼동하지 않는다.

## 실행 오류가 알려주는 제약

Ontology SQL은 Object Storage V1에 색인한 object/link type과 호환되지 않는다. `OntologyQueryInvalidObjectBackend`이면 V2 이전 또는 대상 제외가 필요하다. nested object set이 너무 크면 joins/link lookup/subquery 범위를 줄이고, `OntologyQueryNestedObjectSetTooLarge`의 실제/허용 개수를 확인한다.

`OntologyQueryStringColumnTooLong`은 결과의 cell 크기 제한이다. column 제외/필터 또는 row 범위 축소를 검토한다. `OntologyObjectTypeNotFound`는 존재하지 않음과 요청자에게 보이지 않음을 함께 포함한다. 파싱 오류, 일반 OntologyQueryFailed와 실행 권한 오류를 구분한다.

이 endpoint의 공개 명세를 확인한 것이며 SQL dialect 전체, enrollment 지원 여부와 실행 성능은 시험하지 않았다. Arrow 응답에는 데이터셋 SQL의 queryId polling 수명주기를 덧붙이지 않는다.

## 출처

- [Palantir, Execute Ontology SQL Query](https://www.palantir.com/docs/foundry/api/sql-queries-v2-resources/sql-queries/execute-ontology-sql-query)

## 관련 문서

- [[Palantir-SQL-Query-API]]
- [[Palantir-API-Client-Contract]]
