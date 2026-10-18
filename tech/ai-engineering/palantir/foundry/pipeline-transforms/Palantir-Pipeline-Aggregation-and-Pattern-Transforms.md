---
tags: [palantir, foundry, pipeline-builder, aggregation, clustering]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 집계, 분포와 패턴 변환"]
---

# Pipeline Builder 집계, 분포와 패턴 변환

집계는 입력 행을 어떤 그룹으로 요약하고 어떤 수준의 결과를 남기는지 정하는 작업이다. 분포, pivot과 패턴 탐색도 서로 다른 출력 단위를 갖는다. 아래는 2026-10-16 공식 transform 계약이며 실제 통계나 모델을 계산하지 않았다.

## 그룹 집계와 열 조건

Aggregate는 group-by별 aggregate expression을 계산하고 group-by가 비어 있으면 전체를 집계한다. Aggregate on condition은 행 조건이 아니라 schema의 열 조건에 맞는 열마다 aggregate expression을 적용한다. Dynamic alias를 사용해 원본 열과 연산 종류를 출력 이름에 남길 수 있다.

Non-null row count 예시는 같은 세 행에서도 열별 count가 다를 수 있음을 보여 준다. 그룹 key가 숫자 열 조건과 맞으면 그 열도 집계 대상이 되는 예시가 있다. Id라는 이름만으로 자동 제외됐다고 가정하지 않는다.

## Rollup의 소계와 null

Rollup은 정해진 열 순서의 여러 세분 수준과 전체 집계를 함께 만든다. `(city, model)` 예시는 도시/모델별, 도시별 소계와 전체 합계를 포함하고, 해당 수준에서 생략한 key는 null로 표현한다.

소계 표시 null과 원본 데이터의 실제 null을 같은 의미로 집계하거나 join하지 않도록 결과 수준을 구분한다. 공개 transform 계약에 없는 grouping marker가 자동 제공된다고 가정하지 않는다.

배열 값의 max 예시는 배열 하나를 반환한다. 배열 원소를 펼쳐 스칼라 최대를 구하는 동작과 구별한다. 빈 입력 예시는 빈 결과이고 rollup 열 목록이 비어 있으면 전체 집계만 남는 예시가 있다.

## Pivot과 unpivot의 행 수

Pivot은 출력 schema를 실행 전에 알 수 있도록 pivot할 unique value와 alias를 미리 지정해야 한다. 그 값별로 aggregation을 계산하고 prefix/suffix 옵션으로 열 이름을 구성한다. 매칭이 없는 조합의 결과에는 null이 있을 수 있다.

Unpivot은 선택한 여러 열을 이름/값 두 열의 여러 행으로 바꾸고 다른 열은 유지한다. 예시는 null 값도 행으로 남긴다. 기존에 출력 value column과 같은 이름이 있으면 예시에서는 새 값이 그 열을 대체하므로 원본 값을 보존하려면 미리 이름을 분리한다.

Unpivot이 pivot의 반대라는 설명을 원본 행 이력의 무손실 복구로 확대하지 않는다. Pivot의 aggregation으로 합쳐진 입력 행은 unpivot만으로 다시 분리할 수 없다.

## 날짜와 숫자 분포

Date distribution은 Date/Timestamp 열, 시작과 끝 범위, 시간 bucket 단위를 받으며 범위 밖 시각은 무시한다. 출력되지 않은 기간이 실제 관측 0인지 처리 범위 밖인지 구분한다. Timezone과 빈 bucket 채움 정책은 해당 짧은 공개 페이지에서 확인되지 않는다.

Numeric distribution은 최소/최대와 bucket count로 요약하고 bucket 경계, 관측 min/max와 count를 반환하는 예시가 있다. 예시에서는 빈 bucket이 생략되고 최대 경계 값이 별도 bucket에 들어갈 수 있다. Bucket count를 출력 행 수의 정확한 상한이나 최대값 배제 규칙으로 가정하지 않는다.

분포 요약에서 빠진 값과 null의 원본 처리 정책을 별도로 확인해야 한다. 한 예시의 bucket 공식을 다른 타입이나 경계까지 일반화하지 않는다.

## 빈발 패턴과 군집은 다른 학습

Frequent pattern growth는 String 배열에서 minimum support 이상의 빈발 item 조합을 찾고 pattern occurrence와 total count를 반환한다. Null 배열만 있는 예시는 결과가 비지만 배열 안의 null이 item으로 나타나는 예시도 있다. Null 배열과 null 원소를 같은 전처리 정책으로 처리하지 않는다.

Minimum support는 출현 비율이다. Support 0은 더 많은 조합을 남길 수 있으며, 빈발하다는 결과를 인과관계나 사용자 전체를 대표한다는 증거로 해석하지 않는다.

K-means는 `Array<Float>`를 군집화한다. Minimum/maximum k 사이에서 지정한 개수의 k를 시험하고 silhouette score가 가장 좋은 모델을 고른다. 시험할 k 개수를 늘리면 그만큼 여러 모델을 훈련하므로 실행 비용이 커질 수 있다.

Null vector는 예시에서 출력에서 빠진다. Cluster ID는 원래 의미가 있는 업무 분류명이나 build 간 영구 식별자라는 보장이 없다. 모델 선택 점수와 실제 업무상 적절한 군집 해석도 분리한다.

## Window와 엔진

Batch/Faster의 Window transform은 window와 expression 목록을 받는다. 짧은 본문에 일반 집계 설명이 반복돼 있어 그것만으로 Streaming trigger emission과 같은 동작이라고 확정하지 않는다. Trigger/accumulation을 명시하는 Aggregate over window와 매 새 행마다 출력하는 Project over window를 구분한다.

Aggregate, condition aggregate, rollup, pivot, numeric distribution과 Window는 Batch/Faster다. Unpivot은 Batch/Faster/Streaming이고 date distribution, FP growth와 K-means는 Batch다. 공개 예제 일부의 생략과 지원 표를 실제 실행 검증과 구분한다.

## PCA 차원 축소의 결측과 출력

영어 경로 대신 확보한 공식 중국어 AIP 미검증 번역의 Dimensionality reduction V1은 Batch에서 embedded vector 열을 PCA로 n차원에서 k차원으로 줄인다. Optional output dimension을 받고 예시는 원본 열과 `_pca` 결과를 함께 남긴다.

예시에서 vector 내부 null은 계산 결과가 만들어지고 `[null,null]`은 `[0,0]`이 된다. Vector 자체가 null인 행은 출력에서 빠진다. 이 예시를 임의의 null imputation 정책이나 영구 보존 보장으로 일반화하지 않는다. 예시 좌표만으로 centering/scaling, 모델 재사용과 coefficient를 복원하지 않으며 runtime 계산은 하지 않았다.

## 출처

- [Palantir, Aggregate transform entry](https://www.palantir.com/docs/foundry/pb-functions-transform)
- [Palantir, Aggregate](https://www.palantir.com/docs/foundry/pb-functions-transform/aggregateV1)
- [Palantir, Aggregate on condition](https://www.palantir.com/docs/foundry/pb-functions-transform/aggregateOnConditionV1)
- [Palantir, Rollup](https://www.palantir.com/docs/foundry/pb-functions-transform/rollUpV1)
- [Palantir, Pivot](https://www.palantir.com/docs/foundry/pb-functions-transform/pivotV1)
- [Palantir, Unpivot](https://www.palantir.com/docs/foundry/pb-functions-transform/unpivotV1)
- [Palantir, Date distribution](https://www.palantir.com/docs/foundry/pb-functions-transform/dateDistributionV1)
- [Palantir, Numeric distribution](https://www.palantir.com/docs/foundry/pb-functions-transform/numericDistributionV2)
- [Palantir, Frequent pattern growth](https://www.palantir.com/docs/foundry/pb-functions-transform/fpGrowthV1)
- [Palantir, K-means clustering](https://www.palantir.com/docs/foundry/pb-functions-transform/kmeansV1)
- [Palantir, Window](https://www.palantir.com/docs/foundry/pb-functions-transform/windowV1)

- [Palantir, dimensionalityReductionV1 (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/pb-functions-transform/dimensionalityReductionV1/)

## 관련 문서

- [[Palantir-Pipeline-Streaming-State-Contracts|Window trigger와 상태 유지]]
- [[Palantir-Pipeline-Row-and-Schema-Transforms|행과 열의 보존]]
- [[Palantir-Pipeline-Transforms|변환 지도]]
