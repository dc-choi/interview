---
tags: [ai, llm, inference, serving, performance, edge, hardware]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Inference Bottlenecks", "LLM 추론 병목", "Memory-bound Decode", "루프라인과 LLM 서빙"]
---

# LLM 추론 병목 — 디코드는 연산이 아니라 데이터 이동에 묶인다

LLM 추론 속도는 가속기의 연산 성능(TOPS, FLOPS)만으로 예측할 수 없다. 온칩 캐시에 가중치가 들어가지 않는 dense 모델의 작은 배치 디코드는 가중치와 KV 캐시를 읽는 메모리 대역폭에 묶이기 쉽다. 배치 크기, 컨텍스트 길이와 모델 구조가 달라지면 병목도 달라진다. 모델의 학습과 생성 원리는 [[LLM-Generation-Mechanics|LLM 동작 원리]]가 다루고, 이 문서는 용량과 데이터 이동이 추론에 주는 제약을 다룬다.

## 멘탈 모델 — 루프라인과 arithmetic intensity

- arithmetic intensity는 연산량을 메모리 트래픽으로 나눈 값(OP/byte)이다.
- 하드웨어의 피크 연산을 피크 대역폭으로 나눈 값이 루프라인의 릿지 포인트다. 워크로드의 intensity가 이 값보다 낮으면 memory-bound, 높으면 compute-bound다.
- memory-bound 구간에서는 TOPS를 올려도 성능이 오르지 않는다. 최적화 대상은 이 판정에 따라 완전히 갈린다.

## 프리필과 디코드는 병목이 다르다

| 단계 | 하는 일 | 가중치 재사용 | 병목 |
|---|---|---|---|
| 프리필 | 프롬프트 토큰을 병렬 처리 | 여러 토큰이 같은 가중치를 공유 | 충분히 긴 입력의 행렬곱은 compute-bound에 가까움 |
| 디코드 | 토큰을 순차 생성 | 작은 배치의 dense 모델은 가중치 재사용이 적음 | 작은 배치에서는 memory-bound가 되기 쉬움 |

배치 크기 1의 dense 행렬곱에서 FP16 가중치 하나(2바이트)는 MAC 1회(곱셈과 덧셈, 2 FLOPs)에 쓰인다. 가중치 읽기가 지배하고 입력과 출력 전송을 무시한 근사에서는 약 1 FLOP/byte다. 긴 컨텍스트에서는 KV 캐시 읽기도 중요해지므로 가중치 크기만으로 지연을 계산하지 않는다. 프롬프트 접두어의 프리필을 재사용하는 [[LLM-Prompt-Caching|프롬프트 캐싱]]은 프리필 쪽 비용을 줄이는 기법이다.

### 프리필과 디코드를 다른 자원에 배치한다

Prefill-decode disaggregation은 두 단계를 별도 자원에 배치해 간섭을 줄이고 단계별 자원 수와 병렬화 전략을 조정하는 방식이다. DistServe(OSDI 2024)는 TTFT와 TPOT 목표를 함께 만족하는 요청 처리율을 최적화한다. 단계를 나누면 KV 캐시 전달 비용이 생기므로 자원 사이의 통신 대역폭과 배치 위치도 고려한다.

하드웨어를 다르게 선택하는 사례로 AWS와 Cerebras의 2026-03-13 발표가 있다. 발표한 구성은 Trainium 계열 서버가 프리필을, CS-3가 디코드를 맡고 EFA로 연결하는 구조다. 이 발표는 향후 Bedrock 제공 계획을 설명한 자료이므로 현재 사용 가능한 모델, 리전이나 성능 보장으로 옮기지 않는다.

적용 여부는 같은 모델과 입력, 출력 길이 및 동시성에서 TTFT, TPOT, 전체 지연과 비용을 비교해 판단한다. 분리한 단계의 처리량이 높아져도 전달과 대기 비용을 포함한 지연 목표를 만족하는지 확인해야 한다. 2026-10-10 원 논문과 공식 발표의 구조를 대조했으며 제품 성능을 독립 재현하지 않았다.

## 서빙 기법이 줄이는 비용은 다르다

- 배칭과 continuous batching: 한 번 읽은 가중치로 여러 요청의 토큰을 처리해 intensity를 올린다. 요청이 끝나는 대로 새 요청을 배치에 끼워 넣어 GPU가 비는 시간을 줄인다.
- KV 캐시: 이전 토큰의 key와 value를 저장해 재계산을 피한다. 대신 그 자체가 메모리를 차지해 배치 크기와 컨텍스트 길이를 제한하므로, 캐시 메모리를 페이지 단위로 관리해 단편화를 줄이는 기법(PagedAttention)이 나왔다.
- speculative decoding: 작은 모델이 여러 토큰을 제안하고 큰 모델이 묶어서 검증한다. 제안의 수락률과 검증 비용에 따라 속도 이득이 달라진다. 대상 모델은 계속 필요하므로 가중치 용량 부족의 해법은 아니다.
- 양자화: 가중치나 KV 캐시의 저장 정밀도를 낮춰 용량과 읽을 바이트 수를 줄인다. 저장 정밀도와 연산 정밀도는 다를 수 있으며, 커널과 하드웨어, 변환 비용에 따라 속도 이득이 달라진다. 비트 수 감소 비율을 그대로 가속 배율로 쓰지 않는다.

## 로컬 추론의 용량과 지연을 따로 계산한다

2026-10-06에 아래 용량 구분과 오프로딩 설명을 Hugging Face 공식 문서에 대조했다. API 예시는 생략하고 메모리 예산의 원칙을 다룬다.

- **가중치 하한:** 파라미터 수 × 저장 비트 수 / 8로 계산한다. 8B 파라미터를 모두 16비트로 저장하면 16 GB, 4비트면 4 GB다(십진 단위). 양자화 메타데이터, 고정밀로 남긴 모듈과 실행 중 할당은 제외한 산술 예시다.
- **추가 할당:** KV 캐시, 중간 텐서, 런타임과 커널 메모리를 별도로 남긴다. 전체 문맥을 유지하는 KV 캐시는 토큰 수와 동시 요청 수에 따라 커지며, sliding window 계층은 창 크기에서 증가가 멈출 수 있다. 모델 파일이 VRAM보다 작다는 사실만으로 실행을 보장하지 않는다.
- **가중치 오프로딩:** Accelerate는 CPU에 둔 가중치를 해당 계층의 실행 직전에 GPU로 옮기고 사용 뒤 정리할 수 있다. 디스크에 둔 가중치는 RAM을 거친다. GPU 상주 용량은 줄지만 전송 비용이 생기므로 RAM과 VRAM을 같은 속도의 단일 용량으로 합산하지 않는다.
- **캐시 오프로딩과 양자화:** 가중치와 별개로 KV 캐시를 CPU로 옮기거나 낮은 정밀도로 저장할 수 있다. CPU 왕복은 처리량을 낮출 수 있고, 짧은 문맥에 GPU 여유가 있으면 캐시 양자화가 오히려 지연을 늘릴 수 있다.

운영에서는 대표 입력으로 답변 품질, 최대 메모리, 첫 토큰 지연과 이후 생성 속도를 함께 측정한다. 먼저 문맥 길이와 동시 요청 수를 제한하고, 용량이 부족하면 양자화나 오프로딩을 비교한다. 적재에 성공해도 대화형 응답 시간을 만족하지 못하면 더 작은 모델을 검토한다.

### MoE는 전문가의 저장 위치와 계산 위치를 나눈다

MoE(Mixture of Experts) 모델은 토큰마다 라우터가 고른 일부 전문가만 계산하므로, 모든 토큰이 쓰는 dense 가중치와 자주 쓰이는 전문가만 VRAM에 두고 나머지 전문가는 CPU RAM에 둘 수 있다. VRAM에 없는 전문가는 위의 가중치 오프로딩처럼 GPU로 옮겨 계산하거나, 활성값을 CPU로 보내 그 자리에서 계산한다. 2026-10-11에 원 논문, llama.cpp 서버 문서와 PR, 모델 카드와 프로젝트 저장소를 대조했다.

- **계산 위치:** Fiddler(ICLR 2025)는 전문가에 들어가는 토큰이 적으면 활성값이 전문가 가중치보다 훨씬 작아 CPU 계산이 전송량을 줄이고, 입력이 임계값을 넘으면 가중치를 GPU로 옮기는 편이 낫다고 분석한다. 실행 중에는 CPU 계산 지연을 GPU 계산과 전송 지연의 합과 비교해 위치를 고르고, 자주 쓰이는 전문가는 오프라인 프로파일링으로 GPU에 둔다. 전문가당 입력 토큰이 적은 디코드와 많은 긴 프리필에서 유리한 계산 위치가 달라질 수 있다는 뜻이다.
- **엔진 옵션:** llama.cpp 서버는 모든 MoE 가중치를 CPU에 두는 `--cpu-moe`와 앞쪽 N개 층의 MoE 가중치만 CPU에 두는 `--n-cpu-moe`를 제공한다(master 문서 기준). CPU에 둔 전문가의 GPU 캐시 크기를 MiB로 정하는 `--moe-cache-mib`(기본 0, 비활성)도 있으며, 2026-10-07(UTC) 병합된 PR 설명 기준으로 캐시를 켜면 32토큰 이하의 작은 배치에서는 CPU에 둔 전문가도 GPU에서 계산하되 LRU 캐시에 없는 전문가만 올리고, 큰 배치는 기존 오프로딩 경로를 쓴다. 값을 바꿀 때마다 최대 메모리, 프롬프트 처리와 생성 속도를 다시 잰다.

Strata는 이 구조로 소비자 GPU 한 장에서 Qwen3.8-Flash-Next를 실행하는 추론 엔진이다. 모델 카드 기준 이 모델은 125B 파라미터 중 토큰당 6B가 활성화되는 MoE이며, 48개 층마다 라우팅 전문가 512개 중 10개와 별도의 공유 전문가 1개를 쓰고 별도로 51B n-gram 임베딩과 4B MTP(multi-token prediction) 층을 둔다. 아래 설명과 수치는 프로젝트 논문(2026년 9월)과 README 표의 것이다. 엔진은 이후 버전에서 샘플링 처리, 프롬프트 처리 단위, PCIe 복사 비율 같은 기본 동작이 바뀌고 있으므로, 수치는 해당 시점의 측정으로 읽고 현재 동작은 저장소 문서로 확인한다.

- **접근 빈도별 배치:** 공유 전문가를 포함한 dense 가중치와 MTP 층은 VRAM에, 라우팅 전문가 24,576개(48층 × 512개) 전체는 고정(pinned) RAM에 두고 남은 VRAM을 자주 쓰이는 전문가 캐시로 채운다. 토큰마다 몇 행만 조회하는 28.8 GB n-gram 표는 SSD에 두고 필요한 16행을 한 단계 앞서 읽는다. 12 GB 카드의 4K 문맥에서 다른 프롬프트의 프로파일로 채운 4,500개 슬롯은 라우팅된 전문가의 50%를 처리했고, 대화에서 자주 쓰이는 전문가로 교체하자 약 72%로 올랐다. VRAM이 1 GB 늘 때마다 전문가 약 700개를 더 담아 CPU 계산이 줄므로, 프로젝트는 이 구성에서 더 빠른 GPU보다 더 큰 VRAM을 중요하게 본다.
- **같은 층의 동시 처리:** 디코드(검증 창)에서는 층마다 라우터가 토큰별로 고른 전문가 ID(토큰당 10개)를 GPU가 고정 호스트 메모리의 작은 블록(doorbell)에 쓰면, 드라이버 대기 대신 이 블록을 계속 확인하던 CPU가 일을 나눈다. 캐시에 있는 전문가는 GPU가 계산하고, 놓친 전문가 중 일부는 PCIe로 복사해 GPU가, 나머지는 CPU가 RAM의 가중치로 계산한 뒤 GPU가 결과를 합친다. PCIe 복사도 RAM 대역폭을 쓰므로 복사 비율은 CPU 계산이 이미 RAM 대역폭을 쓰는 Q2_0에서 20%, 연산에 묶여 대역폭이 남는 i-quant 파일(IQ2_XS 등)에서 55%로 다르다(논문 측정 PC 기준). 논문 시점에는 프롬프트를 2,048토큰 단위로 처리해 전문가마다 여러 토큰이 몰리므로, 캐시에 없는 전문가를 층마다 PCIe로 GPU에 복사해 계산한다. 위 Fiddler의 임계값 분석과 같은 방향이다.
- **MTP 검증:** 토큰마다 약 3.5 GB(논문 본문 기준)의 dense 가중치를 읽는 비용이 네 토큰을 함께 처리해도 거의 늘지 않으므로, 내장 MTP 층의 초안 최대 3개를 마지막 확정 토큰과 함께 한 번에 검증한다. 논문은 일부러 틀린 초안과 롤백을 넣은 시험으로 출력이 greedy decoding과 토큰 단위로 같다고 밝혔다. 이 동일성은 논문 시점의 greedy 설정에 대한 주장이며, 샘플링 설정과 이후 버전의 기본값에 그대로 옮기지 않는다.
- **비교 경계:** README 표는 RTX 5070 12 GB, Ryzen 5 7600, 64 GB RAM에서 Q2_0(엔진 0.1.36)의 생성 94 tok/s(4K 조건)와 32K 프롬프트 처리 2,650 tok/s를 제시한다. 프로젝트 자체 측정이며 이 문서에서 재현하지 않았다. 클라우드 API와 잰 속도 배율은 가중치 정밀도, reasoning 설정과 출력 길이, 네트워크 왕복, 공급자의 동시 부하가 다르면 엔진 비교가 아니므로, 다음 절처럼 측정 구간과 설정을 맞춘 결과만 비교에 쓴다.

## 로컬 엔진 비교는 측정 구간과 설정을 맞춘다

2026-10-09 확인한 `llama-bench` 문서는 prompt processing(`pp`)과 token generation(`tg`)을 나누고, 반복 실행의 평균 tok/s와 표준편차를 보고한다. 이 측정에는 토큰화와 샘플링 시간이 포함되지 않는다. 따라서 `tg` 속도 배율을 사용자 요청 전체의 응답 시간 배율로 옮기지 않는다.

- **비교 조건:** 같은 모델과 가중치 양자화뿐 아니라 KV 캐시 정밀도, 입력과 출력 길이, 기존 컨텍스트 깊이, 배치 크기, GPU 오프로딩과 엔진 버전을 함께 기록한다. `llama-bench`에서는 캐시 정밀도, 길이, 깊이, 배치와 오프로딩 조건을 옵션으로 지정할 수 있다.
- **준비 비용:** 모델 적재와 장비별 커널 튜닝, 워밍업 시간을 준비 비용으로 따로 기록한다. 모델이 이미 올라온 반복 요청과 처음 실행하는 요청을 나누어 측정한다.
- **두 가지 비교:** 동일한 정밀도와 설정에서 엔진 차이를 비교하는 시험과, 각 엔진의 권장 설정에서 품질과 메모리까지 비교하는 시험을 구분한다. 캐시 압축 조건이 다르면 커널 최적화만의 효과로 해석하지 않는다.

장비에서 커널 구성을 튜닝하는 Magnitude는 이러한 비교의 한 사례다. 프로젝트 README는 Metal에서 프리필 9%, 디코드 92% 개선을, CUDA에서는 각각 23%, 19% 개선을 제시한다. 이는 프로젝트가 보고한 특정 비교 결과이며 독립 재현 결과나 모든 장비의 성능 보장이 아니다. 이 문서에서는 수치를 재현하지 않았고, 실제 선택에는 위 조건과 응답 품질을 맞춘 별도 측정이 필요하다.

### 추론 런타임의 최적화 목표와 호출 방식을 맞춘다

하드웨어가 같아도 단일 요청 지연과 여러 요청의 처리량은 다른 최적화 목표다. OpenVINO 2024 문서의 performance hint를 2026-10-10에 대조한 범위는 다음과 같다. 이는 일반 추론 런타임의 설정이며 LLM 생성 전체의 속도 보장은 아니다.

- `LATENCY`와 `THROUGHPUT`은 장치와 모델에 맞는 실행 설정을 선택하는 힌트다. `THROUGHPUT`은 CPU/GPU stream 수 등을 조정하지만 모델 적재 시간과 메모리 사용량이 늘 수 있다.
- 해당 문서에서 두 힌트의 성능 개선은 비동기 추론 파이프라인을 전제로 한다. 동기 호출을 직렬로 반복하면서 처리량 힌트만 바꾼 결과를 런타임의 병렬 처리 한계로 해석하지 않는다.
- 애플리케이션은 `optimal_number_of_infer_requests`를 조회해 권장 병렬 요청 수를 확인한다. 처리량 설정에 전달하는 `num_requests`는 애플리케이션이 제공할 수 있는 병렬성의 제약을 알리는 값이지 요청을 자동 생성하는 기능이 아니다.

비교 시험에서는 힌트, 실제 동시 요청 수, 적재 시간과 최대 메모리를 함께 기록한다. LLM 서비스라면 TTFT, 토큰 간 지연과 전체 응답 시간도 별도로 측정한다. 이 절에서는 하드웨어 벤치마크나 비용, 전력 절감률을 재현하지 않았다.

## 에이전트 서빙은 세션 단위로 측정한다

단일 요청의 입력 길이를 고정한 채 얻은 처리량은 대화와 도구 결과가 누적되는 세션의 용량을 대표하지 못할 수 있다. 턴이 진행될수록 프리필과 KV 캐시 부담이 달라지므로 다음 조건을 함께 남긴다.

- **워크로드:** 턴 순서, 턴별 입력과 출력 길이, 세션 길이, 컨텍스트 상한과 잘라내기 정책.
- **캐시:** prefix caching 설정, 재사용한 토큰과 새로 처리한 토큰, 캐시 적중률. 합성 입력은 길이뿐 아니라 접두어 재사용 구조도 맞춘다.
- **부하:** 동시성을 단계적으로 높여 req/s가 더 늘지 않는 포화점을 찾는다. TTFT, TPOT, 전체 응답 지연의 분포와 메모리 점유도 함께 본다. 출력 tok/s만으로 긴 입력 처리 비용을 판단하지 않는다.

AgentPerfBench v1(2026-09-28)의 고동시성 합성 프로파일 비교에서는 동시성을 200에서 320으로 높였을 때 일부 에이전트 구성의 req/s가 43~76% 줄었다. 그러나 비교 가능한 에이전트 66개 구성 중 41개는 변화가 ±10% 이내였고, 15개가 10% 넘게 감소했다. 43~76%를 모든 에이전트의 감소율로 일반화하지 않는다. 실제 trace 재생과 합성 프로파일의 결과도 구분한다.

실무 적용 시에는 포화점과 서비스 허용 부하를 따로 정한다. 처리량이 최대여도 지연 목표를 넘으면 운영 동시성으로 채택하지 않는다. 위 내용은 2026-10-06 원 논문의 측정 방법과 결과를 대조한 범위이며, 특정 GPU의 구매 성능이나 에이전트의 업무 성공률을 보장하지 않는다.

### 라우팅, 과부하 거절과 확장을 따로 설계한다

캐시 적중률이 높아도 한 worker에 요청이 몰리면 지연 목표를 놓칠 수 있다. 2026-10-24에 확인한 NVIDIA Dynamo v1.5.1 문서는 다음 역할을 구분한다.

| 역할 | 확인한 동작 | 적용할 때의 질문 |
|---|---|---|
| KV-aware routing | 재사용 가능한 prefix와 진행 중인 prefill/decode 부하를 함께 평가 | 캐시 적중률과 worker별 부하를 함께 봤는가 |
| 과부하 거절 | Frontend의 busy worker 제외와 worker 자체의 동시 요청 상한을 분리 | 부하 신호, 임계값과 실제 거절 응답을 확인했는가 |
| Planner | prefill/decode replica 수를 조절하며, 모드에 따라 부하 임계값이나 TTFT/ITL 목표를 사용 | 일시적인 급증과 지속적인 용량 부족을 구분했는가 |

해당 버전의 거절 아키텍처 문서는 과부하 HTTP 응답의 기본값을 529로 설명한다. 서비스 사례의 429를 엔진의 공통 기본값으로 옮기지 않고 배포 버전과 설정을 확인한다. 부하 분산, 수용량 제한과 자원 확장은 서로 다른 조정 수단이므로 하나의 캐시 적중률이나 처리량으로 모두 평가하지 않는다.

적용 제안: 같은 모델과 길이 분포에서 worker별 부하, 대기, 거절률, TTFT와 토큰 간 지연을 함께 비교한다. 위 질문은 공개 서빙 사례를 공식 문서와 연결한 점검 틀이며, 특정 회사의 엔진 성능 배율이나 SLA 달성, GPU 운영을 재현한 결과는 아니다. 기존 본문 전체의 재검증은 아니므로 `verified_at`은 유지한다.

## 가속기 스펙 읽기

- TOPS 단독 수치는 LLM 성능 예측에 거의 쓸모가 없다. TOPS와 메모리 대역폭의 비, 즉 릿지 포인트를 본다.
- 스펙시트의 총 대역폭과 실제로 동시에 쓸 수 있는 대역폭은 다르다. 전송 경로가 직렬로 실행되면 경로를 늘려도 시간이 중첩되지 않고 더해진다. 대역폭 증설만큼 전송 동시성이 중요하다.
- CNN을 전제로 설계된 가속기는 작은 커널을 큰 피처맵 전체에 재사용하므로 온칩 SRAM에 가중치를 올려두고 데이터를 흘리면 재사용률이 높다. 작은 배치의 트랜스포머 디코드는 가중치 재사용이 적어, 수 MiB의 온칩 메모리만으로 수 GB의 가중치 전송을 없애기 어렵다.

### 사례 수치는 CPU와 GPU 작업을 나눠 읽는다

가속기 도입 사례에서 전체 파이프라인의 개선을 GPU 교체 효과로 합산하지 않는다. 2026-10-06 확인한 AMD의 MindWalk 사례는 서로 다른 작업을 구분한다.

| 작업 | 보고된 결과 | 해석 경계 |
|---|---|---|
| MI300X 기반 문헌 처리 | 초기 시험에서 백만 샘플당 비용 약 39% 감소 | 가격과 처리량이 섞인 비용 지표이며 순수 속도 배율이 아니다 |
| MI300X 기반 단백질 언어 모델 임베딩 | 비교 플랫폼보다 처리량 약 70% 증가 | 위 비용 시험과 다른 지표이며 일반 LLM 디코드 성능이 아니다 |
| EPYC CPU 클러스터의 항체 쌍 검사 | 여러 64코어 노드에서 17만 쌍 이상을 약 4.5시간에 처리 | 이전 플랫폼의 145일은 같은 작업에 대한 추정치다. GPU 단독 가속으로 해석하지 않는다 |

CPU 사례에는 병렬화, 단계 간 데이터 전달, CPU 활용률과 하드웨어 최적화가 함께 들어갔다. AMD는 성능과 비용 주장을 고객사가 제공했으며 독립 검증하지 않았다고 명시한다. 따라서 이 수치는 특정 구성의 사례로 두고, 재현 가능한 비교에는 모델, 데이터, 노드 수, 정밀도, 소프트웨어와 가격 조건을 함께 확보한다.

## 사례 — Apple M1 Neural Engine 역공학

한 역공학 분석(2026년 8월, M1 ANE 기준)의 수치다.

- 하드웨어: 연산 코어 16개, 병렬 MAC 레인 2,048개, 코어당 커널 메모리 64 KiB(총 1 MiB), 공유 L2 SRAM 2 MiB.
- 릿지 포인트: 11 TOP/s를 68 GB/s로 나눈 162 OP/byte. 피크 연산을 유지하려면 DRAM 1바이트당 162 연산이 필요한데, 가중치를 DRAM에서 직접 스트리밍하면 22 TB/s가 필요해 가용 대역폭의 300배가 넘는다.
- 실측 DRAM 처리량: ANE KernelDMA 37.99 GB/s, ANE TileDMA 59.08 GB/s, GPU(Metal 셰이더) 77.70 GB/s. 커널 DMA와 타일 DMA 요청은 직렬로 실행돼 결합 시 시간이 더해진다.
- 결론: 트랜스포머 단일 토큰 디코드는 가중치 재사용과 메모리 대비 연산 비율에서 최악의 경우다. ANE는 가중치 재사용이 예측 가능한 CNN 워크로드를 전제로 설계됐다. 초당 10토큰에서 25토큰으로 가려면 약 2.5배의 메모리 스트리밍 대역폭이 필요하다는 것은 저자의 산술 추정이며 구현되거나 측정된 결과가 아니다.

한정: M1 실측이며 이후 세대에 그대로 적용할 근거는 없다. GPU 수치는 대역폭 측정 비교이지 종단 추론 성능 비교가 아니고, ANE의 존재 이유인 전력 효율은 분석 대상이 아니었다.

## 연구 사례 — 가중치를 방송으로 받아 수신 회로에서 계산한다

디코드가 가중치 이동에 묶인다는 진단에서 출발해, 기기가 가중치를 저장하거나 메모리에서 읽지 않게 하려는 연구 제안이 있다. 2026-09-30(UTC) arXiv에 v1이 제출된 AIR-LLM(MIT, Duke 연구진)은 중앙 무선국(예: 5G 기지국)이 가중치를 OFDM 부반송파에 실어 방송하고, 기기가 수신기의 RF 믹서에서 내적을 계산하는 구조를 제안한다. 이름이 비슷한 계층 단위 로딩 라이브러리 AirLLM과는 무관하다. 아래는 2026-10-12 논문 v1의 본문과 부록을 대조한 범위이며 시제품 성능이 아니다.

- **계산 위치:** 복소 부반송파 하나가 서로 다른 두 행의 가중치를 실수부와 허수부로 운반한다. 기기가 활성값으로 만든 파형을 믹서의 LO에 넣으면 시간 영역의 곱이 주파수 영역의 합성곱이 되어 가운데 부반송파에 내적이 모인다. 활성값 파형은 디지털에서 precoding과 IFFT를 거친 뒤 DAC로 만든다. 믹서와 LPF를 거친 출력은 안테나마다 ADC로 샘플링하고, 디지털에서 FFT와 postcoding을 거친 보정 유닛 출력들을 합산한다. 모델 전체로는 가중치와 활성값의 행렬-벡터 곱(GEMV)만 아날로그로 계산하고 나머지 연산은 디지털로 처리한다. 프롬프트는 기기에 남고, 한 번의 방송을 커버리지 안의 여러 기기가 함께 쓴다.
- **보고된 결과:** Llama 3.1 8B에서 도시마다 고른 사용자 한 명 기준(시퀀스 길이 2,048) WikiText-2 perplexity는 FP16의 6.24에서 Paris 사용자 6.49(4.0% 상승), Munich 사용자 7.37로 올랐다. 이 4.0%는 정확도 하락률이 아니다. Paris 사용자의 perplexity는 4비트 가중치 기준선(6.65~6.83)보다 낮았지만, 6개 상식 추론 과제의 zero-shot 평균 정확도는 75.00%에서 68.72%로 낮아져 4비트 기준선(73.77~74.51%)보다 낮고 3비트 기준선 범위(66.00~69.96%)에 들었다(Munich 사용자 65.67%). 논문은 후보 답마다 잡음이 따로 적용되는 채점 방식 때문에 이 지표가 perplexity보다 아날로그 계산에 불리하다고 설명한다. 토큰당 에너지는 Paris 사용자 기준 5G NR 유니캐스트로 FP16 가중치를 받는 원격 기준선 대비 157.7배, 로컬 메모리에서 FP16 가중치를 읽는 기준선 대비 51.5배 줄었고, 4비트 가중치를 받는 원격 기준선 대비로는 40.4배 줄었다고 보고한다. 토큰당 airtime은 Paris 단일 사용자 기준 원격 FP16 대비 5.11배, 원격 4비트 대비 1.28배 짧고, Paris 사용자 20명에서는 104.1배와 26.0배로 벌어진다.
- **해석 경계:** 채널은 Paris와 Munich 디지털 트윈의 ray-tracing 시뮬레이션이고, 믹서 왜곡은 유선 테스트베드에서 잰 값이다. 기본 설정의 기기는 안테나 포트 4개와 보정 유닛 8개를 쓰고, 보정 유닛마다 안테나 수만큼 믹서, LPF, ADC 경로를 둔다. 에너지는 DAC와 ADC 샘플 수, 디지털 연산 FLOP에 연산당 문헌값을 곱한 기기 측 추정이다. 중앙 무선국의 송신 전력은 비교에 들어 있지 않고, 수신 RF 아날로그 회로의 전력도 에너지 식에 항목으로 없다. 채널에 따라 품질 편차가 크다. 20대씩 배치한 시나리오에서 유효 비트가 약 3.5비트 이상인 기기(Paris 16대, Munich 8대)는 자연스러운 문장을 냈지만, 그 아래에서는 perplexity가 7점대여도 지어낸 세부가 나타났고 약 2.5비트 아래에서야 붕괴했다. 채널 행렬이 거의 특이(singular)해진 Paris 기기 하나(경로 손실 84.0 dB)는 몇 개의 토큰을 되풀이했고 perplexity가 255.27이었다. 저자는 실패하는 기기가 단지 먼 기기가 아니라 채널을 역변환하기 어려운 소수라고 본다. 토큰마다 각 층의 가중치를 다시 방송해야 하고(논문은 토큰당 비용이 이 전송에 지배돼 문맥 길이와 무관하다고 보며 어텐션과 KV 캐시 비용은 따로 제시하지 않는다), 절대 지연과 처리량을 보고하지 않으므로 대화형 응답 시간은 이 결과로 판단하지 않는다.

## 학습 자료 — 파운데이션 모델 엔지니어링 교재

웹에서 공개 열람할 수 있는 교재(영어, 한국어 번역 제공, 2026년 8월 기준 20장)가 사전학습과 학습 시스템, 스케일링, 사후학습과 정렬, 멀티모달, 추론 최적화, 압축, RAG, 추론 시점 스케일링, 에이전트, 평가, 안전, 해석가능성, 차세대 아키텍처를 한 축으로 묶는다. 역할별 진입점을 잡는 편이 순차 독파보다 낫다. 서빙 엔지니어는 추론 최적화(KV 캐시 관리, PagedAttention, continuous batching, speculative decoding, 긴 컨텍스트 서빙, 서빙 정책과 SLO)와 압축(양자화, 희소화, 증류) 장에서 시작한다. RAG 구축은 RAG 장, 평가 체계는 평가 장, 에이전트 신뢰성은 에이전트 장, 모델 선택과 학습 예산은 스케일링 법칙 장이 진입점이다. 각 장 마지막에 운영 절(서빙 SLO와 폴백, RAG 실패 모드, 에이전트 복구와 가드레일, 프로덕션 평가와 릴리스 게이트)이 있는 점이 특징이다. 라이선스가 명시되지 않았으므로 공개 열람이 가능하다는 사실과 재배포나 인용 허용 범위는 별개다.

## 면접 체크포인트

- 프리필과 디코드의 병목이 왜 다른지 arithmetic intensity로 설명할 수 있는가.
- 배칭, KV 캐시, speculative decoding, 양자화가 각각 어떤 비용을 줄이고 어떤 메모리를 추가로 요구하는지 설명할 수 있는가.
- 가속기 스펙에서 TOPS 대신 무엇을 봐야 하는지, 스펙 대역폭과 실효 대역폭이 왜 다른지 말할 수 있는가.
- MoE 모델이 VRAM보다 클 때 가중치를 토큰당 읽는 양과 접근 빈도에 따라 VRAM과 RAM에 나누고(토큰마다 몇 행만 읽는 대형 조회 표는 SSD도 고려하고), 놓친 전문가를 CPU에서 계산할지 GPU로 옮길지를 입력 토큰 수, 대역폭과 캐시 적중률로 판단할 수 있는가.

## 출처

- [NVIDIA Dynamo v1.5.1, KV-Aware Routing](https://docs.dynamo.nvidia.com/dynamo/v1.5.1/knowledge-base/concepts/system-architecture/kv-aware-routing)
- [NVIDIA Dynamo v1.5.1, Request Rejection Architecture](https://docs.dynamo.nvidia.com/dynamo/v1.5.1/knowledge-base/concepts/fault-tolerance/request-rejection-architecture)
- [NVIDIA Dynamo v1.5.1, Planner Guide](https://docs.dynamo.nvidia.com/dynamo/v1.5.1/knowledge-base/modular-components/planner/planner-guide) — 위 세 문서의 라우팅, 부하 거절과 확장 역할만 2026-10-24 대조
- [Fiddler: CPU-GPU Orchestration for Fast Inference of Mixture-of-Experts Models — arXiv](https://arxiv.org/abs/2402.07033)
- [AIR-LLM: Broadcasting AI Weights over Radio for Memory-Free Edge LLM Inference via RF Computing — arXiv](https://arxiv.org/abs/2610.00465v1)
- [AirLLM — lyogavin](https://github.com/lyogavin/airllm)
- [llama-server — ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)
- [llama : add a GPU cache for MoE experts kept in host memory — ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp/pull/29887)
- [Qwen3.8-Flash-Next — Hugging Face, Qwen](https://huggingface.co/Qwen/Qwen3.8-Flash-Next)
- [Strata — Niko1221](https://github.com/Niko1221/Strata)
- [Running a 125-Billion-Parameter Model on a Normal PC — Niko1221/Strata](https://github.com/Niko1221/Strata/blob/main/docs/paper/Strata-Paper.pdf)
- [OpenVINO 2024, High-level Performance Hints](https://docs.openvino.ai/2024/openvino-workflow/running-inference/optimize-inference/high-level-performance-hints.html)
- [DistServe: Disaggregating Prefill and Decoding for Goodput-optimized Large Language Model Serving — USENIX OSDI 2024](https://www.usenix.org/system/files/osdi24-zhong-yinmin.pdf)
- [AWS and Cerebras Collaboration Aims to Set a New Standard for AI Inference Speed and Performance in the Cloud — AWS](https://press.aboutamazon.com/aws/2026/3/aws-and-cerebras-collaboration-aims-to-set-a-new-standard-for-ai-inference-speed-and-performance-in-the-cloud)
- [llama-bench — ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md)
- [Magnitude — magnitudedev](https://github.com/magnitudedev/magnitude)

MindWalk 사례는 AMD 공개 사례 PDF의 작업 구분과 수치 한계를 2026-10-06에 대조했다. 하드웨어 실측을 재현한 것은 아니다.

2026-10-06 검증 범위는 작은 배치의 행렬곱 근사, 가중치와 KV 캐시의 용량 구분, 양자화와 오프로딩의 제약, 세션 기반 서빙 벤치마크의 측정 조건이다. M1 역공학 수치와 교재 구성은 기존 출처의 한정된 기록으로 남기며 이번에 재검증하지 않았다.

- [MindWalk accelerates AI drug discovery with AMD — AMD](https://www.amd.com/content/dam/amd/en/documents/resources/case-studies/mindwalk-case-study.pdf)
- [AgentPerfBench: A Benchmarking and Evaluation Suite for Inference Performance of Agentic LLMs — arXiv](https://arxiv.org/html/2609.34683v1)
- [JAX Scaling Book, All About Transformer Inference](https://jax-ml.github.io/scaling-book/inference/)
- [Hugging Face Accelerate, Loading big models into memory](https://huggingface.co/docs/accelerate/main/concept_guides/big_model_inference)
- [Hugging Face Transformers, Cache strategies](https://huggingface.co/docs/transformers/main/en/kv_cache)
- [Hugging Face Transformers, Bitsandbytes](https://huggingface.co/docs/transformers/main/en/quantization/bitsandbytes)
- [Retrospectively Reverse-Engineering Apple's Neural Engine — Eileen Yoon](https://eiln.github.io/posts/ane.html)
- [Apple Neural Engine 역공학 하기: LLM의 병목은 연산보다 데이터 이동 — GeekNews](https://news.hada.io/topic?id=33583)
- [Foundation Model Engineering — Seongeun So](https://sungeuns.github.io/foundation-model-engineering/)

## 관련 문서

- [[GPU-Inference-Hardware#같은 칩도 제품 등급에 따라 텐서 연산 속도가 다르다|제품 등급과 텐서 연산 속도]] — 사양과 실제 하드웨어 처리량의 구분

- [[LLM-Generation-Mechanics-Decoding|LLM 동작 원리, 추론과 디코딩]] — 추론에서 다음 토큰을 만드는 과정
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]] — 프리필 재사용
- [[LLM-Model-Tiers|LLM 모델 티어 선택]] — 모델 크기와 서빙 비용
