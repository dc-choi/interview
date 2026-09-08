---
tags: [ai, ontology, development, context, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["개발 판단 온톨로지", "Development Knowledge Ontology"]
---

# 개발 판단 온톨로지

이 Vault의 지식을 현재 개발, 커리어, 비즈니스와 경제 상황에 연결해 적용 조건, 대안과 놓치기 쉬운 고려사항을 먼저 찾는다. 사용자는 자료마다 맥락을 반복 설명하지 않고, AI는 원문과 현재 코드 또는 해당 판단의 근거를 확인해 개선안을 제안한다.

현재 단계는 Markdown 원문을 Git `HEAD` blob으로 고정해 색인하고, `context_search`로 문서 후보를 찾거나 `context_lookup`으로 근거를 조회한 뒤 `context_outline`으로 문서 목차를 탐색하고 `context_read`로 근거를 끝까지 읽는 구현이다. 개인 지식은 이 저장소에 유지하며, 조회 결과를 현재 프로젝트의 코드나 런타임 사실로 해석하지 않는다.

## 사용 기준

- 기술 선택, 설계 변경과 신뢰성 검토, 커리어 판단, 비즈니스와 경제 검토에 관련된 원문만 읽는다. 모든 작업에서 전체 Vault를 읽지 않는다.
- 학습 지식, 프로젝트 결정, 사용자 규칙과 AI 제안을 구분한다. 지도에 없는 주제는 관련 카테고리 원문을 검색한다.
- 아래 관계는 검토용 탐색 경로다. 현재 프로젝트에 대한 확정 사실이나 채택된 기술 목록이 아니다.
- 자동 조회의 기본 범위는 committed `README.md`, `biz/`, `econ/`, `fit/`, `ontology/`, `tech/` Markdown이다. 요청의 주제에 맞게 scope를 좁힐 수 있다. 미커밋 원문은 evidence에 섞지 않고 `unindexed_worktree`로 표시한다.
- `ontology/`의 Markdown은 이 지식 기반의 설계, 운영과 평가 기록이다. 학습 원리, 프로젝트 결정, 현재 코드와 실행 사실은 각각의 역할과 근거를 분리해 해석한다.

## 지도와 계약

- [[Development-Ontology-Contract|문제, 방법, 조건, 비용과 근거의 연결 계약]]
- [[Development-Ontology-Event-Publishing|DB 저장 이후 이벤트 발행과 후속 처리의 신뢰성]]
- [[Development-Ontology-Evaluation|첫 검색 관찰, 검증 범위와 남은 작업]]
- [[Ontology-Operations|빌드, 조회, MCP 실행과 런타임 검증]]
- [[Ontology-Evidence-Lifecycle|근거의 시점과 예외 보존, 필수 근거 평가]]
- [[Ontology-Evidence-Read|잘린 근거를 같은 원문에서 끝까지 읽는 MCP와 CLI]]
- [[Ontology-Document-Outline|찾은 문서의 다른 section 탐색]]
- [[Ontology-Document-Search|문서 후보를 페이지로 찾고 후속 근거를 고르는 API]]
- [[Ontology-Condition-Retrieval|질문 조건을 나누고 빠진 근거만 제한적으로 다시 찾기]]
- [[Ontology-Retrieval-Quality|자연어 검색과 후속 탐색의 품질, 비용과 남은 한계]]
- [[Ontology-Retrieval-Latency|같은 검색 결과를 보존하는 조회 지연 개선과 반복 비교]]
- [[Ontology-Search-Algorithms|BM25, 다국어 임베딩과 RRF의 고정 비교 실험]]
- [[Ontology-Search-Selection|질문의 여러 조건을 담는 절 선택과 검증]]
- [[Ontology-Search-Rerank|같은 후보의 다국어 재정렬 비교와 미채택 판단]]

## 실행 경로

반복 절차는 저장소의 `development-context` 스킬이 담당한다. Codex는 `.agents/skills/development-context/SKILL.md`, Claude는 `.claude/skills/development-context/SKILL.md`를 사용한다.

상위: [[Context-Hub]]. 구현 계약: [[Ontology-Context-Platform-Implementation]]. AI host 연결과 제한: [[Ontology-Context-Platform-AI-Runtime]].
