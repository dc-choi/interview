---
tags: [ai, rag, graph, retrieval, bedrock, neptune]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["GraphRAG 검색", "Graph RAG Retrieval"]
---

# GraphRAG 검색

GraphRAG는 문서에서 찾은 개체와 관계를 검색에 활용해 생성 모델에 제공할 근거를 확장하는 방식이다. 여기서는 벡터 검색 결과를 그래프 탐색의 출발점으로 쓰는 Amazon Bedrock Knowledge Bases 구성을 다룬다. 모든 GraphRAG 구현이 같은 검색 절차를 쓰는 것은 아니다.

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

## 도입 판단과 평가

다음은 제품 성능 보장이 아닌 비교 절차다.

1. 같은 원문과 질문으로 기존 벡터/하이브리드 검색의 기준선을 만든다.
2. 한 문서로 답할 질문과 여러 관계를 연결해야 할 질문을 구분한다.
3. 필요한 근거의 회수율, 답변 정확도와 인용 지지를 따로 비교한다.
4. 그래프 구성과 갱신 비용, 검색 지연과 입력 토큰 증가도 포함한다.
5. 잘못 추출된 관계, 삭제된 원문과 권한 철회가 검색에 남는지 시험한다.

관계 확장으로 누락 근거가 줄어드는 경우에 도입을 검토한다. 단순 조회의 품질 문제가 청킹이나 권한 필터에서 생겼다면 먼저 그 원인을 고친다.

## 출처

- [Amazon Bedrock, Build a knowledge base with Amazon Neptune Analytics graphs](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-graphs.html)
- [Amazon Bedrock, Create an Amazon Bedrock knowledge base with Amazon Neptune Analytics graphs](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-graphs-build.html)

## 관련 문서

- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[LLM-Hallucination-Verification|환각과 근거 검증]]
- [[LLM-Eval-Strategy|LLM 평가 전략]]
