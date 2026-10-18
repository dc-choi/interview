---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 상태, 그룹과 화면 메타데이터의 역할

Active는 사용 중 계약을 알리고 삭제/API name 변경을 제한한다. Experimental은 변경 가능, Deprecated는 사유/예정일/대체 자원을 알리며 Example은 운영 사용을 위한 상태가 아니다. Promoted는 object type만 대상이며 Ontology-level Owner의 직접 지정 또는 승인으로 적용한다. Promoted는 prominent 가시성과 active에 준하는 보호를 제공하지만 데이터 권한을 부여하지 않는다.

Object/FK 상태가 experimental/example/deprecated로 낮아지면 관련 property/link 상태도 일관되게 조정된다. 반대로 property를 active로 바꿔도 관련 link가 자동 active가 되지는 않는다. 실제 dependency의 준비 상태를 따로 판단한다.

Object type group은 분류/발견 자원이며 보안 group과 다르다. 현재 설명은 group의 project Viewer를 요구하지만 2024 migration 설명은 Ontology 사용자의 group 이름 발견을 언급한다. 역사적 migration 동작을 현재 모든 group의 공개 정책으로 적용하지 않는다. 부분적으로만 보이던 legacy group은 자동 이행되지 않았고 별도 승인이 필요했다.

## Type class는 앱별 소비 계약

Type class는 주로 표시/앱 기능 메타데이터이며 analyzer 계열은 색인에도 영향을 준다. 구형 설정 상당수는 Capabilities, render hint, value formatting 또는 Actions로 옮겨졌다. `hubble:editable`, 구형 geo latitude/longitude/geojson, legacy group과 analyzer type class를 새 모델의 기본 설정으로 복제하지 않는다.

주요 소비 맥락은 media URL/icon, hierarchy parent breadcrumb, choropleth region code, Action 표시/UUID/current user, Vertex의 중간 객체/이벤트/threshold, timeseries의 series/event/root/measure, scheduling의 start/end/segment다. Type class 이름만 존재한다고 모든 앱이 같은 동작을 하지는 않는다. Action 숨김과 deprecated series post-filter는 보안 통제가 아니다.

동적 scheduling에서는 start/end property ID와 save handler Action parameter ID를 맞춘다. Quiver의 series/event ID는 문서가 요구하는 전역 유일성과 root 연결을 검토한다. 구형 `timeseries_is_deprecated` 표의 앱 범위 설명은 서로 섞여 있으므로 다른 앱에서 숨김을 보장하지 않는다.

## 출처

- [Palantir, metadata-statuses](https://www.palantir.com/docs/foundry/object-link-types/metadata-statuses)
- [Palantir, metadata-typeclasses](https://www.palantir.com/docs/foundry/object-link-types/metadata-typeclasses)
- [Palantir, type-groups](https://www.palantir.com/docs/foundry/object-link-types/type-groups)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
