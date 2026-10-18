---
tags: [palantir, foundry, security, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry Project, role과 조직 경계"]
---

# Foundry Project, role과 조직 경계

Project는 협업 자원과 discretionary role grant를 묶는 단위다. Organization/marking의 mandatory requirement는 Project role과 별도로 만족해야 한다. 조직의 데이터 소유권과 앱을 편집할 권한을 같은 그룹으로 통합하기 전에 각각의 목적을 나눈다.

## 공간과 membership

사용자는 한 organization의 member이고 다른 organization에는 guest가 될 수 있다. Project에 여러 Org가 적용되면 그중 하나의 member/guest 조건으로 접근 eligibility를 충족한다. Organization, 사용자와 group의 cross-org discovery는 별도 설정이다.

Space는 같은 목적/공통 Ontology의 Project container다. Shared space에 Org 둘을 넣어도 안의 모든 Project가 두 Org에 공개되는 것은 아니며 subset을 선택할 수 있다. Portfolio는 Space의 Project를 정리하는 탐색 단위로 Project 접근 권한을 부여하지 않는다. Project는 하나의 Portfolio에 속하며 이동하면 이전 목록에서 빠진다.

## Role과 custom operation

Default role은 Owner/Editor/Viewer/Discoverer다. Role은 operation 집합이므로 custom role set에서 상위 이름이 다른 role의 모든 operation을 포함한다고 보장하지 않는다. Group 단위 Project grant를 사용하면 사용자별 resource grant보다 관리가 명확해진다.

Project-level grant는 child resource로 상속된다. File/folder grant를 비활성화하면 기존 직접 grant와 개별 link-sharing grant가 제거될 수 있고, 해당 Project로 resource를 옮길 때도 영향을 받는다. Toggle을 단순히 이후 신규 공유만 막는 설정으로 오해하지 않는다.

Project default role과 Project discovery는 구분한다. 문서의 default Viewer 설명과 예시에서 의도적으로 Discoverer를 선택한 것은 다른 설정이다. 실제 환경/Project의 default와 mandatory requirements를 확인한다. Cover page는 별도 discoverability 설정으로 Project에 접근하지 못하는 같은 Org 사용자에게도 보일 수 있어 민감 내용을 넣지 않는다.

## Reference와 derived data

Build의 논리/input/output은 Project scope 안에 있어야 하며 외부 input은 reference로 가져온다. 보통 source Viewer와 destination Editor가 필요하다. Reference는 source Project 전체를 복제하거나 그 role을 모든 downstream consumer에게 요구하는 기능이 아니다.

Derived output을 읽는 사용자는 source Project role 없이도 destination role로 읽을 수 있지만 inherited organization/marking은 계속 만족해야 한다. 원본 input을 직접 조회하거나 재사용할 권한과 derived output 권한을 구분한다. 일부 tutorial은 reference 뒤 모든 동료가 raw transform을 작성할 수 있다고 넓게 표현하므로 구체적인 source permission 설명과 대조한다.

## App, schema와 data permission

Object type/link/action 정의의 metadata edit permission과 object data 접근은 별도다. Object type에 role을 주는 것만으로 backing datasource의 데이터까지 읽게 되지는 않는다. 앱을 볼 수 있어도 object/link/action 또는 backing data가 없어 기능이 비어 보일 수 있다.

Datasource/transform/Ontology/app Project를 분리하면 개발자, data maintainer와 consumer의 역할을 구분할 수 있다. 이 구조 자체를 read-time policy의 downstream 전파나 완전한 data-loss prevention으로 취급하지 않는다.

## 협업과 조합 제한

Cross-Org share에서는 private input을 reference한 뒤에도 upstream Org 요구가 남는다. 민감 데이터 축소와 승인된 경로의 requirement 변경, 공유 destination role을 함께 검토해야 한다. Shared space에 넣었다는 이유만으로 원천 제약이 사라지지 않는다.

Project constraints의 allowed/prohibited marking은 사용자가 각각 읽을 수 있는 데이터를 부적절하게 조합하는 것을 막는 용도다. 위반 resource의 저장/build를 제한하며, upstream marking 변경 후 violation은 별도로 해결해야 한다. Tag/cover/Portfolio 같은 탐색 metadata를 보안 제어로 대신하지 않는다. 실제 환경의 sharing과 build를 실행해 검증한 문서는 아니다.

## 출처

- [Palantir Security, cover-pages](https://www.palantir.com/docs/foundry/security/cover-pages)
- [Palantir Security, cross-organization-collaboration](https://www.palantir.com/docs/foundry/security/cross-organization-collaboration)
- [Palantir Security, orgs-and-spaces](https://www.palantir.com/docs/foundry/security/orgs-and-spaces)
- [Palantir Security, portfolios](https://www.palantir.com/docs/foundry/security/portfolios)
- [Palantir Security, project-constraints](https://www.palantir.com/docs/foundry/security/project-constraints)
- [Palantir Security, projects-and-roles](https://www.palantir.com/docs/foundry/security/projects-and-roles)
- [Palantir Security, securing-a-business-application](https://www.palantir.com/docs/foundry/security/securing-a-business-application)
- [Palantir Security, securing-a-data-foundation](https://www.palantir.com/docs/foundry/security/securing-a-data-foundation)
- [Palantir Security, security-glossary](https://www.palantir.com/docs/foundry/security/security-glossary)
- [Palantir Security, users-and-groups](https://www.palantir.com/docs/foundry/security/users-and-groups)

## 관련 문서

- [[Palantir-Security-Governance]]
- [[Palantir-Security-Control-Propagation|Foundry 접근 제어의 전파와 읽기 경계]]
- [[Palantir-Security-Audit-Schema-and-Delivery|Foundry audit schema, 전달과 증거 해석]]
- [[Palantir-Security-Privacy-Downloads-and-Justification|Foundry 데이터 최소화, 다운로드와 정당화]]
- [[Palantir-Security-Identity-Resilience-and-Shared-Responsibility|Foundry identity, 복구와 공동 책임]]
- [[Palantir-Security-Code-Scanning-Contracts|Foundry code scanning의 규칙과 검증 범위]]
