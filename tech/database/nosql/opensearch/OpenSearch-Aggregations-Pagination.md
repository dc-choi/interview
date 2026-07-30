---
tags: [database, search, opensearch, aggregation, pagination, sorting]
status: done
verified_at: 2026-07-30
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Aggregations", "OpenSearch Pagination", "OpenSearch 집계와 페이지네이션", "패싯 검색"]
---

# OpenSearch 집계, 정렬, 페이지네이션

검색 hit와 집계 bucket은 분산된 shard 결과를 coordinating node가 다시 합치는 연산이다. 높은 cardinality, 깊은 페이지, 불안정한 sort key는 메모리와 정확성 문제를 함께 만든다.

## 패싯 — 집계의 대표 사용처

패싯(facet)은 현재 검색 결과를 카테고리, 브랜드 같은 속성별로 집계해 값마다 문서 수를 붙인 필터 선택지로 보여주는 검색 UI 패턴이다. 쇼핑몰 검색의 왼쪽 필터 패널이 대표 예다.

- 개수는 전체 데이터가 아니라 현재 query에 매칭된 결과 기준이다. 검색어가 바뀌면 패싯 개수도 함께 바뀐다.
- 구현은 검색 요청에 `terms` 같은 bucket aggregation을 함께 실어 hit와 속성별 count를 한 질의로 받는 것이다.
- RDB로 같은 화면을 만들려면 대개 hit 조회와 별개로 패싯 집계 질의를 한 번 더 돌린다. PostgreSQL은 `GROUPING SETS`와 CTE 조립으로 한 문장까지 줄일 수도 있지만 그 조립을 매번 직접 짜야 하고, OpenSearch는 검색 요청에 `aggs`를 얹는 것으로 끝난다. 다중 filter와 패싯을 검색과 한 질의로 조합하는 요구가 [[OpenSearch-vs-RDB-Search#도입 판단 사다리|도입 판단 사다리]] 4단의 근거로 꼽히는 이유다.
- Filter의 위치가 범위를 결정한다. Query-level `bool.filter`는 hit와 query 범위의 aggregation 후보를 함께 좁히지만 top-level `global` aggregation은 query와 무관하게 전체 문서를 집계한다. `post_filter`는 aggregation 계산 뒤 hit만 좁혀 전체 패싯 선택지를 유지한다. 특정 aggregation만 좁히려면 그 내부의 `filter`를 사용한다. 패싯이 하나이고 multi-select가 OR 의미면 `post_filter`만으로 충분하다.
- 패싯이 여러 개면 각 패싯의 개수에 나머지 패싯의 선택을 반영해야 [[Search-UX|검색 UX 설계]]가 요구하는 0건 조합 예방이 된다. 패싯마다 나머지 선택 조건을 `filter`로 감싼 하위 집계를 따로 구성하고 hit 목록에는 `post_filter`를 병용한다. 이 구성은 패싯 안 multi-select가 OR 의미일 때 기준이다. 패싯 개수와 무관하게 multi-select가 AND 의미면 자기 패싯의 선택도 `filter`에 포함해야 표시 개수와 클릭 결과가 일치하고 0건 조합이 안 남는다.
- Vector와 hybrid 경로에서는 ANN branch가 k개 후보만 만든 뒤 `post_filter`가 그중 일부를 버려 결과가 k보다 크게 적어질 수 있다. 그래도 패싯 선택 조건은 `post_filter`에 두고, ACL과 판매 가능 여부 같은 정합성 조건만 pre-filter로 올린다. 배치 기준은 [[OpenSearch-Hybrid-Search|하이브리드 검색]]의 filter 배치를 따른다.

## Aggregation 유형

- Metric: `avg`, `sum`, `min`, `max`, `stats`, `percentiles`, `cardinality`
- Bucket: `terms`, `range`, `histogram`, `date_histogram`, `filter`, `nested`
- Pipeline: `derivative`, `cumulative_sum`, `bucket_script`, `bucket_selector`, `bucket_sort`

Bucket aggregation은 다른 metric과 bucket을 하위에 중첩할 수 있다. Pipeline aggregation은 앞 단계 결과가 만들어진 뒤 실행되므로 `bucket_selector`로 결과를 줄여도 상위 계산량은 줄지 않는다.

## 집계용 필드

- `keyword`, numeric, date의 `doc_values`를 사용한다.
- 분석된 `text`는 원문이 아니라 token으로 나뉜다.
- `text`에 `fielddata: true`를 켜면 token을 heap에 올려 메모리 압박이 커진다.
- 원문 단위 집계는 `.keyword` multi-field를 사용한다.
- 집계 hit가 필요 없으면 `size: 0`으로 fetch를 줄인다.

## `terms` aggregation의 분산 오차

각 shard는 상위 후보 bucket만 coordinator에 보낸다. 전역 상위 bucket이 어떤 shard에서는 지역 상위 후보에 들지 못하면 count가 정확하지 않을 수 있다.

- 기본 `size`는 10이다.
- `shard_size`를 늘리면 정확도가 개선될 수 있지만 network와 heap 비용이 늘어난다.
- 기본 `_count: desc` 정렬에서 `doc_count_error_upper_bound`를 확인한다. `show_term_doc_count_error: true`면 bucket별 상한도 볼 수 있다.
- `sum_other_doc_count`는 응답에서 제외된 bucket의 document count 합이다.
- Concurrent segment search가 활성화된 상태에서는 `shard_size`가 segment slice 수준에 적용되어 추가 count 오차가 생길 수 있다.
- Count 오름차순으로 희귀 term을 찾지 말고 `rare_terms`를 검토한다.
- 모든 고유 bucket을 순회하려고 큰 `size`를 한 번에 요청하지 않는다.

## Composite aggregation

Composite는 여러 source key 조합을 정렬된 bucket으로 만들고 `after_key`로 다음 페이지를 제공한다. 대량 bucket export에 적합하다.

```json
GET events/_search
{
  "size": 0,
  "aggs": {
    "by_day_and_type": {
      "composite": {
        "size": 500,
        "sources": [
          {"day": {"date_histogram": {"field": "created_at", "calendar_interval": "day"}}},
          {"type": {"terms": {"field": "event_type"}}}
        ]
      }
    }
  }
}
```

다음 요청은 마지막 bucket key를 추측하지 말고 응답의 `after_key`를 그대로 `after`에 넣는다. Index sort가 composite source와 같은 순서면 더 효율적일 수 있지만 색인 비용과 불변 설정을 감수해야 한다.

## Cardinality

`cardinality`는 HyperLogLog++ 기반의 근사 distinct count다.

- `precision_threshold`를 높이면 임계 범위의 정확도가 좋아지지만 메모리를 더 쓴다.
- 정확한 과금과 정산 count의 근거로 바로 쓰지 않는다.
- 정확성이 필수면 원본 데이터에서 별도 계산하거나 허용 오차를 계약한다.

## Bucket 폭발 방어

- 고카디널리티 field의 다단계 nested aggregation을 제한한다.
- `search.max_buckets`는 안전망이지 목표값이 아니다.
- Request circuit breaker trip은 큰 aggregation을 줄이라는 신호다.
- 사용자 입력으로 arbitrary group-by depth와 size를 허용하지 않는다.
- 반복되는 `size: 0` 집계는 request cache hit와 invalidation을 관찰한다.

## Sorting

- 기본 full-text 검색은 `_score` 내림차순이다. 일반 field sort에서는 score를 계산하지 않으므로 필요할 때만 `track_scores: true`를 사용한다.
- `sort` 배열은 앞 field부터 우선순위를 적용하고, 값이 같을 때만 다음 field를 비교한다.
- Field sort는 `keyword`, numeric, date의 `doc_values`를 사용한다.
- 분석된 `text`는 정렬할 수 없으므로 `keyword` multi-field를 사용한다.
- Multi-value field의 기본 mode는 오름차순 `min`, 내림차순 `max`다. Numeric field는 `avg`, `sum`, `median`도 지원하므로 의도한 mode를 명시한다.
- 값이 없는 문서는 기본적으로 마지막에 오며, `missing`으로 `_first`, `_last` 또는 대체값을 지정할 수 있다.
- Nested field 정렬에는 `nested.path`가 필요하다.
- 여러 인덱스 중 field가 unmapped이면 기본적으로 정렬이 실패한다. 필요한 경우 실제 mapping과 호환되는 `unmapped_type`을 지정해 값 없음으로 처리한다.
- `_id`는 sort key로 쓰지 말고 별도 `keyword` 식별자를 둔다.
- 동점이 가능한 sort에는 마지막 tie-breaker로 고유하고 불변인 필드를 넣는다.

## Pagination 방식 비교

| 방식 | 일관성 | 적합한 경우 | 주요 비용 |
|---|---|---|---|
| `from`, `size` | live data 기준 | 얕은 페이지와 임의 점프 | 깊을수록 shard별 앞 결과를 버림 |
| Scroll | 고정 search context | batch export | context 자원, 사용자 페이지에는 부적합 |
| `search_after` | stateless live cursor | 무한 스크롤 | 변경 중 중복과 누락 가능 |
| PIT와 `search_after`, 2.4 이상 | 고정된 segment view | 일관된 deep pagination | segment와 파일 자원 유지 |

### `from`, `size`

- 기본 result window는 10,000이다.
- 9,990번째부터 10개를 받으려면 각 shard가 앞 후보까지 수집한 뒤 대부분을 버린다.
- 색인과 삭제가 진행되면 페이지 사이에 중복과 누락이 생길 수 있다.

### Scroll

- 첫 요청 시점의 결과를 query에 묶인 search context로 고정해 앞으로만 순회한다. 사용자 페이지보다 대량 batch export에 적합하다.
- 빈번한 사용자 페이지네이션은 `sort`와 `search_after`를 사용하고, 일관된 deep pagination은 PIT를 함께 쓴다.
- `scroll` 유지 시간은 한 batch 처리에 충분한 정도로 두고, 다음 요청에는 응답의 최신 `_scroll_id`를 전달한다.
- 완료하거나 오류로 중단하면 Clear Scroll API로 context를 명시적으로 닫는다. context가 만료되면 기존 scroll을 이어갈 수 없다.

### `search_after`

- 첫 페이지와 같은 query와 sort를 사용한다.
- 이전 페이지 마지막 hit의 `sort` 배열을 그대로 전달한다.
- `search_after` 값의 개수와 순서는 sort 정의와 정확히 같아야 한다.
- Sort 값이 같은 문서가 많으면 고유 tie-breaker가 필요하다.
- 순차 이동에는 적합하지만 임의 페이지 점프에는 맞지 않는다.

### PIT와 `search_after`

PIT와 `search_after`는 deep pagination의 우선 선택지다. PIT는 query에 묶이지 않은 고정 dataset을 제공해 앞뒤 페이지를 일관되게 조회할 수 있지만, 하나의 순회에서는 query와 sort를 유지해야 cursor 의미가 보존된다.

1. `POST /<target_indexes>/_search/point_in_time?keep_alive=...`로 PIT를 만들고 응답의 `pit_id`를 보관한다.
2. Index 경로 없는 `GET /_search`에 query, 안정적인 sort와 `pit.id`를 전달한다. 활성 순회 중에는 `pit.keep_alive`로 짧게 수명을 연장한다.
3. 다음 페이지도 같은 query, sort와 `pit.id`를 유지하고 마지막 hit의 sort 값을 `search_after`로 전달한다.
4. 작업이 끝나면 Delete PIT API로 PIT를 명시적으로 닫는다.

PIT는 query 결과 자체가 아니라 생성 시점의 Lucene segment view를 잠근다. 이후 merge된 segment의 사본도 수명 동안 유지하므로 너무 긴 `keep_alive`와 많은 동시 PIT는 공간 회수를 늦춘다.

`allow_partial_pit_creation`의 기본값은 `true`다. 완전한 snapshot이 필요하면 `false`로 만들거나 생성 응답의 `_shards.failed`를 검사한다. 운영에서는 `point_in_time.max_keep_alive`, `search.max_open_pit_context`, 열린 PIT 목록과 CAT PIT segments로 수명, 개수와 disk 사용량을 확인한다.

PIT가 만료되거나 node 또는 cluster 장애로 context가 사라지면 기존 cursor로 같은 snapshot을 이어갈 수 없다. 새 PIT를 열고 페이지네이션을 다시 시작해야 한다.

## Async search와 Rollup

- Async search는 긴 query를 background에서 실행하고 ID로 상태와 partial result를 조회하게 한다.
- Client 연결과 timeout 처리는 단순해지지만 query의 CPU, heap과 disk 비용이 줄어드는 것은 아니다.
- 동시 실행 수, 최대 실행 시간과 결과 보존 기간을 제한하고 필요 없는 작업은 취소한다.
- Rollup은 지정한 dimension과 metric을 더 거친 시간 bucket의 새 요약 index에 저장한다.
- 과거 dashboard 집계와 저장 비용에는 유리하지만 포함하지 않은 field와 원본 document detail은 복원할 수 없다.
- Source와 rollup target의 겹치는 기간을 함께 집계하면 이중 계산할 수 있으므로 query 범위와 alias를 분리한다.
- Rollup target에는 raw document와 rollup document를 섞지 않고 rollover가 끝난 시계열 index부터 적용한다.

## 관련 문서

- [[OpenSearch-Query-Relevance|Query DSL과 score]]
- [[OpenSearch-Mapping-Text-Analysis|집계용 field 설계]]
- [[OpenSearch-Performance-Troubleshooting|검색 성능 진단]]
- [[OpenSearch-vs-RDB-Search|RDB vs 검색엔진 도입 판단]]
- [[OpenSearch-Hybrid-Search|하이브리드 검색의 filter 배치]]

## 출처

- [Aggregations - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/)
- [Global aggregation - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/bucket/global/)
- [Implementing faceted search in OpenSearch - OpenSearch Documentation](https://docs.opensearch.org/latest/tutorials/faceted-search/)
- [Filter search results - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/filter-search/)
- [Table Expressions (GROUPING SETS) - PostgreSQL Documentation](https://www.postgresql.org/docs/current/queries-table-expressions.html)
- [WITH Queries (Common Table Expressions) - PostgreSQL Documentation](https://www.postgresql.org/docs/current/queries-with.html)
- [Filtering vector search results - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/filter-search-knn/index/)
- [Hybrid search with post-filtering - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/post-filtering/)
- [Terms aggregation - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/bucket/terms/)
- [Composite aggregation - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/bucket/composite/)
- [Cardinality aggregation - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/metric/cardinality/)
- [Paginate results - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/paginate/)
- [Point in Time - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/point-in-time/)
- [Point in Time API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/point-in-time-api/)
- [Sort results - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/sort/)
- [Asynchronous search - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/async/)
- [Index rollups - OpenSearch Documentation](https://docs.opensearch.org/latest/im-plugin/index-rollups/index/)
- [Concurrent segment search - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/concurrent-segment-search/)
