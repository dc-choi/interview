---
tags: [ai, ontology, instances, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["온톨로지 인스턴스 선언", "Ontology Instances"]
---

# 온톨로지 인스턴스 선언

검증을 통과한 개념(Problem, Approach, Condition, Tradeoff)과 타입 관계를 도메인별로 선언하는 문서 모음이다. 지식 원문은 수정하지 않고, 선언마다 원문 섹션을 근거로 연결한다.

## 목차

이벤트 발행

- [[Instances-Event-Publishing-Outbox|이벤트 발행 온톨로지 선언: Outbox]]
- [[Instances-Event-Publishing-Relay-CDC|이벤트 발행 온톨로지 선언: Relay와 CDC]]
- [[Instances-Event-Publishing-Idempotency|이벤트 발행 온톨로지 선언: 멱등성]]
- [[Instances-Event-Publishing-NestJS|이벤트 발행 온톨로지 선언: NestJS]]

추천시스템

- [[Instances-Recommendation-System-Candidate-Generation|추천시스템 온톨로지 선언: 후보 생성과 허브니스]]
- [[Instances-Recommendation-System-Embedding-Multi-Interest|추천시스템 온톨로지 선언: 공유 임베딩과 다중 관심]]
- [[Instances-Recommendation-System-Ranking|추천시스템 온톨로지 선언: 랭킹과 비즈니스 규칙]]
- [[Instances-Recommendation-System-Page-Taxonomy|추천시스템 온톨로지 선언: 페이지 조립과 택소노미]]
- [[Instances-Recommendation-System-Feedback-Eligibility|추천시스템 온톨로지 선언: 피드백 데이터와 가용성]]
- [[Instances-Recommendation-System-Serving|추천시스템 온톨로지 선언: 모델 서빙과 개인화 실패]]
- [[Instances-Recommendation-System-Evaluation|추천시스템 온톨로지 선언: 평가와 온라인 실험]]
- [[Instances-Recommendation-System-OPE-Modeling|추천시스템 온톨로지 선언: Off-policy 평가와 모델링 기초]]
- [[Instances-Recommendation-System-OTT-Discovery|추천시스템 온톨로지 선언: OTT 디스커버리]]
- [[Instances-Recommendation-System-Industry-Ads-Commerce-Scale|추천시스템 온톨로지 선언: 산업 사례: 광고, 커머스와 대규모 학습]]
- [[Instances-Recommendation-System-Industry-Media-Social|추천시스템 온톨로지 선언: 산업 사례: 미디어, 연구 벤치마크와 소셜 그래프]]

선언 형식은 [[Ontology-Schema]], 후보 검증과 반영 절차는 [[Ontology-Curation]], 질의 방법은 [[Ontology-Concept-Query]]를 따른다. 검증 기록은 `ontology/candidates/`에 있다.

상위: [[Development-Ontology]]
