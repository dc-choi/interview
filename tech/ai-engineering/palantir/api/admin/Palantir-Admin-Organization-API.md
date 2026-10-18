---
tags: [palantir, foundry, api, administration, organization]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Enrollment, Organization과 역할의 관리 범위

Enrollment는 Foundry 인스턴스이며 고객은 통상 하나를 가진다고 명세가 설명한다. Organization은 Project 접근을 통제하는 특별한 Marking category다. 사용자는 한 primary Organization과 여러 guest Organization을 가질 수 있다.

## Enrollment와 Host

Preview GET `/api/v2/admin/enrollments/{enrollmentRid}` 또는 `/enrollments/getCurrent`로 enrollment를 읽는다. current는 현재 사용자의 primary Organization에 연결된 enrollment다. 반환은 rid/name과 optional createdTime이며 admin-read scope와 preview=true가 필요하다.

Preview `/enrollments/{enrollmentRid}/hosts`는 접근 가능한 hostname을 나열하고 paging한다. 실제 page size가 요청보다 작거나 커도 nextPageToken이 있으면 계속한다. 이 목록이 곧 SSO provider의 supportedHosts 설정과 동일하다는 보장은 아니다.

Enrollment role assignment는 Preview `/enrollments/{enrollmentRid}/roleAssignments`와 `/add`, `/remove`로 조회/추가/제거한다. add/remove는 roleId+principalId 목록을 최대 100개 받는다. 조회는 read, 변경은 write scope이며 없는 principal/role과 권한/enrollment 부재를 구별한다. list 응답에 paging token이 없으므로 임의 continuation을 추가하지 않는다.

## Organization의 생성과 주 Host

Preview `POST /api/v2/admin/organizations`는 enrollmentRid/name이 필수이고 administrators 목록은 schema optional이어도 설명/오류는 적어도 한 principal을 요구한다. 초기 organization:administrator role을 누락하면 생성되지 않는다. host/description도 지정할 수 있다.

GET `/organizations/{organizationRid}`는 rid/name/description/markingId와 optional host를 반환한다. PUT은 name/host/description을 교체하며 admin-write scope다. name 중복, 잘못된 hostname과 권한/존재 오류를 처리한다. host는 사용자 URL 구성에 사용할 primary hostname이며 허용 문자는 영문자/숫자/마침표/하이픈이다.

Organization Marking은 Project 수준에만 적용하며 개별 resource에 직접 적용하지 않는다. Project에 여러 Organization이 있으면 하나의 membership이면 해당 조건을 충족한다. Project의 적용/제거는 [[Palantir-Filesystem-Access]]를 따른다.

## Guest Membership과 Administration은 별개다

Organization의 markingId로 [[Palantir-Admin-Marking-API]]의 Marking Member API를 호출해 guest membership을 관리한다. Organization RID와 markingId를 같은 path 값으로 바꾸지 않는다.

Organization 관리자 역할은 `/organizations/{organizationRid}/roleAssignments`에서 GET list, POST `/add`와 `/remove`로 관리한다. 변경 한 번에 최대 100개 roleId/principalId다. scope는 조회 admin-read, 변경 admin-write다. Organization Marking의 ADMINISTER를 일반 Marking Role endpoint로 조작하는 것은 지원하지 않는다.

`GET /organizations/{organizationRid}/listAvailableRoles`는 할당 가능한 Role을 제공한다. Role은 ID/roleSetId/name/description/type/operations/isDefault를 담는다. type은 ORGANIZATION이고 operations는 service:action 형식의 실제 permission 집합이다. Palantir 제공 default role은 관리자가 수정할 수 없다.

role ID와 operation, role의 표시 이름을 구별하며 다른 resource role set의 ID를 임의 재사용하지 않는다. Organization member/guest라고 관리자 권한까지 부여되는 것은 아니다.

공개 명세 확인이며 실제 enrollment/Organization/guest/role을 변경하지 않았다. 비동기 전파 시간이나 여러 role 변경의 원자성은 이 endpoint가 별도로 보장하지 않는다.

## 출처

- [Palantir, Get Enrollment](https://www.palantir.com/docs/foundry/api/admin-v2-resources/enrollments/get-enrollment)
- [Palantir, Get Current Enrollment](https://www.palantir.com/docs/foundry/api/admin-v2-resources/enrollments/get-current-enrollment)
- [Palantir, List Hosts](https://www.palantir.com/docs/foundry/api/admin-v2-resources/hosts/list-hosts)
- [Palantir, Enrollment Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/enrollment-role-assignments/add-enrollment-role-assignments)
- [Palantir, Create Organization](https://www.palantir.com/docs/foundry/api/admin-v2-resources/organizations/create-organization)
- [Palantir, Get Organization](https://www.palantir.com/docs/foundry/api/admin-v2-resources/organizations/get-organization)
- [Palantir, Replace Organization](https://www.palantir.com/docs/foundry/api/admin-v2-resources/organizations/replace-organization)
- [Palantir, List Available Roles](https://www.palantir.com/docs/foundry/api/admin-v2-resources/organizations/list-available-roles-organization)
- [Palantir, Organization Role Assignments](https://www.palantir.com/docs/foundry/api/admin-v2-resources/organization-role-assignments/add-organization-role-assignments)
