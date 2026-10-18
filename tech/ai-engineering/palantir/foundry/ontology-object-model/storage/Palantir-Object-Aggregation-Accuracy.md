---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 집계의 버킷 선택과 정확도

`PREFER_ACCURACY`는 정확도를 우선하는 실행 선택이며 모든 집계의 전체 정확성을 보장하는 계약이 아니다. 결과의 `AggregateResultAccuracy`와 호출 방식, 정렬 조건을 함께 확인한다.

Histogram의 두 단계 조회에서 첫 호출이 근사 방식으로 상위 100개 버킷을 선택하고 두 번째 호출이 그 100개의 정확한 개수를 계산할 수 있다. 각 버킷 개수가 정확해도 전체 데이터의 진짜 상위 100개라는 보장은 별개다. Pivot 화면에서 반환된 버킷을 정렬하는 것도 서버의 전체 상위 버킷 선택과 다르다.

## 공식 문서 간 범위 충돌

백엔드 집계 문서는 제한된 복잡도의 OSDK 쿼리를 `ACCURATE`로 설명하고, Functions는 `PREFER_ACCURACY`에서 버킷 값이 정확하되 groupBy와 orderBy 조합 제한이 있다고 설명한다. 반면 TypeScript v2 migration 문서는 고카디널리티 집계의 근사 결과와 응답의 정확성 플래그를 TypeScript OSDK가 노출하지 않는다는 점을 명시한다.

이를 모든 SDK 버전의 정확성 보장으로 합치지 않는다. 실행 언어, SDK 버전, endpoint, 집계 형태와 반환 정확도를 고정한 뒤 검증해야 한다. 이 문서에서는 실제 API 실행으로 충돌을 해소하지 않았다.

## 출처

- [Palantir, aggregation-considerations](https://www.palantir.com/docs/foundry/object-backend/aggregation-considerations)

- [Palantir, TypeScript v2 migration](https://www.palantir.com/docs/foundry/functions/typescript-v2-migration/)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Ontology-Guides]]
- [[Palantir-Functions]]
