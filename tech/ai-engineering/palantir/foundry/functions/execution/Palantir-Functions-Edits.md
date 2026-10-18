---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 일반 Ontology edit의 수집, 적용과 조회

## 적용은 Action 경계에서 일어난다

일반 edit 함수는 변경을 수집하며 function-backed Action으로 실행되어 성공했을 때 Ontology에 적용한다. 함수 미리보기나 단순 함수 호출에서 edit가 반환되었다고 실제 데이터가 바뀐 것은 아니다. 다만 함수가 호출한 외부 API 효과까지 미리보기에서 안전하게 취소된다는 뜻은 아니다.

v1은 `@OntologyEditFunction`의 void 반환과 `@Edits` provenance를 사용한다. v2는 `createEditBatch`와 `Edits.Object/Interface/Link`를 선언하고 edit 배열을 반환한다. Python은 `@function(edits=[...])`, editable view, `list[OntologyEdit]` 반환을 사용한다.

## 언어별 읽기와 쓰기 차이

| 경계 | 동작 |
|---|---|
| v1 직접 속성 접근 | 수집한 변경을 볼 수 있지만 검색/집계는 아직 적용 전 상태일 수 있음 |
| v2 batch.update 뒤 기존 객체 | 변경값을 반영하지 않음 |
| Python editable view | 직접 속성/링크 접근에는 변경 반영, 원래 read-only 객체에는 미반영 |
| 일반 edit 뒤 검색 | 아직 미적용인 편집값으로 필터/집계하면 기대와 다를 수 있음 |

Python list를 제자리 수정하면 edit가 조용히 누락될 수 있다. 복사한 list를 수정한 뒤 property에 다시 대입한다. Python struct도 생성된 property class를 사용하고 전체 property를 다시 대입한다. beta flag가 필요하며 create의 keyword에 struct를 바로 넣지 않는다. v2 struct는 Ontology API field name에 맞춘 interface 객체를 전달한다.

기존 객체의 primary key는 변경할 수 없다. v2 interface 기반 생성에는 구체 object type과 그 primary key를 구현한 interface property가 필요하다. UUID는 실행마다 생성하고, 재시도 중복 방지는 별도 업무 idempotency 문제로 취급한다.

1:1/1:N 링크는 FK를 가진 객체의 편집이다. N:M 링크는 link type을 명시해 provenance를 완성한다. Python의 OntologyLinkType에는 attribute 이름이 아니라 실제 link API name을 쓴다. v1 정적 분석이 모든 간접 편집을 찾는다고 가정하지 않는다.

일반 edit 수집에서 create와 속성 변경은 합쳐질 수 있고 delete가 앞선 편집을 무효화할 수 있다. Ontology 원자성은 외부 webhook 성공까지 되돌려 주는 분산 트랜잭션이 아니다.

## 출처

- [Palantir, edits-overview](https://www.palantir.com/docs/foundry/functions/edits-overview)
- [Palantir, api-ontology-edits](https://www.palantir.com/docs/foundry/functions/api-ontology-edits)
- [Palantir, python-ontology-edits](https://www.palantir.com/docs/foundry/functions/python-ontology-edits)
- [Palantir, typescript-v2-ontology-edits](https://www.palantir.com/docs/foundry/functions/typescript-v2-ontology-edits)
- [Palantir, edits-generate-id](https://www.palantir.com/docs/foundry/functions/edits-generate-id)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
