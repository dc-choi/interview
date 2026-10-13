---
tags: [infrastructure, gpu, ai, memory, network, power, cooling, distributed-training]
status: done
verified_at: 2026-10-11
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

## 패키지 기판과 서버 냉각은 다른 계층이다

유리 코어 기판은 여러 칩을 연결하는 패키징 기반의 선택지다. 실리콘 연산 칩을 유리로 바꾸거나 서버 메인보드 전체를 교체한다는 뜻이 아니다. 유기 기판보다 높은 치수 안정성과 평탄도를 활용해 큰 칩렛 패키지와 조밀한 배선을 구현하려는 접근이다. 이는 위 H100 사양에 유리 기판이 적용됐다는 설명이 아니다.

**TGV(Through-Glass Via)**는 유리 기판을 관통해 양쪽 배선층을 연결하는 경로다. LPKF의 LIDE(Laser Induced Deep Etching)는 다음 두 단계로 구멍을 만든다.

1. 초고속 레이저로 선택한 영역의 유리 구조를 바꾼다. 이 단계에서 재료를 직접 제거하지 않는다.
2. 습식 식각으로 변형된 영역을 선택적으로 제거한다. 이후 전기적 연결에는 비아의 금속화가 필요하다.

2026-10-09 부분 대조: Intel의 유리 기판 발표와 LPKF의 공정 설명을 확인했다. 유리의 열적, 기계적 안정성은 검토할 재료 특성이며 모든 패키지의 휨이나 파손이 사라진다는 보장이 아니다. 제조 공정 소개만으로 특정 GPU의 채택, 양산 수율이나 서버 냉각 비용 절감을 확정하지 않는다. 도입 판단에서는 실제 제품 사양과 패키지 신뢰성 결과를 별도로 확인한다.

## 서버에서 랙으로 검토 범위를 넓힌다

DGX H100/H200 공식 사용자 가이드의 예시는 GPU 8개, 최대 시스템 전력 10.2 kW, 8U, 최대 무게 130.45 kg이다. 전원 공급 장치는 3.3 kW 6개이며 4+2 이중화 구성이므로 정격 합계를 시스템 소비 전력으로 쓰지 않는다.

공식 환경 조건에는 전면에서 후면으로 흐르는 냉각 공기와 작동 온도 범위가 있다. 랙 공간이 남는다는 사실만으로 추가 설치가 가능하다고 판단하지 않는다. 도입 검토에서는 해당 모델의 전원 입력, 랙 하중, 풍량과 열 배출 요구를 설치 환경과 대조한다. 최대 전력 사양과 실제 부하의 소비 전력도 구분한다.

### 정전 대응은 UPS와 발전기의 연결까지 확인한다

UPS는 정전 시 배터리로 보호 대상에 전원을 공급하지만 무기한 전원 공급 장치가 아니다. 발전기를 함께 쓰는 구성에서는 발전기 전원이 UPS의 허용 전압과 주파수 범위에 들어와야 한다. 발전기가 켜져 있어도 입력이 허용 범위를 벗어나면 UPS가 배터리를 계속 소모해 부하가 꺼질 수 있다.

UPS가 버티는 시간을 모든 시설에서 몇 분이라고 고정하지 않는다. Eaton 제품 자료도 부하와 배터리 노후도 등에 따라 runtime이 달라진다고 명시한다. GPU 증설 검토에서는 예상 부하에서의 배터리 지속 시간, 발전기 전환, 냉각과 통신을 포함한 보호 범위, 연료 확보와 정기 시험을 함께 점검한다(운영 제안). 서버 전원만 유지된다는 사실로 시설 전체의 지속 운영을 판단하지 않는다.

2026-10-13 부분 대조: Eaton의 UPS와 발전기 호환성 설명, runtime 조건과 AWS 데이터센터의 백업 전력 설명을 확인했다. 특정 시설의 지속 시간이나 실제 전환 시험 결과를 확인한 것은 아니다. 전력 보호와 앞뒤 절의 작업 체크포인트, 재시작 준비는 서로 보완한다.

### 전원 이중화와 정상 성능은 구분한다

2026-10-13 NVIDIA DGX H100/H200 사용자 가이드 부분 대조 기준, PSU 6개 중 3개의 전원이 데이터센터나 PDU 문제로 끊기면 시스템은 성능이 낮아진 상태로 계속 동작할 수 있다. PSU 4+2 이중화를 모든 전원 장애에서 정상 성능을 보장한다는 뜻으로 읽지 않는다.

운영 점검에서는 전원 경로와 부하 조건별로 서버 생존 여부, 실제 처리량과 지연, 복구 후 성능 회복을 나누어 확인한다(운영 제안). 이 제품의 동작을 다른 서버나 방문한 시설의 검증 결과로 일반화하지 않는다.

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

## 추론 Pod 확장과 GPU 노드 준비를 분리한다

부분 검증(2026-10-09): KEDA 2.18과 Karpenter 공식 문서 기준이다. KEDA는 이벤트 지표로 워크로드의 0과 1 사이 활성화를 담당하고, 활성화 이후 1개 이상 구간의 replica 수 조정은 HPA가 맡는다. Karpenter는 Pod의 자원 요구와 스케줄링 제약에 맞는 노드를 구성하는 계층이다. Pod 수를 늘리는 결정과 GPU를 갖춘 노드의 준비는 별도로 확인한다.

GPU 워크로드에는 GPU 자원 요구를 명시하고 해당 장치 플러그인을 배치해야 한다. Karpenter 문서는 장치 플러그인이 없으면 GPU 노드의 초기화가 완료된 것으로 보지 않는다고 설명한다. Pod의 제약이 NodePool의 허용 범위를 벗어나도 배치할 수 없다.

다음은 GPU 추론을 0개까지 축소할 때의 운영 점검 제안이다.

- replica가 0이어도 관측할 수 있는 외부 요청량이나 큐 지표를 활성화 신호로 검토한다. 종료된 추론 Pod 자체의 지표에만 의존하지 않는다.
- 모델별 부하 시험으로 처리량이 더 늘지 않고 지연이 증가하는 구간을 찾는다. CPU 사용률 하나를 모든 모델의 확장 기준으로 삼지 않는다.
- 이벤트 감지, Pod 생성, 노드 확보, 이미지 준비, 가중치 적재와 첫 정상 추론까지의 시간을 구분해 측정한다. 노드가 생겼다는 사실을 모델 준비 완료로 보지 않는다.
- 허용 가능한 첫 응답 지연을 만족하지 못하면 최소 replica 유지나 사전 용량 확보를 비교한다. Pod를 0개로 만든 것만으로 노드까지 제거되거나 비용이 0이 된다고 계산하지 않는다.

노드 축소와 재배치의 중단 제약은 [[K8s-Resource-Right-Sizing-Component-Rollout|Pod 적정화와 노드 통합]]에서 이어진다. 이 절은 설정과 검증 기준이며 특정 클러스터에서의 용량 확보나 지연 보장 결과가 아니다.

### EC2 할당량과 실제 GPU 용량은 별도로 확인한다

2026-10-14 EC2 인스턴스 시작 문제 해결 문서 부분 대조 기준이다. GPU 인스턴스를 늘릴 때 계정의 리전별 할당량과 AWS의 가용 On-Demand 용량은 다른 조건이다. `InsufficientInstanceCapacity`는 요청을 충족할 가용 용량이 부족하다는 뜻이며, 할당량 증설만으로 해소된다고 가정하지 않는다.

공식 대응 후보는 잠시 뒤 재시도, 요청 인스턴스 수 축소, 시작 시 가용 영역 선택 완화와 다른 인스턴스 타입 사용이다. 대안을 선택할 때 GPU 메모리, 드라이버와 통신 요구가 유지되는지도 확인한다(운영 제안). 대규모 증설 사례의 소요 시간을 다른 리전이나 시점의 보장으로 사용하지 않는다.

이 절은 EC2 용량 부족의 구분만 추가 대조했다. 실제 GPU 확보나 분산 작업의 성능 시험은 수행하지 않았으며 기존 절 전체의 검증일은 유지한다.

## GPU 체크포인트와 초기화 비용

2026-10-07 NVIDIA `cuda-checkpoint` 문서 기준이다. 이 도구는 Linux 프로세스의 CUDA 상태를 중지하고 복원한다. GPU 상태를 바꾸는 API를 잠그고 이미 제출한 작업의 완료를 기다린 뒤 장치 메모리를 호스트로 복사하고 GPU 자원을 해제한다. 복원할 때는 메모리와 CUDA 객체를 되살린다.

CUDA 상태의 중지만으로 CPU 스레드까지 멈추지는 않는다. 전체 프로세스를 저장하려면 CRIU 같은 CPU 측 체크포인트 도구와 결합해야 한다. 모델 가중치 파일을 저장하는 것과 실행 중인 프로세스를 복원하는 것은 다른 작업이다.

- 기능은 드라이버 버전에 의존한다. 현재 문서는 UVM 메모리와 `cuMemExportToShareableHandle()`로 만든 IPC 메모리를 지원하지 않는다고 명시한다. 모든 IPC가 같은 제약을 갖는다고 일반화하지 않는다.
- 체크포인트나 복원 중 오류가 나면 프로세스의 정상 상태 유지를 보장하지 않는다. 실패 후 재시작 경로를 별도로 준비한다.
- 콜드 스타트 단축은 검증할 가설이다. 초기화 생략 이득과 상태 저장, 읽기, 호스트와 GPU 간 복사 비용을 함께 측정한다(운영 제안).

성능 비교는 프로세스 복원 완료 대신 실제 추론 준비와 첫 정상 응답까지 측정한다. 같은 모델, 드라이버와 장비에서 일반 시작과 복원 시작을 비교하고 결과의 정확성도 확인한다(검증 제안).

## 장기 분산 학습의 노드 장애와 작업 재개

동기식 분산 학습에서는 노드 하나의 장애가 작업 전체의 재시작으로 이어질 수 있다. PyTorch 2.14 `torchrun` 문서 기준, worker 일부가 실패하면 살아 있는 worker까지 모두 멈추고 `max_restarts` 한도 안에서 전체를 다시 시작한다. 같은 문서는 진행 상황을 체크포인트로 남기고 학습 시작 시 읽는 구조를 권장한다. 이 체크포인트는 학습 코드가 저장하는 학습 상태이며 위 절의 CUDA 프로세스 복원과 다르다.

장애 대응은 세 단계로 나눠 확인한다. 아래 표는 이 절의 공식 문서에서 도출한 점검 틀이다.

| 단계 | 할 일 | 확인할 것 |
| --- | --- | --- |
| 감지 | 장치 오류, 장치 수 불일치, 통신 성능 저하와 작업 멈춤을 찾는다 | 상시 백그라운드 점검(passive)과 부하를 거는 능동 점검(active)의 범위, 점검 시간 |
| 격리와 교체 | 장애 노드에 새 작업을 배치하지 않고 재부팅하거나 교체한다 | 대체 용량과 여분 노드, 교체 노드의 점검 시간 |
| 재개 | 작업을 다시 시작해 마지막 체크포인트부터 이어 간다 | 저장과 로드 코드, 저장 주기, 교체 노드에서도 읽을 수 있는 저장 위치 |

### 관리형 사례: SageMaker HyperPod

2026-10-11 SageMaker HyperPod 공식 문서 기준이다. 오케스트레이터는 Slurm과 Amazon EKS 중에서 고른다. EKS 방식은 VPC 안에서 EKS 클러스터(제어 평면)와 HyperPod 클러스터(워커 노드)를 1:1로 연결한다.

- **감지**: 노드의 Health Monitoring Agent(HMA)가 상시 백그라운드 점검(passive)을 한다. NVIDIA GPU에서는 DCGM 정책 위반 알림, `nvidia-smi` 오류, EC2 플랫폼 로그의 오류와 GPU 수를 확인한다. Slurm 방식의 HMA는 2025-09-11부터 지원되며, 쓰려면 클러스터 소프트웨어를 최신 AMI로 갱신해야 한다. 켜고 끌 수 있는 심층 점검(deep health checks)은 클러스터 생성과 업데이트 때 GPU와 NVLink 수, DCGM 진단 level 4, EFA 지연과 대역폭, 여러 GPU 사이의 NCCL 통신 성능을 시험한다. `StartClusterHealthCheck` API로 필요할 때 요청할 수도 있다.
- **격리와 교체**: EKS 방식은 장애를 감지한 노드에 상태 label과 `sagemaker.amazonaws.com/node-health-status=Unschedulable:NoSchedule` taint를 붙인다. 노드 복구 옵션은 `Automatic`(권장, 기본값)과 `None`이다. `Automatic`은 장애 노드를 재부팅하거나 교체하고, `None`은 장애 노드에 label을 붙이지만 재부팅이나 교체는 시작하지 않는다. Slurm 방식은 HMA가 하드웨어 장애를 찾으면 노드를 drain으로 표시하고, 자동 복구가 켜져 있으면 그 노드의 작업이 모두 끝난 뒤 교체한다.
- **재개**: EKS의 Kubeflow `PyTorchJob`은 auto-resume annotation 두 개와 `restartPolicy: OnFailure`로 켠다(Kubeflow Training Operator 1.7.0, 1.8.0, 1.8.1 필요). HyperPod training operator의 `HyperPodPyTorchJob`은 학습 로그 패턴 규칙으로 시작 지연, 멈춤과 처리량 저하를 감지해 재시작하도록 설정할 수 있고(규칙은 HyperPod elastic agent가 `sys.stdout`으로 내보낸 학습 로그를 읽어 평가한다), 프로세스 수준 재시작 횟수와 작업 전체 재시작으로 넘어갈 기준도 정한다. Slurm은 `srun --auto-resume=1`을 붙인 job step에만 적용된다.
- **할당과 관측**: EKS 방식의 task governance는 팀별 compute 할당, 작업 우선순위, 유휴 compute의 대여와 차용, 팀 내 선점 여부를 정한다. observability add-on은 DCGM, node exporter, EFA, 파일 시스템, Kubernetes API, Kueue와 HyperPod task operator의 지표를 Amazon Managed Service for Prometheus로 보내고 Amazon Managed Grafana 대시보드로 볼 수 있게 한다.

다음은 위 동작과 AWS 권장 구성을 운영 관점으로 정리한 것이다. 추론한 제안에는 운영 제안이라고 표시한다.

- 재시작은 학습 프로그램을 다시 실행하는 일이다. 시작할 때 최신 체크포인트를 읽지 않으면 진행분을 잃는다. 저장 주기는 잃어도 되는 학습 시간과 저장 비용을 비교해 정한다(운영 제안). EKS의 PyTorch 학습에는 체크포인트를 CPU 메모리에 자주 저장해 인접 노드에 복제하고 S3 같은 영구 저장소에 주기적으로 보존하는 managed tiered checkpointing이 있다. 클러스터를 만들거나 업데이트할 때 `TieredStorageConfig`로 켜는 opt-in 기능이며, 학습 스크립트에서 `amzn-sagemaker-checkpointing` 라이브러리를 PyTorch DCP와 함께 호출해야 한다.
- EKS 문서 기준, 심층 점검을 켜 두면 생성 때뿐 아니라 자동 교체로 추가된 인스턴스도 약 2시간의 인스턴스 수준 점검을 거친다. AWS는 여분 노드가 없고 빨리 재개해야 하면 생성 때만 심층 점검을 켜는 조합을 제안하고, 즉시 재개하려면 클러스터에 여분 노드를 두라고 권고한다. `HyperPodPyTorchJob`은 Kueue와 함께 작업용 여분 노드를 미리 예약할 수 있다.
- Slurm에서 auto-resume을 쓰면 하드웨어 장애 노드는 재부팅 없이 교체되고, auto-resume이 없는 작업은 종료되어 다시 제출해야 한다. 재개 뒤에는 `$SLURM_JOB_NODELIST`가 오래된 값일 수 있으므로 진입 스크립트에서 노드 목록을 다시 구하고, 교체 노드에도 같은 환경을 만들도록 설정을 단일 `srun` 진입점에 둔다. GRES가 붙은 노드의 작업은 따로 막지 않으면 job step 재개 대신 큐에 다시 들어가 처음부터 실행된다.
- 감지, 노드 교체, 작업 재시작과 첫 정상 학습 단계까지의 시간을 나눠 측정한다. 노드 교체 완료를 학습 재개 완료로 보지 않는다(운영 제안).

### HyperPod 초기화 실패는 인스턴스별로 확인한다

2026-10-13 HyperPod API와 Slurm 클러스터 관리 문서 부분 대조 기준. `ClusterLifeCycleConfig.SourceS3Uri`는 lifecycle script의 S3 위치이고, `OnCreate`는 그 위치 아래에서 클러스터 생성 중 실행할 진입 스크립트 파일명이다. `OnInitComplete`는 AMI 기반 초기화가 끝난 뒤 노드에서 실행할 진입 스크립트 파일명이다. HyperPod 인스턴스 역할에 붙는 관리형 정책 `AmazonSageMakerClusterInstanceRolePolicy`가 `sagemaker-` 접두사 버킷 접근을 허용하므로, API 문서는 S3 경로를 `s3://sagemaker-`로 시작하게 하라고 안내한다. 스크립트 업로드와 각 노드의 초기화 성공을 별도로 확인한다(운영 제안).

Slurm 관리 문서 기준, `/var/log/provision/provisioning.log`에 기록한 로그는 CloudWatch 로그 그룹 `/aws/sagemaker/Clusters/[ClusterName]/[ClusterID]`의 `LifecycleConfig/[instance-group-name]/[instance-id]` 스트림으로 올라간다. 사용자 정의 스크립트도 이 경로에 로그를 기록해야 해당 수집 경로로 볼 수 있다. 로그에는 S3 위치와 진입 스크립트, 다운로드 시작과 완료, 스크립트 성공 또는 실패 표시가 남는다. 여러 인스턴스에서 실패해도 오류 메시지는 한 인스턴스만 표시하므로, 로그 그룹의 인스턴스별 스트림을 확인하고 표시된 노드만으로 장애 범위를 확정하지 않는다.

2026-10-13 Slurm continuous provisioning 문서 기준, 이 방식(`NodeProvisioningMode`가 `Continuous`)에서는 컨트롤러 노드 1개(로그인 인스턴스 그룹을 지정했다면 로그인 노드 1개 포함)가 준비되면 클러스터가 `InService`가 되고, 용량 부족 등으로 바로 확보하지 못한 워커 노드는 비동기로 재시도된다. 클러스터 생성 중 컨트롤러의 lifecycle script 실패는 재시도하지 않는 오류로 분류되어 클러스터가 `Failed`가 된다. 과금은 인스턴스 단위로 lifecycle script 실행이 시작될 때부터이며, 같은 문서는 스크립트가 실패하면 인스턴스 프로비저닝을 재시도하고 그 실행 시간만큼 과금한다고 적는다. 이 문서는 이 방식을 새 클러스터의 기본값이라고 하면서 선택 구성이라고도 적고, CreateCluster API 레퍼런스는 이 모드를 EKS 오케스트레이션 클러스터에서만 지원한다고 적으므로 실제 클러스터의 모드를 먼저 확인한다. 클러스터 상태만으로 모든 워커의 초기화 완료를 판단하지 않고 반복 실패하는 스크립트의 비용도 함께 본다(운영 제안).

운영 점검에서는 스크립트 다운로드, 실행 결과와 학습 작업의 첫 정상 단계를 나누어 확인한다. 초기화 성공을 데이터 접근이나 학습 재개 성공으로 취급하지 않는다(운영 제안). 이 절의 초기화 계약, 로그와 continuous provisioning의 상태 전환과 과금만 추가 대조했으며 문서 전체의 검증일은 유지한다.

## 확인 질문

- 작업이 연산, 메모리 용량, 메모리 대역폭, 서버 간 통신 중 어디에서 제한되는가?
- 분기가 같은 워프 안에서 갈라지는가, 워프마다 다른 경로를 선택할 뿐인가?
- GPU 수를 늘렸을 때 전체 처리량과 지연이 실제로 개선되는가?
- 랙의 공간뿐 아니라 전력, 냉각과 하중 조건을 충족하는가?
- 노드 장애 뒤 학습이 마지막 체크포인트에서 이어지는가, 처음부터 다시 시작하는가?

## 출처

- [Amazon EC2, Troubleshoot Amazon EC2 instance launch issues](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/troubleshooting-launch.html)
- [Amazon SageMaker API Reference, ClusterLifeCycleConfig](https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ClusterLifeCycleConfig.html)
- [Amazon SageMaker AI, SageMaker HyperPod cluster management](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-cluster-management-slurm.html) — Slurm lifecycle script의 인스턴스별 로그와 오류 표시 범위
- [Amazon SageMaker AI, Continuous provisioning for enhanced cluster operations with Slurm](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-scaling-slurm.html) — 우선 노드 기준 InService 전환, 워커 비동기 재시도와 lifecycle script 과금
- [Amazon SageMaker API Reference, CreateCluster](https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateCluster.html) — `NodeProvisioningMode`의 EKS 전용 표기
- [파운데이션 모델의 파인 튜닝 및 대규모 모델 훈련 클러스터인 Amazon SageMaker HyperPod 배워보기 — Amazon Web Services Korea](https://www.youtube.com/watch?v=HaL3-NF4lqY)
- [UPS for generators: Six considerations to achieving generator-UPS harmony — Eaton](https://www.eaton.com/us/en-us/products/backup-power-ups-surge-it-power-distribution/backup-power-ups/six-considerations-to-achieving-generator-ups-harmony.html)
- [Eaton, 5P G2 UPS](https://www.eaton.com/us/en-us/catalog/backup-power-ups-surge-it-power-distribution/eaton-5p-g2-ups.html) — 부하와 배터리 노후도에 따른 runtime 변동 조건
- [Infrastructure Layer — AWS](https://aws.amazon.com/trust-center/data-center/infrastructure-layer/)
- [Intel Unveils Industry-Leading Glass Substrates to Meet Demand for More Powerful Compute — Intel](https://www.intel.com/content/www/us/en/newsroom/news/intel-unveils-industry-leading-glass-substrates.html)
- [LIDE Technology: Industry Standard for Advanced Glass Processing — LPKF](https://lide.lpkf.com/en/technology/lide)
- [Glass Core Substrates: TGV Formation & Panel-Level Processing — LPKF](https://lide.lpkf.com/en/applications/glass-core-substrates)
- [KEDA 2.18, Scaling Deployments, StatefulSets & Custom Resources](https://keda.sh/docs/2.18/concepts/scaling-deployments/)
- [Karpenter, Scheduling](https://karpenter.sh/docs/concepts/scheduling/)
- [cuda-checkpoint: CUDA checkpoint and restore utility — NVIDIA](https://github.com/NVIDIA/cuda-checkpoint)
- [NVIDIA CUDA, CUDA C++ Best Practices Guide](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html)
- [NVIDIA, H100 GPU Product Specifications](https://www.nvidia.com/en-us/data-center/h100/)
- [NVIDIA DGX H100/H200 User Guide, Introduction to NVIDIA DGX H100/H200 Systems](https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html)
- [NVIDIA, System Management Interface](https://docs.nvidia.com/deploy/nvidia-smi/index.html)
- [NVIDIA GPU Telemetry, About GPU Telemetry](https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/)
- [NVIDIA GPU Telemetry, DCGM Exporter](https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/dcgm-exporter.html)
- [NVIDIA GPU Operator, Time-Slicing GPUs in Kubernetes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html)
- [PyTorch 2.14, torchrun (Elastic Launch)](https://docs.pytorch.org/docs/2.14/elastic/run.html)
- [Amazon SageMaker AI, Amazon SageMaker HyperPod](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod.html)
- [Amazon SageMaker AI, Orchestrating SageMaker HyperPod clusters with Amazon EKS](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks.html)
- [Amazon SageMaker AI, Health Monitoring System](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks-resiliency-health-monitoring-agent.html)
- [Amazon SageMaker AI, Deep health checks](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks-resiliency-deep-health-checks.html)
- [Amazon SageMaker AI, Automatic node recovery](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks-resiliency-node-recovery.html)
- [Amazon SageMaker AI, Suggested resilience configurations](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks-resiliency-config-tips.html)
- [Amazon SageMaker AI, Running jobs using kubectl](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks-run-jobs-kubectl.html)
- [Amazon SageMaker AI, Using the training operator to run jobs](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-eks-operator-usage.html)
- [Amazon SageMaker AI, Automatic node recovery and auto-resume](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-resiliency-slurm-auto-resume.html)
- [Amazon SageMaker AI, HyperPod managed tiered checkpointing](https://docs.aws.amazon.com/sagemaker/latest/dg/managed-tier-checkpointing.html)
- [Amazon SageMaker AI, Set up managed tiered checkpointing](https://docs.aws.amazon.com/sagemaker/latest/dg/managed-tier-checkpointing-setup.html)
- [Amazon SageMaker AI, SageMaker HyperPod task governance](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks-operate-console-ui-governance.html)
- [Amazon SageMaker AI, Amazon SageMaker HyperPod observability with Amazon Managed Grafana and Amazon Managed Service for Prometheus](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-observability-addon.html)

## 관련 문서

- [[LLM-Inference-Bottlenecks|LLM 추론 병목과 메모리 예산]]
- [[Storage-and-FileSystem-Performance|디스크 I/O와 RAID]]
- [[Distributed-Batch-Execution|분산 배치의 체크포인트와 재시작]]
- [[EC2-Compute#HPC의 통신 경로와 EFA 적용 조건|HPC 통신 경로와 EFA]]
- [[EKS|Amazon EKS]]
