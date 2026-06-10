---
tags: [aws, vpc, network, subnet, peering, transit-gateway, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["NAT Gateway vs NAT Instance", "SG vs NACL"]
---

# VPC NAT와 보안 (SG, NACL, 규제)

## NAT Gateway vs NAT Instance

NAT Instance는 **추천하지 않음** — Public Subnet에 두는 특수 EC2(`ami-vpc-nat`)로 NAT GW가 나오기 전 방식.

| 항목 | NAT Gateway | NAT Instance |
|---|---|---|
| 관리 | AWS 관리형, 유지보수 불필요 | 사용자가 직접 관리 |
| 가용성 | AZ 내 이중화 자동 | 단일 EC2 — 스크립트로 Failover 필요 |
| 대역폭 | 최대 **45 Gbps** 확장 | 인스턴스 유형에 종속 |
| 보안그룹 | **적용 불가** (NACL만 가능) | 적용 가능 |
| Source/Dest Check | N/A | **비활성화 필수** |

> NAT Instance를 만든다면 `SrcDestCheck` 비활성화, Public Subnet 배치, Private Subnet RT에 `0.0.0.0/0 → NAT Instance` 설정이 필수.

## SG vs NACL

| 구분 | Security Group | Network ACL |
|---|---|---|
| 계층 | 인스턴스(ENI) | 서브넷 |
| 상태 | **Stateful** — 응답 자동 허용 | **Stateless** — 인/아웃 모두 규칙 필요 |
| 룰 | allow만 (deny 없음) | allow + **deny 가능** |
| 기본값 | 인바운드 거부 / 아웃바운드 허용 | 인, 아웃 모두 허용 |
| 평가 순서 | 규칙 리스트 전체 매칭 | **우선순위(번호) 순** — 작은 값이 먼저 |
| 인스턴스 부착 | 인스턴스당 **최대 5개** SG | 서브넷당 1개 NACL |
| 체크 시점 | 트래픽이 ENI에 도달할 때 | 서브넷 경계 진입/이탈 |
| 적용 | 변경 즉시 반영 | 변경 즉시 반영 |

**실전**: SG가 기본 도구, NACL은 서브넷 전체에 강한 차단이 필요할 때(규제, IP 블랙리스트) 사용. NACL은 **deny 규칙이 가능**하다는 점이 시험에서 자주 묻는 포인트.

## 보안, 규제 관점

- **ISMS-P, 전자금융법**: 망분리, 접근통제, 로그 보관이 의무. 초기부터 이를 반영한 설계 필요
- **Flow Logs**: VPC, Subnet, ENI 단위 트래픽 기록. CloudWatch Logs, S3로 저장 → 보안 감사, 장애 원인 분석
- **Bastion vs SSM Session Manager**: 최근은 SSM으로 SSH 포트 없이 접근 권장
- **프라이빗 연결 우선**: 내부 서비스 간 통신은 Private IP로 — Public DNS 경유 시 NAT 거쳐 비용↑
