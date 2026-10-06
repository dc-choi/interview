---
tags: [ai, llm, inference, serving, performance, edge, hardware]
status: done
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

## 가속기 스펙 읽기

- TOPS 단독 수치는 LLM 성능 예측에 거의 쓸모가 없다. TOPS와 메모리 대역폭의 비, 즉 릿지 포인트를 본다.
- 스펙시트의 총 대역폭과 실제로 동시에 쓸 수 있는 대역폭은 다르다. 전송 경로가 직렬로 실행되면 경로를 늘려도 시간이 중첩되지 않고 더해진다. 대역폭 증설만큼 전송 동시성이 중요하다.
- CNN을 전제로 설계된 가속기는 작은 커널을 큰 피처맵 전체에 재사용하므로 온칩 SRAM에 가중치를 올려두고 데이터를 흘리면 재사용률이 높다. 작은 배치의 트랜스포머 디코드는 가중치 재사용이 적어, 수 MiB의 온칩 메모리만으로 수 GB의 가중치 전송을 없애기 어렵다.

## 사례 — Apple M1 Neural Engine 역공학

한 역공학 분석(2026년 8월, M1 ANE 기준)의 수치다.

- 하드웨어: 연산 코어 16개, 병렬 MAC 레인 2,048개, 코어당 커널 메모리 64 KiB(총 1 MiB), 공유 L2 SRAM 2 MiB.
- 릿지 포인트: 11 TOP/s를 68 GB/s로 나눈 162 OP/byte. 피크 연산을 유지하려면 DRAM 1바이트당 162 연산이 필요한데, 가중치를 DRAM에서 직접 스트리밍하면 22 TB/s가 필요해 가용 대역폭의 300배가 넘는다.
- 실측 DRAM 처리량: ANE KernelDMA 37.99 GB/s, ANE TileDMA 59.08 GB/s, GPU(Metal 셰이더) 77.70 GB/s. 커널 DMA와 타일 DMA 요청은 직렬로 실행돼 결합 시 시간이 더해진다.
- 결론: 트랜스포머 단일 토큰 디코드는 가중치 재사용과 메모리 대비 연산 비율에서 최악의 경우다. ANE는 가중치 재사용이 예측 가능한 CNN 워크로드를 전제로 설계됐다. 초당 10토큰에서 25토큰으로 가려면 약 2.5배의 메모리 스트리밍 대역폭이 필요하다는 것은 저자의 산술 추정이며 구현되거나 측정된 결과가 아니다.

한정: M1 실측이며 이후 세대에 그대로 적용할 근거는 없다. GPU 수치는 대역폭 측정 비교이지 종단 추론 성능 비교가 아니고, ANE의 존재 이유인 전력 효율은 분석 대상이 아니었다.

## 학습 자료 — 파운데이션 모델 엔지니어링 교재

웹에서 공개 열람할 수 있는 교재(영어, 한국어 번역 제공, 2026년 8월 기준 20장)가 사전학습과 학습 시스템, 스케일링, 사후학습과 정렬, 멀티모달, 추론 최적화, 압축, RAG, 추론 시점 스케일링, 에이전트, 평가, 안전, 해석가능성, 차세대 아키텍처를 한 축으로 묶는다. 역할별 진입점을 잡는 편이 순차 독파보다 낫다. 서빙 엔지니어는 추론 최적화(KV 캐시 관리, PagedAttention, continuous batching, speculative decoding, 긴 컨텍스트 서빙, 서빙 정책과 SLO)와 압축(양자화, 희소화, 증류) 장에서 시작한다. RAG 구축은 RAG 장, 평가 체계는 평가 장, 에이전트 신뢰성은 에이전트 장, 모델 선택과 학습 예산은 스케일링 법칙 장이 진입점이다. 각 장 마지막에 운영 절(서빙 SLO와 폴백, RAG 실패 모드, 에이전트 복구와 가드레일, 프로덕션 평가와 릴리스 게이트)이 있는 점이 특징이다. 라이선스가 명시되지 않았으므로 공개 열람이 가능하다는 사실과 재배포나 인용 허용 범위는 별개다.

## 면접 체크포인트

- 프리필과 디코드의 병목이 왜 다른지 arithmetic intensity로 설명할 수 있는가.
- 배칭, KV 캐시, speculative decoding, 양자화가 각각 어떤 비용을 줄이고 어떤 메모리를 추가로 요구하는지 설명할 수 있는가.
- 가속기 스펙에서 TOPS 대신 무엇을 봐야 하는지, 스펙 대역폭과 실효 대역폭이 왜 다른지 말할 수 있는가.

## 출처

2026-10-06 검증 범위는 작은 배치의 행렬곱 근사, 가중치와 KV 캐시의 용량 구분, 양자화와 오프로딩의 제약이다. M1 역공학 수치와 교재 구성은 기존 출처의 한정된 기록으로 남기며 이번에 재검증하지 않았다.

- [JAX Scaling Book, All About Transformer Inference](https://jax-ml.github.io/scaling-book/inference/)
- [Hugging Face Accelerate, Loading big models into memory](https://huggingface.co/docs/accelerate/main/concept_guides/big_model_inference)
- [Hugging Face Transformers, Cache strategies](https://huggingface.co/docs/transformers/main/en/kv_cache)
- [Hugging Face Transformers, Bitsandbytes](https://huggingface.co/docs/transformers/main/en/quantization/bitsandbytes)
- [Retrospectively Reverse-Engineering Apple's Neural Engine — Eileen Yoon](https://eiln.github.io/posts/ane.html)
- [Apple Neural Engine 역공학 하기: LLM의 병목은 연산보다 데이터 이동 — GeekNews](https://news.hada.io/topic?id=33583)
- [Foundation Model Engineering — Seongeun So](https://sungeuns.github.io/foundation-model-engineering/)

## 관련 문서

- [[LLM-Generation-Mechanics-Decoding|LLM 동작 원리, 추론과 디코딩]] — 추론에서 다음 토큰을 만드는 과정
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]] — 프리필 재사용
- [[LLM-Model-Tiers|LLM 모델 티어 선택]] — 모델 크기와 서빙 비용
