---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 포맷과 색인 힌트의 우선순위

Value formatting은 원본 값을 통화/단위/백분율, 날짜/시간대, 사용자/그룹명, resource RID와 artifact GID의 표시로 바꾼다. 반올림과 compact notation을 원본 정밀도로 오해하지 않는다. Relative-to-now는 24시간을 넘으면 날짜/시간 표시로 바뀐다.

Conditional formatting은 표시 대상 속성과 조건을 읽는 속성을 다르게 둘 수 있다. 규칙 복사는 대상의 기존 규칙을 덮어쓰며 조건의 원본 property 참조는 유지한다. 복사한 대상 속성의 값을 자동으로 검사하는 규칙이 아니다. Value/conditional formatting은 type class보다 우선하지만 legacy `hubble:editable`에서는 비활성화된다. 새 inline edit 지원과 구형 type class를 구분한다.

Render hint 문서는 주로 OSv1 색인과 앱 표시를 설명한다. Selectable/Sortable/Low cardinality, leading wildcard/regex에는 Searchable도 필요하다. Raw index를 추가하는 hint는 색인 컬럼 수와 재색인 비용을 늘린다. Numeric/date는 sortable로 설명하며 배열 정렬은 최소값에 따르므로 일반적인 배열 순서로 해석하지 않는다.

Identifier는 숫자형 key를 수치 formatting/range 필터 대상으로 취급하지 않게 하고, long text/keyword는 표시를 돕는다. Hidden/prominent와 render hint는 실제 데이터 접근 권한을 대체하지 않는다. 구형 hint 성능 설명을 OSv2의 모든 내부 저장 동작으로 일반화하지 않는다.

## 출처

- [Palantir, conditional-formatting](https://www.palantir.com/docs/foundry/object-link-types/conditional-formatting)
- [Palantir, metadata-render-hints](https://www.palantir.com/docs/foundry/object-link-types/metadata-render-hints)
- [Palantir, value-formatting](https://www.palantir.com/docs/foundry/object-link-types/value-formatting)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
