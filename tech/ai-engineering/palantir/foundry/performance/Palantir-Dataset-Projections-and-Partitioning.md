---
tags: [palantir, foundry, performance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Dataset projection과 Hive partitioning

## 두 가지 저장 최적화

Hive-style partitioning은 key별 디렉터리와 metadata를 이용해 Spark/Polars 등의 읽기 범위를 줄인다. 일반 Parquet와 파일 경로로도 접근하기 쉽지만 작은 파일을 자동으로 compaction하지는 않는다. 낮은 cardinality의 key가 적합하며 task마다 key 조합별 파일을 만들 수 있다.

Projection은 canonical dataset의 일부 열을 별도 자원으로 저장해 filter, join, aggregation과 작은 파일 읽기를 최적화한다. 전역 정렬 또는 bucket 안 정렬을 선택할 수 있다. Canonical 자원과 결과 의미를 유지하면서 추가 storage/build 비용을 지불한다. Filter projection의 최적화는 Foundry Spark에서 쓰는 형식이라는 경계를 고려한다.

## 사용 가능 조건

Projection 대상은 append-only 계약을 지켜야 한다. SNAPSHOT/APPEND와 엄격히 additive인 UPDATE는 문서상 허용되지만 DELETE나 기존 파일 overwrite는 projection을 비활성화한다. 열 추가를 포함한 schema evolution도 지원 조건 밖이다. Projection이 가진 열로 질의를 충족할 수 있어야 한다.

Filter 정렬 key는 순서가 중요하다. 앞선 열부터 일정한 조건으로 제한할 때 효율적이며 대소문자도 구분한다. abs/mod 같은 함수나 다른 열을 포함한 OR은 pushdown을 막을 수 있다. Range 기능의 자료형 제약도 확인한다.

Join shuffle을 피하려면 정확한 key 집합과 bucket 수가 맞아야 한다. 한쪽만 bucket되어 있으면 다른 쪽 shuffle이 남을 수 있다. 양쪽 bucket이 맞아도 sort가 남을 수 있으며 BUCKET_SORTED_SCAN_ENABLED는 경우에 따라 성능을 악화시킨다.

## 신선도와 선택

Projection은 생성만으로 채워지지 않는다. 브랜치별 enable과 별도 build schedule을 설정한다. Build 안의 compaction과 projection build 자체의 자동 실행을 구분한다.

Append 후 projection이 일부 뒤처져도 canonical의 새 tail과 결합할 수 있다. SNAPSHOT 이후에는 projection을 재빌드하기 전 이득이 없을 수 있다. Schedule 간격은 tail scan 허용량과 유입량으로 산정한다. 예를 들어 시간당 10 GB가 늘고 100 GB tail을 허용하면 10시간이 시작점이다.

Planner는 적용 가능한 projection을 선택하므로 canonical이 더 빠른 특정 query에도 projection을 고를 수 있다. Filter 열 수, global/local 정렬과 join bucket 조합에 따라 우선순위가 달라진다. 대표 query로 실제 plan과 성능을 비교한다.

## 파일 수와 보존

Hive key가 높게 편향되면 key 하나가 큰 partition이 될 수 있다. Range repartition으로 key를 분산하는 방법과 추가 timestamp로 key 안을 나누는 방법은 shuffle와 distinct 계산 비용을 더한다. Hash partition 수를 늘리는 것만으로 key 편향이 해결된다고 가정하지 않는다.

Projection은 브랜치별 자원이고 canonical 삭제 시 함께 삭제된다. 비용은 canonical project에 귀속된다. Compaction 뒤 superseded 파일을 정리하려면 projection 자원에 맞는 retention selector와 active view 조건을 검토한다. Parent dataset을 대상으로 착각하거나 latest view 삭제를 가볍게 허용하지 않는다.

## 출처

- [Palantir Foundry, hive-style-partitioning](https://www.palantir.com/docs/foundry/optimizing-pipelines/hive-style-partitioning/)
- [Palantir Foundry, projections-advanced](https://www.palantir.com/docs/foundry/optimizing-pipelines/projections-advanced/)
- [Palantir Foundry, projections-overview](https://www.palantir.com/docs/foundry/optimizing-pipelines/projections-overview/)
- [Palantir Foundry, projections-setup](https://www.palantir.com/docs/foundry/optimizing-pipelines/projections-setup/)
- [Palantir Foundry, projections-vs-hive-style-partitioning](https://www.palantir.com/docs/foundry/optimizing-pipelines/projections-vs-hive-style-partitioning/)

## 관련 문서

- [[Palantir-Foundry-Performance]]
