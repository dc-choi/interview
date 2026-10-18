---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 함수 최적화와 집계의 정확성

함수 비용에는 기본 overhead와 실행 자원, 호출한 Ontology/model 비용이 포함된다. 최적화 문서는 함수 overhead 4 compute-seconds를 설명한다. 구체 계약과 비용 설정을 확인하고 wall-clock 지연만 비용으로 환산하지 않는다.

## 최적화 순서

1. 객체를 하나씩 조회하는 루프를 bulk filter로 바꾼다.
2. 합계/건수만 필요하면 객체를 메모리로 가져오지 않고 backend aggregate를 사용한다.
3. link마다 개별 요청을 보낼 필요가 없는 경우 searchAround/pivotTo로 묶는다.
4. 메모리로 읽어야 하면 pagination/asyncIter로 읽되 최종 edit batch나 결과 map이 계속 커지는 비용도 계산한다.

Promise.all은 지연을 줄일 수 있으나 동일한 요청 수와 backend 연산량을 자동으로 줄이지 않는다. bulk 연산으로 바꿀 때도 의미를 확인한다. 여러 객체가 같은 linked object를 공유하면 per-object count의 합과 합집합 count는 달라질 수 있다.

집계는 bucket 한도와 exact/approximate 조건을 확인한다. Workshop column의 object map, Chart XY의 TwoDimensionalAggregation과 3차원 반환 구조도 언어별로 다르다.

## 예제를 적용할 때의 반례

공식 최적화 예제의 `if (result)` 또는 `property ? ...`는 0을 누락할 수 있다. undefined 확인과 0의 업무 의미를 구분한다. 동기 계산을 async로 감싼 것만으로 CPU 병렬 실행을 얻었다고 보지 않는다.

Custom aggregation 예제의 향후 6개월 추정은 마지막 bucket 값을 반복하는 baseline이다. bucket 정렬, 실제 마지막 달, 누락 달과 0분모를 검증해야 하며 통계적으로 검증된 예측 모델이 아니다. Python `.from_osdk()`는 OSDK v2 조건을 확인한다.

## 출처

- [Palantir, optimize-performance](https://www.palantir.com/docs/foundry/functions/optimize-performance)
- [Palantir, create-custom-aggregation](https://www.palantir.com/docs/foundry/functions/create-custom-aggregation)
- [Palantir, python-functions-create-custom-aggregation](https://www.palantir.com/docs/foundry/functions/python-functions-create-custom-aggregation)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
