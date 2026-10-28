---
tags: [gpu, inference, memory, kv-cache, intel, nvidia, tensor-core]
status: done
verified_at: 2026-10-16
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["GPU Inference Hardware", "추론용 GPU 선택", "Intel D270", "GeForce Tensor Rate", "gpu-unlock"]
---

# 추론용 GPU: 메모리 용량과 서비스 성능

추론 장비는 모델 가중치와 KV 캐시를 담을 용량, 메모리 대역폭, 연산 성능, 동시성과 지연 예산을 함께 평가한다. 모델이 메모리에 들어간다는 사실과 목표 속도로 응답한다는 사실은 다르다.

## 예산을 나누어 계산한다

- 가중치: 파라미터 수, 정밀도와 양자화 메타데이터.
- KV 캐시: 모델 구조, 컨텍스트 길이와 동시 세션 수.
- 실행 공간: framework buffer, activation과 여유 메모리.
- 랙: 전력, 공랭 흐름, 서버 슬롯과 네트워크.

대용량 메모리가 CPU offload나 여러 카드 간 전송을 줄일 수 있지만, 대역폭과 지원 커널이 부족하면 토큰 지연은 여전히 길 수 있다.

### KV 캐시와 장비 수를 연결한다

2026-10-22 JAX Scaling Book과 vLLM 공식 문서를 대조했다. 아래는 모든 계층의 KV 구조가 같고 요청 간 캐시 공유 없이 전체 문맥을 저장하는 Transformer의 근사이며, 특정 모델의 배포 보장이 아니다.

```text
KV 바이트 ≈ 2 × 계층 수 × KV head 수 × head 차원
           × KV 원소당 바이트 수 × 모든 동시 요청의 보관 토큰 수 합
```

앞의 2는 key와 value다. 요청마다 입력과 생성된 출력 토큰을 함께 센다. 같은 길이의 요청이라면 마지막 항은 요청당 토큰 수 × 동시 요청 수가 된다. 다른 조건이 같으면 길이나 동시성을 두 배로 늘릴 때 이 캐시 용량도 두 배가 된다. GQA에서는 query head 수 대신 KV head 수를 쓴다. 창 크기로 제한하거나 압축한 캐시에는 해당 구조의 계산이 필요하다.

가중치 하한은 [[LLM-Inference-Bottlenecks#로컬 추론의 용량과 지연을 따로 계산한다|기존 용량 계산]]을 따른다. 가중치, 캐시와 실행 공간을 합친 뒤에도 GPU 수로 균등 분할된다고 가정하지 않고 실제 배치와 GPU별 최대 사용량을 확인한다.

vLLM의 `GPU KV cache size` 로그는 보관 가능한 토큰 수를, `Maximum concurrency`는 설정된 최대 시퀀스 길이 기준 동시 요청 수의 추정치를 보여 준다. 이 추정치는 지연 목표를 만족하는 처리량의 실측값이 아니다.

### 병렬화는 연결 구조에 맞춘다

한 노드에 모델이 들어가지 않을 때 vLLM은 노드 안의 tensor parallelism(TP)과 노드 사이의 pipeline parallelism(PP)을 조합하는 구성을 안내한다. 하지만 TP와 NVLink를 모든 배포의 필수조건으로 삼지는 않는다. 공식 문서는 NVLink가 없는 L40S 같은 구성에서 통신 부담을 줄이기 위한 PP를 권한다. 모델과 엔진의 지원 범위를 확인한 뒤 같은 입력, 출력 길이와 동시성으로 비교한다.

## Intel D270 사례

2026-10-14 GeekNews 입력의 사양을 2026-10-16 공식 제품 페이지와 대조했다.

| 항목 | 공식 소개 사양 |
| --- | --- |
| 메모리 | 카드당 최대 480GB LPDDR5X |
| 연산 구성 | Xᵉ3P core 32개, XMX matrix engine 256개 |
| 전력과 냉각 | 350W, 공랭 |
| 연결 | PCIe 5.0 |
| 설계 방향 | 그래픽과 ray-tracing의 면적을 추론 연산에 재배분 |

큰 모델과 긴 컨텍스트를 적은 카드에 유지하려는 선택지다. 기존 공랭 서버 활용과 vLLM/PyTorch 생태계 지원은 벤더 소개이며, 모든 서버나 모델의 호환성과 동일 성능을 보장하지 않는다.

## 같은 칩도 제품 등급에 따라 텐서 연산 속도가 다르다

2026-10-27 NVIDIA GA102 아키텍처 백서(V2.0)와 대조했다. 두 카드 모두 GA102 칩이다. 값은 GPU Boost Clock 기준 피크이고, 슬래시 뒤는 sparsity를 쓴 유효 수치다.

| 텐서 연산 | GeForce RTX 3090 FE | RTX A6000 |
| --- | --- | --- |
| FP16 입력, FP16 누산 | 142/284 TFLOPS | 154.8/309.6 TFLOPS |
| FP16 입력, FP32 누산 | 71/142 TFLOPS | 154.8/309.6 TFLOPS |
| BF16 입력, FP32 누산 | 71/142 TFLOPS | 154.8/309.6 TFLOPS |
| TF32 | 35.6/71 TFLOPS | 77.4/154.8 TFLOPS |

GeForce는 FP32 누산 경로를 FP16 누산의 절반으로 표기하고, 전문가용 제품은 FP32 누산도 FP16 누산과 같은 속도로 표기한다. SM 수(82개와 84개)와 클럭 차이를 감안하면 GeForce의 TF32도 A6000의 절반 수준이다. 백서는 BF16 텐서 연산을 FP32 누산으로만 표기한다. PyTorch 2.14 문서는 FP16 GEMM 전체를 FP16으로 누산하려면 `torch.backends.cuda.matmul.allow_fp16_accumulation`을 따로 켜야 한다고 설명하고, 그 대가로 정밀도 저하와 overflow 위험을 적는다. 따라서 GeForce 카드에서 BF16 행렬곱과 FP16 누산을 켜지 않은 FP16 행렬곱의 성능은 FP16 누산 피크가 아니라 반속도 행으로 잡는다.

### 비공식 해제 모듈 gpu-unlock

2026-10-27에 정리한 Ampere 사례다. 2026-10-28 README의 1.1.0 스냅샷(`09305c468f7e`)에서 동작과 3090 Ti 측정표를 다시 확인했다. 같은 날 main은 2.0.0으로 바뀌었으므로 아래 범위를 현재 전체 지원 목록으로 읽지 않는다. 성능 수치는 프로젝트의 측정과 사용자 보고이며 재현하지 않았다.

- **동작:** 1.1.0 README는 GA102, GA103, GA104, GA106 카드의 FP32 누산 FP16/BF16 FMA 명령 발행 속도를 두 배로 올린다고 설명한다. TF32도 같은 README의 측정표에서 향상이 보고된다. 부팅 초기 initramfs에서 Linux 커널 모듈이 명령별 발행 속도를 정하는 속도 선택 레지스터(SS0, SS1)에 전속도 값을 쓰고 function level reset을 한 뒤, 수정하지 않은 NVIDIA 드라이버가 카드를 붙잡는다. 드라이버 바이너리를 직접 패치하지 않는 방식이지만 향후 드라이버와 펌웨어의 호환성을 보장하지는 않는다.
- **원리:** 이 레지스터는 heavy-secure 권한에서만 쓸 수 있다. 설계 문서는 SEC2 보안 프로세서가 실행하는 서명된 booter 펌웨어의 버퍼 오버플로를 ROP로 이용해 권한 마스크(PLM)를 바꾸고 host 쪽 쓰기를 열었다고 설명한다. 공개 테스트 키로 암호화된 디버그 booter를 복호화해 gadget을 찾았다. 제품 설정이 아니라 펌웨어 보안 경계를 공격하는 방식이다.
- **측정:** RTX 3090 Ti, 450W, dense 8192³ GEMM, FP32 누산, 5회 측정 중앙값에서 BF16 87.50→157.41, FP16 87.46→118.39, TF32 42.58→82.61 TFLOPS다. 사용자 보고의 BF16 GEMM 향상률은 카드에 따라 +25~84%이며 벤치마크가 제각각이라 서로 비교할 수 없다. 최저치(+25%)는 225W로 제한한 카드에서 나왔고, RTX 3080 Ti 20GB OEM(GA102-250)은 절차가 끝나도 BF16이 반속도에 머물렀다.
- **효과 범위:** 행렬 연산 비중이 큰 LLM 프리필(보고 범위 +14~36%), 확산 모델과 FlashAttention은 빨라지지만 메모리 대역폭에 묶인 LLM 디코드와 INT8 작업은 거의 같다. 출력을 비교한 보고에서는 해제 전후 결과가 비트 단위로 같았다. 병목 구분은 [[LLM-Inference-Bottlenecks#프리필과 디코드는 병목이 다르다|프리필과 디코드의 병목]]을 따른다.
- **운영 조건:** 커널 명령줄에 `gpu_unlock.targets=`가 없으면 아무것도 하지 않는다. 부팅 뒤 수동으로 올린 모듈은 nvidia가 이미 붙잡은 카드를 바꾸지 못한다. RAM 절전에서 복귀할 때 다시 해제하고(복귀 약 1초 증가) 최대 절전은 지원하지 않는다. 펌웨어가 멈추지 않으면 DMA 버퍼를 다음 전원 차단까지 유지하므로 다시 시도하기 전에 전원을 끈다.

도입 전에는 다음을 확인한다.

- **약관:** NVIDIA 드라이버 라이선스(2025-02-25판)는 소프트웨어의 기술적 제한과 보안 메커니즘 우회(2.6조), 바이너리 역공학(2.2조)을 금지하고, GeForce와 Titan용 소프트웨어의 데이터센터 배포를 허용하지 않는다(2.8조). 이 모듈은 NVIDIA 드라이버 패키지에서 추출한 펌웨어를 쓰며, 프로젝트도 NVIDIA 펌웨어의 공개 재배포 승인을 주장하지 않는다고 고지한다. 약관 위반 여부와 하드웨어 보증에 미치는 영향은 이 문서에서 판단하지 않았으므로 법적 검토와 제조사 약관으로 따로 확인한다.
- **보안과 유지보수:** DMA 접근이 가능한 제3자 커널 모듈과 펌웨어 공격 체인의 신뢰성을 검토한다. Secure Boot/lockdown 환경의 모듈 서명 요건, 커널 갱신 때 재빌드, 지정 booter 펌웨어 의존성과 향후 NVIDIA 갱신으로 해제가 막힐 가능성을 배포 전 확인한다(도입 점검안, 이 환경에서 시험하지 않음).
- **전력과 냉각:** 향상폭이 전력 한도에 크게 좌우된다. 성능과 함께 전력 한도, 온도와 클럭을 기록한다. 일부 카드는 450W까지 올려야 효과가 크다는 사용자 의견이 있으므로 냉각 여유도 확인한다(커뮤니티 의견).
- **서빙 효과:** GEMM 향상률을 서비스 처리량으로 옮기지 않는다. 배치를 채운 vLLM 서빙에서 실제 향상이 7~8%였다는 사용자 보고도 있다(미검증). 같은 모델, 배치와 입출력 길이로 첫 토큰 지연과 토큰 간 지연을 따로 잰다.

## 구매 및 배포 전 확인

같은 모델, 정밀도와 동시성으로 첫 토큰 지연, 토큰 간 지연, 총처리량과 전력 사용량을 측정한다. 드라이버, framework 버전과 실제 사용 가능한 커널도 고정한다. 최대 메모리 사양을 실제 서비스 용량으로 그대로 계산하지 않는다.

제품 사양만 대조했으며 장비 접근과 실측은 하지 않았다.

## 출처

- [JAX Scaling Book, All About Transformer Inference](https://jax-ml.github.io/scaling-book/inference/) — 2026-10-22, KV 캐시 식과 head 구성 대조
- [vLLM, Parallelism and Scaling](https://docs.vllm.ai/en/stable/serving/parallelism_scaling/) — 2026-10-22, 캐시 용량 로그와 병렬화 안내 대조. Intel 제품 사양은 이번에 재검증하지 않아 frontmatter 날짜를 유지한다.
- [Intel, GPU D270 Inference-Optimized Data Center GPU](https://www.intel.com/content/www/us/en/products/details/discrete-gpus/data-center-gpu/d-series.html)
- [NVIDIA, Ampere GA102 GPU Architecture Whitepaper V2.0](https://www.nvidia.com/content/PDF/nvidia-ampere-ga-102-gpu-architecture-whitepaper-v2.pdf) — 2026-10-27, RTX 3090과 RTX A6000의 텐서 피크 대조
- [PyTorch 2.14, CUDA semantics](https://docs.pytorch.org/docs/2.14/notes/cuda.html) — 2026-10-27, FP16 누산 설정 대조
- [NVIDIA, NVIDIA Driver License Agreement](https://www.nvidia.com/en-us/drivers/nvidia-license/) — 2026-10-27, 2025-02-25판 2.2, 2.6, 2.8조 대조. 새 절만 대조했으므로 frontmatter 날짜를 유지한다.
- [gpu-unlock README 1.1.0 — Zagitta](https://github.com/Zagitta/gpu-unlock/blob/09305c468f7e675562c3869aba883527094979fb/README.md) — 2026-10-28 동작, 3090 Ti 측정과 부팅 절차 재대조. 카드별 사용자 보고는 2026-10-27 정리 기록
- [How Nvidia Ampere generation GPUs got unlocked — Zagitta](https://github.com/Zagitta/gpu-unlock/blob/main/docs/How%20Ampere%20was%20unlocked.md) — 2026-10-27 booter 취약점과 PLM 설명 대조
- [Firmware provenance and distribution scope — Zagitta](https://github.com/Zagitta/gpu-unlock/blob/main/firmware/NOTICE.md) — 2026-10-27 펌웨어 출처와 재배포 고지 대조
- [GPU-unlock - RTX 30 시리즈의 AI 연산 성능 제한을 해제하는 Linux 모듈 — GeekNews](https://news.hada.io/topic?id=35938) — 소개 글과 Hacker News 의견 번역. 전력과 서빙 효과의 사용자 의견 출처

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목과 메모리 예산]]
