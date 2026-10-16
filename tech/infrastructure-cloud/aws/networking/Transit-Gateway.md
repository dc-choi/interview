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

## 리전 간 피어링의 경로와 DNS 경계

2026-10-13 공식 peering attachment 문서 대조 기준이다. TGW는 같은 리전과 다른 리전의 TGW를 피어링할 수 있으며, 다른 계정과도 연결할 수 있다. 상대 TGW 소유자가 요청을 수락한 뒤 peering attachment를 향하는 정적 경로를 구성한다. 피어링 연결 생성만으로 상대 리전의 목적지 경로가 자동 완성되지는 않는다.

- 경로 검증 제안: 양쪽 TGW 테이블의 상대 CIDR 경로와 반환 경로, 각 VPC subnet의 TGW 방향 경로를 함께 검사한다. attachment 상태와 실제 종단 간 통신 성공을 구분한다.
- 다른 리전의 Route 53 Resolver를 이용해 피어링 양쪽 VPC의 public/private IPv4 DNS hostname을 private IPv4 주소로 해석하는 기능은 TGW peering에서 지원하지 않는다. IP 경로 연결과 DNS 해석을 별도 항목으로 검사한다.
- inter-Region peering은 리전 간 트래픽을 가상 네트워크 계층에서 AES-256으로 암호화한다. AWS의 물리 통제 밖 링크에는 물리 계층 암호화도 적용된다. 이 설명을 같은 리전의 모든 TGW 경로에 그대로 확대하지 않는다.

여러 리전으로 늘릴 때는 연결 개수뿐 아니라 정적 경로 변경과 DNS 운영 범위를 비교한다. 정책 기반 글로벌 연결로 전환하는 절차는 [[Cloud-WAN-Migration|Cloud WAN 마이그레이션]]을 참고한다. 실제 네트워크 구성이나 장애 시험을 수행한 기록은 아니다.

## 중앙 방화벽 경유와 흐름의 대칭성을 구분한다

부분 검증(2026-10-14): TGW VPC attachment의 appliance mode 공식 문서를 대조했다. 상태를 유지하는 방화벽을 중앙 VPC에 두면 요청과 응답이 같은 검사 경로를 사용하도록 설계해야 한다. 해당 방화벽 VPC의 attachment에 appliance mode를 켜면 TGW가 한 흐름의 수명 동안 그 attachment에서 같은 AZ를 사용한다.

이 설정은 방화벽 정책이나 양쪽 라우팅을 자동 완성하지 않는다. TGW 테이블과 VPC 서브넷의 반환 경로를 별도로 확인한다. Appliance mode는 VPC attachment에 적용하며, VPN이나 Connect attachment에서 시작한 트래픽도 검사 VPC를 경유할 수 있다. 기존 attachment에서 나중에 활성화하면 흐름이 다른 AZ로 재분배될 수 있다.

검증 제안: 서로 다른 AZ의 클라이언트 사이에서 왕복 통신과 방화벽의 세션 관측을 확인하고, AZ 장애와 모드 변경 시 기존 연결 및 새 연결을 따로 시험한다. AZ를 인식한 선택에는 관련 TGW 테이블의 route propagation이 필요하며, 없으면 flow hash 기반 선택으로 돌아간다. 실제 통신 시험은 수행하지 않았으며 기존 절 전체의 검증일은 유지한다.

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

### 하이브리드 멀티캐스트와 가상 라우터

2026-10-13 공식 multicast 문서와 AWS 참조 아키텍처 부분 대조 기준이다. 온프레미스의 멀티캐스트를 AWS까지 확장할 때 Direct Connect 연결만으로 TGW의 multicast domain에 직접 전달할 수는 없다. 참조 아키텍처는 VPC 안의 가상 라우터와 온프레미스 라우터 사이에 GRE 터널을 만들고, PIM을 이용해 멀티캐스트를 라우팅하는 구성을 제시한다. 이 터널은 가상 라우터 사이의 연결이며 TGW Connect attachment의 멀티캐스트 지원을 뜻하지 않는다.

- multicast domain에는 서브넷을 연결하고, group의 참여 호스트는 EC2의 ENI로 식별한다. domain 연결과 송신자, 수신자 등록을 각각 확인한다.
- non-Nitro 인스턴스는 송신자가 될 수 없다. 수신자로 사용할 때는 source/destination check 해제가 필요하다. 모든 참여 인스턴스가 반드시 Nitro여야 한다고 확대하지 않는다.
- TGW는 조각난 멀티캐스트 패킷을 버린다. 터널의 캡슐화 크기와 경로 MTU를 고려해 실제 메시지 크기로 손실을 시험한다.
- IGMPv2를 쓰면 데이터용 UDP뿐 아니라 멤버십을 유지하는 IGMP 트래픽도 보안 그룹과 NACL에서 허용해야 한다.

시세 배포에 적용하더라도 고빈도 매매에 적합한 지연을 자동 보장하지 않는다. AWS도 지연에 민감한 워크로드의 적합성과 quota 검토를 별도로 요구한다. 가상 라우터 장애 전환, 그룹 재가입과 수신 손실을 부하 조건별로 시험한다. 이는 운영 검증 제안이며 실제 성능 시험 결과가 아니다. 이 절만 추가 대조했으므로 기존 검증일은 유지한다.

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

- [AWS, Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [AWS, Multicast Reference Architectures with AWS Transit Gateway](https://d1.awsstatic.com/architecture-diagrams/ArchitectureDiagrams/transitgateway_multicast_ra.pdf)
- [AWS, Transit gateway peering attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html)
- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
- [AWS, Transit Gateway quotas](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html)
- [AWS, How Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS 공식 문서, AWS Site-to-Site VPN quotas](https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html)
- [AWS, Tunnel options for Site-to-Site VPN](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPNTunnels.html)
- [AWS, VPC peering connection quotas](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-connection-quotas.html)
- [AWS, Transit Gateway encryption support](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-encryption-support.html)
- [AWS, Multicast in Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-multicast-overview.html)
