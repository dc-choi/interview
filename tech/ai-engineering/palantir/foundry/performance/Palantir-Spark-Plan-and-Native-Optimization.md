---
tags: [palantir, foundry, performance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Spark 계획과 native 실행 최적화

## 계산량과 데이터 이동을 먼저 줄인다

필요한 열과 행을 일찍 제한하고 built-in 표현식을 우선한다. Catalyst와 비용 기반 최적화가 논리 연산을 재배치할 수 있으므로 코드 작성 순서가 물리 실행 순서와 일치한다고 가정하지 않는다. 실제 plan과 실행 metrics로 확인한다.

Join은 key별 입력 행 수와 출력 증폭을 확인한다. 반복 조인으로 plan이 커지면 checkpoint나 중간 materialization을 검토하되 저장과 재계산 비용을 비교한다. 작은 쪽 broadcast는 shuffle을 줄일 수 있지만 행 수만으로 메모리 크기를 판단하면 driver/executor OOM 위험을 놓친다. Null key의 분포와 사용하는 join 조건도 확인한다.

Repartition은 shuffle로 재배치하고 coalesce는 기존 partition을 합치는 성격이다. 작은 파일을 줄이려다 큰 skew partition을 만들 수 있다. 열 기준 repartition을 했다는 사실만으로 저장된 데이터의 bucketing metadata가 생기지는 않는다.

Bucket writer는 task별로 bucket 파일을 만들 수 있어 task 수와 bucket 수의 곱만큼 작은 파일이 생길 수 있다. SQL의 CLUSTERED BY/SORTED BY metadata와 CLUSTER BY shuffle을 구분한다. 저장 layout의 효과는 후속 query가 이를 인식할 때 얻는다.

## Native acceleration의 경계

Gluten/Velox 기반 native acceleration은 Spark scheduler 전체를 대체하는 방식이 아니라 지원 operator를 native engine으로 넘기는 방식이다. Plan의 transformer 연산과 row/columnar 변환 경계를 확인한다.

지원되지 않는 UDF와 연산 사이를 자주 왕복하면 변환 비용이 이득을 상쇄할 수 있다. Pipeline Builder checkpoint로 native 처리 구간을 묶는 방법도 실행 계획과 함께 평가한다. C++ vector 실행이 모든 pipeline을 자동으로 빠르게 한다고 가정하지 않는다.

Native 연산에는 off-heap 메모리가 필요하고 JVM orchestration에는 on-heap 메모리도 남는다. 둘 중 하나를 과도하게 줄이지 말고 실패 위치, peak usage와 runtime 지원을 확인한다.

## 변경 평가

동일 입력/로직에서 job duration, compute 사용량, shuffle, spill과 실패율을 비교한다. 자원을 늘려 빠르게 끝났어도 총 compute는 증가할 수 있다. 작은 transform으로 분리하면 장애 범위와 재사용이 좋아지지만 orchestration과 저장 비용이 늘어난다.

## 출처

- [Palantir Foundry, native-acceleration](https://www.palantir.com/docs/foundry/optimizing-pipelines/native-acceleration/)
- [Palantir Foundry, spark-optimization](https://www.palantir.com/docs/foundry/optimizing-pipelines/spark-optimization/)

## 관련 문서

- [[Palantir-Foundry-Performance]]
