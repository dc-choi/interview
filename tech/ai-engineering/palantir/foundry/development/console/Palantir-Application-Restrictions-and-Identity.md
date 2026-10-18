---
tags: [palantir, developer-console, oauth, authorization]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Application restriction과 identity"]
---

# Application restriction과 identity

Developer Console application은 OAuth client, SDK/schema documentation, resource restriction, optional hosting/repository/Marketplace/MCP를 묶는다. UI에서 resource를 구성해 SDK를 발행하는 방식이며 SuperRepo의 code-defined Ontology/function/frontend와는 authoring 계약이 다르다.

## Token scope는 권한의 교집합이다

실제 접근은 사용자 또는 service user 권한, application의 resource/operation 상한, authorization time에 요청한 operation scope의 교집합이다. App에 resource를 추가한다고 실제 user 권한이 생기지 않는다.

Client-facing은 public client/user permissions/authorization code grant를 사용하고 client secret을 저장하지 않는다. Backend service는 confidential client를 보관할 수 있으며 application permissions/client credentials면 generated service user로 실행한다. Backend/user permissions 같은 조합과 app type 선택을 분리해 확인한다.

모든 신규 application은 restricted로 생성한다. Unrestricted는 생성 이후 OAuth & restrictions에서 바꾼다. 전환하면 기존 Project/operation restriction configuration이 제거되고 다시 restricted로 바꿀 때 재구성이 필요하다. 단순히 toggle을 되돌려 기존 설정이 복원되는 것은 아니다.

## Resource와 operation의 경계

Ontology SDK resource 선택은 generated binding/documentation과 restriction에 영향을 준다. 한번 SDK를 만든 app의 Ontology는 바꿀 수 없다. Platform SDK tab은 접근 Project와 API operation을 지정한다. Project 밖 organization/space 등의 primitive나 아직 노출되지 않은 service endpoint는 restricted app 경로와 맞지 않을 수 있다.

Unrestricted는 app 상한을 없애지만 사용자 권한과 requested scope는 남는다. Trusted code와 필요한 operation만 선택한다. Default resource/access restriction 합계 제한은 application당 1,000이며 administrator와 조정할 수 있다.

Restricted의 빈 requested scope는 configured operation restriction을 따른다. Unrestricted authorization-code는 사용자가 동의할 operation을 명시해야 한다. Client-credentials의 scope 생략은 문서에 service user의 모든 허용 operation을 받는 예외로 명시되어 있어, 상단의 no-scope token은 권한 없다는 일반 경고와 구분한다. 실제 grant/type별 token 결과를 확인하고 생략에 기대어 최소 권한을 구현하지 않는다.

## API-level security와 scope migration

2025-06-01 이후 신규/마이그레이션한 restricted app은 각 API namespace operation을 명시해야 한다. api:use-*-read/write는 public platform API만 허용하고 내부 service endpoint는 차단한다. 기존 api:*-read/write scope와 다르며 unrestricted도 내부 API가 필요하지 않다면 use- scope를 우선한다.

Namespace dependency의 implicit grant는 없어졌다. Ontologies만 허용한 앱의 Admin getCurrent는 ApiUsageDenied가 날 수 있으므로 Admin operation을 별도로 더한다. OAuth/user info/authz/token TTL/organization 확인의 일부 multipass service endpoint는 identification/access debugging 예외로 호출 가능하지만 모든 Admin API가 암묵적으로 열린다는 의미는 아니다.

Migration은 새 use- scope를 기존 scope와 함께 추가하고 앱 migration을 완료한 뒤 old scope를 제거한다. 코드 scope만 일괄 교체하거나 UI migration만 하고 caller를 그대로 두면 중간 장애가 생길 수 있다.

## Resource 변경은 소비자 버전과 조정한다

Object backing dataset 등 dependency가 바뀌면 outdated restriction을 review/update해야 한다. SDK에서 entity를 제거할 때 old deployed client가 여전히 사용한다면 restriction에는 남겨 두고 client 전환 후 제거한다. SDK version과 permission 상한을 동시에 줄여 이전 client를 깨뜨리지 않는다.

Standalone OAuth client는 legacy이며 신규 생성할 수 없다. 기존 client를 Developer Console app으로 migration하는 경로는 유지하고 metadata/location/classification/권한을 검토한다. 기존 workflow 보존 설명을 모든 다른 Compass permission migration의 무변경 보장으로 섞지 않는다.

## 출처

- [Palantir, Developer Console](https://www.palantir.com/docs/foundry/developer-console)
- [Palantir, Application restrictions](https://www.palantir.com/docs/foundry/developer-console/application-restrictions)
- [Palantir, Create application](https://www.palantir.com/docs/foundry/developer-console/create-application)
- [Palantir, Permissions](https://www.palantir.com/docs/foundry/developer-console/permissions)
- [Palantir, Standalone OAuth clients (Legacy)](https://www.palantir.com/docs/foundry/developer-console/oauth-clients)
- [Palantir, Developer toolchain](https://www.palantir.com/docs/foundry/dev-toolchain)
- [Palantir, Ontology MCP](https://www.palantir.com/docs/foundry/developer-console/ontology-mcp)

## 관련 문서

- [[Palantir-Developer-Application-Permissions-and-Migration|관리자 권한]]
- [[Palantir-Consumer-Identity-and-Application-Models|Consumer 인증 모델]]
