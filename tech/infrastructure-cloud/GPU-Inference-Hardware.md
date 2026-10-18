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

- [Intel, GPU D270 Inference-Optimized Data Center GPU](https://www.intel.com/content/www/us/en/products/details/discrete-gpus/data-center-gpu/d-series.html)

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목과 메모리 예산]]
