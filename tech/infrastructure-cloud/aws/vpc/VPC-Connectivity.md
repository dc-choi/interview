---
tags: [aws, vpc, network, subnet, peering, transit-gateway, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["VPC Peering vs Transit Gateway", "VPC 온프레미스 연결"]
verified_at: 2026-08-05
---

# VPC 간 연결과 온프레미스 연결

## 여러 VPC 연결 — Peering vs Transit Gateway

서비스가 커지면 VPC 하나로 안 됨. 계정 분리, 환경 분리, 조직 성장, M&A로 다수 VPC가 생기고 상호 통신이 필요.

### VPC Peering

두 VPC 간 **1:1 프라이빗 연결**. 요청, 승인으로 Peering 생성 → 각 Route Table에 상대 CIDR 등록.

- **장점**: 빠르고 간단, 추가 비용 최소
- **한계**: **Transitive 불가** — A↔B, B↔C가 있어도 A↔C는 안 됨. N개 VPC 완전 연결 시 **N×(N-1)/2** 연결 필요 (10개 VPC = 45개 Peering)

### Transit Gateway (TGW)

Hub & Spoke 구조. 모든 VPC가 **TGW 한 허브**에 연결되고, TGW가 중앙 라우팅.

| 항목 | 내용 |
|---|---|
| 연결 수 | 각 VPC가 TGW에 1번 연결 → N개 |
| 라우팅 | TGW 내부 Route Table이 대상 결정 |
| 확장성 | 신규 VPC 추가가 쉬움 |
| 대역폭 | VPC attachment당 AZ별 각 방향 최대 100 Gbps (기본값, 상향은 AWS 담당자 문의) |
| 비용 | 연결당 시간 요금 + 데이터 처리 요금 |

### 선택 기준

| 상황 | 권장 |
|---|---|
| VPC 2~3개, 관계 정적 | **Peering** |
| VPC 5개 이상, 성장 예상 | **TGW** |
| 온프레미스, 멀티 리전, VPN 통합 | **TGW** (DX Gateway, Site-to-Site VPN과 결합) |

## VPC Endpoint — NAT 비용 절감

NAT Gateway 없이 AWS 서비스(S3, DynamoDB, KMS 등)에 **VPC 내부에서 직접 접근**.

| 유형 | 대상 | 비용 |
|---|---|---|
| **Gateway Endpoint** | S3, DynamoDB | **시간 요금과 데이터 처리 요금 없음** |
| **Interface Endpoint** (PrivateLink) | 그 외 대부분 AWS 서비스 | AZ별 시간 요금 + 데이터 처리 요금 — 엔드포인트 수와 트래픽량에 따라 NAT Gateway보다 비쌀 수 있어 비교 계산 필요 |

Private Subnet에서 S3를 자주 쓰면 Gateway Endpoint 설정만으로도 NAT 비용을 크게 줄일 수 있다. 요금 구조와 NAT 대비 비교는 [[Egress-Cost]] 참조.

## 온프레미스 연결 — VPN vs Direct Connect

| 옵션 | 특징 | 용도 |
|---|---|---|
| **Site-to-Site VPN** | AWS IPSec VPN. Customer Gateway(고객 측 공인 IP) + Virtual Private Gateway 또는 TGW로 터널 생성 | 빠른 구축, 임시, DR 백업 경로 |
| **Direct Connect (DX)** | 표준 이더넷 광섬유 전용선. `AWS Region ↔ DX Location ↔ Customer` 경로 | 안정적 대역폭, 낮은 지연, 규제 환경 |
| **Virtual Private Gateway (VGW)** | VPN/DX의 AWS 측 종단. **단일 VPC 전용** | 단일 VPC만 연결 필요할 때 |
| **Transit Gateway** | 다수 VPC + VPN + DX 통합 허브 | 여러 VPC를 한꺼번에 온프렘과 연결 |

> 시험 포인트: **VGW는 1 VPC, TGW는 N VPC**. DX는 대역폭과 지연이 안정적이지만 **기본 암호화는 없다** — 전송 구간 암호화가 필요하면 MACsec을 지원하는 연결을 쓰거나 DX 위에 Site-to-Site VPN을 얹는다. 회선 구축에는 수 주에서 수 개월이 걸린다.

## 출처

- [AWS Transit Gateway quotas — attachment당 AZ별 대역폭](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html)
- [AWS Transit Gateway pricing — attachment 시간 요금, 데이터 처리 요금](https://aws.amazon.com/transit-gateway/pricing/)
- [Amazon VPC pricing — Gateway Endpoint 무과금, NAT Gateway 요금](https://aws.amazon.com/vpc/pricing/)
- [AWS PrivateLink pricing — Interface Endpoint AZ별 시간 요금, 데이터 처리 요금](https://aws.amazon.com/privatelink/pricing/)
- [Encryption in AWS Direct Connect — 기본 미암호화, MACsec, DX 위 VPN](https://docs.aws.amazon.com/directconnect/latest/UserGuide/encryption-in-transit.html)
