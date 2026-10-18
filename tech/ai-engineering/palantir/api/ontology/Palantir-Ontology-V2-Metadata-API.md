---
tags: [palantir, foundry, api, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology V2의 타입, Interface와 Query metadata

V2 경로의 `{ontology}`는 API name 또는 RID다. `GET /api/v2/ontologies`는 현재 사용자에게 보이는 Ontology 목록을 반환한다. 새 Ontology 반영에는 수 분이 걸릴 수 있다. metadata와 Query 실행의 OAuth2 scope는 `api:ontologies-read`다.

## Object type, Action type과 bulk 읽기

Object/Action type은 API name으로 읽고 Action은 byRid 경로도 제공한다. Object type fullMetadata, object/action getByRidBatch와 outgoing link getByRidBatch는 Preview여서 `preview=true`가 필요하며 변경/제거될 수 있다.

Bulk 상한은 100개다. 없는 type이나 권한 없는 type은 응답에서 조용히 빠진다. 입력 순서와 출력 수가 같다고 가정하지 않고 RID/API name으로 대응시킨다. outgoing link bulk는 선택적으로 link RID로 필터링하고 object type RID별 visible link 목록을 반환한다.

Object type 목록은 요청 pageSize보다 작거나 클 수 있다. Action/object metadata 기본 pageSize는 500, query type은 100이다. Token 기반으로 끝까지 읽으며 metadata 목록에 data source가 항상 들어온다고 가정하지 않는다.

## Property type과 표시 정보

Property metadata는 재귀 dataType, RID, status, visibility, value type과 typeClasses를 구분한다. typeClasses의 kind/name은 애플리케이션이 해석할 추가 metadata다. deprecated status는 message/deadline/replacedBy를 제공하며 example은 가상 데이터로 실제 workflow에 쓰지 않는다.

Struct는 field API name/RID/type과 mainValue를, array는 순서 있는 reducer를 가질 수 있다. reducer는 ASCENDING_NULLS_LAST/DESCENDING_NULLS_LAST와 선택적 struct field를 사용한다. Vector는 dimension, COSINE_SIMILARITY/DOT_PRODUCT/EUCLIDEAN_DISTANCE별 검색 색인과 optional embedding model을 갖는다. embedding은 LMS model 또는 Foundry Live Deployment의 input/output parameter 연결이다.

`dataConstraints.nullability`는 mapped data source와 Action 생성 값의 NULLABLE/NOT_NULLABLE 계약이다. data source mapping에 없는 객체에서는 여전히 null을 관찰할 수 있어 조회 결과 전체의 non-null 보장으로 확대하지 않는다.

Experimental `valueFormatting`은 표시 규칙이며 저장 값을 바꾸는 연산이 아니다. 날짜의 pattern/localized format, timestamp의 고정/user timezone, boolean의 true/false 문구, 알려진 user/resource/artifact ID 표현을 구분한다. 수치는 precision/grouping/rounding/notation에 duration, fixed values, affix, scale, currency, standard/custom unit과 ratio를 조합한다. PERCENTAGE/PER_MILLE/BASIS_POINTS는 각각 100/1,000/10,000 배 표시이므로 원문 수치에 다시 적용하지 않는다.

## Backing datasource를 해석하기

`includeDatasources=true`로 읽거나 loadOntologyMetadata가 반환하는 datasources는 사용자가 볼 수 있는 source만 포함한다. 빈 목록은 source 자체가 없다는 증거가 아니다. Object type aliases도 listObjectTypes에서는 항상 비며 개별 읽기로 확인한다. 문서가 get-by-RID read paths를 언급하면서 getObjectTypeV2를 예로 드는 등 명칭이 혼재하므로 실제 경로 계약을 따른다.

| definition | 연결 정보와 경계 |
|---|---|
| dataset, table, stream | backing RID, 선택적 branch와 property mapping |
| restrictedView | view RID와 mapping |
| timeSeries, geotimeSeries | sync/integration RID와 연결 property 목록 |
| mediaSetView | media view 정보와 연결 property 목록 |
| direct | 별도 direct-write source RID와 mapping |
| editsOnly | backing resource 없이 모든 값을 Action으로 채움 |
| unsupported | underlying discriminator와 표현 가능한 property 목록 |

Mapping은 column, struct field mapping, editOnly로 나뉜다. editOnly property는 tabular source의 권한을 받지만 값은 Action으로 채운다. editsOnly datasource는 source 자체가 없으며 다른 datasource와 공존할 수 없다. direct는 writer가 쓰는 backing source가 있으므로 editsOnly와 다르다. 표현할 수 없는 mapping은 빠지고 unknown datasource의 properties는 비어 있을 수 있다.

## Interface 상속과 구현

Interface GET/list는 Preview다. properties/allProperties는 shared property 기반만, propertiesV2/allPropertiesV2는 interface에 직접 정의한 property도 포함한다. all 계열에는 직접/간접 상속이 반영된다. extendsInterfaces와 allExtendsInterfaces도 같은 차이다.

required 또는 requireImplementation은 각 object type이 구현을 선언해야 한다는 뜻이다. property 값이 항상 존재한다는 뜻과 구별한다. FullMetadata의 implementsInterfaces2는 local property, struct field, struct mapping, reducer 적용 구현을 표현한다. reduced implementation 안에 또 reduced implementation을 무한 중첩하는 구조는 없다.

Interface link는 linked object/interface entity와 방향별 cardinality ONE/MANY, required 구현 여부를 갖는다. Object type의 interface action mapping은 접근할 수 없는 Action을 생략하므로 선언된 모든 action constraint를 덮지 않을 수 있다.

## Value type과 Query 버전

Value type GET/list는 Preview이며 list는 최신 버전을 반환한다. fieldType의 optional/union/array/map/struct/reference 등 재귀 타입과 constraints를 분리한다. constraints에는 regex와 partialMatch, length/range, array size/unique/valueConstraint, struct field별 value type, RID/UUID/enum과 unsupported가 있다. semantic type 이름만 보고 모든 제약을 무시하지 않는다.

Query metadata는 재귀 dataType과 typeReferences를 제공한다. execute의 version은 semantic version range다. 생략하면 **가장 최근에 publish한 버전이며 prerelease일 수도 있다**. branch만 지정하면 그 branch의 최신, branch와 version을 함께 지정하면 그 버전이 branch에 있어야 한다. metadata get의 version과 실행의 range 의미를 구별한다. Optional parameter는 생략 가능하며 응답은 value다.

## 출처

- [Get Object Type](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/object-types/get-object-type)
- [Get Object Type Full Metadata](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/object-types/get-object-type-full-metadata)
- [Get Object Type By RID Batch](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/object-types/get-object-type-by-rid-batch)
- [Get Interface Type](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-interfaces/get-interface-type)
- [Get Ontology Value Type](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-value-types/get-ontology-value-type)
- [Execute Query](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/queries/execute-query)

## 관련 문서

- [[Palantir-Ontology-V2-ObjectSet-API]]
- [[Palantir-Ontology-V2-Action-API]]
