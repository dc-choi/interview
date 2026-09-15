---
tags: [database, search, opensearch, performance, troubleshooting, monitoring]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
---

# OpenSearch 진단 API, slow log와 증상별 가설

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

## 출처

- [OpenSearch Documentation, Logs](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/logs/)
- [OpenSearch Documentation, Query Insights](https://docs.opensearch.org/latest/observing-your-data/query-insights/index/)

## 관련 문서

- [[OpenSearch-Performance-Troubleshooting|OpenSearch 성능 진단과 장애 대응]]
- [[OpenSearch-Performance-Troubleshooting-Baseline|성능 기준선과 운영과 닮은 benchmark]]
- [[OpenSearch-Performance-Troubleshooting-Resource-Limits|cache, thread pool, breaker와 backpressure]]
