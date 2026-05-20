---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["AWS EC2", "EC2", "Elastic Compute Cloud"]
---

# AWS EC2 (Elastic Compute Cloud)

AWS의 **가상 머신 컴퓨트 서비스**. 하이퍼바이저 위에서 인스턴스를 임대하는 모델이며, 모든 AWS 컴퓨트 서비스의 기반. ASG·ELB·ECS·EKS의 노드도 결국 EC2.

## 가상화 — Nitro System

| 측면 | Xen 기반 (구) | Nitro 기반 (현행) |
|------|--------------|------------------|
| 하이퍼바이저 | Xen | KVM 변형 (경량) |
| 네트워크·스토리지 | 호스트 CPU에서 처리 | **전용 Nitro Card**로 오프로드 |
| 베어메탈 | 어려움 | 가능 (`.metal` 인스턴스) |
| 보안 격리 | 소프트웨어 분리 | 하드웨어 수준 격리 |
| 성능 오버헤드 | 큼 | ~ 베어메탈 수준 |

Nitro Card가 ENI(네트워크)·EBS(스토리지)·보안을 별도 칩으로 처리 → 호스트 CPU는 게스트에 거의 100% 투입. 최신 인스턴스 패밀리(C5+, M5+, R5+)는 모두 Nitro.

## 스토리지 — Instance Store vs EBS

| 측면 | Instance Store | EBS (Elastic Block Store) |
|------|---------------|---------------------------|
| 위치 | 물리 호스트에 직결 | 네트워크 스토리지 |
| 성능 | 매우 빠름 (NVMe) | 빠름 (gp3·io2 옵션) |
| 영속성 | **휘발성** (Stop·Terminate 시 손실) | 영속 (인스턴스와 독립) |
| 스냅샷 | 불가 | S3에 자동 스냅샷 |
| 적합 | 캐시·임시 처리·shuffle | 부트 디스크·DB 데이터 |

EBS 볼륨 유형:
- `gp3`(범용 SSD) 표준, IOPS·Throughput 분리 프로비저닝
- `io2 Block Express` 고성능 (DB)
- `st1`/`sc1` HDD (저비용 대용량)

## 인스턴스 패밀리

| 패밀리 | 특성 | 용도 |
|--------|------|------|
| `t3·t4g` | **Burstable** — CPU 크레딧 | 가변 부하 (개발·소형 웹) |
| `m5·m6g·m7i` | 범용 균형 | 표준 워크로드 |
| `c5·c6g·c7i` | 컴퓨트 최적화 | 배치·HPC·인코딩 |
| `r5·r6g·r7i` | 메모리 최적화 | DB·캐시·인메모리 분석 |
| `i3·i4i` | 스토리지 (NVMe) | 데이터베이스·검색 |
| `g·p` | GPU | ML 학습·추론·그래픽 |
| `a1·m6g` (Graviton) | ARM | 비용 효율 ~20% ↓ |

## T 시리즈 CPU 크레딧 시스템

T 인스턴스는 **베이스라인 CPU 성능**(예: t3.medium 20%)을 기준으로:
- 사용량 < 베이스라인 → **크레딧 적립**
- 사용량 > 베이스라인 → **크레딧 소진하여 버스트** (100% CPU)
- 크레딧 0 → 베이스라인으로 강제 제한

| 모드 | 동작 |
|------|------|
| Standard | 크레딧 0 시 베이스라인 제한 (예측 가능 비용) |
| **Unlimited** (기본) | 크레딧 소진 후에도 풀 CPU, 추가 비용 발생 |

급증하는 트래픽이 있을 때 Unlimited는 비용 폭증 위험 — CloudWatch `CPUCreditBalance` 모니터링 필수.

## Placement Group — 물리 배치 제어

| 종류 | 의미 | 적합 |
|------|------|------|
| **Cluster** | 같은 AZ 내 좁은 영역에 배치 | HPC, 노드 간 저지연 (10Gbps+) |
| **Spread** | 노드별 다른 하드웨어 | 소수 인스턴스, 동시 장애 회피 |
| **Partition** | 파티션 단위 격리 (Kafka·HDFS) | 분산 시스템 장애 도메인 분리 |

## IMDS — Instance Metadata Service

`http://169.254.169.254/latest/meta-data/` 에서 인스턴스 정보·IAM 임시 자격증명 조회. SSRF 공격으로 자격증명 탈취 사례가 다수 발생해 **IMDSv2** 도입:

| 측면 | IMDSv1 | IMDSv2 |
|------|--------|--------|
| 인증 | 없음 (GET 한 번) | **PUT으로 토큰 발급 → 토큰으로 GET** |
| 홉 제한 | 무제한 | `hop-limit` 1 (기본) — 컨테이너 SSRF 차단 |
| SSRF 방어 | 약함 | 강함 |

신규 인스턴스는 IMDSv2 강제 권장 (`HttpTokens=required`).

## 비용 모델

| 모델 | 할인 | 적합 |
|------|------|------|
| On-Demand | 0% | 단기·예측 불가 |
| Reserved Instances (1·3년) | ~30-60% | 안정적 24/7 워크로드 |
| **Savings Plans** (Compute·EC2) | ~30-66% | 유연한 약정 (RI 후속) |
| **Spot** | ~70-90% | 중단 허용 배치·stateless |
| Dedicated Host | premium | 라이선스 BYOL·컴플라이언스 |

Spot은 AWS 여유 용량을 빌리는 모델 — 2분 통보 후 회수. fault-tolerant 워크로드(배치, ML 학습, ECS Spot)에 한정.

## User Data와 Cloud-init

부팅 시 1회 실행되는 스크립트로 자동 셋업:
```
#!/bin/bash
yum update -y
yum install -y docker
systemctl start docker
```

전형적 활용: 패키지 설치, 에이전트 등록(SSM Agent·CloudWatch Agent), 애플리케이션 부트. 단, 매 부팅 실행 아님 — `cloud-init-per` 또는 AMI 베이크가 정석.

## Auto Scaling Group (ASG) 연계

- **Launch Template** — AMI·인스턴스 타입·User Data·SG·IAM 정의
- **Desired/Min/Max** — 원하는·최소·최대 인스턴스 수
- **Scaling Policy** — Target Tracking(CPU 70%·ALB Request Count), Step, Scheduled
- **Health Check** — EC2 또는 ELB. 비정상은 종료 후 재기동
- **Lifecycle Hook** — 종료 직전 grace 시간 (드레인·로그 수집)

## EC2 인스턴스 상태(Lifecycle)

| 상태 | 의미 | 과금 |
|------|------|------|
| **Pending** | 부팅 준비 중 | 미청구 |
| **Running** | 정상 실행 중 | **청구** |
| **Stopping** | 중지 전환 중 | 미청구 (EBS 스토리지 비용은 별도) |
| **Stopped** | 중지 완료, EBS 데이터 유지 | EC2 미청구, **EBS·EIP는 별도** |
| **Shutting-down** | 종료 준비 중 | 미청구 |
| **Terminated** | 종료 완료 | 미청구 |

핵심: **Stop은 EBS 기반 인스턴스만 가능**, Instance Store 기반은 Stop = Terminate. Stop된 인스턴스에 연결된 EIP는 추가 비용 발생.

## AMI (Amazon Machine Image)

인스턴스를 시작하는 데 필요한 정보를 담은 **이미지 템플릿**. OS·애플리케이션·구성·권한 정보 포함.

- **EBS 지원 AMI**: EBS 스냅샷에서 루트 볼륨 생성, Stop/Start 가능
- **Instance Store 지원 AMI**: S3에 저장된 템플릿에서 스토어 볼륨 생성, Stop 불가
- **리전 종속** — 다른 리전에서 사용하려면 `CopyImage`로 복사 필요
- **다른 계정과 공유 가능** (Launch Permission 부여)
- AMI에 연결된 **스냅샷은 단독 삭제 불가** — AMI Deregister 선행
- 출처:
  - AWS 제공 (Amazon Linux, Ubuntu 등)
  - **AWS Marketplace** — 서드파티 제공 AMI
  - 사용자 제작 (Packer로 베이크하여 ASG Launch Template 표준화)

AMI 기반 표준화는 부팅 시간 단축·구성 일관성 확보의 핵심 패턴.

## Elastic IP (EIP)

EC2 네트워크 인터페이스에 부여하는 **정적 공인 IP**. 기본 Public IP는 Stop/Start 시 변경되지만, EIP는 명시적 해제 전까지 고정.

- 계정·리전당 **기본 5개까지** 보유 가능 (요청으로 증가)
- **무료 조건**: 실행 중인 인스턴스에 연결된 상태 1개
- **유료 발생 조건**:
  - EIP 생성 후 인스턴스에 미연결
  - **중지된 인스턴스**에 연결된 상태
  - 한 인스턴스에 2개 이상 EIP 연결
- ENI 단위로 부여되며, ENI를 다른 인스턴스로 이동시키면 EIP도 따라감 — **장애 복구·블루/그린 배포**에 활용

권장 패턴: EIP는 **Bastion·NAT Gateway 대체용 NAT Instance** 정도로 제한하고, 웹 서비스는 ALB·CloudFront 뒤로 숨기는 것이 정석.

## ENA (Elastic Network Adapter)

**SR-IOV (Single Root I/O Virtualization)** 기반 고성능 네트워크 인터페이스.

- 최대 **100 Gbps** 대역폭 (인스턴스 패밀리 종속)
- 인스턴스 간 **저지연**, 높은 PPS (Packets Per Second)
- 최신 인스턴스 패밀리는 모두 ENA 지원, Nitro 기반에서 표준
- 클러스터 컴퓨팅·실시간 분석·고성능 DB 통신에 필수

## Key Pair

EC2 SSH 접속 시 사용하는 **공개키/개인키 쌍**. AWS가 공개키를 인스턴스에 저장, 사용자가 개인키(`*.pem`)를 보유.

- SSH 접속 시 로그인 정보 **암호화·해독**에 사용
- **개인키 분실 시 접속 불가** — Key Pair 자체에는 복구 메커니즘 없음, EBS 분리 후 다른 인스턴스에 마운트하여 `authorized_keys` 수정 우회
- OS별 기본 Username 상이:
  - Amazon Linux: `ec2-user`
  - Ubuntu: `ubuntu`
  - CentOS: `centos`
  - Debian: `admin` 또는 `debian`
- **보관 원칙**: 개인키 외부 유출 금지, Git 커밋 금지, 권한 `chmod 400`

현업 권장: SSH Key Pair 의존을 줄이고 **AWS Systems Manager Session Manager**로 대체 (IAM 권한 기반, 포트 22 개방 불필요, 세션 로깅).

## On-Demand Capacity Reservations

특정 AZ에 **EC2 용량을 사전 예약**하는 옵션 (구매 약정 별개).

- **약정 없음** — 원하는 기간만 예약하고 해제 가능
- 예약된 용량은 다른 사용자에게 할당되지 않음 — **용량 부족(Insufficient Capacity) 회피**
- 사용 여부와 무관하게 **예약된 용량에 대해 On-Demand 요금 청구**
- Reserved Instances·Savings Plans 할인과 **결합 가능**
- 적합: 재해 복구 사이트, 분기 결산·이벤트성 대용량 처리, 특정 AZ 용량 보장 필요

비교: **Savings Plans**는 비용 약정으로 할인만, **Capacity Reservations**는 용량 확보 목적. 둘은 직교 개념.

## 흔한 실수

- **인스턴스 스토어에 영속 데이터** — Stop/Terminate 시 손실
- **IMDSv1 노출** — SSRF로 IAM 자격증명 탈취. v2 강제
- **t3 Unlimited 무방비 운영** — 크레딧 소진 누적으로 비용 폭증
- **Placement Group 무관심** — 같은 AZ 단일 하드웨어 장애로 전 노드 동시 다운
- **gp2 그대로 운영** — gp3가 동성능에 ~20% 저렴. 마이그레이션
- **public IP 부여 + SG 0.0.0.0/0** — VPC·NAT·Bastion·SSM Session Manager로 격리
- **Spot 단일 타입 의존** — 회수 시 전부 다운. **Mixed Instance Policy + 다중 AZ**

## 면접 체크포인트

- Nitro System이 Xen에서 바뀐 이유 (성능 오버헤드·베어메탈)
- Instance Store vs EBS 트레이드오프
- T 시리즈 CPU 크레딧 시스템 — Unlimited 모드의 비용 함정
- Placement Group 3종 (Cluster·Spread·Partition) 차이
- IMDSv2가 SSRF 방어에 어떻게 기여하는가
- Savings Plans · Reserved · Spot 비용 모델 선택 기준
- ASG의 Launch Template · Scaling Policy · Lifecycle Hook 흐름

## 시험 체크포인트 (SAA-C03)

- EC2 상태 5종 (Pending·Running·Stopping·Shutting-down·Terminated)과 **과금 여부**
- **Stop은 EBS 기반만 가능**, Instance Store 기반은 Stop = Terminate
- AMI는 **리전 종속** — Cross-Region 사용 시 복사 필수
- AMI 연결 스냅샷은 **AMI Deregister 후에만 삭제** 가능
- Elastic IP는 **실행 중 인스턴스에 연결된 1개만 무료**, 미연결·중지 상태는 과금
- ENA로 **최대 100 Gbps** 대역폭, Nitro 기반에서 표준
- Key Pair **개인키 분실 시 복구 불가** — EBS 분리 후 우회 또는 새 인스턴스
- OS별 기본 SSH Username 차이 (Amazon Linux `ec2-user`, Ubuntu `ubuntu`)
- **On-Demand Capacity Reservations** — 약정 없이 용량 예약, Savings Plans와 결합 가능
- Placement Group: **Cluster**(저지연), **Spread**(소수·하드웨어 분산, AZ당 7개), **Partition**(파티션당 자체 랙·전원, 최대 7개)
- Spot 인스턴스는 가격 입찰 + 2분 통보 회수 → fault-tolerant 워크로드 한정
- Reserved vs Savings Plans: **Savings Plans가 리전·인스턴스 세대·사이즈 유연성** 우위

## 관련 문서
- [[AWS-Fundamentals|AWS 기본 용어 (Region·AZ)]]
- [[EBS|EBS · Elastic Block Store]]
- [[AWS-Lambda|AWS Lambda · 서버리스 FaaS]]
- [[VPC|VPC · Subnet · CIDR]]
- [[ECS|ECS · 컨테이너 오케스트레이션]]
- [[IAM|IAM · 권한 관리]]
- [[S3|S3 · Object Storage]]
- [[Container|컨테이너 개관]]
- [[Load-Balancer|Load Balancer (ALB·NLB)]]
