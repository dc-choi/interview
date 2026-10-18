---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 스키마 변경과 편집 이력 보존

OSv1의 writeback 설명과 OSv2의 선택적 materialization을 구분한다. `allow-editing` 문서가 writeback dataset 생성을 전제로 하지만 이를 모든 OSv2 객체의 필수 조건으로 적용하지 않는다. 지원되는 업무 변경 경로는 Actions이며 원본 backing dataset을 직접 수정하는 것과 다르다.

## 구형 저장소의 파괴적 변경

OSv1에서 backing source, primary/foreign key, cardinality 변경이나 삭제는 unregister/reindex를 일으켜 조회가 중단될 수 있다. 과거 한 번이라도 편집된 객체 속성 ID/base type 또는 link backing column schema를 바꾸면 편집 이력과 writeback 재생에 영향을 준다.

해당 schema 변경은 자동 unregister로 해결되지 않는다. 재색인이 실패하며 변경을 되돌리거나 수동 재등록해야 한다. 수동 재등록은 편집 이력을 제거하므로 단순 재시도 처방으로 사용하지 않는다. 표시 이름, title key, render hint, type class, visibility 변경과 편집된 적 없는 객체 필드 변경은 문서가 구분하는 예외다.

## 매핑과 소비자 갱신

Backing source 교체는 기존 컬럼 연결을 제거한다. schema가 같을 때만 자동 remap을 기대할 수 있다. 속성 타입을 바꾸면 해당 속성을 다루는 Action parameter 타입도 갱신한다. 삭제는 Save 후 적용되며 연결된 앱이 깨질 수 있다. Active 상태의 삭제/API name/primary key 제약을 확인한다.

OSv2 edit-only property는 컬럼 없이 값을 편집한다. source-backed 타입에서는 어느 source의 권한을 따를지 지정한다. 나중에 backing column을 연결할 수 있다. Project-based 객체에서 source를 제거하면 해당 source의 속성이 edit-only가 되며 object security policy가 필요하다. source 제거를 기존 데이터 보존의 자동 보장으로 간주하지 않는다.

## 출처

- [Palantir, allow-editing](https://www.palantir.com/docs/foundry/object-link-types/allow-editing)
- [Palantir, edit-link-types](https://www.palantir.com/docs/foundry/object-link-types/edit-link-types)
- [Palantir, edit-object-type](https://www.palantir.com/docs/foundry/object-link-types/edit-object-type)
- [Palantir, edit-only-properties](https://www.palantir.com/docs/foundry/object-link-types/edit-only-properties)
- [Palantir, edit-properties](https://www.palantir.com/docs/foundry/object-link-types/edit-properties)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
