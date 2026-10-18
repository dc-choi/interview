---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 객체 저장소의 조회, 편집과 집합 계약

Ontology Metadata Service는 스키마, object database는 색인과 사용자 편집, Object Set Service는 검색과 집합 계산을 맡는다. Funnel은 dataset, restricted view, stream과 사용자 편집을 색인한다. OSv2는 색인과 조회를 분리해 확장한다.

Static ObjectSet은 primary key 목록을 고정한 집합이지 속성값의 시점 스냅샷이 아니다. Dynamic ObjectSet은 필터를 저장하고 평가 시점의 객체를 조회한다. 임시 집합은 작성자만 접근하며 수명이 24시간이다. 영구 집합도 데이터 값 자체를 고정하지 않는다.

OSv2 문서의 수십억 객체 규모는 제품의 지원 주장이다. 개별 enrollment의 처리량 보장이 아니다. 기본 Action 편집 한도 10,000개와 객체 타입의 속성 2,000개, Search Around 기본 100,000개 제한은 서로 다른 계약이다. 한도 확대는 지원 조건을 따로 확인한다.

OSv1 문서에는 2026-06-30 종료 예정이 남아 있다. 이 날짜가 지났다는 이유만으로 실제 enrollment에서 종료됐다고 단정하지 않는다.

## 출처

- [Palantir, object-backend](https://www.palantir.com/docs/foundry/object-backend)
- [Palantir, overview](https://www.palantir.com/docs/foundry/object-backend/overview)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Ontology-Guides]]
- [[Palantir-Functions]]
