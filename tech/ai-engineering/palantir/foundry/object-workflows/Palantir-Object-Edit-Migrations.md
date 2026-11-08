---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-11-08
---

# 객체 편집 Schema migration

OSv2는 기존 편집을 보존/변환할 migration을 선택한 뒤 schema를 저장한다. Source/PK/type 변경, edit가 있는 property ID 변경/삭제, edit가 있는 struct field 삭제, struct field type 변경이 breaking change다. Display name, title key, render hint, type class와 visibility는 이 migration 관점에서는 non-breaking이며 소비자 UI 영향이 없다는 뜻은 아니다. Edit를 받은 적 없는 property/struct field의 삭제와 schema 변경은 문서상 non-breaking이다.

지원 instruction은 property/struct field edit drop, 전체 drop, property/전체 타입 또는 struct field move, type cast, 값 backfill, 이전 migration revert다. Cast는 목록에 있는 방향만 지원한다. 예를 들어 string↔정수/실수/date/timestamp/geopoint 및 숫자 간 일부 변환이 있지만 arbitrary conversion은 아니다. Property의 attachment/geoshape/mandatory marking 변환 지원을 struct field에도 그대로 적용하지 않는다. Double → Integer cast가 목록에 있어도 소수부가 있는 값처럼 대상 타입과 엄격히 호환되지 않는 값이 남아 있으면 자동 정제되지 않고 migration이 진행되지 않는다.

Backfill a value는 property를 추가한 뒤 user edit로 만든 기존 객체에 기본값을 넣을 때 쓴다. 값이 unset인 경우에만 지정 값을 넣고, 명시적으로 `null`을 넣은 값을 포함해 이미 있는 값은 덮어쓰지 않는다. 문서가 밝힌 대상은 user edit로 생성한 객체뿐이므로 datasource 행에서 온 객체에도 이 instruction이 값을 넣는다고 가정하지 않는다.

최대 500개 migration을 한 번에 적용하며 초과분은 batch로 나눈다. PK property에는 migration instruction을 적용할 수 없다. 저장 후 replacement Funnel pipeline과 hydration이 끝나야 새 schema가 조회된다. 실패하면 Datasources의 replacement pipeline 위 오류 안내로 복구하고, 추가 migration staging이 필요한 경우에만 Fix schema migrations 선택지가 나타난다. History의 Revert instruction을 저장할 수 있지만 모든 외부 부작용이나 별도 삭제까지 복구한다고 일반화하지 않는다.

## 출처

- [Palantir, schema-migrations](https://www.palantir.com/docs/foundry/object-edits/schema-migrations)
- [Palantir, data-restrictions](https://www.palantir.com/docs/foundry/object-indexing/data-restrictions)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
