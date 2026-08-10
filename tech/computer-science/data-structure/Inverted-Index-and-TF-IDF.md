---
tags: [cs, data-structure, search, inverted-index, tf-idf, redis]
status: done
verified_at: 2026-08-08
category: "CS - 자료구조"
aliases: ["Inverted Index and TF-IDF", "Redis Inverted Index Search", "역색인과 TF-IDF 구현"]
---

# 역색인과 TF-IDF를 Redis 집합 연산으로 구현하기

역색인은 `term → 그 term을 포함한 document 목록`으로 읽기 방향을 뒤집은 자료구조다. Redis Set과 Sorted Set으로 이 관계를 직접 만들면 posting list, document frequency와 점수 합산이 실제 명령으로 드러난다.

이 방식은 검색엔진의 원리를 익히거나 작고 경계가 명확한 corpus에 단순 검색을 붙일 때 유용하다. 일반적인 전문 검색을 Redis 자료구조만으로 다시 만드는 권장안은 아니다. Analyzer, phrase position, 관련도, 분산 검색과 색인 정합성을 모두 직접 소유해야 하기 때문이다.

원문의 코드는 Python 2와 초기 redis-py, standalone Redis를 전제로 한 역사적 예제다. `self.connection` 오타와 현재와 다른 `ZADD` 호출 형식도 있어 그대로 실행하는 production recipe가 아니라 알고리즘 설명으로 읽어야 한다.

## 데이터 모델

```text
원문 document
  -> 같은 analyzer로 term 추출
  -> term별 posting Sorted Set
       member = document ID
       score  = 해당 document의 정규화된 TF
  -> 검색 시 posting들을 가중 합산
  -> score 내림차순으로 top K 반환
```

| Key 예시 | 자료구조 | 역할 |
|---|---|---|
| `idx:docs` | Set | 색인된 document ID, `SCARD`가 corpus 크기 `N` |
| `idx:term:<term>` | Sorted Set | member는 document ID, score는 `TF(term, document)` |
| `idx:doc:<id>:terms` | Set | 삭제와 재색인을 위해 document가 가진 term을 기록 |
| `idx:tmp:<request-id>` | Sorted Set | 질의별 합산 점수를 잠시 물질화할 때만 사용 |

원문 payload는 이 구조에 자동으로 저장되지 않는다. 별도 document key나 원장 DB에서 조회하고, 역색인은 다시 만들 수 있는 검색 projection으로 취급한다.

## 분석 계약이 먼저다

색인과 질의가 같은 규칙으로 term을 만들어야 posting을 찾을 수 있다.

- Unicode 정규화, 대소문자, 구두점과 언어별 tokenization을 정한다.
- Stopword, stemming과 동의어는 corpus와 품질 지표로 선택한다. 무조건 제거하거나 확장하지 않는다.
- 사용자 입력을 그대로 key 이름에 붙이지 않고 길이와 cardinality를 제한하거나 안전하게 encode한다.
- Phrase 검색이 필요하면 token position을 별도로 저장해야 한다. 단순 Sorted Set posting만으로는 단어 순서와 거리를 알 수 없다.

2010년 예제의 `[a-z0-9']` 정규식과 고정 영어 stopword 목록은 원리 설명용이다. 한국어와 다국어 검색에는 그대로 사용할 수 없다.

## 색인

문서에서 stopword 제거 후 남은 term 수를 `|d|`, term `t`의 출현 횟수를 `count(t,d)`라 하면 단순 정규화 TF는 다음과 같다.

```text
TF(t,d) = count(t,d) / |d|
```

개념적인 색인 명령은 다음과 같다.

```redis
SADD idx:docs doc-42
ZADD idx:term:redis 0.04 doc-42
ZADD idx:term:search 0.02 doc-42
SADD idx:doc:doc-42:terms redis search
```

여러 `ZADD`를 pipeline으로 보내면 명령마다 RTT를 지불하지 않는다. Pipeline은 전송 최적화이지 원자성 보장이 아니다. 중간 실패에도 전체 document posting이 함께 반영되어야 한다면 작은 동일 hash slot 작업은 transaction이나 script를 검토하고, 큰 색인은 version prefix와 재처리 가능한 job으로 전환한다.

## 검색과 TF-IDF 점수

각 query term에 대해 전체 문서 수와 posting 크기로 IDF를 구한다.

```text
N       = SCARD(idx:docs)
DF(t)   = ZCARD(idx:term:<t>)
IDF(t)  = log(N / DF(t))
score(d,q) = Σ TF(t,d) × IDF(t)
```

`DF=0`인 term은 건너뛴다. Smoothing 없는 식에서는 모든 문서에 등장한 term의 IDF가 0이 되어 순위에 기여하지 않는다.

`ZUNIONSTORE`는 입력 Sorted Set의 score에 `WEIGHTS`를 곱한 뒤 같은 member의 값을 `SUM`으로 합친다. 각 posting의 TF에 query 시 계산한 IDF를 곱하면 위 식을 그대로 실행할 수 있다.

```redis
ZUNIONSTORE idx:tmp:req-7 2 idx:term:redis idx:term:search WEIGHTS 1.7 2.3 AGGREGATE SUM
EXPIRE idx:tmp:req-7 30
ZRANGE idx:tmp:req-7 0 9 REV WITHSCORES
UNLINK idx:tmp:req-7
```

임시 key는 고유해야 하고 즉시 짧은 TTL을 걸어 process crash 때도 회수되게 한다. Redis 6.2 이상에서는 `ZUNION ... WITHSCORES`로 결과 key 없이 직접 받을 수 있지만 union 전체가 client로 넘어오므로 결과가 클 때의 top K 해결책은 아니다.

`ZUNIONSTORE`는 destination을 덮어쓰며 기존 TTL도 제거하므로 `EXPIRE`는 반드시 STORE 뒤에 실행한다. STORE와 EXPIRE 사이의 client crash까지 막아야 한다면 모든 key가 같은 hash slot인 범위에서 `MULTI/EXEC`로 묶는 방법을 검토한다. 또한 `N`, 각 `DF`와 posting을 순서대로 읽는 동안 색인이 바뀔 수 있으므로 이 점수는 강한 snapshot이 아니라 검색 시점의 근사치다.

`ZUNIONSTORE`의 시간복잡도는 입력 원소 수 합을 `E`, 결과 원소 수를 `M`이라 할 때 `O(E) + O(M log M)`이다. Common term의 거대한 posting과 넓은 OR query는 Redis command latency와 임시 메모리를 함께 늘린다.

## Boolean query는 집합 대수다

| 검색 의미 | Redis 연산 | 주의점 |
|---|---|---|
| OR | `ZUNION`, `ZUNIONSTORE` | 후보가 넓어지고 기본 점수는 합산 |
| AND | `ZINTER`, `ZINTERSTORE` | 모든 posting에 있는 document만 남음 |
| NOT | `ZDIFF` 또는 Set의 `SDIFF` | 기준 후보 집합을 먼저 정의해야 함 |
| Boost | `WEIGHTS` | query별 가중치를 명시적으로 관리 |
| 구조화 filter | synthetic term posting | `status:active`, `has_url` 같은 token을 별도 색인 |

기본 weighted union은 OR 검색이다. 반복된 query term을 dictionary 하나로 합치면 query term frequency는 반영되지 않는다. Phrase, field별 boost, minimum-should-match와 tie-break 규칙도 별도 설계가 필요하다.

## 수정과 삭제

수정 문서를 새 term에 `ZADD`만 하면 본문에서 사라진 term의 이전 posting이 남는다. 안전한 재색인은 다음 경계를 가져야 한다.

1. `idx:doc:<id>:terms`에서 이전 term 목록을 읽는다.
2. 이전 term posting마다 document ID를 `ZREM`한다.
3. 새 본문을 분석해 새 posting과 term 목록을 기록한다.
4. 실패를 재시도할 수 있도록 source version과 작업 상태를 남긴다.

비트랜잭션 pipeline 도중 일부 명령만 반영될 수 있으므로 document 수, forward term set과 posting을 주기적으로 대조하는 reconciliation이 필요하다. 대규모 rebuild는 새 prefix에 완성한 뒤 읽기 alias 역할의 version key를 전환하는 편이 단건 in-place 수정의 긴 불일치 구간을 줄인다.

## 운영 한계

| 경계 | 발생하는 문제 |
|---|---|
| 메모리 | 고유한 `term-document` 쌍마다 posting entry가 생겨 corpus와 vocabulary가 커질수록 증가 |
| Big key | 흔한 term의 Sorted Set과 큰 union이 command 실행 시간을 점유 |
| 임시 결과 | 요청 중단 시 누수, 동시 query 수만큼 추가 메모리 사용 |
| Eviction | posting 일부만 축출되면 조용히 누락되므로 일반 cache key와 같은 임의 eviction 정책이 위험 |
| 품질 | 단순 TF-IDF에는 BM25의 TF saturation과 길이 보정, phrase와 analyzer 생태계가 없음 |
| 관측성 | zero-result, posting 크기, union latency, 메모리와 정합성 오차를 직접 측정해야 함 |

일반적인 Redis Open Source에서는 검색 working set과 동시 임시 결과가 RAM에 머문다. Payload 외 key와 object metadata, allocator overhead까지 `MEMORY USAGE`와 부하 시험으로 실측한다. Posting을 원장에서 재구축할 수 없다면 임의 eviction으로 일부 term만 사라지지 않도록 전용 instance, `noeviction`, persistence와 복구 절차를 함께 설계한다.

Redis Cluster의 multi-key union과 intersection은 모든 입력과 destination key가 같은 hash slot에 있어야 한다. 하나의 hash tag로 전체 index key를 모으면 명령은 실행되지만 한 slot에 집중되어 수평 분산 이점이 사라진다. Term별로 분산하면 application이 shard별 후보를 수집하고 global top K를 다시 병합해야 한다. 이 지점부터는 분산 검색엔진의 coordinator를 직접 만드는 문제다.

## 무엇을 선택할까

| 요구 | 적합한 선택 |
|---|---|
| 역색인과 점수 계산 학습, 작은 bounded corpus, 단순 custom token | Redis Set과 Sorted Set 직접 구현 |
| Redis Hash/JSON의 전문 검색, field filter, aggregation과 vector search | Redis Search의 Query Engine |
| 다국어 analyzer, BM25, phrase, 복잡한 Query DSL과 독립적인 분산 검색 계층 | OpenSearch 같은 전용 검색엔진 |

Redis Search는 core Sorted Set을 조합하는 구현이 아니라 자체 최적화된 index와 query execution engine을 사용한다. DIY 구현의 장점은 구조가 투명하고 domain token을 자유롭게 추가할 수 있다는 점이다. 그 자유가 analyzer, ranking, consistency, memory와 cluster merge를 모두 소유할 가치가 있을 때만 선택한다.

## 설계 체크리스트

- Corpus의 document 수, term 수와 `term-document` 쌍의 상한을 추정했는가?
- 색인과 query analyzer가 같은 term 공간을 만드는가?
- Update와 delete가 이전 posting을 빠짐없이 제거하는가?
- Pipeline 부분 실패와 eviction 뒤 index를 검증하고 재구축할 수 있는가?
- Common term query의 p95/p99 latency와 임시 메모리를 측정했는가?
- Redis Cluster에서 multi-key 연산과 global top K를 어떻게 처리할지 정했는가?

## 관련 문서

- [[자료구조(DataStructure)|자료구조 인덱스]]
- [[Vector-Space-Model-and-Cosine-Similarity|벡터 공간 모델과 코사인 유사도]]
- [[Redis-Data-Structures|Redis Set과 Sorted Set]]
- [[Redis-Architecture#Pipeline vs Transaction|Pipeline과 Transaction의 경계]]
- [[Redis-Cluster-Sharding|Redis Cluster hash slot]]
- [[OpenSearch-Basics#역색인의 실물|OpenSearch 역색인 예시]]
- [[OpenSearch-Query-Relevance#BM25 mental model|TF-IDF와 BM25]]
- [[OpenSearch-Inverted-Index-Structures|Lucene 역색인 물리 구조]]
- [[Trie-and-Autocomplete|Trie와 prefix 검색]]

## 출처

- [Building a search engine using Redis and redis-py — Josiah Carlson](https://www.dr-josiah.com/2010/07/building-search-engine-using-redis-and.html)
- [Redis sorted sets — Redis Documentation](https://redis.io/docs/latest/develop/data-types/sorted-sets/)
- [ZUNIONSTORE — Redis Documentation](https://redis.io/docs/latest/commands/zunionstore/)
- [Redis pipelining — Redis Documentation](https://redis.io/docs/latest/develop/using-commands/pipelining/)
- [EXPIRE and UNLINK — Redis Documentation](https://redis.io/docs/latest/commands/expire/), [UNLINK](https://redis.io/docs/latest/commands/unlink/)
- [Redis Cluster multi-key operations — Redis Documentation](https://redis.io/docs/latest/develop/using-commands/multi-key-operations/)
- [Redis Search — Redis Documentation](https://redis.io/docs/latest/develop/ai/search-and-query/)
- [Redis Search technical overview — Redis Documentation](https://redis.io/docs/latest/develop/ai/search-and-query/administration/overview/)
