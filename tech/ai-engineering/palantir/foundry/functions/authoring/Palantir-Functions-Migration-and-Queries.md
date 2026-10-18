---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# TypeScript v2로 옮길 때 달라지는 검색 계약

## 컴파일 성공 뒤에도 달라지는 조회

v1은 Searchable이 아닌 속성의 검색 메서드를 생성하지 않는다. v2 OSDK는 컴파일되어도 실행 시 전체 텍스트 필터가 오류 없이 빈 결과를 돌려줄 수 있다. 필터/정렬/집계 속성의 Searchable 설정을 먼저 확인한다.

| v1 | v2와 주의점 |
|---|---|
| exactMatch 여러 값 | `$in` 배열. v1의 빈 exactMatch는 필터를 무시하므로 빈 입력 정책을 별도 정의 |
| range gte/lte chain | 속성당 연산자 하나, `$and`의 두 절로 표현 |
| array contains 여러 값 | `$contains` 하나씩을 `$or`로 결합 |
| SingleLink get | fetchOne은 부재에도 throw, withErrors의 오류를 모두 부재로 처리하지 않음 |
| MultiLink | v2의 `$link` 다중 링크는 ObjectSet이므로 바로 pivot 가능 |
| searchAround 이름 | 실제 link API name을 확인해 pivotTo에 전달 |
| take/all | fetchPage 또는 asyncIter, pageSize와 전체 결과 수를 혼동하지 않음 |

v1 검색은 lazy ObjectSet을 필터링/집계한 후 필요한 데이터만 로드한다. 링크 traversal의 v1 최대 3단계, 객체 로드와 집계 bucket 제한은 런타임 제한과 별개로 고려한다. 배열 속성 집계는 펼친 값이 여러 bucket에 들어갈 수 있다.

## 집계와 검색 순위

v1 topValues 기본 1,000과 v2 exact 기본 10,000은 bucket 한도다. distinct 값이 한도를 넘으면 approximate가 될 수 있으며 TypeScript OSDK는 응답의 정확성 플래그를 노출하지 않는다고 migration 문서는 경고한다. exact라는 문자열만으로 완전한 집계를 주장하지 않는다.

v2는 Long grouping, array grouping, 한쪽 끝을 생략한 range bucket, 날짜 평균과 metric alias를 v1과 동일하게 지원하지 않는다. 두 groupBy는 평평한 row 결과이므로 Workshop용 3차원 집계에는 재구성이 필요하다. 범위는 시작 포함, 끝 제외다.

v2 KNN은 1~500 neighbors를 받으며 relevance는 KNN에 적용된다. 일반 token filter에 relevance를 넣어도 v1의 텍스트 관련도 정렬을 재현하지 않는다. fuzzy boolean과 Levenshtein 거리 지정도 동일하지 않으며 `$interval` 우회는 실데이터 검증이 필요하다. link presence는 직접 대응 key가 없어 파생 count를 사용하는 대안을 따로 검증한다.

## 식별자와 warm invocation

v2 파일 이동은 함수 identity를 바꿀 수 있다. module 최상위에서 생성한 UUID는 warm invocation마다 재사용될 수 있으므로 실행 함수 안에서 생성한다. 함수별 데이터와 상태를 module singleton에 무심코 남기지 않는다.

## 출처

- [Palantir, typescript-v2-migration](https://www.palantir.com/docs/foundry/functions/typescript-v2-migration)
- [Palantir, api-object-sets](https://www.palantir.com/docs/foundry/functions/api-object-sets)
- [Palantir, api-objects-links](https://www.palantir.com/docs/foundry/functions/api-objects-links)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
- [[Palantir-Object-Aggregation-Accuracy|집계 정확도에 관한 공식 문서의 범위 차이]]
