---
tags: [palantir, saml, oidc, authentication, certificate]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry SSO 식별자와 인증서 회전"]
---

# SSO 식별자와 인증서 회전

Foundry는 SAML 2.0/OIDC 1.0 IdP에서 사용자 identity, attribute와 group을 받아 로그인/조직 배정을 수행한다. IdP 인증, network reachability, 계정 matching과 데이터 인가는 다른 단계다.

## 사용자 ID는 사람이 읽는 이름과 다르다

SAML 기본 ID는 `NameID`, OIDC는 `sub`지만 lifetime 동안 유일하고 안정적인 값을 사용해야 한다. Non-empty/항상 포함/대소문자 등 일관된 형식이 필요하며 email/username 변경을 계정 ID 변경으로 연결하지 않는다.

Entra SAML은 기본 UPN이 변할 수 있어 새 integration은 `user.objectid` 기반 NameID를 권장한다. 기존 integration의 NameID 변경은 계정 중복/접근 상실을 유발할 수 있어 지원 경로로 migration한다. Entra OIDC+SCIM은 SCIM에 sub가 없으므로 `oid`를 ID로 쓰는 계약이다.

Okta는 NameID 외 firstName/lastName/email attribute statement를 먼저 정의하고 Foundry에 mapping한다. SAML ACS는 Okta Single sign on URL, Entity ID는 Audience URI에 해당한다. 다른 IdP의 화면/명칭은 달라도 SP metadata와 IdP metadata의 방향은 유지한다.

## SAML metadata와 인증서를 겹쳐 회전한다

Foundry SP metadata는 Entity ID, ACS, Single Logout와 signing certificate를 IdP에 전달한다. IdP metadata는 SSO/SLO와 certificate를 Foundry에 전달한다. Upload 또는 egress policy를 붙인 Fetch URI를 사용한다.

30일 내 certificate expiry warning이 있으면 새 certificate를 IdP에 추가하되 old를 유지하고, Foundry에 두 certificate가 보이는 XML을 먼저 저장한 뒤 IdP의 signing을 새 값으로 전환한다. 먼저 signer부터 바꾸면 login이 실패할 수 있다. Old certificate 제거만으로 metadata를 다시 upload할 필요는 없다는 안내와 아래 validUntil 예외를 구분한다.

Automatic refresh는 새 signer로 첫 검증이 실패하면 같은 discovery URI에서 metadata를 다시 가져와 retry한다. URI 자체가 바뀌면 자동 회전이 안 되므로 만료 전 수정한다. Metadata의 `validUntil`이 old active certificate에 묶이면 새 cert를 미리 포함했어도 metadata가 만료될 수 있다. Auto-refresh가 없으면 signer 전환 후 updated metadata를 다시 올려야 한다.

## OIDC는 server egress와 claim shape를 확인한다

Discovery 또는 수동 issuer/authorization/token/JWKS와 필요 시 user-info, 선택 end-session endpoint를 구성한다. Token endpoint authentication은 HTTP Basic 또는 form POST credential이다. `openid`, `email`, `profile` scope가 필수다. Public IdP의 누구나 가입 가능한 account를 조직의 허용 사용자로 오인하지 않는다.

Redirect URL은 IdP에 등록하고 front/back-channel logout URL은 원하는 logout 동작에 따라 고른다. Discovery/token/JWKS 접근에는 egress가 필요하며 브라우저 redirect와 server network는 별도로 진단한다.

OIDC JSONPath는 기본 single string 추출, `[*]`는 array element를 개별 추출한다. SAML/OIDC 모두 multi-value의 First/All을 정한다. Provider group import를 끄면 login 때 membership을 갱신하지 않아 SCIM 등의 별도 경로가 필요하다. SAML group regex는 그룹값 전체 추출 또는 comma-separated 값 분리 등 원 claim shape와 맞춘다.

## Login 선택과 실제 검증을 나눈다

Email-domain regex와 supported host는 어떤 provider를 login 선택지로 보일지 결정한다. 기본 case-sensitive이며 `(?i)`로 완화할 수 있다. Suitable provider 없음 오류는 email pattern 또는 host 설정을 확인한다. Host default 미설정이면 provider 목록을, 권한이 없으면 Unknown default provider를 볼 수 있어 부재와 미열람을 구분한다.

OIDC prompt none/login/consent/select_account와 provider 기본 동작을 구분한다. Login Checkpoint는 별도 AUM enablement와 justification 설정이 필요하다. MFA는 IdP 또는 Foundry가 수행하고 reset 책임자도 그 관리 위치에 따른다.

Provider를 enable한 뒤 test login을 만들면 login 결과와 received attribute snapshot, mapping preview를 확인할 수 있다. 기존 계정 matching/group/org/MFA까지 확인한다. Test 결과는 한 달 후 삭제되므로 영구 감사 기록으로 기대하지 않는다.

## IdP 이전은 새 provider 생성만으로 끝나지 않는다

새 SAML provider에서 그대로 login하면 사용자/group이 중복되고 home/shared resource 접근을 잃을 수 있다. In-place는 동일 attribute와 ID가 유지되는 경우에만 사용한다. ID가 달라지면 새 provider/test account를 시험한 뒤 잠시 disable하고 external-to-external 사용자 migration을 지원 경로로 수행한다. 두 provider enable과 계정 migration 완료를 별도로 확인한다.

## 출처

- [Palantir, Authentication](https://www.palantir.com/docs/foundry/authentication/overview)
- [Palantir, SAML getting started](https://www.palantir.com/docs/foundry/authentication/saml-getting-started)
- [Palantir, OIDC getting started](https://www.palantir.com/docs/foundry/authentication/oidc-getting-started)
- [Palantir, SAML for Entra ID](https://www.palantir.com/docs/foundry/authentication/saml-azure-ad)
- [Palantir, SAML for Okta](https://www.palantir.com/docs/foundry/authentication/saml-okta)
- [Palantir, SAML for other providers](https://www.palantir.com/docs/foundry/authentication/saml-other-idp)
- [Palantir, Update SAML provider](https://www.palantir.com/docs/foundry/authentication/saml-provider-update)
- [Palantir, Host settings](https://www.palantir.com/docs/foundry/authentication/host-settings)
- [Palantir, Multi-factor authentication](https://www.palantir.com/docs/foundry/authentication/multi-factor-auth)
- [Palantir, Enable and test provider integration](https://www.palantir.com/docs/foundry/authentication/test-provider-integration)

## 관련 문서

- [[Palantir-Organization-and-Session-Controls|Session과 ingress]]
- [[Palantir-Identity-Assignment-and-Intake|로그인 배정과 intake]]
- [[Palantir-SCIM-Provisioning-and-Reconciliation|SCIM matching과 지연]]
