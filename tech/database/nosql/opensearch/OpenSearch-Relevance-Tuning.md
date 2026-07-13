---
tags: [database, search, opensearch, relevance, function-score, rescore, ltr]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Relevance Tuning", "OpenSearch 관련도 튜닝", "Learning to Rank 판단"]
---

# OpenSearch 관련도 튜닝 실전

이 문서는 [[OpenSearch-Query-Relevance|렉시컬 검색과 BM25 기본]]을 이해하고 본문 관련도가 안정된 뒤 보는 다음 단계다. BM25의 작동 방식, bool 구조, 기본 개선 순서는 반복하지 않고, 인기도와 최신성 같은 비즈니스 신호의 결합, 비싼 재정렬의 적용 범위, 수동 boost를 LTR로 넘기는 판단을 다룬다.

## BM25 vs TF-IDF

BM25의 TF saturation, 길이 정규화, `k1`과 `b`의 의미는 [[OpenSearch-Query-Relevance#BM25 mental model|BM25 mental model]]을 전제로 한다. 여기서는 classic TF-IDF와 비교했을 때의 선택 이유만 남긴다.

| 판단 축 | Classic TF-IDF | BM25 |
|---|---|---|
| 반복 증거 | 완화해도 계속 증가 | 한계 효용을 포화시킴 |
| 길이 보정 | 고정 방식 | 컬렉션 평균 대비 상대 길이를 `b`로 조절 |

Lucene은 6.0에서 기본 similarity를 classic TF-IDF에서 BM25로 교체했고 OpenSearch는 BM25를 기본으로 사용한다. 실무 판단의 핵심은 같은 term의 과도한 반복이 순위를 독점하지 않게 하고, field 길이 특성에 맞춰 보정 강도를 조절할 수 있다는 점이다. 절대 score가 기대와 다르다는 이유만으로 similarity부터 바꾸지 말고 analyzer, query 구조와 평가 query set을 먼저 검증한다.

## function_score 실전

`function_score`는 query가 매치한 문서마다 함수 점수를 계산해 원래 `_score`와 결합한다.

### field_value_factor — 인기도

```json
{"field_value_factor": {"field": "view_count", "factor": 0.5, "modifier": "log1p", "missing": 0}}
```

- `factor` 기본 1. `modifier`는 `log`, `log1p`, `log2p`, `ln`, `ln1p`, `ln2p`, `reciprocal`, `square`, `sqrt`, `none`.
- 조회수처럼 분포 꼬리가 긴 값은 `log1p`로 눌러야 한다. 그대로 곱하면 초대형 히트작이 본문 관련도를 전부 덮는다. 값이 0인 문서 때문에 `log` 대신 `log1p`, 누락 field는 `missing`으로 방어한다.

### decay 함수 — 최신성

`gauss`, `exp`, `linear` 세 곡선. 콘텐츠 서비스라면 개봉일이나 등록일 field에 건다.

- `origin`: 기준점. date field는 생략 시 `now`.
- `offset`: 이 거리까지는 점수 1 유지. 기본 0.
- `scale`: 필수. `origin + offset`에서 `scale`만큼 더 멀어진 지점의 점수가 `decay`.
- `decay`: 기본 0.5.

곡선 선택 기준: `gauss`는 기준점 근처가 완만하다가 멀어지면 급감 (최신작 며칠 차이는 비슷하게 취급), `exp`는 초반부터 급감 (뉴스처럼 신선도가 지배적), `linear`는 셋 중 유일하게 유한 거리에서 점수가 정확히 0이 되는 hard cutoff다 (0 도달점은 `offset + scale/(1-decay)`, 기본 decay 0.5면 scale의 2배 지점).

### 결합 — score_mode, boost_mode, 상한

| 설정 | 결정하는 것 | 옵션 | 기본 |
|---|---|---|---|
| `score_mode` | 함수들끼리 어떻게 합치나 | `multiply`, `sum`, `avg`, `first`, `max`, `min` | `multiply` |
| `boost_mode` | 함수 결과와 query `_score`를 어떻게 합치나 | `multiply`, `replace`, `sum`, `avg`, `max`, `min` | `multiply` |

- 함수마다 `weight`를 곱해 신호별 비중을 조절한다. `filter`를 함수에 붙이면 특정 조건 문서에만 적용된다.
- `max_boost`는 함수 점수 총합의 상한이다. 기본 상한이 float 최대값이라 사실상 무제한이므로 명시해야 의미가 있다. 상한을 두는 이유: 비즈니스 신호는 본문 관련도의 배율이어야지 대체물이 아니다. 상한 없이 인기도가 폭주하면 검색어와 무관한 인기작이 1페이지를 채우는 전형적 사고가 난다.

## script_score의 비용과 사용 조건

`script_score`는 Painless script로 임의 수식을 계산한다.

- 매치된 모든 문서에서 script가 실행된다. query phase 비용이 문서 수에 비례해 커지고 결과는 query cache 대상이 아니다.
- `doc['field'].value`로 doc_values만 읽고, `params`로 상수를 밖으로 빼서 script compile cache가 재사용되게 한다.
- 사용 조건: 내장 함수(`field_value_factor`, decay)로 표현 불가능한 수식일 때만. 그마저도 전 문서가 아니라 아래 rescore 안에 넣어 top-N으로 제한하는 편이 낫다. 색인 시점에 미리 계산해 field로 박을 수 있으면 그것이 항상 가장 싸다.

## rescore — top-N 2단계 재정렬

`rescore`는 1차 query가 뽑은 결과 중 shard별 상위 `window_size`개만 비싼 query로 다시 점수를 매긴다.

- `window_size` 기본 10. shard 단위이므로 실제 재정렬 폭은 shard 수의 배수다. 인덱스 설정 `index.max_rescore_window` 기본 10000이 상한.
- `query_weight`와 `rescore_query_weight` 기본 각 1.0, `score_mode`는 `total`(합산)이 기본이고 `multiply`, `avg`, `max`, `min` 선택 가능.
- `_score` 내림차순 외의 명시적 sort와는 함께 쓸 수 없다. 페이지네이션 중 `window_size`를 바꾸면 페이지 간 순위가 뒤틀린다.
- rescore를 여러 개 체이닝하면 앞 단계 결과를 다음 단계가 재정렬하는 파이프라인이 된다.

**function_score 대신 rescore를 고르는 기준**: function_score는 매치된 전체 문서에 실행되므로 신호가 싸고(단순 field 읽기) 전체 순위에 영향을 줘야 할 때 쓴다. phrase 근접도, script 수식, LTR 모델처럼 비싸지만 상위권 정밀도만 좌우하는 신호는 rescore로 top-N에 가둔다. 1차 recall은 싼 query가, 상위 precision은 비싼 query가 담당하는 2단계 구조다.

## 콘텐츠 검색 시나리오 예시

제목 매치(BM25) 위에 인기도와 최신성을 배율로 결합하고 상한을 건다.

```json
GET contents/_search
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "filter": [{"term": {"status": "PUBLISHED"}}],
          "must": [{"multi_match": {"query": "사용자 검색어", "fields": ["title^3", "description"]}}]
        }
      },
      "functions": [
        {"field_value_factor": {"field": "view_count", "factor": 0.5, "modifier": "log1p", "missing": 0}},
        {"gauss": {"released_at": {"origin": "now", "scale": "90d", "offset": "30d", "decay": 0.5}}, "weight": 2}
      ],
      "score_mode": "sum",
      "boost_mode": "multiply",
      "max_boost": 3
    }
  }
}
```

읽는 법: 인기도(log 압축)와 최신성(개봉 30일까지는 감쇠 없음, 이후 90일 scale의 gauss, weight 2)을 더한 값이 최대 3배까지만 BM25 점수를 증폭한다. 관련 없는 인기작은 애초에 `must`를 못 넘고, 관련도가 비슷한 후보들 사이에서만 비즈니스 신호가 순서를 가른다.

## Learning to Rank로 넘어가는 판단

수동 boost 튜닝의 한계: 신호가 3~4개를 넘으면 weight 조합이 폭발하고, 한 query 유형을 고치면 다른 유형이 깨지는 두더지 잡기가 시작된다. weight가 전역 상수라 query마다 최적 비중이 다르다는 사실을 표현할 수 없다.

LTR로 넘어갈 조건 세 가지가 모두 갖춰졌을 때다.

1. **판단 데이터**: 클릭, 전환 로그나 사람 평가로 judgment list(query별 문서 등급, 예: 0~4)를 만들 수 있다.
2. **feature 후보**: BM25 field 점수, 인기도, 최신성 등 문서와 query의 신호가 이미 정의돼 있다.
3. **평가 체계**: 모델이 수동 튜닝보다 나아졌는지 잴 offline 지표가 돌아간다.

LTR plugin 흐름 (AWS OpenSearch Service 지원, Elasticsearch는 7.7 이상 요구):

```text
PUT _ltr (.ltrstore 생성)
  -> feature set 정의 (mustache 템플릿 query 목록)
  -> judgment list + sltr/ltr_log로 feature 값 로깅
  -> 클러스터 밖에서 XGBoost 또는 RankLib로 학습 (LambdaMART 등)
  -> _createmodel로 모델 업로드
  -> 검색 시 rescore 안의 sltr query로 top-N 재정렬
```

모델 학습은 클러스터 밖에서 일어나고, 서빙은 결국 rescore 구조다. 즉 LTR은 위 2단계 재정렬의 rescore query를 사람이 조합한 수식에서 학습된 모델로 바꾸는 것이지 검색 구조 자체를 바꾸는 것이 아니다.

## 자주 틀리는 오개념 교정

- BM25가 TF-IDF와 전혀 다른 계열이라는 오해: BM25도 TF와 IDF 개념 위에 있다. 차이는 포화와 길이 보정 방식이지 재료가 아니다.
- `boost_mode: replace`로 비즈니스 점수만 남기면 편하다는 발상: 본문 관련도를 버리는 것이므로 검색이 아니라 정렬이 된다. 그 요구라면 `sort`가 맞다.
- rescore가 전체 결과를 재정렬한다는 오해: shard별 `window_size`개뿐이다. window 밖 문서는 rescore 점수가 아무리 높아도 올라올 수 없다.
- LTR을 켜면 튜닝이 끝난다는 기대: judgment 품질과 feature 설계가 전부이고, 학습과 재배포 루프를 계속 돌려야 한다.

튜닝이 실제로 나아졌는지의 검증(offline 지표, A/B, judgment 관리)은 [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가]]로 위임한다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Query-Relevance|렉시컬 검색, Query DSL과 관련도]]
- [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가]]
- [[OpenSearch-Hybrid-Search|벡터와 하이브리드 검색]]
- [[OpenSearch-Performance-Troubleshooting|검색 성능 진단]]

## 출처

- [Function score - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/compound/function-score/)
- [Rescore - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/rescore/)
- [Learning to Rank - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/ltr/index/)
- [Learning to Rank for Amazon OpenSearch Service - AWS](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/learning-to-rank.html)
- [Keyword search and BM25 - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/keyword-search/)
- [BM25 vs Lucene Default Similarity - Elastic Blog](https://www.elastic.co/blog/found-bm-vs-lucene-default-similarity)
- [BM25 The Next Generation of Lucene Relevance - OpenSource Connections](https://opensourceconnections.com/blog/2015/10/16/bm25-the-next-generation-of-lucene-relevation/)
