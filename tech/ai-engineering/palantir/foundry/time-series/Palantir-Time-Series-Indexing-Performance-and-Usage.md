---
tags: [palantir, foundry, time-series]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 시계열 색인, hydration과 사용량"]
---

# Foundry 시계열 색인, hydration과 사용량

시계열 sync build, projection과 read-time hydration은 다른 작업이다. 데이터가 backing dataset에 있다고 조회 cache에 전부 준비되어 있는 것은 아니다. 전체 범위를 반복 조회하는 문제를 단순히 화면 bucket 수만 낮춰 해결할 수 있는지도 구분한다.

## Projection과 hydration

Time series dataset에 sync를 만들면 그 dataset에 time series projection이 자동으로 생성된다. Sync는 build할 때 dataset transaction의 metadata를 생성해 색인할 데이터를 알린다. Projection은 series ID/timestamp 기준으로 partition/sort를 최적화한 materialized copy이며 SQL database index와 비슷한 최적화를 제공한다. Time-series database는 조회할 때 필요한 데이터를 hydrate하는 cache로 동작한다. Disk 압박 시 가장 오래 전에 hydrate한 series부터 제거할 수 있다. 이 eviction 설명은 2026-10-16 확인 당시 기준이며 2026-10-26 판 문서에서는 다시 찾지 못했다.

첫 조회, sync된 snapshot 이후와 cache eviction 이후에는 hydration 비용이 커질 수 있다(eviction 부분은 위와 같은 2026-10-16 기준). Incremental 입력은 후속 점을 incremental hydrate하지만 큰 transaction이나 오랫동안 조회하지 않아 쌓인 transaction도 느릴 수 있다. Query에 upstream time range를 걸면 필요한 구간만 hydrate한다. Time filter는 Quiver의 filter time series card나 FoundryTS의 `time_range` 함수로 만들 수 있다.

Sync가 최신 transaction 이후 build되지 않았으면 새 값이 hydrate되지 않는다. Soho가 아닌 dataset의 unprojected transaction은 hydrate되지 않는다고 명시한다. Soho로 변환하는 snapshot 또는 projection을 매 update에 build하는 경로는 서로 다른 지연/계산 tradeoff다.

## 수동 pipeline의 물리 형식

Pipeline Builder time-series output은 필요한 최적화를 자동 적용한다. 고급 Code Repository setup은 series ID로 range repartition, partition 안의 series ID/timestamp sort와 Soho 출력을 설명한다. 권장 partition은 128MB 초과, 보통 50억 행 미만이며 적은 수로 하되 executor memory와 parallelism을 고려한다. 이 수치를 모든 dataset의 platform quota로 확대하지 않는다.

대규모 시계열은 최적화가 빠지면 hydration이 느린 정도를 넘어 실패할 수 있다. Soho 형식 dataset은 projection이 오래되면 unprojected transaction을 canonical dataset에서 읽어 projection의 최적화가 적용되지 않는다(Soho가 아니면 앞 절처럼 unprojected transaction은 hydrate되지 않는다). Partition이 더 많은 file에 흩어지고 scan할 row도 늘어난다. 이런 접근은 query timeout과 service health 저하로 이어지기 쉬워 내장 limit이 막는다. Projection schedule이 꾸준히 실행되는지 확인하고, 필요하면 dataset preview 페이지에서 projection을 수동으로 rebuild한다.

Dataset 자체의 partition/sort가 맞지 않아도 극단적인 경우 scan할 row가 너무 많아져 비슷하게 내장 service limit에 걸릴 수 있다. 이때는 projection을 최신화하거나 pipeline에 올바른 formatting을 직접 추가해 해소할 수 있다. 느린 load를 다루는 FAQ 절은 일부 극단적인 경우 partition/sort 누락이나 data 양에 비해 많은 partition으로 hydration이 느려질 수 있고, 이 지연은 아직 projection되지 않은 transaction에만 해당한다고 따로 설명한다. Limit에 걸리면 먼저 source format, partition 수와 projection schedule을 확인하고, 최신 값이 빠졌으면 sync build 상태를 확인한다.

큰 dataset은 series ID로 나눠 여러 sync를 만들거나 시간별 dataset을 하나의 view로 묶는 최적화를 검토한다. View-input indexing(sync advanced settings의 Index view dataset inputs)은 대략 10TB 이상, backing dataset 10개 미만에서 권장되고, 조회 때 view의 모든 dataset을 고려하므로 dataset이 10개를 넘으면 조회 성능에 영향을 줄 수 있다.

Stream은 Series ID 하나로만 key를 설정하는 것을 권장한다. 높은 throughput에는 3개 이상 partition 권장이 있지만 기존 ingest 후 key/partition 변경은 stream reset이 필요하다. 성능 권장을 데이터 손실 없는 변경 보장으로 해석하지 않는다.

## Query compute의 두 항

Usage-based 계약의 문서상 기본 계산은 다음과 같다. Enterprise 계약은 별도 조건을 확인한다.

```text
compute-seconds = 4 + points_scanned / 25000
```

Query 횟수마다 고정 4 compute-seconds, scan한 point 수에 따른 추가 사용량이다. Stored time-series data는 storage로 측정되고 indexing과 active query는 compute를 사용한다. 금액 단가나 모든 계약의 고정 요금으로 바꾸어 해석하지 않는다.

복합 query의 points scanned는 최종 출력 point 수만 세지 않는다. 여러 source와 nested formula/rolling node에서 읽는 점이 각각 기여할 수 있다. 세 query가 매번 100k points를 scan하는 예시는 총 24 compute-seconds다.

## 사용량 귀속과 최적화

Quiver query는 analysis/dashboard, Workshop embed query는 host Workshop app, FoundryTS transform query는 code repository에 귀속된다. 기능을 어떤 UI에서 만들었는지와 실제 query resource attribution을 구분한다.

Query 수, 조회 point 수와 논리 복잡도를 함께 줄인다. Parameter 변경이 모든 query를 다시 실행하지 않도록 dependency를 나누고, 필요한 granularity의 series를 미리 유지하는 대안은 indexing compute와 storage/query 절감을 함께 비교한다. 이 문서의 공식 계산식은 2026-10-16에 확인했고 2026-10-26 판에서도 같으며, 실제 사용량/청구를 측정하지 않았다.

## 출처

- [Palantir Time series, advanced-setup](https://www.palantir.com/docs/foundry/time-series/advanced-setup)
- [Palantir Time series, compute-usage](https://www.palantir.com/docs/foundry/time-series/compute-usage)
- [Palantir Time series, faqs](https://www.palantir.com/docs/foundry/time-series/faqs)
- [Palantir Time series, time-series-syncs](https://www.palantir.com/docs/foundry/time-series/time-series-syncs)

## 관련 문서

- [[Palantir-Time-Series]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation]]
- [[Palantir-Time-Series-Identity-Schema-and-Sync|Foundry 시계열 identity, schema와 sync]]
- [[Palantir-Time-Series-Derived-Series-and-Access|Foundry derived series, 버전과 접근 권한]]
- [[Palantir-Time-Series-Alerting-State-and-Replay|Foundry 시계열 alerting의 상태, 지연과 재평가]]
- [[Palantir-Time-Series-Functions-and-Calculation-Semantics|Foundry 시계열 함수와 계산 의미]]
