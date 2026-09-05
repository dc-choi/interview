---
tags: [ai, ontology, development, context, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["개발 판단 온톨로지", "Development Knowledge Ontology"]
---

# 개발 판단 온톨로지

이 Vault의 지식을 현재 개발 상황에 연결해 적용 조건, 대안과 놓치기 쉬운 고려사항을 먼저 찾는다. 사용자는 자료마다 맥락을 반복 설명하지 않고, AI는 원문과 현재 코드를 확인해 개선안을 제안한다.

현재 단계는 Markdown 원문을 Git `HEAD` blob으로 고정해 색인하고, `context_lookup`으로 원문 section을 반환하는 실행 가능한 최소 구현이다. 개인 지식은 이 저장소에 유지하며, 조회 결과를 현재 프로젝트의 코드나 런타임 사실로 해석하지 않는다.

## 사용 기준

- 기술 선택, 설계 변경과 신뢰성 검토에 관련된 지도만 읽는다. 모든 작업에서 전체 Vault를 읽지 않는다.
- 학습 지식, 프로젝트 결정, 사용자 규칙과 AI 제안을 구분한다. 지도에 없는 주제는 관련 카테고리 원문을 검색한다.
- 아래 관계는 검토용 탐색 경로다. 현재 프로젝트에 대한 확정 사실이나 채택된 기술 목록이 아니다.
- 자동 조회는 `tech` 경로의 committed Markdown만 기본 범위로 삼는다. 미커밋 원문은 evidence에 섞지 않고 `unindexed_worktree`로 표시한다.

## 지도와 계약

- [[Development-Ontology-Contract|문제, 방법, 조건, 비용과 근거의 연결 계약]]
- [[Development-Ontology-Event-Publishing|DB 저장 이후 이벤트 발행과 후속 처리의 신뢰성]]
- [[Development-Ontology-Evaluation|첫 검색 관찰, 검증 범위와 남은 작업]]
- [[Ontology-Operations|빌드, 조회, MCP 실행과 런타임 검증]]

## 실행 경로

반복 절차는 저장소의 `development-context` 스킬이 담당한다. Codex는 `.agents/skills/development-context/SKILL.md`, Claude는 `.claude/skills/development-context/SKILL.md`를 사용한다.

상위: [[Context-Hub]]. 구현 계약: [[Ontology-Context-Platform-Implementation]]. AI host 연결과 제한: [[Ontology-Context-Platform-AI-Runtime]].
