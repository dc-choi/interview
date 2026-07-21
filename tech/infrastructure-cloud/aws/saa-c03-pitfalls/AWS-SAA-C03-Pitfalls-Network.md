---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, network]
status: done
category: "Infrastructure - AWS"
aliases: ["네트워킹 함정", "SAA-C03 Pitfalls Network"]
verified_at: 2026-07-21
---

# AWS SAA-C03 빈출 함정 — 네트워킹

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

### VPC

- **NAT Gateway** vs **NAT Instance**
  | 항목 | NAT GW | NAT Instance |
  |---|---|---|
  | 관리 | AWS 매니지드 | 직접 |
  | 가용성 | 특정 AZ의 서브넷에 생성. 다중 AZ 워크로드는 AZ별 NAT Gateway 구성을 검토 | 구성한 EC2와 복구 설계에 따름 |
  | 대역폭 | 자동 확장, NAT Gateway당 최대 100Gbps. 연결, PPS 등 별도 할당량 존재 | 인스턴스 타입과 네트워크 설정 |
  | 보안 그룹 | 적용 안 됨 | 적용 됨 |
  | 포트 포워딩 | X | O |
  | 선택 기준 | 운영 부담, 처리량, 가용성 우선 시 | 포트 포워딩, 특정 네트워크 기능이나 직접 제어가 필요할 때 |
- **Security Group** vs **NACL**
  | 항목 | SG | NACL |
  |---|---|---|
  | 적용 | ENI/인스턴스 | 서브넷 |
  | 상태 | Stateful (인바운드 허용 = 아웃바운드 자동) | Stateless (양방향 명시) |
  | 룰 | 허용만 | 허용+거부, **번호 순서** |
  | 기본 | 새 custom SG는 inbound rule 없음, outbound all allow. default SG는 inbound self-reference, outbound all allow | 기본 NACL은 inbound/outbound all allow, custom NACL은 rule 추가 전 inbound/outbound all deny |
- **VPC Peering**: 전이 안 됨(A-B, B-C 있어도 A-C 불가). CIDR 겹침 불가
- **Transit Gateway**: VPC, 온프레 허브. **ECMP**(Equal Cost Multi-Path) 라우팅 — VPN 대역폭 ↑
- **VPC Endpoint 종류**
  - **Gateway**: S3, DynamoDB만. 라우팅 테이블에 추가하며 엔드포인트 자체의 별도 시간당, 데이터 처리 요금은 없음. 대상 서비스 요청, 데이터 전송 등은 별도 조건 확인
  - **Interface**: ENI로 연결, 시간당 + 데이터당 과금. PrivateLink 기반
- **PrivateLink**: 전통적인 VPC endpoint service는 NLB 또는 GWLB 뒤의 서비스를 interface endpoint로 노출한다. AWS 서비스용 interface endpoint와 Resource Gateway를 통한 resource endpoint 등 다른 PrivateLink 유형도 있으므로 모든 구성이 NLB를 요구하는 것은 아니다
- **Egress-only IGW**: IPv6 전용 아웃바운드 (IPv4의 NAT GW에 해당)
- **SR-IOV / Enhanced Networking**: ENA(현재), Intel 82599 VF(레거시)
- **VPC Flow Logs**: ENI, 서브넷, VPC 단위 IP 트래픽 메타데이터. S3, CloudWatch Logs, Firehose로 전송 가능. 허용, 거부 트래픽 분석에 유용하지만 패킷 본문이나 모든 네트워크 흐름을 기록하는 것은 아님

### ELB

- **ALB**(L7) vs **NLB**(L4) vs **GWLB**(L3, 어플라이언스)
- **Cross-Zone Load Balancing**
  - ALB: 로드 밸런서 수준에서 기본 활성. Target Group 수준 override와 요금 조건은 최신 문서 확인
  - NLB, GWLB: 기본 비활성, 필요 시 활성화. 가용 영역 간 데이터 전송 요금은 로드 밸런서 유형과 트래픽 경로별 요금표 확인
  - CLB: 리전과 생성 방식에 따른 기본값, 설정을 확인
- **Connection Draining**(CLB)과 **Deregistration Delay**(ALB/NLB)는 등록 해제 중 기존 연결을 처리하는 관련 기능이다. 기본값과 유효 범위, UDP flow 처리 방식은 로드 밸런서, Target Group 유형별로 확인한다
- **X-Forwarded-For**, `X-Forwarded-Proto`, `X-Forwarded-Port`는 HTTP 계층의 ALB 헤더다. NLB는 이 헤더를 추가하지 않으며 클라이언트 IP 보존 여부는 대상 유형, 프로토콜, preserve client IP 설정에 따라 달라진다
- **고정 세션(Sticky Session)**
  - ALB: 애플리케이션 쿠키(AWSALBAPP), 기간 쿠키
  - NLB: Source IP 기반
  - CLB: 애플리케이션, 로드밸런서 쿠키
- **NLB Static IP** — AZ당 1개 EIP 할당 가능. ALB는 EIP 불가(CNAME만)
- **SNI와 다중 인증서**: ALB와 TLS NLB listener는 certificate list와 SNI로 여러 인증서를 선택할 수 있다. CLB listener는 인증서 1개다. CloudFront도 viewer와 SNI를 협상하지만 standard distribution에 연결하는 인증서는 1개이며 여러 도메인은 그 인증서의 SAN 또는 wildcard로 포함한다

### Route 53

- **라우팅 정책 7종**
  | 정책 | 용도 |
  |---|---|
  | Simple | 단순 다중 값 응답. 레코드 자체에 헬스 체크 연결 불가 |
  | Weighted | A/B 테스트, 점진 배포 |
  | Latency | AWS가 측정한 지연을 기준으로 더 낮은 지연이 예상되는 리전 |
  | Failover | Active-Passive |
  | Geolocation | 사용자 위치 |
  | Geoproximity | 위치+편향(bias). 일반 hosted zone record로 직접 구성 가능, Traffic Flow는 복합 정책 시 선택 |
  | Multi-Value | 최대 8개 헬시 IP 반환(LB 대체 아님) |
- **Alias** vs **CNAME**
  - Alias: 지원되는 AWS 리소스 또는 같은 hosted zone의 레코드. **apex(zone root) 가능**. AWS 리소스 alias query에는 Route 53 쿼리 요금이 없지만 대상 서비스와 기타 DNS 기능 요금은 별도
  - CNAME: apex 불가. 비AWS 도메인 가능. 쿼리당 과금
- **Alias의 Evaluate Target Health** 지원 여부와 의미는 대상 리소스에 따라 다르다. 일반 레코드도 지원되는 유형이면 별도 Route 53 health check를 연결할 수 있다
- **헬스체크**: TCP/HTTP/HTTPS, 다른 헬스체크 조합, CloudWatch Alarm 모니터링
- **DNSSEC**: Route 53에서 키 관리. 도메인 위조 방지
- **사설 호스팅 영역**: VPC 내부 DNS. 권한 부여 절차를 거쳐 같은 계정 또는 다른 계정의 여러 VPC를 연결할 수 있고 hosted zone과 VPC가 서로 다른 리전이어도 연결 가능

### CloudFront, Global Accelerator

- **CloudFront**
  - 오리진: S3, ALB, EC2, HTTP 백엔드, MediaPackage, MediaStore
  - **OAI(Origin Access Identity)** vs **OAC(Origin Access Control)**: OAC가 신규 권장(KMS 지원, SigV4)
  - **서명 URL**(개별 객체) vs **서명 쿠키**(다수 객체)
  - 캐시 키: 헤더, 쿠키, 쿼리 — 명시한 것만 캐시 분리에 사용
  - **Cache-Control / Expires**(오리진), **TTL**(CloudFront) — 오리진 헤더가 없으면 CF 기본 TTL
  - **지리적 제한**: 화이트리스트/블랙리스트 (Route 53 Geolocation과 별개)
  - **Origin Failover**: Primary 실패 시 Secondary. Origin Group으로 구성
  - **Field-Level Encryption**: 특정 필드를 공개키로 암호화
- **CloudFront** vs **Global Accelerator**
  - CloudFront: 캐시 가능한 콘텐츠(HTML, 이미지, 동영상), HTTP/HTTPS
  - GA: HTTP 외 프로토콜(TCP/UDP 게임, VoIP), 정적 Anycast IP 필요, 캐싱 불필요한 동적 트래픽
- **GA Endpoint**: ALB, NLB, EC2, EIP 헬스 체크 → 트래픽 라우팅

### Direct Connect, VPN, TGW

- **Direct Connect**(전용 연결): 파트너, 위치, 용량에 따라 준비 기간이 다르다. Dedicated Connection과 Hosted Connection이 지원하는 포트 속도도 다르므로 현재 위치별 옵션을 확인한다. 인터넷 경로와 다른 일관된 네트워크 경로를 제공하며 비용 우위는 포트 시간과 데이터 전송 요금을 함께 계산
- **DX Gateway**: 여러 리전 VPC 연결 (전이는 TGW로)
- **Site-to-Site VPN**: 인터넷 경유 IPsec 연결로 Direct Connect보다 빠르게 구성할 수 있지만 생성, 고객 게이트웨이 설정과 라우팅 시간이 필요하다. MACsec은 지원되는 Direct Connect 전용 연결에서 선택 가능한 링크 계층 암호화
- **VPN over DX**: DX에 IPsec 추가 — 컴플라이언스 요구 시
- **Transit Gateway**: 멀티 VPC, 온프레 허브. **DX Gateway와 결합 시 라우팅 통합**

## 관련 문서

[[VPC]], [[ELB]], [[Route53]], [[CloudFront]], [[Global-Accelerator]], [[API-Gateway]]

## 출처

- [NAT Gateway 기본 사항과 할당량](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html)
- [EC2 Security Group 기본 규칙](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-security-group.html)
- [VPC Endpoint 개념](https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html)
- [Elastic Load Balancing의 Cross-Zone Load Balancing](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html#cross-zone-load-balancing)
- [Route 53 라우팅 정책](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html)
- [Route 53 Alias 레코드](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html)
- [Private Hosted Zone과 VPC 연결](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-associate-vpcs.html)
- [Direct Connect 연결](https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithConnections.html)
- [CloudFront SSL certificate quota](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-ssl-certificates)
