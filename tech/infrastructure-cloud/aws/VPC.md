---
tags: [aws, vpc, network, subnet, peering, transit-gateway, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["VPC", "AWS VPC", "가상 사설 클라우드", "Subnet 설계"]
---

# VPC · Subnet · VPC 간 연결

AWS VPC(Virtual Private Cloud)는 **격리된 가상 네트워크**. IP 대역·서브넷·라우팅·보안을 직접 통제해 온프레미스 네트워크처럼 구성한다. 네트워크 설계는 **초기 결정이 가장 비싸게 되돌려지는 영역**이라 처음 설계할 때 미래 성장·멀티 계정·규제까지 함께 고려해야 한다.

## 기본 구성 요소

| 요소 | 역할 |
|---|---|
| **VPC** | IP 대역(CIDR)을 가진 격리된 네트워크. 리전당 생성 |
| **Subnet** | VPC 내부의 IP 대역을 쪼갠 단위. **AZ(가용영역)에 종속** |
| **Route Table** | Subnet별 트래픽 경로 결정 — **Subnet의 성격이 여기서 정해짐** |
| **Internet Gateway (IGW)** | VPC와 인터넷 간 트래픽 통로 |
| **NAT Gateway** | Private Subnet의 **아웃바운드 전용** 인터넷 접근 |
| **Security Group (SG)** | 인스턴스 레벨 방화벽, stateful |
| **Network ACL (NACL)** | Subnet 레벨 방화벽, stateless |

## 서브넷 유형 — 라우팅이 성격을 결정

특별한 속성이 있는 게 아니라 **Route Table 설정에 따라 성격이 나뉜다.**

| 유형 | Route Table 요약 | 용도 |
|---|---|---|
| **Public Subnet** | `0.0.0.0/0 → IGW` | 외부에서 직접 접근 필요 — ALB·NLB·Bastion |
| **Private Subnet** | `0.0.0.0/0 → NAT GW` | 내부 서비스 — 앱 서버·ECS Task |
| **Isolated/DB Subnet** | 인터넷 경로 없음, VPC Endpoint만 | DB·중요 데이터 — RDS·ElastiCache |

### 3-Tier 권장 구조

```
VPC (10.0.0.0/16)
├── AZ-a
│   ├── Public  /24 (ALB·Bastion)
│   ├── Private /24 (App Server·ECS)
│   └── DB      /24 (RDS·Cache)
└── AZ-b (같은 구성 복제)
```

Multi-AZ로 복제해야 AZ 장애 시에도 서비스가 유지된다.

## CIDR 설계 — 초기 결정이 중요

IP 대역 설계는 **되돌리기 어려움**. 처음에 충분히 크게 잡고 체계적으로 나눈다.

### 설계 원칙
- **프라이빗 대역 사용**: `10.x.x.x` / `172.16~31.x.x` / `192.168.x.x`
- **비중첩(Non-overlapping)**: 온프렘·다른 VPC·사무실 네트워크와 겹치지 않게. 겹치면 나중에 Peering·VPN 불가
- **여유 있는 할당**: 서비스별 `/20`(4,096 IP) 이상 권장. AWS 관리형 서비스(RDS·EKS·ALB)가 IP를 많이 소비
- **일관된 규칙**: 리전·환경·서비스별 대역을 패턴화 — 운영 시 혼동 방지

### 예시: 대역 구획

```
10.0.0.0/16   서울 리전 prod
10.1.0.0/16   서울 리전 stage
10.2.0.0/16   서울 리전 dev
10.10.0.0/16  도쿄 리전 prod (DR)
10.100.0.0/16 온프레미스
```

## SG vs NACL

| 구분 | Security Group | Network ACL |
|---|---|---|
| 계층 | 인스턴스(ENI) | 서브넷 |
| 상태 | **Stateful** — 응답 자동 허용 | **Stateless** — 인/아웃 모두 규칙 필요 |
| 룰 | allow만 (deny 없음) | allow + deny |
| 기본값 | 모두 거부(인바운드) | 모두 허용 |
| 체크 방향 | 트래픽이 ENI에 도달할 때 | 서브넷 경계에서 |

**실전**: SG가 기본 도구, NACL은 서브넷 전체에 강한 차단이 필요할 때(규제·IP 블랙리스트) 사용.

## 여러 VPC 연결 — Peering vs Transit Gateway

서비스가 커지면 VPC 하나로 안 됨. 계정 분리·환경 분리·조직 성장·M&A로 다수 VPC가 생기고 상호 통신이 필요.

### VPC Peering

두 VPC 간 **1:1 프라이빗 연결**. 요청·승인으로 Peering 생성 → 각 Route Table에 상대 CIDR 등록.

- **장점**: 빠르고 간단, 추가 비용 최소
- **한계**: **Transitive 불가** — A↔B, B↔C가 있어도 A↔C는 안 됨. N개 VPC 완전 연결 시 **N×(N-1)/2** 연결 필요 (10개 VPC = 45개 Peering)

### Transit Gateway (TGW)

Hub & Spoke 구조. 모든 VPC가 **TGW 한 허브**에 연결되고, TGW가 중앙 라우팅.

| 항목 | 내용 |
|---|---|
| 연결 수 | 각 VPC가 TGW에 1번 연결 → N개 |
| 라우팅 | TGW 내부 Route Table이 대상 결정 |
| 확장성 | 신규 VPC 추가가 쉬움 |
| 한계 | 연결당 50 Gbps |
| 비용 | 연결당 시간 요금 + 데이터 처리 요금 |

### 선택 기준

| 상황 | 권장 |
|---|---|
| VPC 2~3개, 관계 정적 | **Peering** |
| VPC 5개 이상·성장 예상 | **TGW** |
| 온프레미스·멀티 리전·VPN 통합 | **TGW** (DX Gateway·Site-to-Site VPN과 결합) |

## VPC Endpoint — NAT 비용 절감

NAT Gateway 없이 AWS 서비스(S3·DynamoDB·KMS 등)에 **VPC 내부에서 직접 접근**.

| 유형 | 대상 | 비용 |
|---|---|---|
| **Gateway Endpoint** | S3, DynamoDB | **무료** |
| **Interface Endpoint** (PrivateLink) | 그 외 대부분 AWS 서비스 | 시간당 + GB당 (NAT보다 쌈) |

Private Subnet에서 S3를 자주 쓰면 Gateway Endpoint 설정만으로도 NAT 비용을 크게 줄일 수 있다.

## 보안·규제 관점

- **ISMS-P·전자금융법**: 망분리·접근통제·로그 보관이 의무. 초기부터 이를 반영한 설계 필요
- **Flow Logs**: VPC·Subnet·ENI 단위 트래픽 기록. CloudWatch Logs·S3로 저장 → 보안 감사·장애 원인 분석
- **Bastion vs SSM Session Manager**: 최근은 SSM으로 SSH 포트 없이 접근 권장
- **프라이빗 연결 우선**: 내부 서비스 간 통신은 Private IP로 — Public DNS 경유 시 NAT 거쳐 비용↑

## 흔한 실수

- **CIDR 중복** — 다른 VPC·온프렘과 IP 대역 겹침. 나중에 Peering·VPN 불가
- **/24 너무 작게 할당** — 서비스 성장·관리형 서비스 IP 소비로 금방 고갈
- **Public Subnet에 DB 배치** — 외부 노출 위험
- **SG를 0.0.0.0/0 허용** — 검토 없이 임시 오픈 후 방치
- **Single AZ 운영** — AZ 장애 시 전체 서비스 다운
- **NAT Gateway 비용 무시** — 데이터 처리 GB당 $0.045, 대량 트래픽에서 큰 비중

## 면접 체크포인트

- **Subnet의 성격을 결정하는 것**은 Route Table이라는 점
- **SG vs NACL** 차이(Stateful/Stateless, 인스턴스/서브넷, allow/deny)
- **Peering vs Transit Gateway** 선택 기준 (N 증가에 따른 연결 수 폭증)
- **CIDR 설계 원칙**과 비중첩·여유 할당의 이유
- **VPC Endpoint**로 NAT 비용 줄이는 방법
- 3-Tier 서브넷 구조와 Multi-AZ 복제

## 출처
- [AWS VPC 기본 개념 — brunch @growthminder](https://brunch.co.kr/@growthminder/93)
- [VPC Peering vs Transit Gateway — brunch @growthminder](https://brunch.co.kr/@growthminder/94)
- [안정적인 클라우드 네트워크 설계하기 — SK DEVOCEAN](https://devocean.sk.com/blog/techBoardDetail.do?ID=166297&boardType=techBlog)

## 관련 문서
- [[RDS-Security-Group|RDS Security Group 구성]]
- [[CDN|CDN (CloudFront)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (VPC Endpoint·NAT 절감)]]
- [[Load-Balancer|Load Balancer]]
