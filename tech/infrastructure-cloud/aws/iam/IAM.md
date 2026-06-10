---
tags: [infrastructure, aws, iam, security, identity]
status: done
category: "Infrastructure - AWS"
aliases: ["IAM", "AWS IAM", "Identity and Access Management"]
---

# AWS IAM (Identity and Access Management)

AWS 리소스에 대한 **인증·인가**를 관리하는 글로벌 서비스. **누가(Principal) · 무엇을(Action) · 어디서(Resource) · 어떤 조건에서(Condition)** 접근할 수 있는지를 JSON 정책으로 명시. **Region에 국한되지 않는 글로벌 서비스**.

주요 기능:
- AWS 계정에 대한 **공유 액세스** (다수의 사람·서비스가 단일 계정 사용)
- 서비스·리소스별 **세분화된 권한** 부여
- EC2·Lambda 등 AWS 서비스에서 실행되는 앱을 위한 **Role 기반** 리소스 접근
- **MFA (Multi-Factor Authentication)** 강제
- **자격 증명 연동 (Identity Federation)** — 외부 IdP 연계

## 4가지 엔티티

| 엔티티 | 의미 | 자격증명 |
|--------|------|---------|
| **User** | 사람·서비스의 영구 ID | Access Key·Console 비밀번호 |
| **Group** | User 묶음 (정책 일괄 부여) | — |
| **Role** | 임시 권한 — 누구나 AssumeRole 가능 | **임시 자격증명** (STS) |
| **Policy** | 권한 정의 JSON | — |

**Role 우선 원칙** — 영구 Access Key는 유출 위험. EC2·Lambda·ECS Task에는 **Role 부여**, 사람도 **IAM Identity Center(SSO) → Role AssumeRole**.

### User 액세스 타입

| 타입 | 자격증명 | 용도 |
|------|---------|------|
| **콘솔 액세스** | 비밀번호 + (MFA) | 웹 콘솔 로그인. 별도 로그인 링크(`https://<account>.signin.aws.amazon.com/console`) |
| **프로그래밍 액세스** | Access Key + Secret Access Key | CLI·SDK·API 호출 |

신규 유저 생성 시 기본 권한은 **없음**(빈 정책). Access Key는 **생성 시점에만 노출** — Secret Access Key는 다시 볼 수 없으니 즉시 안전한 곳에 보관(혹은 재발급).

## 정책 타입

| 타입 | 부착 대상 | 우선순위 |
|------|----------|---------|
| **Identity-based** | User·Group·Role | 가장 흔함 |
| **Resource-based** | S3·SQS·KMS 등 리소스 자체 | 크로스 어카운트 가능 |
| **Permission Boundary** | User·Role | 최대 권한 한도 (실권 = identity ∩ boundary) |
| **SCP** (Service Control Policy) | Organization OU·Account | 계정 전체 가드레일 |
| **Session Policy** | AssumeRole 시점 | 임시 세션 한정 |

### AWS 관리형 vs 고객 관리형 vs Inline

| 종류 | 정의 | 비고 |
|------|------|------|
| **AWS Managed Policy** | AWS가 사전 정의 (`AdministratorAccess`, `AmazonS3FullAccess`, `ReadOnlyAccess` 등) | 빠르게 시작·재사용 |
| **Customer Managed Policy** | 사용자가 만들어 재사용 (JSON 또는 비주얼 에디터) | 권장 — 버전 관리·재사용 |
| **Inline Policy** | User/Group/Role에 직접 박힘 | 추적·재사용 어려움. 1:1 매핑 |

## 정책 평가 로직

```
1. 명시적 Deny 있는가? → Deny (즉시 종료)
2. 명시적 Allow 있는가? → Allow
3. 둘 다 없으면 → Deny (default deny)
```

여러 정책이 겹치면 **합집합** — 어느 한 정책이라도 Deny면 차단. SCP·Permission Boundary가 위에 있으면 그것이 한도.

| 평가 우선 | 의미 |
|-----------|------|
| SCP | Organization 가드레일 (없으면 통과) |
| Permission Boundary | 사용자 한도 |
| Resource Policy | 리소스 정책 |
| Identity Policy | 사용자 정책 |
| Session Policy | 세션 한정 |

전부 모두 통과해야 허용.

## 정책 JSON 구조

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowS3GetWithIPAndEncryption",
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "IpAddress": { "aws:SourceIp": "203.0.113.0/24" },
      "StringEquals": { "s3:x-amz-server-side-encryption": "AES256" }
    }
  }]
}
```

| 키 | 의미 |
|----|------|
| `Effect` | Allow / Deny |
| `Action` | API 호출 (와일드카드 `s3:*` 가능) |
| `Resource` | ARN |
| `Condition` | 부가 조건 (IP·MFA·암호화·태그) |
| `Principal` | (Resource 정책에서) 누가 접근하는지 |
| `NotAction`/`NotResource` | 부정 표현, 신중히 사용 |

## Condition Key — 강력한 fine-grained 제어

| Condition | 용도 |
|-----------|------|
| `aws:SourceIp` | 특정 IP·CIDR에서만 |
| `aws:MultiFactorAuthPresent` | MFA 인증된 세션만 |
| `aws:RequestTag/*` | 태그 기반 권한 |
| `aws:PrincipalOrgID` | 같은 Organization 멤버만 |
| `aws:SecureTransport` | HTTPS 강제 |
| `s3:x-amz-server-side-encryption` | 암호화 강제 |
| `kms:ViaService` | 특정 서비스 경유한 KMS 호출만 |

## AssumeRole · STS · 임시 자격증명

Role은 **AssumeRole API**로 임시 자격증명(15분~12시간) 발급. 흐름:

```
1. Principal (User/Service)이 sts:AssumeRole 호출
2. Role의 Trust Policy 확인 (이 Principal이 AssumeRole 허용되는가)
3. STS가 Access Key + Secret + Session Token 반환
4. 이 자격으로 Role의 권한으로 API 호출
```

| 활용 | 설명 |
|------|------|
| **Cross-Account Access** | 계정 A의 Role을 계정 B의 사용자가 AssumeRole |
| **EC2 Instance Profile** | EC2가 자기 Role을 자동 AssumeRole, IMDS로 자격증명 노출 |
| **IRSA** (EKS) | K8s ServiceAccount ↔ IAM Role 매핑 |
| **Federation** | SAML·OIDC로 외부 ID → Role |
| **AssumeRole 체인** | A → AssumeRole(B) → AssumeRole(C) (체인은 1시간 한도) |

Role의 특징:
- **다수의 정책을 하나의 Role에 연결** 가능
- **Region에 국한되지 않음** (글로벌)
- Role의 주체(Principal)는 IAM User · AWS 서비스(EC2·RDS·ELB 등) · 외부 IdP로 인증된 사용자

### Identity Federation — 외부 ID 연동

| 방식 | 시나리오 |
|------|---------|
| **SAML 2.0** | 기업 AD/SSO와 연동 (Okta·ADFS·Azure AD) |
| **OIDC** | GitHub Actions·Kubernetes·외부 OIDC IdP |
| **Web Identity Federation** | Cognito·Google·Facebook (모바일/웹 앱) |
| **IAM Identity Center (구 SSO)** | 다중 계정·SAML 앱 통합 SSO |

외부에서 인증된 사용자 → **STS AssumeRoleWithSAML / AssumeRoleWithWebIdentity** → 임시 자격증명 발급.

## Permission Boundary — 권한 천장

```
실효 권한 = Identity Policy ∩ Permission Boundary
```

위임 관리자에게 **"이 한도 안에서만 사용자·Role을 만들 수 있다"** 보장. 개발자에게 IAM 관리 위임할 때, 자기보다 강한 권한 부여 못 하게 막는 가드.

## 모범 사례

- **Root 계정 사용 금지** — MFA 강제 후 일상 작업은 IAM User/Role
- **최소 권한 원칙** — `*` 정책 회피, 필요한 Action·Resource만
- **MFA 강제** — 콘솔·민감 API 호출
- **Access Key 회전** — 90일 회전, 사용 안 하는 키 삭제
- **CloudTrail로 감사** — 모든 IAM 호출 기록
- **Access Analyzer** — 외부 공개·크로스 어카운트 노출 자동 탐지
- **태그 기반 권한** — `aws:RequestTag` / `aws:ResourceTag`로 동적 분리

## 흔한 실수

- **Access Key를 코드·git에 커밋** — 즉시 자격증명 침해. Role + IRSA·Instance Profile 사용
- **`*` 정책으로 시작해 좁힐 계획** — 계속 그 상태 유지됨. 처음부터 좁게
- **Trust Policy 광범위** — 임의 계정이 AssumeRole 가능. ExternalId·Org 조건 필수
- **Resource Policy + Identity Policy 충돌** — Deny 한쪽이라도 있으면 차단
- **Permission Boundary 무시** — 위임 관리 시 권한 escalation 위험
- **콘솔에서 직접 정책 변경** — 추적 불가. IaC (Terraform·CDK)로 관리
- **Inline policy 남발** — 추적·재사용 어려움. Managed policy 우선

## 면접 / 시험 체크포인트

- IAM은 **글로벌 서비스** — Region 무관
- 정책 평가 순서 — 명시 Deny → 명시 Allow → default Deny
- Identity vs Resource Policy 차이와 평가 시 합집합
- Permission Boundary가 실효 권한에 미치는 영향 (`실효 = Identity ∩ Boundary`)
- AssumeRole의 STS 임시 자격증명 흐름과 Trust Policy
- Cross-Account Access의 ExternalId 패턴
- EC2 Instance Profile · IRSA의 자격증명 노출 메커니즘 (IMDS·OIDC)
- Condition Key로 IP·MFA·암호화 강제하는 fine-grained 제어
- Access Key vs Role — 왜 Role 우선인가
- **Access Key는 생성 시점에만 노출** — 분실 시 재발급
- 신규 User는 기본 **권한 없음**, 콘솔·프로그래밍 액세스 별도 선택
- JSON 정책 구성요소 5가지: **Effect · Principal · Action · Resource · Condition**
- Federation 종류: **SAML · OIDC · Web Identity · IAM Identity Center**

## 출처
- AWS 핵심 서비스 정리 — 학습 메모
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[AWS|EC2 (Instance Profile)]]
- [[AWS-Lambda|Lambda (Execution Role)]]
- [[ECS|ECS (taskRole vs executionRole)]]
- [[S3|S3 (Bucket Policy)]]
- [[VPC|VPC]]
