---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Object Explorer UI 설정과 URL 연동

Object type group은 Ontology metadata로 관리한다. 기본 layout의 전체 사용자 변경은 Object Exploration Admin 또는 hubble-exploration-admins 권한이 필요하다. Action success toast의 object link는 PK/Object Reference List parameter의 actions:view_object_with_type:<OBJECT_TYPE_ID> type class로 구성한다. hubble-oe:hide-action은 표시 제어이며 실행 인가를 대체하지 않는다.

Dynamic ObjectSet RID를 string property에 저장하는 기능은 자동 migration 없이 deprecated될 수 있다는 경고가 있다. hubble-oe-object-set-rid는 대상 type, hubble-oe-security-rid는 권한을 물려받을 folder RID다. 만들어진 set은 project에 노출/검색되지 않아도 그 folder의 권한을 쓴다. Filter 정의가 동적이므로 뒤에 들어온 객체도 포함된다.

Keyword URL은 encodeURIComponent한 값을 /hubble/external/keyword/v0/에 붙인다. Exploration은 objectTypeId, saved/versioned-object-set 또는 external/objectSet route를 구분하고 perspectiveId=results로 표를 연다. Complex search JSON은 오래될 수 있어 실제 UI에서 만든 검색을 hubble_get_current_search()로 확인하는 절차를 권장한다. 문자열로 serialize한 뒤 URL encode하고, 문서상 property filter 여러 개와 link filter 하나 제한을 확인한다. URL 값이 권한을 제공하지는 않는다.

## 출처

- [Palantir, configure](https://www.palantir.com/docs/foundry/object-explorer/configure)
- [Palantir, generate-urls](https://www.palantir.com/docs/foundry/object-explorer/generate-urls)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
