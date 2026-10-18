---
tags: [palantir, foundry, api, filesystem, permissions, markings]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 역할과 접근 자격을 별도로 관리한다

Filesystem의 role grant는 무엇을 할 수 있는지, Organization/Marking은 해당 resource에 접근할 자격이 있는지를 다룬다. OAuth2 operation scope도 추가 경계다. 하나를 만족했다고 나머지를 생략하지 않는다.

## 직접 조건과 상속 조건

`GET /api/v2/filesystem/resources/{resourceRid}/getAccessRequirements`는 Organization과 Marking을 반환한다. `api:filesystem-read` scope가 필요하다. 각 항목의 `isDirectlyApplied`로 직접 적용과 상속을 구분한다.

Organization은 OR 조건이다. Project에 적용된 Organization 중 하나에 member 또는 guest member이면 해당 Organization 자격을 충족한다. Marking은 AND 조건이어서 적용된 모든 Marking의 member여야 한다. Organization은 파일 계층과 직접 의존성으로 상속된다고 명시되어 있다.

단순 Marking 목록은 `GET /resources/{resourceRid}/markings`, Project Organization 목록은 `GET /projects/{projectRid}/organizations`이다. 두 endpoint는 직접 적용한 항목을 나열하며 상속까지 포함한 getAccessRequirements와 다르다. 수가 통상 적어 page 인자를 생략할 수 있지만 응답에 nextPageToken이 있으면 계속 조회한다. scopes 빈 배열을 인증 불필요로 해석하지 않는다.

## Organization은 Project/Space 계층을 지킨다

`POST /projects/{projectRid}/addOrganizations`와 `/removeOrganizations`는 organizationRids 목록과 filesystem-write scope를 사용한다. Project의 Organization은 상위 Space에 존재해야 한다. Organization으로 표시한 Space 아래에서 Project의 Organization을 전부 없애는 구성도 허용되지 않는다.

`InvalidOrganizationHierarchy`, `OrganizationCannotBeRemoved`는 이 불변 조건을 위반할 때의 오류다. 존재하지 않는 Organization과 add/remove 권한 오류는 별개다. 직접 Marking API로 organization marking을 추가/제거하는 우회는 지원되지 않는다.

## 일반 Marking의 추가와 제거

`POST /resources/{resourceRid}/addMarkings`와 `/removeMarkings`는 markingIds 목록을 받으며 filesystem-write scope를 요구한다. organization marking이면 `OrganizationMarkingNotSupported`이고 Project Organization endpoint를 사용해야 한다. hidden/autosaved resource의 해당 작업도 지원하지 않는다.

Marking이 없거나 변경 권한이 부족한 오류를 따로 처리한다. 이 명세에는 권한 완화가 필요한 승인 절차를 자동 수행하거나, 상속된 Marking을 임의 해제하는 계약이 없다. 결과의 직접 적용 여부와 실제 변경 가능 범위를 확인한다.

## Resource role grant

`GET /resources/{resourceRid}/roles`는 `includeInherited`로 상속 역할 포함 여부를 선택하고 filesystem-read scope를 쓴다. pageToken/pageSize로 이어서 조회한다. optional includeInherited의 기본값은 명세에 없으므로 명시해서 요청하는 편이 분명하다.

POST `/roles/add`와 `/roles/remove`는 roles 목록을 받는다. 각 항목은 roleId와 `resourceRolePrincipal`이며 principalIdOnly 또는 everyone union이다. everyone은 플랫폼 전체 사용자다. list 응답은 principalWithId로 ID와 USER/GROUP type을 돌려줄 수 있으므로 변경 요청과 조회 응답 schema를 그대로 복사하지 않는다.

Role ID는 유효한 role set에 있어야 하며 없는 principal은 `PrincipalNotFound`다. Project 생성의 `resourceLevelRoleGrantsAllowed` 설정도 함께 확인한다. role grant 변경의 즉시 전파 시간이나 여러 변경의 원자성은 이 endpoint 명세에 별도 보장되어 있지 않다.

이 기록은 공개 계약을 확인한 것이며 실제 접근 권한, Marking이나 Organization을 변경하지 않았다. [[Palantir-Security-and-Governance]] 및 [[Palantir-API-Client-Contract]]와 함께 적용한다.

## 출처

- [Palantir, Get Access Requirements](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/get-access-requirements)
- [Palantir, List Markings Of Resource](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/list-markings-of-resource)
- [Palantir, Add Markings](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/add-markings)
- [Palantir, Remove Markings](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resources/remove-markings)
- [Palantir, List Organizations Of Project](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/projects/list-organizations-of-project)
- [Palantir, Add Organizations](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/projects/add-organizations)
- [Palantir, Remove Organizations](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/projects/remove-organizations)
- [Palantir, List Resource Roles](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resource-roles/list-resource-roles)
- [Palantir, Add Resource Roles](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resource-roles/add-resource-roles)
- [Palantir, Remove Resource Roles](https://www.palantir.com/docs/foundry/api/filesystem-v2-resources/resource-roles/remove-resource-roles)
