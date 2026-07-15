---
tags: [database, search, opensearch, aggregation, pagination, sorting]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Aggregations", "OpenSearch Pagination", "OpenSearch 집계와 페이지네이션"]
---

# OpenSearch 집계, 정렬, 페이지네이션

검색 hit와 집계 bucket은 분산된 shard 결과를 coordinating node가 다시 합치는 연산이다. 높은 cardinality, 깊은 페이지, 불안정한 sort key는 메모리와 정확성 문제를 함께 만든다.

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
- OpenSearch 3.0 이상에서 concurrent segment search가 활성화되면 `shard_size`가 segment slice에도 적용되어 추가 count 오차가 생길 수 있다.
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

- 기본 검색은 `_score` 내림차순이다.
- Field sort는 `keyword`, numeric, date의 `doc_values`를 사용한다.
- `text`는 `.keyword`로 정렬한다.
- Multi-value field는 `min`, `max`, `avg`, `median` 등 sort mode를 명시한다.
- 여러 인덱스를 함께 검색하면 `unmapped_type`을 검토한다.
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

### `search_after`

- 첫 페이지와 같은 query와 sort를 사용한다.
- 이전 페이지 마지막 hit의 `sort` 배열을 그대로 전달한다.
- Sort 값이 같은 문서가 많으면 고유 tie-breaker가 필요하다.
- 순차 이동에는 적합하지만 임의 페이지 점프에는 맞지 않는다.

### PIT와 `search_after`

1. Point in Time을 열고 짧은 `keep_alive`를 지정한다.
2. PIT ID와 안정적인 sort로 첫 페이지를 검색한다.
3. 마지막 hit의 sort 값을 `search_after`로 전달한다.
4. 작업이 끝나면 PIT를 명시적으로 닫는다.

PIT는 query 결과 자체가 아니라 Lucene segment view를 유지한다. 너무 긴 `keep_alive`와 많은 동시 PIT는 삭제된 segment의 공간 회수를 늦춘다.

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

## 출처

- [Aggregations - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/)
- [Terms aggregation - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/bucket/terms/)
- [Composite aggregation - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/bucket/composite/)
- [Cardinality aggregation - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/metric/cardinality/)
- [Paginate results - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/paginate/)
- [Point in Time - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/point-in-time/)
- [Sort results - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/sort/)
- [Asynchronous search - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/async/)
- [Index rollups - OpenSearch Documentation](https://docs.opensearch.org/latest/im-plugin/index-rollups/index/)
