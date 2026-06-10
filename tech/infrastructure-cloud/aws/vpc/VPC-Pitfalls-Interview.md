---
tags: [aws, vpc, network, subnet, peering, transit-gateway, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["VPC 흔한 실수", "VPC 면접 체크포인트"]
---

# VPC 흔한 실수와 면접 체크포인트

## 흔한 실수

- **CIDR 중복** — 다른 VPC, 온프렘과 IP 대역 겹침. 나중에 Peering, VPN 불가
- **/24 너무 작게 할당** — 서비스 성장, 관리형 서비스 IP 소비로 금방 고갈
- **Public Subnet에 DB 배치** — 외부 노출 위험
- **SG를 0.0.0.0/0 허용** — 검토 없이 임시 오픈 후 방치
- **Single AZ 운영** — AZ 장애 시 전체 서비스 다운
- **NAT Gateway 비용 무시** — 데이터 처리 GB당 $0.045, 대량 트래픽에서 큰 비중

## 면접 체크포인트

- **Subnet의 성격을 결정하는 것**은 Route Table이라는 점
- **SG vs NACL** 차이(Stateful/Stateless, 인스턴스/서브넷, allow/deny)
- **Peering vs Transit Gateway** 선택 기준 (N 증가에 따른 연결 수 폭증)
- **CIDR 설계 원칙**과 비중첩, 여유 할당의 이유
- **VPC Endpoint**로 NAT 비용 줄이는 방법
- 3-Tier 서브넷 구조와 Multi-AZ 복제
