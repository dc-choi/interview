---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, security]
status: done
category: "Infrastructure - AWS"
aliases: ["보안, 자격증명 함정", "SAA-C03 Pitfalls Security"]
---

# AWS SAA-C03 빈출 함정 — 보안, 자격증명

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

### IAM, STS, 페더레이션

- **IAM Role** vs **User**: Role은 임시 자격(STS AssumeRole), User는 영구
- **교차 계정 액세스**: 신뢰 계정에 Role → 외부 계정 ARN을 신뢰 정책에 추가
- **권한 경계(Permission Boundary)**: 사용자/역할의 최대 권한 — 정책 결합 결과의 상한
- **SCP**(Organizations): OU/계정 단위 권한 제한. **관리 계정에는 적용 안 됨** (시험 함정)
- **SCP는 허용이 아니라 차단** — IAM 정책으로 별도 허용 필요
- **자격 증명 소스 우선순위**: 환경변수 > 프로파일 > 인스턴스 메타데이터(IMDSv2 권장)
- **IMDSv2**: 토큰 기반(SSRF 방어). 시험에 보안 강화 → IMDSv2
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
  | 종류 | 비용 | 회전 |
  |---|---|---|
  | AWS 소유 키 | 무료 | AWS 관리 |
  | AWS 관리형 키 | 무료 | 1년 자동(못 끔) |
  | 고객 관리형 CMK | $1/월 | 자동 선택, 90~2560일 주기 |
  | 가져온 키 (BYOK) | $1/월 | 수동 |
- **대칭** vs **비대칭**: 대칭은 일반(서명, 암호화). 비대칭은 외부 검증, 공개키 필요 시(서명 검증)
- **다중 리전 키**: 같은 키 ID, 다른 리전. **복제 키**라 같은 머티리얼 — DR 시나리오
- **Custom Key Store**(CloudHSM 백업): 컴플라이언스 요구
- **KMS는 4KB 제한** — 그 이상은 데이터 키(envelope encryption)
- **Secrets Manager** vs **Parameter Store**
  | 항목 | Secrets Manager | Parameter Store |
  |---|---|---|
  | 비용 | $0.40/secret/월 + API | 무료(Standard) |
  | 자동 회전 | Lambda 통합 | 없음 |
  | 크기 | 64KB | 4KB(Std)/8KB(Advanced) |
  | RDS 통합 | O | X |
- **ACM**: TLS 인증서 무료. **ELB, CloudFront, API Gateway, App Runner**에 직접 통합. **EC2로 추출 불가** — 시험에서 EC2 HTTPS 요구 시 ELB+ACM
- **ACM Private CA**: 사내 인증서 발급. IoT, 앱 간 mTLS
- **ACM 자동 갱신**: DNS 검증 시. Email 검증은 수동

### Shield, WAF, 기타

- **Shield Standard**(무료): L3/L4 DDoS. CloudFront, Route 53에 자동
- **Shield Advanced**($3000/월): EC2, ELB, CloudFront, GA, Route 53. **DDoS 비용 보호** + Cost Spike 보상
- **WAF**: L7. ALB, API Gateway, CloudFront, AppSync, Cognito User Pool, App Runner
- **WAF 룰**: IP 매치, 문자열, 정규식, SQLi, XSS, **Rate-based**(IP당 분당 요청), 관리형 룰(AWS, 마켓플레이스)
- **Network Firewall**: VPC 수준 stateful 방화벽 (Suricata 호환). FQDN 필터링 — SG로 못함
- **Firewall Manager**: Organizations 멀티 계정에 WAF, Shield, SG, Network Firewall 일괄 적용
- **GuardDuty**: ML 기반 위협 탐지. VPC Flow Logs, CloudTrail, DNS 로그 분석 — **로그 활성화 불필요**
- **Macie**: S3 PII, 기밀 탐지 (Comprehend 사용)
- **Inspector**: EC2, ECR, Lambda 취약점 스캔 (구 버전은 EC2 에이전트만, 신규는 자동)
- **Detective**: GuardDuty 발견 사항 근본 원인 분석

## 관련 문서

[[IAM]], [[Cognito]], [[KMS]], [[Secrets-Manager]], [[SSM-Parameter-Store]], [[ACM]], [[Shield-WAF-NetworkFirewall]], [[Firewall-Manager]]

## 출처

- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
