---
tags: [palantir, authentication, organization, group, intake]
status: done
verified_at: 2026-10-16
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

Provider별 default org 또는 advanced user/group rule을 사용한다. User는 attribute/provider group을 우선 조건으로 쓰고 internal group 의존은 신중히 검토한다. Provider group은 이름 regex로 하나 이상의 org에 배정한다.

User의 No organization은 login을 막지만 provider group의 No organization은 마지막 login member의 org로 배정하는 동작이다. 둘을 같은 deny 설정으로 해석하지 않는다. Control Panel org assignment를 설정하면 legacy Multipass Group AUM의 org rule은 무시되므로 기존 rule과 비교한다.

## Intake는 자기신고를 승인된 attribute로 바꾼다

IdP 정보가 부족하면 text/dropdown/multi-select/date를 attribute로 수집하고 file/acknowledgment는 심사 근거로만 사용한다. Conditional field와 primary/supplemental form, 반복/비활성 기간 조건을 설정한다.

Publish 후 해당 provider의 첫 login은 제출과 eligible review 전까지 platform에 접근하지 못하고 대기 중 재제출할 수 있다. 기존 승인자는 form 수정만으로 권한을 잃지 않는다. Republish 때 전원 reauthorization을 요구하면 기존 user도 lockout돼 재제출/승인이 필요하다.

Org admin 기본 승인과 attribute별 federated reviewer를 구분한다. Attribute가 org assignment에 쓰이면 해당 org admin이 심사할 수 있다. Org admin 본인의 org 접근을 부여하는 submission은 auto-approved인 예외도 있다. Supplemental form은 최초 login 필수가 아니라 주기/이벤트에 따라 나중에 요구할 수 있다.

## Self-service directory의 recovery와 offboarding

Passwordless directory는 새 commercial/developer tier와 bootcamp의 제한된 경로이며 일반 enterprise IdP와 다르다. Enrollment/Authentication Administrator가 초대, passkey와 계정을 관리한다.

Passkey 일부 삭제는 나머지 인증을 유지하고 전부 삭제는 recovery email과 재등록을 요구하는 account reset이다. 최대 4개이며 slot이 차면 기존 하나를 지워야 한다. 이름은 관리자에게 보이므로 민감정보를 넣지 않는다.

Disable은 등록/login/reset을 막고, re-enable은 account reset 후 다시 등록/login하게 한다. Delete는 복구 불가이므로 소유 resource 공유/이전을 먼저 확인한다. 계정 삭제를 그 사람이 소유한 업무 자원의 자동 안전 이전으로 해석하지 않는다.

## 출처

- [Palantir, Group assignment](https://www.palantir.com/docs/foundry/authentication/group-assignment)
- [Palantir, Organization assignment](https://www.palantir.com/docs/foundry/authentication/org-assignment)
- [Palantir, Intake forms](https://www.palantir.com/docs/foundry/authentication/intake-forms)
- [Palantir, Manage users within your enrollment](https://www.palantir.com/docs/foundry/authentication/user-directory)

## 관련 문서

- [[Palantir-SSO-Identity-and-Certificate-Rotation|SSO ID와 provider 이전]]
- [[Palantir-Approval-Request-Lifecycle|승인과 invocation]]
- [[Palantir-SCIM-Provisioning-and-Reconciliation|비동기 provisioning]]
