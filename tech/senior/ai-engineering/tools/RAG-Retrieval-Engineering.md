---
tags: [senior, ai, rag, retrieval, search]
status: done
verified_at: 2026-07-21
category: "시니어역량(SeniorEngineer)"
aliases: ["RAG Retrieval Engineering", "RAG 검색 엔지니어링", "RAG", "Hybrid Search"]
---

# RAG 검색 엔지니어링 (RAG Retrieval Engineering)

RAG(Retrieval-Augmented Generation)의 품질은 검색 하나가 아니라 **retrieval → context 구성 → generation → 근거 검증**의 연쇄로 결정된다. 검색이 관련 근거를 놓치면 생성기가 복원하기 어렵고, 근거를 잘 찾았어도 context packing이나 생성 단계에서 잘못 사용할 수 있다. 따라서 장애를 한 점수로 뭉개지 않고 층별로 분해해 진단한다.

## 품질을 분해하는 평가 모델

| 층 | 확인할 질문 | 대표 측정 |
|---|---|---|
| Retrieval | 필요한 근거를 후보에 넣었나 | Recall@k, nDCG@k, context relevance |
| Context 구성 | 관련 근거를 중복과 단절 없이 모델에 전달했나 | 근거 coverage, 중복률, token 사용량 |
| Generation | 질문에 정확하고 유용하게 답했나 | answer relevance/correctness, task success |
| Faithfulness | 답변의 claim이 제공한 근거로 지지되나 | claim-level support, citation correctness/completeness |
| End-to-end | 실제 사용자가 과업을 끝냈나 | 성공률, 오류/거부율, latency, 비용 |

RAGAS와 ARES 같은 연구도 retrieval context의 관련성, 답변 관련성, faithfulness를 서로 다른 차원으로 평가한다. LLM judge는 빠른 회귀 탐지 수단이지만 고위험 도메인에서는 표본 human review와 calibration을 함께 둔다.

## 청킹 전략: 고정 길이의 한계

가장 단순한 청킹은 문서를 N 토큰 단위로 자르는 고정 길이 방식이다. 구현은 쉽지만 표, 이미지, 그래프처럼 한 청크를 넘어가는 구조를 끊어버린다. 표 상단 헤더와 하단 데이터가 다른 청크로 갈리면 둘 다 의미를 잃는다.

대안은 문서 구조 기반 청킹이다. 제목, 섹션, 본문의 위치를 인식해 의미 단위로 자른다. 어떤 방식이든 `document_id`, `chunk_id`, 원문 span, 문서 version을 보존해야 검색 결과에서 원문 근거까지 돌아갈 수 있다.

| 방식 | 기준 | 약점 |
|---|---|---|
| 고정 길이 | N 토큰마다 절단 | 표, 그래프, 논리 단위가 청크 경계에서 깨짐 |
| 구조 기반 | 제목, 섹션, 문단 경계 | 파서 구현 비용, 비정형 문서엔 전처리 필요 |

PDF, 스캔본 같은 비정형 문서는 청킹 전에 OCR과 layout parsing으로 텍스트, 표, 읽기 순서를 복원한다. Chunk 크기와 overlap은 정답이 아니라 corpus별 변수다. 대표 질문에서 retrieval recall과 context token 비용을 함께 비교한다.

## 하이브리드 검색: 벡터 + BM25

벡터 검색은 의미 유사도와 표현 변형에 강하지만, 사용 모델과 데이터에 따라 주문번호 `A1234`, 모델명 `SM-G998N` 같은 정확 식별자를 안정적으로 구분하지 못할 수 있다.

BM25를 병행해 정확 token match를 보완하고 RRF나 score normalization으로 후보를 합친다. Hybrid가 항상 우월하다고 가정하지 말고 lexical, dense, hybrid를 같은 judgment로 비교한다. 상위 후보의 precision이 중요하면 query-document pair를 함께 보는 reranker를 별도 단계로 둔다.

| 검색 | 강점 | 약점 |
|---|---|---|
| 벡터(임베딩) | 의미, 패러프레이즈, 동의어 | 주문번호, 코드, 고유명사 리터럴 |
| BM25(키워드) | 정확 토큰 매칭 | 표현이 다르면 못 잡음 |

두 결과를 점수 융합(예: RRF)해 단일 랭킹으로 합친다. 검색 엔진 레벨의 BM25, kNN 메커니즘은 [[OpenSearch]] 참고.

## 쿼리 재구성과 재탐색

1차 검색이 부족하면 query를 분해하거나 표현을 바꿔 재탐색할 수 있다. 단 무제한 재시도는 latency와 비용을 키우고 처음 의도를 변형한다. 최대 횟수, 종료 조건, query rewrite 전후 결과와 선택 근거를 기록하고, 대표 query set에서 단발 검색보다 실제로 나은지 검증한다.

## Progressive Disclosure 탐색

문서 전체를 한 번에 컨텍스트에 밀어넣지 않는다. 폴더 구조와 메타데이터만 먼저 컨텍스트로 주고, 에이전트가 tool-calling으로 매 턴 탐색 방향을 스스로 정한다. 코딩 에이전트가 디렉터리를 훑고 필요한 파일만 열어보는 패턴과 같다.

- 필요한 만큼씩만 로드 → 토큰 절약, 노이즈 감소
- 검색된 문서의 인접 문서를 자동 탐색해 끊긴 맥락을 보완
- 단발 검색이 아니라 다단계 탐색 세션으로 동작

[[Context-Engineering]]의 Select, Isolate 원칙이 검색 단계에 적용된 형태다.

## 계층적(Hierarchical) RAG

평면 청크 풀에서 top-k를 뽑는 방식은 문서 간 위계와 문서 내 구조를 잃을 수 있다. 문서 → 섹션 → 청크 또는 요약 → 상세 계층을 두면 상위 후보를 좁힌 뒤 하위 근거를 찾을 수 있다. 그러나 상위 단계가 틀리면 하위 근거 전체를 놓치고 추가 lookup 비용도 든다. 계층적 검색은 corpus 구조와 질문 유형이 이를 정당화할 때 flat retrieval과 recall, latency를 비교해 선택한다.

## 구조화 조회와 검색의 라우팅

주문 상태, 재고, 가격처럼 정답이 구조화 시스템에 있는 질문은 원장을 tool/API로 조회하고, 정책 설명이나 문서 근거는 retrieval로 찾는다. 엔티티 추출은 어느 조회를 호출할지 돕지만 추출 오류와 권한 검사를 함께 다뤄야 한다. 모든 비정형 지식을 구조화하겠다는 목표보다 질문 유형별 `lookup`, `retrieve`, `hybrid` 라우팅이 현실적이다. [[Production-Agent-Architecture]]의 조회 우선순위와 같은 결이다.

## 도메인 사전: 구축 vs 미택

용어 사전은 약어와 도메인 명칭의 vocabulary gap을 줄일 수 있지만, 잘못된 동의어는 precision을 해치고 tenant별 관리 비용을 만든다. Zero-result와 reformulation 로그에서 반복되는 gap부터 작은 사전으로 검증한다. 효과가 운영 비용보다 작으면 hybrid retrieval이나 query rewrite로 보완하되, 이 대안도 같은 평가 set으로 비교한다.

## Context packing과 근거 추적

Retriever의 top-k를 그대로 prompt에 붙이지 않는다. 중복 청크를 제거하고, 끊긴 정의나 표는 인접 span을 보강하며, token budget 안에서 relevance와 source 다양성을 고려해 context를 배치한다. Retrieval score는 생성 근거의 진실 확률이 아니라 후보 선택 신호다.

근거 추적은 답변 형식이 아니라 데이터 계약이다. Retrieval부터 `source_id`, `document_id`, `chunk_id`, 원문 span과 version을 보존하고, 생성된 각 핵심 claim을 citation에 연결한다. XML이나 JSON 태그는 이 연결을 직렬화할 뿐 근거 지지를 보장하지 않는다. 후처리에서 citation이 실제 span을 가리키는지, 그 span이 claim을 지지하는지 검사하고, 지지 근거가 없으면 claim을 제거하거나 거부한다([[LLM-Abstention]]).

## 배포 전 평가 루프

1. 고정 query set에 필요한 source와 passage judgment를 만든다.
2. Retrieval 설정별 Recall@k, nDCG@k와 latency를 비교한다.
3. 같은 retrieved context로 generator만 바꿔 answer correctness와 faithfulness를 분리한다.
4. Citation correctness/completeness와 unsupported claim 비율을 claim 단위로 확인한다.
5. Offline gate를 통과한 조합만 shadow 또는 A/B로 보내 task success, 거부율, p95/p99와 비용을 본다.

Corpus, embedding, chunker, reranker, prompt와 model version을 함께 기록해야 회귀 원인을 재현할 수 있다.

## 면접 포인트

Q. RAG 품질이 낮을 때 어디부터 보나?
- 실패한 query를 retrieval miss, context 구성 손실, generation 오류, unsupported claim으로 분류한다. Retrieval부터 확인하되 거기서 진단을 끝내지 않는다.

Q. 벡터 검색만으로 부족한 이유는?
- 주문번호, 모델명 같은 정확 식별자에 약하다. BM25를 병행해 의미는 벡터가, 식별자는 키워드가 맡게 하고 점수를 융합한다.

Q. RAG를 더 고도화한다면?
- 먼저 층별 평가와 provenance 계약을 세운다. 그다음 오류 유형에 따라 hybrid/rerank, 구조화 lookup, 계층 검색, citation validator를 선택한다.

Q. 도메인 사전은 무조건 만드는 게 좋은가?
- 아니다. 멀티테넌트에서 용어 다양성이 크면 관리 비용이 효과를 넘는다. 운영 복잡성 대비 효과로 판단하고, 안 만드는 선택도 설계다.

## 관련 문서
- [[Context-Engineering|컨텍스트 엔지니어링 (Select, Isolate — 검색 단계 토큰 경제학)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (구조화 조회, Metric Registry, 조회 우선순위)]]
- [[OpenSearch|OpenSearch (BM25, kNN 벡터 검색 엔진 메커니즘)]]
- [[Vector-Similarity-Search|벡터 유사도 검색 (임베딩, HNSW, 거리)]]
- [[pgvector|pgvector (PostgreSQL 벡터 검색)]]
- [[LLM-Eval-Strategy|LLM 평가 전략 (검색 품질을 어떻게 측정하나)]]

## 출처
- [Ragas: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217)
- [ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems — NAACL 2024](https://aclanthology.org/2024.naacl-long.20/)
- [Enabling Large Language Models to Generate Text with Citations — ALCE](https://arxiv.org/abs/2305.14627)
- [Rerank processor — OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-pipelines/rerank-processor/)
- [AI ENGINEER NIGHT Q&A 총정리 — 채널톡 Tech](https://tech.channel.io/ko/articles/4052f1f4)
- [LLM 에이전트 실무 사례 (리트리벌 스킬, RankJ 근거 태깅) — 개발 컨퍼런스 (YouTube)](https://www.youtube.com/watch?v=wEVPnYOuAf8&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew)
