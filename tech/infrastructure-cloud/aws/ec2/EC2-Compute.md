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

### AI 가속기는 실행 스택까지 함께 비교한다

2026-10-10 부분 대조: AWS Neuron 공식 소개 기준, Trainium과 Inferentia는 Neuron 개발 스택을 사용하는 AWS 가속기다. Neuron에는 컴파일러, 런타임, 학습과 추론 라이브러리, 프로파일링 도구가 포함된다. GPU 인스턴스와 비교할 때 인스턴스 사양뿐 아니라 모델 실행에 필요한 소프트웨어 경로도 확인한다.

다음은 가속기 선택을 위한 검증 제안이다.

- 현재 모델과 연산, 프레임워크 버전이 대상 Neuron 릴리스에서 지원되는지 확인한다. 프레임워크 이름이 같다는 사실만으로 모든 사용자 정의 연산의 호환성을 가정하지 않는다.
- 같은 모델, 정밀도와 입력 길이에서 결과 품질, 배치 크기별 처리량과 지연을 비교한다. 학습은 목표 품질에 도달하기까지, 추론은 실제 응답을 반환하기까지 측정한다.
- 비용에는 실행 시간 외에 모델 이식, 컴파일과 배포 준비, 유휴 용량을 포함한다. 과거 발표의 절감률을 모든 모델과 현재 요금에 적용하지 않는다.

서버 안팎의 메모리와 통신 병목은 [[GPU-Server-Infrastructure|GPU 서버 인프라]]와 함께 확인한다. 이 비교 절차는 특정 가속기의 우월성이나 이번 환경에서의 성능 측정 결과를 뜻하지 않는다.

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
