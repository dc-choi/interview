---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Value type의 의미, 제약과 버전

Value type은 원시 field/base type에 도메인 의미와 검증을 더한다. Space에 속하며 같은 space에서만 사용할 수 있고 Default Ontology에는 제공되지 않는다. Space Viewer는 적용, Editor/Owner는 생성/수정/삭제할 수 있다. 다른 소비자는 project scope에 import한다.

Enum, 수치/날짜 범위, 문자열/배열 길이, regex/RID/UUID, 배열 uniqueness/element constraint와 struct field constraint를 지원한다. 지원되는 base type은 constraint별로 다르다. Regex의 substring 허용 옵션과 enum case sensitivity를 확인해야 한다.

기존 값이 제약을 위반하면 object indexing이 실패한다. Pipeline Builder에서는 logical type cast와 객체 출력의 value type을 맞춘다. Action parameter에는 호환되는 String/Integer/Long/Double/Decimal/Date/Timestamp 및 list를 지원한다. Array value type은 list 전체, 호환 non-array type은 각 원소를 검증한다. 일반 struct value type의 field constraint가 가능하더라도 Action struct parameter/field의 value type constraint는 별도 미지원이다.

Name/description/API name 메타데이터와 base type/constraint의 immutable 버전 계약을 구분한다. Constraint 변경은 새 버전이며 비파괴 변경도 새 버전으로 Ontology에 자동 전파된다. 이미 소비자가 있는 파괴적 제약 변경은 기존 타입 폐기 표시와 새 타입 생성을 권고한다. 모든 소비자를 같은 시점에 전환했다고 가정하지 않는다.

## 출처

- [Palantir, create-value-type](https://www.palantir.com/docs/foundry/object-link-types/create-value-type)
- [Palantir, use-value-type](https://www.palantir.com/docs/foundry/object-link-types/use-value-type)
- [Palantir, value-type-constraints](https://www.palantir.com/docs/foundry/object-link-types/value-type-constraints)
- [Palantir, value-types-overview](https://www.palantir.com/docs/foundry/object-link-types/value-types-overview)
- [Palantir, value-types-permissions](https://www.palantir.com/docs/foundry/object-link-types/value-types-permissions)
- [Palantir, value-types-versions](https://www.palantir.com/docs/foundry/object-link-types/value-types-versions)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
