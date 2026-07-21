---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, security]
status: done
category: "Infrastructure - AWS"
aliases: ["보안, 자격증명 함정", "SAA-C03 Pitfalls Security"]
verified_at: 2026-07-21
---

# AWS SAA-C03 빈출 함정 — 보안, 자격증명

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

### IAM, STS, 페더레이션

- **IAM Role** vs **User**: Role 세션은 STS 임시 자격을 사용한다. IAM User는 장기 자격을 가질 수 있지만 사람의 신규 접근에는 페더레이션과 임시 자격을 우선 검토
- **교차 계정 액세스**: 대상 계정 Role의 신뢰 정책과 호출 주체의 identity policy 양쪽에서 `AssumeRole` 경로를 허용
- **권한 경계(Permissions Boundary)**: identity-based policy가 사용자나 역할에 부여할 수 있는 권한의 상한. Resource-based policy, SCP/RCP, session policy와 명시적 Deny까지 전체 평가 문맥을 함께 봄
- **SCP**(Organizations): OU/계정 단위 권한 제한. **관리 계정에는 적용 안 됨** (시험 함정)
- **SCP는 권한을 부여하지 않음** — 계정의 IAM, resource policy 등에서 별도 허용이 필요하며 SCP의 Allow/Deny와 명시적 Deny 평가도 함께 적용
- **자격 증명 소스 우선순위**: 환경변수, shared profile, web identity, container/instance role 등의 provider chain은 SDK와 버전별로 다르므로 해당 SDK 문서를 확인
- **IMDSv2**: 세션 토큰 기반으로 일부 SSRF 위험을 완화한다. `HttpTokens=required`, hop limit, 네트워크와 애플리케이션 방어를 함께 구성
- **STS**: AssumeRole, AssumeRoleWithSAML, AssumeRoleWithWebIdentity(OIDC)
- **SAML 2.0 페더레이션**: 엔터프라이즈 IdP(AD FS). **신규는 IAM Identity Center(구 SSO)** 권장
- **Directory Service**
  | 종류 | 용도 |
  |---|---|
  | AWS Managed AD | 완전 매니지드 AD |
  | AD Connector | 온프레 AD로 프록시 |
  | Simple AD | 작은 워크로드, AD 호환 |
- **IAM Identity Center**: 멀티 계정, 외부 IdP, SAML. Workspaces, QuickSight 통합

### Cognito

- **User Pool**: 회원가입, 로그인, MFA, 소셜 로그인 (인증)
- **Identity Pool**(Federated Identities): 인증된 사용자에 **임시 AWS 자격** 부여 (인가)
- 둘 다 필요한 경우 많음: User Pool 토큰 → Identity Pool → AWS 자격증명

### KMS, Secrets, Parameter Store, ACM

- **KMS 키 종류**
  | 구분 | 비용 | 회전 |
  |---|---|---|
  | AWS 소유 키 | 고객이 키를 보거나 관리하지 않음. 별도 KMS 키 저장 요금 없음 | AWS 관리 |
  | AWS 관리형 키 | 계정에 보이지만 정책과 수명 주기는 AWS 서비스가 관리. 별도 월별 키 저장 요금 없음 | AWS 관리형 일정 |
  | 고객 관리형 키 | 키 저장과 API 요청 등에 현재 KMS 요금 적용 | 지원되는 대칭 암호화 키는 자동 또는 온디맨드 회전 구성 가능 |
  | 외부 키 구성 요소 가져오기 | 고객 관리형 키의 `EXTERNAL` origin이며 별도 소유권 종류가 아님 | 자동 회전은 지원하지 않음. 지원되는 키는 새 키 구성 요소를 가져오거나 온디맨드 회전 기능 검토 |
- **대칭** vs **비대칭**: 대칭 암호화 KMS 키는 암복호화와 데이터 키 생성에 사용한다. HMAC 키는 별도 대칭 키 유형이고, 비대칭 키는 key spec과 key usage에 따라 암복호화, 서명 검증 또는 키 합의에 사용
- **다중 리전 키**: 같은 키 ID, 다른 리전. **복제 키**라 같은 머티리얼 — DR 시나리오
- **Custom Key Store**: AWS CloudHSM key store 또는 External Key Store(XKS)를 사용해 키 재료 통제 요구를 충족하는 선택지. 가용성, 지연, 비용과 운영 책임이 늘어남
- **KMS Encrypt 크기**: 대칭 암호화 KMS 키의 직접 `Encrypt` 평문은 최대 4,096바이트이며 비대칭 키는 key spec과 알고리즘별 한도가 더 작다. 큰 데이터는 데이터 키를 이용한 envelope encryption 사용
- **Secrets Manager** vs **Parameter Store**
  | 항목 | Secrets Manager | Parameter Store |
  |---|---|---|
  | 비용 | secret 저장과 API 호출에 리전별 현재 요금 적용 | Standard parameter 저장은 추가 요금이 없지만 API 처리량, 고급 파라미터, 상위 처리량 등에 요금 가능 |
  | 자동 회전 | Lambda 통합 | 없음 |
  | 크기 | 64KB | 4KB(Std)/8KB(Advanced) |
  | RDS 통합 | O | X |
- **ACM**: 통합 AWS 서비스용 비내보내기 Public 인증서는 추가 인증서 요금이 없고 개인키를 추출할 수 없다. 내보내기 가능 Public 인증서는 별도 요금으로 EC2, 컨테이너, 온프레미스에 배포할 수 있으며 갱신본 재배포는 고객 책임이다. 시험 문제의 인증서 유형과 배포 대상을 먼저 구분한다.
- **ACM Private CA**: 사내 인증서 발급. IoT, 앱 간 mTLS
- **ACM 관리형 갱신**: 인증서가 지원되는 AWS 서비스에서 사용 중이고 검증 조건이 유지되어야 한다. DNS 검증은 CNAME을 유지하면 자동화하기 쉽고, email 검증은 갱신 검증 메일에 운영자가 응답해야 할 수 있다

### Shield, WAF, 기타

- **Shield Standard**: 모든 AWS 고객에게 별도 구독 없이 제공되는 일반적인 네트워크, 전송 계층 DDoS 보호. 보호 범위와 자동 완화 수준은 리소스, 공격 유형에 따라 다름
- **Shield Advanced**: 지원 리소스에 강화된 탐지, 완화, DDoS Response Team 지원과 조건부 비용 보호를 제공하는 유료 구독. 월 구독, 약정, 데이터 전송과 조직 적용 조건은 현재 요금과 서비스 약관 확인
- **WAF**: L7. ALB, API Gateway, CloudFront, AppSync, Cognito User Pool, App Runner
- **WAF 룰**: IP 매치, 문자열, 정규식, SQLi, XSS, 관리형 룰과 **Rate-based rule**. Rate-based rule은 source/forwarded IP, ASN, custom key 조합 또는 count-all 같은 aggregation key별로 1, 2, 5, 10분 evaluation window에서 요청률을 근사 평가하며 정확한 hard quota가 아님
- **Network Firewall**: VPC 수준 stateful 방화벽 (Suricata 호환). FQDN 필터링 — SG로 못함
- **Firewall Manager**: Organizations 멀티 계정에 WAF, Shield, SG, Network Firewall 일괄 적용
- **GuardDuty**: 위협 인텔리전스와 ML 등을 사용해 기본 데이터 소스와 선택한 보호 계획의 이벤트를 분석한다. 기본 데이터 소스는 GuardDuty가 독립적으로 가져오므로 고객이 CloudTrail trail이나 VPC Flow Log 구독을 켤 필요가 없지만 보호 계획별 활성화, 리전 범위와 비용은 별도
- **Macie**: 관리형 데이터 식별자와 ML 등을 이용해 S3 객체의 민감 데이터를 발견, 분류한다. Amazon Comprehend를 호출하는 서비스라고 단정하지 않음
- **Inspector**: EC2, ECR 컨테이너 이미지, Lambda 함수의 지원되는 취약점과 노출을 지속 스캔. EC2 스캔 방식과 사전 조건은 agent-based, agentless 설정에 따라 다름
- **Detective**: GuardDuty 발견 사항 근본 원인 분석

## 관련 문서

[[IAM]], [[Cognito]], [[KMS]], [[Secrets-Manager]], [[SSM-Parameter-Store]], [[ACM]], [[Shield-WAF-NetworkFirewall]], [[Firewall-Manager]]

## 출처

- [AWS KMS key 유형](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html)
- [AWS KMS key rotation](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html)
- [AWS KMS 요금](https://aws.amazon.com/kms/pricing/)
- [Secrets Manager 요금](https://aws.amazon.com/secrets-manager/pricing/)
- [Systems Manager Parameter Store 요금](https://aws.amazon.com/systems-manager/pricing/)
- [ACM managed renewal](https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html)
- [AWS Shield 기능과 적용 범위](https://docs.aws.amazon.com/waf/latest/developerguide/ddos-overview.html)
- [GuardDuty 데이터 소스](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_data-sources.html)
- [Macie 작동 방식](https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html)
- [AWS WAF rate-based rule 설정](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html)
