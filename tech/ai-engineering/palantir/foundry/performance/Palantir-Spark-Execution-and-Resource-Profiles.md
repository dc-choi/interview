---
tags: [palantir, foundry, performance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Spark 실행과 리소스 프로필

## 병렬성과 메모리의 단위

Driver는 실행 계획과 작업을 조정하고 executor는 partition별 task를 실행한다. Executor core는 동시 task 수에, executor memory는 그 task들이 공유하는 메모리에 영향을 준다. Driver JVM heap과 Python/native overhead는 다른 메모리 영역이다. 드라이버에 collect하거나 일반 Python/Pandas로 처리하면 실행기 수를 늘려도 해당 작업이 분산되지 않는다.

총 task 실행 시간 / job duration으로 병렬성의 단서를 얻는다. 1에 가까우면 순차 구간이나 심한 skew를 조사한다. Stage의 critical path를 기준으로 개선 대상을 고른다. 병렬로 끝나는 여러 stage 중 이미 짧은 하나를 줄여도 가장 긴 stage의 대기 시간이 남을 수 있다.

Spill은 메모리에 담지 못한 데이터를 디스크로 보낸 양이다. 대규모 처리에서 spill이 있다는 사실만으로 장애를 확정하지 않는다. 한 task의 행 수, 시간과 peak memory가 나머지보다 큰지 살펴 skew와 전체 용량 부족을 구분한다. Stage를 원본 코드로 자동 역추적하는 데는 Spark가 노출하는 lineage의 한계가 있다.

## 프로필 적용 계약

저장소에 프로필을 가져온 뒤 변환에 적용한다. Python, Java, SQL에는 적용 방법이 있지만 ANSI SQL에는 Spark profile을 적용할 수 없다. 여러 프로필의 동일 설정은 나중에 적용된 값이 앞선 값을 덮는다. 예제 문법과 실제 사용하는 transforms/runtime 버전을 함께 확인한다.

프로필은 driver/executor의 core, JVM heap, overhead, 실행기 수, shuffle partition과 동적 할당을 조절한다. 리소스 요청은 실제 큐 할당 보장이 아니다. 실행기 수를 늘리는 변경은 분산 가능한 작업이 있는지, startup 비용을 상쇄할 만큼 실행이 긴지 검증한다.

메모리 부족에서는 driver와 executor 중 실패한 영역부터 구분한다. 큰 broadcast/collect와 많은 파일은 driver를 압박하고, 높은 task 동시성과 skew는 executor를 압박한다. 로직, 조인 증폭과 입력 파일 배치를 고친 뒤 필요한 영역을 증설한다. 파일 128~512 MB와 task 30~60초 같은 수치는 출발점이며 작업별 보장값이 아니다.

## 자동 조정과 수동 재정의

Managed profile은 최근 5회 성공 실행, 충분한 metrics와 동일 설정 이력을 요구한다. 관측 최대치를 기존 요청 상한 안에서 사용하며 자동 증설을 보장하지 않는다. 작은 작업은 local driver로 합칠 수 있다. 최근 입력보다 급증한 데이터에 대한 안전 여유는 별도 검토한다.

수동 설정은 새 기본 최적화의 적용을 가로막을 수 있으므로 병목이 확인된 범위에 한정한다. 한 번에 하나의 변수와 한 단계의 크기부터 바꾸고 시간, 비용과 실패율을 비교한다.

## 이름만 보고 활성화하지 않을 설정

Legacy parser, null/map 처리, LAST_MAP_KEY_WINS와 cross join 설정은 결과 의미를 바꿀 수 있다. Speculation은 task 재실행이므로 외부 side effect의 멱등성도 고려한다. Arrow/Pandas 전환은 메모리 문제가 사라진다는 뜻이 아니다.

검증일의 profile reference에는 ENABLE_COLUMN_STATS라는 이름과 달리 표의 설정 값이 false로 표시되는 불일치가 있다. 이 항목을 통계 활성화 방법으로 확정하지 말고 실제 환경의 설정을 확인한다. 네트워크 port, ARM/AMD와 off-heap 설정도 목적과 runtime 지원을 확인해 적용한다.

## Spark UI와 통합 화면

Spark UI는 debug job에서 열며 이벤트가 1~2분 늦게 나타날 수 있다. dataset write의 상세 plan은 주 query보다 Sub Execution IDs 아래 query에 있을 수 있다. 초기 count job은 executor를 일찍 요청하는 context warming일 수 있으므로 불필요한 사용자 count로 단정하지 않는다.

## 출처

- [Palantir Foundry, apply-spark-profiles](https://www.palantir.com/docs/foundry/optimizing-pipelines/apply-spark-profiles/)
- [Palantir Foundry, managed-profiles](https://www.palantir.com/docs/foundry/optimizing-pipelines/managed-profiles/)
- [Palantir Foundry, spark-concepts](https://www.palantir.com/docs/foundry/optimizing-pipelines/spark-concepts/)
- [Palantir Foundry, spark-profiles-reference](https://www.palantir.com/docs/foundry/optimizing-pipelines/spark-profiles-reference/)
- [Palantir Foundry, spark-ui](https://www.palantir.com/docs/foundry/optimizing-pipelines/spark-ui/)
- [Palantir Foundry, understand-spark-details](https://www.palantir.com/docs/foundry/optimizing-pipelines/understand-spark-details/)

## 관련 문서

- [[Palantir-Foundry-Performance]]
