---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 흔한 실수", "EC2 면접, 시험 체크포인트"]
verified_at: 2026-11-17
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
- **Launch more like this를 복제로 오해** — 실행 중인 원본의 일부 설정(AMI ID, 인스턴스 타입, AZ 또는 VPC와 서브넷, 보안 그룹, IAM 역할, User Data, 태그 등)만 시작 마법사에 채운다. 네트워크 인터페이스 수(기본 1개)와 스토리지(AMI와 인스턴스 타입의 기본 구성)는 복사하지 않고, 공식 문서의 복사 목록에 키 페어는 없다. 마법사에서 값을 바꿀 수 있으므로 시작 전에 서브넷, 보안 그룹, 키 페어를 다시 확인한다. 같은 구성을 반복하려면 AMI를 만들고 Launch Template로 시작 정보를 고정
- **서브넷을 나중에 옮길 수 있다고 가정** — 기본 네트워크 인터페이스는 분리할 수 없고, IPv4 전용이나 듀얼 스택 서브넷에서 시작한 인스턴스의 기본 사설 IPv4는 그 서브넷 범위에서 받는다. 다른 서브넷, AZ나 VPC로 옮기는 AWS 안내 경로는 AMI를 만들어 대상 서브넷에 새 인스턴스를 시작하는 것이고(`AWSSupport-CopyEC2Instance` 런북이 이를 자동화하며 루트 볼륨이 EBS인 경우만 진행하고 원본은 남긴다), instance store 볼륨은 AMI의 스냅샷에 담기지 않는다. 새 인스턴스의 사설 IPv4가 바뀌므로 DNS 같은 참조를 고치고 Elastic IP는 새 인스턴스에 다시 연결한다([[EC2-Network-Access|네트워크와 접근]]). 같은 AZ라면 다른 서브넷의 보조 네트워크 인터페이스를 붙이는 방법도 있지만 인스턴스를 옮기는 것은 아니다

## 면접 체크포인트

- Nitro System이 Xen에서 바뀐 이유 (성능 오버헤드, 베어메탈)
- Instance Store vs EBS 트레이드오프
- T 시리즈 CPU 크레딧 시스템 — Unlimited 모드의 비용 함정
- Placement Group 4종(Cluster, Spread, Partition, Precision time) 차이. Precision time은 고정밀 시간 소스에 직접 접근할 수 있는 하드웨어에 배치해 로컬 NTP와 PTP Hardware Clock(PHC)을 제공한다
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

- [Amazon VPC 공식 문서, AWS charges for all public IPv4 addresses](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html)
- [New AWS Public IPv4 Address Charge — AWS News Blog](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/)
- [AWS 공식 문서, Stop and start Amazon EC2 instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html)
- [AWS 공식 문서, Amazon EC2 instance state changes](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html)
- [AWS 공식 문서, General purpose instance network specifications](https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html)
- [AWS 공식 문서, View Spot Instance pricing history](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances-history.html)
- [AWS 공식 문서, Spot Instance interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [AWS 공식 문서, Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [AWS 공식 문서, Placement groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-strategies.html)
- [AWS 공식 문서, Launch an EC2 instance using details from an existing instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/launch-more-like-this.html)
- [AWS 공식 문서, Elastic network interfaces](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html)
- [AWS 공식 문서, Network interface attachments](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network-interface-attachments.html)
- [AWS 공식 문서, AWSSupport-CopyEC2Instance](https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-awssupport-copyec2instance.html)

## 관련 문서
- [[EC2|AWS EC2 (목차)]]
- [[EC2-Compute|컴퓨트 아키텍처]]
- [[EC2-Network-Access|네트워크와 접근]]
- [[EC2-Operations|운영과 수명주기]]
- [[EC2-Cost|비용 모델]]
