---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 객체 생성과 식별자의 지속성

Object type은 업무 entity/event의 스키마, object는 인스턴스, object set은 인스턴스 집합이다. 이름, API name, ID와 RID는 서로 다른 식별 계약이다. 화면 title key를 primary key와 혼동하지 않는다.

Primary key는 source마다 유일하고 build 사이에 결정적이어야 한다. OSv2는 중복 키를 Funnel build 오류로 처리한다. OSv1은 성공처럼 보여도 결과가 예기치 않게 바뀔 수 있다. 행 번호나 무작위 키를 매 build마다 생성하면 기존 편집이 연결되지 않거나 링크가 사라질 수 있다. primary key 변경은 기존 편집 삭제를 요구하므로 단순 이름 변경이 아니다.

모든 값을 Action으로 만들면 backing dataset 없는 object type을 만들 수 있다. project-based 권한과 object security policy가 필수다. 이는 빈 backing dataset을 생성하는 기존 선택과 다르다. 기존 source를 선택하면 컬럼을 자동 매핑하지만 속성/키/권한을 확인하고 Ontology Manager의 Save까지 해야 저장된다. Wizard의 Create는 stage만 한다.

Object API name은 PascalCase, property API name은 camelCase, 1~100자와 범위별 유일성을 기본으로 설명한다. 같은 생성 문서의 troubleshooting은 underscore/Unicode 허용 범위를 더 넓게 서술한다. 이를 단일 정규식 보장으로 재작성하지 않고 실제 validator와 생성 SDK를 대조한다. Object type ID는 생성 후 수정할 수 없으며 API name 변경도 소비자 호환성 문제다.

생성 가이드의 backing StructType 금지 문구는 struct 상세 문서의 dataset/RV struct column 지원과 충돌한다. 신규 struct 구현에는 상세 계약과 enrollment를 확인한다. 신규 자원과 기존 schema의 등록 성공을 데이터 색인 성공으로 간주하지 않는다.

## 출처

- [Palantir, object-link-types](https://www.palantir.com/docs/foundry/object-link-types)
- [Palantir, create-object-type](https://www.palantir.com/docs/foundry/object-link-types/create-object-type)
- [Palantir, object-type-metadata](https://www.palantir.com/docs/foundry/object-link-types/object-type-metadata)
- [Palantir, object-types-overview](https://www.palantir.com/docs/foundry/object-link-types/object-types-overview)
- [Palantir, type-reference](https://www.palantir.com/docs/foundry/object-link-types/type-reference)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
