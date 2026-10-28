---
tags: [tpu, pytorch, accelerator, xla, torch-compile, distributed-training]
status: done
verified_at: 2026-10-27
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["PyTorch on TPU", "TorchTPU", "TPU용 PyTorch 백엔드"]
---

# PyTorch on TPU: TorchTPU의 실행 모드와 이전 경계

TPU는 XLA 컴파일러 스택으로 프로그래밍한다. 일반 연산은 StableHLO, 사용자 커널은 더 낮은 수준의 Mosaic으로 내린다. PyTorch를 TPU에서 실행하는 방식은 lazy tensor로 그래프를 기록하던 PyTorch/XLA에서, PyTorch dispatcher에 TPU 백엔드를 등록해 eager 실행을 기본으로 하는 TorchTPU로 넘어가고 있다. Google Cloud 문서(2026-10-22 갱신)는 TorchTPU가 PyTorch/XLA를 대체한다고 밝히고, 새 워크로드는 TorchTPU로 시작하고 기존 PyTorch/XLA 워크로드도 이전하도록 권장한다.

2026-10-27 PyTorch 블로그(2026-10-21 갱신), Google Cloud 문서와 공식 저장소 README를 대조한 기준이다.

## 공개 상태

- **배경:** Google이 2025년 중반 시작해 Meta의 PyTorch 팀과 함께 만든 백엔드다. 2026-04-07 Google Developers Blog가 구조와 로드맵을 먼저 소개하며 공개 저장소를 그해 안에 내놓겠다고 예고했고, 2026년 10월 PyTorch 블로그가 `google-pytorch/torch_tpu` 오픈소스 저장소와 함께 공개를 알렸다. README 기준 라이선스는 Apache 2.0이다.
- **설치:** PyPI 최신 공개판은 0.2.0이고 Python 3.11 이상을 지원한다. `pip install torch_tpu==0.2.0 --extra-index-url https://download.pytorch.org/whl/cpu`처럼 CPU용 PyTorch 색인을 함께 준다. 이 색인을 빼면 CUDA용 `torch`가 설치된다. 실행에는 TPU VM이 필요하다.
- **범위:** 블로그 기준 약 450개 ATen 연산과 eager, compiled 모드를 지원하고, Pallas와 Helion으로 커널을 작성할 수 있다. DTensor 기반 sharding과 vLLM, SGLang, TorchTitan, Ray, TorchRec 연동은 검증했다고 밝힌다. 개발이 진행 중인 프로젝트다.

## 이전의 출발점

- **장치와 분산 백엔드:** `torch.device("tpu")`와 `dist.init_process_group(backend="tpu_dist")`를 쓴다. 장치에 묶이지 않는 코드는 `torch.accelerator.current_accelerator()`와 backend를 생략한 `init_process_group()`으로 GPU와 TPU에서 같이 실행할 수 있다. tensor는 별도 subclass나 wrapper 없이 일반 PyTorch tensor다.
- **실행 보장과 성능의 차이:** `.to("cuda")`를 `.to("tpu")`로 바꾸면 실행되는 것을 목표로 하지만, GPU에 맞춘 형상, sharding과 연산으로는 TPU의 최고 성능에 이르지 못한다. 4월 소개 글은 현재 세대 TPU의 행렬곱 효율이 128이나 256 차원에서 가장 높아, attention head 차원을 64로 고정한 모델은 128이나 256으로 바꾸면 TPU를 더 잘 활용한다고 설명한다.
- **프로세스 모델:** 장치마다 프로세스 하나를 쓰는 PyTorch 방식을 따른다(JAX는 호스트마다 프로세스 하나). TPU 장치는 사용자 공간 프로세스 하나만 접근할 수 있어 강화학습의 colocation(생성과 학습을 같은 장치에 두는 구성)은 그대로 지원하지 않는다.
- **커널:** 사용자 커널은 Pallas로 작성해 TorchTPU API로 연결하거나 TPU 커널 라이브러리 Tokamax를 쓰는 방식이 운영 가능 단계이고, Helion은 실험 단계다. 사례 시험에서 FlexAttention은 아직 지원하지 않아 `F.scaled_dot_product_attention`으로 바꿨다. CUDA 전용 커널은 이전 대상 목록에 넣는다.

## eager 모드와 torch.compile

| 모드 | 설정 | 동작 | 쓰임 |
|---|---|---|---|
| Strict (기본) | 없음 | ATen 연산을 하나씩 보내고 TPU는 CPU와 비동기로 실행 | GPU의 eager 실행과 같은 기대 |
| Debug | `TORCH_TPU_LAUNCH_BLOCKING=1` | 하나씩 보내고 동기로 실행하며 경계 검사를 켬 | 형상 불일치, NaN, OOM 추적. 느림 |
| DeferAndFuse | `TORCH_TPU_DEFER_AND_FUSE=1` | `.to("cpu")`, `.item()` 같은 materialization point까지 연산을 미뤘다가 묶어 컴파일 | 블로그는 Strict보다 50% 이상 빠를 수 있고 최대 HBM 사용량이 준다고 보고 |

- **compiled 모드:** `torch.compile(model, backend="tpu")`는 Dynamo로 FX graph를 받아 전체를 하나의 StableHLO 프로그램으로 만들고 XLA로 컴파일한다. Inductor를 거치지 않는다.
- **동적 형상:** XLA는 컴파일 때 형상이 정해져 있다고 가정한다. 블로그는 임시 제약으로 TPU에서 `torch.compile`을 호출하면 `dynamic=False`가 자동으로 설정된다고 밝힌다. 최대 크기를 정해 한 번만 컴파일하는 bounded dynamism은 개발 중이다. 그전까지 길이와 배치 크기가 바뀌는 워크로드는 재컴파일 횟수와 시간을 재고, 형상을 정해진 구간으로 맞추는 방식을 비교한다(운영 제안).
- **컴파일 캐시:** 프로세스 메모리(항상 사용), 같은 호스트의 공유 메모리(분산 실행에서 기본 사용), Google Cloud Storage 같은 원격 파일 시스템의 영구 캐시(기본 꺼짐, 공유 경로 지정)의 세 단계다. 캐시 키에 컴파일 옵션과 TorchTPU, libtpu, PjRt 버전이 들어가므로 버전을 올리면 이전 항목을 재사용하지 못한다. 첫 단계의 컴파일 시간과 이후 반복을 나눠 측정한다.

## 수치 기본값이 GPU와 다르다

TorchTPU의 기본 정밀도 모드는 medium이다. 행렬곱 입력을 BF16으로 바꿔 MXU에서 곱하고 FP32로 누적한다. 블로그의 비교표는 CUDA의 PyTorch 기본값을 highest(FP32)로 둔다. high는 3회, highest는 6회 MXU 계산으로 FP32 정밀도에 가까워지는 대신 연산 비용이 약 3배, 6배가 되고, 두 모드를 고르면 성능 경고를 낸다. `torch.set_float32_matmul_precision`으로 전역 설정을, `torch.tpu.precision` context manager로 일부 계층만 높일 수 있다.

GPU 결과와 비교하는 회귀 시험에서는 정밀도 설정부터 맞춘다. Google의 Hugging Face 모델 시험도 비트 일치가 아니라 허용 오차로 수치 동등성을 판정했다. 인과 언어 모델은 TPU와 GPU의 perplexity 상대 차이가 0.10 이내면 통과로 본다.

## 분산 실행의 차이

- **collective:** TPU collective를 PyTorch Process Group 수준에서 구현해 DTensor, FSDPv2, SimpleFSDP, FairScale 같은 프레임워크가 그대로 동작한다. NCCL 같은 별도 통신 라이브러리 없이 collective를 StableHLO 연산으로 내린다.
- **초기화:** 일반 `torchrun`이 모르는 `TORCH_TPU_TOPOLOGY`(예: `2,2,1`)와 `TORCH_TPU_SLICEBUILDER_ADDRESSES`가 필요하다. Google Cloud 환경에서는 `torch.tpu.distributed.set_tpu_launch_env()`가 이를 설정한다. 블로그의 8칩 단일 호스트 예시는 `python -m torch.tpu.distributed`의 출력을 export한 뒤 `torchrun --nproc_per_node=8`로 실행한다. 노드의 기본 process group은 그 노드의 slice다.
- **MPMD 위험:** rank에 따라 갈라지는 코드나 나누어떨어지지 않는 DTensor 분할 때문에 rank마다 collective가 든 StableHLO 모듈이 달라지면 교착이나 메모리 손상이 생길 수 있다. 기본값은 collective마다 별도 모듈로 컴파일하는 skinny collectives다. rank 사이의 일관성은 지키지만 XLA가 계산과 통신을 겹치지 못해, 블로그가 예로 든 전체 30~40% 수준의 성능 손실이 날 수 있다. 실제로 SPMD인 구간만 `@spmd_safe`로 표시해 큰 모듈로 묶을 수 있지만 잘못 표시하면 위험하다. rank 사이의 FX graph 동일성을 확인하는 handshake(`TORCH_TPU_SPMD_HANDSHAKE_STAGE`)는 기본이 `OFF`다.
- **mesh 배치:** `torch.tpu.topology_aware_mesh()`로 통신이 많은 텐서, 문맥, 전문가 병렬과 FSDP 차원을 slice 안의 빠른 ICI에 두고, 기울기만 모으는 복제 데이터 병렬은 ICI나 slice 사이의 DCN에 둔다.

## 공개 수치의 범위

다음은 Google이 보고한 값이며 재현하지 않았다. Hugging Face 모델 4,917개 가운데 98%가 오류 없이 실행됐고, 아키텍처 대표 모델 657개 가운데 97%가 GPU 기준 수치 동등성을 통과했다. TorchTitan의 Qwen3 MoE 235B 학습은 TPU v7 1,024칩 한 slice에서 MFU 28.8%, 8,192칩 8개 slice에서 27.1%로 보고됐다. 모델 구현, Pallas 커널 사용과 병렬화 설정이 함께 바뀐 결과이므로 PyTorch 코드를 옮기기만 한 성능으로 읽지 않는다.

## 확인 질문

- 기존 코드가 PyTorch/XLA 전용 API나 CUDA 전용 커널, FlexAttention에 의존하는가?
- 입력 형상이 바뀔 때 재컴파일 비용과 캐시 적중을 측정했는가?
- GPU와 비교할 때 정밀도 모드와 허용 오차를 정했는가?
- rank마다 실행 경로가 갈라지는 코드가 있는가?

## 출처

- [Introducing TorchTPU — PyTorch Blog](https://pytorch.org/blog/introducing-torchtpu/) — 2026-10-21 갱신본의 실행 모드, 컴파일 캐시, 정밀도, 분산 초기화와 사례 수치 대조
- [TorchTPU: Running PyTorch Natively on TPUs at Google Scale — Google Developers Blog](https://developers.googleblog.com/en/torchtpu-running-pytorch-natively-on-tpus-at-google-scale/) — 2026-04-07 사전 소개, attention head 차원 설명
- [torch_tpu — google-pytorch](https://github.com/google-pytorch/torch_tpu) — 2026-10-27 README의 설치, Python 지원과 라이선스 대조
- [Cloud TPU, PyTorch on Cloud TPU](https://docs.cloud.google.com/tpu/docs/pytorch-on-tpu) — 2026-10-22 갱신본의 PyTorch/XLA 대체 안내 대조
- [Google, PyTorch 모델을 TPU에서 실행하는 TorchTPU 오픈소스 공개 — GeekNews](https://news.hada.io/topic?id=35728) — 2026-10-21 소개 글

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
- [[GPU-Inference-Hardware|추론용 GPU 선택]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]]
