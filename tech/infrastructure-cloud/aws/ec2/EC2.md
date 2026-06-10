---
tags: [infrastructure, aws, ec2, compute]
status: index
category: "Infrastructure - AWS"
aliases: ["AWS EC2", "Elastic Compute Cloud"]
---

# AWS EC2 (Elastic Compute Cloud)

AWS의 **가상 머신 컴퓨트 서비스**. 하이퍼바이저 위에서 인스턴스를 임대하는 모델이며, 모든 AWS 컴퓨트 서비스의 기반. ASG, ELB, ECS, EKS의 노드도 결국 EC2. 내용은 아래 다섯 문서로 분리.

- [[EC2-Compute|컴퓨트 아키텍처]] — Nitro System, Instance Store vs EBS, 인스턴스 패밀리, T 시리즈 크레딧, Placement Group
- [[EC2-Network-Access|네트워크와 접근]] — IMDS, Elastic IP, ENA, Key Pair
- [[EC2-Operations|운영과 수명주기]] — User Data, ASG 연계, 인스턴스 상태, AMI
- [[EC2-Cost|비용 모델]] — On-Demand, Reserved, Savings Plans, Spot, Capacity Reservations
- [[EC2-Checkpoints|흔한 실수와 체크포인트]] — 운영 실수, 면접, SAA-C03 시험 대비
- [[Auto-Scaling|EC2 Auto Scaling]] — ASG, Launch Template, Scaling Policy, Cooldown, Lifecycle Hook

## 관련 문서
- [[AWS-Fundamentals|AWS 기본 용어 (Region, AZ)]]
- [[EBS|EBS, Elastic Block Store]]
- [[AWS-Lambda|AWS Lambda, 서버리스 FaaS]]
- [[VPC|VPC, Subnet, CIDR]]
- [[ECS|ECS, 컨테이너 오케스트레이션]]
- [[IAM|IAM, 권한 관리]]
- [[S3|S3, Object Storage]]
- [[컨테이너(Container)|컨테이너 개관]]
- [[Load-Balancer|Load Balancer (ALB, NLB)]]
