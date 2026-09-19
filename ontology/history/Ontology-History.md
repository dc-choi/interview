---
tags: [ontology, evaluation, history, index]
status: index
category: "AI엔지니어링(AIEngineering)"
---

# 온톨로지 검증과 실험 이력

각 문서에 기록된 날짜, 원문 revision과 코드 hash를 기준으로 결과를 읽는다. 현재 도구 계약은 [[Ontology-Reference]], 실행 절차는 [[Ontology-Operations]]에서 확인한다.

## 목차

- [[Development-Ontology-Evaluation|초기 지도와 검색, 근거 읽기 검증]]
- [[Ontology-Runtime-Verification|parser, snapshot과 MCP 구현 검증]]
- [[Ontology-Retrieval-Quality|검색 개선의 누적 관측과 2026-09-15 주제명 검색]]
- [[Ontology-Search-Algorithms|BM25, 임베딩과 RRF 후보 비교]]
- [[Ontology-Search-Selection|절 선택, 근거 구성과 조건 힌트 비교]]
- [[Ontology-Search-Rerank|같은 후보의 모델 재정렬 비교]]
- [[Ontology-Condition-Evaluation|조건별 후속 탐색과 충분성 관측]]
- [[Ontology-Retrieval-Latency|같은 결과를 유지한 지연 개선]]

## 기록 읽는 법

- 실행기와 원본 JSON은 `ontology/evaluation/`에 있다. 문서의 링크에서 해당 보고서로 이동한다.
- 과거 보고서의 경로와 receipt는 기록된 Git revision 기준이다. 문서 이동을 이유로 원본 보고서의 경로나 hash를 바꾸지 않는다.
- 같은 결과를 재현하려면 원문 revision, 코드, 입력과 예산을 함께 맞춘다. 현재 checkout에서 새로 관측한 결과와 구분한다.

상위: [[Development-Ontology]].
