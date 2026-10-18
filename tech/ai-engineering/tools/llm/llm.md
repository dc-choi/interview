---
tags: [ai, llm, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM 원리와 운영", "LLM 운영", "LLM Fundamentals and Operations", "LLM Operations"]
---

# LLM 원리와 운영

모델의 학습과 생성 원리부터 추론 병목, 선택, 호출 계층과 운영, 제공자 이용 정책의 준수 설계까지 연결한다. 상위: [[tools|AI 엔지니어링 실천 도구]].

## 목차
- [x] [[LLM-Generation-Mechanics|LLM 동작 원리 (generation-mechanics/ 서브폴더) — AI 전체 지도, Training/Inference와 역전파, BPE 토크나이저 구성과 토크나이저 차이, 이미지와 사고 토큰 과금, Transformer QKV Attention과 Decoding, Weight/Context/RAG 구분, 프롬프트와 RAG와 파인튜닝 선택, Context Window와 대화 누적, 긴 컨텍스트 단가 구간, 환각과 Agent 연결, 비개발자 설명용 비유와 한계]]
- [x] [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (workflow/ 서브폴더) — 체인 vs 에이전트 선택과 절충, Plan-and-Execute, 콘텐츠 초안과 승인 대기열, n8n 오류 처리, Function Calling과 스킬 시스템, Text-to-SQL 맥락 구성과 생성/실행 권한 분리, 데이터 vs 모델과 환각 통제, 워크플로 표현식과 실행 경계]]
- [x] [[LLM-Operations|LLM 선택, 서빙과 운영 (operations/ 서브폴더) — 모델 티어 선택과 라우팅, 결정 모델, 추론 병목, 프롬프트 캐싱, 게이트웨이, 실패 처리]]
- [x] [[Event-Log-Highlight-Generation|이벤트 로그 기반 하이라이트]] — 로그 정규화, SQL 템플릿, 사실 검증과 검토 처리량
- [x] [[LLM-Product-Attribute-Extraction|상품 이미지의 속성 추출]] — OCR 후보 선별, 형식과 의미 검증, 보류 비율과 정확도
- [x] [[LLM-Provider-Usage-Policy|LLM 제공자 이용 정책과 제품 설계]] — Anthropic Usage Policy 2026 개정, 챗봇 AI 고지, 에이전트 준수 책임, 높은 위험 권고의 사람 검토, 물리 행동 요건, 제품 개발 체크포인트
