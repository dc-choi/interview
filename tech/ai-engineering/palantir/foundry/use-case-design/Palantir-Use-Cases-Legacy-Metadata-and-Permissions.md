---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Use Cases 과거 앱의 metadata와 권한"]
---

# Use Cases 과거 앱의 metadata와 권한

## 조직화 도구의 수명

Use Cases 앱은 sunset 단계이며 미래 deprecation 예정이지만 full support 중이다. Project 조직화에는 Portfolios를 권장한다. 이 앱의 수명과 일반적인 use case 설계 방법론을 구분한다.

Use case는 기존 또는 새 backing project에 연결한다. Workflow project가 권장되지만 어느 project도 backing이 될 수 있다. Application 생성 후 save하면 use case와 참조 ontology 목록에 반영된다. 기존 project의 Create use case는 그 리소스를 별도 복제했다는 계약이 아니다. Project view와 Use Case view는 같은 backing을 탐색하는 다른 화면이다.

## Metadata 권한의 좁은 범위

Use Case Owner는 metadata/role 관리, Editor는 metadata 편집을 할 수 있다. 이 권한은 metadata만 대상으로 하며 resource 접근은 project/resource/ontology 권한으로 따로 결정한다. Metadata는 기본적으로 Organization 전체에 보일 수 있어 설명에 민감한 세부내용을 넣지 않는다.

Technical/Business owner는 책임자 metadata이며 resource ACL의 Owner role과 같지 않다. 생성자가 기본 technical owner이고 business owner는 기본값이 없다. Documentation은 backing project cover page에 저장되므로 case Editor/Owner 외에 cover page edit도 필요하다.

Active/Experimental/Deprecated는 표시된 운영 상태다. Active case 안에 Experimental/Deprecated ontology가 있으면 경고하지만 status 변경이 실제 publish/배포/테스트를 수행하지는 않는다. Local 표시는 datasource가 backing project에 있다는 뜻이고 다른 앱도 쓰면 공유 ontology project 이관 권장 경고가 나타난다. Local을 접근제한이나 미공유 보증으로 해석하지 않는다.

이 과거 앱의 상태 변경 화면은 Active use case를 영구 삭제하기 전에 Deprecated로 바꿔야 하며, Deprecated 상태는 저장 뒤 되돌릴 수 없다고 안내한다. 이를 backing project나 개별 resource의 삭제 계약, Portfolios의 상태 규칙으로 확대하지 않는다. (2026-10-18 [공식 상태 변경 화면](https://www.palantir.com/docs/resources/foundry/use-cases/use-case-statuses.png) 확인, 변경/삭제 미실행)

Object/Action 목록은 앱 의존성으로 자동 채워지거나 수동 추가된다. 사용되지 않는 수동 항목의 Remove는 이 목록에서 제거하는 작업이며 ontology 정의 삭제가 아니다. Backing data와 writeback datasource/Update via는 서로 다른 lineage 역할이다. 실제 migration/공유/리소스 생성은 수행하지 않았다.

## 출처

- [Palantir use-cases, use-cases](https://www.palantir.com/docs/foundry/use-cases)
- [Palantir use-cases, add-application-resources](https://www.palantir.com/docs/foundry/use-cases/add-application-resources)
- [Palantir use-cases, edit-metadata](https://www.palantir.com/docs/foundry/use-cases/edit-metadata)
- [Palantir use-cases, getting-started](https://www.palantir.com/docs/foundry/use-cases/getting-started)
- [Palantir use-cases, migrate-existing-project](https://www.palantir.com/docs/foundry/use-cases/migrate-existing-project)
- [Palantir use-cases, navigation](https://www.palantir.com/docs/foundry/use-cases/navigation)
- [Palantir use-cases, permission-use-case](https://www.palantir.com/docs/foundry/use-cases/permission-use-case)
- [Palantir use-cases, use-case-overview](https://www.palantir.com/docs/foundry/use-cases/use-case-overview)
- [Palantir use-cases, view-resources](https://www.palantir.com/docs/foundry/use-cases/view-resources)

## 관련 문서

- [[Palantir-Use-Case-Design]]
