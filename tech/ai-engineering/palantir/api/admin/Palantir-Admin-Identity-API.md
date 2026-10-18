---
tags: [palantir, foundry, api, administration, identity]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# User와 SSO Provider의 식별 관계

User는 개인 사용자 또는 service account를 나타낸다. Foundry User ID, username, external providerId와 realm을 구별한다. username은 realm 안에서 유일하지만 이메일은 여러 User가 공유할 수 있어 식별 key로 가정하면 안 된다.

## User 조회와 상태

`GET /api/v2/admin/users/{userId}`는 optional status(ACTIVE/DELETED)를 받고 `POST /users/getBatch`는 최대 500개 userId/status를 받아 ID map을 반환한다. `GET /users/getCurrent`는 현재 사용자를 읽는다. read operation scope는 `api:admin-read`다.

User에는 ID/username/realm/status와 optional givenName/familyName/email/organization/attributes가 있다. primary organization은 third-party application service user에서는 비어 있을 수 있다. attributes는 문자열 목록 map이며 multipass: prefix는 내부 예약값으로 변경될 수 있다. SSO가 로그인 시 추가 attribute를 채울 수도 있다.

`GET /users`는 include=ACTIVE/DELETED와 paging을 지원한다. `POST /users/search`는 active user의 username/given/family name을 대소문자 무시 prefix로 검색한다. deleted user는 검색되지 않으므로 list include=DELETED를 쓴다. search body의 where는 queryString type/value이며 pageSize/pageToken을 받고 nextPageToken으로 계속 읽는다. list의 실제 page 수가 요청보다 작거나 커도 token이 있으면 계속한다.

`GET /users/{userId}/getMarkings`는 현재 접근 가능한 Marking의 view 목록을 반환하며 guest Organization의 marking도 포함한다. 이 목록을 resource의 role permission까지 모두 충족한다는 뜻으로 확대하지 않는다.

`GET /users/{userId}/profilePicture`는 업로드 원래 형식의 binary다. Content-Type으로 media type을 판별하며 JSON이나 PNG로 고정하지 않는다. invalid image와 Profile service 부재, user 삭제/부재/권한 오류를 구별한다.

## 삭제와 Token 무효화

`DELETE /users/{userId}`와 `POST /users/{userId}/revokeAllTokens`는 admin-write scope다. 후자는 browser session과 장기 development token을 포함한 기존 인증 token을 무효화하여 재인증을 요구한다. token이 명시적으로 revoked로 보이지 않아도 인증에 사용할 수 없게 될 수 있다.

무효화는 즉시가 아닐 수 있고 수분 안에 반영된다고 명시한다. 대상 primary Organization의 사용자 관리 권한도 필요하다. 호출 성공 직후 모든 token이 차단되었다고 보고하지 않는다. UserDeleted/UserIsActive/UserNotFound 상태 오류도 요청한 status와 함께 해석한다.

## SAML/OIDC 설정 조회와 사전 등록

Preview `GET /admin/enrollments/{enrollmentRid}/authenticationProviders`와 뒤의 `/{authenticationProviderRid}`는 admin-read로 SSO provider를 읽는다. name/realm/enabled, supportedHosts와 supportedUsernamePatterns, protocol을 확인한다. enabled는 로그인 허용, hosts는 사용할 hostname, username pattern은 provider redirect 조건이다.

SAML의 serviceProviderMetadata는 Foundry가 생성한 entityId, 공개 XML metadataUrl, ACS/logout URL, PEM certificate/expiry/usageType이다. 이를 외부 IdP가 생성한 값으로 혼용하지 않는다. OIDC는 이 조회 schema에 별도 child detail이 열거되지 않는다. provider 목록 응답에는 continuation token이 없으므로 임의 paging을 더하지 않는다.

Preview POST `/{authenticationProviderRid}/preregisterUser`는 최초 로그인 전 username과 primary Organization을 등록해 group/role 사전 할당을 가능하게 한다. username은 provider의 지원 pattern과 일치해야 한다. 첫 로그인 때 assignment rule에 따라 Organization이 달라질 수 있다. optional 이름/이메일/attributes를 받을 수 있으며 실제 계정의 비밀번호 생성 API가 아니다.

같은 위치의 preregisterGroup은 아직 해당 group 사용자가 로그인하지 않아도 이름으로 그룹을 등록한다. 두 작업은 admin-write와 preview=true가 필요하며 반환은 PrincipalId다. 일반 Foundry 내부 group 생성과 SSO realm의 preregistration을 구별한다.

## Provider ID 변경

`GET/PUT /admin/users/{userId}/providerInfo`와 `/admin/groups/{groupId}/providerInfo`는 external providerId를 읽고 교체한다. 같은 realm 안에서 해당 providerId의 User는 최대 하나, Group도 최대 하나다. realm은 SSO 소속 경계이고 palantir-internal-realm은 관리자가 만든 내부 principal이다.

보호된 realm에서는 providerInfo 교체가 허용되지 않는다. provider 식별자 변경은 표시 이름 변경과 다른 작업이며 이후 로그인의 principal 매핑에 영향을 준다. 조회는 read, 교체는 write scope이며 providerInfo 부재와 principal 부재/삭제/권한 오류를 구별한다.

공개 명세 확인이며 실제 사용자, SSO 설정이나 token을 변경하지 않았다. 개인정보가 담긴 실제 응답은 이 지식 문서에 복제하지 않는다.

## 출처

- [Palantir, User API](https://www.palantir.com/docs/foundry/api/admin-v2-resources/users)
- [Palantir, Get User](https://www.palantir.com/docs/foundry/api/admin-v2-resources/users/get-user)
- [Palantir, Get Users Batch](https://www.palantir.com/docs/foundry/api/admin-v2-resources/users/get-users-batch)
- [Palantir, List Users](https://www.palantir.com/docs/foundry/api/admin-v2-resources/users/list-users)
- [Palantir, Search Users](https://www.palantir.com/docs/foundry/api/admin-v2-resources/users/search-users)
- [Palantir, Get Markings User](https://www.palantir.com/docs/foundry/api/admin-v2-resources/users/get-markings-user)
- [Palantir, Profile Picture](https://www.palantir.com/docs/foundry/api/admin-v2-resources/users/get-profile-picture-of-user)
- [Palantir, Revoke All Tokens](https://www.palantir.com/docs/foundry/api/admin-v2-resources/users/revoke-all-tokens-user)
- [Palantir, Delete User](https://www.palantir.com/docs/foundry/api/admin-v2-resources/users/delete-user)
- [Palantir, Authentication Provider](https://www.palantir.com/docs/foundry/api/admin-v2-resources/authentication-providers/get-authentication-provider)
- [Palantir, Preregister User](https://www.palantir.com/docs/foundry/api/admin-v2-resources/authentication-providers/preregister-user)
- [Palantir, Preregister Group](https://www.palantir.com/docs/foundry/api/admin-v2-resources/authentication-providers/preregister-group)
- [Palantir, Replace User Provider Info](https://www.palantir.com/docs/foundry/api/admin-v2-resources/user-provider-infos/replace-user-provider-info)
- [Palantir, Replace Group Provider Info](https://www.palantir.com/docs/foundry/api/admin-v2-resources/group-provider-infos/replace-group-provider-info)
