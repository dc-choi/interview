---
tags: [ai, llm, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM 원리와 운영", "LLM 운영", "LLM Fundamentals and Operations", "LLM Operations"]
---

# LLM 원리와 운영

모델의 학습과 생성 원리부터 선택, 호출 계층과 운영까지 연결한다. 상위: [[tools|AI 엔지니어링 실천 도구]].

## 목차
- [x] [[LLM-Generation-Mechanics|LLM 동작 원리 (AI 전체 지도, Training/Inference, 역전파, Transformer QKV Attention, Decoding, Weight/Context/RAG, 환각과 Agent 연결)]]
- [x] [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅 (3단 티어 수렴, 난이도 기반 라우팅, 에스컬레이션/폴백, 프런티어 단계적 출시)]]
- [x] [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (체인 vs 에이전트 선택, 예측 가능성 판단 축, Plan-and-Execute, 그래프 워크플로우, Function Calling/스킬 시스템 Detector-CoT-Answer, Text-to-SQL, 데이터 vs 모델)]]
- [x] [[LLM-Prompt-Caching|LLM 프롬프트 캐싱 (prefix matching, cache_write/read 과금, TTL 히트 갱신, 활용 패턴 6, 안티패턴 6, 히트율 98% 사례)]]
