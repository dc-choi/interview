---
tags: [palantir, pipeline-builder, aggregation, window, statistics]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 집계와 window 계약"]
---

# 집계와 window의 결과 의미

집계 함수의 이름만으로 결과를 해석하지 않는다. 결측 제외, 정렬, 모집단/표본과 근사 오차, 실행 모드를 함께 확인해야 한다. 아래는 2026-10-16 공식 레퍼런스 대조이며 실행 검증은 아니다.

## null은 집계 대상과 분모를 바꾼다

Sum, mean, min/max와 median의 예제는 null을 제외한다. `[2, null, 3]`에서 sum은 5, max는 3, min은 2, mean과 median은 2.5다. 이 평균은 결측을 0으로 채운 평균과 다른 통계량이다.

| 연산 | null과 중복의 의미 |
|---|---|
| rowCount에 expression 지정 | 그 표현식의 null을 제외한 개수 |
| distinctCount | null을 제외한 서로 다른 값의 개수 |
| collectArray | null 제외, 중복 유지 |
| collectDistinctArray | null 제외, 중복 제거, ComparableType 대상 |
| allOf/anyOf | 비-null 값으로 집계, 모두 null이면 null |
| first/last | `ignoreNulls` 선택에 따라 null도 결과가 될 수 있음 |
| mode | null을 제외한 최빈값, 빈 입력 예제는 null |

Collect 예제가 정렬돼 보인다는 이유로 배열 순서 보장을 추정하지 않는다. RowCount의 optional expression을 생략했을 때와 명시했을 때의 의미도 실제 사용 경로에서 확인한다. 이 레퍼런스의 예제는 expression을 지정한 경우다.

## 기본 집계의 타입과 예제 범위

Sum은 `Expression<Numeric>`을 받아 Decimal, Double 또는 Long을 반환한다. 1.111111111111 두 값의 합이 2.222222222222인 edge case 예제를 소수 합산의 정밀도 보장으로 일반화하지 않는다. Max/min은 Numeric 분류에 있지만 입력과 출력이 `ComparableType`으로 선언되므로 분류명보다 타입 선언을 우선한다. Median의 짝수 개 예제는 가운데 두 값의 평균을 반환하고(`[1, 2, 3, 4]`는 2.5), 모두 null이거나 빈 입력인 예제는 null이다.

## Window의 순서가 결과를 결정한다

First/last를 일반 집계나 정렬 없는 window에 적용하면 선택되는 행이 비결정적이다. Lag/lead는 정렬된 window에서 이전/다음 행의 값을 가져오며, 범위 밖이면 default 또는 null을 반환한다. 순서가 없는 데이터의 물리적 저장 위치를 업무 순서로 쓰지 않는다.

Rank는 동점 뒤 순위가 건너뛰고 denseRank는 건너뛰지 않는다. PercentRank는 동점에 같은 비율을 부여한다. RowNumber는 partition 안에서 1부터 번호를 부여한다. 유일한 업무 순서가 필요하면 정렬 키의 동점 처리도 정해야 한다. 마지막 문장은 결정성을 위한 설계 조건이다.

## 통계량과 근사값

Population variance/covariance와 sample variance/covariance를 구분한다. 예를 들어 두 값 2와 3의 모집단 분산은 0.25, 표본 분산은 0.5다. Standard deviation 예제는 모집단 기준에 대응하지만 함수의 짧은 설명 자체는 모집단을 명시하지 않는다. 다른 라이브러리로 옮길 때 기본 자유도를 확인한다.

Linear regression gradient는 non-null pair만 사용한다. 유효한 쌍이 부족하거나 독립 변수의 분산이 0이면 null이다. 독립/종속 변수의 위치를 바꾸면 다른 회귀가 된다.

Approximate percentile의 분위수 인자는 0~1이며 accuracy 기본값은 10,000이다. 높은 accuracy는 메모리를 더 쓰며 문서상 상대 오차는 `1 / accuracy`다. 분위수를 하나 요청할 때와 여러 개 요청할 때 scalar/array 형태가 달라진다. 설명은 Double을 언급하지만 출력 타입 표와 예제는 Numeric 및 정수 결과도 제시하므로 클라이언트가 항상 Double이라고 고정하지 않는다.

## Streaming 전용 집계

MaxBy/minBy는 window 상태에 필터를 적용한 뒤 극값 행에 projection을 적용한다. 필터를 통과한 행이 없으면 null을 내보낸다. 비교에서 null은 maxBy에 가장 작은 값, minBy에 가장 큰 값으로 취급된다. 단순 max/min 값과 원래 행의 다른 속성을 함께 가져오는 것은 다르다.

Streaming pivot 표현식은 pivot 값별로 집계하고 `Map<K,V>`를 반환한다. Batch에서 column을 펼치는 변환과 같은 결과 구조라고 가정하지 않는다.

## 실행 모드

Approximate median/percentile과 회귀 기울기는 Batch, covariance와 sample covariance는 Batch/Streaming, allOf/anyOf, rank, denseRank, percentRank와 lag/lead는 Batch/Faster로 표시된다. Rank 계열과 달리 rowNumber는 Batch/Faster/Streaming이다. MaxBy/minBy와 pivot 표현식은 Streaming 전용이다. Mode, median과 standard deviation은 Batch/Faster이고 sum, min/max, mean, rowCount, distinctCount, collectArray, collectDistinctArray, first/last, variance와 sample variance는 Batch/Faster/Streaming이다. 실행 엔진을 바꿀 때 수치 결과뿐 아니라 지원 연산 목록을 대조한다.

이 절의 실행 모드와 sum, max, min, mean, median의 타입 선언과 예제는 2026-10-26 각 상세 페이지로 다시 대조했다. 나머지 내용은 다시 대조하지 않아 frontmatter의 `verified_at`은 유지한다.

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

`allOfV1`과 `anyOfV1`은 null을 false로 취급하는 Batch 집계로 설명한다. 따라서 `[true,true,null]`의 all은 false다. 현재 버전의 null 제외/전부 null이면 null 규칙과 다르다. `linearRegressionGradientV1`은 독립 변수가 모두 같은 예시를 NaN으로 반환하며, 현재 버전의 null 결과와 구분한다.

## 출처

- [Palantir, allOfV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/allOfV1/)
- [Palantir, anyOfV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/anyOfV1/)
- [Palantir, linearRegressionGradientV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/linearRegressionGradientV1/)

- [Palantir, Sum](https://www.palantir.com/docs/foundry/pb-functions-expression/sumV1)
- [Palantir, Max](https://www.palantir.com/docs/foundry/pb-functions-expression/maxV1)
- [Palantir, Min](https://www.palantir.com/docs/foundry/pb-functions-expression/minV1)
- [Palantir, Mean](https://www.palantir.com/docs/foundry/pb-functions-expression/meanV1)
- [Palantir, Median](https://www.palantir.com/docs/foundry/pb-functions-expression/medianV1)
- [Palantir, Row count](https://www.palantir.com/docs/foundry/pb-functions-expression/rowCountV1)
- [Palantir, Distinct count](https://www.palantir.com/docs/foundry/pb-functions-expression/distinctCountV1)
- [Palantir, Collect array](https://www.palantir.com/docs/foundry/pb-functions-expression/collectArrayV1)
- [Palantir, Collect distinct array](https://www.palantir.com/docs/foundry/pb-functions-expression/collectDistinctArrayV1)
- [Palantir, All of](https://www.palantir.com/docs/foundry/pb-functions-expression/allOfV2)
- [Palantir, Any of](https://www.palantir.com/docs/foundry/pb-functions-expression/anyOfV2)
- [Palantir, First](https://www.palantir.com/docs/foundry/pb-functions-expression/firstV1)
- [Palantir, Last](https://www.palantir.com/docs/foundry/pb-functions-expression/lastV1)
- [Palantir, Lag](https://www.palantir.com/docs/foundry/pb-functions-expression/lagV1)
- [Palantir, Lead](https://www.palantir.com/docs/foundry/pb-functions-expression/leadV1)
- [Palantir, Rank](https://www.palantir.com/docs/foundry/pb-functions-expression/rankV1)
- [Palantir, Dense rank](https://www.palantir.com/docs/foundry/pb-functions-expression/denseRankV1)
- [Palantir, Percent rank](https://www.palantir.com/docs/foundry/pb-functions-expression/percentRankV1)
- [Palantir, Row number](https://www.palantir.com/docs/foundry/pb-functions-expression/rowNumberV1)
- [Palantir, Variance](https://www.palantir.com/docs/foundry/pb-functions-expression/varianceV1)
- [Palantir, Sample variance](https://www.palantir.com/docs/foundry/pb-functions-expression/sampleVarianceV1)
- [Palantir, Covariance](https://www.palantir.com/docs/foundry/pb-functions-expression/covarianceV1)
- [Palantir, Sample covariance](https://www.palantir.com/docs/foundry/pb-functions-expression/sampleCovarianceV1)
- [Palantir, Standard deviation](https://www.palantir.com/docs/foundry/pb-functions-expression/standardDeviationV1)
- [Palantir, Linear regression gradient](https://www.palantir.com/docs/foundry/pb-functions-expression/linearRegressionGradientV2)
- [Palantir, Approximate percentile](https://www.palantir.com/docs/foundry/pb-functions-expression/approximatePercentileV1)
- [Palantir, Approximate median](https://www.palantir.com/docs/foundry/pb-functions-expression/approxMedianV1)
- [Palantir, Mode](https://www.palantir.com/docs/foundry/pb-functions-expression/modeV1)
- [Palantir, Max by](https://www.palantir.com/docs/foundry/pb-functions-expression/maxByV1)
- [Palantir, Min by](https://www.palantir.com/docs/foundry/pb-functions-expression/minByV1)
- [Palantir, Pivot](https://www.palantir.com/docs/foundry/pb-functions-expression/pivotExpressionV1)
- [Palantir, Functions index](https://www.palantir.com/docs/foundry/pipeline-builder/functions-index)

## 관련 문서

- [[Palantir-Numeric-Expression-Contracts|수치 타입, null과 난수 재현성]]
- [[Palantir-Data-Pipeline-Operations|빌드, 배포와 실행 경계]]
