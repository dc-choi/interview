---
tags: [ai, llm, transformer, training, inference, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Generation Mechanics", "LLM 동작 원리", "대규모 언어 모델 동작 원리"]
---

# LLM 동작 원리: 학습부터 생성과 에이전트까지

LLM은 학습 단계에서 데이터의 통계적 패턴을 가중치에 반영하고, 추론 단계에서 현재 컨텍스트와 가중치로 다음 토큰의 분포를 계산한다. 에이전트는 이 모델에 Runtime, 도구, 상태와 검증 정책을 붙인 시스템이다.

아래 흐름은 GPT 계열과 같은 **decoder-only 자기회귀 텍스트 LLM**을 중심으로 한 학습용 모델이다. 모든 언어 모델이 같은 구조와 학습 단계를 쓰는 것은 아니며, 멀티모달 모델과 encoder-decoder 모델은 입력 표현과 생성 구조가 다를 수 있다.

- [[LLM-Generation-Mechanics-Training|학습과 사전학습 이후 조정]]: AI 전체 지도, Training과 Inference 구분, Forward Pass와 Loss, Backpropagation, Pretraining, SFT, RLHF, DPO, LoRA와 QLoRA의 파라미터 및 정밀도 구분
- [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]]: Token과 위치 표현, BPE 토크나이저 구성, 토크나이저 차이와 문자 단위 작업의 약점, 이미지와 사고 토큰 과금, Q, K, V Attention, Transformer Block, Logit에서 Greedy, Sampling, Temperature, Top-k, Top-p와 스트리밍까지
- [[LLM-Generation-Mechanics-Context-and-Agent|Context, 환각과 에이전트]]: Weight와 Context와 RAG와 Memory 구분, 프롬프트, RAG와 파인튜닝의 선택과 파인튜닝 제공 범위, Context Window와 대화 누적, 벤더별 긴 컨텍스트 단가 구간, 대화 요약과 별도 작업 기록, 환각이 생기는 조건, Tool Call과 Runtime, 자주 헷갈리는 점
- [[LLM-Generation-Mechanics-Analogies|비개발자 설명용 비유와 한계]]: 학습 때 정해지는 것과 요청마다 고르는 것, 어휘와 학습 토큰과 파라미터와 컨텍스트 수량의 구분, 학습과 추론 비유가 맞는 부분과 깨지는 지점, 모델 바깥 용어(멀티모달, 컨텍스트 엔지니어링, 지식 베이스와 RAG, MCP, 에이전트, 워크플로우 자동화, 하네스, 지시 파일과 훅, 루프와 그래프 엔지니어링, AGI와 ASI)의 비유와 바꾸는 대상

## 함께 볼 문서

- [[LLM-Pretraining-Data-Pipeline|사전학습 데이터 파이프라인]]: 웹 크롤 정제(안전 필터, 본문 추출, 중복 제거, 휴리스틱과 모델 기반 품질 필터), 실험으로 정하는 데이터 혼합, 어닐링과 긴 문맥 단계
- [[LLM-Scaling-Laws|LLM 스케일링 법칙]]: 손실의 거듭제곱 법칙, 6ND 연산 어림, Chinchilla의 연산 최적 배분과 추론 비용을 넣은 과학습, 작은 실험으로 큰 학습 정하기
- [[LLM-Post-Training|사후학습]]: SFT의 손실과 데이터 양, 보상 모델과 PPO의 KL 벌점, DPO 유도, 길이 편향과 판정 일치율, 따로 미세조정한 모델의 가중치 병합(평균, 과제 벡터, 간섭)
- [[LLM-Training-Throughput|LLM 학습 처리량]]: 연산량에서 GPU 시간으로, MFU와 HFU, 활성값 체크포인팅의 메모리와 연산 교환, 메모리에 묶인 연산과 커널 융합, 혼합 정밀도 학습
- [[AI-Generated-Text-Readability|AI 생성 글의 처리 난도]]: 처리 난도 대리 지표, 왕복 번역 기준선과 검증 가능한 보상의 정보 밀도 압력 가설, 명료성 결함 세 가지(숨은 행위자, 모호한 표현, 빈 문장)와 AI 탐지의 구분
- [[Linear-Attention|선형 어텐션]]: 특징 맵, 정규화 분모, 인과 누적 상태와 softmax와의 차이, 공개 모델의 하이브리드 층 배치와 KV 캐시
- [[Diffusion-Language-Models|확산 언어 모델]]: 마스크 확산 학습, 단계별 확정과 remasking, 블록 확산의 가변 길이와 KV 캐시, 자기회귀와의 속도 비교 조건, Mercury 계열의 공개 범위, 수준별 생성(NCM)
- [[Reasoning-Model-Test-Time-Compute|추론 모델의 사고 길이]]: 사고 토큰이 다음 계산의 입력이 되는 원리, 학습 시점과 추론 시점 계산, DeepSeek-R1-Zero의 규칙 보상과 GRPO, 과잉 사고의 효율 지표와 완화, 추론 시점 계산의 역 스케일링과 측정 설계
- [[Latent-Reasoning|잠재 추론]]: 은닉 상태를 다음 입력으로 되먹이는 원리, 텍스트 사고 토큰과의 비교, 도구 호출과 가독성 한계, 어댑터와 KV 작업 메모리를 쓰는 하이브리드 에이전트, 측정 조건과 서빙 제약, 층을 반복하는 트랜스포머의 직렬 깊이와 CoT 감시, 이미 학습한 모델을 반복형으로 바꾼 GLM-5.4의 게이트와 KV 캐시 공유
- [[Audio-Token-Generation|음악과 소리 생성]]: 신경망 오디오 코덱과 RVQ, 코드북 펼치기 순서, 텍스트와 멜로디 조건, 상용 서비스의 공개 범위와 전이중 음성 대화
- [[Interactive-Video-Generation-Latency|상호작용 영상 생성의 지연 예산]]: 입력에서 첫 프레임까지의 지연과 생성 단위, 자기회귀 영상 확산의 디노이징, KV 캐시 갱신과 디코딩, 디노이징 밖의 병목, 픽셀 디코더와 KV 보정 네트워크(FastFrames), 해상도와 GPU 수의 비교 조건
- [[llm|LLM 원리와 운영]]
