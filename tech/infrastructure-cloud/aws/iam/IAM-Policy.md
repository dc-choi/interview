---
tags: [infrastructure, aws, iam, security, identity]
status: done
category: "Infrastructure - AWS"
aliases: ["IAM 정책", "IAM Policy 평가 로직"]
---

# IAM 정책 — 타입, 평가 로직, JSON 구조

## 정책 타입

| 타입 | 부착 대상 | 우선순위 |
|------|----------|---------|
| **Identity-based** | User, Group, Role | 가장 흔함 |
| **Resource-based** | S3, SQS, KMS 등 리소스 자체 | 크로스 어카운트 가능 |
| **Permission Boundary** | User, Role | 최대 권한 한도 (실권 = identity ∩ boundary) |
| **SCP** (Service Control Policy) | Organization OU, Account | 계정 전체 가드레일 |
| **Session Policy** | AssumeRole 시점 | 임시 세션 한정 |

### AWS 관리형 vs 고객 관리형 vs Inline

| 종류 | 정의 | 비고 |
|------|------|------|
| **AWS Managed Policy** | AWS가 사전 정의 (`AdministratorAccess`, `AmazonS3FullAccess`, `ReadOnlyAccess` 등) | 빠르게 시작, 재사용 |
| **Customer Managed Policy** | 사용자가 만들어 재사용 (JSON 또는 비주얼 에디터) | 권장 — 버전 관리, 재사용 |
| **Inline Policy** | User/Group/Role에 직접 박힘 | 추적, 재사용 어려움. 1:1 매핑 |

## 정책 평가 로직

```
1. 명시적 Deny 있는가? → Deny (즉시 종료)
2. 명시적 Allow 있는가? → Allow
3. 둘 다 없으면 → Deny (default deny)
```

여러 정책이 겹치면 **합집합** — 어느 한 정책이라도 Deny면 차단. SCP, Permission Boundary가 위에 있으면 그것이 한도.

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
| `Condition` | 부가 조건 (IP, MFA, 암호화, 태그) |
| `Principal` | (Resource 정책에서) 누가 접근하는지 |
| `NotAction`/`NotResource` | 부정 표현, 신중히 사용 |

## Condition Key — 강력한 fine-grained 제어

| Condition | 용도 |
|-----------|------|
| `aws:SourceIp` | 특정 IP, CIDR에서만 |
| `aws:MultiFactorAuthPresent` | MFA 인증된 세션만 |
| `aws:RequestTag/*` | 태그 기반 권한 |
| `aws:PrincipalOrgID` | 같은 Organization 멤버만 |
| `aws:SecureTransport` | HTTPS 강제 |
| `s3:x-amz-server-side-encryption` | 암호화 강제 |
| `kms:ViaService` | 특정 서비스 경유한 KMS 호출만 |

## 관련 문서
- [[IAM|IAM (인덱스)]]
- [[IAM-Entities-Access|IAM 엔티티와 액세스 타입]]
- [[IAM-Role-Federation|AssumeRole과 Federation]]
