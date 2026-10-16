---
tags: [ai, llm, operations, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM 선택, 서빙과 운영", "LLM Selection Serving and Operations"]
---

# LLM 선택, 서빙과 운영

모델을 고르고 호출하고 운영하는 계층 — 모델 티어와 라우팅, 결정 모델, 추론 병목, 프롬프트 캐싱, 게이트웨이, 실패 처리. 상위: [[llm|LLM 원리와 운영]].

## 목차

- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅]]: 3단 티어 수렴, 벤더 내 100배 단가 격차와 출력/입력 단가 비, 재작업 비용과 effort, 난이도 기반 라우팅, 에스컬레이션/폴백, 프런티어 단계적 출시, 계획과 실행의 모델 분담
- [[LLM-Decision-Models|결정 모델 (decision-models/ 서브폴더)]]: System One, Jev와 Clef, 로컬 Laya와 MLX 포트, 과업별 미세조정 평가, state와 noul/choice/score 질문 스키마, 비자기회귀 채점과 입력 토큰 과금, confidence 문턱과 에스컬레이션, 보정 검증, 도구 기록 선별 압축, 닫힌 선택지와 프롬프트 인젝션, 언어 한계
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]]: 루프라인과 arithmetic intensity, 프리필 vs 디코드, memory-bound 디코드, 배칭/KV 캐시/speculative decoding/양자화의 서로 다른 비용, 로컬 추론 용량과 오프로딩, 세션 기반 벤치마크와 포화점, 가속기 스펙 읽기, CPU와 GPU 사례 수치의 구분, M1 ANE 역공학 사례, 파운데이션 모델 교재 진입점
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]]: prefix matching, cache_write/read 과금, Anthropic과 OpenAI와 Gemini 캐싱 비교, TTL 히트 갱신, 활용 패턴 6, 안티패턴 6, 세션 분기와 seed 세션의 캐시 재사용 조건, 구독형 앱의 캐시 만료와 사용량 한도, 히트율 98% 사례
- [[LLM-Gateway|LLM 게이트웨이]]: 관리 키와 업무 키, DB에 의존하는 예산 검사, 배포와 운영 검증, 호환 API의 기능과 대화 상태 보존
- [[LLM-Failure-Handling|LLM 실패 처리 (failure-handling/ 서브폴더)]]: 기술적 실패와 의미적 실패, 지속성과 범위 분류, 429 속도 한도와 지출 한도 구분, stop_reason, 구조화 출력의 한계, 토큰 사전 계산, 스트리밍 복구, SDK 기본 재시도, 폴백 범위와 잠복 결함, 모델별 한도와 동시성, 도구 멱등 키

## 함께 볼 문서

- [[llm|LLM 원리와 운영]]
