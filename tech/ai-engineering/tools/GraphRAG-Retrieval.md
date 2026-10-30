---
tags: [ai, rag, graph, retrieval, bedrock, neptune]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["GraphRAG 검색", "Graph RAG Retrieval"]
---

# GraphRAG 검색

GraphRAG는 개체와 관계를 검색에 활용해 생성 모델에 제공할 근거를 확장하는 방식이다. 문서에서 추출한 그래프뿐 아니라 이미 구축된 도메인 그래프도 사용할 수 있다. 여기서는 Amazon Bedrock Knowledge Bases의 관리형 구성과 기존 그래프 위의 검색 설계를 구분한다. 모든 GraphRAG 구현이 같은 검색 절차를 쓰는 것은 아니다.

## 벡터 검색 뒤 관계를 따라간다

벡터 검색은 질문과 의미가 가까운 청크를 찾는다. 여러 문서에 나뉜 사실을 연결해야 하는 질문에서는 가까운 청크만으로 필요한 근거가 모이지 않을 수 있다.

Bedrock의 GraphRAG는 초기 벡터 검색으로 찾은 청크와 연결된 노드나 청크 식별자를 조회하고, 그래프를 순회해 추가 청크의 내용을 가져온다. 이 문맥을 생성 모델에 제공한다. 예를 들어 제품 설명에서 출발해 그 제품의 부품과 공급 관계 문서를 함께 찾는 흐름을 설계할 수 있다.

관계가 검색됐다는 사실은 그 관계가 참이라는 증거가 아니다. 모델이 추출한 관계는 원문 근거와 함께 검토해야 한다.

## 색인과 검색은 별도 파이프라인이다

| 단계 | 역할 | 확인할 점 |
|---|---|---|
| 문서 수집 | 원문을 청크와 임베딩으로 변환 | 문서 버전과 청크 위치 보존 |
| 그래프 구성 | 모델로 개체, 사실과 관계 추출 | 동명이인이나 동명 제품의 잘못된 연결 |
| 후보 검색 | 벡터 검색으로 출발점 선택 | 필요한 근거가 초기 후보에 있는지 |
| 관계 확장 | 연결된 청크를 추가 조회 | 무관한 관계, 권한 밖 문서의 유입 |
| 답변 생성 | 모은 근거를 모델 입력으로 구성 | 인용이 실제 주장을 뒷받침하는지 |

표의 확인 항목은 적용 시 설계 점검 기준이다. 그래프가 자동 생성돼도 추출 오류, 갱신과 접근 권한의 책임이 없어지지는 않는다.

## Bedrock 관리형 구성의 경계

2026-10-07 공식 문서 기준으로 그래프와 벡터 저장소는 Amazon Neptune Analytics이며, 데이터 소스는 Amazon S3를 지원한다. 그래프 구성 옵션의 사용자 정의와 Neptune Analytics 그래프의 자동 크기 조절은 지원하지 않는다.

지식 베이스를 만든 뒤 데이터를 처음 동기화하고, 원문 변경을 반영할 때도 동기화 절차를 실행한다. 생성형 AI가 관계를 추출한다는 설명을 S3 변경의 즉시 검색 반영으로 해석하지 않는다. 공식 생성 절차는 별도 문서 API를 통한 직접 수집 경로도 안내하므로 실제 채택한 경로의 완료 상태를 확인한다.

계층적 청킹을 선택해도 GraphRAG 검색 결과는 자식 청크이며 부모 청크로 자동 교체되지 않는다. 부모 문맥이 필요한 질문은 검색 결과에 그 문맥이 있는지 확인한다.

지식 베이스 삭제는 기반 그래프를 자동 삭제하지 않는다. 정리 시 지식 베이스와 그래프를 별도 자원으로 확인하고, 남은 그래프의 비용을 점검한다.

## 기존 그래프에서는 시작점과 경로를 따로 고른다

기존 온톨로지에서는 관련 시작점을 찾은 뒤 경로를 확장한다. 검색 개선과 그래프 구축 품질은 별개다.

- **후보 제한:** Beam Search에서 착안해 홉마다 상위 경로만 확장하면 탐색 폭은 줄지만, 버린 경로의 근거를 놓칠 수 있다.
- **경로 점수:** 질문 관련도를 중심으로 최신성, 도메인 중요도와 선호하는 노드 유형 순서를 보조 신호로 둔다. `path_preference`는 토스증권 사례의 사용자 정의 파라미터이며 Neo4j 표준 옵션이 아니다.
- **결과 계약:** 엔티티와 함께 발견 경로를 반환해 연결을 추적한다. 경로 존재와 원문 근거의 신뢰성은 별도로 검증한다.

### Cypher 실행계획으로 확장 비용을 확인한다

2026-10-30 Neo4j 공식 문서 기준, 조기에 필터를 적용하고 필요한 속성만 반환하며 가변 길이 패턴에 상한을 두는 것이 기본 최적화 방향이다. 홉별 후보 제한과 별개로 확장 자체의 비용도 확인한다.

- `EXPLAIN`은 실행하지 않고 예상 계획을 보여준다. `PROFILE`은 쿼리를 실제 실행하므로 쓰기 쿼리는 데이터를 바꿀 수 있고 측정 부하도 발생한다.
- 인덱스 사용 여부, `Estimated Rows`와 실제 `Rows`, `DB Hits`, 메모리를 비교한다. `DB Hits`는 저장 계층 접근 횟수라 결과 행 수와 다르다.
- 연산자별 peak 메모리를 합산해 전체 peak로 간주하지 않는다. 실행계획 하단의 query-wide peak와 구분한다.

적용 제안: 연결이 많은 시작점과 드문 관계가 정답인 질문을 함께 평가한다. 탐색 폭을 바꿀 때 지연과 메모리뿐 아니라 필요한 경로의 누락도 센다. 이 절만 추가 대조했으므로 기존 Bedrock 절의 검증일은 유지한다.

## 도입 판단과 평가

다음은 제품 성능 보장이 아닌 비교 절차다.

1. 같은 원문과 질문으로 기존 벡터/하이브리드 검색의 기준선을 만든다.
2. 한 문서로 답할 질문과 여러 관계를 연결해야 할 질문을 구분한다.
3. 필요한 근거의 회수율, 답변 정확도와 인용 지지를 따로 비교한다.
4. 그래프 구성과 갱신 비용, 검색 지연과 입력 토큰 증가도 포함한다.
5. 잘못 추출된 관계, 삭제된 원문과 권한 철회가 검색에 남는지 시험한다.

관계 확장으로 누락 근거가 줄어드는 경우에 도입을 검토한다. 단순 조회의 품질 문제가 청킹이나 권한 필터에서 생겼다면 먼저 그 원인을 고친다.

## 출처

- [토스증권 추천과 검색은 어떻게 진화하고 있을까? — 토스 기술 블로그](https://toss.tech/article/tech_talk_talk_3) — 기존 그래프의 검색 설계 사례
- [Neo4j Cypher Manual, Query tuning](https://neo4j.com/docs/cypher-manual/current/planning-and-tuning/query-tuning/)
- [Neo4j Cypher Manual, Understanding query plans](https://neo4j.com/docs/cypher-manual/current/planning-and-tuning/execution-plans/)
- [Amazon Bedrock, Build a knowledge base with Amazon Neptune Analytics graphs](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-graphs.html)
- [Amazon Bedrock, Create an Amazon Bedrock knowledge base with Amazon Neptune Analytics graphs](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-graphs-build.html)

## 관련 문서

- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[LLM-Hallucination-Verification|환각과 근거 검증]]
- [[LLM-Eval-Strategy|LLM 평가 전략]]
- [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프 (추출 그래프의 허용 관계와 식별자)]]
