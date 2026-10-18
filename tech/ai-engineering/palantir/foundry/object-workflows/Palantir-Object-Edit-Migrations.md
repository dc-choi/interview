---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 객체 편집 Schema migration

OSv2는 기존 편집을 보존/변환할 migration을 선택한 뒤 schema를 저장한다. Source/PK/type 변경, edit가 있는 property ID 변경/삭제, struct field 삭제/type 변경이 breaking change다. Display name, title, render hint, type class와 visibility는 이 migration 관점에서는 non-breaking이며 소비자 UI 영향이 없다는 뜻은 아니다. Edit가 없던 property/field 변경도 user-edit migration은 필요하지 않을 수 있다.

지원 instruction은 property/struct field edit drop, 전체 drop, property/전체 타입 또는 struct field move, type cast, 이전 migration revert다. Cast는 목록에 있는 방향만 지원한다. 예를 들어 string↔정수/실수/date/timestamp/geopoint 및 숫자 간 일부 변환이 있지만 arbitrary conversion은 아니다. Property의 attachment/geoshape/mandatory marking 변환 지원을 struct field에도 그대로 적용하지 않는다. Fractional number를 integer로 바꾸는 등 엄격히 호환되지 않는 값은 자동 정제되지 않고 실패한다.

최대 500개 migration을 한 번에 적용하며 초과분은 batch로 나눈다. PK property에는 migration instruction을 적용할 수 없다. 저장 후 replacement Funnel pipeline과 hydration이 끝나야 새 schema가 조회된다. 실패하면 Datasources의 오류와 Fix schema migrations에서 복구한다. History의 Revert instruction을 저장할 수 있지만 모든 외부 부작용이나 별도 삭제까지 복구한다고 일반화하지 않는다.

## 출처

- [Palantir, schema-migrations](https://www.palantir.com/docs/foundry/object-edits/schema-migrations)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
