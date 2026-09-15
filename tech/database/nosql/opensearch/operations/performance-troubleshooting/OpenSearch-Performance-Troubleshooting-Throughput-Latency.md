---
tags: [database, search, opensearch, performance, troubleshooting, monitoring]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
---

# OpenSearch 색인 처리량과 검색 latency

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

- `nested`는 내부 객체를 별도 Lucene document처럼 저장하고 parent-child `join`은 비용이 큰 joining query다. 관계 의미가 필요하면 사용하되 읽기 비중이 높고 갱신 fan-out을 감수할 수 있을 때 역정규화를 비교한다. 구조 선택 기준은 [[OpenSearch-Entity-Relationship-Search|개체 관계 검색 모델링]]을 따른다.
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

## 출처

- [OpenSearch Documentation, Tuning for indexing speed](https://docs.opensearch.org/latest/tuning-your-cluster/performance/)
- [AWS Documentation, OpenSearch Service quotas](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html)

## 관련 문서

- [[OpenSearch-Performance-Troubleshooting|OpenSearch 성능 진단과 장애 대응]]
- [[OpenSearch-Performance-Troubleshooting-Baseline|성능 기준선과 운영과 닮은 benchmark]]
- [[OpenSearch-Performance-Troubleshooting-Resource-Limits|cache, thread pool, breaker와 backpressure]]
- [[OpenSearch-Performance-Troubleshooting-Diagnostics|진단 API, slow log와 증상별 가설]]
