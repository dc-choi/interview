---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 흔한 실수", "EC2 면접, 시험 체크포인트"]
verified_at: 2026-07-15
---

# AWS EC2 — 흔한 실수와 체크포인트

## 흔한 실수

- **인스턴스 스토어에 영속 데이터** — Stop/Terminate 시 손실
- **IMDSv1 노출** — SSRF로 IAM 자격증명 탈취. v2 강제
- **t3 Unlimited 무방비 운영** — 크레딧 소진 누적으로 비용 폭증
- **Placement Group 무관심** — Cluster는 단일 AZ에 밀집 배치되므로 지연은 낮지만 장애 격리가 목적이 아니다. 장애 도메인 분리가 필요하면 Spread나 Partition 검토
- **gp2 그대로 운영** — gp3는 용량과 성능을 분리해 조정할 수 있고 많은 구성에서 gp2보다 비용 효율적이다. 리전별 단가와 필요한 IOPS, 처리량을 비교해 전환
- **public IP 부여 + SG 0.0.0.0/0** — VPC, NAT, Bastion, SSM Session Manager로 격리
- **Spot 단일 타입 의존** — 회수 시 전부 다운. **Mixed Instance Policy + 다중 AZ**

## 면접 체크포인트

- Nitro System이 Xen에서 바뀐 이유 (성능 오버헤드, 베어메탈)
- Instance Store vs EBS 트레이드오프
- T 시리즈 CPU 크레딧 시스템 — Unlimited 모드의 비용 함정
- Placement Group 3종 (Cluster, Spread, Partition) 차이
- IMDSv2가 SSRF 방어에 어떻게 기여하는가
- Savings Plans, Reserved, Spot 비용 모델 선택 기준
- ASG의 Launch Template, Scaling Policy, Lifecycle Hook 흐름

## 시험 체크포인트 (SAA-C03)

- EC2 주요 상태 6종 (Pending, Running, Stopping, Stopped, Shutting-down, Terminated)과 **과금 여부**
- **Stop/Start는 EBS root volume 기반 인스턴스만 가능**. Instance store root volume 기반 인스턴스에는 stop 작업 자체를 수행할 수 없으며, EBS 기반 인스턴스도 stop 시 부착된 instance store 데이터는 사라진다
- AMI는 **리전 종속** — Cross-Region 사용 시 복사 필수
- AMI 연결 스냅샷은 **AMI Deregister 후에만 삭제** 가능
- AWS 제공 공인 IPv4와 Elastic IP는 2024년 2월 1일부터 연결 여부와 무관하게 시간당 과금. Free Tier 무료 시간과 BYOIP는 별도 조건 확인
- ENA 대역폭은 인스턴스 타입과 ENI 배치에 따라 다르며 일부 최신 타입은 여러 네트워크 카드로 합산 **600 Gbps**까지 지원
- Key Pair **개인키 분실 시 복구 불가** — EBS 분리 후 우회 또는 새 인스턴스
- OS별 기본 SSH Username 차이 (Amazon Linux `ec2-user`, Ubuntu `ubuntu`)
- **On-Demand Capacity Reservations** — 약정 없이 용량 예약, Savings Plans와 결합 가능
- Placement Group: **Cluster**(저지연), **Spread**(소수, 하드웨어 분산, AZ당 7개), **Partition**(파티션당 자체 랙, 전원, 최대 7개)
- Spot 가격은 사용자가 입찰해 결정하는 방식이 아니라 EC2가 장기 수급 추세에 따라 정한다. 용량 부족 등으로 중단될 수 있고, AWS가 중단할 때는 가능한 경우 약 2분 전 알림을 제공하므로 fault-tolerant 워크로드에 사용
- Reserved Instances와 Savings Plans의 유연성은 상품별로 다르다. Compute Savings Plans는 리전, 패밀리, 크기 전환 폭이 넓고, EC2 Instance Savings Plans는 리전과 패밀리에 묶인다. 특정 AZ 용량 보장이 필요하면 zonal Reserved Instance나 On-Demand Capacity Reservation을 별도로 검토

## 출처

- [AWS charges for all public IPv4 addresses — Amazon VPC 공식 문서](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html)
- [New AWS Public IPv4 Address Charge — AWS News Blog](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/)
- [Stop and start Amazon EC2 instances — AWS 공식 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html)
- [Amazon EC2 instance state changes — AWS 공식 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html)
- [General purpose instance network specifications — AWS 공식 문서](https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html)
- [View Spot Instance pricing history — AWS 공식 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances-history.html)
- [Spot Instance interruption notices — AWS 공식 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [Savings Plans types — AWS 공식 문서](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)

## 관련 문서
- [[EC2|AWS EC2 (목차)]]
- [[EC2-Compute|컴퓨트 아키텍처]]
- [[EC2-Network-Access|네트워크와 접근]]
- [[EC2-Operations|운영과 수명주기]]
- [[EC2-Cost|비용 모델]]
