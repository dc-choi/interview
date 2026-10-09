---
tags: [aws, vpc, network, subnet, peering, transit-gateway, infrastructure]
status: done
verified_at: 2026-10-10
category: "Infrastructure - AWS"
aliases: ["VPC 기본 구성 요소", "Subnet 유형과 CIDR 설계"]
---

# VPC 기본 구성 요소와 Subnet, CIDR 설계

## 기본 구성 요소

| 요소 | 역할 |
|---|---|
| **VPC** | 리전 범위의 격리된 네트워크. IPv4 CIDR 블록 크기는 **`/16`(65,536 IP) ~ `/28`(16 IP)** |
| **Subnet** | VPC 내부의 IP 대역을 쪼갠 단위. **AZ(가용영역)에 종속**. 하나의 RT, 하나의 NACL만 가짐 |
| **ENI** | Elastic Network Interface — 가상 NIC. VPC 리소스는 기본적으로 사설 IP 1개를 가진 ENI를 받음 |
| **Route Table** | Subnet별 트래픽 경로 결정 — **Subnet의 성격이 여기서 정해짐** |
| **Internet Gateway (IGW)** | VPC와 인터넷 간 트래픽 통로 |
| **Egress-only IGW** | IPv6 인터넷 아웃바운드와 그 응답을 허용하고, 인터넷에서 시작하는 연결을 차단 |
| **NAT Gateway** | IPv4 주소 변환과 IPv6에서 IPv4로 가는 NAT64. 인터넷 접근에는 public NAT gateway와 IGW 경로 사용 |
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

## IPv6 직접 통신과 IPv4 변환 경로를 나눈다

2026-10-10 공식 문서로 아래 IPv6 경로와 기본 구성 표의 VPC CIDR, gateway 설명을 대조했다. 기존 용량 설계 예시 전체를 재검증한 것은 아니다.

| 목적 | 경로와 조건 |
|---|---|
| IPv6 인터넷 아웃바운드 | 워크로드 서브넷의 `::/0`을 egress-only IGW로 보낸다. 외부에서 먼저 시작하는 연결은 허용하지 않지만 요청의 응답은 돌아온다 |
| IPv6에서 IPv4 전용 서비스 호출 | DNS64가 IPv4 주소를 `64:ff9b::/96` 접두사의 IPv6 주소로 합성하고 NAT gateway의 NAT64가 변환한다 |

DNS64는 워크로드 서브넷에서 켠다. 대상에 IPv6 레코드가 있으면 원래 주소를 사용한다. 합성 주소를 쓰는 패킷에는 `64:ff9b::/96`에서 NAT gateway로 가는 경로가 필요하므로 DNS 설정만으로 연결이 완성되지 않는다. 인터넷의 IPv4 대상이라면 NAT gateway가 있는 public subnet에서 IGW로 나가는 경로도 확인한다.

NAT64는 NAT gateway에 별도로 활성화하는 옵션이 아니다. egress-only IGW는 IPv4 목적지 변환을 대신하지 않는다. IPv6 주소를 할당했다는 이유만으로 IPv4 의존 서비스의 연결 경로를 제거하지 않는다.

전환 점검에서는 IPv6 상대와 IPv4 전용 상대를 나누어 DNS 응답, 라우팅, SG/NACL과 애플리케이션의 주소 처리 결과를 확인한다. 이는 설계 점검 제안이며 실제 환경의 통신 성공을 보고하는 내용은 아니다.

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

## 출처

- [Amazon VPC, VPC CIDR blocks](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html)
- [Amazon VPC, Enable outbound IPv6 traffic using an egress-only internet gateway](https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html)
- [Amazon VPC, DNS64 and NAT64](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-nat64-dns64.html)

## 관련 문서

- [[VPC-Connectivity|VPC 연결과 endpoint]]
- [[VPC-NAT-Security|NAT와 네트워크 접근 제어]]
