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

Preview PUT category는 name/description만 교체하며 입력에 권한 필드가 없어 이 endpoint로는 권한이 바뀌지 않는다. category 권한(초기값은 initialPermissions)은 별도 MarkingCategoryPermission 작업으로 바꾸며, 그 endpoint와 입력은 확인되지 않았다. category 역할(ADMINISTER/VIEW)이 개별 Marking의 역할(ADMINISTER/DECLASSIFY/USE)이나 보호 데이터 접근(membership)을 자동으로 준다고 가정하지 않는다. Marking Category basics도 category를 보거나 관리하는 권한이 그 안 Marking을 보거나 관리하는 권한을 주지 않는다고 적는다. Manage markings는 Category Viewer를 category와 그 안 Marking의 존재를 볼 수 있는 사용자로 설명하므로, VIEW의 Marking 열람은 존재 확인까지로 읽고 개별 Marking의 열람이나 관리 권한으로 넓혀 읽지 않는다.

일반 `POST /admin/markings`는 name/categoryId와 optional description/initialMembers/initialRoleAssignments를 받는다. schema의 optional 표시와 달리 최소 하나 ADMINISTER 역할이 필요하다. initialMembers는 보호된 자료를 볼 User/Group이고 role assignment와 다르다.

## Marking 조회와 변경

GET `/markings/{markingId}`, POST `/markings/getBatch`(최대 500, ID map), GET `/markings`는 admin-read다. list의 includeDeleted 기본 true와 최대 pageSize 100을 확인한다. categoryId/name, optional description/organization, deleted/createdTime과 optional createdBy를 보존하고, CBAC Marking에서만 쓰는 optional priority(클수록 우선)와 prominence(COMMON/UNCOMMON 강조 힌트)도 버리지 않는다.

PUT `/markings/{markingId}`는 name/description을 교체한다. category 이동 입력은 없다. 오류는 endpoint마다 다르다. PUT은 빈 이름, category 안 이름 충돌, Marking 부재와 Marking/category 조회 또는 교체 권한 거부를 구별하고, POST Marking 생성은 빈 이름, 이름 충돌, category 부재, principal 부재, 초기 ADMINISTER 누락과 category 조회 또는 생성 권한 거부를 구별한다. 위 변경은 admin-write scope다.

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
- [Palantir, List Markings](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/list-markings)
- [Palantir, Get Marking](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/get-marking)
- [Palantir, Get Markings Batch](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/get-markings-batch)
- [Palantir, Replace Marking](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/replace-marking)
- [Palantir, List Marking Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-members/list-marking-members)
- [Palantir, Add Marking Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-members/add-marking-members)
- [Palantir, Remove Marking Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-members/remove-marking-members)
- [Palantir, List Marking Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-role-assignments/list-marking-role-assignments)
- [Palantir, Add Marking Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-role-assignments/add-marking-role-assignments)
- [Palantir, Remove Marking Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-role-assignments/remove-marking-role-assignments)
- [Palantir, Organization basics](https://www.palantir.com/docs/foundry/api/admin-v2-resources/organizations/organization-basics)
- [Palantir, Get Organization](https://www.palantir.com/docs/foundry/api/admin-v2-resources/organizations/get-organization)
- [Palantir, Manage markings](https://www.palantir.com/docs/foundry/platform-security-management/manage-markings/)
