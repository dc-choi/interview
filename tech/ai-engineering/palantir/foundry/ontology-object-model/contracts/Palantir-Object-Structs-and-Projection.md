---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Struct의 저장, 검색과 인터페이스 투영

Struct는 여러 typed field를 하나의 속성에 둔다. 원천이 여러 곳이어도 Ontology에 매핑하기 전에 하나의 struct column으로 합친다. 중첩 struct와 struct field의 배열은 지원하지 않지만 struct 자체의 배열은 가능하다. 최소 한 field가 필요하며 primitive numeric/boolean/date/time/string/geopoint 범위를 따른다. OSv1은 지원하지 않고 dataset/RV를 source로 사용한다.

## 검색은 같은 원소 일치를 보장하지 않는다

Struct array의 field 조건은 독립 평가한다. 예를 들어 `[{code:A, state:old}, {code:B, state:new}]`에서 `code=A AND state=new`가 객체를 찾을 수 있다. 같은 struct 원소가 두 조건을 동시에 만족한다는 뜻은 아니다. 같은 원소의 결합 의미가 중요하면 모델링 또는 별도 검증이 필요하다.

생성/automapping 뒤 field 이름, 타입과 backing mapping을 확인한다. Field API name 변경은 새 field RID를 만들고 기존 index를 대체하므로 참조 앱을 갱신해야 한다. Shared struct로 전환하면 field remap을 하되 로컬 field RID는 유지한다. Shared field 추가는 소비하는 모든 local struct에 column mapping을 요구한다.

## Main field는 표시와 인터페이스 표현

Main field는 중요 필드를 compact view에 보여주며 전체 데이터는 남아 있다. 검색은 모든 field를 대상으로 한다. 인터페이스 속성에는 main field 지정 여부와 관계없이 개별 struct field를 매핑할 수 있다. Main field 변경은 기존 인터페이스 구현을 무효화할 수 있다.

Reducer와 결합하면 struct array에서 하나의 struct와 그 main field 값을 표현할 수 있다. 하지만 이 투영을 편집하는 interface Action은 원본 배열/나머지 field로 역변환할 수 없어 실패한다. 해당 속성을 편집하지 않는 Action까지 모두 금지되는 것은 아니다.

상세 struct 문서는 Actions와 TypeScript v2/Python struct 편집을 지원한다고 명시한다. Gaia 가이드의 일반적인 struct Action 미지원 문구는 이 최신 계약과 충돌하며 Gaia bulk form의 struct 미지원과 구분한다. SDK별 지원은 compatibility 문서를 따로 확인한다.

## 출처

- [Palantir, create-struct-type](https://www.palantir.com/docs/foundry/object-link-types/create-struct-type)
- [Palantir, edit-struct-type](https://www.palantir.com/docs/foundry/object-link-types/edit-struct-type)
- [Palantir, struct-automapping](https://www.palantir.com/docs/foundry/object-link-types/struct-automapping)
- [Palantir, struct-main-fields](https://www.palantir.com/docs/foundry/object-link-types/struct-main-fields)
- [Palantir, struct-shared-properties](https://www.palantir.com/docs/foundry/object-link-types/struct-shared-properties)
- [Palantir, structs-overview](https://www.palantir.com/docs/foundry/object-link-types/structs-overview)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
