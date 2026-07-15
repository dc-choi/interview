---
status: done
category: "Infrastructure - AWS"
tags: [aws, saa, security, shield, waf, network-firewall, ddos, web-security]
aliases: [Shield, WAF, Network Firewall, AWS Shield, AWS WAF, AWS Network Firewall]
---

# Shield, WAF, Network Firewall

AWS 보안 3종 세트. 계층(L3/L4 vs L7)과 적용 위치(엣지/리전 LB vs VPC 경계)로 역할이 갈린다.

| 서비스 | 보호 계층 | 위치 | 주 위협 |
|---|---|---|---|
| **Shield** | L3 / L4 (+L7 Advanced) | 엣지 (CloudFront, R53, AGA) / 리전 (ELB, EIP) | DDoS (Volumetric, SYN flood 등) |
| **WAF** | L7 | CloudFront, ALB, API Gateway, AppSync, Cognito | SQLi, XSS, Bot, Rate abuse |
| **Network Firewall** | L3–L7 | VPC 경계 | Egress/Ingress 필터링, 도메인 차단, IDS/IPS |

---

## AWS Shield (DDoS 보호)

분산 서비스 거부(DDoS) 공격으로부터 AWS 리소스를 보호.

### Shield Standard

- **모든 AWS 계정에 기본 활성화, 무료**.
- L3/L4 대표 공격 자동 방어: SYN/UDP flood, Reflection attack, 일반 볼륨형 공격.
- 보호 대상: CloudFront, Route 53 자동 적용 + 일반 AWS 네트워크 진입점.

### Shield Advanced

- **월 정액(약 $3,000) + DT 보호 + 24/7 DRT 액세스**. 조직(Organization) 단위 가입.
- 추가 기능:
  - **L7 트래픽 모니터링, 메트릭** + 공격 사후 분석 리포트.
  - **DDoS Response Team (DRT)** 지원.
  - **WAF 무료 사용** (Advanced 구독자에 한해 WAF 룰 비용 포함).
  - **Cost Protection**: DDoS로 인한 AutoScaling/CloudFront 데이터 전송 비용 환급.
  - **Health-based detection**: Route 53 헬스체크 기반 정밀 탐지.
- 보호 대상:
  - **EC2, ELB, CloudFront, Global Accelerator, Route 53** + 연동 애플리케이션.
  - CloudFront 뒤가 AWS가 아닌 외부 Origin이어도 보호 범위.

### Standard vs Advanced 결정 트리

- 일반 워크로드 → Standard로 충분.
- SLA, 평판 민감, 공격 이력 있음, 비용 보호 필요 → Advanced.

---

## AWS WAF (웹 애플리케이션 방화벽)

L7 HTTP/HTTPS 트래픽 검사로 OWASP Top 10급 웹 공격을 차단.

### 부착 가능한 리소스

- **CloudFront** (엣지에서 필터링, 글로벌)
- **Application Load Balancer**
- **API Gateway (REST)**
- **AppSync (GraphQL)**
- **Amazon Cognito User Pool**
- **App Runner**, **Verified Access**

NLB, EC2 직접 부착 ❌. NLB는 L4라 WAF 비대상.

### 구성 요소

- **Web ACL** — 룰 묶음. 리소스에 1개 attach.
- **Rule** — 매칭 조건(Statement) + 액션(Allow/Block/Count/CAPTCHA/Challenge).
  - 조건 종류: IP set, geo match, string/regex match (URI, 헤더, 바디, 쿼리), size, SQLi/XSS 매처.
- **Rate-based Rule** — 5분 윈도우 내 동일 IP 요청 수 초과 시 차단. 자격무차별 대입, 스크래핑 방어.
- **Rule Group** — 룰 묶음 재사용. 직접 작성 또는 다음 두 종류 활용:
  - **AWS Managed Rules** — Core, Known Bad Inputs, SQLi, Linux/Windows OS, PHP, WordPress, Anonymous IP, Bot Control 등.
  - **AWS Marketplace** 서드파티 룰(F5, Fortinet 등).
- **Bot Control / Account Takeover Prevention** — 별도 과금 관리형 룰.
- **CAPTCHA / Challenge** — 의심 요청에 사람 검증 강제.

### 액션 우선순위

- Web ACL 내 룰은 **우선순위(번호) 순서대로 평가**. Allow/Block은 즉시 종료, Count는 매칭 카운트만 올리고 계속.

### 로깅, 모니터링

- **WAF Logs**: Kinesis Firehose → S3/CloudWatch Logs/OpenSearch.
- CloudWatch 메트릭: `AllowedRequests`, `BlockedRequests`, 룰별 카운트.

### 시험에 잘 나오는 함정

- WAF는 **HTTP/HTTPS만**. TCP/UDP DDoS는 Shield.
- **NLB에는 부착 불가** — ALB 또는 CloudFront 뒤로 두기.
- Web ACL은 **CloudFront에 붙이면 글로벌(IAD)**, ALB/API Gateway는 리전.
- Shield Advanced 가입자는 WAF 사용료 일부 면제.

---

## AWS Network Firewall

VPC 단위로 **상태 저장(stateful) + 상태 비저장(stateless) L3–L7 방화벽**을 제공. Suricata 호환 룰을 그대로 적용 가능.

### 동작 위치

- VPC 내부에 **방화벽 엔드포인트(서브넷)** 배치 → Route Table을 통해 모든 in/out 트래픽이 방화벽을 경유하도록 라우팅.
- **VPC 단위 / AZ 단위** 배포. 멀티 AZ면 AZ별 엔드포인트 필요.
- 일반적 토폴로지: 인터넷 GW ↔ Firewall Subnet ↔ 워크로드 서브넷.

### 룰 엔진 2종

- **Stateless Rule Engine** — 패킷 단위 평가. 방향 무관, 양방향 패킷을 각각 검사. 빠르지만 세션 추적 ❌.
- **Stateful Rule Engine** — 연결 상태(세션) 추적. 방화벽을 통과한 outbound 요청에 대한 inbound 응답을 자동 허용. **Suricata 규칙 문법** 사용 가능 (IDS/IPS 룰 셋 그대로 도입).

### 필터링 가능 항목

- L3/L4: 소스/대상 **IP, Port, 프로토콜**.
- L7:
  - **도메인 이름(SNI/HTTP Host) 화이트리스트, 블랙리스트** — egress 도메인 차단의 핵심.
  - HTTP/TLS 메타데이터, 패킷 페이로드(Suricata 룰).

### Managed Rule Groups

- AWS가 직접 관리, 업데이트:
  - **AWS Managed Threat Signatures** (Suricata 기반 IDS 룰).
  - **Domain List** (악성 도메인 차단).
- 사용자가 직접 작성한 룰과 병행 가능.

### 일반적 사용 시나리오

- **Egress 도메인 제어**: 워크로드가 허용된 외부 도메인(`*.amazonaws.com`, 협력사 API 등)만 호출하도록.
- **VPC 간 East-West 검사**: Transit Gateway + Network Firewall로 중앙 검사 지점 구성.
- **컴플라이언스(PCI/HIPAA)**: 명시적 in/out 통제 증적.

### 시험 포인트

- VPC 외부 트래픽 광범위 필터링, **egress 도메인 차단** 시나리오는 Network Firewall.
- **Suricata** 키워드 = Network Firewall.
- Security Group/NACL과 다른 점: SG/NACL은 인스턴스, 서브넷 단위 ACL, Network Firewall은 **VPC 경계의 stateful + L7 검사**.

---

## 결정 트리 (시험, 실무 빈출)

```
공격/요건
├─ L3/L4 볼륨형 DDoS                  → Shield (Standard 기본, 민감하면 Advanced)
├─ L7 웹 공격 (SQLi/XSS/Bot/Rate)     → WAF
│   └─ ALB/CloudFront/API GW에 attach
├─ VPC egress 도메인/IDS 룰 필터링    → Network Firewall (Suricata)
├─ 인스턴스, 서브넷 단위 포트 ACL       → Security Group / NACL
└─ 글로벌 진입점 + DDoS 흡수           → CloudFront / Global Accelerator + Shield
```

## 비교 요약표

| 항목 | Shield | WAF | Network Firewall |
|---|---|---|---|
| 계층 | L3/L4 (Adv: +L7) | L7 | L3–L7 |
| 보호 대상 | CF, R53, AGA, ELB, EIP | CF, ALB, API GW, AppSync | VPC 전체 |
| 룰 모델 | 자동(Adv는 커스텀) | Web ACL + Rule | Stateless + Stateful(Suricata) |
| 가격 | Standard 무료 / Adv 정액 | Web ACL + 룰 + 요청 수 | 시간당 + GB |
| 키워드 | DDoS | SQLi/XSS/Bot/Rate | egress 도메인, Suricata |

## 시험 체크포인트

- **Shield Standard는 기본 활성, 무료**. Advanced는 비용 보호 + DRT + WAF 비용 면제.
- WAF는 **CloudFront, ALB, API Gateway, AppSync, Cognito**에 부착. **NLB ❌**.
- Rate-based Rule = **5분 윈도우 동일 IP 요청 수** 기준.
- **AWS Managed Rules**로 OWASP, SQLi, Bot Control 빠르게 적용.
- Network Firewall 키워드: **VPC 단위 / Suricata / Stateful + Stateless / Domain filtering**.
- "특정 도메인으로의 outbound만 허용" → **Network Firewall** (또는 Route 53 Resolver DNS Firewall이지만 DNS 차원).
- Security Group, NACL과 혼동 금지: SG/NACL은 ENI/서브넷, Network Firewall은 VPC 경계.

## 출처

- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[CloudFront]]
- [[ELB]]
- [[API-Gateway]]
- [[VPC]]
- [[IAM]]
- [[Route53]]
- [[보안(Security)|보안]]
