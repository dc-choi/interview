---
tags: [ai, ontology, development, context, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["개발 판단 온톨로지", "Development Knowledge Ontology"]
---

# 개발 판단 온톨로지

이 Vault의 지식을 현재 개발, 커리어, 비즈니스와 경제 상황에 연결해 적용 조건, 대안과 놓치기 쉬운 고려사항을 먼저 찾는다. 사용자는 자료마다 맥락을 반복 설명하지 않고, AI는 원문과 현재 코드 또는 해당 판단의 근거를 확인해 개선안을 제안한다.

현재 단계는 Markdown 원문을 Git `HEAD` blob으로 고정해 색인하고, `context_search`로 문서 후보를 찾거나 `context_lookup`으로 근거를 조회한 뒤 `context_outline`으로 문서 목차를 탐색하고 `context_read`로 근거를 끝까지 읽는 구현이다. 개인 지식은 이 저장소에 유지하며, 조회 결과를 현재 프로젝트의 코드나 런타임 사실로 해석하지 않는다.

2026-11-19에 schema 2를 도입했다. 태그와 카테고리를 묶는 통제 어휘, 문제, 방법, 조건과 비용을 구분하는 타입 개념, 정의역과 치역이 있는 관계, 선언의 제약 검증, 개념 질의 `context_concept`를 갖춘 경량 지식 온톨로지다. OWL 추론기, RDF 저장, 그래프 DB와 데이터 변경 액션은 범위 밖이다. 문제, 방법, 조건과 비용의 선언은 이벤트 발행 한 영역에서 시작했으며 측정 결과와 한계는 [[Ontology-Competency-Evaluation]]에 있다.

## 사용 기준

2026-10-16 사용자는 이 온톨로지를 만들게 된 계기 중 하나가 Palantir 문서를 참고하라는 조언이었다고 밝혔다. [[Palantir-Foundry]]에서 데이터, 로직, 행동과 보안을 연결하는 운영 온톨로지를 학습한다. 이는 설계 참고의 배경이며 Foundry 도입 결정이나 해당 제품 기능을 이 저장소에 구현했다는 기록은 아니다.

- 기술 선택, 설계 변경과 신뢰성 검토, 커리어 판단, 비즈니스와 경제 검토에 관련된 원문만 읽는다. 모든 작업에서 전체 Vault를 읽지 않는다.
- 학습 지식, 프로젝트 결정, 사용자 규칙과 AI 제안을 구분한다. 지도에 없는 주제는 관련 카테고리 원문을 검색한다.
- 아래 관계는 검토용 탐색 경로다. 현재 프로젝트에 대한 확정 사실이나 채택된 기술 목록이 아니다.
- 자동 조회의 기본 범위는 committed `README.md`, `biz/`, `econ/`, `fit/`, `ontology/`, `tech/` Markdown이다. 요청의 주제에 맞게 scope를 좁힐 수 있다. 미커밋 원문은 evidence에 섞지 않고 `unindexed_worktree`로 표시한다.
- `ontology/`의 Markdown은 이 지식 기반의 설계, 운영과 평가 기록이다. 학습 원리, 프로젝트 결정, 현재 코드와 실행 사실은 각각의 역할과 근거를 분리해 해석한다.

## 지도와 계약

| 필요한 작업 | 시작 문서 |
| --- | --- |
| 원리 학습과 적용 예시 | [[Ontology-Guides]] |
| 자료의 역할과 적용 판단 | [[Development-Ontology-Contract]] |
| 설치, 실행과 MCP 등록 | [[Ontology-Operations]] |
| 검색 도구와 근거 확인 절차 | [[Ontology-Reference]] |
| 클래스, 관계와 선언 형식 | [[Ontology-Schema]] |
| 개념 이름으로 관계와 근거 찾기 | [[Ontology-Concept-Query]] |
| 개념과 관계의 후보 검증과 선언 | [[Ontology-Curation]] |
| 통제 어휘와 영역별 선언 | [[Ontology-Vocabulary]], [[Ontology-Instances]] |
| 개선 결과와 실험의 한계 | [[Ontology-History]] |

## 실행 경로

반복 절차는 저장소의 `development-context` 스킬(`.claude/skills/development-context/SKILL.md`)이 담당한다.

상위: [[Context-Hub]]. 구현 계약: [[Ontology-Context-Platform-Implementation]]. AI host 연결과 제한: [[Ontology-Context-Platform-AI-Runtime]].
