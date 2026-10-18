---
tags: [ai, agent, orchestration, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Execution", "에이전트 실행 구조"]
---

# 에이전트 실행 구조

에이전트가 도는 구조를 설계하는 문서 묶음 — 도구 호출 루프와 계획 검증, 컨텍스트 예산, 바깥 루프와 정지 조건, 실행 그래프, 설정으로 정의하는 런타임과 상주 에이전트 사례. 상위: [[agent|에이전트 심화]].

## 목차

- [[Agent-From-Scratch|에이전트 직접 만들기]]: 모델, 오케스트레이션, 도구 계층, 도구 호출 루프와 병렬 호출, 도구 정의, 계획 검증과 saveAs/inputFrom 데이터 흐름, 메모리 세 종류
- [[Agent-Context-Budget|에이전트 컨텍스트 예산]]: 경계 밖 설계 — 파일 Lazy Loading, 목록 Hybrid, 스킬 Catalog-First, Compaction 대신 사전 통제, hard cap
- [[Agent-Loop-Engineering|루프 엔지니어링]]: 정지 조건이 본질, ralph 흡수 계보, 4중 루프 아키텍처 축과 공식 4분류 위임 축, 3종 가드, 하네스의 한 층 위
- [[Agent-Graph-Engineering|그래프 엔지니어링]]: 노드, 엣지, 상태와 조건, 코드와 모델과 사람의 판정 분담, 실패 노드로의 복귀와 재시도 한도, 사람 승인 노드의 재개 경계
- [[Agent-Declarative-Runtime|선언형 에이전트 런타임]]: Docker Agent의 YAML 정의, 실행과 API, MCP, A2A 노출, OCI 배포, 세 가지 위임, 권한 경계와 Docker Agent의 A2A 인증 제약, 루프 가드와 예산
- [[Hermes-Agent|Hermes Agent]]: 게이트웨이 상주 에이전트, 스킬과 메모리 파일로 남는 학습 루프, 프로필별 홈과 게이트웨이, Kanban 작업 보드, 허용 목록과 명령 승인, 에이전트 작성 스킬 검토

- [[Agent-Runtime-Deployment|에이전트 런타임과 배포]]: Eve, Mecatl, Strands, OpenCode의 정의, 영속 상태, 권한과 비동기 실행

## 함께 볼 문서

- [[agent|에이전트 심화]]
