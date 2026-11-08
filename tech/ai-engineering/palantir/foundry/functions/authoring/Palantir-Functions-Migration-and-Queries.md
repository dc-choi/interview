---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-11-08
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

v2의 where 절은 속성 타입마다 받는 key가 v1보다 좁다. Geopoint와 GeoShape 속성은 `$within`, `$intersects`, `$isNull`만, 배열 속성은 `$contains`와 `$isNull`만 받는다. v1의 `doesNotIntersect*`는 `$intersects`를 `$not`으로 감싸고, `phrasePrefix`와 `prefixOnLastToken`은 `$interval` 안에 검색어 `$match`와 `$prefixOnLastTerm: true`를 둔다. 날짜/시각 비교 값은 `{ $gt: "2010-10-01T00:00:00Z" }`처럼 ISO 8601 문자열이다. TypeScript OSDK reference의 Filtering 절은 `$within`, `$intersects`, `$interval`의 형태를 다루지 않는다.

`fetchPage()`의 `$pageSize`는 최대 10,000이고, 결과가 더 남아 있어도 한 페이지가 그보다 적게 올 수 있다. v1 `.take()`처럼 정렬된 상위 n개가 필요하면 `$orderBy`를 준 채 `$nextPageToken`으로 n개를 채우거나 토큰이 없어질 때까지 페이지를 이어 읽는다. `asyncIter()`는 페이지 요청을 스스로 이어 object set을 끝까지 순회한다. 이 설명은 Object Storage v2 기준이다. OSDK reference는 Object Storage v1 object type에서 10,000개를 넘게 요청하면 `ObjectsExceededLimit`가 나고, 오래 걸리는 순회는 snapshot 만료로 실패할 수 있다고 적는다.

## 집계와 검색 순위

v1 topValues 기본 1,000과 v2 exact 기본 10,000은 bucket 한도다. distinct 값이 한도를 넘으면 approximate가 될 수 있으며 TypeScript OSDK는 응답의 정확성 플래그를 노출하지 않는다고 migration 문서는 경고한다. exact라는 문자열만으로 완전한 집계를 주장하지 않는다.

v2는 Long grouping, array grouping, 한쪽 끝을 생략한 range bucket, 날짜 평균과 metric alias를 v1과 동일하게 지원하지 않는다. 두 groupBy는 평평한 row 결과이므로 Workshop용 3차원 집계에는 재구성이 필요하다. 범위는 시작 포함, 끝 제외다.

v2 `.aggregate()`의 요청 객체는 필수 `$select`와 선택 `$groupBy` 두 key만 받는다. 필터 key가 없으므로 `.where()`를 먼저 체인한 뒤 집계한다. Count 외의 metric key는 `"<속성 API name>:<metric>"` 문자열이고 값은 `"unordered"`, `"asc"`, `"desc"` 정렬 지시다. 숫자 속성은 모든 metric을, 날짜/시각 속성은 `min`, `max`, `approximateDistinct`, `exactDistinct`만, 그 밖의 타입은 두 distinct count만 받는다. v1 `cardinality`는 `approximateDistinct`에 대응하고 `exactDistinct`는 v1 대응이 없다.

| v1 bucket | v2 `$groupBy` 값 |
|---|---|
| exactValues, topValues | `"exact"`, 상한을 바꾸면 `{ $exactWithLimit: n }` |
| byFixedWidth, byRanges | `{ $fixedWidth: w }`, `{ $ranges: [[a, b], ...] }` 양 끝 필수 |
| byYear, byQuarter, byMonth, byWeek | `{ $duration: [1, unit] }` |
| byDays, byHours, byMinutes, bySeconds | `{ $duration: [n, unit] }` |
| segmentBy | 같은 `$groupBy` 객체의 두 번째 key |

`$duration`은 seconds, minutes, hours, days만 임의 값을 받고 그보다 큰 단위는 1만 받는다.

v2 KNN은 1~500 neighbors를 받으며 relevance는 KNN에 적용된다. 일반 token filter에 relevance를 넣어도 v1의 텍스트 관련도 정렬을 재현하지 않는다. fuzzy boolean과 Levenshtein 거리 지정도 동일하지 않으며 `$interval` 우회는 실데이터 검증이 필요하다. link presence는 직접 대응 key가 없어 파생 count를 사용하는 대안을 따로 검증한다.

## 식별자와 warm invocation

v1의 `rid`, `primaryKey`, `typeId`는 v2에서 `$rid`, `$primaryKey`, `$apiName` 또는 `$objectType`이 된다. 두 type 필드는 모두 object type API name을 담지만 literal type은 `$apiName`뿐이다. `$rid`는 읽기에 `$includeRid: true`를 준 경우에만 있으므로 `obj.rid`를 기계적으로 `obj.$rid`로 바꾸지 않고 동일성 판단은 `$objectSpecifier`로 한다. `$objectSpecifier`는 `"<apiName>:<primaryKey>"` 문자열이라 서로 다른 type의 객체도 문자열 비교 한 번으로 동일성을 판단한다. 로드한 객체의 타입은 `Osdk.Instance<T>`다. v1 `OntologyObject`는 대응 타입이 없고 `@osdk/api`의 `OsdkBase`가 가장 가까우며, `IsOntologyObject`는 대체 없이 제거되었다.

v1 편집 함수는 `@Edits`로 편집할 object type을 선언하고 편집을 암묵적으로 누적한다. v2는 `createEditBatch`로 실행 동안의 편집 저장소를 만들고, `Edits` 타입(`Edits.Object<T>`, link 편집, interface 속성 편집용 `Edits.Interface<I>` 등)의 합으로 편집 가능한 object와 link 범위를 컴파일 시점에 검사한 뒤 `batch.getEdits()`를 반환한다. Staged writes는 2026-11-08 기준 beta라 enrollment에 따라 제공되지 않을 수 있다. `createEditBatch` 대신 `WriteableClient`를 쓰고 같은 함수 실행 안에서 read-after-write를 제공하며 편집을 명시적으로 반환하지 않아도 된다. 스테이징된 편집은 다른 사용자의 조회에는 보이지 않는다.

v2 파일 이동은 함수 identity를 바꿀 수 있다. module 최상위에서 생성한 UUID는 warm invocation마다 재사용될 수 있으므로 실행 함수 안에서 생성한다. 함수별 데이터와 상태를 module singleton에 무심코 남기지 않는다.

## 출처

- [Palantir, typescript-v2-migration](https://www.palantir.com/docs/foundry/functions/typescript-v2-migration)
- [Palantir, api-object-sets](https://www.palantir.com/docs/foundry/functions/api-object-sets)
- [Palantir, api-objects-links](https://www.palantir.com/docs/foundry/functions/api-objects-links)
- [Palantir, typescript-v2-staged-writes](https://www.palantir.com/docs/foundry/functions/typescript-v2-staged-writes)
- [Palantir, TypeScript OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)

## 관련 문서

- [[Palantir-Functions]]
- [[Palantir-Object-Aggregation-Accuracy|집계 정확도에 관한 공식 문서의 범위 차이]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
