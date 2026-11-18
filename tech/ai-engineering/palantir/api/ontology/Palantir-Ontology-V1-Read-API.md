---
tags: [palantir, foundry, api, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology V1의 메타데이터와 객체 조회

Ontology API의 개념은 object type, property, link type, action type이다. `GET /api/v1/ontologies`는 현재 사용자가 볼 수 있는 Ontology를 반환하며, RID를 지정해 개별 metadata를 조회한다. 새 Ontology는 수 분 동안 API에 반영되지 않아 `OntologyNotFound`가 날 수 있다.

## 식별자와 읽기 권한

이 문서의 metadata, object, query type 읽기는 OAuth2 `api:ontologies-read`를 요구한다. scope는 리소스의 접근 권한을 대신하지 않는다. Ontology RID와 type/property의 API name, object의 primary key를 구별한다. legacy object/property ID는 새 통합의 식별자로 선택하지 않는다.

Object type metadata에는 primary key, property map, status, visibility와 data type이 있다. visibility는 NORMAL/PROMINENT/HIDDEN이다. Link type API name은 object type 안에서만 유일하며, 양쪽 object type과 cardinality ONE/MANY, optional foreign key를 함께 확인한다.

Action type과 object type 목록의 기본 pageSize는 500이고 query type은 100이다. Action/query type 페이지는 요청보다 작을 수 있고 object type 페이지는 작거나 클 수 있다. 후속 결과가 있으면 적어도 한 항목은 들어온다는 설명이며, 요청 개수와 실제 길이의 일치를 전제로 하지 않는다.

## 객체와 연결 객체

`GET /objects/{objectType}/{primaryKey}`는 단일 object, 뒤에 `/links/{linkType}/{linkedObjectPrimaryKey}`를 붙이면 연결된 특정 object를 반환한다. 목적 object가 존재해도 실제 link가 없으면 `LinkedObjectNotFound`다.

Object 표현은 RID와 properties map이다. null property는 목록 응답에서 생략된다. properties 선택을 생략하면 Vector를 제외한 전체 property를 가져온다. comma 목록 또는 반복 query parameter로 선택하며 primary key는 항상 포함한다. 알 수 없는 property는 `PropertiesNotFound`다.

객체 목록과 연결 객체 목록은 페이지 사이 일관성을 보장하지 않는다. 동시 변경 때문에 객체가 빠지거나 중복될 수 있다. OSv1은 최대 10,000개이며 그 뒤 페이지는 `ObjectsExceededLimit`, OSv2에는 이 제한이 없다. 결과 크기만 보고 종료하지 않고 nextPageToken을 따른다.

목록의 orderBy는 `properties.lastName:asc,properties.age:desc` 형식이고 `p.` 축약도 가능하다. 방향 생략은 asc다. pageToken은 불투명 값이며 이어 읽는 동안 나머지 요청을 유지한다.

## GET 목록 필터

`properties.{propertyApiName}.{filter}=value` 형식이며 URL property name은 대소문자를 구분하지 않는다. `p.firstname.eq=John`도 가능하다.

| 조건 | 범위와 결합 |
|---|---|
| eq, neq | array와 attachment를 제외한 동일성 비교 |
| contains | array 원소 포함 |
| lt/lte/gt/gte | 날짜, timestamp와 수치 범위 |
| isNull | attachment를 제외한 null 여부 |

같은 property에 eq 또는 contains를 여러 번 쓰면 값 사이 OR, 범위 두 개를 쓰면 AND다. 서로 다른 property 조건도 함께 적용한다. JSON Search의 and/or 구조와 GET query parameter 문법을 혼용하지 않는다.

## Query Type과 실행

Query type은 Query Function으로 만든 로직이다. metadata는 API name, display name, description, parameter의 required/baseType, output type, function RID와 version을 제공한다. `POST /queries/{queryApiName}/execute`에 parameters를 전달하며 optional parameter는 생략할 수 있다. 응답은 단일 `value`이며 output type에 맞춰 해석한다.

### List Query Types 응답에서 선택 필드를 구분한다

2026-11-18 List Query Types 명세 대조 기준, `GET /api/v1/ontologies/{ontologyRid}/queryTypes`이며 버전 없는 문서 주소와 `/v1/` 주소의 명세 본문이 같다. pageSize(기본 100)와 pageToken만 query parameter이고 첫 요청에는 pageToken을 생략한다.

응답의 `data`와 `nextPageToken`은 모두 선택 필드다. QueryType에서 필수는 `apiName`, function `rid`, `version`뿐이고 description, displayName, parameters, output은 생략될 수 있다. version은 `<major>.<minor>.<patch>-<tag>` 형식이며 tag는 선택이다.

Parameter에서는 `baseType` 문자열과 `required` boolean이 필수이고 description과 `dataType`은 선택이다. baseType은 `Array<String>`, `OntologyObject<Employee>`, `Struct<...>`, `TimeSeries<Double>`처럼 중첩 가능한 문자열 표기다. dataType과 output은 date, struct, set, cipherText, marking 등을 담는 Ontology data type union으로 정의돼 있다. 명세의 응답 예시는 output을 `"Double"`, `"Array<OntologyObject<Employee>>"` 같은 문자열로 보여 스키마와 표현이 다르다.

클라이언트는 `data`가 없으면 빈 목록으로 처리하고, 선택 필드 부재를 오류로 보지 않는다. 실행 입력 검증은 항상 있는 baseType과 required를 기준으로 하고, output과 dataType은 실제 응답 형태를 확인한 뒤 해석한다(설계 제안).

### Get Query Type과 dataType union의 geohash

2026-11-18 Get Query Type 명세 대조 기준, 단건 조회는 `GET /api/v1/ontologies/{ontologyRid}/queryTypes/{queryApiName}`이고 scope는 `api:ontologies-read`다. path parameter는 Ontology RID와 query API name뿐이며 query parameter와 request body는 없다. 응답 body는 목록의 원소와 같은 QueryType 객체라 필수와 선택 필드 구분이 같다. 버전 없는 문서 주소와 `/v1/` 주소의 명세 본문은 같다.

2026-11-18 수집한 Get Query Type 명세는 parameter `dataType`과 `output` union, 그 안의 struct field, set/array 원소, map key/value 타입 union에 `geohash` variant를 더했다. 2026-10-19 수집본에는 없었다. 같은 날 수집한 List Query Types 명세도 dataType과 output에 같은 variant를 가진다. 단건과 목록 응답의 파서는 같은 data type 처리를 공유하고, 새 variant를 만나도 metadata 파싱 전체를 실패시키지 않는다(설계 제안). 같은 명세의 baseType 설명 표에는 geohash 표기가 없어 이 타입 parameter의 baseType 문자열은 확인하지 못했다. 이번 확인은 수집한 명세 본문 대조에 한정했고 실제 응답과 SDK 반영은 시험하지 않아 기존 `verified_at`을 유지한다.

### 실행 값의 직렬화

날짜와 UTC timestamp는 형식 문자열, long/decimal도 문자열이다. object reference는 primary key JSON 값, interface reference는 objectTypeApiName과 primaryKeyValue 조합, object type reference는 API name이다. object set은 RID 또는 definition으로 표현한다. EntrySet은 key/value 배열이며 struct는 JSON object다. 이 직렬화 계약을 일반 JavaScript number나 RID 문자열 하나로 통일하지 않는다.

### V1 실행 계약을 Global Query와 구분한다

2026-11-03 Execute Query 명세 부분 대조 기준, 전체 경로는 `POST /api/v1/ontologies/{ontologyRid}/queries/{queryApiName}/execute`다. 실행 요청이어도 OAuth2 operation scope는 `api:ontologies-read`이며, Global Query의 `api:functions-execute`와 혼용하지 않는다.

요청 body는 객체이고 `parameters`는 선택적인 `ParameterId`에서 `DataValue`로의 map이다. map의 선택 표시가 함수에 필요한 입력까지 없애지는 않는다. 클라이언트는 Query type metadata의 required 조건과 입력을 대조한다(설계 제안).

이 V1 명세에는 query parameter가 없고 body에는 `parameters`만 정의돼 있다. Global Query의 `branch`, `version`, `latestVersionResolution`을 이 경로에서도 지원한다고 가정하지 않는다. 응답의 필수 `value`와 DataValue의 `null` 값도 구분한다.

이번 확인은 V1 실행의 경로, scope와 요청/응답 계약에 한정했다. 실제 호출과 다른 조회 endpoint는 재검증하지 않아 기존 `verified_at`을 유지한다.

## 출처

- [Ontology basics](https://www.palantir.com/docs/foundry/api/ontology-resources/ontologies/ontology-basics)
- [List objects](https://www.palantir.com/docs/foundry/api/ontology-resources/objects/list-objects)
- [Filtering objects](https://www.palantir.com/docs/foundry/api/ontology-resources/objects/ontology-object-basics)
- [Get outgoing link type](https://www.palantir.com/docs/foundry/api/ontology-resources/object-types/get-outgoing-link-type)
- [Execute query](https://www.palantir.com/docs/foundry/api/ontology-resources/queries/execute-query)
- [List Query Types (v1)](https://www.palantir.com/docs/foundry/api/v1/ontology-resources/query-types/list-query-types) — 2026-11-18 응답 필드의 필수 여부 대조
- [Get Query Type (v1)](https://www.palantir.com/docs/foundry/api/v1/ontology-resources/query-types/get-query-type) — 2026-11-18 단건 조회 계약과 geohash variant 대조
- [Execute Query (v1)](https://www.palantir.com/docs/foundry/api/v1/ontology-resources/queries/execute-query) — 2026-11-03 V1 실행 계약 부분 대조
- [Execute Query (v2, Global)](https://www.palantir.com/docs/foundry/api/v2/functions-v2-resources/queries/execute-query) — 2026-11-03 Global Query의 scope와 버전 선택 인자 비교

## 관련 문서

- [[Palantir-Ontology-V1-Search-API]]
- [[Palantir-Ontology-V1-Action-API]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Query-Execution-API|Global Query의 버전 선택과 SSE 실행]]
