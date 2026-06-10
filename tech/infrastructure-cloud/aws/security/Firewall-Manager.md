---
tags: [infrastructure, aws, firewall-manager, security, waf, shield, organizations]
status: done
category: "Infrastructure - AWS"
aliases: ["Firewall Manager", "AWS Firewall Manager"]
---

# AWS Firewall Manager

**AWS Organizations**에 있는 모든 계정의 방화벽 규칙을 **중앙에서 관리**.

## 핵심

- 멀티 계정, 멀티 리소스 방화벽 거버넌스
- **AWS Organizations 전제** (단일 계정 사용 불가)

## 보안 정책 (Security Policy)

보안 규칙의 집합으로 다음에 적용:

- **ALB, API Gateway, CloudFront** 등에 적용되는 **WAF 규칙**
- **AWS Shield Advanced**
- **VPC 보안 그룹** (EC2, ENI 리소스용)
- **AWS Network Firewall** (VPC 수준)
- **Route 53 Resolver DNS Firewall**

## WAF, Shield, Firewall Manager 관계

| 서비스 | 역할 |
|--------|------|
| **WAF** | Layer 7 웹 ACL — 단일 리소스에 적용 |
| **Shield Standard/Advanced** | DDoS 방어 |
| **Firewall Manager** | 여러 계정, 리소스에 **WAF/Shield 규칙 일괄 적용** |

## 시험 빈출 포인트

- "조직 전체 WAF 정책 일관 적용" → Firewall Manager
- "새 계정/리소스 생성 시 자동으로 보안 정책 적용" → Firewall Manager
- 단일 계정, 단일 리소스만 → WAF 직접 (Firewall Manager 불필요)

## 관련 문서

- [[Shield-WAF-NetworkFirewall]], [[AWS-Organizations]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
