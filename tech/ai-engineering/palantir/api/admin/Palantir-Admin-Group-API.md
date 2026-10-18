---
tags: [palantir, foundry, api, administration, group]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 그룹 중첩과 만료된 Membership을 구별한다

Group은 User와 다른 Group을 포함할 수 있다. Group ID, groupMembers의 principalId와 User의 groupMemberships는 같은 목록이 아니다. 직접 관계와 중첩을 통해 얻은 관계를 구분한다.

## 생성, 교체와 조회

`POST /api/v2/admin/groups`는 name과 optional description/attributes/organizations를 받는다. organizations는 schema optional이지만 설명과 오류 계약은 적어도 하나의 Organization RID를 요구한다. 이 Organization의 member가 그룹을 볼 수 있는 조건이며 group membership 자체를 부여하는 것은 아니다.

`PUT /groups/{groupId}`로 교체할 때는 getGroup에서 읽은 multipass: attribute 전부를 **그대로 보존**해야 한다. 내부 예약값은 편집할 수 없어 AttributesNotEditable이 난다. 일반 description/name 변경을 위해 attributes를 생략하거나 재구성하면 계약을 위반할 수 있다.

GET 단건, POST `/groups/getBatch`(최대 500), GET `/groups`와 POST `/groups/search`는 admin-read를 사용한다. batch는 Group ID map이다. search는 group name의 대소문자 무시 prefix이며 queryString where와 body pageSize/pageToken을 쓴다. list/search는 nextPageToken으로 계속 읽는다.

create/replace/DELETE `/groups/{groupId}`는 admin-write다. 이름 충돌, Organization 부재/미지정과 작업 권한/그룹 부재 오류를 구분한다. 삭제의 관계 정리나 복구 동작은 이 endpoint 명세가 별도로 보장하지 않는다.

## Group Members와 User Memberships

`GET /groups/{groupId}/groupMembers`는 transitive 기본 false이면 직접 User/Group만, true이면 모든 중첩 layer를 재귀 해석한다. includeExpirations도 기본 false이며 **transitive=true와 함께 true로 지정할 수 없다.**

expiration은 includeExpirations=true일 때만 채워진다. 필드가 없는 결과를 영구 멤버로 단정하지 않는다. 모든 관계의 transitive closure와 각 직접 membership의 만료를 함께 필요로 하면 별도 조회/해석이 필요하다. API가 재귀 결과에 만료를 합성해 주는 것은 아니다.

`POST /groups/{groupId}/groupMembers/add`는 principalIds와 optional expiration을 받고 `/remove`는 principalIds를 받는다. write scope이며 principal은 User/Group 둘 다다. 잘못된 만료는 InvalidGroupMembershipExpiration의 earliestExpiration/maximumDuration/maximumValue 문맥으로 판단한다.

`GET /users/{userId}/groupMemberships`는 User가 속한 Group을 반환한다. transitive=false 기본값은 직접 Group, true이면 상위로 중첩된 Group까지다. 반환 항목은 groupId이며 전체 Group metadata가 아니다. 두 목록 모두 read scope와 pageToken/pageSize를 사용한다.

## Expiration Policy

모든 Group은 expiration policy를 가지지만 owner가 정하지 않았다면 제약값은 비어 있다. Preview GET/PUT `/groups/{groupId}/membershipExpirationPolicy`에서 읽고 교체하며 preview=true와 read/write scope를 사용한다.

maximumValue는 이 시각 **이전**에 만료해야 하는 절대 상한, maximumDuration은 추가 시점부터 미래 **초** 단위 상대 기간 미만이다. maximumDuration은 long 문자열이다. 일반 observability duration의 unit/value 객체와 다르다. 예제 숫자 30만 보고 분이나 일로 바꾸지 않는다.

## 현재 사용자의 그룹은 제한된 예외다

Preview `GET /groups/listCurrent`는 현재 사용자가 직접/간접 member인 Group 모두를 반환한다. 이 endpoint는 특정 operation scope가 필요 없고 인증된 사용자가 자기 membership을 읽을 수 있다고 명시한다. 임의 사용자의 membership 조회나 익명 접근으로 확대하지 않는다. 응답에는 paging token이 없다.

이 문서는 공개 명세를 확인한 것이며 실제 그룹 관계나 만료 policy를 변경하지 않았다. [[Palantir-Admin-Identity-API]]의 provider realm과 [[Palantir-API-Client-Contract]]의 공통 권한을 함께 확인한다.

## 출처

- [Palantir, Create Group](https://www.palantir.com/docs/foundry/api/admin-v2-resources/groups/create-group)
- [Palantir, Replace Group](https://www.palantir.com/docs/foundry/api/admin-v2-resources/groups/replace-group)
- [Palantir, Get Groups Batch](https://www.palantir.com/docs/foundry/api/admin-v2-resources/groups/get-groups-batch)
- [Palantir, List Groups](https://www.palantir.com/docs/foundry/api/admin-v2-resources/groups/list-groups)
- [Palantir, Search Groups](https://www.palantir.com/docs/foundry/api/admin-v2-resources/groups/search-groups)
- [Palantir, List Group Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/group-members/list-group-members)
- [Palantir, Add Group Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/group-members/add-group-members)
- [Palantir, Remove Group Members](https://www.palantir.com/docs/foundry/api/admin-v2-resources/group-members/remove-group-members)
- [Palantir, List Group Memberships](https://www.palantir.com/docs/foundry/api/admin-v2-resources/group-memberships/list-group-memberships)
- [Palantir, Get Expiration Policy](https://www.palantir.com/docs/foundry/api/admin-v2-resources/group-membership-expiration-policies/get-group-membership-expiration-policy)
- [Palantir, Replace Expiration Policy](https://www.palantir.com/docs/foundry/api/admin-v2-resources/group-membership-expiration-policies/replace-group-membership-expiration-policy)
- [Palantir, List Current Groups](https://www.palantir.com/docs/foundry/api/admin-v2-resources/groups/list-current-groups)
