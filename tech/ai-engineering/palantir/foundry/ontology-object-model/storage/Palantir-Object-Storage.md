---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-18
---

# 객체 저장소의 조회, 편집과 집합 계약

Ontology Metadata Service는 스키마, object database는 색인과 사용자 편집, Object Set Service는 검색과 집합 계산을 맡는다. Funnel은 dataset, restricted view, stream과 사용자 편집을 색인한다. OSv2는 색인과 조회를 분리해 확장한다.

백엔드는 datasource와 스키마 관리, 권한을 적용한 조회, 쓰기 조정을 담당한다. Actions는 조건과 권한에 따라 편집을 적용하고, Functions는 운영 앱에서 실행할 로직을 제공한다.

Static ObjectSet은 primary key 목록을 고정한 집합이지 속성값의 시점 스냅샷이 아니다. Dynamic ObjectSet은 필터를 저장하고 평가 시점의 객체를 조회한다. 임시 집합은 작성자만 접근하며 24시간 안에 만료된다. 영구 집합도 데이터 값 자체를 고정하지 않는다.

## OSv2 기능과 한도

2026-10-18 공식 overview 기준이다.

| 항목 | 문서의 범위 |
|---|---|
| 색인 | 증분 색인이 기본이며 streaming datasource도 지원 |
| 권한 | Multi-datasource object type의 속성 수준 권한 |
| 편집 | breaking schema change 이후 기존 사용자 편집 migration 지원 |
| Action | 한 번에 기본 10,000개 객체 편집, 확대는 지원팀과 enrollment 변경 요청으로 확인 |
| 속성 | 객체 타입당 최대 2,000개 |
| Search Around | 기본 100,000개 객체, 확대 방법은 지원팀에 확인 |

수백억 객체 규모의 색인과 Spark 기반 질의 계층은 제품 기능 설명이다. 개별 enrollment의 처리량, 지연이나 집계 정확도를 보장하는 수치로 해석하지 않는다.

## 적용 시 확인할 조건

다음은 위 기능을 실제 워크플로에 적용할 때의 점검 제안이다.

- 증분 색인과 재색인: [[Palantir-Object-Indexing-Batch|batch 색인]]
- 순서와 streaming 지원 범위: [[Palantir-Object-Indexing-Streaming|streaming 색인]]
- 속성별 datasource와 권한: [[Palantir-Object-Restricted-View-and-MDO|RV와 MDO]]
- 편집 이행의 PK 제약: [[Palantir-Object-Edit-Migrations|편집 schema migration]]
- 집계의 반환 한계: [[Palantir-Object-Aggregation-Accuracy|집계 정확도]]

## OSv1 종료 예정 안내

공식 overview에는 OSv1의 2026-06-30 종료 예정과 Planned deprecation 표시가 함께 남아 있다. 실제 enrollment 상태는 따로 확인한다. 문서가 제시한 이행 경로는 Upgrade Assistant이며 상세는 [[Palantir-Object-Storage-Migration|OSv1에서 OSv2로의 이행]]을 따른다.

## 출처

- [Palantir, object-backend](https://www.palantir.com/docs/foundry/object-backend)
- [Palantir, overview](https://www.palantir.com/docs/foundry/object-backend/overview)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Ontology-Guides]]
- [[Palantir-Functions]]
- [[Palantir-Object-Backend|Palantir 객체 백엔드]]
