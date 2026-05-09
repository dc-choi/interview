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

## 관련 문서
- [[AWS-Lambda|AWS Lambda · 서버리스 FaaS]]
- [[VPC|VPC · Subnet · CIDR]]
- [[ECS|ECS · 컨테이너 오케스트레이션]]
- [[IAM|IAM · 권한 관리]]
- [[S3|S3 · Object Storage]]
- [[Container|컨테이너 개관]]
- [[Load-Balancer|Load Balancer (ALB·NLB)]]
