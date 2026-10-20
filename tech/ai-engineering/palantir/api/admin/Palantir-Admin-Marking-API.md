---
tags: [palantir, foundry, api, administration, markings]
status: done
verified_at: 2026-10-20
category: "AI엔지니어링(AIEngineering)"
---

# Marking 자체, 보호 데이터와 Category의 권한을 분리한다

Marking은 접근 자격을 강제하는 보안 제어다. Marking member, Marking 역할과 category 관리 권한은 서로 다르며 resource의 일반 역할도 별도로 필요하다. 일반 mandatory Marking과 CBAC category 조합은 [[Palantir-Admin-Classification-API]]에서 구별한다. 아래의 admin-read/admin-write는 OAuth2로 호출하는 third-party application이 요청할 operation scope `api:admin-read`/`api:admin-write`를 줄인 표기다.

## Category와 Marking 생성

`POST /api/v2/admin/markingCategories`는 preview endpoint라 query에 `preview=true`가 필요하고 언제든 변경되거나 제거될 수 있다. scope는 admin-write다. body는 name/description/initialPermissions가 필수이고 categoryType/markingType/priority 입력은 없다. initialPermissions의 organizationRids와 roles는 schema상 optional이지만 Organization이 하나도 없으면 CreateMarkingCategoryMissingOrganization, ADMINISTER role assignment가 없으면 CreateMarkingCategoryMissingInitialAdminRole로 거부된다(둘 다 INVALID_ARGUMENT). 자신의 principal/소속 Group을 ADMINISTER로 포함하지 않으면 스스로 관리할 수 없는 category가 만들어진다. principal 부재(PrincipalNotFound)와 생성 권한 거부(CreateMarkingCategoryPermissionDenied)도 구별한다.

category의 Marking을 보려면 할당된 역할과 관계없이 organizationRids 중 하나 이상의 Organization member여야 한다. 이 목록은 OR로 묶인 필요조건이라 VIEW role만으로는 category의 Marking을 볼 수 없다. 필수인 isPublic이 true이면 그 Organization들 중 하나의 member가 category의 Marking을 볼 수 있고, false이면 API 명세상 명시 VIEW role도 필요하다. 다만 Manage markings 문서는 category 가시성 규칙에서 Marking에 접근할 수 있는 사용자와 그 Marking의 administrator 또는 remover 역할 보유자도 category와 그 안 Marking의 존재를 볼 수 있고, 이들은 API 결과에 category viewer로 나타나지 않는다고 적는다. 따라서 VIEW role 보유자 목록만으로 category 열람자를 감사하지 않는다. ADMINISTER는 category metadata/permission 변경, VIEW는 category/그 안 Marking의 열람이다. **보호된 데이터의 열람/관리 권한은 부여하지 않는다.**

응답은 생성된 MarkingCategory다. 만들어진 유형은 응답의 categoryType/markingType으로 확인하고 예시 응답의 CONJUNCTIVE/MANDATORY를 기본값으로 단정하지 않는다. createdTime과 optional createdBy/priority도 담는다. priority는 CBAC category에서만 쓰며 숫자가 클수록 우선순위가 높다.

category 조회/목록은 GET `/markingCategories/{markingCategoryId}`, `/markingCategories`이며 admin-read다. 2026-10-20 기준 두 endpoint 모두 preview 표시가 없다. list는 includeDeleted 기본 true, 최대 pageSize 100이며 nextPageToken을 따른다. optional query `markingType`(MANDATORY 또는 CBAC)으로 category를 거를 수 있고 생략하면 모든 유형을 돌려준다. 0 이하의 pageSize는 InvalidPageSize, 인식하지 못한 markingType은 UnknownMarkingType으로 거부된다(둘 다 INVALID_ARGUMENT). 삭제되지 않은 CBAC category만 감사하려면 includeDeleted=false와 markingType=CBAC를 함께 명시하고 nextPageToken이 없어질 때까지 모든 페이지를 읽는다. 모든 페이지를 받은 결과도 특정 시점의 일관된 snapshot으로 취급하지 않으며, 공통 pagination 계약은 [[Palantir-API-Client-Contract]]를 따른다. list 명세는 권한 오류나 가시성 필터를 적지 않고 단건 조회에는 GetMarkingCategoryPermissionDenied가 있으므로, 목록 결과를 호출 주체가 볼 수 없는 category까지 담은 전수 목록으로 단정하지 않는다. 응답 MarkingCategory의 categoryType CONJUNCTIVE/DISJUNCTIVE, markingType MANDATORY/CBAC, markings와 deleted를 보존한다. organization category ID는 UUID가 아니라 Organization 문자열이다.

단건 조회 명세는 권한 거부(GetMarkingCategoryPermissionDenied, PERMISSION_DENIED)와 부재(MarkingCategoryNotFound, NOT_FOUND)를 별도 오류로 정의하므로 두 오류를 구분해 기록한다. 다만 삭제된 category나 호출 주체가 볼 수 없는 category를 단건 조회했을 때 어느 오류나 응답이 오는지는 명세에 없으므로, NOT_FOUND를 잘못된 ID로만 단정하지 않는다(적용 제안). NotFound 일반의 해석은 [[Palantir-API-Client-Contract]]를 따른다. 단건 응답에도 필수 필드 deleted가 있으므로 조회 성공을 활성 category로 단정하지 않고 deleted를 확인한다. priority, markings와 createdBy는 optional이라 응답에 없을 수 있다. priority의 명세 type은 long 형식의 string인데 예시 응답은 숫자 10이다. 실제 wire encoding을 예시만으로 단정하지 않고 숫자와 숫자 문자열을 모두 받되, 큰 값을 일반 JavaScript number로 바꿔 정밀도를 잃지 않게 한다. 예시처럼 MANDATORY category에 priority가 와도 CBAC 우선순위로 해석하지 않는다(적용 제안).

Preview PUT category(`/markingCategories/{markingCategoryId}`, `preview=true`, admin-write)는 name/description만 교체하며 입력에 권한, categoryType, markingType과 priority가 없어 이 endpoint로는 권한, category 유형과 CBAC 우선순위가 바뀌지 않는다. category 권한(초기값은 initialPermissions)은 Create 명세의 initialPermissions 설명대로 별도 MarkingCategoryPermission 작업으로 바꾸며, 그 endpoint와 입력은 확인되지 않았다. category 역할(ADMINISTER/VIEW)이 개별 Marking의 역할(ADMINISTER/DECLASSIFY/USE)이나 보호 데이터 접근(membership)을 자동으로 준다고 가정하지 않는다. Marking Category basics도 category를 보거나 관리하는 권한이 그 안 Marking을 보거나 관리하는 권한을 주지 않는다고 적는다. Manage markings는 Category Viewer를 category와 그 안 Marking의 존재를 볼 수 있는 사용자로 설명하므로, VIEW의 Marking 열람은 존재 확인까지로 읽고 개별 Marking의 열람이나 관리 권한으로 넓혀 읽지 않는다.

PUT category의 body는 name과 description이 모두 필수라 하나만 바꿀 때도 다른 필드의 현재 값을 함께 보내야 한다. 명세에는 버전이나 사전 조건 입력이 없다. 명세에 정의된 오류는 category 조회 권한 거부(GetMarkingCategoryPermissionDenied), 교체 권한 거부(ReplaceMarkingCategoryPermissionDenied)와 부재(MarkingCategoryNotFound)이고, 두 권한 거부는 오류 코드가 같은 PERMISSION_DENIED다. Marking 생성과 교체 명세가 빈 이름(MarkingNameIsEmpty)과 category 안 이름 충돌(MarkingNameInCategoryAlreadyExists)을 오류로 정의하는 것과 달리 category 생성과 교체 명세에는 이런 오류가 없다. 응답은 교체된 MarkingCategory다. 삭제된 category나 경로 ID가 Organization인 category를 교체할 수 있는지는 명세에 없다.

다음은 이 명세를 호출 코드에 적용하는 제안이다. 교체 전 조회(admin-read)와 교체(admin-write)를 함께 하려면 두 scope가 모두 필요하다. 교체 전 조회에서 deleted가 false이고 ID가 의도한 UUID category인지 확인한 뒤 호출하고, 응답의 deleted, name, description을 다시 확인한다. 조회와 교체 사이의 간격은 남아 다른 호출의 변경을 덮어쓸 수 있으므로 자동화 안에서는 같은 category의 교체를 한 경로로 직렬화하되, 이 직렬화가 Manage markings 화면이나 다른 관리자의 변경까지 막지는 못한다. 두 권한 거부는 오류 이름으로 구분해 기록하고, body 없이 status만 오는 오류의 처리는 [[Palantir-API-Client-Contract]]를 따른다. 빈 이름은 호출 전에 걸러 낸다. 운영 규칙상 category 이름 중복을 피해야 하면 목록으로 미리 확인하되, 목록이 볼 수 없는 category를 빠뜨릴 수 있고 확인과 호출 사이에 경쟁이 있으므로 중복이 없다는 보장으로 보지 않는다.

일반 `POST /api/v2/admin/markings`(Create Marking)는 admin-write scope이며, 2026-10-20 기준 category 생성과 달리 preview 경고와 query parameter가 없어 `preview=true`를 요구하지 않는다. body는 name/categoryId가 필수이고 description/initialMembers/initialRoleAssignments는 optional이다. 요청에는 priority, prominence와 organization 입력이 없으므로 응답에 이 값이 와도 생성 요청으로 정한 값으로 보지 않는다. categoryId는 사용자가 만든 category면 UUID이고 Organization에 연결된 Marking은 ID가 Organization인 category에 놓인다. 이 endpoint로 Organization category에 Marking을 만들 수 있는지는 명세에 없다.

schema의 optional 표시와 달리 initialRoleAssignments에는 최소 하나의 ADMINISTER 역할이 필요하고, 없으면 CreateMarkingMissingInitialAdminRole로 거부된다. 명세는 initialRoleAssignments의 ADMINISTER에 자신의 principal ID나 자신이 속한 Group의 ID를 넣지 않으면 스스로 관리할 수 없는 Marking이 만들어진다고 경고한다. Manage markings는 Foundry 화면에서 Marking을 만들면 생성자에게 Manage permissions 권한이 자동으로 주어진다고 적으므로, 화면의 동작을 API 호출에 가정하지 않는다. initialMembers는 보호된 자료를 볼 User/Group이고 role assignment와 다르며, 생성 뒤에는 각각 MarkingMember와 MarkingRoleAssignment 작업으로 바꾼다.

생성 명세가 정의한 오류는 일곱 개다. category 조회 권한 거부(GetMarkingCategoryPermissionDenied)와 생성 권한 거부(CreateMarkingPermissionDenied)는 PERMISSION_DENIED다. category 부재(MarkingCategoryNotFound)와 principal 부재(PrincipalNotFound)는 NOT_FOUND다. 초기 ADMINISTER 누락(CreateMarkingMissingInitialAdminRole), category 안 이름 충돌(MarkingNameInCategoryAlreadyExists)과 빈 이름(MarkingNameIsEmpty)은 INVALID_ARGUMENT다. 일부 오류의 parameter 이름은 요청 필드와 다르다. 이름 충돌은 name 대신 displayName을 categoryId와 함께 담고, category 조회 권한 거부와 category 부재는 categoryId가 아니라 markingCategoryId를 담는다. principal 부재가 담는 principalId는 initialRoleAssignments 항목의 필드 이름과 같지만 initialMembers 항목은 이름 없는 PrincipalId 값이라, 이 parameter만으로는 어느 목록의 principal이 없는지 알 수 없다. 이처럼 요청 필드와 같은 이름과 다른 이름이 섞여 있으므로 오류마다 parameter 이름을 따로 읽는다(적용 제안). 응답은 생성된 Marking이며 id, categoryId, name, deleted와 createdTime이 필수이고 description, organization, priority, prominence와 createdBy는 optional이다. Marking의 priority도 명세 type은 long 형식의 string인데 예시 응답은 숫자 10이므로, category priority와 같이 숫자와 숫자 문자열을 모두 받고 큰 값의 정밀도를 잃지 않게 다룬다(적용 제안).

다음은 생성 호출에 적용하는 제안이다. ADMINISTER가 하나도 없는 요청과 빈 이름은 호출 전에 걸러 내고, 생성 뒤에도 호출 주체가 member와 role을 관리해야 하면 initialRoleAssignments에 호출 주체나 호출 주체가 속한 Group의 ADMINISTER가 있는지 검사한다. Create Marking 명세는 생성에 필요한 category 권한을 적지 않지만 Manage markings는 Category Administrator를 category의 설명과 권한을 바꾸고 그 안에 Marking을 만들 수 있는 사용자로 설명하므로, CreateMarkingPermissionDenied가 오면 호출 주체가 대상 category의 ADMINISTER 역할을 가졌는지부터 확인한다. 다만 API 명세의 category ADMINISTER 설명은 metadata와 권한 변경만 적고 Marking 생성을 적지 않으므로, 화면의 Category Administrator와 API의 ADMINISTER를 같은 범위로 보는 것은 추정이다. category 권한을 읽는 endpoint도 확인되지 않았으므로 이 확인은 Manage markings 화면이나 category 관리자를 통해 하고, ADMINISTER가 있어도 거부되면 다른 플랫폼 권한이 필요한지 함께 확인한다. 같은 PERMISSION_DENIED라도 category를 볼 수 없는 경우와 생성 권한이 없는 경우는 오류 이름으로 구분해 기록한다.

다음은 시간 초과 뒤 재시도에 적용하는 제안이다. 명세에는 멱등성 키나 요청 식별자 입력이 없으므로, 시간 초과 뒤 같은 요청을 다시 보내 MarkingNameInCategoryAlreadyExists가 오면 첫 요청이나 다른 호출이 이미 같은 이름을 만들었을 수 있다. 이 오류를 단순 실패로 기록하지 않고 같은 categoryId와 name의 Marking을 찾는다. 이 탐색의 목록, 단건과 getBatch 조회는 admin-read이고, 뒤의 member 확인은 Marking 관리자만 할 수 있는 admin-write 작업이므로 생성과 확인을 함께 하려면 두 scope가 모두 필요하다. 목록에는 category나 이름 필터가 없어 모든 페이지를 읽은 뒤 클라이언트에서 거른다. 대상 category를 단건 조회해 optional markings(MarkingId 목록)를 얻고 getBatch로 500개씩 읽으면 순회를 줄일 수 있지만, markings는 설명 없는 optional 필드라 category의 Marking 전체를 담는다고 단정하지 않는다. 찾은 Marking의 deleted, createdBy와 createdTime은 첫 요청의 결과인지 판단하는 정황일 뿐이다. createdBy는 optional이고 요청 식별자도 없으므로 이 값만으로 첫 요청이 만들었다고 단정하지 않고, 그 Marking을 이어서 쓰기 전에 role assignment와 member가 요청한 초기값과 같은지 확인한다. 호출 주체가 찾은 Marking의 ADMINISTER가 아니면 member를 확인할 수 없으므로 미확인으로 기록하고, 확인 전까지 그 Marking을 이어서 쓰지 않는다. 목록 명세에는 가시성 규칙이 없고 getBatch는 오류를 정의하지 않으며 응답의 data map도 optional이다. 이름 충돌을 판정하는 비교 규칙(대소문자와 공백 처리)도 명세에 없으므로 찾지 못한 결과를 생성 실패의 증거로 보지 않는다.

## Marking 조회와 변경

GET `/markings/{markingId}`, POST `/markings/getBatch`(최대 500, ID map), GET `/markings`는 admin-read다. list의 includeDeleted 기본 true와 최대 pageSize 100을 확인한다. list의 필터는 includeDeleted와 optional markingType(MANDATORY 또는 CBAC, 생략하면 모든 유형)뿐이고 category나 이름 필터는 없다. categoryId/name, optional description/organization, deleted/createdTime과 optional createdBy를 보존하고, CBAC Marking에서만 쓰는 optional priority(클수록 우선)와 prominence(COMMON/UNCOMMON 강조 힌트)도 버리지 않는다.

배치 조회의 전체 경로는 `POST /api/v2/admin/markings/getBatch`다. 필수 body는 문자열 ID 배열이나 `data`로 감싼 객체가 아니라, 필수 `markingId`를 담은 객체 배열이다. 2026-10-20 대조한 명세에는 query parameter와 preview 요구가 없다. 응답의 `data`는 optional인 `MarkingId → Marking` map이며, 요청 순서에 대응하는 배열이 아니다.

배치 명세에는 endpoint별 오류 정의가 없고, 존재하지 않거나 접근할 수 없는 ID, 중복 ID와 빈 요청의 처리도 명시하지 않는다. 따라서 단건 조회의 403/404 계약을 배치의 항목별 오류 계약으로 옮기지 않는다. 적용할 때는 500개 이하로 나누고 요청 ID와 응답 map의 key를 대조한다. `data`가 없거나 일부 key가 빠지면 해당 ID를 미확인으로 남기며, 삭제됐거나 접근이 허용된 것으로 판정하지 않는다. 반환된 항목도 `deleted`를 따로 확인한다. 이는 클라이언트 처리 제안이며 실제 API 호출로 경계 조건을 시험한 결과는 아니다.

단건 Get Marking의 전체 경로는 `GET /api/v2/admin/markings/{markingId}`다. 2026-10-20 대조한 명세에는 preview 표시, query parameter와 request body가 없다. 응답은 Marking 한 개이며 `deleted`가 필수이므로 조회 성공만으로 활성 상태라고 판단하지 않는다. Marking metadata를 읽었다고 membership이나 보호 데이터의 접근 권한까지 확인된 것은 아니다. 응답에 member와 role assignment 목록은 없으므로 해당 API에서 따로 확인한다.

단건 명세는 `GetMarkingPermissionDenied`(403, PERMISSION_DENIED)와 `MarkingNotFound`(404, NOT_FOUND)를 구분하며 둘 다 parameter로 `markingId`를 담는다. 삭제되었거나 호출 주체에게 보이지 않는 Marking을 조회했을 때의 모든 응답 조건은 명시하지 않는다. 따라서 404만으로 삭제 완료를 판정하지 않고, 성공 응답의 deleted 확인과 오류 기록을 분리한다(적용 제안). 단건 응답에도 위에서 설명한 categoryId/organization의 예시 불일치와 priority의 명세 type/예시 차이가 있으므로, 예시 한 개로 Organization 여부나 숫자의 wire encoding을 확정하지 않는다.

List Markings(GET `/markings`)는 2026-10-20 기준 preview 표시가 없다. 명세가 정의한 오류는 0 이하의 pageSize(InvalidPageSize)와 인식하지 못한 markingType(UnknownMarkingType) 두 가지이며 둘 다 INVALID_ARGUMENT다. 응답 ListMarkingsResponse의 data와 nextPageToken은 모두 optional이고, 응답의 Marking에는 markingType 필드가 없다. Organization Marking이 어느 markingType 필터에 포함되는지도 명세에 없다. 필드 설명상 Organization에 연결된 Marking은 categoryId가 Organization이고 optional organization에 그 Organization의 RID가 담긴다. 그런데 응답 예시는 organization RID와 UUID 형식의 categoryId를 함께 보여 이 설명과 어긋난다. priority도 예시는 숫자 10이지만 명세 type은 long 형식의 string이다.

다음은 목록 명세를 감사 코드에 적용하는 제안이다. 삭제되지 않은 CBAC Marking만 보려면 includeDeleted=false와 markingType=CBAC를 함께 명시한다. 응답에 markingType이 없으므로 유형별 결과가 필요하면 유형마다 따로 조회하거나 categoryId로 category의 markingType을 확인한다. 유형마다 따로 조회했다면 markingType을 생략한 조회 결과와 id 집합을 대조해, 어느 유형 조회에도 없거나 두 유형에 모두 나온 Marking은 유형 미확인으로 기록한다. category 조회가 오류로 끝나거나 categoryId가 Organization이라 유형을 정할 수 없을 때도 유형 미확인으로 남긴다. Organization Marking은 categoryId와 organization을 함께 보고 판별하며 둘이 어긋나면 미확인으로 기록한다. priority와 prominence는 category의 markingType이 CBAC로 확인된 Marking에서만 해석하고, priority는 Create Marking 응답과 같이 숫자와 숫자 문자열을 모두 받되 큰 값의 정밀도를 잃지 않게 다룬다. data가 없는 응답은 그 페이지에 항목이 없는 것으로 처리하고, 순회 종료는 항목 수가 아니라 nextPageToken의 유무로 판단해 모든 페이지를 읽는다. 순회 결과를 특정 시점의 일관된 snapshot으로 취급하지 않는다. 페이지 사이 변경으로 생길 수 있는 중복은 id로 제거하되 같은 id의 값이 다르면 나중에 받은 값을 쓰고 변경으로 기록하며, 누락은 중복 제거로 막을 수 없다. 공통 pagination 계약은 [[Palantir-API-Client-Contract]]를 따른다. 단건 Get Marking이 권한 거부(GetMarkingPermissionDenied)를 정의하는 것과 달리 목록 명세에는 권한 오류와 가시성 규칙이 없으므로, 결과를 호출 주체가 볼 수 없는 Marking까지 담은 전수 목록으로 단정하지 않는다.

### Marking 교체의 입력과 오류 경계

`PUT /api/v2/admin/markings/{markingId}`는 admin-write scope이며, 2026-10-20 대조한 명세에는 preview 요구와 query parameter가 없다. body의 필수 name과 optional description만 받는다. categoryId, priority, prominence, member와 role assignment는 요청 필드가 아니므로 응답의 Marking 객체 전체를 교체 입력으로 보내지 않는다(적용 제안). PUT category와 달리 description이 optional이지만 생략했을 때 기존 값을 유지하는지 지우는지는 명세에 없다.

| 오류 이름 | HTTP / 오류 코드 | parameter |
| --- | --- | --- |
| GetMarkingCategoryPermissionDenied | 403 / PERMISSION_DENIED | markingCategoryId |
| GetMarkingPermissionDenied | 403 / PERMISSION_DENIED | markingId |
| ReplaceMarkingPermissionDenied | 403 / PERMISSION_DENIED | markingId |
| MarkingNameInCategoryAlreadyExists | 400 / INVALID_ARGUMENT | displayName, categoryId |
| MarkingNameIsEmpty | 400 / INVALID_ARGUMENT | 없음 |
| MarkingNotFound | 404 / NOT_FOUND | markingId |

같은 403도 category 열람, Marking 열람과 교체의 거부를 오류 이름으로 나누어 기록한다. 이름 충돌의 parameter는 요청의 name이 아니라 displayName이다. 응답은 교체된 Marking이며 member와 role assignment 목록을 포함하지 않는다. 삭제된 Marking이나 Organization Marking의 교체 가능 여부는 이 명세만으로 확정하지 않는다.

적용 제안: 기존 description을 유지하려면 현재 값을 조회해 함께 보내고, 조회와 교체를 결합할 때는 admin-read와 admin-write를 모두 요청한다. endpoint 명세에는 버전이나 사전 조건 입력이 없으므로 조회 후 교체가 다른 관리자의 변경을 덮어쓰지 않는다고 보장할 수 없다. 응답의 id, name, description과 deleted를 확인하되 metadata 교체 성공을 보호 데이터의 접근 권한 변경으로 해석하지 않는다. POST Marking 생성의 오류는 앞 절의 별도 계약을 따른다.

## Member와 Role Assignment

`/markings/{markingId}/markingMembers`의 list는 Marking 관리자만 멤버를 볼 수 있으므로 **admin-write** scope를 요구한다. transitive 기본 false, true면 nested Group을 재귀 해석하며 pageSize는 무시한다. query에 pageToken이 있다고 해서 요청 크기가 실제 페이지 크기를 정한다고 가정하지 않는다.

POST member `/add`와 `/remove`는 principalIds를 받는다. User/Group membership은 보호 자료의 접근 자격이고 다음 세 역할과 구별한다.

| Marking role | 허용하는 일 |
|---|---|
| ADMINISTER | member/role assignment와 metadata 관리 |
| DECLASSIFY | resource의 Marking 제거와 transform 전파 중단 |
| USE | resource에 Marking 적용 |

role assignments list는 admin-read이고 pageSize를 무시한다. POST `/roleAssignments/add`와 `/remove`는 role+principalId 목록과 admin-write를 사용한다. 마지막 관리자 전부 제거는 허용되지 않는다.

Organization Marking에는 USE/DECLASSIFY만 이 role endpoint로 관리하고 ADMINISTER는 Organization Role Assignment API를 사용한다. guest member는 Organization RID가 아니라 그 Organization의 Marking ID(Get Organization 응답의 markingId)로 일반 Marking Member API를 호출해 관리한다. 이 세 경계를 혼동하지 않는다.

공개 명세를 읽었으며 실제 Marking/category/member/role을 변경하지 않았다. resource에 Marking을 붙이는 작업은 [[Palantir-Filesystem-Access]]를 따른다.

## 출처

- [Palantir, Marking Category basics](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-categories/marking-category-basics)
- [Palantir, Create Marking Category](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-categories/create-marking-category)
- [Palantir, List Marking Categories](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-categories/list-marking-categories)
- [Palantir, Get Marking Category](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-categories/get-marking-category)
- [Palantir, Replace Marking Category](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-categories/replace-marking-category)
- [Palantir, Create Marking](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/create-marking)
- [Palantir, List Markings](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/list-markings) — 2026-10-20 확인. 같은 날 [v2 문서 경로](https://www.palantir.com/docs/foundry/api/v2/admin-v2-resources/markings/list-markings)의 명세 본문도 같았다.
- [Palantir, Get Marking](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/get-marking) — 2026-10-20 단건 조회와 오류 계약 확인. 같은 날 [v2 문서 경로](https://www.palantir.com/docs/foundry/api/v2/admin-v2-resources/markings/get-marking)에서도 같은 endpoint, 응답 필드와 오류 정의를 확인했다. 실제 API 호출은 하지 않았다.
- [Palantir, Get Markings Batch](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/get-markings-batch) — 2026-10-20 요청 배열, optional data map과 오류 정의 범위 확인. [v2 문서 경로](https://www.palantir.com/docs/foundry/api/v2/admin-v2-resources/markings/get-markings-batch)에서도 같은 endpoint, 배치 상한과 응답 구조를 확인했다.
- [Palantir, Replace Marking](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/replace-marking) — 2026-10-20 입력 범위, 응답과 오류 6개 대조. [v2 문서 경로](https://www.palantir.com/docs/foundry/api/v2/admin-v2-resources/markings/replace-marking)에서도 같은 계약을 확인했다. 실제 API 호출은 하지 않았다.
- [Palantir, List Marking Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-members/list-marking-members)
- [Palantir, Add Marking Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-members/add-marking-members)
- [Palantir, Remove Marking Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-members/remove-marking-members)
- [Palantir, List Marking Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-role-assignments/list-marking-role-assignments)
- [Palantir, Add Marking Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-role-assignments/add-marking-role-assignments)
- [Palantir, Remove Marking Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-role-assignments/remove-marking-role-assignments)
- [Palantir, Organization basics](https://www.palantir.com/docs/foundry/api/admin-v2-resources/organizations/organization-basics)
- [Palantir, Get Organization](https://www.palantir.com/docs/foundry/api/admin-v2-resources/organizations/get-organization)
- [Palantir, Manage markings](https://www.palantir.com/docs/foundry/platform-security-management/manage-markings/)
