---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, network]
status: done
category: "Infrastructure - AWS"
aliases: ["네트워킹 함정", "SAA-C03 Pitfalls Network"]
---

# AWS SAA-C03 빈출 함정 — 네트워킹

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

### VPC

- **NAT Gateway** vs **NAT Instance**
  | 항목 | NAT GW | NAT Instance |
  |---|---|---|
  | 관리 | AWS 매니지드 | 직접 |
  | 가용성 | AZ당 1개(다중 AZ 권장) | 단일 EC2 |
  | 대역폭 | ~100Gbps | 인스턴스 타입 |
  | 보안 그룹 | 적용 안 됨 | 적용 됨 |
  | 포트 포워딩 | X | O |
  | 시험 정답 | 거의 항상 NAT GW | 레거시 |
- **Security Group** vs **NACL**
  | 항목 | SG | NACL |
  |---|---|---|
  | 적용 | ENI/인스턴스 | 서브넷 |
  | 상태 | Stateful (인바운드 허용 = 아웃바운드 자동) | Stateless (양방향 명시) |
  | 룰 | 허용만 | 허용+거부, **번호 순서** |
  | 기본 | 모두 거부 | 모두 허용(기본 NACL) / 모두 거부(커스텀) |
- **VPC Peering**: 전이 안 됨(A-B, B-C 있어도 A-C 불가). CIDR 겹침 불가
- **Transit Gateway**: VPC·온프레 허브. **ECMP**(Equal Cost Multi-Path) 라우팅 — VPN 대역폭 ↑
- **VPC Endpoint 종류**
  - **Gateway**: S3·DynamoDB만. 라우팅 테이블에 추가, 무료
  - **Interface**: ENI로 연결, 시간당 + 데이터당 과금. PrivateLink 기반
- **PrivateLink**: SaaS 공급자가 자기 VPC를 다른 VPC에 노출 (NLB 필요)
- **Egress-only IGW**: IPv6 전용 아웃바운드 (IPv4의 NAT GW에 해당)
- **SR-IOV / Enhanced Networking**: ENA(현재)·Intel 82599 VF(레거시)
- **VPC Flow Logs**: ENI·서브넷·VPC 단위 트래픽 로그. S3·CloudWatch Logs·Kinesis Firehose 전송. **거부된 트래픽 분석에 필수**

### ELB

- **ALB**(L7) vs **NLB**(L4) vs **GWLB**(L3·어플라이언스)
- **Cross-Zone Load Balancing**
  - ALB: 기본 활성·**무료**
  - NLB·GWLB: 기본 비활성·**AZ 간 데이터 전송료**
  - CLB: 기본 비활성·무료
- **Connection Draining**(CLB) = **Deregistration Delay**(ALB/NLB) — 기본 300초
- **X-Forwarded-For**(클라 IP), X-Forwarded-Proto(프로토콜), X-Forwarded-Port. **NLB는 헤더 안 붙임** — Source IP 보존 자체로 전달
- **고정 세션(Sticky Session)**
  - ALB: 애플리케이션 쿠키(AWSALBAPP) · 기간 쿠키
  - NLB: Source IP 기반
  - CLB: 애플리케이션·로드밸런서 쿠키
- **NLB Static IP** — AZ당 1개 EIP 할당 가능. ALB는 EIP 불가(CNAME만)
- **SNI**(다중 인증서) — ALB·NLB·CloudFront 지원. CLB는 인증서 1개

### Route 53

- **라우팅 정책 7종**
  | 정책 | 용도 |
  |---|---|
  | Simple | 단순 — 헬스체크 없음 |
  | Weighted | A/B 테스트·점진 배포 |
  | Latency | 가장 가까운 리전 |
  | Failover | Active-Passive |
  | Geolocation | 사용자 위치 |
  | Geoproximity | 위치+편향(bias) — Traffic Flow 필요 |
  | Multi-Value | 최대 8개 헬시 IP 반환(LB 대체 아님) |
- **Alias** vs **CNAME**
  - Alias: AWS 리소스(ELB·CloudFront·S3 웹·API GW). **apex(zone root) 가능**. 무료
  - CNAME: apex 불가. 비AWS 도메인 가능. 쿼리당 과금
- **Alias는 Health Check 평가 가능** — CNAME은 자체 헬스체크 필요
- **헬스체크**: TCP/HTTP/HTTPS·다른 헬스체크 조합·CloudWatch Alarm 모니터링
- **DNSSEC**: Route 53에서 키 관리. 도메인 위조 방지
- **사설 호스팅 영역**: VPC 내부 DNS. **여러 VPC 연결 가능**(같은 리전)

### CloudFront · Global Accelerator

- **CloudFront**
  - 오리진: S3·ALB·EC2·HTTP 백엔드·MediaPackage·MediaStore
  - **OAI(Origin Access Identity)** vs **OAC(Origin Access Control)**: OAC가 신규 권장(KMS 지원·SigV4)
  - **서명 URL**(개별 객체) vs **서명 쿠키**(다수 객체)
  - 캐시 키: 헤더·쿠키·쿼리 — 명시한 것만 캐시 분리에 사용
  - **Cache-Control / Expires**(오리진) · **TTL**(CloudFront) — 오리진 헤더가 없으면 CF 기본 TTL
  - **지리적 제한**: 화이트리스트/블랙리스트 (Route 53 Geolocation과 별개)
  - **Origin Failover**: Primary 실패 시 Secondary. Origin Group으로 구성
  - **Field-Level Encryption**: 특정 필드를 공개키로 암호화
- **CloudFront** vs **Global Accelerator**
  - CloudFront: 캐시 가능한 콘텐츠(HTML·이미지·동영상)·HTTP/HTTPS
  - GA: HTTP 외 프로토콜(TCP/UDP 게임·VoIP)·정적 Anycast IP 필요·캐싱 불필요한 동적 트래픽
- **GA Endpoint**: ALB·NLB·EC2·EIP 헬스 체크 → 트래픽 라우팅

### Direct Connect · VPN · TGW

- **Direct Connect**(전용선): 프로비저닝 수개월. 1Gbps·10Gbps·100Gbps. **데이터 전송 비용 절감**
- **DX Gateway**: 여러 리전 VPC 연결 (전이는 TGW로)
- **Site-to-Site VPN**: 즉시 가능, 인터넷 경유. **MACsec**(DX 전용 암호화)
- **VPN over DX**: DX에 IPsec 추가 — 컴플라이언스 요구 시
- **Transit Gateway**: 멀티 VPC·온프레 허브. **DX Gateway와 결합 시 라우팅 통합**

## 관련 문서

[[VPC]] · [[ELB]] · [[Route53]] · [[CloudFront]] · [[Global-Accelerator]] · [[API-Gateway]]

## 출처

- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
