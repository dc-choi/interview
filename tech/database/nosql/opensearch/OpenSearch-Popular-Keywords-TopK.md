---
tags: [database, search, opensearch, redis, top-k, system-design]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
aliases: ["실시간 인기 검색어 Top-K", "Popular Keywords Top-K", "인기 검색어 설계"]
---

# 실시간 인기 검색어 Top-K 설계

최근 N분에서 몇 시간 사이의 검색 로그에서 상위 k개 검색어를 뽑는 기능이다. 시스템 디자인 면접의 고전이면서 콘텐츠 서비스에서는 메인 화면 노출, 자동완성 후보, 랭킹 신호로 이어지는 실무 기능이다. 핵심 결정은 하나다. 완전히 정확한 count는 비싸고, 인기 검색어는 순위만 맞으면 되는 근사 문제라는 것을 인정하고 어느 지점의 근사를 살지 고르는 일이다.

## 문제 정의

- 입력: 검색 요청 로그 (검색어, 사용자 식별자, 시각)
- 출력: 최근 window의 상위 k개 검색어, 보통 k는 10 내외
- 요구: window가 미끄러지듯 갱신 (sliding), 갱신 주기 수십 초에서 수 분, 순위 안정성
- 비기능: 어뷰징에 오염되지 않을 것, 검색 본 트래픽의 SLO를 해치지 않을 것

정확한 전수 count가 계약 조건인 경우는 드물다. 상위 몇 개의 순서가 그럴듯하고 급상승이 빨리 반영되면 충분한 경우가 대부분이라, 세 경로 모두 어딘가에서 근사를 택한다.

## 경로 A: OpenSearch 집계 배치

검색 로그를 시계열 인덱스로 색인하고 있다면 추가 인프라 없이 시작할 수 있는 경로다. 주기 job이 최근 window를 `range` filter로 자르고 `terms` aggregation으로 상위 후보를 뽑아 캐시에 쓴다.

```json
GET search-logs-*/_search
{
  "size": 0,
  "query": {"range": {"@timestamp": {"gte": "now-10m"}}},
  "aggs": {
    "top_keywords": {
      "terms": {"field": "keyword_norm", "size": 10, "shard_size": 100}
    }
  }
}
```

- 집계 대상은 정규화된 `keyword` field여야 한다. 분석된 `text`로 집계하면 형태소 token 단위로 쪼개진 결과가 나온다. field 설계는 [[OpenSearch-Mapping-Text-Analysis]].
- 시간대별 추이가 필요하면 `date_histogram`을 상위에 두고 그 아래 `terms`를 중첩한다. 급상승 검색어는 이전 bucket 대비 증가율로 계산한다.
- 분산 오차가 이 경로의 본질적 한계다. 각 shard가 지역 상위 후보만 coordinator에 보내므로 전역 상위가 누락될 수 있다. 기본 `size`는 10, `shard_size` 기본값은 `size * 1.5 + 10`이며, `doc_count_error_upper_bound`로 누락 term의 최대 count 상한을 확인한다. 이 오차 지표는 기본 정렬인 `_count` 내림차순에서만 의미가 있다. 상세 메커니즘은 [[OpenSearch-Aggregations-Pagination]]에 있고, 인기 검색어 맥락에서의 함의는 이것이다. 상위 10개를 노출하는데 shard 간 분포 왜곡이 의심되면 `shard_size`를 k보다 훨씬 크게 (예: 10k) 잡는 비용이 오차 감수보다 싸다.
- 신선도의 하한은 두 개다. 색인 가시성 (refresh, 기본 1초, [[OpenSearch-Indexing-Internals]])과 집계 job 주기. 실질 지연은 job 주기가 지배하므로 1분 주기면 최악 1분 이상 늦다.
- 비용: 매 실행이 window 전체를 스캔하는 집계 query다. 검색 본 트래픽과 같은 domain에서 돌면 SLO를 침식하므로, 결과를 반드시 캐시에 저장하고 사용자 요청이 OpenSearch를 직접 치지 않게 한다.

## 경로 B: Redis sorted set 실시간

검색 API가 처리될 때마다 검색어를 실시간으로 count하는 경로다. 사용자별 최근 검색 기록 ([[Redis-Search-History]])과 같은 자료구조를 전역 집계에 쓴다.

```text
# 1분 단위 bucket key에 count
ZINCRBY popular:2026071312:05 1 "여름 원피스"
EXPIRE popular:2026071312:05 3600

# 최근 10분 sliding window = bucket 10개 합산
ZUNIONSTORE popular:merged 10 popular:...:05 popular:...:04 ...
ZREVRANGE popular:merged 0 9 WITHSCORES
```

- 시간을 고정 bucket (1분)으로 쪼개고 key를 bucket별로 분리한다. window는 최근 bucket들의 `ZUNIONSTORE` 합산으로 근사한다. 진짜 연속 sliding이 아니라 bucket granularity의 계단식 window지만 인기 검색어 용도로 충분하다.
- 복잡도: `ZINCRBY`는 O(log N), `ZUNIONSTORE`는 O(N) + O(M log M)이다 (N은 입력 전체 크기, M은 결과 크기). 합산을 매 조회마다 하지 말고 주기 job이 합산해 결과 key를 캐시한다.
- 메모리는 bucket 수 x bucket당 고유 검색어 수에 비례한다. 검색어 cardinality가 폭발하는 서비스 (long-tail query가 많은 커머스)에서는 bucket TTL을 짧게 잡고, 1회성 검색어까지 다 들고 있을 필요가 없으면 주기적으로 하위 rank를 `ZREMRANGEBYRANK`로 쳐낸다.
- count 자체는 정확하다. 근사가 들어가는 지점은 window 경계 (bucket granularity)뿐이다. 지연은 초 단위로, 세 경로 중 가장 빠르다.
- 검색 API의 hot path에 쓰기가 들어가므로 Redis 장애가 검색을 막지 않도록 fire-and-forget으로 격리하고, 인기 검색어 Redis를 세션이나 캐시용 인스턴스와 분리한다.

## 경로 C: 스트림 근사 집계 개요

검색 로그가 이미 Kafka 같은 스트림으로 흐르고 규모가 단일 Redis의 메모리를 넘어서면, consumer가 count-min sketch로 근사 count를 유지하고 별도 min-heap으로 상위 k 후보만 정확히 추적하는 구조로 간다.

- count-min sketch는 폭 w, 깊이 d의 counter 행렬이다. w = ⌈e/ε⌉, d = ⌈ln(1/δ)⌉로 잡으면 추정치가 실제보다 εN 이상 크게 벗어날 확률이 δ 이하다 (N은 전체 이벤트 수). 과대 추정만 있고 과소 추정은 없다.
- 검색어가 수백만 개여도 sketch 크기는 ε, δ로만 결정되는 상수라 메모리가 cardinality와 무관하다. 이것이 sorted set 대비 본질적 이점이다.
- 실무에서는 Redis의 probabilistic 자료구조 (CMS, Top-K)나 Flink 집계로 구현한다. 단일 서비스 규모에서 이 경로를 먼저 꺼내는 것은 과설계다. 면접에서는 규모 임계 (Redis 메모리 한계, 초당 수십만 이벤트)를 넘을 때의 다음 단계로 언급하는 것이 맞다.

## 세 경로 비교

| 기준 | A: OpenSearch 집계 | B: Redis sorted set | C: 스트림 sketch |
|---|---|---|---|
| 정확도 | shard 분산 오차, shard_size로 완화 | count 정확, window만 계단식 | εN 이내 과대 추정 |
| 반영 지연 | job 주기 (분 단위) | 초 단위 | 초 단위 |
| 추가 인프라 | 없음 (로그 색인 전제) | Redis | 스트림 + consumer |
| 메모리, 비용 | window 스캔 query 반복 | 고유 검색어 수에 비례 | cardinality 무관 상수 |
| 적합 규모 | 시작점, 중소 트래픽 | 실시간 요구, 중간 규모 | 대규모, 다지역 |

실무 순서는 A로 시작해 실시간 요구가 생기면 B를 얹고, B의 메모리가 한계에 닿으면 C를 검토하는 단계 진화가 일반적이다. A와 B는 배타적이지 않다. B가 실시간 순위를 만들고 A가 시간별 추이와 백필, 검증용 정답 근사를 제공하는 병행 구성이 흔하다.

## 검색어 정규화와 어뷰징 필터

count 이전에 무엇을 같은 검색어로 볼 것인가가 순위 품질을 결정한다.

- 정규화: 앞뒤 공백 제거, 연속 공백 축약, 대소문자 통일, 유니코드 정규화 (NFC). 여기까지는 count key 생성 시 필수다.
- 형태소 수준 통합 (조사 제거, 동의어)은 신중하게 한다. 검색어 원형이 노출 문자열이기도 해서 과하게 합치면 사용자가 클릭했을 때 자기가 본 검색어와 다른 결과가 나온다. 표시용 원문과 count용 정규화 key를 분리 저장하는 것이 정석이며, 이 분리는 suggestion 문서 설계 ([[OpenSearch-Search-Features]])와 같은 원리다.
- 어뷰징: 같은 사용자 (또는 IP)의 동일 검색어 반복은 window 내 1회로 dedup한다. Redis라면 `SETNX dedup:{user}:{keyword}` + TTL을 count 앞에 둔다. 봇은 User-Agent와 rate 기반으로 로그 수집 단계에서 거른다. 노출 직전에는 금칙어와 개인정보 패턴 filter를 반드시 통과시킨다. 인기 검색어는 서비스가 직접 노출하는 문구라서 오염 시 사고가 된다.
- 운영 개입 경로를 처음부터 둔다. 특정 검색어 즉시 제외 (blocklist), 고정 노출 (pin)은 장애나 이슈 상황에서 코드 배포 없이 눌러야 한다.

## 자동완성과 랭킹 신호로 재사용

인기 검색어 파이프라인의 산출물은 노출 위젯 하나로 끝나지 않는다.

- 자동완성 후보: 집계된 인기 검색어를 suggestion index의 후보와 weight로 공급한다. 후보 생성 시의 정규화, 최소 빈도, 금칙어 filter 기준은 [[OpenSearch-Search-Features]]의 suggestion 설계와 공유한다.
- 랭킹 신호: 검색어별 인기도와 클릭 로그를 문서 field로 역공급하면 function score나 재정렬의 인기 boost 신호가 된다 ([[OpenSearch-Query-Relevance]]).
- 이 재사용 때문에 파이프라인 앞단의 정규화와 어뷰징 filter 품질이 검색 품질 전체로 전파된다. 인기 검색어가 오염되면 자동완성과 랭킹까지 같이 오염된다.

## 자주 틀리는 오개념

- terms aggregation이 항상 정확한 count를 준다: 단일 shard이거나 `shard_size`가 고유 term 수 이상일 때만 정확하다. multi-shard 기본 설정에서는 근사이며 `doc_count_error_upper_bound`가 0인지로 판단한다.
- HyperLogLog로 인기 검색어를 만든다: HLL은 고유 개수 (cardinality) 추정이지 항목별 빈도가 아니다. top-k에는 sorted set이나 count-min sketch가 맞고, HLL은 검색어별 고유 사용자 수 같은 보조 지표에 쓴다.
- sliding window는 매 요청 시각으로 정확히 잘라야 한다: bucket 합산 근사로 충분하고, 정확한 연속 window는 이벤트별 timestamp를 다 들고 있어야 해서 비용이 급증한다. 요구를 먼저 의심한다.
- 실시간이니까 무조건 Redis다: 갱신 주기가 5분이어도 되는 서비스라면 경로 A가 인프라 추가 없이 끝난다. 반영 지연 요구를 숫자로 먼저 합의하는 것이 설계의 시작이다.

## 관련 문서

- [[OpenSearch-Aggregations-Pagination|terms aggregation 분산 오차]]
- [[OpenSearch-Search-Features|suggestion과 자동완성 설계]]
- [[OpenSearch-Query-Relevance|랭킹 신호와 function score]]
- [[Redis-Search-History|Redis 최근 검색 기록]]
- [[OpenSearch-Indexing-Internals|refresh와 색인 가시성]]

## 출처

- [Terms aggregation - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/bucket/terms/)
- [Date histogram aggregation - OpenSearch Documentation](https://docs.opensearch.org/latest/aggregations/bucket/date-histogram/)
- [ZINCRBY - Redis Documentation](https://redis.io/docs/latest/commands/zincrby/)
- [ZUNIONSTORE - Redis Documentation](https://redis.io/docs/latest/commands/zunionstore/)
- [Count-min sketch - Redis Documentation](https://redis.io/docs/latest/develop/data-types/probabilistic/count-min-sketch/)
- [An Improved Data Stream Summary: The Count-Min Sketch and its Applications - Cormode, Muthukrishnan](https://dimacs.rutgers.edu/~graham/pubs/papers/cm-full.pdf)
