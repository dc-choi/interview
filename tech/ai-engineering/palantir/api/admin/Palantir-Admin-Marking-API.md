---
tags: [palantir, foundry, api, administration, markings]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Marking 자체, 보호 데이터와 Category의 권한을 분리한다

Marking은 접근 자격을 강제하는 보안 제어다. Marking member, Marking 역할과 category 관리 권한은 서로 다르며 resource의 일반 역할도 별도로 필요하다. 일반 mandatory Marking과 CBAC category 조합은 [[Palantir-Admin-Classification-API]]에서 구별한다.

## Category와 Marking 생성

Preview `POST /api/v2/admin/markingCategories`는 name/description/initialPermissions가 필수다. 적어도 하나의 Organization과 ADMINISTER role assignment가 필요하다. 자신의 principal/소속 Group을 ADMINISTER로 포함하지 않으면 만든 category를 스스로 관리하지 못할 수 있다.

initialPermissions의 organizationRids는 접근할 수 있는 Organization의 OR 조건이다. isPublic=true이면 그 Organization들 중 하나의 member가 category의 Marking을 볼 수 있고, false이면 명시 VIEW role도 필요하다. ADMINISTER는 category metadata/permission 변경, VIEW는 category/그 안 Marking의 열람이다. **보호된 데이터의 열람/관리 권한은 부여하지 않는다.**

category 조회/목록은 GET `/markingCategories/{id}`, `/markingCategories`이며 admin-read다. list includeDeleted 기본 true, 최대 pageSize 100이며 nextPageToken을 따른다. categoryType CONJUNCTIVE/DISJUNCTIVE, markingType MANDATORY/CBAC, markings와 deleted를 보존한다. organization category ID는 UUID가 아니라 Organization 문자열이다.

Preview PUT category는 name/description만 교체한다. 이 corpus의 endpoint에는 category permission 변경의 구체적 API가 없으므로 해당 기능을 지어내지 않는다. category 관리/열람과 개별 Marking 관리/열람이 자동으로 모두 같다고 해석하지 않는다.

일반 `POST /admin/markings`는 name/categoryId와 optional description/initialMembers/initialRoleAssignments를 받는다. schema의 optional 표시와 달리 최소 하나 ADMINISTER 역할이 필요하다. initialMembers는 보호된 자료를 볼 User/Group이고 role assignment와 다르다.

## Marking 조회와 변경

GET `/markings/{markingId}`, POST `/markings/getBatch`(최대 500, ID map), GET `/markings`는 admin-read다. list의 includeDeleted 기본 true와 최대 pageSize 100을 확인한다. categoryId/name, optional description/organization, deleted/createdTime/By를 보존한다.

PUT `/markings/{markingId}`는 name/description을 교체한다. category 이동 입력은 없다. 빈 이름, category 안 이름 충돌, 권한과 category/marking/principal 부재 오류를 구별한다. 위 변경은 admin-write scope다.

## Member와 Role Assignment

`/markings/{markingId}/markingMembers`의 list는 **admin-write** scope다. Marking 관리자만 멤버를 볼 수 있기 때문이라고 설명한다. transitive 기본 false, true면 nested Group을 재귀 해석하며 pageSize는 무시한다. query에 pageToken이 있다고 해서 요청 크기가 실제 페이지 크기를 정한다고 가정하지 않는다.

POST member `/add`와 `/remove`는 principalIds를 받는다. User/Group membership은 보호 자료의 접근 자격이고 다음 세 역할과 구별한다.

| Marking role | 허용하는 일 |
|---|---|
| ADMINISTER | member/role assignment와 metadata 관리 |
| DECLASSIFY | resource의 Marking 제거와 transform 전파 중단 |
| USE | resource에 Marking 적용 |

role assignments list는 admin-read이고 pageSize를 무시한다. POST `/roleAssignments/add`와 `/remove`는 role+principalId 목록과 admin-write를 사용한다. 마지막 관리자 전부 제거는 허용되지 않는다.

Organization Marking에는 USE/DECLASSIFY만 이 role endpoint로 관리하고 ADMINISTER는 Organization Role Assignment API를 사용한다. guest는 일반 Marking Member API로 관리한다. 이 세 경계를 혼동하지 않는다.

공개 명세를 읽었으며 실제 Marking/category/member/role을 변경하지 않았다. resource에 Marking을 붙이는 작업은 [[Palantir-Filesystem-Access]]를 따른다.

## 출처

- [Palantir, Create Marking Category](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-categories/create-marking-category)
- [Palantir, List Marking Categories](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-categories/list-marking-categories)
- [Palantir, Replace Marking Category](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-categories/replace-marking-category)
- [Palantir, Create Marking](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/create-marking)
- [Palantir, List Markings](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/list-markings)
- [Palantir, Get Markings Batch](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/get-markings-batch)
- [Palantir, Replace Marking](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/replace-marking)
- [Palantir, List Marking Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-members/list-marking-members)
- [Palantir, Add Marking Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-members/add-marking-members)
- [Palantir, Remove Marking Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-members/remove-marking-members)
- [Palantir, List Marking Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-role-assignments/list-marking-role-assignments)
- [Palantir, Add Marking Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-role-assignments/add-marking-role-assignments)
- [Palantir, Remove Marking Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/marking-role-assignments/remove-marking-role-assignments)
