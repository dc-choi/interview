---
tags: [gpu, inference, memory, kv-cache, intel]
status: done
verified_at: 2026-10-16
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["GPU Inference Hardware", "추론용 GPU 선택", "Intel D270"]
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

## 구매 및 배포 전 확인

같은 모델, 정밀도와 동시성으로 첫 토큰 지연, 토큰 간 지연, 총처리량과 전력 사용량을 측정한다. 드라이버, framework 버전과 실제 사용 가능한 커널도 고정한다. 최대 메모리 사양을 실제 서비스 용량으로 그대로 계산하지 않는다.

제품 사양만 대조했으며 장비 접근과 실측은 하지 않았다.

## 출처

- [JAX Scaling Book, All About Transformer Inference](https://jax-ml.github.io/scaling-book/inference/) — 2026-10-22, KV 캐시 식과 head 구성 대조
- [vLLM, Parallelism and Scaling](https://docs.vllm.ai/en/stable/serving/parallelism_scaling/) — 2026-10-22, 캐시 용량 로그와 병렬화 안내 대조. Intel 제품 사양은 이번에 재검증하지 않아 frontmatter 날짜를 유지한다.
- [Intel, GPU D270 Inference-Optimized Data Center GPU](https://www.intel.com/content/www/us/en/products/details/discrete-gpus/data-center-gpu/d-series.html)

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목과 메모리 예산]]
