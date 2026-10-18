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

날짜와 UTC timestamp는 형식 문자열, long/decimal도 문자열이다. object reference는 primary key JSON 값, interface reference는 objectTypeApiName과 primaryKeyValue 조합, object type reference는 API name이다. object set은 RID 또는 definition으로 표현한다. EntrySet은 key/value 배열이며 struct는 JSON object다. 이 직렬화 계약을 일반 JavaScript number나 RID 문자열 하나로 통일하지 않는다.

## 출처

- [Ontology basics](https://www.palantir.com/docs/foundry/api/ontology-resources/ontologies/ontology-basics)
- [List objects](https://www.palantir.com/docs/foundry/api/ontology-resources/objects/list-objects)
- [Filtering objects](https://www.palantir.com/docs/foundry/api/ontology-resources/objects/ontology-object-basics)
- [Get outgoing link type](https://www.palantir.com/docs/foundry/api/ontology-resources/object-types/get-outgoing-link-type)
- [Execute query](https://www.palantir.com/docs/foundry/api/ontology-resources/queries/execute-query)

## 관련 문서

- [[Palantir-Ontology-V1-Search-API]]
- [[Palantir-Ontology-V1-Action-API]]
- [[Palantir-API-Client-Contract]]
