---
tags: [aws, vpc, network, subnet, peering, transit-gateway, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["NAT Gateway vs NAT Instance", "SG vs NACL"]
verified_at: 2026-08-05
---

# VPC NAT와 보안 (SG, NACL, 규제)

## NAT Gateway vs NAT Instance

NAT Instance는 **추천하지 않음** — Public Subnet에 두는 특수 EC2(`ami-vpc-nat`)로 NAT GW가 나오기 전 방식.

| 항목 | NAT Gateway | NAT Instance |
|---|---|---|
| 관리 | AWS 관리형, 유지보수 불필요 | 사용자가 직접 관리 |
| 가용성 | AZ 내 이중화 자동 | 단일 EC2 — 스크립트로 Failover 필요 |
| 대역폭 | 기본 5 Gbps, **최대 100 Gbps**까지 자동 확장 | 인스턴스 유형에 종속 |
| 보안그룹 | **적용 불가** (NACL만 가능) | 적용 가능 |
| Source/Dest Check | N/A | **비활성화 필수** |

> NAT Instance를 만든다면 `SrcDestCheck` 비활성화, Public Subnet 배치, Private Subnet RT에 `0.0.0.0/0 → NAT Instance` 설정이 필수.

## SG vs NACL

| 구분 | Security Group | Network ACL |
|---|---|---|
| 계층 | 인스턴스(ENI) | 서브넷 |
| 상태 | **Stateful** — 응답 자동 허용 | **Stateless** — 인/아웃 모두 규칙 필요 |
| 룰 | allow만 (deny 없음) | allow + **deny 가능** |
| 생성 시 기본값 | 새 custom SG는 인바운드 규칙 없음 / 아웃바운드 허용. default SG는 같은 SG를 source로 하는 인바운드 허용 | default NACL은 양방향 허용, custom NACL은 규칙 추가 전 양방향 거부 |
| 평가 순서 | 규칙 리스트 전체 매칭 | **우선순위(번호) 순** — 작은 값이 먼저 |
| 인스턴스 부착 | ENI당 SG **기본 쿼터 5개** (최대 16개까지 조정 가능) | 서브넷당 1개 NACL |
| 체크 시점 | 트래픽이 ENI에 도달할 때 | 서브넷 경계 진입/이탈 |
| 기존 연결에 대한 변경 효과 | 추적 중인 연결은 규칙을 제거해도 즉시 끊기지 않을 수 있음 | 상태를 추적하지 않아 기존 연결의 패킷도 변경한 규칙으로 평가 |

**실전**: SG가 기본 도구, NACL은 서브넷 전체에 강한 차단이 필요할 때(규제, IP 블랙리스트) 사용. NACL은 **deny 규칙이 가능**하다는 점이 시험에서 자주 묻는 포인트.

### NACL 응답 포트와 적용 범위

SG의 stateful 동작은 허용된 요청의 응답에 대한 규칙이다. 아웃바운드 규칙을 제거하면 인바운드 요청의 응답은 나갈 수 있어도, 인스턴스가 새로 시작하는 외부 연결까지 허용되는 것은 아니다.

NACL은 요청과 응답을 각각 허용해야 한다. 외부 클라이언트가 서버의 TCP 22번으로 접속했다면, 인바운드에는 서버의 22번을, 아웃바운드에는 클라이언트의 임시 포트를 허용한다. 응답의 목적지 포트를 다시 22번으로 설정하면 연결이 막힌다.

- 임시 포트 범위는 연결을 시작한 OS와 서비스에 따라 다르다. 다양한 클라이언트를 포괄하는 `1024-65535`는 선택 가능한 넓은 범위이며, 실제 환경에 맞춰 좁히고 상대 CIDR도 제한한다.
- NACL은 작은 번호부터 첫 일치 규칙을 적용한다. 넓은 허용 규칙보다 뒤에 있는 거부 규칙은 그 트래픽을 차단하지 못한다.
- NACL 하나를 여러 서브넷에 연결할 수 있지만 서브넷에는 한 번에 하나만 연결된다. 같은 서브넷 내부에서 라우팅되는 트래픽에는 NACL을 적용하지 않는다.
- SG와 NACL로 AmazonProvidedDNS나 IMDS를 차단할 수 있다고 가정하지 않는다. DNS는 Route 53 Resolver DNS Firewall, 메타데이터는 IMDS 설정처럼 별도 제어를 확인한다.

SG/NACL의 기본값, 연결 추적과 이 절은 2026-10-07 공식 문서로 확인했다. NAT와 규제 관련 기존 절 전체를 재검증한 날짜는 아니다.

### 특정 IP 허용과 차단의 변경 범위

부분 검증(2026-10-10): 아래 SG 규칙 합성과 NACL 변경 범위를 공식 문서로 확인했다. NAT와 규제 절 전체를 재검증한 것은 아니다.

1. **허용 범위:** 단일 IPv4는 `/32`, IPv6는 `/128`로 지정하고 필요한 프로토콜과 포트만 연다. `0.0.0.0/0`은 특정 상대만 허용하는 규칙이 아니다.
2. **SG 합성:** ENI에 연결된 여러 SG의 허용 규칙은 합쳐진다. 좁은 SG를 하나 더 붙여도 기존 SG의 넓은 허용을 취소하지 못한다. 해당 ENI에 연결된 모든 SG의 중복 허용을 확인한다.
3. **공유 영향:** SG 규칙을 고치면 그 SG를 사용하는 다른 리소스에도 적용된다. 특정 인스턴스만 바꾸려는 작업이라면 공유 대상을 먼저 확인한다.
4. **명시적 차단:** 서브넷 경계를 통과하는 특정 CIDR을 막으려면 NACL의 거부 규칙을 넓은 허용 규칙보다 작은 번호에 둔다. 같은 NACL에 연결된 모든 서브넷이 영향을 받으며, 같은 서브넷 내부 통신의 차단 수단으로 사용하지 않는다.
5. **확인:** 변경 뒤 허용할 상대와 거부할 상대에서 각각 새 연결을 시험한다. 기존 연결은 SG 연결 추적의 영향을 받을 수 있으므로 새 연결의 결과와 구분한다. NACL은 요청과 응답 방향의 규칙을 함께 확인한다.

## Traffic Mirroring 수신 경로 점검

Traffic Mirroring은 ENI의 트래픽을 복제해 분석 대상에 전달한다. 2026-10-09 공식 Traffic Mirroring 문서로 아래 전송 조건을 대조했다. 기존 NAT와 규제 절 전체를 재검증한 날짜는 아니다.

1. **경로:** source와 target이 같은 VPC 또는 연결된 VPC에 있고, source의 라우트 테이블에 target으로 가는 경로가 있는지 확인한다.
2. **전송 허용:** 복제 패킷은 VXLAN으로 캡슐화되어 UDP 4789로 전달된다. target의 SG와 NACL에서 source로부터 오는 이 트래픽을 허용한다. 원본 패킷의 TCP나 ICMP 규칙만 확인해서는 부족하다.
3. **분석 처리:** 패킷 도착과 원본 내용 분석을 나누어 점검한다. 분석 도구가 VXLAN을 해석할 수 있어야 내부 패킷을 읽을 수 있다.
4. **누락과 잘림:** target의 MTU, 세션의 packet length, 인스턴스 대역폭과 PPS 한도를 확인한다. 복제 트래픽도 인스턴스 대역폭을 사용하며 혼잡 시 복제 패킷이 버려질 수 있다.

운영 확인은 대상에서 실제 복제 패킷을 관찰하고 분석 도구의 처리 결과와 대조하는 방식으로 설계한다. 일부 패킷이 보인다는 사실만으로 원본 트래픽을 빠짐없이 수집했다고 판정하지 않는다.

## 보안, 규제 관점

- **ISMS-P, 전자금융법**: 망분리, 접근통제, 로그 보관이 의무. 초기부터 이를 반영한 설계 필요
- **Flow Logs**: VPC, Subnet, ENI 단위 트래픽 기록. CloudWatch Logs, S3로 저장 → 보안 감사, 장애 원인 분석
- **Bastion vs SSM Session Manager**: 최근은 SSM으로 SSH 포트 없이 접근 권장
- **프라이빗 연결 우선**: 내부 서비스 간 통신은 Private IP로 — Public DNS 경유 시 NAT 거쳐 비용↑

## 출처

- [Amazon VPC User Guide, Security group rules](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html)
- [Amazon VPC User Guide, Network ACL rules](https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html)
- [Amazon VPC User Guide, Get started using Traffic Mirroring to monitor network traffic](https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-getting-started.html)
- [Amazon VPC User Guide, Understand traffic mirror target concepts](https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-targets.html)
- [Amazon VPC User Guide, Traffic Mirroring limitations](https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-network-limitations.html)
- [Amazon VPC User Guide, Control traffic to your AWS resources using security groups](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html)
- [Amazon VPC User Guide, Default security groups for your VPCs](https://docs.aws.amazon.com/vpc/latest/userguide/default-security-group.html)
- [Amazon VPC User Guide, Default network ACL for a VPC](https://docs.aws.amazon.com/vpc/latest/userguide/default-network-acl.html)
- [Amazon VPC User Guide, Control subnet traffic with network access control lists](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html)
- [Amazon VPC User Guide, Custom network ACLs for your VPC](https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html)
- [Amazon EC2 User Guide, Security group connection tracking](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-connection-tracking.html)
- [Amazon VPC User Guide, NAT gateway basics](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html)
- [Amazon VPC quotas — ENI당 보안 그룹 기본 5개, 최대 16개까지 조정](https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html)

## 관련 문서

- [[VPC|VPC 구성과 연결]]
- [[VPC-Pitfalls-Interview|VPC 운영 실수와 점검 질문]]
