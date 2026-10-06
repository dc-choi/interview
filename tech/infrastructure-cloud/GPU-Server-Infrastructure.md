---
tags: [infrastructure, gpu, ai, memory, network, power, cooling]
status: done
verified_at: 2026-10-06
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["GPU Server Infrastructure", "GPU 서버 인프라"]
---

# GPU 서버 인프라

GPU 서버는 CPU에 가속기를 연결한 이기종 시스템이다. 연산 성능뿐 아니라 메모리, 통신, 전력과 냉각 조건이 처리 가능한 작업의 크기를 제한한다. 아래 제품 수치는 H100과 DGX H100의 예시이며 모든 GPU 서버의 공통 사양이 아니다.

## CPU와 GPU의 역할

CPU는 적은 수의 스레드에서 낮은 지연을, GPU는 많은 경량 스레드를 통한 높은 처리량을 목표로 설계된다. CPU도 병렬 실행을 하므로 빠른 CPU와 동시 실행 GPU라는 이분법으로 나누지 않는다.

CUDA에서는 CPU가 호스트 코드를 실행하고 GPU에 병렬 계산을 맡긴다. 호스트와 장치 사이의 데이터 전송도 비용이므로, 계산만 빨라져도 전체 작업은 느릴 수 있다. 연산 시간과 전송 시간을 따로 측정하고 중간 데이터를 GPU에 유지할 수 있는지 확인한다.

## 메모리와 통신 경로를 구분한다

| 경로 | 확인할 것 | H100 계열의 예시 |
| --- | --- | --- |
| GPU와 로컬 메모리 | 용량과 메모리 대역폭 | H100 SXM: 80 GB, 3.35 TB/s |
| GPU 사이 | 상호 연결과 토폴로지 | H100 SXM NVLink: 900 GB/s |
| 호스트와 장치 | 전송량과 PCIe 경로 | CPU RAM과 GPU 메모리 사이의 복사 비용 |
| 서버 사이 | 네트워크 카드, 스위치와 링크 | DGX H100: ConnectX-7 카드 8개, 각각 최대 400 Gb/s InfiniBand |

GB/s와 Gb/s를 섞지 않는다. 400 Gb/s는 단위 환산으로 50 GB/s이며 프로토콜 오버헤드를 뺀 실효 처리량은 별도로 측정한다. 서로 다른 경로의 대역폭을 합쳐 한 GPU의 메모리 속도로 읽지 않는다.

여러 GPU의 메모리 총합은 한 GPU가 로컬 속도로 접근하는 단일 메모리 용량을 뜻하지 않는다. 작업 분할과 통신 비용을 함께 본다. 모델 적재 용량, KV 캐시와 오프로딩의 제약은 [[LLM-Inference-Bottlenecks|LLM 추론 병목]]에서 다룬다.

## 서버에서 랙으로 검토 범위를 넓힌다

DGX H100/H200 공식 사용자 가이드의 예시는 GPU 8개, 최대 시스템 전력 10.2 kW, 8U, 최대 무게 130.45 kg이다. 전원 공급 장치는 3.3 kW 6개이며 4+2 이중화 구성이므로 정격 합계를 시스템 소비 전력으로 쓰지 않는다.

공식 환경 조건에는 전면에서 후면으로 흐르는 냉각 공기와 작동 온도 범위가 있다. 랙 공간이 남는다는 사실만으로 추가 설치가 가능하다고 판단하지 않는다. 도입 검토에서는 해당 모델의 전원 입력, 랙 하중, 풍량과 열 배출 요구를 설치 환경과 대조한다. 최대 전력 사양과 실제 부하의 소비 전력도 구분한다.

## 확인 질문

- 작업이 연산, 메모리 용량, 메모리 대역폭, 서버 간 통신 중 어디에서 제한되는가?
- GPU 수를 늘렸을 때 전체 처리량과 지연이 실제로 개선되는가?
- 랙의 공간뿐 아니라 전력, 냉각과 하중 조건을 충족하는가?

## 출처

- [NVIDIA CUDA, CUDA C++ Best Practices Guide](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html)
- [NVIDIA, H100 GPU Product Specifications](https://www.nvidia.com/en-us/data-center/h100/)
- [NVIDIA DGX H100/H200 User Guide, Introduction to NVIDIA DGX H100/H200 Systems](https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html)

## 관련 문서

- [[LLM-Inference-Bottlenecks|LLM 추론 병목과 메모리 예산]]
- [[Storage-and-FileSystem-Performance|디스크 I/O와 RAID]]
