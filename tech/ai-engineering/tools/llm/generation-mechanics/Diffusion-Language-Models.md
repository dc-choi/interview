---
tags: [ai, llm, diffusion, generation, inference]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["Diffusion Language Models", "확산 언어 모델", "dLLM", "Masked Diffusion Language Model", "Block Diffusion"]
---

# 확산 언어 모델: 여러 위치를 함께 채우고 단계마다 확정하는 생성

확산 언어 모델은 토큰을 왼쪽부터 하나씩 덧붙이지 않고, 가려진 여러 위치를 한 단계에서 함께 예측한 뒤 여러 단계에 걸쳐 결과를 확정한다. 자기회귀 모델([[LLM-Generation-Mechanics-Decoding|추론과 디코딩]])은 한 번의 순전파로 다음 토큰 하나를 확정하고 앞 토큰의 계산을 KV 캐시로 재사용한다. 확산 모델은 한 단계에서 여러 토큰을 확정할 수 있는 대신 같은 위치를 여러 단계에 걸쳐 다시 계산한다. 이 문서는 2026-10-27에 MDLM, Block Diffusion, ReMDM, LLaDA, Mercury 논문과 Kuleshov 연구실의 해설, Inception의 공식 발표와 문서를 대조한 기준이다. MDLM, Block Diffusion, ReMDM 논문은 Kuleshov가 마지막 저자로 참여한 연구이고 해설도 같은 연구실 블로그에 실렸다. Kuleshov는 Mercury를 만든 Inception을 함께 이끌고(2025-02 TechCrunch 보도) Mercury 기술 보고서의 저자이기도 하므로, 해설의 비교와 평가는 공급사 쪽 설명과 같은 무게로 읽는다.

## 학습: 가리고 복원한다

- **노이즈는 마스킹이다**: 마스크 확산(masked diffusion)은 깨끗한 문장마다 0과 1 사이의 노이즈 수준 t를 뽑고, 그 비율만큼 토큰을 마스크로 바꾼다. 양방향 트랜스포머가 가려진 원래 토큰을 맞히도록 교차 엔트로피로 학습한다.
- **BERT와의 차이는 마스킹 비율의 분포다**: BERT는 고정된 비율로 가리지만 마스크 확산은 비율을 매번 무작위로 바꾼다. MDLM 논문(NeurIPS 2024)은 이 목적함수를 고전적인 마스크 언어 모델링 손실의 혼합으로 단순화했고, Kuleshov 연구실 해설은 이를 생성형 BERT라고 부른다. 손실이 로그 가능도의 변분 하한에서 나오므로 perplexity의 상한을 계산해 자기회귀 모델의 perplexity와 비교할 수 있다. MDLM과 Block Diffusion 논문은 확산 모델의 perplexity를 모두 상한으로 표기하므로, 확산 쪽 값은 실제보다 나쁘게 나올 수 있는 보수적인 추정이다.
- **처음부터 학습한 큰 모델**: LLaDA 논문(2025-02)은 8B 모델을 사전학습과 SFT 모두 이 방식으로 학습해, 저자들이 직접 만든 자기회귀 기준선과 비슷한 성능과 지시 수행 능력을 보고했다. 같은 연구진의 비교 조건에서 나온 결과다.

## 생성: 전부 가린 상태에서 단계마다 확정한다

1. 출력할 길이만큼 모두 마스크인 시퀀스에서 시작한다.
2. 단계마다 모든 빈칸을 예측하고, 그중 일부만 확정한 뒤 나머지는 다시 가린다. 확정 순서가 왼쪽에서 오른쪽일 필요는 없다.
3. 단계 수가 속도와 품질을 맞바꾸는 손잡이다. 단계를 줄이면 한 단계에서 확정하는 토큰이 늘어 빨라지지만, 서로 맞지 않는 토큰을 동시에 고를 위험이 커진다.

- **확정한 토큰을 고칠 수 있는가**: 기본 마스크 확산은 한 번 확정한 토큰을 바꾸지 못해 초기 오류가 쌓일 수 있다. 확정한 토큰을 다시 가리는 remasking, 마스크 대신 임의의 어휘 토큰으로 바꾸는 uniform-state 노이즈는 확정 뒤 수정을 허용하는 변형이다.
- **단계 수를 줄이는 증류**: 교사 모델의 두 단계를 학생 모델의 한 단계로 흉내 내도록 학습하는 일을 반복해 샘플링 단계를 절반씩 줄인다. 해설은 이런 방법이 모델 자신의 생성 결과로 학습한다는 점(on-policy)을 빠른 샘플링의 이유로 든다.

## 길이와 캐시: 블록 단위 생성

순수 확산 모델은 출력 길이를 미리 정해야 하고, 확정된 앞 토큰의 키와 값을 그대로 재사용하기 어렵다. Block Diffusion(ICLR 2025 Oral)은 시퀀스를 블록으로 나눠, 블록 안은 확산으로 생성하고 블록 사이는 앞 블록을 조건으로 차례로 생성한다.

- 블록을 더 이어 붙이는 방식으로 출력 길이를 미리 고정하지 않는다.
- 완성된 블록의 KV를 캐시해 다음 블록에서 재사용한다.
- 블록 크기가 1이면 자기회귀 생성에, 전체 길이면 순수 확산에 가까워지는 중간 지대다. 해설은 블록 크기를 배치 크기에 따라 달라지는 하드웨어의 연산 강도에 맞춰 조정할 수 있다고 설명한다([[LLM-Inference-Bottlenecks#프리필과 디코드는 병목이 다르다|프리필과 디코드]]).

## 자기회귀와 비교할 때의 트레이드오프

| 항목 | 자기회귀 | 확산(블록 확산 포함) |
|---|---|---|
| 한 번의 순전파가 확정하는 토큰 | 하나(추측 디코딩 제외) | 여러 개 |
| 같은 위치의 재계산 | 없음(KV 캐시) | 단계 수만큼 반복, 블록 확산은 완성 블록만 캐시 |
| 확정 뒤 수정 | 불가 | 변형에 따라 가능 |
| 출력 길이 | 종료 토큰까지 가변 | 순수 확산은 고정, 블록 확산은 블록 단위로 가변 |
| 주요 속도 손잡이 | 모델 크기, 양자화, 추측 디코딩 | 단계 수, 블록 크기, 증류 |

- **빠르다는 주장의 단위를 확인한다**: 사용자 한 명이 받는 초당 출력 토큰과 서버 전체의 처리량은 다르다. 자기회귀 디코드는 메모리 대역폭에 묶여 있어 배치를 키우면 처리량이 늘어나므로, 단일 요청 속도의 우위가 대규모 배치에서도 같은 비용 우위로 이어진다고 가정하지 않는다(이 문서의 판단).
- **품질과 단계 수의 관계는 샘플러마다 다르다**: ReMDM 논문(NeurIPS 2025, Table 1, OpenWebText 길이 1,024)은 품질과 다양성을 함께 보는 MAUVE로 샘플러를 비교했다. 확정한 토큰을 다시 가리는 ReMDM 샘플러는 단계를 128에서 512로 늘리면 0.057에서 0.350으로, 1,024에서 4,096으로 늘리면 0.403에서 0.656으로 올랐다(같은 표의 자기회귀 모델 0.760). 확정 뒤 수정이 없는 MDLM은 128에서 512 사이에 0.015에서 0.031로 오른 뒤 1,024 이상에서는 0.042, 0.037, 0.035로 더 오르지 않았다. 같은 논문은 생성 perplexity가 반복 문장처럼 다양성이 낮은 출력에도 낮은 값을 줄 수 있어 MAUVE를 주 지표로 썼다. 품질을 위해 단계를 늘리면 속도 이점이 줄어들므로, 단계 수와 샘플러를 밝히지 않은 속도와 품질 수치를 같은 설정의 결과로 읽지 않는다.
- **생태계 차이**: 서빙 엔진, 스트리밍과 구조화 출력은 자기회귀 모델을 기준으로 발전해 왔다. OpenAI 호환 API를 제공한다는 설명과 실제 기능 지원을 따로 확인한다.

## 사례: Mercury 계열의 공개 범위

- **Mercury Coder(2025-06 기술 보고서)**: 여러 토큰을 병렬로 예측하도록 학습한 트랜스포머 기반 확산 LLM이다. 보고서는 Artificial Analysis의 독립 측정으로 H100에서 Mini 1,109 tok/s, Small 737 tok/s를 제시한다. 배치, 정밀도와 프롬프트 구성은 초록에 없다.
- **Mercury 3(2026-10-19 Inception 발표)**: 총 파라미터가 Mercury 1의 40배 이상이라고만 밝히고 절대 파라미터 수와 가중치 공개 여부는 밝히지 않는다. NVIDIA GPU에서 1,068 tok/s라는 수치에는 GPU 종류와 개수, 측정 주체, 배치 크기가 없다. GPT-6 Luna와 Claude Haiku 5.5를 여러 벤치마크에서 앞선다고 하지만 벤치마크 이름, 점수와 추론 설정을 표로 밝히지 않는다. 2026-10-27 확인 기준 Artificial Analysis의 Inception 모델 목록에는 Mercury 3가 없고 Mercury 2.5(지수 12, v4.3.2, 714 tok/s)까지 있다.
- **호출 조건(공식 문서)**: 모델 ID는 `mercury-3`, 컨텍스트 1M, 최대 출력 131,072토큰이다. `reasoning_effort`는 instant, low, medium, high를 받고 temperature는 0.5~1.0이다. 100만 토큰당 정가는 입력 $0.20, 출력 $0.70이고 출시 할인가는 $0.10, $0.35(캐시 입력 $0.01)이며, 발표문은 할인 종료일을 밝히지 않는다. 자사 API와 OpenRouter, Baseten, Vercel로 제공하며 OpenAI API와 호환된다고 안내한다.

자체 보고 수치를 읽을 때의 조건은 [[Model-Release-Claims#속도와 지연은 측정 위치와 날짜를 붙인다|모델 발표 수치 읽기]]를 따른다.

## 점검 체크포인트

- 한 단계에서 여러 토큰을 확정할 때 생기는 불일치를 단계 수, remasking과 증류가 각각 어떻게 다루는지 설명할 수 있는가
- 블록 확산이 가변 길이와 KV 캐시 재사용을 되찾는 방식을 설명할 수 있는가
- 속도 주장에서 사용자당 속도, 배치 처리량, 단계 수와 하드웨어를 구분해 묻는가

## 출처

- [Simple and Effective Masked Diffusion Language Models — arXiv, Subham Sekhar Sahoo 외](https://arxiv.org/abs/2406.07524) — NeurIPS 2024, 마스크 언어 모델링 손실 혼합으로서의 목적함수, 반자기회귀 생성
- [Block Diffusion: Interpolating Between Autoregressive and Diffusion Language Models — arXiv, Marianne Arriola 외](https://arxiv.org/abs/2503.09573) — ICLR 2025 Oral, 고정 길이 한계, KV 캐시와 병렬 샘플링
- [Remasking Discrete Diffusion Models with Inference-Time Scaling — arXiv, Guanghan Wang 외](https://arxiv.org/abs/2503.00307) — NeurIPS 2025, Table 1의 단계 수별 MAUVE, 생성 perplexity의 한계
- [Large Language Diffusion Models — arXiv, Shen Nie 외](https://arxiv.org/abs/2502.09992) — LLaDA 8B, 자체 자기회귀 기준선과의 비교
- [Mercury: Ultra-Fast Language Models Based on Diffusion — arXiv, Inception Labs 외](https://arxiv.org/abs/2506.17298) — 2025-06-17, H100 처리량과 Artificial Analysis 독립 측정 표기, 저자 목록
- [How to Build a Diffusion Language Model — Kuleshov Group](https://kuleshov-group.github.io/blog/blog/2026/how-to-build-a-diffusion-language-model/) — 학습과 샘플링, remasking, uniform-state 노이즈, 블록 확산과 증류 해설, 작성자와 게시일 미표기
- [Inception emerges from stealth with a new type of AI model — TechCrunch, Marina Temkin](https://techcrunch.com/2025/02/26/inception-emerges-from-stealth-with-a-new-type-of-ai-model/) — 2025-02-26, Inception의 창업과 공동 리더
- [Introducing Mercury 3 — Inception](https://www.inceptionlabs.ai/blog/introducing-mercury-3) — 2026-10-19, 규모와 속도 주장, 가격과 제공 경로
- [Inception Docs, Models](https://docs.inceptionlabs.ai/get-started/models) — 2026-10-27 모델 ID, 컨텍스트, 최대 출력, 추론 강도와 가격 확인
- [Inception: Models — Artificial Analysis](https://artificialanalysis.ai/models/creators/inception) — 2026-10-27 열람, Mercury 3 미등재
- [Mercury 3 - 텍스트를 병렬로 생성하는 대규모 확산 기반 LLM — GeekNews](https://news.hada.io/topic?id=35658) — 학습 계기, 수치는 위 공식 자료로 대조
- [확산 언어 모델을 만드는 방법 — GeekNews](https://news.hada.io/topic?id=34095) — 해설 원문을 찾은 경로

## 관련 문서

- [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]] — 자기회귀 생성, 샘플링과 KV 캐시
- [[Linear-Attention|선형 어텐션]] — 어텐션 비용을 줄이는 다른 방향
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]] — 프리필과 디코드, 배칭과 추측 디코딩
- [[Audio-Token-Generation|음악과 소리 생성]] — 여러 토큰을 한 단계에 예측하는 다른 사례
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 속도와 벤치마크 주장의 조건
- [[LLM-Generation-Mechanics|LLM 동작 원리]]
