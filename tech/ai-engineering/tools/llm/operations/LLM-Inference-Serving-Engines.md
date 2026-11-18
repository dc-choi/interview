---
tags: [ai, llm, inference, serving, determinism, speculative-decoding, structured-output]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Inference Serving Engines", "추론 서빙 엔진", "DeepInfer", "DSpark", "Batch Invariance", "배치 불변 추론", "ggml", "DGX Station 텐서 병렬"]
---

# LLM 추론 서빙 엔진: 엔진 기능과 서비스 구성의 경계

추론 엔진은 가중치를 가속기에 올리고 요청을 배치로 묶어 토큰을 생성하는 실행 계층이다. API 서비스에는 엔진 밖의 구성 요소가 더 필요하다. 엔진을 고를 때는 지원 모델과 하드웨어, 성능 기법의 적용 조건과 함께 공개판이 서비스의 어느 부분까지 포함하는지 확인한다.

## 엔진과 서비스의 책임을 나눈다

| 계층 | 하는 일 | 확인할 것 |
|---|---|---|
| 커널과 모델 실행 | attention, MoE, 행렬곱 커널과 샘플러 | 지원 모델, 하드웨어와 정밀도 |
| 배치 스케줄링 | 요청을 묶고 CPU 스케줄링과 가속기 실행을 겹친다 | 동시성별 TTFT와 토큰 간 지연 |
| 병렬화 | attention의 데이터 병렬(DP), 문맥 분할(CP), MoE의 expert parallel(EP)과 전문가 부하 재배치(EPLB) | 장비 수와 연결 구조 |
| KV 캐시 계층 | 접두어 재사용과 장비, 요청 사이의 캐시 이동 | 적중률과 저장 위치 |
| 단계 분리 | 프리필과 디코드 등 단계를 다른 자원에 배치 | 단계 사이 KV 전달 비용 |
| 복제본 부하 분산 | 데이터 병렬 복제본 사이의 요청 분배 | 라우팅 기준과 과부하 처리 |
| API 계층 | 요청 형식 변환, 프롬프트 렌더링, 응답 파싱, 인증과 HTTP | 형식별 기능 보존 |

단계 분리의 일반 원리는 [[LLM-Inference-Bottlenecks#프리필과 디코드를 다른 자원에 배치한다|프리필과 디코드 분리]]를 따른다.

### DeepInfer 공개판이 포함하는 범위

2026-10-27 DeepSeek 공식 저장소 README 대조 기준이다. README는 DeepInfer를 DeepSeek의 대규모 서비스를 구동하는 추론 프레임워크로 소개하며, 2026년 10월 공개판은 오프라인 추론을 제공한다. 라이선스는 Apache 2.0이며 vLLM을 바탕으로 시작해 SGLang과 TensorRT-LLM에서 착안했다고 밝힌다.

- **모델과 하드웨어:** 지원 모델은 DeepSeek-V4.1-Flash 하나다. 기본 체크포인트 `deepseek-ai/DeepSeek-V4.1-Flash-1017`은 첫 실행 때 Hugging Face 캐시로 내려받고, `DEEPINFER_HF_MODEL_DIR`로 로컬 사본을 지정한다. 하드웨어는 NVIDIA SM100 GPU와 Huawei Ascend 950 NPU이고 Linux, GCC 13 이상, Python 3.12와 CUDA 13(NVIDIA) 또는 CANN 9.2(Ascend)가 필요하다.
- **포함:** FlashMLA, DeepGEMM, DeepEP, TileKernels, DeepSelect와 TileLang 커널, Attention DP와 balanced CP, MoE EP와 EPLB, 기본으로 켜진 비동기 스케줄링이 들어 있다.
- **미포함:** README는 완전한 추론 서비스에 필요하지만 이번 공개판에 없는 요소로 KV 캐시 시스템, VE/Prefill/Decode 분리(필요한 엔진 기능은 대부분 구현), 프리필과 디코드 양쪽의 데이터 병렬 복제본 간 부하 분산을 든다.
- **API 계층:** 별도 저장소 deepseek-recipe(MIT)는 Messages, Chat Completions와 Responses 요청을 Conversation 형식으로 바꾸고, DeepSeek V4와 V4.1 프롬프트 렌더링, 토큰화와 응답 변환을 맡는다. 모델 추론, 도구 실행과 HTTP 전송은 호출자가 제공해야 한다.

두 저장소를 내려받는 것만으로 공개 API와 같은 서비스가 구성되지는 않는다. HTTP 서버와 인증, KV 캐시 계층, 단계 분리와 복제본 라우팅은 직접 만들거나 다른 서빙 계층과 결합한다.

### ggml: 엔진 아래 텐서 라이브러리의 판을 맞춘다

ggml은 llama.cpp와 whisper.cpp가 쓰는 텐서 연산 라이브러리로, CPU, CUDA, Metal, Vulkan, SYCL, OpenCL, WebGPU, Hexagon 같은 백엔드 커널이 이 계층에 있다. 2026-11-13 게시된 v1.0.0 릴리스 노트(2026-11-16 확인)는 폐기 예정 API와 `DIAG_MASK_INF`, `DIAG_MASK_ZERO` 연산을 제거하고, RPC 프로토콜을 v9로 올려 호환되지 않는 상대를 거부하게 했다. 변경 대부분은 llama.cpp 저장소에서 먼저 들어와 동기화된 것이다.

- **판 정책:** 2026-08 메인테이너 토론(#1579)은 ggml, llama.cpp, whisper.cpp에 시맨틱 버전을 쓰기로 했다. llama.cpp는 ABI를 깨는 변경(열거형 값 추가 포함)과 서버 추론 엔드포인트의 파괴적 변경에 major를 올린다. llama.cpp와 whisper.cpp는 ggml 사본을 내장하며, 내장본이 공식 ggml 릴리스와 같을 때만 릴리스 태그를 만들어 시스템 ggml에 링크해도 호환되게 한다. `b[번호]` 태그는 nightly 빌드다. 같은 토론의 Debian 메인테이너 댓글은 1.0에 맞춰 새 soname의 `libggml1`을 기존 `libggml0`과 함께 설치할 수 있다고 적는다.
- **올릴 때 점검:** 시스템 ggml에 링크하는 빌드는 ggml과 llama.cpp의 판을 함께 고정한다. ggml C API를 직접 부르는 코드는 제거된 API를 찾는다. RPC 백엔드로 여러 장비를 묶었다면 서버와 클라이언트를 함께 올린다. 1.0에는 API 정리와 판 정책 전환 외에 백엔드별 실행 경로 변경도 들어 있으므로, 성능은 올리기 전후에 같은 모델과 설정으로 프리필과 생성 속도를 재서 확인한다([[LLM-Inference-Bottlenecks#로컬 엔진 비교는 측정 구간과 설정을 맞춘다|로컬 엔진 비교 조건]]).

## 결정적 출력은 배치 불변성에서 출발한다

temperature 0이나 고정 seed만으로 같은 입력에 같은 출력이 나온다고 보장할 수 없다. 부동소수점 덧셈은 결합법칙이 성립하지 않아 합산 순서가 바뀌면 결과 비트가 달라진다. 서버 부하에 따라 배치 크기가 바뀌고, 커널이 배치 크기에 따라 리덕션 전략을 바꾸면 같은 요청의 수치도 바뀐다. 배치 불변성(batch invariance)은 각 원소의 리덕션 순서를 커널의 배치 크기와 무관하게 고정하는 성질이다.

- **바뀌기 쉬운 연산:** RMSNorm은 배치 크기에 따라 리덕션을 여러 코어로 나누고, 행렬곱은 split-K나 작은 배치의 tensor core 명령 선택에 따라, attention은 split-KV 분할 방식에 따라 순서가 달라진다. attention에서는 분할 수 대신 분할 크기를 고정해야 한다.
- **효과 사례:** Thinking Machines의 2025-09-10 실험에서 Qwen3-235B-A22B-Instruct-2507로 temperature 0 완성 1,000개(각 1,000토큰)를 만들자 배치 불변 커널 없이는 서로 다른 완성이 80개였고, 배치 불변 커널로는 1,000개가 모두 같았다.
- **비용 사례:** 같은 글의 Qwen3-8B, GPU 1장, 1,000개 시퀀스(출력 90~110토큰) 시험에서 vLLM 기본 실행은 26초, 최적화하지 않은 결정적 구현은 55초, attention 커널을 개선한 구현은 42초였다.
- **쓰임:** 강화학습에서 샘플러와 학습기의 수치가 다르면 on-policy 학습이 사실상 off-policy가 된다. 회귀 시험과 감사 재현에도 같은 성질이 필요하다.

DeepInfer README의 설정은 다음과 같고 둘 다 NVIDIA에서만 지원한다.

- **배치 불변 추론:** `DEEPINFER_BATCH_INVARIANT=1`. 배치 구성이 달라도 모델 결과를 같게 유지한다.
- **결정적 샘플링:** `DEEPINFER_BATCH_INVARIANT=1`, `DEEPINFER_ENABLE_MTP_VARLEN=0`과 `SamplingParams`의 고정 `seq_seed`. 같은 입력 토큰과 샘플링 파라미터에 같은 출력을 낸다. 이 조합이 끄는 것은 아래 DSpark의 가변 길이 검증이다. 소스(커밋 5537415)의 환경 변수 정의에서 초안 생성은 `DEEPINFER_USE_NEXTN_DECODE`(기본 5, 0이면 speculative decoding을 끔)가 정하므로 이 조합에서도 고정 길이 초안 디코딩은 기본으로 켜져 있고, 저장소의 배치 불변성 시험도 초안 길이 5로 실행한다. 가변 길이 검증은 배치 전체의 검증 예산을 요청들에 나누므로 한 요청의 검증 길이가 같은 배치의 다른 요청에 따라 달라진다.

README는 이 모드의 성능 비용을 밝히지 않는다. 결정성이 필요한 경로에서는 켰을 때와 껐을 때의 지연과 처리량을 같은 모델, 하드웨어와 동시성에서 비교한다(운영 제안). README가 밝힌 보장 범위는 같은 입력 토큰과 샘플링 파라미터다. 엔진 버전, 커널과 하드웨어를 바꾼 뒤의 동일성은 다시 확인하고, 프롬프트 렌더링이나 토큰화가 바뀌면 입력 토큰 자체가 달라진다는 점도 함께 본다.

## 초안 기반 디코딩의 설정을 함께 기록한다

DeepInfer의 DSpark는 초안 토큰으로 디코딩을 가속하는 speculative decoding에 가변 길이 검증을 더한 방식이다. 초안은 한 단계에 최대 `DEEPINFER_USE_NEXTN_DECODE`개(기본 5)를 만든다. `DEEPINFER_ENABLE_MTP_VARLEN=1`이면 Confidence Head가 예측한 초안 토큰별 수락 확률과 미리 측정한 하드웨어 처리량 곡선으로, 배치의 유효 처리량이 가장 커지도록 요청마다 검증할 초안의 앞부분 길이를 고른다. 끄면 소스 기준으로 모든 요청이 최대 길이의 초안을 검증한다.

저장소의 배포 Q&A 문서는 EP64/DP64 벤치마크 데이터로 계산한 추정치를 제시한다. 가변 길이 검증은 단계당 검증하는 초안 수를 5에서 3.2~4.4로 약 30% 줄이고 평균 수락 길이는 고정 길이 3.29 대 가변 길이 3.20으로 거의 유지해, 운영 지점(rank당 동시 시퀀스 약 60개)에서 처리량을 4~7% 높인다. 같은 표에서 동시 시퀀스 16개는 -1.5%, 96개는 +11.0%라 이득의 크기와 부호가 동시성에 따라 달라진다. DeepSeek의 자체 추정이며 재현하지 않았다. 초안 모델의 구조와 출력 품질 영향은 README와 Q&A 문서 모두 설명하지 않는다. speculative decoding의 일반 비용 구조는 [[LLM-Inference-Bottlenecks#서빙 기법이 줄이는 비용은 다르다|서빙 기법의 비용 비교]]를 따르고, 성능 비교에는 최대 초안 길이, 가변 길이 검증 여부와 실제 수락률을 함께 남긴다.

초안은 따로 학습한 모델 없이 입력에서 가져올 수도 있다. 2026-11-18 vLLM 문서 기준으로 n-gram 추측은 프롬프트의 n-gram 일치로 초안을 만들고, 창 크기는 `prompt_lookup_min`과 `prompt_lookup_max`(둘 다 생략하면 5), 단계당 초안 수는 `num_speculative_tokens`로 정한다. 문서는 이 방식을 가볍고 켜기 쉬우며 이득은 작거나 중간 정도라고 분류한다. 출력이 입력의 문구를 그대로 옮기는 문서 질의응답이나 코드 수정에서 초안이 맞을 여지가 크다(해석). 검증은 대상 모델이 하므로 이론상 출력 분포가 바뀌지 않지만, 같은 문서는 하드웨어의 수치 정밀도와 배치 크기에 따라 출력이 조금 달라질 수 있다고 덧붙인다.

## 긴 문맥 재처리의 범위를 제한한다

SWA bounded replay는 디코더 프리필에서 정해진 길이의 끝부분만 다시 처리해 작업을 줄인다. V4.1 기본값은 `DEEPINFER_YOCO_PREFILL_TRUNCATION_MODE=compact`와 `DEEPINFER_YOCO_PREFILL_KEEP_TOKENS=140`이며, 남기는 끝부분은 sliding window attention의 창과 최대 backtracking 길이를 모두 덮어야 한다. 모델 구조에 묶인 값이므로 다른 모델이나 체크포인트에 그대로 옮기지 않는다.

## 구조화 출력은 API 수락과 디코딩 강제를 나눠 확인한다

DeepInfer는 정규식, JSON Schema와 EBNF 문법으로 생성을 제한하며 `SamplingParams`에 `so_args={"schema_type": ..., "schema": ...}`를 넘긴다. deepseek-recipe는 Chat Completions의 `response_format`(`json_schema`, `regex`)과 Responses의 `text.format`(`json_schema`)을 변환한다. JSON Schema를 검증해 프롬프트에 쓰고 요청에 맞는 출력 제약을 고르지만, 그 제약을 제약 디코딩으로 강제할지는 호출자의 백엔드가 정한다.

API 계층이 스키마 요청을 받아들였다는 사실을 디코딩 단계의 강제로 해석하지 않는다. 형식을 강제해도 값의 의미는 보장되지 않으므로 [[LLM-Failure-Handling-Response-Validation#구조화 출력은 형식만 보장한다|구조화 출력의 한계]]처럼 의미 검증을 따로 둔다.

## 공개 벤치마크의 측정 조건

DeepInfer README의 성능 그래프는 프리필에 SM100 GPU 4개, 디코드에 64개를 쓰고 각각 하나의 scale-up domain 안에서 측정했다고 밝힌다. 본문에는 수치가 없고 그래프와 재현 스크립트 `examples/sweep/run_sweep.sh`만 있다. 장비 수와 연결 구조가 다른 환경에 결과를 옮기지 않는다.

## 사례: 워크스테이션 두 대에 걸친 텐서 병렬

2026-11-13 NVIDIA 기술 블로그의 절차 기준이다. GLM-5.3 NVFP4(전체 753B, 토큰당 활성 40B의 MoE) 체크포인트는 약 464GB라 GB300 한 장의 252GB HBM3e에 들어가지 않는다. GB300 DGX Station 두 대를 ConnectX-8 RDMA(RoCE, 400Gb/s, MTU 9000) 직결 레일로 잇고, 두 장비에 같은 vLLM v0.30.0 이미지(다이제스트 고정)와 모델 리비전을 둔 뒤 TP=2로 띄운다. CPU 가중치 오프로딩은 끈다. 어느 GPU도 모델 전체를 갖지 않아 토큰마다 두 rank가 부분 결과를 교환하며, 시작 로그의 GPU당 가중치는 약 218GiB다. 노드 안 TP와 노드 사이 PP를 조합하라는 일반 안내([[GPU-Inference-Hardware#병렬화는 연결 구조에 맞춘다|병렬화와 연결 구조]])와 달리 노드마다 GPU가 하나라 노드 사이 RDMA 연결이 TP 통신을 맡는다(구성에서 읽은 차이).

- **엔진 설정:** 문맥 98,304토큰, GPU 메모리 93%, MTP로 단계당 초안 4토큰, FP8 KV 캐시, prefix caching, 자동 도구 선택. 플래그는 한 번에 하나씩 바꾸고 다시 검증하라고 안내한다.
- **통신 검증:** 상태 API가 응답해도 NCCL 로그에서 GPU RDMA를 쓰는지, TCP 소켓으로 내려가지 않았는지 따로 본다. 이미지에 든 NCCL 2.30.7보다 이전 판은 RoCE의 노드 간 CUDA 그래프 재실행에서 교착될 수 있다고 적는다.
- **API 노출:** `--host 0.0.0.0`과 host 네트워크를 함께 쓰면 인증 없는 API가 관리 인터페이스를 포함한 모든 인터페이스에 열린다. 포트를 의도한 클라이언트로 제한하고 넓게 공개하기 전에 인증과 TLS를 둔다([[VLLM-Serving-Security|vLLM 서빙 보안]]).

| 동시 요청 | 전체 출력 tok/s | 요청당 tok/s | 평균 TTFT | 토큰 간 지연 |
|---|---|---|---|---|
| 1 | 107.4 | 115.3 | 480ms | 8.8ms |
| 8 | 386.0 | 53.0 | 434ms | 19.0ms |
| 16 | 607.8 | 42.4 | 483ms | 23.8ms |
| 32 | 385.0 | 13.0 | 899ms | 77.9ms |

AIPerf 0.12.0과 SPEED-Bench Coding(80개 대화, 89턴), 출력 한도 8,192토큰, 추론 강도 max, prefix caching 사용 조건이며 토큰 수에 추론 토큰이 들어간다. 1, 8, 16 그룹은 `--max-num-seqs 16`, 32 그룹은 32로 따로 띄웠다. 전체 처리량이 16에서 정점을 찍고 32에서 떨어지므로 동시성을 늘리면 처리량도 오른다고 가정하지 않고, 자기 프롬프트로 지연 목표를 만족하는 동시성을 다시 잰다. NVIDIA의 측정이며 재현하지 않았다.

## 단계 분리에서는 KV 페이지 소유권이 요청 격리의 경계다

KV 캐시는 원문이 아니라 입력에서 계산한 attention의 key와 value 텐서지만, 다른 요청의 답변에 섞이면 그 입력 내용이 드러날 수 있으므로 입력과 같은 수준으로 보호한다(운영 판단). SGLang처럼 디코드 노드가 프롬프트 길이만큼 KV 페이지를 예약하고 프리필 노드가 그 페이지에 KV를 써 넣은 뒤 전송 완료를 알리는 구성이 있고, vLLM의 NixlConnector처럼 디코드가 프리필에서 KV 블록을 읽어 오는 구성도 있다. 성능 때문에 페이지를 요청 사이에 0으로 지우지 않는 엔진에서 디코드가 이번 요청이 쓰지 않은 페이지까지 읽으면, 이전 요청의 프롬프트와 생성 중간 결과가 다른 사용자의 답변에 섞인다. 그래서 페이지의 소유권 추적은 추론 엔진이 맡아야 하는 책임이다.

같은 결과로 이어지는 경로는 둘로 나눠 본다.

| 경로 | 일어나는 일 | 대응 |
|---|---|---|
| 거절된 요청의 인계 | 처리할 수 없는 요청을 오류로 끝내지 않고 짧은 자리표시 입력으로 바꿔 진행하면, 프리필은 일부 페이지만 보내고 완료를 알린다. 디코드는 예약한 나머지 페이지의 이전 내용까지 읽는다 | 거절 사유가 있는 요청을 인계, 할당과 전송 전에 원래 오류로 끝낸다. 예약한 길이와 실제 전송한 길이의 대조도 방어 수단이 될 수 있지만, 사례에서 이를 넣은 SGLang 초안 PR은 병합 없이 닫혔다 |
| 전송 중인 페이지의 조기 해제 | 생성, 오프로드, 전송 수신, 중단 처리 등 여러 작업이 한 페이지를 잡고 있는데 하나가 먼저 해제하거나, 중단된 요청의 페이지를 RDMA 쓰기가 끝나기 전에 다른 요청에 넘긴다 | 진행 중인 전송이 끝날 때까지 해제를 미루고 전송 묶음의 크기를 제한한다. 지원되는 경우 전송별 checksum이나 canary로 오염을 감지한다 |

### 사례: 문맥 한도보다 작은 프리필 KV pool

2026-10-26 Cloudflare 공개 사후 보고 기준이다. Workers AI의 GLM 5.3 배포는 문맥 창을 1,048,576토큰으로 열었지만 프리필 GPU의 KV pool은 681,280토큰만 담았다. 엔진이 넘치는 프롬프트를 오류로 돌려줄 것으로 예상했으나, SGLang 스케줄러는 이를 거절 표시한 뒤 한 토큰짜리 자리표시로 바꿔 일반 배치 경로로 흘려보냈고, 단일 노드에서는 오류로 끝났지만 단계 분리에서는 디코드로 넘어갔다. 인계 대기열은 요청이 끝났는지만 보고 거절됐는지는 보지 않았다. 클라이언트는 HTTP 400 대신 200을 받았고, 2026-08-27부터 09-09 사이 681,280토큰을 넘는 프롬프트에 대한 응답 155건에 다른 사용자의 데이터가 섞였다. 외부 연구자의 버그 바운티 제보로 발견됐고, 보고서는 의도적 악용의 증거는 찾지 못했으며 다른 Workers AI 모델은 영향이 없었다고 밝힌다.

출시 전 장문 시험은 HTTP 상태 코드와 성능만 보고 출력의 정합성은 보지 않아 이를 놓쳤다. 조치는 KV pool을 약 204만 토큰(문맥 한도의 약 2배)으로 늘리고, 거절된 요청을 인계 대기열에서 할당과 전송 전에 원래 오류로 끝내는 것이다. 보고서는 SGLang 운영자에게 v0.5.22 이상으로 올리라고 권한다. 특정 수정의 포함 여부는 해당 릴리스 노트로 확인한다.

이 사례에서 끌어낼 운영 점검은 다음과 같다.

- 가중치, 양자화, 병렬화나 메모리 비율을 바꿀 때마다 실행 중인 엔진의 시작 로그에서 프리필과 디코드 노드의 KV pool 크기를 재고 문맥 한도와 비교한다. 앞단 프록시가 한도를 막아 줄 것이나 엔진이 담지 못하는 요청을 거절할 것이라고 가정하지 않는다.
- 장문 시험은 상태 코드와 지연만이 아니라 출력이 입력과 맞는지까지 검증한다.
- 클라이언트 연결이 끊겨도 전송 중인 요청을 중단하지 않도록 부하 분산기가 첫 토큰까지 요청을 유지하는지 확인한다. 중단은 위 두 번째 경로를 연다.

## 도입 전 확인

다음은 위 범위에서 도출한 운영 점검안이다.

- 공개판이 지원하는 모델과 하드웨어 조합이 실제 배포 대상과 맞는가?
- KV 캐시 계층, 단계 분리, 복제본 라우팅, HTTP와 인증을 누가 맡는가?
- 단계 분리를 쓴다면 KV pool 크기가 문맥 한도를 담고, 거절된 요청이 인계 전에 오류로 끝나는가? 중단된 요청의 페이지가 진행 중인 전송이 끝나기 전에 재할당되지 않는가?
- 결정적 모드, 초안 기반 디코딩과 구조화 출력의 조합별로 지연과 처리량을 쟀는가?
- 스키마 요청이 API 계층에서 엔진의 제약 디코딩까지 전달되는지 시험했는가?

README, 저장소의 배포 Q&A 문서와 소스의 환경 변수 정의, 공개 글을 대조했으며 빌드와 실행, 성능 재현은 하지 않았다.

## 출처

- [DeepInfer — deepseek-ai](https://github.com/deepseek-ai/DeepInfer) — 2026-10-27 README의 지원 범위, 환경 변수와 미포함 구성, 커밋 5537415의 `deepinfer/environ.py`, 가변 길이 검증 경로와 배치 불변성 시험 설정 대조
- [DeepSeek V4.1 Flash Inference Deployment Q&A — deepseek-ai](https://github.com/deepseek-ai/DeepInfer/blob/main/doc/inference_deployment_qa.md) — 2026-10-27 DSpark 가변 길이 검증 방식과 고정 길이 대비 처리량 추정 대조
- [deepseek-recipe — deepseek-ai](https://github.com/deepseek-ai/deepseek-recipe) — 2026-10-27 README의 요청 변환 범위와 구조화 출력 처리 대조
- [Defeating Nondeterminism in LLM Inference — Thinking Machines Lab, Horace He](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/) — 2025-09-10 게시
- [DeepSeek, 실서비스 추론 엔진 DeepInfer를 오픈소스로 공개 — GeekNews](https://news.hada.io/topic?id=35703) — 2026-10-20 소개 글
- [Cross-request KV cache exposure in the GLM-5.3 Workers AI model, and our remediation with SGLang — Cloudflare](https://blog.cloudflare.com/kv-cache-exposure-remediation/) — 2026-10-26 게시. 2026-11-08 대조: 사고 기간, 원인 경로, 조치와 운영자 권고
- [PD: Do not admit intake-rejected requests to a PD handoff — sgl-project/sglang](https://github.com/sgl-project/sglang/pull/38935) — 2026-09-16 병합. 인계 전 거절의 수정 범위 대조
- [Disaggregation: Honor admission aborts before KV handoff — sgl-project/sglang](https://github.com/sgl-project/sglang/pull/38704) — 2026-10-10 병합 없이 닫힘. 전송 길이 대조를 넣은 초안
- [vLLM, NixlConnector Usage Guide](https://docs.vllm.ai/en/latest/features/nixl_connector_usage.html) — 2026-11-08 디코드가 프리필의 KV 블록을 RDMA로 읽어 오는 구조 대조
- [vLLM, Speculative Decoding](https://docs.vllm.ai/en/latest/features/speculative_decoding/) — 2026-11-18 n-gram 설정 키와 기본값, 방법별 이득 분류, 무손실의 조건 대조. 기존 절은 다시 대조하지 않아 `verified_at`은 유지한다
- [vLLM, N-Gram Speculation](https://docs.vllm.ai/en/latest/features/speculative_decoding/n_gram/) — 2026-11-18 프롬프트의 n-gram 일치로 초안을 만든다는 설명 대조
- [ggml v1.0.0 — ggml-org](https://github.com/ggml-org/ggml/releases/tag/v1.0.0) — 2026-11-16 제거된 API, RPC v9와 백엔드 변경 대조
- [dist : releases and versioning of ggml-org projects — ggml-org/ggml](https://github.com/ggml-org/ggml/discussions/1579) — 2026-08-07 작성된 토론, 2026-11-16 시맨틱 버전, major 기준과 내장 ggml의 릴리스 태그 조건 대조
- [When One GPU Isn't Enough: Serving GLM-5.3 Across Two NVIDIA DGX Stations with vLLM — NVIDIA Technical Blog, Fatima Fall](https://developer.nvidia.com/blog/when-one-gpu-isnt-enough-serving-glm-5-3-across-two-nvidia-dgx-stations-with-vllm/) — 2026-11-13 게시. 2026-11-16 구성, 플래그, 검증 절차와 결과 표 대조
- [ggml v1.0.0 - 폐기 예정 API 제거, FP8 지원과 백엔드 성능 개선 — GeekNews](https://news.hada.io/topic?id=37153)
- [DGX Station 2대에서 vLLM으로 GLM-5.3 로컬 서빙하기 — GeekNews](https://news.hada.io/topic?id=37221)
- [YouTube, Marina Wyss, AI Engineering in 76 Minutes (Complete Course/Speedrun!)](https://www.youtube.com/watch?v=JV3pL1_mn2M) — 2025-04-01 업로드. Chip Huyen의 책 AI Engineering(O'Reilly Media, 2025)을 요약한 강의로 입력에서 초안을 가져오는 디코딩 단락의 계기다. 사실은 vLLM 문서로 대조했다

## 관련 문서

- [[LLM-Inference-Bottlenecks|LLM 추론 병목]]
- [[LLM-Gateway|LLM 게이트웨이]]
- [[VLLM-Serving-Security|vLLM 서빙 보안]]
- [[LLM-Failure-Handling-Response-Validation|구조화 출력과 응답 검증]]
- [[Local-Inference-Deployment-Cases|로컬 추론의 배포 사례]]
- [[Deterministic-Test|결정적 테스트와 flaky 대응]]
