---
tags: [database, search, opensearch, lucene, inverted-index, doc-values]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
aliases: ["역색인 물리 구조", "OpenSearch Inverted Index Structures", "Lucene 자료구조"]
---

# OpenSearch 역색인 물리 구조

[[OpenSearch-Mapping-Text-Analysis]]는 저장 구조 3종(inverted index, doc_values, `_source`)의 용도를, [[OpenSearch-Architecture]]는 검색 실행 흐름을, [[OpenSearch-Indexing-Internals]]는 segment 생명주기를 다룬다. 이 문서는 그 결론들의 밑단, 즉 Lucene segment 안에서 term 하나가 어떤 자료구조를 거쳐 문서 목록이 되는지를 채운다. prefix query는 왜 싸고 선행 wildcard는 왜 비싼가, 집계는 왜 heap을 안 터뜨리는가 같은 질문의 답이 전부 여기서 나온다.

## 한 query가 만나는 물리 계층

```text
query term
  -> term index (FST, .tip)      term이 있을 법한 block 위치로 점프
  -> term dictionary (.tim)      block 안에서 term과 통계, postings 포인터 확인
  -> postings list (.doc .pos)   매칭 문서 ID, 빈도, 위치
  -> doc_values                  매칭된 문서의 field 값 (정렬, 집계)
```

| 구조 | 답하는 질문 | 물리 특성 |
|---|---|---|
| Term index (FST) | 이 term은 어느 block에 있나 | prefix 공유로 초소형, mmap으로 읽음 |
| Term dictionary | term 통계와 postings 위치 | prefix 압축된 block (기본 25~48 term) |
| Postings list | 이 term을 가진 문서들 | 128개 단위 packed block과 skip list |
| BKD tree | 이 범위의 숫자, 좌표를 가진 문서들 | leaf당 최대 512 point의 공간 분할 트리 |
| doc_values | 이 문서의 field 값 | columnar on-disk |

## Term dictionary와 FST term index

Segment의 term은 정렬된 채로 term dictionary(.tim)에 저장된다. 통째로 탐색하기엔 크므로 그 위에 term index(.tip)를 둔다. term index는 FST(finite state transducer)로, term prefix를 해당 prefix로 시작하는 term들이 담긴 on-disk block 위치로 매핑한다. FST는 공통 prefix와 suffix를 노드로 공유해 수백만 term의 인덱스를 매우 작게 압축한다.

- Term dictionary block은 기본 25~48개 term을 담고 block 내부는 공유 prefix를 한 번만 저장한다.
- FST는 term 존재 여부를 디스크 seek 없이 먼저 거를 수 있게 한다. 없는 term 조회가 싼 이유다.
- 과거에는 FST가 heap 상주였지만 Lucene 8.0에서 non-primary-key field가 mmap 기반 off-heap으로 바뀌었고 8.6부터는 항상 off-heap이다. 대신 OS page cache에 올라 heap과 무관하게 빠르다.

### prefix는 싸고 선행 wildcard는 비싼 이유

Term이 정렬돼 있고 FST가 prefix 단위로 점프하므로 `ki*`는 ki로 시작하는 term 구간만 순회하면 된다. 반면 `*ing`은 어떤 prefix로도 후보를 좁힐 수 없어 field의 전체 term dictionary를 automaton과 대조하며 순회한다. 비용이 문서 수가 아니라 고유 term 수에 비례해 커진다. 선행 wildcard가 진짜 요구라면 [[OpenSearch-Mapping-Text-Analysis]]의 `wildcard` type(2.15+)이나 색인 시 reverse된 subfield를 설계하는 편이 낫다.

## Postings list: block 인코딩과 skip list

Term 하나에 매칭되는 문서 ID 목록이 postings list다. Lucene은 이를 정렬된 delta로 바꿔 128개 정수 단위 packed block으로 인코딩하고(.doc), 128개가 안 되는 꼬리는 vInt로 저장한다. 위치 정보(.pos)도 같은 block 방식이다.

- AND 조건(intersection)은 여러 postings를 leapfrog로 교차하는데, 이때 multi-level skip list가 128 문서 block 단위로 건너뛰게 해 준다. 첫 block에는 skip data가 없고 df가 128을 넘는 term부터 만들어진다.
- Skip 항목에는 impact 메타데이터(CompetitiveFreqDelta, CompetitiveNormDelta 쌍)가 함께 저장된다. 이 block의 최대 점수 상한을 미리 알 수 있게 하는 장치로, 아래 Block-Max WAND의 재료다.

## 숫자와 geo는 왜 BKD tree인가

숫자를 역색인에 넣으면 값 하나가 term 하나가 된다. `price: [10000, 20000]` range는 그 사이 모든 고유 값 term의 postings를 전부 모아 union해야 해서 고유 값이 많을수록 폭발한다. 그래서 Lucene은 numeric, date, geo를 points(BKD tree)로 색인한다. BKD는 1~8차원 공간을 leaf당 최대 512개 point(기본값)가 될 때까지 재귀 분할한 트리로, range query가 겹치는 cell만 방문한다.

- 반대로 `keyword` term filter는 값 전체가 term 하나이므로 FST로 한 번 점프해 postings 하나만 읽으면 끝난다. exact match가 목적인 ID, 코드에 numeric보다 `keyword`가 자주 권장되는 밑단 이유다.
- 숫자 field라도 range를 거의 안 쓰고 exact filter만 쓴다면 `keyword` 병행 색인이 실무 선택지가 된다.

## doc_values: columnar on-disk

역색인은 term에서 문서로 가는 구조라 정렬과 집계처럼 문서에서 값으로 가는 접근에는 못 쓴다. doc_values는 색인 시점에 만들어지는 문서 ID 순서의 columnar on-disk 구조로, `keyword`, numeric, date에 기본 활성화된다. 디스크 파일을 mmap으로 순회하므로 정렬과 집계가 field 값 전체를 heap에 올리지 않는다. heap에 올리는 예외가 `text`의 fielddata다 ([[OpenSearch-Performance-Troubleshooting]]의 field data cache).

### Global ordinals와 refresh 직후 latency spike

`keyword`의 doc_values는 값 자체가 아니라 segment 내 정렬 순번(ordinal)을 저장한다. terms aggregation은 shard 전체에서 bucket을 합쳐야 하므로 segment별 ordinal을 shard 공통 번호로 잇는 global ordinals가 필요하다.

- Global ordinals는 기본적으로 lazy다. 즉 그것을 쓰는 첫 query 실행 시점에 빌드된다.
- Refresh나 merge로 segment 구성이 바뀌면 무효화되어 다시 빌드해야 한다. refresh가 잦은 인덱스에서 첫 terms aggregation만 유독 느린 latency spike의 원인이 대부분 이것이다.
- `eager_global_ordinals: true`(기본 false)는 빌드를 query에서 refresh 시점으로 옮긴다. 검색 p99는 안정되지만 refresh가 느려지고, field data cache에 상주하므로 heap을 쓴다. 고cardinality field는 circuit breaker 설정과 함께 판단한다.
- 검색 서비스처럼 refresh 간격을 늘려도 되는 read-heavy 워크로드에서 자주 쓰는 집계 field에만 선별 적용하는 것이 실무 기본기다.

## Immutable segment와 OS page cache

위 구조들이 전부 immutable file이라는 점이 성능의 절반이다. 파일이 안 바뀌므로 OS page cache에 올라간 내용이 무효화되지 않고, Lucene은 자체 buffer pool 없이 mmap으로 kernel에 캐싱을 위임한다.

- 같은 segment를 반복 조회하면 대부분 memory 속도로 동작한다. RDBMS의 buffer pool 역할을 OS가 대신하는 셈이다.
- 그래서 heap은 물리 메모리의 절반 이하로 잡고 나머지를 page cache에 남기라는 운영 수칙이 나온다 ([[OpenSearch-Performance-Troubleshooting]]).
- Merge가 I/O를 크게 쓰면 page cache가 밀려나 검색 latency가 흔들린다. segment 생명주기([[OpenSearch-Indexing-Internals]])와 검색 성능이 만나는 지점이다.

## Block-Max WAND와 track_total_hits

상위 k개만 필요한 검색에서 모든 매칭 문서를 채점할 필요는 없다. Block-Max WAND는 postings block마다 저장된 impact(최대 점수 상한)를 보고, 현재 top-k 최하위 점수보다 상한이 낮은 block을 채점 없이 통째로 건너뛴다.

`track_total_hits`의 기본값 10000이 여기 걸린다. 전체 hit 수를 정확히 세려면 매칭 문서를 전부 방문해야 하므로 skip이 불가능하다. 기본값에서는 10000개까지만 정확히 세고 그 뒤로는 `relation: gte`(하한)로 표시한 뒤 skip 최적화를 켠다. 즉 track_total_hits를 낮추거나 false로 하면 빨라지는 진짜 인과는 카운팅 작업 자체의 절약이 아니라 Block-Max WAND가 활성화되어 채점을 건너뛰는 것이다. `true`(정확한 전수 카운트)로 두면 이 최적화가 통째로 꺼진다. 정확한 총 건수가 UI 요구라면 count는 별도 `_count`나 cardinality 근사로 분리하는 설계를 먼저 검토한다.

## 자주 틀리는 모델

| 오해 | 실제 |
|---|---|
| FST에 모든 term이 들어 있다 | FST는 prefix에서 block 위치로 가는 index일 뿐, term 본문은 .tim block에 있다 |
| Term index는 heap을 크게 쓴다 | Lucene 8.6+에서 FST는 off-heap(mmap)이고 page cache가 감당한다 |
| 숫자도 역색인으로 검색된다 | numeric, date, geo는 BKD tree(points)를 탄다. 역색인은 text와 keyword |
| 집계는 역색인을 읽는다 | 집계와 정렬은 doc_values(columnar)를 읽는다. 역색인은 매칭까지만 |
| eager_global_ordinals는 공짜 최적화다 | 빌드 비용을 refresh로 옮기고 heap 상주를 늘리는 트레이드오프다 |
| track_total_hits를 낮추면 세는 일이 줄어 빨라진다 | 핵심은 Block-Max WAND skip이 활성화되어 채점 자체를 건너뛰는 것 |
| 선행 wildcard는 문서가 많아서 느리다 | 고유 term 수에 비례해 느리다. term dictionary 전체 순회가 원인 |

## 관련 문서

- [[OpenSearch-Mapping-Text-Analysis|매핑과 저장 구조 3종]], [[OpenSearch-Architecture|검색 실행 흐름]]
- [[OpenSearch-Indexing-Internals|segment 생명주기]], [[OpenSearch-Aggregations-Pagination|집계와 페이지네이션]]
- [[OpenSearch-Performance-Troubleshooting|cache 계층과 heap 진단]]

## 출처

- [Lucene99PostingsFormat - Apache Lucene API](https://lucene.apache.org/core/9_11_0/core/org/apache/lucene/codecs/lucene99/Lucene99PostingsFormat.html)
- [Lucene90BlockTreeTermsWriter - Apache Lucene API](https://lucene.apache.org/core/9_11_0/core/org/apache/lucene/codecs/lucene90/blocktree/Lucene90BlockTreeTermsWriter.html)
- [BKDWriter, BKDConfig - Apache Lucene API](https://lucene.apache.org/core/9_11_0/core/org/apache/lucene/util/bkd/BKDWriter.html)
- [Lazy loading Lucene FST offheap using mmap, LUCENE-8635 - Apache Lucene](https://github.com/apache/lucene/issues/9681)
- [Eager global ordinals - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/mapping-parameters/eager_global_ordinals/)
- [Doc values - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/mapping-parameters/doc-values/)
- [Search API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/search/)
- [What's new in Apache Lucene 8 - Elastic Blog](https://www.elastic.co/blog/whats-new-in-lucene-8)
