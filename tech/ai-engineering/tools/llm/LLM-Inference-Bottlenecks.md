---
tags: [ai, llm, inference, serving, performance, edge, hardware]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Inference Bottlenecks", "LLM 추론 병목", "Memory-bound Decode", "루프라인과 LLM 서빙"]
---

# LLM 추론 병목 — 디코드는 연산이 아니라 데이터 이동에 묶인다

LLM 추론 속도를 가속기의 연산 성능(TOPS, FLOPS)으로 예측하면 틀린다. 자기회귀 디코드는 토큰 하나를 만들 때마다 모델 가중치 전체를 메모리에서 읽어 와야 하고, 읽은 바이트당 수행하는 연산은 아주 작다. 그래서 병목은 곱셈기가 아니라 가중치를 실어 나르는 대역폭이다. KV 캐시, 배칭, 양자화, speculative decoding 같은 서빙 기법은 전부 이 제약 위에서 나왔다. 모델의 학습과 생성 원리는 [[LLM-Generation-Mechanics|LLM 동작 원리]]가 다루고, 이 문서는 그 생성이 하드웨어에서 왜 느려지는지를 다룬다.

## 멘탈 모델 — 루프라인과 arithmetic intensity

- arithmetic intensity는 연산량을 메모리 트래픽으로 나눈 값(OP/byte)이다.
- 하드웨어의 피크 연산을 피크 대역폭으로 나눈 값이 루프라인의 릿지 포인트다. 워크로드의 intensity가 이 값보다 낮으면 memory-bound, 높으면 compute-bound다.
- memory-bound 구간에서는 TOPS를 올려도 성능이 오르지 않는다. 최적화 대상은 이 판정에 따라 완전히 갈린다.

## 프리필과 디코드는 병목이 다르다

| 단계 | 하는 일 | 가중치 재사용 | 병목 |
|---|---|---|---|
| 프리필 | 프롬프트 토큰 전체를 한 번에 처리 | 여러 토큰이 같은 가중치를 공유 | compute-bound에 가까움 |
| 디코드 | 토큰을 하나씩 생성 | 배치 1이면 토큰마다 가중치 전체를 1회 읽음 | memory-bound |

배치 크기 1의 디코드에서 FP16 가중치 하나(2바이트)는 MAC 1회(연산 2회)에 쓰이고 버려진다. 4바이트당 2연산 수준이라 intensity가 릿지 포인트보다 훨씬 낮고, 성능은 가중치를 얼마나 빨리 읽어오는지로 결정된다. 같은 모델이라도 두 단계의 병목이 다르므로 최적화와 용량 산정을 분리한다. 프롬프트 접두어의 프리필을 재사용하는 [[LLM-Prompt-Caching|프롬프트 캐싱]]은 프리필 쪽 비용을 줄이는 기법이다.

## 서빙 기법은 전부 이 제약 위에 있다

- 배칭과 continuous batching: 한 번 읽은 가중치로 여러 요청의 토큰을 처리해 intensity를 올린다. 요청이 끝나는 대로 새 요청을 배치에 끼워 넣어 GPU가 비는 시간을 줄인다.
- KV 캐시: 이전 토큰의 key와 value를 저장해 재계산을 피한다. 대신 그 자체가 메모리를 차지해 배치 크기와 컨텍스트 길이를 제한하므로, 캐시 메모리를 페이지 단위로 관리해 단편화를 줄이는 기법(PagedAttention)이 나왔다.
- speculative decoding: 작은 모델이 여러 토큰을 제안하고 큰 모델이 한 번의 forward로 검증한다. 가중치 1회 읽기당 확정되는 토큰 수를 늘린다.
- 양자화: 엣지 LLM에서 효과적인 이유는 연산을 줄여서가 아니라 읽어야 할 바이트 수를 줄이기 때문이다. INT8이나 4비트 양자화는 memory-bound 구간에서 거의 선형에 가까운 이득을 준다.

## 가속기 스펙 읽기

- TOPS 단독 수치는 LLM 성능 예측에 거의 쓸모가 없다. TOPS와 메모리 대역폭의 비, 즉 릿지 포인트를 본다.
- 스펙시트의 총 대역폭과 실제로 동시에 쓸 수 있는 대역폭은 다르다. 전송 경로가 직렬로 실행되면 경로를 늘려도 시간이 중첩되지 않고 더해진다. 대역폭 증설만큼 전송 동시성이 중요하다.
- CNN을 전제로 설계된 가속기는 작은 커널을 큰 피처맵 전체에 재사용하므로 온칩 SRAM에 가중치를 올려두고 데이터를 흘리면 재사용률이 높다. 트랜스포머 디코드는 재사용할 것이 없어서 수 MiB의 온칩 메모리가 수 GB의 가중치 앞에서 의미를 잃는다.

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
- 배칭, KV 캐시, speculative decoding, 양자화가 모두 같은 제약(가중치 읽기 대역폭)에 대한 대응임을 말할 수 있는가.
- 가속기 스펙에서 TOPS 대신 무엇을 봐야 하는지, 스펙 대역폭과 실효 대역폭이 왜 다른지 말할 수 있는가.

## 출처

- [Retrospectively Reverse-Engineering Apple's Neural Engine — Eileen Yoon](https://eiln.github.io/posts/ane.html)
- [Apple Neural Engine 역공학 하기: LLM의 병목은 연산보다 데이터 이동 — GeekNews](https://news.hada.io/topic?id=33583)
- [Foundation Model Engineering — Seongeun So](https://sungeuns.github.io/foundation-model-engineering/)

## 관련 문서

- [[LLM-Generation-Mechanics-Decoding|LLM 동작 원리, 추론과 디코딩]] — 추론에서 다음 토큰을 만드는 과정
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]] — 프리필 재사용
- [[LLM-Model-Tiers|LLM 모델 티어 선택]] — 모델 크기와 서빙 비용
