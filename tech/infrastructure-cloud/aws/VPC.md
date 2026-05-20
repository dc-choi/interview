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
| **VPC** | IP 대역(CIDR)을 가진 격리된 네트워크. 리전당 생성. 허용 블록 크기 **`/16`(65,536 IP) ~ `/28`(16 IP)** |
| **Subnet** | VPC 내부의 IP 대역을 쪼갠 단위. **AZ(가용영역)에 종속**. 하나의 RT·하나의 NACL만 가짐 |
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

## NAT Gateway vs NAT Instance

NAT Instance는 **추천하지 않음** — Public Subnet에 두는 특수 EC2(`ami-vpc-nat`)로 NAT GW가 나오기 전 방식.

| 항목 | NAT Gateway | NAT Instance |
|---|---|---|
| 관리 | AWS 관리형, 유지보수 불필요 | 사용자가 직접 관리 |
| 가용성 | AZ 내 이중화 자동 | 단일 EC2 — 스크립트로 Failover 필요 |
| 대역폭 | 최대 **45 Gbps** 확장 | 인스턴스 유형에 종속 |
| 보안그룹 | **적용 불가** (NACL만 가능) | 적용 가능 |
| Source/Dest Check | N/A | **비활성화 필수** |

> NAT Instance를 만든다면 `SrcDestCheck` 비활성화·Public Subnet 배치·Private Subnet RT에 `0.0.0.0/0 → NAT Instance` 설정이 필수.

## SG vs NACL

| 구분 | Security Group | Network ACL |
|---|---|---|
| 계층 | 인스턴스(ENI) | 서브넷 |
| 상태 | **Stateful** — 응답 자동 허용 | **Stateless** — 인/아웃 모두 규칙 필요 |
| 룰 | allow만 (deny 없음) | allow + **deny 가능** |
| 기본값 | 인바운드 거부 / 아웃바운드 허용 | 인·아웃 모두 허용 |
| 평가 순서 | 규칙 리스트 전체 매칭 | **우선순위(번호) 순** — 작은 값이 먼저 |
| 인스턴스 부착 | 인스턴스당 **최대 5개** SG | 서브넷당 1개 NACL |
| 체크 시점 | 트래픽이 ENI에 도달할 때 | 서브넷 경계 진입/이탈 |
| 적용 | 변경 즉시 반영 | 변경 즉시 반영 |

**실전**: SG가 기본 도구, NACL은 서브넷 전체에 강한 차단이 필요할 때(규제·IP 블랙리스트) 사용. NACL은 **deny 규칙이 가능**하다는 점이 시험에서 자주 묻는 포인트.

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

## 온프레미스 연결 — VPN vs Direct Connect

| 옵션 | 특징 | 용도 |
|---|---|---|
| **Site-to-Site VPN** | AWS IPSec VPN. Customer Gateway(고객 측 공인 IP) + Virtual Private Gateway 또는 TGW로 터널 생성 | 빠른 구축·임시·DR 백업 경로 |
| **Direct Connect (DX)** | 표준 이더넷 광섬유 전용선. `AWS Region ↔ DX Location ↔ Customer` 경로 | 안정적 대역폭·낮은 지연·규제 환경 |
| **Virtual Private Gateway (VGW)** | VPN/DX의 AWS 측 종단. **단일 VPC 전용** | 단일 VPC만 연결 필요할 때 |
| **Transit Gateway** | 다수 VPC + VPN + DX 통합 허브 | 여러 VPC를 한꺼번에 온프렘과 연결 |

> 시험 포인트: **VGW는 1 VPC, TGW는 N VPC**. DX는 VPN 대비 더 안전·빠르지만 회선 구축에 수 주 ~ 수 개월 소요.

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
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[RDS-Security-Group|RDS Security Group 구성]]
- [[CDN|CDN (CloudFront)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (VPC Endpoint·NAT 절감)]]
- [[Load-Balancer|Load Balancer]]
- [[ELB|AWS ELB]]
