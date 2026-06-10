---
tags: [infrastructure, aws, network, transit-gateway, vpc, vpn, hub-and-spoke]
status: done
category: "Infrastructure - AWS"
aliases: ["Transit Gateway", "AWS Transit Gateway", "TGW", "TGW 허브"]
---

# AWS Transit Gateway (TGW)

**수천 개의 VPC, 온프레미스 네트워크**를 단일 게이트웨이에서 라우팅하는 **네트워크 중앙 허브**. VPC Peering의 풀메시 폭주 문제를 허브-스포크 모델로 해결한다.

## 핵심

- **리전 단위 리소스** — 단일 리전 내 모든 VPC, VPN, DX를 하나의 라우터로 통합
- **전이적 라우팅(transitive routing)** 지원 — A↔TGW↔B가 자연스럽게 통신. (VPC Peering은 전이 불가)
- **계정 간 공유**: **AWS RAM**(Resource Access Manager)으로 다른 계정에 TGW 공유 가능
- 같은 TGW에 연결된 모든 어태치먼트가 **라우팅 테이블 단위로 격리/공유** 가능

## 연결 가능한 리소스 (Attachment)

| 종류 | 용도 |
|------|------|
| **VPC** | 리전 내 VPC 연결 (서브넷 1개 이상에 ENI 생성) |
| **VPN** | Site-to-Site VPN 연결 (IPsec) |
| **Direct Connect Gateway** | DX(Direct Connect) → TGW 연결로 온프레미스 통합 |
| **Transit Gateway Peering** | 다른 리전의 TGW와 피어링 — **글로벌 네트워크** 구성 |
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

- 단일 IPsec VPN 터널은 **최대 약 1.25 Gbps** 처리량 한계
- TGW는 **여러 VPN 터널을 동일 비용 경로로 묶어** 트래픽을 분산 → 처리량을 N배로 확장
- 예: 4개 터널을 ECMP로 묶으면 ~5 Gbps 가능
- VPC Peering, VPN Gateway(VGW)는 ECMP 미지원 — **TGW만의 기능**

## 계정 간 공유 — AWS RAM

- 단일 TGW를 여러 AWS 계정이 공유 어태치먼트로 사용 가능
- 멀티 계정 환경(Organizations)에서 **중앙 네트워크 계정**에 TGW를 두고 다른 계정 VPC가 어태치
- 라우팅 테이블, 연결 정책은 TGW 소유 계정에서 통제

## vs VPC Peering — 시험 핵심 비교

| 측면 | VPC Peering | Transit Gateway |
|------|-------------|-----------------|
| **연결 모델** | 1:1 풀메시 (N개 VPC → N(N-1)/2 연결) | 허브-스포크 (N개 VPC → N 어태치먼트) |
| **전이적 라우팅** | X (A↔B, B↔C여도 A↔C 불가) | O |
| **확장성** | ~125개 피어링 한계, 관리 폭증 | 수천 개 VPC |
| **온프레미스 통합** | X (별도 VGW/DX 필요) | O (VPN, DX 일원화) |
| **비용** | 트래픽 비용만 | 어태치먼트 시간 요금 + 트래픽 비용 |
| **암호화** | 리전 내 트래픽 자동 암호화 | VPN은 IPsec, VPC 어태치는 평문 |

> 시험에서 **"수십~수백 개 VPC 연결"**, **"중앙 집중 라우팅"**, **"전이적"**, **"멀티 계정 네트워크 통합"** 키워드가 보이면 TGW.

## Multicast 지원

- TGW는 **IP 멀티캐스트** 지원 — VPC는 기본적으로 멀티캐스트 불가지만 TGW를 통하면 가능
- 미디어/금융 시장 데이터 분산 같은 워크로드에 활용

## 시험 체크포인트

- **단일 VPN 터널 1.25 Gbps 초과** 필요 → **TGW + ECMP**로 다중 터널 묶기
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
