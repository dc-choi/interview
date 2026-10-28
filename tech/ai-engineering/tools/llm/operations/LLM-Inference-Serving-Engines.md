---
tags: [ai, llm, inference, serving, determinism, speculative-decoding, structured-output]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Inference Serving Engines", "추론 서빙 엔진", "DeepInfer", "DSpark", "Batch Invariance", "배치 불변 추론"]
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

## 긴 문맥 재처리의 범위를 제한한다

SWA bounded replay는 디코더 프리필에서 정해진 길이의 끝부분만 다시 처리해 작업을 줄인다. V4.1 기본값은 `DEEPINFER_YOCO_PREFILL_TRUNCATION_MODE=compact`와 `DEEPINFER_YOCO_PREFILL_KEEP_TOKENS=140`이며, 남기는 끝부분은 sliding window attention의 창과 최대 backtracking 길이를 모두 덮어야 한다. 모델 구조에 묶인 값이므로 다른 모델이나 체크포인트에 그대로 옮기지 않는다.

## 구조화 출력은 API 수락과 디코딩 강제를 나눠 확인한다

DeepInfer는 정규식, JSON Schema와 EBNF 문법으로 생성을 제한하며 `SamplingParams`에 `so_args={"schema_type": ..., "schema": ...}`를 넘긴다. deepseek-recipe는 Chat Completions의 `response_format`(`json_schema`, `regex`)과 Responses의 `text.format`(`json_schema`)을 변환한다. JSON Schema를 검증해 프롬프트에 쓰고 요청에 맞는 출력 제약을 고르지만, 그 제약을 제약 디코딩으로 강제할지는 호출자의 백엔드가 정한다.

API 계층이 스키마 요청을 받아들였다는 사실을 디코딩 단계의 강제로 해석하지 않는다. 형식을 강제해도 값의 의미는 보장되지 않으므로 [[LLM-Failure-Handling-Response-Validation#구조화 출력은 형식만 보장한다|구조화 출력의 한계]]처럼 의미 검증을 따로 둔다.

## 공개 벤치마크의 측정 조건

DeepInfer README의 성능 그래프는 프리필에 SM100 GPU 4개, 디코드에 64개를 쓰고 각각 하나의 scale-up domain 안에서 측정했다고 밝힌다. 본문에는 수치가 없고 그래프와 재현 스크립트 `examples/sweep/run_sweep.sh`만 있다. 장비 수와 연결 구조가 다른 환경에 결과를 옮기지 않는다.

## 도입 전 확인

다음은 위 범위에서 도출한 운영 점검안이다.

- 공개판이 지원하는 모델과 하드웨어 조합이 실제 배포 대상과 맞는가?
- KV 캐시 계층, 단계 분리, 복제본 라우팅, HTTP와 인증을 누가 맡는가?
- 결정적 모드, 초안 기반 디코딩과 구조화 출력의 조합별로 지연과 처리량을 쟀는가?
- 스키마 요청이 API 계층에서 엔진의 제약 디코딩까지 전달되는지 시험했는가?

README, 저장소의 배포 Q&A 문서와 소스의 환경 변수 정의, 공개 글을 대조했으며 빌드와 실행, 성능 재현은 하지 않았다.

## 출처

- [DeepInfer — deepseek-ai](https://github.com/deepseek-ai/DeepInfer) — 2026-10-27 README의 지원 범위, 환경 변수와 미포함 구성, 커밋 5537415의 `deepinfer/environ.py`, 가변 길이 검증 경로와 배치 불변성 시험 설정 대조
- [DeepSeek V4.1 Flash Inference Deployment Q&A — deepseek-ai](https://github.com/deepseek-ai/DeepInfer/blob/main/doc/inference_deployment_qa.md) — 2026-10-27 DSpark 가변 길이 검증 방식과 고정 길이 대비 처리량 추정 대조
- [deepseek-recipe — deepseek-ai](https://github.com/deepseek-ai/deepseek-recipe) — 2026-10-27 README의 요청 변환 범위와 구조화 출력 처리 대조
- [Defeating Nondeterminism in LLM Inference — Thinking Machines Lab, Horace He](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/) — 2025-09-10 게시
- [DeepSeek, 실서비스 추론 엔진 DeepInfer를 오픈소스로 공개 — GeekNews](https://news.hada.io/topic?id=35703) — 2026-10-20 소개 글

## 관련 문서

- [[LLM-Inference-Bottlenecks|LLM 추론 병목]]
- [[LLM-Gateway|LLM 게이트웨이]]
- [[VLLM-Serving-Security|vLLM 서빙 보안]]
- [[LLM-Failure-Handling-Response-Validation|구조화 출력과 응답 검증]]
- [[Local-Inference-Deployment-Cases|로컬 추론의 배포 사례]]
- [[Deterministic-Test|결정적 테스트와 flaky 대응]]
