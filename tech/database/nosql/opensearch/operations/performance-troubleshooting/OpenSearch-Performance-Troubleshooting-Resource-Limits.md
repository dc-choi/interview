---
tags: [database, search, opensearch, performance, troubleshooting, monitoring]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
---

# OpenSearch 자원 한계 — cache, thread pool, breaker와 backpressure

## Cache를 구분하기

| Cache | 단위 | 적합한 요청 | 주요 함정 |
|---|---|---|---|
| Request cache | shard response | 반복되는 `size: 0` 집계 | refresh와 변경 시 invalidation |
| Query cache | filter 결과 | 반복 filter clause | 낮은 재사용률과 eviction |
| Field data cache | text field의 on-heap fielddata와 global ordinals | 예외적인 text sort와 집계 | 큰 heap과 breaker trip |
| OS page cache | Lucene segment file | 대부분의 검색 | JVM heap을 과도하게 키우면 축소 |

Cache 크기를 늘리기 전에 hit, miss, eviction, GC를 본다. Profile, scroll, DFS, 비결정적 query와 `now` 같은 상대 시간은 request cache 대상이 아니다. 재사용이 필요하면 애플리케이션이 bucket의 절대 시작과 종료 시각을 계산해 같은 요청을 보내고 freshness 의미를 검증한다. Self-managed heap은 node나 container에 할당된 메모리의 약 절반에서 시작해 OS와 native memory, Lucene segment용 filesystem cache를 남긴다. 32GiB는 compressed ordinary object pointers에 관한 흔한 JVM 경험칙이지 OpenSearch Core의 절대 상한이 아니므로 JDK와 workload로 검증한다.

## Thread pool과 429

Queue가 가득 차면 요청이 reject된다. 다만 429는 thread pool 포화 외에도 breaker와 indexing 또는 search backpressure에서 발생할 수 있으므로 HTTP status만으로 단정하지 않고 error type과 reason을 먼저 분류한다. Queue와 pool을 무작정 늘리면 overload가 늦게 드러나고 heap, context switching, tail latency가 악화된다.

429 대응 순서:

1. `/_cat/thread_pool`과 Nodes Stats에서 queue와 rejected를 확인한다.
2. 색인과 검색 중 어느 pool이 포화됐는지 구분한다.
3. Bulk 크기와 client concurrency, 비싼 query를 줄인다.
4. CPU, disk I/O, GC, shard skew를 확인한다.
5. Self-managed의 fixed pool과 queue 크기는 static setting이므로 비운영 benchmark와 restart 계획 뒤 변경한다. Managed service는 제공되는 설정 경계와 Auto-Tune을 따른다.

## Circuit breaker

Breaker는 메모리 사용을 제한해 Java OOM 위험을 낮추는 보호 장치지만 모든 heap 사용을 포착하는 보장은 아니다.

- Parent breaker는 기본 `use_real_memory=true`에서 실제 JVM heap 사용량을 보며 기본 limit는 heap의 95퍼센트다.
- Request breaker는 aggregation 등 요청 임시 구조를 제한한다.
- Fielddata breaker는 text fielddata 적재를 제한한다.
- Inflight request breaker는 transport와 HTTP request memory를 제한한다.

Breaker trip이 나면 limit부터 높이지 않는다. 큰 aggregation, fielddata, bulk body, 동시성, shard fan-out을 줄이고 원인을 측정한다.

## Backpressure

- Search backpressure는 CPU, heap, elapsed time으로 비싼 search task를 식별한다.
- 기본 `monitor_only`에서 통계를 본 뒤 `enforced`를 검토한다.
- Shard indexing backpressure는 shard와 node 압박, 처리량 저하, pending request를 본다.
- 현재 문서에서 `shard_indexing_pressure.enabled`와 `shard_indexing_pressure.enforced` 기본값은 모두 `false`다. 표준 indexing pressure와 구분하고 운영 버전의 실제 설정을 확인한다.
- 취소와 partial result가 발생할 수 있으므로 client가 shard failure를 검사한다.

## 출처

- [OpenSearch Documentation, Caching](https://docs.opensearch.org/latest/search-plugins/caching/index/)
- [OpenSearch Documentation, Thread pool settings](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/thread-pool-settings/)
- [OpenSearch Documentation, Circuit breaker settings](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/circuit-breaker/)
- [OpenSearch Documentation, Search backpressure](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/search-backpressure/)
- [OpenSearch Documentation, Shard indexing backpressure settings](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/shard-indexing-settings/)
- [OpenSearch Documentation, Installing OpenSearch](https://docs.opensearch.org/latest/install-and-configure/install-opensearch/index/)

## 관련 문서

- [[OpenSearch-Performance-Troubleshooting|OpenSearch 성능 진단과 장애 대응]]
- [[OpenSearch-Performance-Troubleshooting-Baseline|성능 기준선과 운영과 닮은 benchmark]]
- [[OpenSearch-Performance-Troubleshooting-Throughput-Latency|색인 처리량과 검색 latency]]
- [[OpenSearch-Performance-Troubleshooting-Diagnostics|진단 API, slow log와 증상별 가설]]
