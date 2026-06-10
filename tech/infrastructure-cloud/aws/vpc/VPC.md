---
tags: [aws, vpc, network, subnet, peering, transit-gateway, infrastructure]
status: index
category: "Infrastructure - AWS"
aliases: ["VPC", "AWS VPC", "가상 사설 클라우드", "Subnet 설계"]
---

# VPC, Subnet, VPC 간 연결

AWS VPC(Virtual Private Cloud)는 **격리된 가상 네트워크**. IP 대역, 서브넷, 라우팅, 보안을 직접 통제해 온프레미스 네트워크처럼 구성한다. 네트워크 설계는 **초기 결정이 가장 비싸게 되돌려지는 영역**이라 처음 설계할 때 미래 성장, 멀티 계정, 규제까지 함께 고려해야 한다.

- [[VPC-Subnet-CIDR|기본 구성 요소, 서브넷 예약 IP, 서브넷 유형(3-Tier), CIDR 설계]]
- [[VPC-NAT-Security|NAT Gateway vs NAT Instance, SG vs NACL, 보안 규제 관점]]
- [[VPC-Connectivity|Peering vs Transit Gateway, VPC Endpoint, 온프레미스 연결(VPN, DX)]]
- [[VPC-Pitfalls-Interview|흔한 실수와 면접 체크포인트]]

## 출처
- [AWS VPC 기본 개념 — brunch @growthminder](https://brunch.co.kr/@growthminder/93)
- [VPC Peering vs Transit Gateway — brunch @growthminder](https://brunch.co.kr/@growthminder/94)
- [안정적인 클라우드 네트워크 설계하기 — SK DEVOCEAN](https://devocean.sk.com/blog/techBoardDetail.do?ID=166297&boardType=techBlog)
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[RDS-Security-Group|RDS Security Group 구성]]
- [[CDN|CDN (CloudFront)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (VPC Endpoint, NAT 절감)]]
- [[Load-Balancer|Load Balancer]]
- [[ELB|AWS ELB]]
