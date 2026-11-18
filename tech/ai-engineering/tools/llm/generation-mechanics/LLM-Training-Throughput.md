---
tags: [ai, llm, training, gpu, performance]
status: done
verified_at: 2026-11-19
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Training Throughput", "LLM 학습 처리량", "Model FLOPs Utilization", "Mixed Precision Training", "혼합 정밀도 학습", "Kernel Fusion", "커널 융합", "Activation Checkpointing", "활성값 체크포인팅"]
---

# LLM 학습 처리량: MFU, 혼합 정밀도와 커널 융합

학습 연산량(FLOPs)은 GPU가 실제로 낸 처리량으로 나눠야 시간과 비용이 된다. 연산 예산을 정하는 일은 [[LLM-Scaling-Laws|LLM 스케일링 법칙]]이, 같은 예산을 더 짧은 시간에 끝내는 일은 이 문서가 다룬다. 장비를 늘려도 처리량이 비례해 늘지 않을 수 있다. Llama 3는 GPU를 8,192장에서 16,384장으로 늘리면서 전체 배치 크기를 유지하려고 데이터 병렬 그룹당 배치를 줄였고, MFU가 43%에서 41%로 내려갔다. 상위: [[LLM-Generation-Mechanics|LLM 동작 원리]].

## 연산량을 GPU 시간으로 바꾼다

```text
GPU 시간 ≈ 학습 FLOPs ÷ GPU 한 장의 실제 처리량(FLOP/s)
실제 처리량 = 피크 FLOP/s × MFU
```

Llama 3 405B의 사전학습 연산 3.8×10^25 FLOPs를 보고서 표 4의 GPU당 처리량 400 TFLOP/s(16,384장 구성, BF16 MFU 41%)로 나누면 약 9.5×10^10 GPU초, 즉 약 2,640만 GPU 시간이다. 16,384장이면 약 67일이다. 모델 카드가 밝힌 Llama 3.1 405B의 학습 시간은 3,084만 GPU 시간(H100-80GB, TDP 700W)으로 이 어림보다 크다. 처리량이 더 낮은 긴 문맥 단계(380 TFLOP/s)와 중단 뒤 재시작이 어림에 빠져 있기 때문으로 보인다(해석). Llama 3 보고서는 54일 동안 작업 중단 466번을 겪으면서 경과 시간 중 실제 학습에 쓴 비율(effective training time)을 90% 넘게 유지했다고 적는다. 동기식 학습이라 GPU 한 장의 고장도 작업 전체의 재시작으로 이어질 수 있어 이 비율을 따로 관리한다.

비용은 이 GPU 시간에 시간당 단가를 곱해 어림한다. 단가는 시점, 공급처와 계약 조건에 따라 다르므로 기준일을 붙인다.

### 중단, 체크포인트 저장, 네트워크와 전력

같은 보고서의 3.3절은 중단, 저장소, 네트워크와 전력에 관한 운영 조건도 적는다(arXiv v3 기준).

- **중단의 원인**: 54일 동안의 466번 중단 중 47번은 자동 유지보수 같은 계획된 중단이고 419번이 예상하지 못한 중단이다. 예상하지 못한 중단의 약 78%는 확인됐거나 의심되는 하드웨어 문제(GPU나 호스트 부품 고장, silent data corruption, 계획에 없던 호스트 유지보수)로 분류됐고, GPU 문제가 58.7%로 가장 큰 범주다. 표 5에서는 고장 난 GPU가 30.1%, GPU의 HBM3 메모리가 17.2%다(30.1%와 이를 포함해 합산한 58.7%는 표에 인쇄된 값이며, 건수로 계산하면 148/419는 35.3%, GPU 범주 268건은 64.0%다). 중단이 많았지만 큰 수동 개입이 필요했던 것은 세 번이고 나머지는 자동화가 처리했다.
- **체크포인트 저장**: Meta의 분산 파일 시스템 Tectonic으로 SSD 서버 7,500대, 240PB의 저장소를 꾸렸고 지속 처리량 2TB/s, 최대 7TB/s를 낸다. GPU마다 1MB~4GB의 모델 상태를 짧은 시간에 몰아 쓰는 체크포인트 쓰기가 저장소를 잠깐 포화시키는 것이 주된 난제로 꼽힌다. 보고서는 체크포인트 중 GPU 정지 시간을 줄이고 체크포인트를 더 자주 남겨 중단 뒤 잃는 작업을 줄이는 것을 목표로 든다.
- **GPU 사이 연결**: 405B는 RoCE, 작은 모델은 InfiniBand 클러스터에서 학습했고 두 클러스터 모두 GPU 사이를 400Gbps로 잇는다.
- **전력 변동**: 수만 장의 GPU가 체크포인트나 집합 통신이 끝나기를 함께 기다리거나 작업 전체가 시작하고 멈출 때 동시에 전력을 올리고 내려, 데이터센터 전력이 순간적으로 수십 MW 단위로 출렁일 수 있고, 보고서는 이것이 전력망의 한계를 시험한다고 적는다.
- **환경 요인**: 낮 시간의 높은 기온이 GPU의 동적 전압, 주파수 조절에 영향을 줘 하루 주기로 처리량이 1~2% 변한 것도 관측됐다.

학습은 수많은 GPU가 한 작업으로 묶여 몇 주에서 몇 달 동안 쉬지 않고 도는 일이라, 고장과 재시작, 체크포인트 저장이 처리량과 함께 학습 기간에 영향을 준다(해석). 사용자 요청에 맞춰 짧게 반복되는 추론의 병목은 [[LLM-Inference-Bottlenecks|LLM 추론 병목]]이 다룬다.

## MFU는 모델이 필요로 하는 연산만 센다

PaLM 논문은 MFU(Model FLOPs Utilization)를 관측한 처리량(초당 토큰 수)을 피크 FLOP/s에서의 이론 최대 처리량으로 나눈 값으로 정의했다. 이론 최대에는 순전파와 역전파에 꼭 필요한 연산만 들어간다. 활성값을 저장하지 않고 역전파 때 순전파 일부를 다시 계산하는 rematerialization의 연산까지 센 HFU(Hardware FLOPs Utilization)는 구현과 측정 방식에 따라 값이 달라지므로, 서로 다른 시스템을 비교하기에는 MFU가 낫다는 설명이다.

이 재계산은 메모리가 모자랄 때 일부러 쓰는 기법이다. 활성값 체크포인팅(gradient checkpointing)은 지정한 구간이 만든 중간 텐서를 역전파 때까지 보관하지 않고, 역전파에서 그 구간을 다시 실행해 만든다. 활성값 메모리를 줄이는 대신 순전파 일부를 한 번 더 계산하므로 단계당 시간이 늘고, 그 연산까지 세는 HFU가 MFU보다 높게 나온다. PyTorch 2.15의 `torch.utils.checkpoint` 문서는 이를 연산과 메모리를 맞바꾸는 기법으로 설명하고 `use_reentrant=False`를 명시해 쓰라고 권한다.

| 사례 | 값 |
|---|---|
| PaLM 540B, TPU v4 6,144개 | MFU 46.2%, HFU 57.8% |
| Llama 3 405B, GPU 8,192장 | BF16 MFU 43%, GPU당 430 TFLOP/s |
| Llama 3 405B, GPU 16,384장 | 41%, 400 TFLOP/s |
| Llama 3 405B, 긴 문맥(시퀀스 131,072) | 38%, 380 TFLOP/s |

MFU를 깎는 요인에는 아래의 메모리에 묶인 연산과 GPU 사이의 통신이 있다. MFU는 학습이 도는 동안의 효율이고, 중단과 재시작으로 잃는 시간은 위의 실제 학습 시간 비율로 따로 본다.

## 계산보다 메모리 접근이 먼저 막힌다

FlashAttention 논문(2022)의 설명으로 GPU 메모리 계층을 보면, A100은 40~80GB의 HBM(대역폭 1.5~2.0TB/s)과 108개 SM(streaming multiprocessor)마다 192KB의 온칩 SRAM(추정 약 19TB/s)을 가진다. SRAM은 HBM보다 한 자릿수 빠르지만 용량은 여러 자릿수 작다. 연산 속도가 메모리 속도보다 빨리 좋아져 많은 연산이 HBM 접근에 묶인다.

| 구분 | 시간을 정하는 것 | 예 |
|---|---|---|
| 연산에 묶임(compute-bound) | 산술 연산 수 | 안쪽 차원이 큰 행렬곱, 채널이 많은 합성곱 |
| 메모리에 묶임(memory-bound) | 메모리 접근 수 | 활성화 함수, dropout 같은 원소별 연산과 합, softmax, layer norm 같은 축약 |

GPU에서 연산 하나(커널)는 입력을 HBM에서 레지스터와 SRAM으로 읽고, 계산하고, 결과를 HBM에 쓴다. 산술 강도와 루프라인으로 병목을 가르는 방법은 [[LLM-Inference-Bottlenecks#멘탈 모델 — 루프라인과 arithmetic intensity|LLM 추론 병목]]과 같다.

## 커널 융합은 메모리 왕복을 줄인다

같은 입력에 원소별 연산 두 개를 차례로 적용하면, 따로 실행할 때는 첫 연산의 결과를 HBM에 썼다가 둘째 연산이 다시 읽는다. 두 연산을 한 커널로 융합하면 입력을 한 번 읽고 결과를 한 번 쓴다. FlashAttention 논문은 커널 융합을 메모리에 묶인 연산을 빠르게 하는 가장 흔한 방법으로 들고, 컴파일러가 원소별 연산의 상당수를 자동으로 융합할 수 있다고 설명한다. 다만 학습에서는 역전파에 쓸 중간값을 HBM에 저장해야 하므로 단순한 융합의 효과가 줄어든다. attention의 점수 행렬을 HBM에 쓰지 않도록 계산을 묶은 사례가 FlashAttention이다([[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]]의 FlashAttention 단락).

```python
import torch

def f(x):
    return x.cos().cos()  # eager 실행: 연산마다 커널을 띄우고 중간 결과를 GPU 메모리에 쓴다

f_compiled = torch.compile(f)  # 기본 백엔드(inductor)로 최적화한 커널을 JIT 컴파일한다
```

PyTorch 튜토리얼은 `torch.compile`의 속도 향상이 주로 Python 오버헤드와 GPU 메모리 읽기와 쓰기를 줄이는 데서 나온다고 설명한다. 향상 폭은 모델 구조와 배치 크기에 따라 달라지고, GPU 연산 자체가 병목이면 작다. 튜토리얼의 한 예는 약 2.8배였지만 일반적인 배수로 옮기지 않는다. `reduce-overhead` 모드는 CUDA graph로 Python 오버헤드를 더 줄이는 대신 메모리를 더 쓸 수 있다. TPU에서의 컴파일 경로는 [[PyTorch-on-TPU|PyTorch on TPU]]가 다룬다.

## 혼합 정밀도 학습

16비트 부동소수점은 32비트보다 저장 공간과 대역폭을 절반만 쓰고 최신 GPU에서 산술도 빠르다. 하지만 표현 범위가 좁아 그대로 학습하면 정보가 사라진다. Micikevicius et al.(ICLR 2018)은 가중치, 활성값과 기울기를 FP16으로 저장하면서 세 가지 기법을 제안했다.

1. **FP32 마스터 가중치**: 옵티마이저 단계의 갱신은 FP32 사본에 누적하고, 순전파와 역전파에는 그 사본을 FP16으로 반올림해 쓴다.
2. **손실 스케일링**: 손실에 배수를 곱해 역전파의 작은 기울기가 FP16에서 0이 되지 않게 하고, 갱신 전에 다시 나눈다.
3. **FP32 누산**: FP16 곱셈의 부분합을 FP32로 누산한 뒤 메모리에 쓸 때 FP16으로 바꾼다.

FP32 사본이 필요한 경로는 둘이다. 기울기에 학습률을 곱한 갱신량이 2^-24보다 작으면 FP16에서 0이 된다(논문의 음성 모델에서는 가중치 기울기의 약 5%가 이 범위였다). 갱신량을 표현할 수 있어도 가중치가 갱신량보다 2,048배 넘게 크면, 10비트 가수로 자리를 맞춰 더하는 과정에서 갱신이 사라진다. FP32 사본 없이 FP16 가중치를 직접 갱신한 그 음성 모델은 상대 정확도가 80% 떨어졌다. 사본 때문에 가중치 메모리는 FP32 학습보다 50% 늘지만, 학습 메모리의 대부분은 FP16으로 저장하는 활성값이라 전체 사용량은 대략 절반이 된다. 논문은 FP32 마스터 가중치가 모든 망에 필요한 것은 아니라고도 적는다.

PyTorch AMP에서는 `torch.autocast`가 연산마다 정밀도를 고른다. CUDA에서 `matmul`, `linear`, `conv2d` 같은 연산은 float16으로, `softmax`, `log_softmax`, `layer_norm`, `exp`, `sum`과 많은 손실 함수는 float32로 실행하며, 모델이나 입력에 `half()`를 직접 호출하지 않는다. float16 학습에서는 `GradScaler`가 손실 스케일링을 맡고 옵티마이저 단계 전에 기울기를 원래 크기로 되돌린다. 문서의 CPU bfloat16 학습 예는 `GradScaler` 없이 `autocast`만 쓴다. Llama 3 405B의 MFU도 BF16 기준으로 보고됐다.

학습 정밀도는 추론용 가중치 양자화나 QLoRA의 저장 정밀도와 다른 선택이다([[LLM-Generation-Mechanics-Training#LoRA와 QLoRA: 바꾸는 파라미터와 저장 정밀도|LoRA와 QLoRA]], [[Model-Release-Claims#필요 메모리는 실행기와 정밀도를 붙여 읽는다|필요 메모리]]).

## 운영 체크포인트

- 처리량 개선은 같은 모델, 시퀀스 길이, 배치와 장비에서 MFU와 단계당 시간으로 비교한다(적용 제안).
- 프로파일러로 메모리에 묶인 원소별 연산이 많은 구간을 찾아 융합이나 컴파일을 시험하고, 바꾼 뒤 수치 결과가 같은지 확인한다(적용 제안).
- 정밀도를 바꿨다면 같은 조건에서 손실 곡선과 검증 성능을 비교하고, float16이면 손실 스케일 값과 NaN 발생을 기록한다. PyTorch 문서도 NaN이 반복되면 모델이 fp16과 맞지 않을 수 있다고 안내한다.
- 장비 수를 늘릴 때는 GPU당 처리량과 실제 학습 시간 비율을 함께 본다.

## 이해 점검

1. MFU와 HFU가 같은 학습에서 다른 값을 내는 이유는 무엇인가?
2. 원소별 연산 두 개를 융합하면 줄어드는 것은 계산량인가, 메모리 접근인가?
3. FP16 학습에서 FP32 마스터 가중치가 없으면 작은 갱신이 사라지는 두 경로는 무엇인가?
4. 3.8×10^25 FLOPs를 GPU당 400 TFLOP/s로 나눈 어림이 보고된 GPU 시간보다 작게 나오는 이유는 무엇인가?
5. 활성값 체크포인팅을 켜면 학습 메모리, 단계당 시간, MFU와 HFU는 각각 어느 쪽으로 움직이는가?

## 출처

- [PaLM: Scaling Language Modeling with Pathways — Chowdhery et al.](https://arxiv.org/abs/2204.02311) — 2026-11-18 대조. 4.1절 MFU와 HFU, 표 3, 부록 B 계산식
- [The Llama 3 Herd of Models — Llama Team, AI @ Meta](https://arxiv.org/abs/2407.21783) — 2026-11-18 대조. 3.3.1절 장비, 3.3.2절의 표 4와 MFU, 3.3.4절 중단과 실제 학습 시간 비율. 2026-11-19 v3의 3.3.1절 저장소와 네트워크, 3.3.4절 중단 분류(표 5)와 전력 변동 대조
- [Llama 3.1 Model Card — GitHub, meta-llama](https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md) — 2026-11-18 학습 GPU 시간과 장비 확인
- [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness — Dao et al.](https://arxiv.org/abs/2205.14135) — 2026-11-18 2.1절 메모리 계층, 실행 모델, 연산 분류와 커널 융합 대조
- [Mixed Precision Training — Micikevicius et al.](https://arxiv.org/abs/1710.03740) — 2026-11-18 대조. 초록, 3.1절 FP32 마스터 가중치, 3.2절 손실 스케일링, 3.3절 산술 정밀도
- [PyTorch 2.15, Automatic Mixed Precision package - torch.amp](https://docs.pytorch.org/docs/2.15/amp.html) — 2026-11-18 autocast 연산 목록, GradScaler와 CPU 예 확인
- [PyTorch Tutorials, Introduction to torch.compile](https://docs.pytorch.org/tutorials/intermediate/torch_compile_tutorial.html) — 2026-11-18 속도 향상의 출처와 조건 확인
- [PyTorch 2.15, torch.compile](https://docs.pytorch.org/docs/2.15/generated/torch.compile.html) — 2026-11-18 기본 백엔드와 모드 확인
- [PyTorch 2.15, torch.utils.checkpoint](https://docs.pytorch.org/docs/2.15/checkpoint.html) — 2026-11-18 연산과 메모리의 교환, 역전파에서의 재계산과 `use_reentrant` 권고 확인
- [YouTube, Stanford CS229, Building Large Language Models (LLMs)](https://www.youtube.com/watch?v=9vM4p9NN0Ts) — 2024-08-27 업로드. 정리의 계기이며 계산과 수치는 위 논문, 보고서와 공식 문서로 대조했다
- [YouTube, 디케이앤유, AI 학습과 추론, 인프라가 어떻게 다른가](https://www.youtube.com/watch?v=DDFR7NZxpVw) — 2026-11-12 업로드. 중단, 저장과 전력 단락의 계기이며 수치는 Llama 3 보고서로 대조했다
- [YouTube, Marina Wyss, AI Engineering in 76 Minutes (Complete Course/Speedrun!)](https://www.youtube.com/watch?v=JV3pL1_mn2M) — 2025-04-01 업로드. Chip Huyen의 책 AI Engineering(O'Reilly Media, 2025)을 요약한 강의로 활성값 체크포인팅 단락의 계기다. 사실은 PyTorch 문서로 대조했다

## 관련 문서

- [[LLM-Generation-Mechanics|LLM 동작 원리 (묶음 인덱스)]]
- [[LLM-Scaling-Laws|LLM 스케일링 법칙]] — 6ND 연산량 어림
- [[LLM-Generation-Mechanics-Training|학습과 사전학습 이후 조정]] — ZeRO의 학습 상태 분할
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]] — 루프라인과 디코드의 메모리 병목
- [[GPU-Inference-Hardware|GPU 추론 하드웨어]] — 정밀도별 연산 성능 표기
- [[PyTorch-on-TPU|PyTorch on TPU]] — TPU의 정밀도 모드와 torch.compile
- [[HBM-Stack-and-Base-Die|HBM과 메모리 계층]]
- [[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]] — FlashAttention의 메모리와 FLOPs
