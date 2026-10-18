---
tags: [palantir, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology permission model의 비가역적 이동

현재 권장되는 project permissioning과 과거 datasource-derived에서 Ontology roles로 이동하는 절차를 구분한다. 두 문서 모두 완료한 migration을 이전 모델로 되돌릴 수 없다고 명시한다. 이 지식 정리는 migration 실행 승인이 아니다.

## 현재 project permissioning

Ontology resource는 같은 space의 project에 저장한다. 이름은 Compass 규칙을 따라 slash를 쓸 수 없고 경로 이름은 고유해야 한다. 충돌 이름에는 (1) 같은 suffix가 붙을 수 있다.

배치 방식은 datasource 옆의 use-case project, 정의 전용 project, 공통 core와 use-case를 나누는 hybrid를 비교한다. 공통 schema의 발견성과 data 접근 범위가 다르면 project를 분리할 수 있다. Migration assistant의 강한 추천도 실제 사용자 권한과 필요한 import를 검토한 뒤 확정한다.

기존 Ontology service project에서는 모든 사용자에게 기본 Viewer가 있고 file classification이 없었다. Marketplace에서 target project로 설치 위치가 바뀌면 role/marking/classification 때문에 schema가 덜 보일 수 있다. 정의와 나머지 파일의 공개 범위가 다르면 linked Marketplace product 두 개로 나누는 방법을 검토한다.

Migration 자체는 resource metadata 권한의 이동이며 data policy를 변경하는 작업이 아니다. Migration 문서의 backing source 기준 설명은 datasource policy 맥락이다. 현재 object/property policy를 지원하는 모델까지 항상 datasource 권한으로 결정된다고 일반화하지 않는다.

## Legacy Ontology roles

과거 roles migration은 metadata 편집 권한을 datasource 편집 권한에서 분리한다. 해당 Ontology의 사용자에게 type/link/action metadata View가 생길 수 있지만 원천 data를 공개하는 것은 아니다. Object View 편집의 권한 검사도 기존 Object View Administrators+datasource Editor에서 Ontology Editor로 달라졌다.

일반적으로 object type은 input datasource Owner, N:M link는 해당 link datasource Owner가 필요하다. 1:N link는 양쪽 type Viewer와 link 또는 Ontology Owner를 확인한다. Action type 자체 migration에는 별도 data 권한 추가가 없지만 이후 Action 편집은 Action과 수정 대상 type 권한을 함께 요구한다.

Bulk migration은 한 번에 500resource까지다. 역할 제안은 실제 group grant와 비교한다. Legacy bulk 도구는 역할을 자동 제안하지 않는다고 설명하며 individual 도구의 datasource/admin 역할 추천과 구분한다.

Action에 current-user permission을 확인하는 submission criteria가 없으면 먼저 저장해야 한다. Function-backed Action은 수정 대상 type을 `@edits`로 선언한 함수 재게시가 필요할 수 있다. 자동 추론이 실패하면 migration 뒤 Action 실행이 실패할 수 있으므로 실제 수정 대상과 권한을 확인한다.

현재 기능을 위한 새 도입에서 legacy roles migration을 중간 단계로 반드시 거쳐야 한다고 추정하지 않는다. 현재 project migration과 enrollment 상태를 기준으로 결정한다.

## 출처

- [Palantir, migrate-to-project-based-permissions](https://www.palantir.com/docs/foundry/ontology-manager/migrate-to-project-based-permissions)
- [Palantir, ontology-roles-migration](https://www.palantir.com/docs/foundry/ontology-manager/ontology-roles-migration)

## 관련 문서

- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]

공식 본문을 대조한 지식이며 실제 Foundry 환경에서 실행 검증하지 않았다.
