---
tags: [ai, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI 엔지니어링 실천 도구", "AI Engineering Tools"]
---

# AI 엔지니어링 실천 도구

하네스 시스템, 컨텍스트, 에이전트, 사용량 관측, RAG, MCP, 음성 인식 — AI를 프로덕션에서 쓰고 제어하는 도구. 상위: [[AI엔지니어링(AIEngineering)|AI 시대 엔지니어링]].

## 목차
- [x] [[Harness-Systems|하네스 시스템 (harness/ 서브폴더) — 하네스 5원칙, 구성요소 비교 실험, 런타임 구성도, 게이트 배치, 도입 계단, AI 네이티브 시스템/조직, 프로덕션 에이전트 아키텍처, 에이전트 군집 격리]]
- [x] [[claude-code|Claude Code 가이드 (claude-code/ 서브폴더) — 학습 트랙(기초, 개발, 비즈니스/도메인, 커스터마이즈) + 레퍼런스(설정/권한, CLAUDE.md와 AGENTS.md 지침 호환, 확장, 운영, 클라우드/보안, 내부 구조)]]
- [x] [[agent|에이전트 심화 (agent/ 서브폴더) — 컨텍스트 예산, 코드 검색, 친화 API 설계, 데이터 준비, 이메일 인터페이스, 스킬, 루프 엔지니어링, 지시 설계(instruction-design/: 스펙 작성, 과잉설계 방지, 코딩 가드레일, 검증 행동, 출력 문체 제약)]]
- [x] [[Context-Hub|컨텍스트 (context/ 서브폴더) — 수요 측 컨텍스트 엔지니어링, 도구 출력 필터링, 공급 측 Context Provider 플랫폼]]
- [x] [[AI-Coding-Agent-Usage-Telemetry|AI 코딩 에이전트 사용량 텔레메트리 (공급자별 transcript 정규화, replay-safe 집계, 활동량과 비용/품질 분리, 개인정보와 보존 경계)]]
- [x] [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링 (전체 투입과 검색 선택, 청킹과 청크별 맥락 보강, 하이브리드 검색, 계층적 RAG, 검색 권한, 데이터 수명과 교차 유출 검증)]]
- [x] [[Codex-CLI|Codex CLI (슬래시 명령 카탈로그 — 작업평가 /plan, /review, /diff, 스킬 시스템/시스템 스킬/추천 스킬, AGENTS.md 계층, codex exec 비대화형, App vs CLI)]]
- [x] [[Codex-Agent-Execution-Model|Codex 동작 원리 (Context → Tokenizer → Model → Tool → Verification, ChatGPT 채팅과 문서 수정 비교)]]
- [x] [[MCP|MCP (Model Context Protocol — Host/Client/Server, Tools/Resources/Prompts, OAuth 권한, annotations와 토큰 및 로컬 실행 경계, A2A)]]
- [x] [[MCP-Security-Boundaries|MCP 보안 경계 (서버 자격 증명과 네 경계, 2026년 MCP 서버 권고, 게이트웨이와 자격 증명 주입, URL 모드 elicitation)]]
- [x] [[Local-Speech-to-Text|로컬 음성 인식으로 영상 전사하기 (자막 종류와 한계, Whisper와 VAD와 어휘 힌트, Apple Silicon 엔진 비교, 한국어 실측 CER, 클라우드 요금)]]
- [x] [[Video-Transcript-Pipeline|영상 전사 파이프라인 구현 (memo 스킬 yt_transcript.py, 자막 우선과 whisper.cpp 폴백, 캐시 키와 안전장치, 설계 결정과 검증 교훈)]]
- [x] [[llm|LLM 원리와 운영 (llm/ 서브폴더) — 학습과 생성(generation-mechanics/: 학습과 조정, 추론과 디코딩, Context와 환각과 에이전트), 추론 병목, 모델 티어 선택/라우팅, 워크플로우 패턴, 결정 모델, 프롬프트 캐싱, 실패 처리]]
