---
tags: [ai, llm, decision-model, classification, routing, calibration, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Decision Models", "결정 모델"]
---

# 결정 모델 (Decision Models, System One)

텍스트를 생성하지 않고 미리 정한 질문의 선택지마다 확률을 돌려주는 결정 모델을 정의와 동작 원리, 활용 예시, 모델 비교와 운영으로 나눠 둔다. 상위: [[LLM-Operations|LLM 선택, 서빙과 운영]].

## 목차

- [[LLM-Decision-Models-Mechanics|정의와 동작 원리]]: System One, state와 noul/choice/score 질문 스키마, 질문 간 독립성과 Speculative fan-out, 비자기회귀 채점과 입력 토큰 과금, 보정된 확률과 confidence 계산
- [[LLM-Decision-Models-Use-Cases|활용 예시]]: 에이전트 분기, 라우팅과 트리아지, 모더레이션과 가드레일, RAG 보조, 행동별 confidence 문턱과 Noul 문턱, 도구 기록을 선별하는 압축, OpenAI Decisions API의 요청과 실행 경계
- [[LLM-Decision-Models-Comparison|모델 비교, 한계와 운영 체크포인트]]: Jev와 Clef, Clef-flash의 제공 방식, 가격과 지연, Cloudflare 정확도 비교, 로컬 Laya와 MLX 포트, 과업별 미세조정 평가, Red Hat 가드레일 비교 평가, 닫힌 선택지와 Jev 1.13의 약점, 프롬프트 인젝션과 언어 한계, 운영 체크포인트

- [[LLM-Decision-Models-Calibration-Cases|보정과 버전 변경 사례]]: Qwen 토큰 제한 실험, Microsoft-Decision-1, Jev 1.14 실험 기능과 트롤리 질문의 표현 안정성

## 함께 볼 문서

- [[LLM-Operations|LLM 선택, 서빙과 운영]]
