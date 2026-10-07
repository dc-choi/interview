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

## 특정 리소스 연결 — PrivateLink와 VPC Lattice

다음은 2026-10-07 공식 문서와 대조한 리소스 연결 범위다. 앞 절의 VPC 전체 라우팅과 구분한다.

**Resource VPC endpoint**는 다른 VPC의 데이터베이스나 IP/DNS 대상 리소스에 접근하는 방식이다. 공급자의 resource configuration이 공유할 대상을 나타내고 resource gateway와 연결된다. 소비자는 자기 VPC에 endpoint를 만들며, 계정 간 공유에는 AWS RAM을 사용할 수 있다. 이 경로는 별도의 로드 밸런서를 요구하지 않는다.

- resource endpoint는 TCP를 지원하며 UDP는 지원하지 않는다.
- 연결은 소비자 endpoint VPC에서 시작한다. 공급자 리소스 VPC가 이 경로로 소비자에게 새 연결을 시작하는 것은 지원하지 않는다. 요청에 대한 응답이 없다는 뜻은 아니다.
- endpoint와 resource gateway는 적어도 한 가용 영역이 겹쳐야 한다.

**VPC Lattice service network**는 연결한 서비스와 리소스를 함께 접근하도록 구성하는 논리적 네트워크다. 리소스를 서비스 네트워크에 연결하는 것과 소비자 VPC를 연결하는 것은 별도 단계다.

| 소비자 연결 | 확인할 경계 |
|---|---|
| VPC association | 연결한 VPC의 클라이언트가 서비스 네트워크에 접근 |
| Service network VPC endpoint | endpoint를 통한 접근. Peering, TGW, VPN이나 Direct Connect를 거쳐 오는 클라이언트에도 이 연결 방식이 필요 |

네트워크 경로를 만들었다고 접근 통제가 끝나는 것은 아니다. Lattice의 서비스 네트워크 auth policy는 그 안의 **resource configuration에는 적용되지 않는다**. 서비스의 IAM 인가와 리소스 접근을 같은 정책으로 보호한다고 가정하지 않는다.

보안 그룹의 방향도 구분한다. Resource gateway의 보안 그룹은 gateway에서 리소스로 나가는 트래픽을 제어한다. 클라이언트, endpoint나 VPC association, 대상 리소스의 보안 그룹과 애플리케이션 인증을 각각 확인한다. 적용 점검에서는 DNS 응답, TCP 연결, 애플리케이션 인증 성공과 금지된 클라이언트의 접근 거절을 나눠 확인한다.

## 온프레미스 연결 — VPN vs Direct Connect

| 옵션 | 특징 | 용도 |
|---|---|---|
| **Site-to-Site VPN** | AWS IPSec VPN. Customer Gateway(고객 측 공인 IP) + Virtual Private Gateway 또는 TGW로 터널 생성 | 빠른 구축, 임시, DR 백업 경로 |
| **Direct Connect (DX)** | 표준 이더넷 광섬유 전용선. `AWS Region ↔ DX Location ↔ Customer` 경로 | 안정적 대역폭, 낮은 지연, 규제 환경 |
| **Virtual Private Gateway (VGW)** | VPN/DX의 AWS 측 종단. **단일 VPC 전용** | 단일 VPC만 연결 필요할 때 |
| **Transit Gateway** | 다수 VPC + VPN + DX 통합 허브 | 여러 VPC를 한꺼번에 온프렘과 연결 |

> 시험 포인트: **VGW는 1 VPC, TGW는 N VPC**. DX는 대역폭과 지연이 안정적이지만 **기본 암호화는 없다** — 전송 구간 암호화가 필요하면 MACsec을 지원하는 연결을 쓰거나 DX 위에 Site-to-Site VPN을 얹는다. 회선 구축에는 수 주에서 수 개월이 걸린다.

## 출처

- [AWS PrivateLink resource access — resource endpoint 구성과 연결 제약](https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-resources.html)
- [AWS VPC Lattice operation — 서비스 네트워크와 소비자 연결 방식](https://docs.aws.amazon.com/vpc-lattice/latest/ug/how-it-works.html)
- [AWS VPC Lattice auth policies — resource configuration 적용 제외](https://docs.aws.amazon.com/vpc-lattice/latest/ug/auth-policies.html)
- [AWS VPC Lattice security groups — 클라이언트, 대상과 resource gateway의 방향](https://docs.aws.amazon.com/vpc-lattice/latest/ug/security-groups.html)
- [AWS Transit Gateway quotas — attachment당 AZ별 대역폭](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html)
- [AWS Transit Gateway pricing — attachment 시간 요금, 데이터 처리 요금](https://aws.amazon.com/transit-gateway/pricing/)
- [Amazon VPC pricing — Gateway Endpoint 무과금, NAT Gateway 요금](https://aws.amazon.com/vpc/pricing/)
- [AWS PrivateLink pricing — Interface Endpoint AZ별 시간 요금, 데이터 처리 요금](https://aws.amazon.com/privatelink/pricing/)
- [Encryption in AWS Direct Connect — 기본 미암호화, MACsec, DX 위 VPN](https://docs.aws.amazon.com/directconnect/latest/UserGuide/encryption-in-transit.html)
