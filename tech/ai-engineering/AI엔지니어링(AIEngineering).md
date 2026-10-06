---
tags: [ai]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI Engineering", "AI 시대 엔지니어링"]
---

# AI엔지니어링(AI Engineering)

Software 3.0 패러다임, LLM과 에이전트, 하네스, 평가, 조직 전환과 역할 변화를 다루는 독립 기술 축이다. 주제별 하위 영역으로 나뉘어 있다.

## 하위 영역
- [[paradigm|패러다임, 모델]] — Software 3.0, Gemini 4 Argon, Claude Fable 5 / Mythos 5, Claude Opus 5 (모델, API 거동)
- [[tools|실천 도구]] — 하네스 시스템(구성요소 비교 실험, 런타임 구성도, 게이트 배치, 도입 계단, AI 네이티브 시스템과 조직, 군집 격리), 컨텍스트(멀티레포 분석과 업무 기록 재사용), 에이전트, 사용량 관측, RAG, MCP, LLM 원리와 운영(학습과 생성, 추론 병목과 로컬 메모리 예산, 모델 티어, 워크플로우 패턴과 승인 대기열, 결정 모델, 프롬프트 캐싱, 실패 처리), 음성 인식(로컬 STT 엔진 비교, 영상 전사 파이프라인)
- [[org-role|조직, 역할]] — AX 조직 전환(Maker→Closer), 개발자 역할 재정의, 도달력(Distribution)이 새 해자, 생성형 AI 시장 구도와 규제 논쟁, AI 시민 개발
- [[eval|평가, 신뢰성, 캘리브레이션]] — LLM 평가 전략, Abstention(모른다고 말하는 능력), 환각 유형과 검증, 평가 주도 개발(EDD), 루브릭과 점수 게이트, LLM 판정기, 골든셋과 배포 관문, 서빙 모델 드리프트 감시

## 세부 학습

- [x] [[Agent-Ready-API-Design#API 스키마와 생성 결과를 함께 관리한다|API 스키마 기반 도구 생성]] — CLI, SDK와 문서의 공통 계약, 수작업 명령과 생성 결과 검토
- [x] [[LLM-Generation-Mechanics-Context-and-Agent#숫자 생성과 계산 도구 실행은 다르다|LLM 산술과 계산 도구]] — 식과 입력, 실행 증거, 결과 전달의 검증 경계
- [x] [[Agent-Memory-Retain-Recall-Reflect|에이전트 기억의 저장, 검색과 추론]] — Hindsight의 연산 경계와 사실, 믿음의 분리
- [x] [[MCP#변경 알림 구독과 재연결|MCP 변경 알림 구독]] — subscriptions/listen, 재조회와 연결 단절의 의미
- [x] [[Production-Agent-Architecture#사례|에이전트 격리와 행동 승인 사례]] — 사용자별 VM과 별도 통제 계층

- [x] [[Realtime-Voice-Architecture|실시간 음성 에이전트]] — 전이중 대화와 백엔드 작업 분리, 위임과 취소, 음성 안내와 실제 결과 대조, TTS의 첫 재생 지연과 버퍼 절충
- [x] [[MCP#RAG, 에이전트와 Function Calling의 경계|MCP, RAG와 에이전트의 책임 구분]] — 연결 프로토콜, 근거 검색과 동적 실행 흐름
- [x] [[LLM-Inference-Bottlenecks#에이전트 서빙은 세션 단위로 측정한다|에이전트 서빙 벤치마크]] — 턴별 문맥 증가, 캐시 재사용, 동시성 포화점과 지연 목표
- [x] [[LLM-Generation-Mechanics-Context-and-Agent#대화 요약과 별도 기록의 경계|LLM 대화 요약과 작업 기록]] — 압축의 손실, 외부 상태 저장과 컨텍스트 재주입
- [x] [[Linear-Attention|선형 어텐션]] — 특징 맵, 정규화와 인과 누적 상태
- [x] [[Claude-Code-Workflows#긴 작업의 완료와 중단 조건|에이전트의 완료와 중단 조건]] — 결과 증거, 작업 목록과 검증 한계
