---
tags: [senior, ai, index]
status: index
category: "Senior - AI 엔지니어링"
aliases: ["AI 엔지니어링 실천 도구", "AI Engineering Tools"]
---

# AI 엔지니어링 실천 도구

하네스, AI 네이티브 시스템/조직, 컨텍스트, 에이전트 스펙/아키텍처, RAG, MCP — AI를 프로덕션에서 제어하는 도구. 상위: [[AI엔지니어링(AIEngineering)|AI 시대 엔지니어링]].

## 목차
- [x] [[Harness-Engineering|하네스 엔지니어링 (Constrain→Inform→Verify→Correct→HITL, 프롬프트→컨텍스트→하네스 진화, 멀티 에이전트 오케스트레이션)]]
- [x] [[claude-code|Claude Code 가이드 (claude-code/ 서브폴더) — 학습 트랙(기초, 개발, 비즈니스/도메인, 커스터마이즈) + 레퍼런스(설정/권한, 확장, 운영, 클라우드/보안, 내부 구조)]]
- [x] [[AI-Native-System|AI 네이티브 시스템 (부탁 vs 강제, 결정론적 제어 4계층, AST 아키텍처 테스트로 위반 0, 실수→시스템 흡수 루프, 시스템+사람+문화)]]
- [x] [[AI-Native-Org|AI 네이티브 조직 (팀챗 위 전사 AI 실행 플랫폼, 상태머신+HITL, K8s Job 워커 격리, MCP 프록시, 4계층 메모리, 복구 우선, 조직 6요소)]]
- [x] [[Context-Engineering|컨텍스트 엔지니어링 (수요 측 — Context Rot, Write/Select/Compress/Isolate, CLAUDE.md 200줄, Hook vs Advisory)]]
- [x] [[Tool-Output-Filtering|도구 출력 필터링 (토큰을 먹는 건 프롬프트가 아니라 도구 출력, 사전 필터링 > 사후 요약, 상태 기반 컨텍스트, 탐색 범위 제한)]]
- [x] [[Agent-Context-Budget|에이전트 컨텍스트 예산 (경계 밖 설계 — 파일 Lazy Loading, 목록 Hybrid, 스킬 Catalog-First, Compaction 대신 사전 통제, hard cap)]]
- [x] [[Agentic-Context-Platform|Context Provider / 에이전트 컨텍스트 플랫폼 (공급 측 — 자동 수집/표준화/연결/최신성, 사람+AI 공용 지식 인프라)]]
- [x] [[Agent-Spec-Writing|에이전트 스펙 작성법 (6대 영역, 지시의 저주, 3단계 경계, LLM-as-Judge)]]
- [x] [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (분업, Lazy Load, Defense in Depth, Metric Registry, Eval, 고가용성)]]
- [x] [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링 (구조 기반 청킹, 하이브리드 BM25+벡터, 쿼리 재구성, 계층적 RAG, 엔티티 추출 조회)]]
- [x] [[Agent-Code-Search|에이전트 코드 검색 (grep+read 대체, tree-sitter 청킹, 정적 임베딩 CPU 실시간, 코드 인식 리랭킹, MCP/CLI/서브에이전트)]]
- [x] [[Agent-Overengineering-Guard|에이전트 과잉설계 방지 (YAGNI 사다리 7칸, 게으름 vs 태만, 안전 100% 유지, 상시 룰셋 주입, 다중 에이전트 이식성)]]
- [x] [[Agent-Ready-API-Design|에이전트 친화 API 설계 (사람+AI 공용 인터페이스, 강제보다 안내, 에러 코드 append-only 계약, --dense 출력 밀도, Vibe Test 공정성 5불변식)]]
- [x] [[Agent-Email-Interface|이메일 에이전트 인터페이스 (비동기 궁합, 주소=라우팅 키, 엔티티별 DO 격리, HITL 발신 게이트, 단일 신뢰 경계 명시, MCP vs CLI vs 스킬)]]
- [x] [[Agent-Skills|에이전트 스킬 (재사용 작업 단위 = 온디맨드 플레이북, SKILL.md 폴더+description 자동 로드, 점진적 공개, Claude vs Codex 같은 포맷 다른 관례, 스킬 vs 훅)]]
- [x] [[Codex-CLI|Codex CLI (슬래시 명령 카탈로그 — 작업평가 /plan, /review, /diff, 스킬 시스템/시스템 스킬/추천 스킬, AGENTS.md 계층, codex exec 비대화형, App vs CLI)]]
- [x] [[MCP|MCP (Model Context Protocol — Host/Client/Server, Tools/Resources/Prompts, tool-use N×M→N+M, 권한 통제)]]
- [x] [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (체인 vs 에이전트 선택, 그래프 워크플로우, Function Calling/스킬 시스템 Detector-CoT-Answer, Text-to-SQL, 데이터 vs 모델)]]
- [x] [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅 (3단 티어 수렴, 난이도 기반 라우팅, 에스컬레이션/폴백, 프런티어 단계적 출시)]]
