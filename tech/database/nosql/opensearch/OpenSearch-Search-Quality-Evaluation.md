---
tags: [database, search, opensearch, evaluation, relevance, ab-test]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Search Quality Evaluation", "OpenSearch 검색 품질 평가", "검색 품질 측정"]
---

# OpenSearch 검색 품질 평가

평가 체계 없는 relevance 튜닝은 감이다. Analyzer, 동의어, query, boost를 바꾼 뒤 몇 개 결과만 눈으로 보면 다른 query의 회귀를 놓친다. 변경 전후를 같은 query set, corpus와 judgment로 비교하고 실제 사용자 행동까지 확인해야 개선 여부를 판단할 수 있다. 이 문서는 그 검증 체계를 세 층으로 나눈다.

| 층 | 질문 | 도구 |
|---|---|---|
| 오프라인 평가 | 판정 기준 대비 ranking이 좋아졌나 | judgment list + rank_eval, Search Relevance Workbench |
| 온라인 지표 | 실제 사용자 행동이 좋아졌나 | UBI 수집, CTR, MRR, zero-result rate |
| 온라인 실험 | 그 개선이 variant 때문인가 | A/B 분할, interleaving |

오프라인 평가는 빠른 회귀 탐지에, 온라인 지표는 실제 경험 확인에, 온라인 실험은 변화의 원인 검증에 사용한다. 세 층은 대체 관계가 아니라 배포 전후를 잇는 하나의 평가 루프다.

## Judgment list 구축

Judgment는 query와 문서 쌍의 관련도 판정이다. 모든 오프라인 지표는 judgment 품질의 함수이므로, 지표 계산보다 judgment 구축이 먼저다.

- 명시적 judgment: 사람이 query별 상위 문서에 등급(예: 0에서 3)을 매긴다. 정확하지만 비용이 커서 head query 위주로만 커버 가능하고, 콘텐츠와 query 분포가 바뀌면 낡는다.
- Implicit judgment: 클릭 로그에서 자동 유도한다. 저렴하고 규모가 나오지만 클릭은 관련성이 아니라 관련성과 노출 위치의 곱을 반영한다.

Implicit judgment의 핵심 함정이 position bias다. 상위에 노출된 문서는 관련성과 무관하게 더 클릭된다. Search Relevance Workbench의 implicit judgment는 COEC(Clicks Over Expected Clicks) click model로 이를 보정한다. rank별 평균 CTR을 기대 클릭으로 삼고, 해당 query 문서 쌍의 실제 CTR을 기대치로 나눈다. 1보다 크면 그 rank의 평균보다 잘 클릭된 문서다. Workbench는 이 외에 LLM 기반 judgment 생성과 외부 judgment import도 지원한다.

## rank_eval API

`_rank_eval`은 query와 rating 목록을 받아 IR 지표를 계산한다. Elasticsearch에서 이어진 API로 별도 plugin 없이 사용한다.

```json
GET products/_rank_eval
{
  "requests": [
    {
      "id": "무선 키보드",
      "request": { "query": { "match": { "name": "무선 키보드" } } },
      "ratings": [
        { "_index": "products", "_id": "42", "rating": 3 },
        { "_index": "products", "_id": "17", "rating": 0 }
      ]
    }
  ],
  "metric": { "dcg": { "k": 10, "normalize": true } }
}
```

| Metric | 파라미터와 기본값 | 용도 |
|---|---|---|
| precision | `k=10`, `relevant_rating_threshold=1`, `ignore_unlabeled=false` | 상위 k 안의 관련 문서 비율 |
| mean_reciprocal_rank | `k=10`, `relevant_rating_threshold=1` | 첫 관련 문서의 역순위 |
| dcg | `k=10`, `normalize=false` | 등급과 순위 가중, `normalize=true`가 nDCG |
| expected_reciprocal_rank | `maximum_relevance` 필수, `k=10` | 다등급 판정용 ERR |

운영 포인트 세 가지.

- `metric_score`는 전체 평균이다. 평균 개선 뒤에 최악 query의 회귀가 숨으므로 응답의 query별 `details`를 함께 본다.
- `unrated_docs`가 크면 judgment 커버리지가 모자란 것이다. 이때 precision은 unlabeled를 비관련으로 세므로 실제보다 낮게 나온다. `ignore_unlabeled=true`는 반대로 낙관 편향을 만든다.
- Query set은 코드처럼 버전 관리한다. `templates`와 `template_id`로 query 구조를 한 곳에 두면 search configuration 변경 시 requests 전체를 고치지 않아도 된다.

## UBI: 행동 데이터 수집

User Behavior Insights plugin(2.15+)은 검색 행동을 표준 schema로 수집한다.

- `ubi_queries`: server side에서 plugin이 query와 응답 결과(object_id 목록)를 기록
- `ubi_events`: client side collector가 클릭, 장바구니 담기 같은 event를 기록

두 인덱스는 `query_id`로 연결된다. 이 연결이 UBI의 본질이다. 어떤 검색의 몇 번째 결과가 클릭됐는지를 추적할 수 있어야 implicit judgment와 position bias 보정이 가능해진다. 페이지뷰 로그를 아무리 쌓아도 query와 결과 위치에 연결되지 않으면 judgment로 쓸 수 없다.

## Search Relevance Workbench

Workbench(3.1+)는 query set, search configuration, judgment list, experiment 네 가지 리소스로 평가를 자동화한다. AWS 관리형 OpenSearch Service도 3.1부터 사용할 수 있다.

Query set은 UBI 데이터가 있으면 sampling으로 만든다. `random`, `topn`(최빈 query), `pptss`(빈도 비례 확률 sampling), `manual` 네 방식이며, head query만 뽑는 topn보다 pptss가 실제 트래픽 분포를 대표한다.

Experiment는 세 종류다.

| Type | 용도 |
|---|---|
| `PAIRWISE_COMPARISON` | 두 search configuration을 같은 query set으로 결과 비교 |
| `POINTWISE_EVALUATION` | 한 configuration을 judgment 대비 채점 |
| `HYBRID_OPTIMIZER` | hybrid search 파라미터 탐색, [[OpenSearch-Hybrid-Search|하이브리드 검색]] 참고 |

Pointwise 평가는 `Coverage@k`, `Precision@k`, `MAP@k`, `NDCG@k`를 계산한다. Coverage@k는 반환 문서 중 judgment가 있는 비율로, 이 값이 낮으면 나머지 지표를 신뢰할 수 없다는 신호다.

## 온라인 지표

오프라인 지표가 좋아져도 사용자가 못 느끼면 개선이 아니다. UBI 데이터 위에서 최소 세 가지를 추이로 본다.

- CTR: 검색당 클릭 비율. 절대값보다 배포 전후 추이와 segment별 비교가 의미 있다.
- MRR(온라인): 클릭된 결과의 평균 역순위. 클릭 위치가 위로 올라가면 ranking이 좋아진 것이다.
- Zero-result rate: 결과 0건 query 비율. 한국어 검색에서는 tokenizer와 동의어 사전의 구멍을 가장 먼저 드러내는 지표다. Zero-result query 목록 자체가 사전 보강의 백로그가 된다.

이 지표들은 UBI 인덱스에 대한 DSL 또는 SQL 집계로 뽑아 대시보드에 올린다. [[OpenSearch-Observability|관측성]]의 latency, 오류율 대시보드와 별개로 품질 대시보드를 두는 것이 요점이다.

## 검색 로그에서 개선 백로그까지

대시보드는 감지까지만 한다. 도메인 오너의 루프는 로그를 다음 변경의 입력으로 바꾸는 것이다.

- Zero-result query를 주기적으로(예: 주간) 뽑아 분류한다. 분류마다 가는 곳이 다르다.
  - 오타와 표기 변형: 교정과 동의어로. [[OpenSearch-Query-Understanding|쿼리 이해]]의 교정 사전 후보가 된다.
  - 사전에 없는 신조어와 도메인 용어: [[OpenSearch-Korean-Text-Analysis|사용자 사전]] 등록 후보가 된다.
  - 콘텐츠 자체가 없음: 검색팀이 아니라 상품과 콘텐츠 조직에 수요 신호로 전달한다. 검색 로그가 사업 데이터가 되는 지점이다.
  - Filter나 권한이 결과를 전부 걸러냄: query 구조와 filter 설계를 재검토한다.
- 우선순위는 빈도와 지속성의 곱이다. 한 번 나온 zero-hit이 아니라 매주 반복되는 query부터 처리한다.
- Head query 중 CTR이 낮은 목록도 같은 방식으로 뽑는다. Ranking이나 snippet 문제의 후보 목록이다.
- 반영은 한 번에 하나씩, rank_eval 회귀 확인 후 배포하고 온라인 지표를 재확인한다. 위 세 층 루프에 그대로 태운다.
- Query 로그에는 이름과 전화번호 같은 개인정보가 검색어로 들어온다. 마스킹과 보존 기간은 수집 지점인 [[OpenSearch-Search-API-Layer#API 계층에서 재는 것|검색 API 계층]]이 정본이다.

## 온라인 실험

### A/B 분할

사용자를 variant별로 나눠 일정 기간 지표를 비교한다. OpenSearch에서 variant 라우팅은 application 레이어에서 결정하고, variant별로 다른 search pipeline을 지정하거나(`search_pipeline` 요청 파라미터) search template의 버전을 나눠 query 구조를 분기한다. UBI에 variant 식별자를 함께 기록해야 사후 분석이 가능하다.

- 최소 표본을 사전에 계산한다. 검출하려는 효과 크기가 작을수록 필요 표본이 급증하며, 표본이 차기 전에 지표를 보고 중단하는 peeking은 거짓 양성을 만든다.
- Novelty effect를 감안한다. 결과가 달라진 것 자체가 초기 클릭을 끌어올릴 수 있으므로 초반 며칠의 상승은 할인해서 본다.

### Interleaving

두 ranking의 결과를 한 목록에 섞어 같은 사용자에게 보여주고 어느 쪽 출신 문서가 더 클릭되는지 센다. 사용자 간 분산이 제거된 within-user 비교라서 A/B보다 민감도가 높다. 대규모 상용 검증에서 같은 결론에 1에서 2 order 적은 트래픽으로 도달했다. 트래픽이 적은 서비스에서 ranking 비교만 필요하면 interleaving이 먼저다. 단, ranking 우열만 알려주고 CTR이 몇 % 오르는지 같은 절대 효과는 A/B가 필요하다.

### 배포 안전장치와 구분

[[OpenSearch-Vector-Search|벡터 검색]]과 [[OpenSearch-Indexing-Internals|색인 내부]]의 shadow read와 canary는 새 인덱스나 구성이 장애 없이 도는지 확인하는 배포 안전장치다. 품질 실험이 아니다. Canary가 오류율과 latency에서 통과해도 ranking이 나빠졌을 수 있고, 그것을 재는 것이 이 문서의 평가 체계다.

## 오프라인과 온라인이 갈릴 때

- 오프라인 개선, 온라인 무반응: judgment가 실제 사용자 의도와 어긋났을 가능성이 크다. 특히 명시적 judgment가 낡았거나 head query에 편중된 경우다. Implicit judgment로 교차 검증한다.
- 오프라인 무반응, 온라인 개선: 지표가 못 재는 개선(속도, snippet, UI)이거나 novelty effect다. 효과가 몇 주 뒤에도 유지되는지 본다.
- 둘 다 개선인데 매출 같은 사업 지표 악화: 클릭 유도형 결과(낚시성 제목)가 CTR을 올린 경우다. 클릭 이후 event(구매, 체류)까지 UBI로 수집해 지표를 보강한다.

갈림 자체가 신호다. 오프라인은 ranking 함수의 품질을, 온라인은 검색 경험 전체를 재므로 둘은 원래 같은 것을 재지 않는다.

## 자주 틀리는 오개념

- 클릭 수 자체를 judgment로 쓰면 안 된다. 노출 위치를 통제하지 않은 클릭 집계는 기존 ranking을 강화 학습하는 편향 루프가 된다. COEC 같은 position bias 보정이 전제다.
- nDCG가 올랐다고 배포 근거가 되지 않는다. 평균 뒤의 query별 회귀, zero-result 변화, latency budget을 함께 봐야 한다.
- rank_eval은 judgment를 만들어주지 않는다. 채점기일 뿐이고 정답지는 별도로 구축해야 한다.
- Interleaving은 A/B의 상위 호환이 아니다. 민감도는 높지만 절대 효과 크기와 ranking 외 변경(UI, latency) 평가는 못 한다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Korean-Text-Analysis|한국어 텍스트 분석]]
- [[OpenSearch-Query-Relevance|Query와 관련도]]
- [[OpenSearch-Search-Features|검색 기능과 회귀 테스트]]
- [[OpenSearch-Hybrid-Search|하이브리드 검색]]
- [[OpenSearch-Vector-Search|벡터 검색]]

## 출처

- [Ranking evaluation - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/rank-eval/)
- [User Behavior Insights - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/ubi/index/)
- [UBI index schemas - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/ubi/schemas/)
- [Search Relevance Workbench - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-relevance/using-search-relevance-workbench/)
- [Query sets - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-relevance/query-sets/)
- [Judgments - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-relevance/judgments/)
- [Evaluating search quality - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-relevance/evaluate-search-quality/)
- [Measuring and improving search quality metrics - OpenSearch Blog](https://opensearch.org/blog/measuring-and-improving-search-quality-metrics/)
- [Amazon OpenSearch Service now supports OpenSearch version 3.1 - AWS](https://aws.amazon.com/about-aws/whats-new/2025/09/amazon-opensearch-service-opensearch-version-3-1/)
- [Large-scale validation and analysis of interleaved search evaluation - Chapelle et al., ACM TOIS 2012](https://dl.acm.org/doi/10.1145/2094072.2094078)
