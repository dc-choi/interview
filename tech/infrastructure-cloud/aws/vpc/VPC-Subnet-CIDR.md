---
tags: [aws, vpc, network, subnet, peering, transit-gateway, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["VPC 기본 구성 요소", "Subnet 유형과 CIDR 설계"]
---

# VPC 기본 구성 요소와 Subnet, CIDR 설계

## 기본 구성 요소

| 요소 | 역할 |
|---|---|
| **VPC** | IP 대역(CIDR)을 가진 격리된 네트워크. 리전당 생성. 허용 블록 크기 **`/16`(65,536 IP) ~ `/28`(16 IP)** |
| **Subnet** | VPC 내부의 IP 대역을 쪼갠 단위. **AZ(가용영역)에 종속**. 하나의 RT, 하나의 NACL만 가짐 |
| **ENI** | Elastic Network Interface — 가상 NIC. VPC 리소스는 기본적으로 사설 IP 1개를 가진 ENI를 받음 |
| **Route Table** | Subnet별 트래픽 경로 결정 — **Subnet의 성격이 여기서 정해짐** |
| **Internet Gateway (IGW)** | VPC와 인터넷 간 트래픽 통로 |
| **Egress-only IGW** | **IPv6 전용 아웃바운드** 통로. NAT GW의 IPv6 버전 |
| **NAT Gateway** | Private Subnet의 **아웃바운드 전용** 인터넷 접근 (IPv4) |
| **Security Group (SG)** | 인스턴스 레벨 방화벽, stateful |
| **Network ACL (NACL)** | Subnet 레벨 방화벽, stateless |

### 서브넷 예약 IP — 사용 가능 IP 5개 차감

`/24` 서브넷(예 `172.16.1.0/24`)이 가진 256개 IP 중 **앞 4개 + 마지막 1개**는 사용 불가.

| IP | 용도 |
|---|---|
| `.0` | 네트워크 주소(Network ID) |
| `.1` | VPC Router 게이트웨이 |
| `.2` | AWS DNS 서버 |
| `.3` | 향후 사용 예약 |
| `.255` | 브로드캐스트 (VPC는 브로드캐스트 미지원이지만 예약은 됨) |

작은 서브넷(`/28`은 16개 - 5개 = **11개만 가용**)을 만들면 IP가 금방 동난다.

## 서브넷 유형 — 라우팅이 성격을 결정

특별한 속성이 있는 게 아니라 **Route Table 설정에 따라 성격이 나뉜다.**

| 유형 | Route Table 요약 | 용도 |
|---|---|---|
| **Public Subnet** | `0.0.0.0/0 → IGW` | 외부에서 직접 접근 필요 — ALB, NLB, Bastion |
| **Private Subnet** | `0.0.0.0/0 → NAT GW` | 내부 서비스 — 앱 서버, ECS Task |
| **Isolated/DB Subnet** | 인터넷 경로 없음, VPC Endpoint만 | DB, 중요 데이터 — RDS, ElastiCache |

### 3-Tier 권장 구조

```
VPC (10.0.0.0/16)
├── AZ-a
│   ├── Public  /24 (ALB, Bastion)
│   ├── Private /24 (App Server, ECS)
│   └── DB      /24 (RDS, Cache)
└── AZ-b (같은 구성 복제)
```

Multi-AZ로 복제해야 AZ 장애 시에도 서비스가 유지된다.

## CIDR 설계 — 초기 결정이 중요

IP 대역 설계는 **되돌리기 어려움**. 처음에 충분히 크게 잡고 체계적으로 나눈다.

### 설계 원칙
- **프라이빗 대역 사용**: `10.x.x.x` / `172.16~31.x.x` / `192.168.x.x`
- **비중첩(Non-overlapping)**: 온프렘, 다른 VPC, 사무실 네트워크와 겹치지 않게. 겹치면 나중에 Peering, VPN 불가
- **여유 있는 할당**: 서비스별 `/20`(4,096 IP) 이상 권장. AWS 관리형 서비스(RDS, EKS, ALB)가 IP를 많이 소비
- **일관된 규칙**: 리전, 환경, 서비스별 대역을 패턴화 — 운영 시 혼동 방지

### 예시: 대역 구획

```
10.0.0.0/16   서울 리전 prod
10.1.0.0/16   서울 리전 stage
10.2.0.0/16   서울 리전 dev
10.10.0.0/16  도쿄 리전 prod (DR)
10.100.0.0/16 온프레미스
```
