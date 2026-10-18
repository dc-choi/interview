---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Shared property의 메타데이터 재사용

Shared property는 여러 객체 타입의 메타데이터를 한곳에서 관리한다. 실제 객체 값이나 backing data를 공유하는 기능은 아니다. 이름/설명, base type, formatting, render hint, visibility와 type class를 재사용한다.

기존 property에 적용해도 object-local ID와 API name은 유지된다. 상속받는 메타데이터는 로컬에서 직접 편집할 수 없지만 type class는 로컬과 shared의 합집합으로 사용할 수 있다. Shared render hint가 기존 로컬 값을 덮어쓰므로 검색/정렬/색인 변화도 검토한다.

Usage에서 소비 object type을, Permissions에서 편집 주체를 확인한다. Shared property 삭제는 사용 중인 로컬 속성을 모두 삭제하는 것이 아니라 일반 속성으로 되돌린다. Detach도 연결을 해제하는 작업이다. 생성/적용/삭제는 Ontology Manager의 Save로 확정한다.

## 출처

- [Palantir, create-shared-property](https://www.palantir.com/docs/foundry/object-link-types/create-shared-property)
- [Palantir, edit-shared-property](https://www.palantir.com/docs/foundry/object-link-types/edit-shared-property)
- [Palantir, shared-property-metadata](https://www.palantir.com/docs/foundry/object-link-types/shared-property-metadata)
- [Palantir, shared-property-overview](https://www.palantir.com/docs/foundry/object-link-types/shared-property-overview)
- [Palantir, use-shared-property](https://www.palantir.com/docs/foundry/object-link-types/use-shared-property)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
