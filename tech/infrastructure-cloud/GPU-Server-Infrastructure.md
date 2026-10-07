---
tags: [infrastructure, gpu, ai, memory, network, power, cooling]
status: done
verified_at: 2026-10-07
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["GPU Server Infrastructure", "GPU 서버 인프라"]
---

# GPU 서버 인프라

GPU 서버는 CPU에 가속기를 연결한 이기종 시스템이다. 연산 성능뿐 아니라 메모리, 통신, 전력과 냉각 조건이 처리 가능한 작업의 크기를 제한한다. 아래 제품 수치는 H100과 DGX H100의 예시이며 모든 GPU 서버의 공통 사양이 아니다.

## CPU와 GPU의 역할

CPU는 적은 수의 스레드에서 낮은 지연을, GPU는 많은 경량 스레드를 통한 높은 처리량을 목표로 설계된다. CPU도 병렬 실행을 하므로 빠른 CPU와 동시 실행 GPU라는 이분법으로 나누지 않는다.

CUDA에서는 CPU가 호스트 코드를 실행하고 GPU에 병렬 계산을 맡긴다. 호스트와 장치 사이의 데이터 전송도 비용이므로, 계산만 빨라져도 전체 작업은 느릴 수 있다. 연산 시간과 전송 시간을 따로 측정하고 중간 데이터를 GPU에 유지할 수 있는지 확인한다.

### 워프와 분기 발산

NVIDIA CUDA의 워프(warp)는 **32개 스레드**로 이루어진 실행 묶음이다. GPU 전체 코어나 물리 코어 32개를 뜻하지 않는다. GPU의 모든 스레드가 같은 명령을 동시에 실행해야 한다고 일반화하지 않는다.

같은 워프의 스레드가 서로 다른 분기 경로를 선택하면 경로들을 따로 실행해야 해서 유효 처리량이 낮아질 수 있다. 이것이 warp divergence다. `if`가 있다는 사실만으로 발산이 생기는 것은 아니다. 워프 안에서 모두 같은 경로를 고르면 발산하지 않으며, 짧은 분기는 컴파일러가 predication으로 처리할 수 있다.

Volta부터 도입된 Independent Thread Scheduling 때문에 워프 내부가 언제나 같은 지점에서 함께 진행한다고 가정해서도 안 된다. 워프 내 협력 코드에서는 필요한 동기화를 명시해야 한다.

GPU 적합성은 분기 수 하나로 판단하지 않는다. 충분한 병렬 작업량, 메모리 접근, 전송량을 함께 본다. 큰 행렬 연산은 병렬화 후보지만 작은 작업의 데이터 왕복은 이득을 없앨 수 있다. 백엔드 전체를 옮기기보다 측정된 연산 병목을 가속 후보로 고른다.

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

## GPU 사용률을 작업 성과와 연결한다

`nvidia-smi`의 GPU utilization은 표본 구간에 하나 이상의 커널이 실행된 시간의 비율이다. 연산 장치를 최대한 활용한 비율이나 업무 처리량을 뜻하지 않는다. Memory utilization도 장치 메모리를 읽거나 쓴 시간의 비율이며, 메모리 용량 점유율과 다르다. [NVIDIA 지표 정의](https://docs.nvidia.com/deploy/nvidia-smi/index.html)

따라서 다음 항목을 같은 시간축으로 비교한다. 이는 지표 정의에서 도출한 운영 점검안이다.

| 관측 범위 | 함께 볼 것 | 피할 해석 |
| --- | --- | --- |
| 장치 | GPU 활동률, 사용 메모리 용량, 온도, 전력과 오류 | 활동률이 높으면 유효 처리량도 높다는 판단 |
| 호스트와 통신 | CPU, 디스크 I/O, GPU 간 통신과 서버 네트워크 | GPU 활동률이 낮다는 이유만으로 장비를 줄이는 판단 |
| 작업 | 할당된 GPU, 대기 시간, 완료량, 지연과 실패 | 자원 할당을 실제 사용이나 성공으로 계산 |

유휴 자원을 회수하기 전에는 입력 데이터 대기, 통신 병목, 예약된 작업과 복구 여유를 확인한다. 순간값만 보지 않고 작업 주기를 포함한 이력을 비교하며, 자원을 줄인 뒤에는 완료량과 지연이 유지되는지 확인한다.

### Kubernetes와 GPU 공유의 관측 경계

DCGM Exporter는 GPU 지표를 Prometheus가 수집할 수 있도록 노출한다. Kubernetes에서는 `KubeletPodResources` API를 이용해 GPU와 Pod의 연결을 관측한다. GPU, 호스트와 Kubernetes 객체 지표를 함께 보되, 수집 설정과 실제 label에 작업 식별 정보가 있는지 확인한다. [GPU Telemetry 개요](https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/)

- **MIG**는 지원 GPU를 미리 정의된 인스턴스로 나누며 하드웨어 수준의 메모리와 장애 격리를 제공한다. DCGM Exporter의 MIG 모드에서는 GPU 인스턴스 단위로 관측한다. [Exporter 문서](https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/dcgm-exporter.html)
- **Time-slicing**은 같은 GPU를 공유하며 replica 사이의 메모리와 장애 격리를 제공하지 않는다. replica를 더 요청해도 비례하는 연산량을 보장받지 않는다. NVIDIA Kubernetes Device Plugin으로 time-slicing을 켠 경우 DCGM Exporter는 지표를 컨테이너에 연결하는 기능을 지원하지 않는다. [GPU 공유 문서](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html)
- `nvidia-smi`는 MIG가 활성화된 GPU의 GPU/Memory utilization 조회를 지원하지 않는다고 명시한다. 누락된 값을 0으로 처리하거나 물리 GPU의 관측 결과를 각 Pod의 사용량으로 복제하지 않는다. [NVIDIA 지표 정의](https://docs.nvidia.com/deploy/nvidia-smi/index.html)

2026-10-07 부분 대조: 사용률 정의, DCGM Exporter의 작업 연결과 GPU 공유 제약을 공식 문서로 확인했다. GPU 수명, 보편적인 장애율이나 비용 절감률은 이 지표만으로 추정하지 않는다.

## 확인 질문

- 작업이 연산, 메모리 용량, 메모리 대역폭, 서버 간 통신 중 어디에서 제한되는가?
- 분기가 같은 워프 안에서 갈라지는가, 워프마다 다른 경로를 선택할 뿐인가?
- GPU 수를 늘렸을 때 전체 처리량과 지연이 실제로 개선되는가?
- 랙의 공간뿐 아니라 전력, 냉각과 하중 조건을 충족하는가?

## 출처

- [NVIDIA CUDA, CUDA C++ Best Practices Guide](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html)
- [NVIDIA, H100 GPU Product Specifications](https://www.nvidia.com/en-us/data-center/h100/)
- [NVIDIA DGX H100/H200 User Guide, Introduction to NVIDIA DGX H100/H200 Systems](https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html)
- [NVIDIA, System Management Interface](https://docs.nvidia.com/deploy/nvidia-smi/index.html)
- [NVIDIA GPU Telemetry, About GPU Telemetry](https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/)
- [NVIDIA GPU Telemetry, DCGM Exporter](https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/dcgm-exporter.html)
- [NVIDIA GPU Operator, Time-Slicing GPUs in Kubernetes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html)

## 관련 문서

- [[LLM-Inference-Bottlenecks|LLM 추론 병목과 메모리 예산]]
- [[Storage-and-FileSystem-Performance|디스크 I/O와 RAID]]
