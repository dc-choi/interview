---
tags: [database, search, opensearch, performance, troubleshooting, monitoring]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Performance", "OpenSearch Troubleshooting", "OpenSearch 성능 진단"]
---

# OpenSearch 성능 진단과 장애 대응
성능 튜닝은 기본값 변경이 아니라 병목 가설을 측정으로 반증하는 과정이다. 데이터 모델과 shard 구조, query fan-out을 먼저 보고 thread pool과 breaker는 마지막에 건드린다.

## 먼저 고정할 것

- 색인 처리량과 허용 lag
- 검색 p50, p95, p99와 timeout 비율
- Query 유형별 SLO와 정확성 요구
- Dataset 크기, shard 수, replica 수, node 사양
- 정상 peak와 node 하나를 잃은 peak
- 대표 corpus와 query mix

OpenSearch Benchmark로 실제 문서와 query 비율을 재현한다. 단일 bulk 또는 단일 match query 결과를 전체 workload 성능으로 일반화하지 않는다.

## 운영과 닮은 benchmark

용량 시험은 최대 RPS 찾기가 아니라 목표 처리량에서 SLO와 장애 여유를 검증하는 작업이다.

- 운영과 같은 corpus 크기와 분포, mapping, analyzer를 사용한다.
- Search 종류, update, delete, bulk 비율과 payload 크기를 실제 traffic mix에 맞춘다.
- Shard, replica, refresh interval, instance, storage, network와 AZ 구성을 기록한다.
- Warm-up과 ramp-up 뒤 merge, cache, old GC가 드러날 만큼 충분히 오래 실행한다.
- Achieved throughput, p50, p95, p99, timeout, error, 429와 node별 최대 CPU, JVM, GC, 최소 disk를 함께 기록한다.
- Load generator 자체가 병목인지 확인하고 data node 하나를 잃은 상태도 시험한다.

## 색인 처리량

### Bulk

- OpenSearch Core는 5에서 15MiB, Amazon OpenSearch Service는 3에서 5MiB를 초기 bulk 실험 범위로 제시한다. Append-only에서 자동 `_id`는 최적화될 수 있지만 retry 멱등성, 중복 제거와 update가 필요하면 안정적인 source ID를 우선한다.
- Worker 수를 늘리다가 throughput이 더 늘지 않거나 429와 latency가 증가하는 지점을 찾는다.
- `items[].error`를 분류하고 일시 오류만 backoff한다.
- 429에 exponential backoff와 jitter를 적용한다.
- Mapping 오류는 일반 error log에 남지 않을 수 있으므로 response를 보존한다.

### Refresh와 replica

- Near-real-time 요구가 낮으면 `index.refresh_interval`을 늘린다.
- 순수 일회성 적재는 refresh를 잠시 끌 수 있지만 완료 후 원복과 refresh가 필요하다.
- `refresh=true` 반복은 작은 segment와 merge를 늘린다.
- Replica 0은 재생 가능한 일회성 적재에서만 검토하고 node 장애 데이터 손실을 감수해야 한다.

### Buffer, translog, merge

- Indexing buffer 기본값부터 측정한다. 늘리면 search와 breaker용 heap이 줄어든다.
- Translog flush threshold를 늘리면 flush 빈도는 줄지만 recovery 시간이 늘어난다.
- Merge throttle과 segment 수가 증가하면 disk I/O가 병목인지 확인한다.
- Hot shard가 있으면 node 평균 CPU보다 shard별 indexing rate와 routing 분포를 본다.

## 검색용 field model

- `nested`는 내부 객체를 별도 Lucene document처럼 저장하고 parent-child `join`은 비용이 큰 joining query다. 관계 의미가 필요하면 사용하되 읽기 비중이 높고 갱신 fan-out을 감수할 수 있을 때 역정규화를 비교한다.
- `copy_to`는 여러 field의 원시 값을 검색용 field로 복사해 query를 단순화하지만 `_source`를 바꾸거나 관계 의미를 보존하지 않는다. 반복되는 안정적인 계산값의 사전 계산도 query-time script를 줄이는 대신 쓰기, 저장과 재색인 비용을 늘린다.

## 검색 latency

개선 우선순위:

1. 검색 대상 index와 shard를 줄인다.
2. Exact 조건을 filter context로 옮긴다.
3. 필요한 `_source`와 field만 반환한다.
4. Deep `from/size`를 PIT와 `search_after`로 바꾼다.
5. `text` fielddata, 선행 wildcard, 큰 regexp, 불필요한 script score를 제거한다. Script score가 필수면 후보 수를 제한하고 benchmark한다.
6. High-cardinality aggregation과 bucket depth를 제한한다.
7. Mapping과 index sort를 workload에 맞게 재설계한다.
8. 그 뒤 cache와 low-level setting을 검토한다.

Search latency는 가장 느린 shard의 tail에 끌린다. 평균 node 지표가 정상이어도 한 hot shard, 한 느린 disk, 한 merge가 p99를 만들 수 있다.

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

## 최소 진단 API

```http
GET /_cluster/health
GET /_cat/nodes?v
GET /_cat/indices?v
GET /_cat/shards?v
GET /_cat/allocation?v
GET /_cluster/allocation/explain
GET /_cluster/pending_tasks
GET /_nodes/stats/jvm,process,os,fs,thread_pool,breaker,indices
GET /_nodes/hot_threads
GET /_stats/indexing,search,merge,refresh,flush,translog,segments,request_cache,query_cache
GET /_cat/thread_pool?v
GET /_tasks?detailed=true
```

### 주요 신호

- JVM: heap, old GC 횟수와 시간
- OS: CPU, swap, open file descriptor
- Disk: free space, I/O latency, watermark
- Thread pool: active, queue, rejected
- Breaker: estimated size와 tripped count
- Index: segment 수, merge throttle, refresh와 flush 시간
- Search: query와 fetch latency, shard failure
- Cluster manager: pending task 수와 최대 대기 시간

## Slow log와 Query Insights

- Request slow log는 전체 검색 요청 시간을 본다.
- Shard search와 indexing slow log는 개별 shard 시간을 본다.
- 모두 기본 비활성이며 낮은 threshold는 disk와 성능을 악화시킨다.
- 진단 기간과 대상 index를 제한하고 민감 query body 노출을 검토한다.
- Query Insights는 2.12 이상에서 latency, CPU, memory 기준 Top N을 찾는다. Live Queries API는 3.0 이상에서만 사용할 수 있다.
- `X-Opaque-Id`로 애플리케이션 요청, task, slow log를 연결한다.

## 증상별 가설

| 증상 | 먼저 볼 지표 | 흔한 원인 |
|---|---|---|
| 색인 429 | write queue, CPU, disk | bulk와 concurrency 과다, merge, hot shard |
| 검색 p99 증가 | shard slow log, hot threads | fan-out, merge, deep pagination, hotspot |
| Breaker trip | breaker, fielddata, request | 큰 bucket, text fielddata, 큰 body |
| 긴 GC | old GC, shard와 field 수 | 과다 shard, mapping explosion, cache 압박 |
| Manager 불안정 | pending tasks, state size | mapping churn, shard churn, manager 겸용 |
| 결과 누락 | `_shards.failed`, timeout | partial result, unassigned primary, cancellation |
| Disk 급증 | segment, merge, translog | refresh 과다, PIT 장기 유지, merge backlog |

## 진단 도구 선택

- `_analyze`: token 문제
- `_explain`: 특정 문서 score 문제
- Profile API: query와 aggregation component 시간
- Slow log: 실제 운영의 느린 요청과 shard
- Query Insights: 반복되는 상위 비용 query
- Performance Analyzer: node와 shard 자원 상관관계
- OpenSearch Benchmark: 변경 전후 재현 가능한 비교

## 관련 문서

- [[OpenSearch-Query-Relevance|Query 구조와 관련도]]
- [[OpenSearch-Aggregations-Pagination|집계와 deep pagination]]
- [[OpenSearch-Cluster-Reliability|Shard와 allocation]]
- [[OpenSearch-Service|Amazon OpenSearch Service 운영]]

## 출처

- [Tuning for indexing speed - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/performance/)
- [Caching - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/caching/index/)
- [Thread pool settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/thread-pool-settings/)
- [Circuit breaker settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/circuit-breaker/)
- [Search backpressure - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/search-backpressure/)
- [Shard indexing backpressure settings - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/shard-indexing-settings/)
- [Logs - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/logs/)
- [Query Insights - OpenSearch Documentation](https://docs.opensearch.org/latest/observing-your-data/query-insights/index/)
- [OpenSearch Benchmark - OpenSearch Documentation](https://docs.opensearch.org/latest/benchmark/)
- [Running an OpenSearch Benchmark workload - OpenSearch Documentation](https://docs.opensearch.org/latest/benchmark/user-guide/working-with-workloads/running-workloads/)
- [Operational best practices - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp.html)
- [Installing OpenSearch - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/install-opensearch/index/)
- [OpenSearch Service quotas - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html)
