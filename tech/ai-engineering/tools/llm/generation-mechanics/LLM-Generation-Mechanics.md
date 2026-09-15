---
tags: [ai, llm, transformer, training, inference, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Generation Mechanics", "LLM 동작 원리", "대규모 언어 모델 동작 원리"]
---

# LLM 동작 원리: 학습부터 생성과 에이전트까지

LLM은 학습 단계에서 데이터의 통계적 패턴을 가중치에 반영하고, 추론 단계에서 현재 컨텍스트와 가중치로 다음 토큰의 분포를 계산한다. 에이전트는 이 모델에 Runtime, 도구, 상태와 검증 정책을 붙인 시스템이다.

아래 흐름은 GPT 계열과 같은 **decoder-only 자기회귀 텍스트 LLM**을 중심으로 한 학습용 모델이다. 모든 언어 모델이 같은 구조와 학습 단계를 쓰는 것은 아니며, 멀티모달 모델과 encoder-decoder 모델은 입력 표현과 생성 구조가 다를 수 있다.

- [[LLM-Generation-Mechanics-Training|학습과 사전학습 이후 조정]]: AI 전체 지도, Training과 Inference 구분, Forward Pass와 Loss, Backpropagation, Pretraining, SFT, RLHF, DPO
- [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]]: Token과 위치 표현, Q, K, V Attention, Transformer Block, Logit에서 Greedy, Sampling, Temperature, Top-k, Top-p까지
- [[LLM-Generation-Mechanics-Context-and-Agent|Context, 환각과 에이전트]]: Weight와 Context와 RAG와 Memory 구분, 환각이 생기는 조건, Tool Call과 Runtime, 자주 헷갈리는 점

## 함께 볼 문서

- [[llm|LLM 원리와 운영]]
