---
tags: [ai, local-llm, moe, inference, distributed, mlx, rdma]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["Local Inference Deployment Cases", "Janas", "Apple Minions", "Uzu", "LFM2.5-24B-A2B", "Muse Spark Open", "MLX Distributed Inference", "JACCL", "PS5LM"]
---

# 로컬 AI 추론의 메모리, 저장 계층과 분산 실행

로컬 추론은 가중치와 실행 상태를 자기 장비에 두는 배포 선택이다. 모델의 공개 가중치, 모델을 메모리에 올릴 수 있는지, 충분한 응답 속도와 업무 정확도는 별도로 판단한다.

## MoE가 줄이는 것과 남기는 것

MoE는 토큰마다 일부 전문가만 계산해 활성 연산량을 줄인다. 전체 가중치가 사라지는 것은 아니다. 저장 용량, 전문가를 옮기는 대역폭과 캐시 적중률을 함께 계산한다. 긴 문맥에서는 가중치 외 KV 캐시와 실행 중간값도 메모리를 차지한다.

| 방식 | 줄이려는 비용 | 새로 확인할 비용 |
|---|---|---|
| 작은 활성 MoE | 토큰당 연산 | 전체 가중치 적재와 전문가 접근 |
| RAM/SSD 계층화 | 고가 메모리 용량 | 캐시 미스와 랜덤 I/O, SSD 내구성 |
| 여러 장비의 모델 분할 | 장비당 메모리 | 연결 대역폭, 동기화와 장애 |
| 독립 작업 분산 | 중앙 GPU 대기 | 작업 인계, 중복 실행과 기기 신뢰 |

모델을 여러 장비로 나누는 것과 독립 추론 요청을 여러 장비에 보내는 것은 다른 구조다.

## Janas: 필요한 전문가를 SSD에서 읽는다

2026-10-16 공식 저장소 대조 기준, Janas는 RAM보다 큰 MoE 모델의 가중치를 NVMe에서 읽고 자주 쓰는 전문가를 캐시한다. CPU와 GPU 실행 경로를 제공한다.

프로젝트는 32GB RAM의 Core Ultra 9 185H 노트북에서 약 48.4GB Qwen3-Next-80B-A3B를 초당 24토큰, 초안 기반 생성 사용 시 37토큰으로 실행했다고 보고한다. 비교한 llama.cpp는 2.8토큰/초다. 이는 제작자 측정이며 이 문서에서 재현하지 않았다. 모델 정밀도, 프롬프트, 생성 길이와 초안 사용을 맞추지 않은 속도 배율을 모든 모델에 적용하지 않는다.

## Minions: 유휴 Mac에 독립 추론 작업을 분배한다

2026-10-16 Apple 연구 소개와 제공 발췌를 대조했다. Minions는 유휴 Apple Silicon GPU를 활용하는 분산 추론 시스템이다. 중앙 GPU 자원의 긴 대기를 기존 장비로 보완하려는 목적이며 모델 학습이나 단일 거대 모델의 분할 실행과 구분한다.

제공 GeekNews 발췌의 세부 사례는 Hugging Face 모델의 임베딩과 Ollama 추론, 단절이나 절전 시 재할당, 일부 작업의 10시간 이상 대기를 수분으로 줄인 결과다. 공식 연구 소개에서는 분산 추론과 내결함성의 범위를 확인했지만 이 세부 수치는 논문 전체와 재현 대조하지 않았다.

운영 검토에서는 기기 참여 동의, 데이터 등급, 작업 만료와 재실행, 결과 저장의 멱등성을 확인한다. 대기 시간 감소와 순수 계산 처리량 증가는 같은 지표가 아니다.

## MLX 분산 추론: 한 모델을 여러 Mac에 나눈다

2026-10-27 Apple Machine Learning Research 게시물(2026-10-15)과 MLX 분산 통신 문서를 대조한 기준이다. 모델을 나누는 축에 따라 병목이 달라진다.

| 방식 | 나누는 축 | 디코드 | 프리필과 통신 |
|---|---|---|---|
| 파이프라인 병렬 | 계층(깊이) | 계층을 차례로 거치므로 단일 장비와 비슷하다 | 경계의 중간 출력만 넘긴다. 긴 입력을 조각으로 나눠 장비 사이에 겹치면 TTFT가 줄 수 있다 |
| 텐서 병렬 | 각 계층의 폭 | 계층 계산을 나눠 빨라질 수 있다 | 토큰과 계층마다 작은 broadcast와 집계가 반복돼 지연이 낮은 연결이 필요하다 |

Apple 측정에서 dense 모델 두 대의 파이프라인 병렬은 65,536토큰 프리필을 8,192토큰 조각으로 겹쳐 단일 장비보다 최대 약 1.8배 빨랐고, 디코드 속도는 거의 같았다. 텐서 병렬은 dense 모델에서 장비 수에 따라 더 잘 늘었다. 단일 장비 비교에서 M5 Ultra는 M3 Ultra보다 TTFT가 최대 4.6배, 디코드가 1.6배 빨랐고 Apple은 이를 GPU의 행렬 연산 가속과 메모리 대역폭(1.2TB/s 대 819GB/s) 차이로 설명한다. 프리필과 디코드의 병목 차이는 [[LLM-Inference-Bottlenecks#프리필과 디코드는 병목이 다르다|추론 병목]]과 같은 구조다.

- **연결:** MLX의 JACCL 백엔드는 macOS 26.2부터 쓸 수 있는 Thunderbolt 5 RDMA를 사용한다. MLX 문서는 ring 백엔드보다 통신 지연이 한 자릿수 낮다고 설명하고 텐서 병렬에 필요한 백엔드로 안내한다.
- **준비:** RDMA는 각 Mac을 복구 모드로 시작해 터미널에서 `rdma_ctl enable`을 실행하고 재부팅해야 켜지며, 원격이나 sudo로는 켤 수 없다. 모든 Mac 쌍을 Thunderbolt 케이블로 직접 잇는 완전 연결만 지원한다. 한 쌍에 케이블을 여러 개 이을 수 있지만 JACCL은 모든 쌍에 가장 적은 케이블 수를 적용한다. Thunderbolt bridge를 끄고 연결마다 분리된 로컬 네트워크를 둔다. `mlx.distributed_config`가 연결을 확인하고 `mlx.launch --backend jaccl`에 넘길 hostfile을 만든다.
- **실험 옵션:** Apple의 실행 예시는 `--env MLX_METAL_FAST_SYNCH=1`을 붙인다. MLX 문서는 이 CPU와 GPU 동기화 방식이 교착을 일으키고 GPU를 멈춘 상태로 남길 수 있어 기본값을 끄고 설정하지 않기를 권한다. 벤치마크 재현 설정과 상시 서비스 설정을 구분한다.

Muse Spark Open(전체 816B, 활성 42B)은 NVFP4로 줄여도 가중치만 약 493GB라 512GB Mac Studio 한 대에 실행 중간값까지 담을 수 없다. Apple이 M5 Ultra Mac Studio로 보고한 값은 다음과 같다(`mlx_lm.benchmark`, 배치 1, 생성 128토큰, 장비 쌍마다 Thunderbolt 케이블 2개).

| 구성 | TTFT 8,192 | TTFT 65,536 | 디코드 8,192 | 디코드 65,536 |
|---|---|---|---|---|
| 2대 파이프라인 | 8.4초 | 47.6초 | 15.74 tok/s | 14.37 tok/s |
| 2대 텐서 | 8.2초 | 70.3초 | 24.99 tok/s | 23.84 tok/s |
| 4대 텐서 | 4.8초 | 40.6초 | 36.73 tok/s | 34.66 tok/s |

65,536토큰에서 2대 텐서 병렬의 TTFT가 파이프라인보다 느린 이유로 Apple은 전문가 출력의 별도 정규화가 프리필 통신을 늘린 점을 든다. 장비를 4대로 늘린 텐서 병렬의 65,536토큰 TTFT(40.6초)는 2대 파이프라인(47.6초)보다 짧았다. Apple은 4대 파이프라인 결과를 보고하지 않았으므로 같은 장비 수에서 두 방식을 비교한 값은 아니다. 같은 4대 구성의 65,536토큰 TTFT는 케이블 1개일 때 약 50.5초, 2개일 때 40.6초였다. `mlx.launch`로 `mlx_lm.server`를 띄우면 OpenAI 호환 주소(`http://127.0.0.1:8080/v1`)를 OpenCode 같은 도구에 연결할 수 있으며, 필드 보존은 [[LLM-Gateway#호환성은 요청 수락과 기능 보존으로 나눠 확인한다|호환성 점검]]으로 확인한다.

이 표는 Apple의 측정이며 이 문서에서 재현하지 않았다. 4비트 NVFP4 결과를 원 정밀도의 품질이나 속도로 옮기지 않고, 128토큰보다 긴 출력과 동시 요청의 성능은 따로 잰다.

## Uzu: Apple 기기의 앱 안에서 모델을 실행한다

2026-10-21 공식 저장소 README, 문서, PyPI, 벤치마크 페이지와 모델 목록 페이지 대조 기준이다. Uzu는 Mirai가 MIT 라이선스로 공개한 Rust 추론 엔진으로 Swift, Python과 TypeScript 바인딩, Metal과 CPU 백엔드를 제공한다. README는 Apple 기기의 통합 메모리 활용을 특징으로 든다. 공식 문서 FAQ는 현재 Apple Silicon의 iOS와 macOS 기기만 지원한다고 안내하고, README 대상 목록은 Windows, Linux와 WebAssembly를 진행 중으로 표시한다. 이 목록과 PyPI 휠에는 x86_64 macOS도 있어 Intel Mac 사용 가능 여부는 따로 확인한다. README에는 같은 엔진 API에 OpenAI API 키를 넣어 클라우드 모델을 호출하는 예시도 있으므로, 요청이 기기 안에서 처리되는지는 선택한 모델로 확인한다.

- **설치:** Python은 `uv add uzu`로 추가한다(README 예시는 0.6.11 고정). PyPI의 0.6.11은 소스 배포 없이 Python 3.12 이상, macOS 26.0 이상용 휠(arm64, x86_64)만 제공하므로 그보다 낮은 macOS나 Python에서는 이 판을 설치할 수 없다. README는 iOS 앱이 필요한 메모리를 할당할 수 있도록 `com.apple.developer.kernel.increased-memory-limit` entitlement 추가를 권장한다.
- **모델 형식:** Uzu 전용 모델 형식을 쓰며, 직접 변환할 때는 별도 도구 lalamo를 사용한다. 같은 모델 이름이라도 엔진마다 가중치 파일과 양자화가 다를 수 있다.
- **서버:** README는 저장소에서 `cargo run --release -p cli -- server --model <모델>`로 OpenAI 호환 HTTP 서버를 띄우는 방법을 안내한다. 기본 주소는 `127.0.0.1:8000`이고 `POST /v1/chat/completions`(스트리밍 포함)와 `GET /v1/models`를 제공하며, 두 엔드포인트는 루트 경로에서도 열린다. 요청 필드 가운데 반영한다고 밝힌 것은 `temperature`, `top_p`, `top_k`, `max_tokens`다. README의 라이브러리 예시에는 도구 호출과 JSON 스키마를 지정하는 구조화 출력이 있지만, 서버 절은 이 기능을 HTTP 요청 필드로 받는다고 밝히지 않는다. 따라서 서버 경로에서 도구 호출이나 구조화 출력 같은 다른 OpenAI API 기능까지 호환된다고 가정하지 않고, 필드 보존은 [[LLM-Gateway#호환성은 요청 수락과 기능 보존으로 나눠 확인한다|호환성 점검]]처럼 실제 클라이언트로 확인한다.

Mirai가 공개한 벤치마크(2026-10-18 측정, Apple M5 Max 128GB, Uzu 0.6.9)는 Qwen3.5-9B의 출력 속도를 4비트 비교 기준인 Mirai-M에서 273 tok/s, 8비트 기준인 Mirai-L에서 206 tok/s로 제시한다. 측정 방법 절은 구성마다 약 1,357토큰 입력과 최대 4,096토큰 출력의 같은 프롬프트로 세 번 실행한다고 적고, 출력 속도 항목은 공개 평가 trace에서 만든 데이터셋 혼합을 데이터셋마다 같은 비중으로 반영하고 원 모델 README의 기본 샘플링 값을 쓴다고 따로 적는다. 두 설명의 관계는 페이지만으로 확정하지 못했다. 비교 엔진은 llama.cpp의 경우 Mirai의 KL 평가 도구로 잰 KL divergence가 가장 가까운 양자화 체크포인트를, MLX의 경우 mlx-community 체크포인트를 썼다고 밝힌다. llama.cpp는 자기회귀 실행과 speculative decoding 실행을 나눠 쟀고, 엔진 목록에는 MTPLX, oMLX와 Splash도 있다. 같은 페이지에서 Qwen3.5-9B의 Mirai-M(273 tok/s)이 Qwen3.5-4B의 Mirai-M(163 tok/s)보다 빠르다. Qwen3.5-9B와 4B 모델 카드는 모두 MTP(multi-token prediction) 학습을 명시하므로 모델의 MTP 지원만으로 이 역전을 설명할 수 없다. README와 벤치마크 페이지는 Uzu 측정의 디코딩 방식을 밝히지 않지만, Mirai의 모델 목록 페이지는 같은 Qwen3.5-9B 수치(273, 206 tok/s)를 speculative decoding을 쓴 측정으로 표시하고 4B 수치(163, 106 tok/s)에는 그 표시가 없다. 초안을 내장 MTP 층으로 만드는지 별도 모델로 만드는지와 수락률은 밝히지 않으므로, 이 역전을 엔진 커널의 성능 차이로 읽지 않는다. 벤더 측정이며 이 문서에서 재현하지 않았고, 같은 페이지의 비교 엔진 수치는 확인하지 못해 쓰지 않았다. 측정 판(0.6.9)과 README 설치 예시(0.6.11)가 이미 다르므로 수치는 판과 함께 기록한다.

2026-10-13 공개된 YouTube 영상은 16GB 기본형 M5 MacBook Pro에서 Qwen3.5-9B를 실행해 llama.cpp 초당 22토큰, MLX 25토큰, Uzu 92토큰을 보고했다. 영상 제작자의 제3자 측정이며 이 문서에서 재현하지 않았다. 설명란과 내레이션에서 양자화, 디코딩 방식(speculative decoding 사용 여부와 초안 출처), 프롬프트와 출력 길이, 엔진 버전을 확인할 수 없었으므로 llama.cpp 대비 약 4배인 차이를 엔진 교체만의 일반적인 효과로 옮기지 않는다. 기기가 다른 위 벤더 수치와도 직접 비교하지 않으며, 비교 조건은 [[LLM-Inference-Bottlenecks#로컬 엔진 비교는 측정 구간과 설정을 맞춘다|로컬 엔진 비교 조건]]을 따르고, 그 목록에 없는 디코딩 방식(자기회귀 또는 speculative decoding), 초안 출처(내장 MTP 층, 별도 초안 모델 등)와 초안 수락률도 함께 기록한다.

## PS5LM: 게임 콘솔을 가정용 모델 서버로 쓴다

2026-10-27 프로젝트 저장소 README 대조 기준이다. PS5LM은 탈옥한 PS5의 RDNA 2 GPU에서 llama.cpp의 Vulkan 백엔드로 GGUF 모델을 실행하고 같은 네트워크의 기기에 API를 제공한다. 라이선스는 GPL-3.0-or-later이고, Sony Interactive Entertainment와 무관한 프로젝트라고 밝힌다.

- **메모리:** 공유 메모리 가운데 11.4GB를 모델과 문맥에 쓴다. 플래너가 GGUF를 읽어 남은 메모리에 맞는 가장 긴 문맥과 캐시 설정을 고르므로, 같은 모델이라도 실제 문맥 길이는 남은 메모리에 따라 달라진다.
- **API:** `http://<console>:8081`에서 OpenAI `/v1/chat/completions`, Anthropic `/v1/messages`와 브라우저 채팅을 제공하고, 결정 모델을 올리면 `/v1/systemone`에도 응답한다([[LLM-Decision-Models|결정 모델]]). 요청의 모델 이름과 관계없이 적재된 모델이 답하므로 클라이언트가 보낸 모델 이름으로 라우팅이나 사용량을 판단하지 않는다.
- **전제:** 펌웨어 7.00~13.60의 탈옥한 PS5와 kstuff-lite, etaHEN, ShadowMountPlus payload가 필요하다. README는 탈옥에 따르는 보증, 약관과 법적 조건을 다루지 않으므로 사용 전에 따로 확인한다(운영 제안).
- **노출 범위:** README는 API 인증이나 접근 제한을 설명하지 않는다. logit과 내부 텐서 값을 돌려주고 채널 하나를 바꿀 수도 있는 `/v1/introspect`는 기본으로 꺼져 있으며 설정에서 켠다. 공유 네트워크에서는 방화벽이나 분리된 네트워크로 접근을 제한하고 이 엔드포인트를 켜지 않는다(운영 제안).

프로젝트가 PS5 Slim에서 보고한 속도는 Qwen 3.5 0.8B Q4_K_M(0.5GB) 207 tok/s, Qwen 3.5 9B Q4_K_M(5.3GB) 55 tok/s, Qwen 3.8 27B UD-Q2_K_XL(9.2GB)의 64k 문맥에서 약 20 tok/s이고, 결정 모델 d1 Omni 600M은 질문 3개를 0.3초에 답했다. 입력 길이와 측정 구간을 밝히지 않았으므로 생성 속도로만 읽는다. 27B 모델은 2비트 계열 양자화로 11.4GB 예산에 맞춘 결과라 응답 품질을 따로 확인한다. 이 문서에서 재현하지 않았다.

## 로컬 에이전트 모델 사례

### LFM2.5-24B-A2B

2026-10-16 Liquid AI 공식 발표 확인 기준이다. 전체 24B 중 토큰당 2B를 활성화하는 공개 가중치 MoE이며 기기 내 도구 호출과 에이전트 작업을 겨냥한다. 제공 발췌는 사고 토큰 생성과 131,072토큰 문맥을 소개한다. 이 세부 한도는 모델 카드 본문 접근이 실패해 직접 대조하지 못했다.

벤더는 AutomationBench 27.69점으로 비교 모델 Qwen3.6-35B-A3B의 8.72점보다 높다고 보고한다. 모든 지식과 코딩 평가에서 우세하다는 뜻은 아니다. 공개 가중치만으로 상업적 사용과 재배포 조건까지 자유롭다고 판단하지 않고 라이선스를 확인한다.

### Muse Spark Open

2026-10-16 Meta 공식 발표 기준, 코딩과 에이전트 작업을 겨냥한 네이티브 멀티모달 공개 가중치 모델이다. 전체 816B 중 42B 활성 파라미터와 약 1M 문맥을 안내하며, 두 대의 M5 Ultra Mac Studio 및 MLX 실행을 소개한다. Hugging Face Transformers 모델 문서는 텍스트, 이미지, 오디오와 영상을 입력받아 텍스트를 생성한다고 설명한다(2026-10-18 확인).

제공 발췌는 각 512GB 메모리 장비, NVFP4와 Muse Code를 통한 앱 빌드 및 영상 편집을 설명한다. 장비 구성과 데모별 성능을 직접 시험하지 않았으며, 모델만 설치하면 해당 도구 권한과 업무 통합이 자동 완성되는 것은 아니다. 배포 전 가중치, 실행기, 도구 연결과 실제 메모리 예산을 확인한다. Apple의 2대와 4대 분산 측정은 [[#MLX 분산 추론: 한 모델을 여러 Mac에 나눈다|MLX 분산 추론]] 절에 정리했다.

## 분산형 AI 대전환 전망의 확인 수준

2026-10-12 「로컬 AI 모델 - 클라우드 중심 구조를 바꿀 대전환의 촉매」 발췌는 소비자용 MoE가 클라우드 비용과 GPU 부족을 완화하고, 수익원이 API에서 기기 라이선스로 옮겨갈 수 있다고 제안한다. 노트북 모델이 최첨단보다 약 12개월, 5,000~10,000달러 PC가 6개월 미만 뒤처진다는 값은 2026년 9월 시점의 추정이다.

이 시간 격차는 보편적인 성능 단위가 아니며 어떤 과업과 모델을 비교했는지 확인해야 한다. 해당 전망의 원문 전체와 추산 근거는 이번에 대조하지 않았다. 로컬과 클라우드는 개인정보, 품질, 용량, 유휴 비용과 관리 부담에 따라 혼합할 수 있다.

## 출처

- [Janas — prabanta-dev](https://github.com/prabanta-dev/janas)
- [Minions: A Dynamic and Distributed Virtual GPU Cloud Built on Idle Apple Silicon Devices — Apple Machine Learning Research](https://machinelearning.apple.com/research/distributed-gpu-cloud)
- [uzu — trymirai](https://github.com/trymirai/uzu)
- [Mirai, About](https://docs.trymirai.com/)
- [uzu 0.6.11 — PyPI](https://pypi.org/pypi/uzu/0.6.11/json)
- [uzu vs MLX vs llama.cpp: Apple Silicon LLM Benchmarks 2026 — Mirai](https://trymirai.com/metrics)
- [Local LLM library for Apple Silicon — Mirai](https://trymirai.com/local-models) — 2026-10-21 모델별 속도 수치와 speculative decoding 측정 표시 대조
- [Qwen3.5-9B — Qwen](https://huggingface.co/Qwen/Qwen3.5-9B)
- [Qwen3.5-4B — Qwen](https://huggingface.co/Qwen/Qwen3.5-4B)
- [같은 맥북, 같은 모델인데 로컬 AI 속도가 4배 넘게 차이 나는 이유 — 추론 엔진 Uzu — YouTube, 코딩 수익화 : 투더제이 TTJ](https://www.youtube.com/watch?v=iQBshjn6MDs) — 2026-10-13 공개 영상. Uzu 절의 계기이며 기능과 지원 범위는 위 공식 자료로 대조했고, 속도 수치는 영상 제작자의 측정으로만 인용
- [LFM2.5-24B-A2B: Built for Fast On-Device Agents — Liquid AI](https://www.liquid.ai/blog/lfm2-5-24b-a2b)
- [LFM2.5-24B-A2B — LiquidAI](https://huggingface.co/LiquidAI/LFM2.5-24B-A2B)
- [Introducing Muse Spark Open — Meta AI Research](https://research.meta.ai/blog/muse-spark-open)
- [Hugging Face Transformers, Muse Spark Open](https://huggingface.co/docs/transformers/model_doc/muse_spark)
- [Local and Distributed Large LLM Inference with MLX and RDMA on Mac Studio — Apple Machine Learning Research](https://machinelearning.apple.com/research/mlx-distributed-inference) — 2026-10-15 게시, 2026-10-27 표 2와 표 3의 두 문맥 길이 값과 병렬화 설명 대조
- [MLX, Distributed Communication](https://ml-explore.github.io/mlx/build/html/usage/distributed.html) — 2026-10-27 JACCL의 macOS, RDMA 활성화와 완전 연결 조건, `MLX_METAL_FAST_SYNCH` 경고 대조
- [PS5LM — cobanov](https://github.com/cobanov/PS5LM) — 2026-10-27 README의 메모리 예산, API, 요구 조건과 속도 표 대조
- [MLX로 Mac Studio 여러 대에서 대형 AI 모델 실행하기 — GeekNews](https://news.hada.io/topic?id=35483) — 2026-10-17 소개 글
- [PS5LM - 탈옥한 PS5에서 llama.cpp로 모든 GGUF 모델을 콘솔에서 네이티브 실행 — GeekNews](https://news.hada.io/topic?id=35496) — 2026-10-17 소개 글
- 사용자 제공 GeekNews 발췌: 2026-10-12 로컬 AI 대전환, 2026-10-14 Janas와 Minions, 2026-10-16 LFM2.5와 Muse Spark Open. 시장 전망과 미대조 세부 수치는 본문에 별도 표시했다.

## 관련 문서

- [[LLM-Inference-Bottlenecks|추론 병목과 메모리 예산]]
- [[LLM-Model-Tiers|모델 선택과 라우팅]]
- [[Agent-Runtime-Deployment|에이전트 런타임과 배포]]
- [[GPU-Inference-Hardware#병렬화는 연결 구조에 맞춘다|GPU 병렬화와 연결 구조]]
- [[LLM-Inference-Serving-Engines|추론 서빙 엔진의 기능 경계]]
