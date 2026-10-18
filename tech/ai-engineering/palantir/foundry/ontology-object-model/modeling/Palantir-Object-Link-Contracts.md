---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 양방향 링크와 관계 저장 방식

하나의 link type은 양방향이며 각 side에 display/API name이 있다. 역방향 탐색을 위해 별도 link type을 만들 필요가 없다. 같은 두 타입의 별개 업무 관계는 여러 link type으로 표현할 수 있다. 자기 타입 간 링크는 가능하지만 서로 다른 Ontology 사이의 링크는 지원하지 않는다.

| 방식 | 저장 계약 | 검토할 조건 |
|---|---|---|
| Foreign key | 한쪽 속성이 다른 쪽 primary key를 참조 | 타입 일치, many-to-one/one-to-one의 실제 데이터 |
| Join table | 양쪽 primary key 쌍을 dataset에 저장 | many-to-many, 두 키 컬럼을 중복 매핑하지 않음 |
| Object-backed | 중간 객체와 양쪽 관계를 사용 | 관계 자체의 추가 속성, 접근 제약과 lifecycle |

One-to-one cardinality는 의도를 나타내며 유일성을 강제하지 않는다. 관계를 수정하는 Action에서 업무 제약을 별도로 검증한다. Foreign key 기반 링크 변경과 join table 링크 편집은 다른 경로다. 생성 문서의 many-to-many 편집 전제는 FK 속성을 Action으로 바꾸는 기능까지 금지하는 설명으로 확장하지 않는다.

Object-backed link는 양 끝 객체와 중간 객체, 그 사이의 many-to-one 링크를 먼저 구성한다. 기존 link를 전환할 수도 있다. Object Explorer, Vertex와 Workshop에서 중간 객체의 속성을 볼 수 있으며 Vertex title은 중간 객체 title을 사용한다.

Link API name은 side가 가리키는 목적 객체를 뜻하며 source object의 메서드에서 사용한다. lowercase 시작, 1~100자, 같은 object type에서 유일하고 NFKC 정규화 및 reserved keyword 제한을 따른다. 같은 dataset/branch가 이미 다른 link type의 backing이면 등록 오류가 난다.

## 출처

- [Palantir, create-link-type](https://www.palantir.com/docs/foundry/object-link-types/create-link-type)
- [Palantir, link-type-metadata](https://www.palantir.com/docs/foundry/object-link-types/link-type-metadata)
- [Palantir, link-types-overview](https://www.palantir.com/docs/foundry/object-link-types/link-types-overview)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
