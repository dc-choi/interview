---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
---

# 함수 최적화와 집계의 정확성

함수 비용에는 기본 overhead와 실행 자원, 호출한 Ontology/model 비용이 포함된다. 공식 최적화 문서는 함수 실행마다 고정 overhead 4 compute-seconds를 적지만, Ontology query compute 문서는 같은 값을 2026-01-01 이전 legacy 표에만 두고 2026 표에는 함수 항목이 없다([[Palantir-Ontology-Query-and-Cost|Ontology query 비용]]). 현재 계약에 이 값이 적용되는지 확인하고 wall-clock 지연만 비용으로 환산하지 않는다.

## 시간이 쓰이는 곳과 입력 형식

Functions의 Performance 탭 waterfall은 연산을 시간축의 막대로 보여 준다. `Execute function`은 함수 코드를 실행한 CPU 시간이고, `Load objects from arguments`와 `Load objects from links`는 Ontology backend(OSS)를 호출한 시간이다. 느린 함수를 고치기 전에 계산이 문제인지 객체 적재가 문제인지 먼저 나눈다.

입력 형식도 적재 비용을 정한다. 공식 권장 순서는 object set, object 배열, 단일 object다. 객체를 매개변수로 받으면 객체 하나라도 그 데이터를 적재하는 query가 생긴다. Object set은 데이터가 실제로 필요할 때까지 적재를 미루고, count나 sum만 필요하면 개별 객체를 읽지 않고 backend가 계산한다. 단일 object 입력은 object type의 인스턴스가 하나뿐이거나 객체 하나씩 처리해야 하는 업무 규칙이 있을 때만 쓴다.

## 최적화 순서

1. 객체를 하나씩 조회하는 루프를 bulk filter로 바꾼다. 키 목록이 비면 query 전에 반환한다. TSv1의 `exactMatch(...[])`는 필터를 무시해 모든 객체에 일치하므로, 공식 TSv1 `forLoopBetter` 예제는 빈 입력에서 전체 객체를 적재하지 않도록 먼저 빠져나간다.
2. 합계/건수만 필요하면 객체를 메모리로 가져오지 않고 backend aggregate를 사용한다.
3. link마다 개별 요청을 보낼 필요가 없는 경우 searchAround/pivotTo로 묶는다.
4. 메모리로 읽어야 하면 pagination/asyncIter로 읽고 실제로 쓰는 속성만 선택한다(Python `iterate(properties=[...])`, TSv2 `asyncIter({ $select: [...] })`). 최종 edit batch나 결과 map이 계속 커지는 비용도 계산한다.

Promise.all은 지연을 줄일 수 있으나 동일한 요청 수와 backend 연산량을 자동으로 줄이지 않는다. bulk 연산으로 바꿀 때도 의미를 확인한다. 여러 객체가 같은 linked object를 공유하면 per-object count의 합과 합집합 count는 달라질 수 있다.

집계는 bucket 한도와 exact/approximate 조건을 확인한다. Workshop column의 object map, Chart XY의 TwoDimensionalAggregation과 3차원 반환 구조도 언어별로 다르다.

## 전부 읽을지, 일부만 읽을지

TSv1의 `.all()`과 `.allAsync()`는 object set의 모든 객체를 메모리로 적재한다. 최대 100,000개까지 적재하며 넘기면 함수 실행이 실패하고, 10,000개를 넘겨도 시간 제한에 걸릴 수 있다([[Palantir-Ontology-Query-and-Cost|Ontology query의 규모와 비용]]). 호출 전에 필요한 결과를 나눈다.

| 필요한 결과 | 쓰는 방법 |
|---|---|
| count, sum, group by 같은 요약 | backend 집계 |
| 일부로 충분한 결과, 표본, 표시용 목록 | `.orderBy(...).take(n)` |
| 이미 작게 제한된 입력 | `.all()` (예: Workshop이 runtime input으로 넘기는 행) |
| 조건에 맞는 모든 객체 | `.all()` 유지. `.take(n)`으로 바꾸지 않는다 |

`.orderBy(...).take(n)`은 최대 n개만 돌려주고 나머지는 알리지 않고 버린다. 페이지를 넘기는 수단이 아니다. 안정된 object set을 묶음으로 처리하려면 고유하고 null이 없으며 범위 필터를 지원하는 속성으로 오름차순 정렬하고, 다음 묶음은 `.range().gt(lastValue)`로 직전 묶음의 마지막 값보다 큰 객체만 고른다. 정렬 키가 고유하지 않으면 마지막 값과 같은 값을 가진 다른 객체를 건너뛸 수 있다. 이 방식은 대상 객체와 정렬 키 값이 조회 사이에 바뀌지 않는다고 가정한다. TSv1의 string 속성은 범위 필터를 지원하지 않으므로 string primary key로는 이 방식을 쓸 수 없다.

## TSv1 전체 순회의 snapshot과 페이지 일관성

TSv1의 `.all()`과 `.allAsync()`는 object set의 모든 객체를 가져오는 OSS endpoint로 페이지를 이어 읽고, 이 endpoint는 일관된 snapshot에서 다음 페이지를 읽는다. Streaming datasource에는 일관된 snapshot이 보장되지 않는다. 이 endpoint의 페이지 일관성 검사는 끌 수 없고, 페이지 사이 불일치를 감지하면 순회가 `PagingInconsistencyDetected`로 실패할 수 있다. 오래 걸리는 순회는 snapshot이 만료되어 실패할 수도 있다. TSv2는 `fetchPage()`나 `asyncIter()`로 읽으며([[Palantir-Functions-Migration-and-Queries|TypeScript v2 검색 계약]]), 공식 migration 문서의 객체 적재 절은 snapshot과 페이지 일관성을 다루지 않으므로 이 절의 동작을 TSv2에 그대로 옮기지 않는다. TSv2의 method별 snapshot 요청 여부와 실패 대응은 TypeScript OSDK reference를 따로 정리한 [[Palantir-OSDK-TypeScript-Read|TypeScript OSDK2 조회]]의 page 일관성 절을 따른다.

TSv1의 `.take(n)` 조회는 페이지 사이 일관성이 필요 없지만 n은 최대 10,000이다. 다만 snapshot isolation 모드로 실행되는 Action처럼 함수 실행 자체가 snapshot을 가지면 `.take(n)`을 포함한 그 실행의 모든 Ontology 읽기가 그 snapshot에 고정된다([[Palantir-Actions-and-Functions|Actions와 Functions]]).

전체 순회가 snapshot 오류로 실패하면 다음을 검토한다.

- 결과를 backend 집계로 계산한다.
- 부분 결과로 충분하면 최대 10,000개의 `.take(n)`으로 제한한다.
- 순회 중 바뀌지 않는 안정된 부분집합으로 필터링한다.
- 입력을 작게 유지해 순회를 빨리 끝낸다.
- 함수를 다시 실행해도 안전하면 처음부터 다시 시도해 새 순회를 시작한다.
- 오래 실행되는 함수가 snapshot 만료로 실패했고 여러 읽기에 걸친 일관된 view가 필요 없으면 함수 설정에서 snapshot을 끌 수 있다. Snapshot isolation을 쓰는 function-backed Action은 snapshot을 켜 둬야 한다. 끄더라도 `.all()`/`.allAsync()`는 함수 설정과 관계없이 페이지 일관성을 강제하므로 페이지 불일치 오류가 완전히 사라지지는 않는다.

## Workshop column에 쓸 때

Workshop의 function-backed column은 코드 없이 Workshop에서 설정하는 derived property와 구분한다. Runtime input이면 Workshop은 함수 호출마다 표의 행을 제한된 묶음으로 넘기지만(variable input은 전체 set일 수 있다), function-backed column으로 정렬하면 그 행이 화면에 보이는 영역을 넘을 수 있다. 화면에 보이는 행 수만으로 적재량을 가정하지 않는다([[Palantir-Workshop-Object-Display-and-Ordering|Workshop 객체 표시와 정렬]]).

## 예제를 적용할 때의 반례

공식 최적화 예제의 `if (result)` 또는 `property ? ...`는 0을 누락할 수 있다. undefined 확인과 0의 업무 의미를 구분한다. 동기 계산을 async로 감싼 것만으로 CPU 병렬 실행을 얻었다고 보지 않는다.

최적화 예제 중 TSv1 backend 집계 예제(`forLoopBest`)에는 빈 입력 guard가 없다. 위의 빈 `exactMatch` 동작대로라면 빈 키 목록에서 전체 객체의 합계를 돌려줄 수 있으므로, 예제를 옮길 때 guard도 함께 둔다. 같은 이유로 Objects API 집계로 바꾼 TSv1 `getEmployeeProjectCount` 예제도 빈 입력에서 전체 project를 employee별로 묶어, distinct employee가 10,000을 넘으면 bucket 한도 오류를 낼 수 있다. 입력 employee가 10,000명을 넘을 때는 guard와 별개로 나눠 집계한다(이 문서의 해석).

Custom aggregation 예제의 향후 6개월 추정은 마지막 bucket 값을 반복하는 baseline이다. bucket 정렬, 실제 마지막 달, 누락 달과 0분모를 검증해야 하며 통계적으로 검증된 예측 모델이 아니다. Python `.from_osdk()`는 OSDK v2 조건을 확인한다.

## 출처

- [Palantir, optimize-performance](https://www.palantir.com/docs/foundry/functions/optimize-performance)
- [Palantir, api-object-sets](https://www.palantir.com/docs/foundry/functions/api-object-sets)
- [Palantir, query-compute-usage](https://www.palantir.com/docs/foundry/ontologies/query-compute-usage)
- [Palantir, create-custom-aggregation](https://www.palantir.com/docs/foundry/functions/create-custom-aggregation)
- [Palantir, python-functions-create-custom-aggregation](https://www.palantir.com/docs/foundry/functions/python-functions-create-custom-aggregation)

## 관련 문서

- [[Palantir-Functions]]
- [[Palantir-Functions-Migration-and-Queries|TypeScript v2로 옮길 때 달라지는 검색 계약]]
- [[Palantir-Ontology-Query-and-Cost|Ontology query의 규모, 검색 문법과 비용]]
- [[Palantir-Workshop-Object-Display-and-Ordering|Workshop 객체 표시와 정렬]]
- [[Palantir-Functions-Limits-and-Deployment|실행 한도와 function-backed Action의 snapshot 기본값]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
