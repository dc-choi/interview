---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 흔한 실수", "EC2 면접, 시험 체크포인트"]
---

# AWS EC2 — 흔한 실수와 체크포인트

## 흔한 실수

- **인스턴스 스토어에 영속 데이터** — Stop/Terminate 시 손실
- **IMDSv1 노출** — SSRF로 IAM 자격증명 탈취. v2 강제
- **t3 Unlimited 무방비 운영** — 크레딧 소진 누적으로 비용 폭증
- **Placement Group 무관심** — 같은 AZ 단일 하드웨어 장애로 전 노드 동시 다운
- **gp2 그대로 운영** — gp3가 동성능에 ~20% 저렴. 마이그레이션
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

- EC2 상태 5종 (Pending, Running, Stopping, Shutting-down, Terminated)과 **과금 여부**
- **Stop은 EBS 기반만 가능**, Instance Store 기반은 Stop = Terminate
- AMI는 **리전 종속** — Cross-Region 사용 시 복사 필수
- AMI 연결 스냅샷은 **AMI Deregister 후에만 삭제** 가능
- 공인 IPv4와 Elastic IP는 2024년 2월 1일부터 사용 상태와 무관하게 시간당 과금. Free Tier 무료 시간은 계정 조건을 별도 확인
- ENA로 **최대 100 Gbps** 대역폭, Nitro 기반에서 표준
- Key Pair **개인키 분실 시 복구 불가** — EBS 분리 후 우회 또는 새 인스턴스
- OS별 기본 SSH Username 차이 (Amazon Linux `ec2-user`, Ubuntu `ubuntu`)
- **On-Demand Capacity Reservations** — 약정 없이 용량 예약, Savings Plans와 결합 가능
- Placement Group: **Cluster**(저지연), **Spread**(소수, 하드웨어 분산, AZ당 7개), **Partition**(파티션당 자체 랙, 전원, 최대 7개)
- Spot 인스턴스는 가격 입찰 + 2분 통보 회수 → fault-tolerant 워크로드 한정
- Reserved vs Savings Plans: **Savings Plans가 리전, 인스턴스 세대, 사이즈 유연성** 우위

## 관련 문서
- [[EC2|AWS EC2 (목차)]]
- [[EC2-Compute|컴퓨트 아키텍처]]
- [[EC2-Network-Access|네트워크와 접근]]
- [[EC2-Operations|운영과 수명주기]]
- [[EC2-Cost|비용 모델]]
