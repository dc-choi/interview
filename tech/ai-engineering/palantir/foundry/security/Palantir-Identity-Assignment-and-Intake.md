---
tags: [palantir, authentication, organization, group, intake]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry identity 배정과 intake"]
---

# Identity 배정과 intake

IdP가 인증한 사용자도 Foundry의 group/organization 배정과 intake 승인을 거쳐 접근한다. 계정 존재, 로그인 가능과 특정 데이터 권한을 별도로 확인한다.

## Rule-based group은 login 때 갱신한다

한 rule의 condition은 AND, 같은 group의 별도 rule은 OR다. Includes는 provider group/array attribute 중 하나의 regex match, Does not include는 전부 불일치, Equal은 string attribute match다. Regex는 전체 문자열과 대소문자를 고려하므로 `admin`은 `admin-users`에 안 맞고 `admin.*`가 필요하다. Literal dot은 escape하고 `(?i)`로 case-insensitive를 고른다.

특히 negative match의 오타는 아무것도 제외하지 않아 다른 조건을 만족한 모두에게 group을 줄 수 있다. 기존 provider login 이력이 있는 user로 Test rules를 수행해 positive/negative를 확인한다. Save 즉시 retroactive로 적용하지 않고 다음 login에 적용한다.

Rule-based group은 자동 rule, provider/external group은 IdP, internal group은 Foundry 수동 membership과 nested group을 관리한다. 임시/사람 승인 접근은 internal group이 맞을 수 있다. Legacy group AUM이 켜진 enrollment는 rule-based group을 쓰지 못하는 조건이 있어 전환 가능성을 확인한다.

## Primary organization과 group marking은 다른 배정이다

Provider별 default org 또는 advanced user/group rule을 사용한다. User는 attribute/provider group을 우선 조건으로 쓰고 internal group 의존은 신중히 검토한다. Provider group은 이름 regex로 하나 이상의 org에 배정하며, 조건이 regex이므로 group 이름의 특수문자는 escape한다. Advanced rule은 user rule과 group rule을 따로 관리하고 선택적 fallback을 둘 수 있다. 저장 전 test panel은 기존 user가 어느 rule에 맞고 어느 org에 배정될지 보여 주지만, 그 provider로 로그인한 적 있는 user만 시험 대상으로 고를 수 있다.

User의 No organization은 login을 막지만 provider group의 No organization은 마지막 login member의 org로 배정하는 동작이다. 둘을 같은 deny 설정으로 해석하지 않는다. Control Panel org assignment를 설정하면 legacy Multipass Group AUM의 org rule은 무시되므로 기존 rule과 비교한다.

## Intake는 자기신고를 승인된 attribute로 바꾼다

IdP 정보가 부족하면 text/dropdown/multi-select/date를 attribute로 수집하고 file/acknowledgment는 심사 근거로만 사용한다. Conditional field와 primary/supplemental form, 반복/비활성 기간 조건을 설정한다.

Publish 후 해당 provider의 첫 login은 제출과 eligible review 전까지 platform에 접근하지 못하고 대기 중 재제출할 수 있다. 기존 승인자는 form 수정만으로 권한을 잃지 않는다. Republish 때 전원 reauthorization을 요구하면 기존 user도 lockout돼 재제출/승인이 필요하다.

Org admin 기본 승인과 attribute별 federated reviewer를 구분한다. Attribute가 org assignment에 쓰이면 해당 org admin이 심사할 수 있다. Org admin 본인의 org 접근을 부여하는 submission은 auto-approved인 예외도 있다. Supplemental form은 최초 login 필수가 아니라 주기/이벤트에 따라 나중에 요구할 수 있다.

## Self-service directory의 recovery와 offboarding

Passwordless self-service directory는 일반 enterprise IdP와 다른 경로다. 2026-10 사용자 관리 문서는 새 commercial/developer tier enrollment와 AIP bootcamp에만 제공된다는 경고를 두었지만, 2026-11-24 문서에서는 그 경고가 빠지고 self-service directory를 쓰는 commercial과 government enrollment를 대상으로 적는다. 로그인 안내 문서는 여전히 Developer Tier와 Bootcamp 기준으로 설명하므로 실제 제공 여부는 enrollment에서 확인한다. Enrollment/Authentication Administrator가 Control Panel > Manage user directory > Manage users에서 초대, passkey와 계정을 관리한다.

Passkey 일부 삭제는 나머지 인증을 유지하고 전부 삭제는 recovery email과 재등록을 요구하는 account reset이다. 최대 4개이며 slot이 차면 기존 하나를 지워야 한다. 이름은 관리자에게 보이므로 민감정보를 넣지 않는다.

Manage passkeys의 Add passkey는 추가 등록 초대를 보내며, 한 기기에서만 잠겼고 다른 기기의 passkey가 유효한 경우에 유용하다. 사용자는 one-time password와 등록 link가 담긴 메일을 받고, 기존 credential은 그대로 남는다. 패널은 남은 slot 수를 보여 주며 4개가 차 있으면 버튼이 비활성화된다. 관리자 dialog에는 사용자 이름, email과 user RID가 함께 보인다. Directory 전체의 허용 authenticator는 이 화면이 아니라 passkey profile에서 정한다([[Palantir-Passkey-Enrollment-and-Recovery|Passkey 등록과 계정 복구]]).

Disable은 등록/login/reset을 막고, re-enable은 account reset 후 다시 등록/login하게 한다. Delete는 복구 불가이므로 소유 resource 공유/이전을 먼저 확인한다. 계정 삭제를 그 사람이 소유한 업무 자원의 자동 안전 이전으로 해석하지 않는다.

## 출처

- [Palantir, Group assignment](https://www.palantir.com/docs/foundry/authentication/group-assignment)
- [Palantir, Organization assignment](https://www.palantir.com/docs/foundry/authentication/org-assignment)
- [Palantir, Intake forms](https://www.palantir.com/docs/foundry/authentication/intake-forms)
- [Palantir, Manage users within your enrollment](https://www.palantir.com/docs/foundry/authentication/user-directory)
- [Palantir, Authentication](https://www.palantir.com/docs/foundry/getting-started/authentication/)

## 관련 문서

- [[Palantir-SSO-Identity-and-Certificate-Rotation|SSO ID와 provider 이전]]
- [[Palantir-Approval-Request-Lifecycle|승인과 invocation]]
- [[Palantir-SCIM-Provisioning-and-Reconciliation|비동기 provisioning]]
- [[Palantir-Passkey-Enrollment-and-Recovery|Passkey 등록과 계정 복구]]
