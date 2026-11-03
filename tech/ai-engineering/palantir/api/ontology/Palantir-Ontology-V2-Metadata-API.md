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

### Action type 목록의 종료 조건과 branch

2026-11-02 List Action Types 명세 부분 대조 기준, `GET /api/v2/ontologies/{ontology}/actionTypes`는 Action type metadata를 읽으며 OAuth2 scope는 `api:ontologies-read`다. Action을 실행하거나 실행 성공을 확인하는 응답이 아니다.

- `pageSize` 기본값은 500이지만 한 페이지의 항목 수는 요청보다 작을 수 있다. 결과가 더 있으면 최소 한 항목이 반환된다는 보장과, 요청한 개수만큼 채워진다는 보장은 다르다.
- 첫 요청에서는 `pageToken`을 생략한다. 이후 응답의 `nextPageToken`을 다음 요청에 전달하고 후속 토큰이 없으면 끝낸다. 항목 수가 500보다 작다는 이유로 종료하지 않는다.
- 응답 schema에서 `data`와 `nextPageToken`은 모두 선택 필드다. 클라이언트는 `data`가 존재한다고 가정하지 않고 후속 토큰을 별도로 확인한다(설계 제안).
- `branch`를 생략하면 기본 branch를 사용한다. Branch는 experimental 기능이며 모든 workflow 지원을 보장하지 않는다. 페이지 순회 중 같은 Ontology와 branch 조건을 유지하는 것은 클라이언트 설계 제안이다.

실제 페이지 순회와 branch별 권한은 시험하지 않았다. 다른 metadata endpoint 전체를 재검증하지 않았으므로 frontmatter의 검증일은 유지한다.

### Action type 단건 조회와 응답 예시의 불일치

2026-11-02 Get Action Type 명세 부분 대조 기준, `GET /api/v2/ontologies/{ontology}/actionTypes/{actionType}`는 Action 정의를 읽는다. `{ontology}`에는 API name 또는 RID를, `{actionType}`에는 Action type API name을 넣는다. OAuth2 scope는 `api:ontologies-read`다.

- 선택 인자 `sdkPackageRid`와 `sdkVersion`은 생성된 SDK의 패키지 RID와 버전이다. Action 정의의 버전을 고르는 인자로 해석하지 않는다.
- `branch`를 생략하면 기본 branch를 사용한다. Branch 기능은 experimental이며 모든 workflow를 지원하지는 않는다.
- 응답 schema의 필수 필드는 `apiName`, `status`, `rid`다. `status`는 `ACTIVE`, `ENDORSED`, `EXPERIMENTAL`, `DEPRECATED` 중 하나인 릴리스 상태이며 실행 결과가 아니다.
- `parameters`, `operations`, `description`, `displayName`, `toolDescription`은 선택 필드다. `toolDescription`은 AI 에이전트 같은 도구 사용 문맥을 위한 설명이며 실행 승인이나 권한을 부여하지 않는다.

공식 문서 안에서도 schema와 응답 예시가 다르다. Schema는 `ActionTypeV2` 객체를 직접 선언하지만 예시는 `data`로 감싸고 필수 `status`를 생략한다. 실제 인증 요청은 시험하지 않았으므로 어느 형식이 반환되는지 단정하지 않는다. 클라이언트를 연결할 때 실제 응답과 사용하는 SDK의 타입을 함께 대조한다(운영 제안). 조회 성공만으로 Action 적용이나 validation 성공을 판정하지 않으며 실행 계약은 [[Palantir-Ontology-V2-Action-API]]에서 확인한다.

검증 범위는 이 단건 조회의 요청, 응답 schema와 예시다. 다른 metadata 항목의 검증일은 갱신하지 않았다.

### RID로 Action type을 읽을 때의 차이

2026-11-03 Get Action Type By Rid 명세 부분 대조 기준, `GET /api/v2/ontologies/{ontology}/actionTypes/byRid/{actionTypeRid}`는 RID로 Action 정의를 읽는다. `{ontology}`에는 Ontology API name 또는 RID를, `{actionTypeRid}`에는 Action type RID를 넣는다. API name을 받는 위 단건 조회와 경로를 구분한다.

- OAuth2 operation scope는 `api:ontologies-read`다. 정의 조회 권한을 Action 실행 권한으로 해석하지 않는다.
- 이 endpoint의 선택 query parameter는 `branch`다. 생략하면 기본 branch를 사용하며, branch는 experimental이고 모든 workflow를 지원하지 않는다.
- API name 조회에 있는 `sdkPackageRid`, `sdkVersion`과 bulk 조회의 `preview`는 이 단건 RID 조회의 query parameter로 정의되어 있지 않다. 다른 endpoint의 인자를 공통 필수값으로 복사하지 않는다.
- 응답 schema는 `ActionTypeV2`이며 `apiName`, `status`, `rid`가 필수다. 이 페이지의 예시에도 `data` wrapper와 `status` 누락이 있어 위 단건 조회와 같은 schema/예시 불일치가 나타난다.

실제 인증 요청과 반환 형식은 시험하지 않았다. 검증 범위는 RID 단건 조회의 요청과 응답 명세이며, 다른 metadata 항목의 검증일은 유지한다.

### Action type RID 일괄 조회의 누락 해석

2026-11-03 Get Action Type By Rid Batch 명세 부분 대조 기준, `POST /api/v2/ontologies/{ontology}/actionTypes/getByRidBatch`는 Action 정의를 최대 100개 조회한다. Action을 적용하는 batch와 구분한다. OAuth2 scope는 `api:ontologies-read`이며 Preview endpoint라 `preview=true`가 필요하다.

- 요청 본문은 `GetActionTypeByRidBatchRequest` 객체다. `requests` 목록의 각 원소는 필수 `actionTypeRid`를 가진 객체이며 RID 문자열 배열 자체가 아니다. Schema에서 `requests`는 선택 필드지만, 생략이나 빈 목록의 실행 결과는 확인하지 않았다.
- 응답의 `data`는 선택적인 `ActionTypeV2` 목록이다. 존재하지 않거나 토큰에 필요한 권한이 없는 Action type은 응답에서 빠진다. 누락만으로 삭제와 권한 부족을 구분할 수 없다.
- `branch`를 생략하면 기본 branch를 사용한다. Branch는 experimental이며 모든 workflow를 지원하지 않는다.

클라이언트 설계 제안: 요청을 100개 이하로 나누고 응답을 `rid`로 대응시킨다. 반환되지 않은 RID는 미확인으로 남기고 삭제를 확정하지 않는다. 요청과 응답 개수가 같다는 가정이나 위치별 대응을 사용하지 않는다. 공식 예시의 빈 요청 본문을 정상 요청 양식으로 복사하지 않고 schema를 따른다.

검증 범위는 이 endpoint의 요청, 응답 schema와 누락 조건이다. 실제 인증 호출, 빈 요청의 처리와 반환 순서는 시험하지 않았고 다른 metadata 항목의 검증일은 유지한다.

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

### Query 실행의 문맥과 응답 계약

2026-11-03 Execute Query 명세 부분 대조 기준, `POST /api/v2/ontologies/{ontology}/queries/{queryApiName}/execute`는 Ontology API name 또는 RID와 Query API name을 받는다. OAuth2 operation scope는 `api:ontologies-read`다. Global Query의 `api:functions-execute`를 이 경로의 계약으로 복사하지 않는다.

- `transactionId`는 읽을 Ontology transaction을 지정한다. Experimental 기능이며 모든 workflow 지원을 보장하지 않는다. `scenarioRid`는 Query를 실행할 Ontology scenario의 RID다. 두 인자를 받는다는 사실만으로 임의 조합이나 쓰기 원자성을 보장한다고 해석하지 않는다.
- `sdkPackageRid`, `sdkVersion`은 생성된 SDK의 식별자와 버전이다. 실행 함수의 semantic version range인 `version`과 구분한다.
- 요청의 `parameters`는 선택 map이지만 함수 정의의 필수 입력까지 생략 가능하다는 뜻은 아니다. 응답의 `value`는 필수이며 DataValue에 `null`도 포함된다. 값이 `null`인 결과와 `value` 필드가 없는 응답을 구분한다.

클라이언트 설계 제안: 실행 대상과 branch, version, scenario, transaction 문맥을 명시적으로 관리하고 함수 metadata의 입력 요건을 대조한다. 실제 인증 호출과 문맥 조합은 시험하지 않았고, 다른 metadata 항목의 검증일은 유지한다.

### Query type 목록의 버전과 페이지 순회

2026-10-20 List Query Types 공식 문서 대조 기준이다. `GET /api/v2/ontologies/{ontology}/queryTypes`는 Query type마다 가장 최근에 publish한 버전의 metadata를 반환한다. 전체 버전 이력을 반환하는 목록이 아니며, 최신 항목이 prerelease일 수도 있어 안정 버전 목록으로 해석하지 않는다.

- `branch`를 생략하면 기본 branch를 사용한다. Branch 기능은 experimental이며 모든 workflow를 지원하는 것은 아니다.
- `pageSize` 기본값은 100이다. 응답 항목 수가 요청 크기보다 적을 수 있으므로 항목 수만으로 마지막 페이지를 판단하지 않는다. 다음 결과가 남아 있으면 응답에 최소 한 항목은 포함한다.
- 첫 요청에는 `pageToken`을 넣지 않는다. 이후에는 직전 응답의 `nextPageToken`을 다음 요청의 `pageToken`으로 전달하며, 후속 토큰이 없을 때 순회를 끝낸다.

이 응답의 `data`는 Query type 목록이다. Query를 실행한 결과와 구분하고, 실행에 사용할 버전 조건은 위의 실행 계약에 맞춰 따로 정한다.

### Query type 단건 조회의 요청 계약

`GET /api/v2/ontologies/{ontology}/queryTypes/{queryApiName}`은 지정한 Query type의 metadata를 읽는다. `{ontology}`에는 Ontology API name 또는 RID를, `{queryApiName}`에는 Query type API name을 넣는다. OAuth2 operation scope는 `api:ontologies-read`다.

- `version`을 생략하면 prerelease를 포함해 가장 최근에 발행한 버전을 선택한다. [[Palantir-Query-Execution-API|Global Query API]]의 기본 선택인 prerelease 제외 최고 semantic version과 구분한다.
- 선택 query parameter `branch`는 metadata를 읽을 Foundry branch다. Experimental 기능이므로 모든 workflow 지원을 전제하지 않는다.
- `sdkPackageRid`와 `sdkVersion`은 생성된 SDK의 패키지 RID와 버전이다. 함수의 `version`과 같은 인자로 취급하지 않는다. 이 endpoint에는 `latestVersionResolution`, `includePrerelease`, `preview`가 query parameter로 정의돼 있지 않다.
- 응답의 필수 필드는 `apiName`, `output`, `rid`, `version`이며 `parameters`, `typeReferences`, 설명과 표시 이름은 선택 필드다. 실행 결과인 `value` 대신 입력/출력 명세를 받는다.

클라이언트 설계 제안: 입력 폼을 만든 metadata의 `rid`와 `version`을 보관하고 실행 시 선택한 버전과 대조한다. 조회와 실행마다 최신 버전을 다시 선택하면 두 호출 사이의 발행으로 명세가 달라질 수 있다.

2026-10-20 Get Query Type의 요청 인자와 응답 schema를 대조했다. 검증 범위는 이 절이며 실제 인증, branch별 조회와 Query 실행은 시험하지 않았다. 다른 metadata 항목의 검증일은 갱신하지 않았다.

## 출처

- [List Action Types](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/action-types/list-action-types)
- [Get Action Type](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/action-types/get-action-type)
- [Get Action Type By Rid](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/action-types/get-action-type-by-rid)
- [Get Action Type By Rid Batch](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/action-types/get-action-type-by-rid-batch)
- [Get Object Type](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/object-types/get-object-type)
- [Get Object Type Full Metadata](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/object-types/get-object-type-full-metadata)
- [Get Object Type By RID Batch](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/object-types/get-object-type-by-rid-batch)
- [Get Interface Type](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-interfaces/get-interface-type)
- [Get Ontology Value Type](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-value-types/get-ontology-value-type)
- [Execute Query](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/queries/execute-query)
- [List Query Types](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/query-types/list-query-types)
- [Get Query Type](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/query-types/get-query-type)

## 관련 문서

- [[Palantir-Ontology-V2-ObjectSet-API]]
- [[Palantir-Ontology-V2-Action-API]]
