---
tags: [infrastructure, aws, network, transit-gateway, vpc, vpn, hub-and-spoke]
status: done
category: "Infrastructure - AWS"
aliases: ["Transit Gateway", "AWS Transit Gateway", "TGW", "TGW 허브"]
verified_at: 2026-09-03
---

# AWS Transit Gateway (TGW)

여러 VPC와 온프레미스 네트워크를 단일 게이트웨이에서 라우팅하는 **네트워크 중앙 허브**다. VPC Peering의 풀메시 관리 부담을 허브-스포크 모델로 줄인다. 2026-09-03 기준 TGW 하나의 기본 attachment quota는 5,000개이며 조정 가능하다.

## 핵심

- **리전 단위 리소스** — 단일 리전의 VPC, VPN, Direct Connect Gateway를 하나의 라우터로 통합
- **전이적 라우팅(transitive routing)** — TGW와 VPC 양쪽 라우팅 테이블을 구성하면 A↔TGW↔B 통신 가능. VPC Peering은 전이 불가
- **계정 간 공유**: **AWS RAM**(Resource Access Manager)으로 다른 계정에 TGW 공유 가능
- 같은 TGW에 연결된 모든 어태치먼트가 **라우팅 테이블 단위로 격리/공유** 가능

## 연결 가능한 리소스 (Attachment)

| 종류 | 용도 |
|------|------|
| **VPC** | 리전 내 VPC 연결 (사용할 AZ마다 attachment subnet 지정) |
| **VPN** | Site-to-Site VPN 연결 (IPsec) |
| **Direct Connect Gateway** | DX(Direct Connect) → TGW 연결로 온프레미스 통합 |
| **Transit Gateway Peering** | 다른 리전의 TGW와 피어링, 양쪽 TGW route table에 정적 경로 구성 |
| **Transit Gateway Connect** | SD-WAN 어플라이언스 통합 (GRE + BGP) — 서드파티 가상 어플라이언스 연결 |

## Transit Gateway Route Table

- TGW는 자체 라우팅 테이블을 보유
- 어태치먼트별로 **다른 라우팅 테이블** 연결 가능 → **세그멘테이션**(개발/스테이징/프로덕션 격리)
- **블랙홀 라우트**: 특정 CIDR을 명시적으로 드롭

```
[Prod VPC] ─┐
[Stage VPC]─┼─→ TGW ─┬─→ Prod RT (Prod끼리만)
[Dev VPC]  ─┘        ├─→ Shared Services RT (모든 환경 접근 가능)
                     └─→ On-Prem RT (VPN/DX)
```

## ECMP (Equal-Cost Multi-Path) — 시험 단골

**Site-to-Site VPN 처리량 확장**의 핵심.

- 표준 VPN 터널은 터널당 최대 **1.25 Gbps, 140,000 PPS**다. 패킷 크기, 트래픽 유형과 중간 네트워크 상태에 따라 실제 처리량은 달라진다
- Large Bandwidth Tunnel은 TGW 또는 Cloud WAN에 연결한 VPN에서 터널당 최대 **5 Gbps, 400,000 PPS**를 지원한다
- TGW VPN attachment에서 dynamic routing을 구성하고 ECMP를 켜면 여러 VPN 터널을 집계할 수 있다. static routing VPN에는 ECMP가 지원되지 않는다
- 표준 터널을 여러 개 집계한 대역폭은 이론적 상한일 뿐, 워크로드 측정으로 확인한다

## Direct Connect 주 경로와 VPN 백업

2026-10-09 AWS 라우팅 문서 기준, TGW는 먼저 목적지에 가장 구체적으로 일치하는 경로를 고른다. **같은 CIDR**의 전파 경로끼리 비교하면 Direct Connect gateway 경로가 Site-to-Site VPN 경로보다 우선한다. 이 조건에서 두 경로를 BGP로 전파하면 Direct Connect 주 경로와 VPN 백업을 구성할 수 있다.

- 같은 CIDR의 정적 VPN 경로는 전파된 Direct Connect 경로보다 우선한다. 정적 경로를 무심코 추가하면 주 경로가 바뀔 수 있다.
- VPN에서 더 구체적인 prefix를 광고해도 최장 prefix 기준이 먼저 적용되므로 의도와 달리 VPN으로 흐를 수 있다.
- 정상 상태의 TGW 테이블에는 선호 경로만 표시될 수 있다. Direct Connect 경로 광고가 사라졌을 때 VPN 백업이 나타나는지 확인한다.

attachment의 **association**은 들어온 패킷이 조회할 테이블을, **propagation**은 경로를 설치할 테이블을 정한다. 하나의 attachment는 한 테이블에 연결하고 여러 테이블에 경로를 전파할 수 있다. VPC subnet의 온프레미스 목적지 경로도 TGW를 향해야 한다.

운영 검증 제안: 온프레미스의 AWS 방향 경로 선택, DX gateway allowed prefixes와 양쪽 통신을 함께 확인한다. 장애 감지와 경로 전환 뒤 실제 통신 복구를 시험하며, TGW 테이블 설정만으로 종단 간 failover 성공을 선언하지 않는다.

## 계정 간 공유 — AWS RAM

- 단일 TGW를 여러 AWS 계정이 공유 어태치먼트로 사용 가능
- 멀티 계정 환경(Organizations)에서 **중앙 네트워크 계정**에 TGW를 두고 다른 계정 VPC가 어태치
- 라우팅 테이블, 연결 정책은 TGW 소유 계정에서 통제

## vs VPC Peering — 시험 핵심 비교

| 측면 | VPC Peering | Transit Gateway |
|------|-------------|-----------------|
| **연결 모델** | 1:1 풀메시 (N개 VPC → N(N-1)/2 연결) | 허브-스포크 (N개 VPC → N 어태치먼트) |
| **전이적 라우팅** | X (A↔B, B↔C여도 A↔C 불가) | O |
| **확장성** | VPC당 기본 50개, 요청 시 최대 125개 active peering | TGW당 기본 5,000 attachments, 조정 가능 |
| **온프레미스 통합** | X (별도 VGW/DX 필요) | O (VPN, DX 일원화) |
| **비용** | 리전과 전송 경로별 AWS 가격표 확인 | attachment와 data processing의 리전별 AWS 가격표 확인 |
| **암호화** | 경로와 상위 프로토콜의 암호화 요구를 별도 설계 | VPN은 IPsec, VPC 간 TGW 경로는 Encryption Support와 VPC Encryption Control 구성 여부 확인 |

> 시험에서 **수십~수백 개 VPC 연결**, **중앙 집중 라우팅**, **전이적**, **멀티 계정 네트워크 통합** 키워드가 보이면 TGW를 검토한다.

## Multicast 지원

- TGW multicast domain은 연결한 VPC attachment 사이의 IP 멀티캐스트를 지원한다
- Direct Connect, Site-to-Site VPN, peering, Connect attachment를 통한 multicast는 지원하지 않는다

## 시험 체크포인트

- **표준 VPN 터널 1.25 Gbps 초과** 필요 → dynamic routing의 **TGW + ECMP** 또는 TGW/Cloud WAN의 최대 5 Gbps Large Bandwidth Tunnel 검토
- **여러 VPC를 하나의 라우팅 도메인으로** → Peering 아닌 **TGW**
- **계정 간 네트워크 공유** → TGW + **AWS RAM**
- **글로벌 네트워크** (다른 리전 TGW 연결) → **TGW Peering**
- **SD-WAN 어플라이언스 통합** → **Transit Gateway Connect**(GRE/BGP)
- **VPC 멀티캐스트 필요** → TGW(VPC 자체로는 불가)
- **세그멘테이션** (Prod/Dev 격리하되 공유 서비스는 모두 접근) → TGW Route Table 분리

## 관련 문서

- [[VPC]], [[Global-Accelerator]], [[Route53]], AWS Direct Connect (DX)

## 출처

- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
- [AWS, Transit Gateway quotas](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html)
- [AWS, How Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS 공식 문서, AWS Site-to-Site VPN quotas](https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html)
- [AWS, Tunnel options for Site-to-Site VPN](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPNTunnels.html)
- [AWS, VPC peering connection quotas](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-connection-quotas.html)
- [AWS, Transit Gateway encryption support](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-encryption-support.html)
- [AWS, Multicast in Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-multicast-overview.html)
