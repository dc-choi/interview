---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 컴퓨트 아키텍처", "Nitro System"]
verified_at: 2026-07-21
---

# AWS EC2 — 컴퓨트 아키텍처

## 가상화 — Nitro System

| 측면 | Xen 기반 (구) | Nitro 기반 (현행) |
|------|--------------|------------------|
| 하이퍼바이저 | Xen | KVM 변형 (경량) |
| 네트워크, 스토리지 | 호스트 CPU에서 처리 | **전용 Nitro Card**로 오프로드 |
| 베어메탈 | 어려움 | 가능 (`.metal` 인스턴스) |
| 보안 격리 | 소프트웨어 분리 | 하드웨어 수준 격리 |
| 성능 오버헤드 | 워크로드와 세대에 따라 다름 | I/O 기능을 전용 하드웨어로 오프로드해 호스트 자원을 인스턴스에 더 많이 제공 |

Nitro System은 네트워크, EBS 스토리지, 관리 기능을 전용 카드와 보안 칩으로 오프로드한다. 다수의 현행 인스턴스 타입이 Nitro 기반이지만 지원 기능은 타입과 크기별로 다르므로 EC2 인스턴스 유형 표에서 확인한다.

### Nitro의 인스턴스 간 전송 암호화 조건

2026-10-07 공식 문서 확인 기준. Nitro 기반이라는 사실만으로 모든 인스턴스 간 경로에 같은 자동 암호화가 적용된다고 판단하지 않는다. Nitro 하드웨어가 제공하는 추가 전송 암호화는 다음 조건을 함께 확인한다.

- 양쪽 인스턴스 타입이 해당 기능을 지원해야 한다.
- 같은 리전에 있어야 한다.
- 같은 VPC 또는 피어링된 VPC에 있어야 하며, 트래픽이 로드 밸런서나 Transit Gateway 같은 가상 네트워크 장치와 서비스를 통과하지 않아야 한다.

이 조건은 AWS 물리 계층 암호화와 구분한다. 인터넷 클라이언트부터 애플리케이션까지 민감 데이터를 보호하는 TLS 설정과 검증은 별도로 필요하다. 토폴로지가 바뀌면 인스턴스 타입뿐 아니라 실제 패킷 경로도 다시 확인한다.

## 스토리지 — Instance Store vs EBS

| 측면 | Instance Store | EBS (Elastic Block Store) |
|------|---------------|---------------------------|
| 위치 | 물리 호스트에 직결 | 네트워크 스토리지 |
| 성능 | 매우 빠름 (NVMe) | 빠름 (gp3, io2 옵션) |
| 영속성 | **휘발성** (Stop, Hibernate, Terminate와 호스트 장애 시 손실 가능) | 볼륨 수명 주기와 `DeleteOnTermination` 설정에 따라 인스턴스 종료 뒤에도 유지 가능 |
| 스냅샷 | 직접 지원하지 않음 | 요청 또는 정책에 따라 EBS 스냅샷 생성 |
| 적합 | 캐시, 임시 처리, shuffle | 부트 디스크, DB 데이터 |

EBS 볼륨 유형:
- `gp3`(범용 SSD) 표준, IOPS, Throughput 분리 프로비저닝
- `io2 Block Express` 고성능 (DB)
- `st1`/`sc1` HDD (저비용 대용량)

## 인스턴스 패밀리

| 패밀리 | 특성 | 용도 |
|--------|------|------|
| `t3, t4g` | **Burstable** — CPU 크레딧 | 가변 부하 (개발, 소형 웹) |
| `m5, m6g, m7i` | 범용 균형 | 표준 워크로드 |
| `c5, c6g, c7i` | 컴퓨트 최적화 | 배치, HPC, 인코딩 |
| `r5, r6g, r7i` | 메모리 최적화 | DB, 캐시, 인메모리 분석 |
| `i3, i4i` | 스토리지 (NVMe) | 데이터베이스, 검색 |
| `g, p` | GPU | ML 학습, 추론, 그래픽 |
| `a1, m6g` (Graviton) | ARM | ARM64 호환성이 있는 워크로드에서 가격 대비 성능을 측정해 비교 |

### 인스턴스 이름을 읽는 순서

2026-10-09 공식 명명 규칙 기준, `c7gn.xlarge`는 `c`(컴퓨트 최적화), `7`(세대), `g`(Graviton), `n`(네트워크와 EBS 최적화), `xlarge`(크기)로 읽는다. 옵션 위치의 `a`는 AMD, `i`는 Intel, `d`는 인스턴스 스토어, `b`는 블록 스토리지 최적화를 뜻한다. 접두사의 `g` 계열과 옵션의 `g`를 같은 뜻으로 읽지 않는다.

이름은 후보를 좁히는 출발점이다. 실제 선택에서는 해당 타입과 크기의 CPU, 메모리, 네트워크와 EBS 사양을 확인하고 워크로드로 비교한다. 세대 숫자나 크기만으로 모든 자원의 성능 향상 비율을 추정하지 않는다.

### AMD 세대 비교는 패밀리와 크기를 고정한다

부분 검증(2026-10-14): C8a, M8a와 R8a 공식 제품 사양을 대조했다. 세 패밀리는 5세대 AMD EPYC 기반이며 C8a는 컴퓨트 최적화, M8a는 범용, R8a는 메모리 최적화다. 같은 세대라는 이유로 용도를 서로 바꾸어 읽지 않는다.

각 vCPU는 물리 코어 하나에 대응한다. 다른 CPU 계열과 비교할 때 같은 vCPU 수가 같은 코어 구성이나 처리량을 뜻하지는 않는다. 공식 사양에서 `c8a.large`는 네트워크 최대 12.5 Gbps, EBS 최대 10 Gbps지만 `c8a.48xlarge`는 각각 75 Gbps, 60 Gbps다. 패밀리의 최대 대역폭을 모든 크기의 보장값으로 쓰지 않는다.

AWS가 제시하는 최대 30% 성능 향상은 각각 C7a, M7a, R7a와 비교한 제품 설명이다. 서비스의 지연이나 비용이 같은 비율로 개선된다는 보장은 아니다. 선택 검증에서는 같은 요청과 데이터, 런타임을 유지하고 CPU, 메모리, 네트워크와 EBS 병목을 나누어 처리량과 지연을 측정한다(검증 제안). 실제 부하 시험은 수행하지 않았으며 이 절만 추가 대조해 기존 검증일은 유지한다.

### GPU 메모리와 대역폭은 인스턴스 크기별로 확인한다

부분 검증(2026-10-14): EC2 G7 공식 제품 사양을 대조했다. G7은 NVIDIA RTX PRO 4500 Blackwell Server Edition GPU를 사용하며 GPU당 메모리는 32 GB다. `g7.2xlarge`는 GPU 1개, 네트워크 최대 60 Gbps이고, `g7.48xlarge`는 GPU 8개, 총 GPU 메모리 256 GB와 네트워크 700 Gbps로 명시된다. 패밀리의 최대 사양을 모든 크기의 사양으로 읽지 않는다.

AWS가 제시한 최대 4.6배 AI 추론 성능과 최대 2.1배 그래픽 성능은 G6와 비교한 제품 설명이다. 현재 애플리케이션의 지연이나 비용이 같은 비율로 개선된다는 보장은 아니다.

선택 검증 제안: 모델과 정밀도, 입력 길이와 배치 크기를 고정하고 GPU 메모리 사용량, CPU 전처리, 데이터 전송, 처리량과 지연을 함께 측정한다. 여러 GPU의 메모리 합계를 단일 GPU 메모리처럼 취급하지 말고 사용하는 실행 스택의 모델 분할과 통신 구성을 확인한다. 실제 GPU 부하 시험은 수행하지 않았으며 이 절만 대조해 기존 검증일은 유지한다.

### Graviton 이전은 이미지, 의존성과 성능을 함께 검증한다

2026-10-13 AWS Graviton 전환 가이드와 Docker 공식 문서로 이 절을 대조했다. Graviton은 arm64이므로 인스턴스 타입만 바꾸지 않고 AMI, 컨테이너 이미지, 라이브러리, 런타임과 운영 에이전트의 지원을 확인한다. 언어가 이식 가능해도 함께 배포하는 네이티브 구성 요소까지 호환된다는 뜻은 아니다.

- 사용하는 이미지의 **실제 태그나 digest**를 `docker buildx imagetools inspect <이미지>`로 조회한다. 멀티 플랫폼 이미지라면 manifest 목록에서 `linux/arm64` 지원을 확인한다. 다른 태그의 지원 여부로 현재 배포 이미지를 판단하지 않는다.
- 빌드 방식은 QEMU 에뮬레이션, 아키텍처별 네이티브 빌더, 크로스 컴파일을 비교한다. QEMU는 시작하기 쉽지만 컴파일과 압축 같은 CPU 작업이 느려질 수 있다. 네이티브 빌더는 운영 비용이 들고, 크로스 컴파일은 언어와 툴체인의 지원이 필요하다.
- 의존성 업그레이드가 필요하면 기존 x86 환경에서 먼저 검증해 버전 변경과 CPU 아키텍처 변경의 영향을 나눈다. arm64 산출물에도 기존 기능 테스트를 적용한다.
- 부하 시험은 같은 요청 패턴에서 허용 지연과 오류율을 넘기 전의 최대 처리량을 비교한다. vCPU 수나 CPU 사용률만으로 성능이 같다고 판단하지 않는다. 검증 후 canary나 blue-green으로 트래픽 일부부터 전환한다.

운영 검증 제안: 지연이 악화되면 애플리케이션과 네이티브 라이브러리를 프로파일링하고, 처리량당 비용을 다시 계산한다. 기존 x86 이미지와 배포 설정을 복구 경로로 유지한다. 발표 사례의 절감률이나 특정 언어의 이전 난이도를 일반적인 보장으로 사용하지 않는다. 실제 빌드, 부하 시험과 이전을 수행한 기록은 아니다.

Porting Advisor for Graviton은 알려진 코드 패턴과 의존성 호환성 문제를 찾는 사전 점검 도구다(2026-10-13 AWS 저장소 README 확인). 비 ARM 장비에서도 실행할 수 있고 소스를 자동 수정하지 않는다. 빌드에서 제외한 파일까지 소스 트리 검사에 포함해 오탐이 생길 수 있으므로 결과를 실제 빌드 대상과 대조한다. 문제를 찾지 못했다는 결과는 Graviton 기능 테스트와 부하 시험을 대신하지 않는다.

### AI 가속기는 실행 스택까지 함께 비교한다

2026-10-10 부분 대조: AWS Neuron 공식 소개 기준, Trainium과 Inferentia는 Neuron 개발 스택을 사용하는 AWS 가속기다. Neuron에는 컴파일러, 런타임, 학습과 추론 라이브러리, 프로파일링 도구가 포함된다. GPU 인스턴스와 비교할 때 인스턴스 사양뿐 아니라 모델 실행에 필요한 소프트웨어 경로도 확인한다.

다음은 가속기 선택을 위한 검증 제안이다.

- 현재 모델과 연산, 프레임워크 버전이 대상 Neuron 릴리스에서 지원되는지 확인한다. 프레임워크 이름이 같다는 사실만으로 모든 사용자 정의 연산의 호환성을 가정하지 않는다.
- 같은 모델, 정밀도와 입력 길이에서 결과 품질, 배치 크기별 처리량과 지연을 비교한다. 학습은 목표 품질에 도달하기까지, 추론은 실제 응답을 반환하기까지 측정한다.
- 비용에는 실행 시간 외에 모델 이식, 컴파일과 배포 준비, 유휴 용량을 포함한다. 과거 발표의 절감률을 모든 모델과 현재 요금에 적용하지 않는다.

서버 안팎의 메모리와 통신 병목은 [[GPU-Server-Infrastructure|GPU 서버 인프라]]와 함께 확인한다. 이 비교 절차는 특정 가속기의 우월성이나 이번 환경에서의 성능 측정 결과를 뜻하지 않는다.

#### Neuron 이식은 연산 검사와 실행 검증을 나눈다

부분 검증(2026-10-13): AWS Neuron의 프레임워크 비교와 Analyze, Tracing API 문서를 대조했다. Inf1의 `torch-neuron`은 아카이브되어 적극적인 개발이 중단된 경로다. 과거 Inf1 예제의 API와 컴파일 옵션을 Inf2/Trn1의 `torch-neuronx`에 그대로 적용하지 않는다. 아래는 `torch-neuronx` 추론 경로의 조건이며, 기존 문서 전체의 검증일은 유지한다.

- `torch_neuronx.analyze`는 예제 입력으로 연산별 컴파일러 지원 여부를 검사하고, 지원하지 않는 연산의 실패 정보와 코드 위치를 반환한다. 실행할 traced model을 만들지는 않는다. 지원 비율만으로 전체 모델의 컴파일 성공이나 출력 정확도를 보장하지 않는다.
- `torch_neuronx.trace`의 기본 결과는 입력 shape와 데이터 타입이 고정된 그래프다. 입력 데이터에 따라 달라지는 Python 분기 조건을 추론 때 다시 평가하지 않으므로, trace 성공과 원래 모델의 의미 보존을 별도로 검증한다. 가변 입력에는 bucketing 같은 별도 처리 전략이 필요하다.
- 오류를 찾을 때는 모델을 작은 블록으로 줄이고 입력 shape, 연산 옵션과 컴파일러 버전을 기록하는 방법을 검토한다. 연산을 치환하거나 분할했다면 기준 모델과 출력 오차를 비교한다. 과거 사례의 특정 연산 한계값을 현재 SDK의 공통 제한으로 쓰지 않는다(검증 절차 제안).

비용 비교 제안: 허용 지연과 품질을 만족하는 배치 설정마다 인스턴스당 처리량을 측정한 뒤, 목표 처리량을 나누어 올림한 대수와 시간당 단가를 곱한다. 이는 균등한 부하 분배를 가정한 1차 추정이다. 배치 대기, 부하 편차와 장애 여유를 포함한 전체 서비스 부하 시험으로 검증하며, 한 대의 가격이나 과거 절감률만으로 이전을 결정하지 않는다.

#### 컴파일 산출물과 컴파일 캐시를 구분한다

부분 검증(2026-10-13): Neuron Tracing API와 Persistent Cache 문서를 대조했다. `torch_neuronx.trace`의 결과는 `torch.jit.save`로 저장하고 `torch.jit.load`로 불러오는 Neuron 전용 추론 산출물이다. 컴파일 작업과 서빙 시작을 분리할 때 재사용할 수 있지만, 일반 CPU나 GPU용 모델 파일로 취급하지 않는다.

**Neuron Persistent Cache**는 별도 기능이다. 문서의 XLA 학습 경로에서는 컴파일러 flags와 XLA graph의 hash를 캐시 키로 사용하며, 컴파일러 버전이나 graph가 바뀌면 다시 컴파일한다. 배치 크기 변경도 graph를 바꿀 수 있다. 가중치를 상수로 고정해 함께 컴파일하는 `torch-neuronx` trace 경로에는 이 캐시가 적용되지 않는다. 저장한 traced model과 자동 컴파일 캐시를 같은 기능으로 설명하지 않는다.

배포 점검 제안: 모델 revision, 입력 shape, 정밀도, 컴파일러 버전과 옵션을 산출물과 함께 기록한다. 컴파일 완료 후 대상 Neuron 환경에서 로딩, 출력 품질과 지연을 확인한 산출물만 배포한다. 컴파일에 쓰는 자원과 서빙 자원을 따로 산정하고, 과거 사례의 특정 인스턴스 크기를 모든 모델의 필수 조건으로 적용하지 않는다.

#### 저정밀도 연산과 확률적 반올림

2026-10-13 AWS Neuron의 Rounding Modes 문서로 대조했다. NeuronCore-v2부터는 RNE(round nearest, ties to even)와 stochastic rounding을 선택할 수 있다. 크기가 크게 다른 값을 더할 때 RNE에서 작은 증가분이 반올림으로 사라질 수 있으며, stochastic rounding은 인접한 표현 가능 값과의 거리에 따라 확률적으로 반올림해 작은 증가분이 누적될 수 있게 한다.

문서의 예제는 `NEURON_RT_STOCHASTIC_ROUNDING_EN=0`으로 RNE, `=1`로 stochastic rounding을 선택한다. 이 기능을 모든 모델의 FP32 정확도 보장이나 같은 결과의 재현 보장으로 해석하지 않는다. 가속기를 비교할 때는 데이터 타입과 반올림 모드도 기록하고, 같은 데이터에서 손실과 검증 품질, 처리량을 함께 측정하는 것이 점검 기준이다.

## T 시리즈 CPU 크레딧 시스템

2026-10-09 공식 문서로 아래 적립과 소진, 모드별 동작을 대조했다.

T 인스턴스는 **베이스라인 CPU 성능**(예: t3.medium 20%)을 기준으로:
- 사용량 < 베이스라인 → **크레딧 적립**
- 사용량 > 베이스라인 → **크레딧 소진하여 버스트** (100% CPU)
- 적립 크레딧 소진 후 동작은 Standard와 Unlimited 모드에 따라 다름

| 모드 | 동작 |
|------|------|
| Standard | 적립 크레딧이 소진되면 CPU 사용률이 점차 베이스라인으로 내려가며, 크레딧이 다시 쌓이기 전까지 그 위로 버스트하지 못함 |
| **Unlimited** | 크레딧 소진 후에도 베이스라인을 넘겨 버스트할 수 있고 일정 조건에서 surplus credit 요금 발생. T3/T4g 온디맨드의 초기 설정은 시작 경로와 구성에 따라 확인 |

급증하는 트래픽이 있을 때 Unlimited는 추가 비용이 생길 수 있으므로 `CPUCreditBalance`, `CPUSurplusCreditBalance`, `CPUSurplusCreditsCharged`를 함께 모니터링한다.

## Placement Group — 물리 배치 제어

| 종류 | 의미 | 적합 |
|------|------|------|
| **Cluster** | 같은 AZ 내 저지연 네트워크에 유리하도록 가깝게 배치 | HPC, 노드 간 고대역폭과 저지연 |
| **Spread** | 노드별 다른 하드웨어 | 소수 인스턴스, 동시 장애 회피 |
| **Partition** | 파티션 단위 격리 (Kafka, HDFS) | 분산 시스템 장애 도메인 분리 |

### HPC의 통신 경로와 EFA 적용 조건

2026-10-10 EC2와 AWS ParallelCluster 공식 문서 대조 기준. 노드 간 통신이 많은 HPC에서는 CPU 코어 수와 함께 통신 경로를 확인한다. EFA는 지원되는 MPI와 Libfabric 경로에서 OS 커널을 우회해 장치와 통신한다. 인터페이스를 붙였다는 사실만으로 임의의 TCP 애플리케이션이 같은 경로를 쓰는 것은 아니다.

- 대상 인스턴스의 EFA 지원과 애플리케이션의 MPI, Libfabric 구성을 확인한다.
- ParallelCluster의 Slurm 구성에서는 `SlurmQueues / ComputeResources / Efa / Enabled`를 `true`로 설정한다. EFA의 OS-bypass 통신은 서로 다른 AZ 사이에서 사용할 수 없다.
- AWS는 지연을 줄이기 위해 EFA 인스턴스를 cluster placement group에 배치하도록 권고한다. 지원 인터페이스, 통신 라이브러리와 물리 배치 조건을 함께 확인한다.

다음은 선택을 검증하는 방법이다. 같은 입력과 결과 정확도를 유지한 채 노드 수를 늘려 계산, 통신과 파일 I/O 시간을 나누어 잰다. 작업 완료 시간과 전체 자원 비용을 함께 비교한다. 기상 시뮬레이션 한 사례의 절감률을 다른 워크로드의 보장값으로 사용하지 않으며, 코어 수 증가에 비례한 가속도 가정하지 않는다.

## 출처

- [Amazon EC2 G7 instances — AWS](https://aws.amazon.com/ec2/instance-types/g7/)
- [Amazon EC2 C8a instances — AWS](https://aws.amazon.com/ec2/instance-types/c8a/)
- [Amazon EC2 M8a instances — AWS](https://aws.amazon.com/ec2/instance-types/m8a/)
- [Amazon EC2 R8a instances — AWS](https://aws.amazon.com/ec2/instance-types/r8a/)
- [AWS Neuron, Neuron Persistent Cache](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/about-neuron/arch/neuron-features/neuron-caching.html)
- [AWS Neuron, Comparison of torch-neuron (Inf1) versus torch-neuronx (Inf2 & Trn1) for Inference](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/guide-torch-neuron-vs-torch-neuronx-inference.html)
- [AWS Neuron, PyTorch NeuronX Analyze API for Inference](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/torch-neuronx/api-reference-guide/inference/api-torch-neuronx-analyze.html)
- [AWS Neuron, PyTorch NeuronX Tracing API for Inference](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/torch-neuronx/api-reference-guide/inference/api-torch-neuronx-trace.html)
- [Porting Advisor for Graviton — AWS](https://github.com/aws/porting-advisor-for-graviton)
- [AWS Neuron, Neuron Rounding Modes](https://awsdocs-neuron.readthedocs-hosted.com/en/v2.30.0/about-neuron/arch/neuron-features/rounding-modes.html)
- [Considerations when transitioning workloads to AWS Graviton based Amazon EC2 instances — AWS](https://github.com/aws/aws-graviton-getting-started/blob/main/transition-guide.md)
- [Docker 공식 문서, Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [Docker 공식 문서, docker buildx imagetools inspect](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [Amazon EC2, Elastic Fabric Adapter for AI/ML and HPC workloads on Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html)
- [AWS ParallelCluster, Elastic Fabric Adapter](https://docs.aws.amazon.com/parallelcluster/latest/ug/efa-v3.html)
- [SDK for Gen AI and Deep Learning - AWS Neuron — AWS](https://aws.amazon.com/ai/machine-learning/neuron/)
- [AWS Nitro System](https://docs.aws.amazon.com/whitepapers/latest/security-design-of-aws-nitro-system/the-components-of-the-nitro-system.html)
- [Nitro 기반 EC2 인스턴스](https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-nitro-instances.html)
- [버스터블 성능 인스턴스의 CPU 크레딧](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html)
- [인스턴스 스토어 수명](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-store-lifetime.html)
- [EC2 데이터 보호와 인스턴스 간 전송 암호화](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/data-protection.html) — 전송 암호화 조건의 부분 검증
- [Amazon EC2 인스턴스 유형 명명 규칙](https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-type-names.html)

## 관련 문서

- [[EC2|EC2 전체 구성]]
- [[EC2-Cost|구매 옵션과 용량 예약]]
