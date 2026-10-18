---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 파생 속성과 reducer의 조회 의미

Ontology-defined derived property는 beta이며 linked object의 값을 런타임에 계산한다. 최대 세 hop을 지정하고, 경로 중 하나라도 여러 객체에 도달하면 aggregate를 선택한다. 모든 단계가 최대 한 객체이면 원본 속성을 직접 선택할 수 있다. Derived property를 또 다른 derived property의 원천으로 삼을 수 없으므로 실제 source까지 경로를 구성한다.

Count는 객체 수라 별도 property가 필요 없다. Sum/average/min/max/cardinality와 collect list/set의 지원 타입은 reference를 따른다. Collect는 기본 10, 최대 100이며 set은 중복 제거 후 제한한다. 반환 개수 제한과 전체 값의 filter/sort 평가는 다르므로 반환 배열에 보이지 않는 값으로 객체가 검색될 수 있다.

## Reducer는 저장 데이터를 바꾸지 않는다

Reducer는 numeric min/max, temporal earliest/latest, 문자열 사전식 first/last, boolean 우선값으로 배열의 대표값을 보여준다. 문자열 first/last는 입력 배열의 순서가 아니다. Struct array는 특정 field를 기준으로 고르고 동률 후보에만 다음 reducer를 적용한다. 끝까지 동률이면 deterministic하지만 정렬 순서를 보장하지 않는 하나를 반환한다.

대표값 자체를 직접 filter/query할 수 없다. 검색은 전체 배열에서 수행한다. 수정은 reindex 없이 반영되며 edit-only에서도 사용할 수 있다. 미지원 앱은 원래 배열 표시를 유지한다.

Reducer와 struct main field를 결합하면 Struct Array, main field Array, Struct, scalar를 인터페이스로 표현할 수 있다. Reducer를 먼저 적용하고 main field를 추출한다. 이 표현을 수정하는 interface Action은 원본을 역구성할 수 없어 실패한다. 읽기 인터페이스의 호환성이 쓰기 인터페이스 호환성을 보장하지 않는다.

## 출처

- [Palantir, derived-properties](https://www.palantir.com/docs/foundry/object-link-types/derived-properties)
- [Palantir, property-reducers](https://www.palantir.com/docs/foundry/object-link-types/property-reducers)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
