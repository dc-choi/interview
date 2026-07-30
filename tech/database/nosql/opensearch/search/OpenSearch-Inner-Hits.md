---
tags: [database, search, opensearch, inner-hits, nested, parent-child]
status: done
verified_at: 2026-07-30
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Inner Hits", "OpenSearch inner_hits", "OpenSearch 내부 매치"]
---

# OpenSearch inner_hits와 내부 매치 반환

`nested`, `has_child`, `has_parent` query는 관계 조건에 맞는 outer document를 top-level hit로 반환한다. 실제로 어떤 nested 객체나 parent/child document가 조건에 맞았는지는 기본 응답에서 숨겨진다. `inner_hits`를 query 안에 지정하면 이 내부 매치를 각 outer hit 아래에 함께 반환한다.

`inner_hits` 자체는 match 조건이나 outer 정렬을 바꾸는 query가 아니다. 이미 매치된 outer hit에 근거가 된 내부 hit 목록을 붙이는 응답 제어다.

## Mental model

```text
top-level hits.hits[]       outer document
  └─ inner_hits.<name>
       └─ hits.hits[]       실제로 매치된 내부 document
```

| 문맥 | Top-level hit | `inner_hits` |
|---|---|---|
| `nested` | root document | 조건에 맞은 nested 배열 원소 |
| `has_child` | parent document | 조건에 맞은 child document |
| `has_parent` | child document | 조건에 맞은 parent document |
| `collapse` | group 대표 document | 같은 collapse group의 추가 document |

앞의 세 문맥은 관계 query의 match 근거를 반환한다. `collapse.inner_hits`는 관계 match가 아니라 결과 group을 펼치는 별도 용법이다.

## Nested query 예시

`products.reviews`는 mapping에서 `nested` type이어야 한다. 일반 `object` field에는 `nested` query를 실행할 수 없다.

```json
GET products/_search
{
  "_source": ["product_name"],
  "query": {
    "nested": {
      "path": "reviews",
      "query": {
        "range": {"reviews.rating": {"gte": 4}}
      },
      "inner_hits": {
        "name": "top_reviews",
        "size": 2,
        "sort": [
          {"reviews.rating": {"order": "desc"}}
        ]
      }
    }
  }
}
```

Top-level에는 조건을 만족한 product가 나오고, 각 product의 `inner_hits.top_reviews`에는 rating 조건을 만족한 review만 나온다.

```json
"inner_hits": {
  "top_reviews": {
    "hits": {
      "total": {"value": 1, "relation": "eq"},
      "hits": [
        {
          "_nested": {"field": "reviews", "offset": 0},
          "_source": {"user": "kim", "rating": 5}
        }
      ]
    }
  }
}
```

- Nested inner hit의 `_id`는 root document와 같고, `_nested.field`와 `_nested.offset`이 원본 배열 원소를 식별한다.
- `_source`는 기본적으로 root 전체가 아니라 해당 nested 객체 범위로 반환된다.
- Score나 `sort` 때문에 반환 순서는 원본 배열 순서와 다를 수 있다. 원본 위치는 inner hit 배열 index가 아니라 `_nested.offset`으로 판단한다.

## 주요 옵션과 반환 제어

| 옵션 | 역할 |
|---|---|
| `name` | 여러 inner hit 결과를 응답에서 구분하는 고유 이름 |
| `from` | 각 outer hit의 inner 목록에서 건너뛸 수 |
| `size` | 각 outer hit에서 반환할 inner hit 수, 기본값 3 |
| `sort` | inner hit만 정렬하며 outer hit 순서에는 영향을 주지 않음 |
| `_source`, field 옵션 | inner hit별 payload와 반환 field 제어 |

`from + size`는 `index.max_inner_result_window`를 넘을 수 없으며 기본 상한은 100이다. Custom field sort를 사용하면 inner hit의 `_score`와 `max_score`가 `null`일 수 있으므로 응답의 `sort` 값을 기준으로 순서를 해석한다.

Nested `docvalue_fields`와 `stored_fields`는 top-level 요청이 아니라 `inner_hits` 내부에 지정한다. `_source` filtering, highlight와 explain도 inner hit 범위에서 설정할 수 있다. 반환 field 선택 기준은 [[OpenSearch-Search-Features#응답 필드 선택과 payload 줄이기|응답 필드 선택]]을 따른다.

## Outer score와 inner 정렬 구분

- `nested.score_mode`는 nested match 점수를 root document 점수에 합치는 방식을 정한다.
- `has_child.score_mode`는 child 점수를 parent document 점수에 반영하는 방식을 정한다.
- `has_parent.score`는 parent 점수를 child document 점수에 반영할지 정한다.
- `inner_hits.sort`는 반환할 내부 문서의 표시 순서만 정한다.

## 비용과 운영 기준

- 한 HTTP 요청으로 관계 document를 함께 받지만 계산량이 사라지는 것은 아니다.
- Outer `size`, inner hit 정의 수, 각 inner `size`와 반환 `_source`가 커질수록 fetch, 직렬화와 payload 비용이 함께 증가한다.
- 목록 화면은 outer hit와 inner hit 수를 모두 작게 두고 필요한 field만 반환한다.
- `inner_hits.hits.total`은 매치된 내부 문서 수이고 `size`는 그중 반환 수다. 정확성 판단에는 `relation`도 확인한다.
- Parent/child join은 nested보다 모델과 query 비용이 크다. Child document는 parent와 같은 shard에 있도록 parent routing을 사용해야 한다.
- 관련 document가 아니라 count나 bucket만 필요하면 `inner_hits` 대신 nested 또는 children aggregation을 사용한다.

## Collapse와 구분

`collapse.inner_hits`는 같은 collapse key를 가진 group 안에서 cheapest, newest 같은 추가 대표를 펼친다. 반환 group과 inner hit 정의마다 추가 group search가 실행되므로 `max_concurrent_group_searches`는 동시성만 제한하고 총 작업량을 줄이지 않는다.

관계 query의 match 근거가 필요하면 이 문서의 `nested`, `has_child`, `has_parent` 용법을 사용하고, 검색 결과 중복 제거와 group 확장은 [[OpenSearch-Search-Features#Collapse search|Collapse search]]를 따른다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Mapping-Text-Analysis#object, nested, flat_object|nested 매핑 선택]]
- [[OpenSearch-Query-Relevance|Query DSL과 관련도]]
- [[OpenSearch-Search-Features|응답 field와 collapse]]
- [[OpenSearch-Performance-Troubleshooting|검색 성능 진단]]

## 출처

- [Retrieve inner hits - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/inner-hits/)
- [Nested query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/joining/nested/)
- [Has child query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/joining/has-child/)
- [Has parent query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/joining/has-parent/)
- [Join field type - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/join/)
- [Retrieve specific fields - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/retrieve-specific-fields/)
- [Index settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)
- [Collapse search results - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/collapse-search/)
- [Inner hits fetch phase - OpenSearch source](https://github.com/opensearch-project/OpenSearch/blob/main/server/src/main/java/org/opensearch/search/fetch/subphase/InnerHitsPhase.java)
