---
tags: [cs, search, information-retrieval, vector-space-model, bag-of-words, cosine-similarity]
status: done
category: "CS - 자료구조"
aliases: ["Vector Space Model", "Sparse Lexical Vector Search", "벡터 공간 검색 모델", "희소 렉시컬 벡터"]
---

# 벡터 공간 모델과 코사인 유사도 검색

벡터 공간 모델(Vector Space Model)은 문서와 질의를 같은 term 공간의 벡터로 표현하고 두 벡터의 유사도로 문서 순위를 정하는 렉시컬 검색 모델이다. 각 축은 vocabulary의 term이고 값은 해당 term의 binary, TF 또는 TF-IDF weight다. 대부분의 축이 0이므로 희소 벡터다.

여기서 vector는 embedding model이 만든 dense semantic vector와 다르다. 단어가 정확히 겹쳐야 같은 축에서 내적에 기여하며, 동의어나 문맥의 의미가 자동으로 가까워지지 않는다.

## 세 개념을 분리한다

| 개념 | 담당하는 질문 | 대표 구현 |
|---|---|---|
| 역색인 | 어떤 문서를 후보로 읽을까? | `term -> posting list` |
| Term weighting | 한 term을 얼마나 중요하게 볼까? | binary, TF, TF-IDF |
| 벡터 공간 scoring | 질의와 문서의 관련도를 어떻게 합칠까? | dot product, cosine similarity |

세 개념은 함께 쓸 수 있지만 같은 것은 아니다. 문서별 단어 수만 저장하고 모든 문서를 순회해 cosine을 계산할 수도 있고, 역색인으로 후보를 제한한 뒤 TF-IDF cosine을 계산할 수도 있다.

## 문서와 질의를 같은 희소 공간에 놓기

Vocabulary가 `[redis, search, cache]`라면 각 document와 query를 같은 순서의 좌표로 표현한다.

```text
document 1: "redis search search" -> [1, 2, 0]
document 2: "redis cache"         -> [1, 0, 1]
query:      "redis search"        -> [1, 1, 0]
```

실제로 0을 포함한 긴 array를 만들 필요는 없다. `term -> weight` map으로 non-zero 좌표만 저장한다.

```text
doc_id -> {term: weight}  # document vector, forward representation
term   -> [(doc_id, weight), ...]  # posting, inverted representation
```

두 표현은 목적이 다르다. 전자는 한 문서의 벡터를 읽기 쉽고, 후자는 query term이 있는 후보 문서만 찾기 쉽다.

## 코사인 유사도

두 벡터의 내적을 각 벡터의 L2 norm으로 나누면 크기를 정규화하고 방향을 비교할 수 있다.

```text
dot(q,d) = Σ q_t * d_t
||x||₂   = sqrt(Σ x_t²)
cos(q,d) = dot(q,d) / (||q||₂ * ||d||₂)
```

일반 벡터의 cosine 범위는 `-1`부터 `1`이다. Term count와 TF-IDF처럼 weight가 음수가 아닌 bag-of-words에서는 `0`부터 `1` 범위다. 어느 한 벡터의 norm이 0이면 cosine은 정의되지 않으므로 검색 구현에서는 보통 0점 또는 결과 없음으로 처리한다.

앞의 예제에서는 다음 순서가 나온다.

```text
cos(query, document 1) = 3 / (sqrt(2) * sqrt(5)) ≈ 0.949
cos(query, document 2) = 1 / (sqrt(2) * sqrt(2)) = 0.5
```

Document 1은 두 query term을 모두 가지며 `search` 비중도 높아 query와 더 비슷한 방향을 가리킨다. 점수는 확률이 아니라 같은 weighting과 analyzer 안에서 순서를 비교하는 값이다.

## 전체 scan에서 역색인 기반 계산으로

가장 단순한 구현은 `doc_id -> term count map`을 만든 뒤 query마다 모든 document와 cosine을 계산한다. 이 구조는 이름을 index라고 붙여도 term에서 candidate를 찾는 역색인은 아니다.

문서 수를 `D`, query의 non-zero term 수를 `|q|`, 문서별 non-zero term 수를 `|d|`라 하자. Document norm까지 매번 다시 계산하는 전체 scan은 대략 다음 비용이 든다.

```text
scoring: O(Σ_d (|q| + |d|))
전체 M개 match 정렬: O(M log M)
```

Document vector와 norm을 색인 시 계산하고 query vector와 norm도 한 번만 만들면 중복 계산을 줄일 수 있다. 그래도 모든 `D`개 document를 확인하는 비용은 남는다.

역색인을 사용하면 query term의 posting에 등장한 document만 accumulator에 더한다.

```text
for each term t in query:
  for each (doc_id, document_weight) in postings[t]:
    score[doc_id] += query_weight[t] * document_weight

for each candidate doc_id:
  score[doc_id] /= query_norm * document_norm[doc_id]

return top K with a min-heap
```

핵심 비용은 모든 document 수보다 query term posting의 길이 합과 candidate 수에 가까워진다. Candidate가 `C`개라면 bounded heap의 top K 선택은 `O(C log K)`다. 같은 query의 순위만 필요하면 `query_norm`은 모든 document에 공통이라 생략할 수 있지만, query 간 score 비교나 threshold에는 포함해야 한다. 흔한 term의 긴 posting은 여전히 비싸며, 실제 검색엔진은 skipping, pruning과 top K 최적화를 추가한다.

## Weighting과 문서 길이

| Weight | 성질 | 한계 |
|---|---|---|
| Binary | term 존재만 반영 | 반복 강도를 잃음 |
| Raw TF | 반복 횟수를 그대로 반영 | 흔한 term의 식별력이 과대평가됨 |
| TF-IDF | document 내부 빈도와 corpus 희소성을 결합 | 길이와 TF 포화를 별도로 설계해야 함 |

TF-IDF는 하나의 고정 공식이 아니라 weighting family다. Raw 또는 log-scaled TF, smoothed IDF와 query/document별 weighting 조합을 명시해야 같은 이름의 점수를 재현할 수 있다. Query와 document 양쪽에 `TF*IDF`를 적용하면 dot product의 term별 기여는 `TF_q*TF_d*IDF²`가 된다. 오류는 아니지만 IDF를 한 번만 넣는 비대칭 scheme과 다른 점수다.

### TF-IDF로 문서별 핵심 term 추출하기

Query 없이도 각 document의 non-zero term을 TF-IDF로 정렬해 corpus 안에서 그 문서를 잘 구분하는 top K term을 뽑을 수 있다. 이는 query-document relevance scoring이 아니라 document 내부의 keyword extraction이다.

```text
TF_relative(t,d) = count(t,d) / |d|
IDF_classic(t)   = log(N / DF(t))
IDF_smooth(t)    = log((N + 1) / (DF(t) + 1)) + 1  # 양수로 offset한 예시
importance(t,d)  = TF(t,d) * IDF(t)
```

IDF 변형은 이름과 식을 함께 기록한다. `log(N / (1 + DF))`처럼 denominator에만 1을 더하면 `DF=N`에서 음수가 되므로 단순한 division-by-zero 방어와 동작이 다르다. 현재 document에서 관측한 term을 평가하는 경로라면 `DF>=1`이므로 고전식의 분모가 0이 되지 않는다.

한 document 안에서는 `|d|`가 모든 term에 같은 상수라 relative TF가 raw count의 순서를 바꾸지 않는다. 실제 구분력은 IDF와 analyzer에서 온다. 높은 점수는 해당 corpus에서 희소하다는 뜻이지 의미적으로 중요한 단어라는 보장은 아니다. 작은 corpus, boilerplate, 대소문자, stopword와 표제어 처리가 결과를 크게 바꾼다.

구현은 document마다 `Counter(term)`를 한 번 만들고 corpus 전체의 `DF(term)`를 한 번 집계한 뒤 unique term만 scoring한다. Term마다 document와 corpus를 다시 순회하지 않고, bounded heap과 고정된 secondary key로 deterministic top K를 선택한다. `N`, DF와 analyzer version이 바뀌면 결과도 바뀌므로 keyword 집합과 통계 version을 함께 관리한다.

Cosine normalization은 문서 전체를 같은 비율로 복제해 vector 크기만 커지는 효과를 제거한다. 반면 query와 무관한 term이 추가되면 document 방향이 달라지고 norm도 커져 점수가 낮아질 수 있다. 따라서 긴 문서가 항상 불리하다기보다 관련 내용이 문서의 다른 주제에 희석될 수 있다고 해석하는 편이 정확하다.

문서를 chunk로 나누면 희석을 줄일 수 있지만 retrieval 단위가 바뀐다. Chunk 경계, overlap, 원문 단위 결과 병합과 snippet 생성까지 함께 설계해야 한다. BM25는 TF saturation과 field 길이 normalization을 모델 안에서 다루는 별도의 lexical ranking 방식이다.

Bag-of-words vector는 term 순서를 버린다. 같은 단어를 다른 순서로 배치한 문장은 동일한 vector가 될 수 있으므로 phrase와 proximity 검색에는 position 정보가 필요하다. Vector scoring 자체가 Boolean query를 금지하지는 않는다. Posting의 교집합과 합집합으로 candidate 조건을 적용한 뒤 scoring을 분리한다.

## 희소 렉시컬 vector와 dense embedding

| 구분 | 희소 렉시컬 vector | Dense embedding |
|---|---|---|
| 축 | 사람이 정의한 vocabulary term | model이 학습한 latent dimension |
| 차원과 0 비율 | 매우 고차원, 대부분 0 | 비교적 낮은 고정 차원, 대부분 non-zero |
| 일치 신호 | 정확히 겹치는 term | 학습된 의미와 문맥의 근접성 |
| 대표 후보 탐색 | inverted index | exact kNN, HNSW, IVF |
| 대표 실패 | 동의어와 표현 차이 | model drift, 설명하기 어려운 오탐 |

둘 다 cosine이나 dot product를 사용할 수 있지만 vector를 만드는 과정과 적합한 index가 다르다. 같은 vector라는 단어만 보고 lexical retrieval과 semantic retrieval을 같은 구조로 취급하지 않는다.

## 교육용 Python 구현의 경계

- Python 2의 `has_key`, `iteritems`, `raw_input`과 print statement는 현재 Python 문법으로 바꿔야 한다.
- `split(' ')`과 lowercase만으로는 Unicode, 문장부호, 연속 공백과 언어별 tokenization을 처리하지 못한다.
- Query vector와 norm은 query마다 한 번, document norm은 indexing 시 한 번 계산해 저장한다.
- Document ID가 `0..N-1`로 연속이라고 가정하지 않고 실제 key를 순회한다.
- 전체 결과 정렬보다 score가 양수인 candidate에 크기 `K`의 heap을 사용한다.

## 설계 체크리스트

- Index와 query가 같은 analyzer와 vocabulary contract를 사용하는가?
- Raw TF, TF-IDF와 다른 weighting 중 선택 이유가 있는가?
- Zero vector와 unknown term query를 어떻게 처리하는가?
- Document norm을 미리 계산하고 update 시 함께 교체하는가?
- 전체 scan이 허용되는 corpus인지, posting 기반 candidate generation이 필요한지 측정했는가?
- Chunk 결과를 원문 단위로 합칠 때 중복과 score를 어떻게 처리하는가?

## 관련 문서

- [[Inverted-Index-and-TF-IDF|역색인과 TF-IDF]]
- [[OpenSearch-Query-Relevance#BM25 mental model|TF-IDF와 BM25]]
- [[OpenSearch-Mapping-Text-Analysis-Analyzer|Analyzer와 tokenization]]
- [[OpenSearch-Relevance-Tuning#피드백을 점수 feature로 바꾸기|피드백 기반 검색 랭킹]]
- [[Vector-Similarity-Search|Dense embedding vector 유사도 검색]]
- [[Recommendation-System-Modeling-Foundations#벡터, 내적과 코사인|추천 모델의 내적과 코사인]]
- [[자료구조(DataStructure)|자료구조 인덱스]]

## 출처

- [Building a Vector Space Indexing Engine in Python — Ben E. C. Boyter](https://boyter.org/2010/08/build-vector-space-search-engine-python/)
- [Tutorial: Finding Important Words in Text Using TF-IDF — Steven Loria](https://stevenloria.com/tf-idf/)
- [Scoring, term weighting and the vector space model — Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/html/htmledition/scoring-term-weighting-and-the-vector-space-model-1.html)
- [Document and query weighting schemes — Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/html/htmledition/document-and-query-weighting-schemes-1.html)
- [Dot products — Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/html/htmledition/dot-products-1.html)
- [Computing vector scores — Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/html/htmledition/computing-vector-scores-1.html)
- [scikit-learn Documentation, TfidfTransformer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfTransformer.html)
