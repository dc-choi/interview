---
tags: [ai, llm, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM 원리와 운영", "LLM 운영", "LLM Fundamentals and Operations", "LLM Operations"]
---

# LLM 원리와 운영

모델의 학습과 생성 원리부터 추론 병목, 선택, 호출 계층과 운영까지 연결한다. 상위: [[tools|AI 엔지니어링 실천 도구]].

## 목차
- [x] [[Event-Log-Highlight-Generation|이벤트 로그 기반 하이라이트]] — 로그 정규화, SQL 템플릿, 사실 검증과 검토 처리량
- [x] [[LLM-Gateway|LLM 게이트웨이]] — 관리 키와 업무 키, DB에 의존하는 예산 검사, 배포와 운영 검증, 호환 API의 기능과 대화 상태 보존
- [x] [[LLM-Product-Attribute-Extraction|상품 이미지의 속성 추출]] — OCR 후보 선별, 형식과 의미 검증, 보류 비율과 정확도
- [x] [[LLM-Generation-Mechanics|LLM 동작 원리 (generation-mechanics/ 서브폴더) — AI 전체 지도, Training/Inference와 역전파, BPE 토크나이저 구성과 토크나이저 차이, 이미지와 사고 토큰 과금, Transformer QKV Attention과 Decoding, Weight/Context/RAG 구분, Context Window와 대화 누적, 긴 컨텍스트 단가 구간, 환각과 Agent 연결]]
- [x] [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅 (3단 티어 수렴, 벤더 내 100배 단가 격차와 출력/입력 단가 비, 재작업 비용과 effort, 난이도 기반 라우팅, 에스컬레이션/폴백, 프런티어 단계적 출시, 계획과 실행의 모델 분담)]]
- [x] [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (체인 vs 에이전트 선택, 예측 가능성 판단 축, Plan-and-Execute, 콘텐츠 초안과 승인 대기열, 그래프 워크플로우, n8n 오류 처리와 자동 실행 검증, Function Calling/스킬 시스템 Detector-CoT-Answer, Text-to-SQL 맥락 구성과 생성/실행 권한 분리, 데이터 vs 모델)]]
- [x] [[LLM-Decision-Models|결정 모델 (System One, Jev와 Clef, 로컬 Laya와 MLX 포트, 과업별 미세조정 평가, state와 noul/choice/score 질문 스키마, 비자기회귀 채점과 입력 토큰 과금, confidence 문턱과 에스컬레이션, 보정 검증, 도구 기록 선별 압축, 닫힌 선택지와 프롬프트 인젝션, 언어 한계)]]
- [x] [[LLM-Prompt-Caching|LLM 프롬프트 캐싱 (prefix matching, cache_write/read 과금, Anthropic과 OpenAI와 Gemini 캐싱 비교, TTL 히트 갱신, 활용 패턴 6, 안티패턴 6, 세션 분기와 seed 세션의 캐시 재사용 조건, 히트율 98% 사례)]]
- [x] [[LLM-Inference-Bottlenecks|LLM 추론 병목 (루프라인과 arithmetic intensity, 프리필 vs 디코드, memory-bound 디코드, 배칭/KV 캐시/speculative decoding/양자화의 서로 다른 비용, 로컬 추론 용량과 오프로딩, 세션 기반 벤치마크와 포화점, 가속기 스펙 읽기, CPU와 GPU 사례 수치의 구분, M1 ANE 역공학 사례, 파운데이션 모델 교재 진입점)]]
- [x] [[LLM-Failure-Handling|LLM 실패 처리 (기술적 실패와 의미적 실패, 지속성과 범위 분류, 429 속도 한도와 지출 한도 구분, stop_reason, 구조화 출력의 한계, 토큰 사전 계산, 스트리밍 복구, SDK 기본 재시도, 폴백 범위와 잠복 결함, 모델별 한도와 동시성, 도구 멱등 키)]]
