---
tags: [palantir, scim, entra-id, provisioning, identity]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry SCIM provisioning과 reconciliation"]
---

# SCIM provisioning과 reconciliation

SCIM 2.0은 login 사이에도 user/group을 IdP에서 동기화하는 경로다. 확인일 Foundry 문서는 beta/availability 변경 가능성을 명시한다. 프로토콜 지원이 모든 provider의 동일 기능/지연을 뜻하지 않는다.

## Network와 credential을 독립 구성한다

Authentication/Enrollment Administrator가 provider에 SCIM을 켜고 IdP 쪽도 설정한다. IdP의 SCIM egress가 일반 enrollment ingress에 안 맞으면 별도 SCIM subdomain을 만들고 해당 CIDR/country만 허용한다. Token endpoint도 선택한 host/subdomain과 맞춰야 한다.

기본 인증은 OAuth2 client credentials이며 bearer는 예외 지원 경로다. Credential 생성 시 선택한 org가 client 관리/secret rotation 권한을 결정한다. 해당 org의 TPA edit가 없으면 기존 secret 회전 대신 새 client만 만들 수 있고 새 client는 이전 credential을 무효화한다. 자동 rotation이라고 오인하지 않는다.

Entra TCP/TLS 테스트의 CredentialValidationUnavailable/Unable to connect는 ingress/routing을 확인하고 필요 시 Front Door proxy를 지원 경로로 검토한다. Login browser 성공만으로 SCIM agent network 성공을 확정하지 않는다.

## SSO ID와 SCIM externalId를 맞춘다

Entra gallery SSO app은 확인일 SCIM을 지원하지 않아 새 enterprise app이 필요하다. SAML setup은 SCIM URL 뒤 `?aadOptscim062020`으로 Entra의 SCIM2 동작을 고르고 OAuth credentials를 연결한다. OIDC+Entra SCIM은 지원 경로로 설정한다.

User `externalId`는 SSO의 Foundry Provider ID와 같은 안정 식별자여야 한다. Matching precedence는 externalId 1, userName fallback이다. 불일치하면 기존 username 충돌/중복 account/login 실패가 생길 수 있다.

Group displayName/externalId는 SSO에서 실제 group을 식별하는 displayName 또는 id와 둘 다 일치해야 한다. 이름 변경 뒤 불일치는 구성원의 login을 막을 수 있다. Entra nested-group provisioning은 피하고 interactive claim의 flattened membership과 동등하게 맞춘다.

## 모든 attribute와 rule이 같은 시점에 갱신되지는 않는다

동기화 user attribute는 userName/externalId/active/displayName/emails/name이다. 다른 mapping은 다음 login까지 반영되지 않는다. 초기 sync 뒤 update는 일반적으로 20~40분 batch이며 IdP별 지연이 있다. 성공 SCIM 감사는 IdP provisioning log, Foundry는 실패 error log를 확인한다.

초기 provisioning은 Control Panel org/intake/rule-based group을 평가하지만 AUM은 실행하지 않는다. **External group 기반 org assignment는 create 때 membership이 아직 없어 실행되지 않으며 group membership update만으로도 재평가되지 않는다.** Login 또는 user update가 필요하다. 전체 초기 sync 완료를 모든 group 기반 org 배정 완료로 보고하지 않는다.

Login의 Import user groups를 끄면 SSO가 membership을 갱신하지 않고 다음 SCIM까지 이전 값이 남는다. SCIM-only는 가능한 선택이지만 접근 철회 지연이 업무 기준에 맞는지 확인한다. Login과 SCIM 중 어느 경로가 authoritative인지, 예외 attribute와 rule의 다음 평가 시점을 함께 정한다.

## 출처

- [Palantir, SCIM overview](https://www.palantir.com/docs/foundry/authentication/scim-overview)
- [Palantir, Enabling SCIM](https://www.palantir.com/docs/foundry/authentication/scim-enable)
- [Palantir, Provisioning with Microsoft Entra ID](https://www.palantir.com/docs/foundry/authentication/scim-entra-id)
- [Palantir, Using other identity providers](https://www.palantir.com/docs/foundry/authentication/scim-other-idp)
- [Palantir, Common questions and issues](https://www.palantir.com/docs/foundry/authentication/scim-common-issues)

## 관련 문서

- [[Palantir-SSO-Identity-and-Certificate-Rotation|안정 계정 matching]]
- [[Palantir-Identity-Assignment-and-Intake|Rule 평가와 intake]]
- [[Palantir-Organization-and-Session-Controls|Ingress와 org 관리]]
