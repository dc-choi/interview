---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 운영과 수명주기", "User Data, ASG, AMI"]
---

# AWS EC2 — 운영과 수명주기

## User Data와 Cloud-init

부팅 시 1회 실행되는 스크립트로 자동 셋업:
```
#!/bin/bash
yum update -y
yum install -y docker
systemctl start docker
```

전형적 활용: 패키지 설치, 에이전트 등록(SSM Agent, CloudWatch Agent), 애플리케이션 부트. 단, 매 부팅 실행 아님 — `cloud-init-per` 또는 AMI 베이크가 정석.

## Auto Scaling Group (ASG) 연계

- **Launch Template** — AMI, 인스턴스 타입, User Data, SG, IAM 정의
- **Desired/Min/Max** — 원하는, 최소, 최대 인스턴스 수
- **Scaling Policy** — Target Tracking(CPU 70%, ALB Request Count), Step, Scheduled
- **Health Check** — EC2 또는 ELB. 비정상은 종료 후 재기동
- **Lifecycle Hook** — 종료 직전 grace 시간 (드레인, 로그 수집)

## EC2 인스턴스 상태(Lifecycle)

| 상태 | 의미 | 과금 |
|------|------|------|
| **Pending** | 부팅 준비 중 | 미청구 |
| **Running** | 정상 실행 중 | **청구** |
| **Stopping** | 중지 전환 중 | 미청구 (EBS 스토리지 비용은 별도) |
| **Stopped** | 중지 완료, EBS 데이터 유지 | EC2 미청구, **EBS, EIP는 별도** |
| **Shutting-down** | 종료 준비 중 | 미청구 |
| **Terminated** | 종료 완료 | 미청구 |

핵심: **Stop은 EBS 기반 인스턴스만 가능**, Instance Store 기반은 Stop = Terminate. Stop된 인스턴스에 연결된 EIP는 추가 비용 발생.

## AMI (Amazon Machine Image)

인스턴스를 시작하는 데 필요한 정보를 담은 **이미지 템플릿**. OS, 애플리케이션, 구성, 권한 정보 포함.

- **EBS 지원 AMI**: EBS 스냅샷에서 루트 볼륨 생성, Stop/Start 가능
- **Instance Store 지원 AMI**: S3에 저장된 템플릿에서 스토어 볼륨 생성, Stop 불가
- **리전 종속** — 다른 리전에서 사용하려면 `CopyImage`로 복사 필요
- **다른 계정과 공유 가능** (Launch Permission 부여)
- AMI에 연결된 **스냅샷은 단독 삭제 불가** — AMI Deregister 선행
- 출처:
  - AWS 제공 (Amazon Linux, Ubuntu 등)
  - **AWS Marketplace** — 서드파티 제공 AMI
  - 사용자 제작 (Packer로 베이크하여 ASG Launch Template 표준화)

AMI 기반 표준화는 부팅 시간 단축, 구성 일관성 확보의 핵심 패턴.
