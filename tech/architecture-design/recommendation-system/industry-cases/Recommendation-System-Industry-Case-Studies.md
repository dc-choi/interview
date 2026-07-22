---
tags: [architecture, recommendation-system, industry-case-study, personalization]
status: index
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation System Industry Case Studies", "추천 시스템 산업 사례", "추천 시스템 유명 기업"]
---

# 추천 시스템 산업 사례 지도

유명 기업의 모델 이름을 외우는 대신 공개된 제품 표면, pipeline 위치, label, 평가와 운영 제약을 비교한다. 기업 논문과 기술 블로그는 발표 당시 일부 시스템의 근거이며 현재 회사 전체 구조의 명세가 아니다.

| 영역 | 상세 문서 | 대표 사례 | 먼저 볼 문제 |
|---|---|---|---|
| 미디어 | [[Recommendation-System-Industry-Media\|미디어 추천]] | Netflix, YouTube, Spotify | 화면 편성, 대규모 funnel, session context |
| 커머스와 마켓플레이스 | [[Recommendation-System-Industry-Commerce-Marketplace\|커머스와 마켓플레이스]] | Amazon, Alibaba, Airbnb | Item relation, candidate-aware ranking, availability |
| 소셜과 그래프 | [[Recommendation-System-Industry-Social-Graph\|소셜과 그래프]] | LinkedIn, Pinterest | Graph candidate, mutual value, fairness |
| 대규모 ML | [[Recommendation-System-Industry-Large-Scale-ML\|대규모 ML과 실시간 학습]] | Meta, ByteDance | Sparse embedding, sequence, online update |
| 연구와 벤치마크 | [[Recommendation-System-Industry-Research-Benchmarks\|연구 기준점]] | GroupLens, MovieLens, ACM RecSys | 재현 가능한 offline evaluation의 범위 |

학습 순서는 미디어에서 candidate와 ranking의 공통 구조를 잡고, 커머스와 소셜에서 도메인 제약을 본 뒤 대규모 ML의 운영 문제로 확장한다. 연구 문서는 어느 단계에서든 평가 protocol을 점검할 때 함께 사용한다.

## 읽을 때 지킬 경계

- 배포가 확인된 구성 요소와 회사의 현재 전체 추천 stack을 구분한다.
- Reference model, offline 연구, production A/B evidence를 구분한다.
- 공개 시점의 수치와 구조를 현재 규모나 예상 lift로 재사용하지 않는다.
- Retrieval, ranking, reranking과 page composition의 책임을 섞지 않는다.

## 관련 문서

- [[Recommendation-System-Architecture|추천 시스템 지식 지도]]
- [[Personalization-Recommendation|개인화와 추천의 비즈니스 관점]]
- [[Vector-Similarity-Search|벡터 유사도 검색과 ANN]]
