---
tags: [infrastructure, aws, iam, security, identity]
status: done
verified_at: 2026-08-12
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
| **SCP** (Service Control Policy) | Organization OU, Account | 계정 전체 가드레일 (principal 기준) |
| **RCP** (Resource Control Policy) | Organization OU, Account | 계정 전체 가드레일 (리소스 기준) |
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

정책이 여러 개 겹칠 때의 결합 방식은 타입별로 다르다 (아래 불릿 참고).

| 평가 우선 | 의미 |
|-----------|------|
| 명시적 Deny | 어느 정책에서든 최우선 차단 |
| RCP (Resource Control Policy) | Organization 리소스 가드레일 |
| SCP | Organization 계정 가드레일 (없으면 통과) |
| Resource Policy | 리소스 정책 |
| Identity Policy | 사용자 정책 |
| Permission Boundary | 사용자 한도 |
| Session Policy | 세션 한정 |

- 같은 계정 안에서 identity-based policy와 resource-based policy는 **합집합(OR)** — 둘 중 하나만 Allow해도 허용된다 (S3 버킷 정책만으로 같은 계정 접근을 여는 패턴이 여기 해당). 단 IAM role trust policy, KMS key policy는 예외로 리소스 정책의 명시적 Allow가 필요하고, 일부 서비스도 같은 계정에서 명시적 Allow를 요구할 수 있다.
- SCP, RCP, Permission Boundary, Session Policy는 **한도(교집합)** — 이들이 허용하지 않으면 거부된다. 다만 같은 계정에서 리소스 정책이 IAM 사용자 ARN이나 role session ARN에 직접 권한을 주면 identity policy, permission boundary, session policy의 암시적 deny는 최종 결정에 영향을 주지 않는다.
- **교차 계정** 요청일 때만 요청자 계정의 identity policy와 리소스 계정의 resource policy가 모두 Allow해야 한다.
- 어느 정책에서든 **명시적 Deny가 우선**한다.

## 정책 JSON 구조

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowS3PutWithIPAndEncryption",
    "Effect": "Allow",
    "Action": "s3:PutObject",
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
| `s3:x-amz-server-side-encryption` | 업로드(PUT) 요청의 암호화 강제 |
| `kms:ViaService` | 특정 서비스 경유한 KMS 호출만 |

## IAM Policy Simulator로 사전 검증

Policy Simulator는 identity policy, permissions boundary, SCP와 직접 넣어 준 resource-based policy를 실제 API 호출 없이 action, resource, context key 조합으로 평가한다. 아직 부착하지 않은 새 policy도 붙여 넣어 실험할 수 있고, 결과가 allow나 explicit deny일 때는 그 결과를 만든 policy를 보여 준다 (implicit deny는 매칭 statement가 없다는 뜻이라 추적 대상이 아니다). 다만 SCP는 결정만 알려 주고 매칭 statement는 보안상 노출하지 않는다. 2026-07-30부터 simulator는 IAM 콘솔 안으로 들어왔고 기존 standalone 콘솔(`policysim.aws.amazon.com`)은 유지보수하지 않는다.

시뮬레이션 결과를 운영 권한의 증명으로 보지는 않는다. 실제 요청을 실행하지 않고 production의 실제 context 값을 자동으로 가져오지 않으며, RCP는 지원하지 않고 IAM role에 붙는 resource-based policy(trust policy)도 시뮬레이션 대상이 아니다. VPC endpoint policy, role chaining, 한 리소스에 resource-based policy가 여러 개 걸린 구성에서도 실제 동작과 결과가 갈릴 수 있다. simulator로 빠르게 좁힌 뒤 별도 테스트 계정이나 안전한 read action으로 실제 환경을 확인한다.

## 출처

- [AWS IAM — IAM policy testing with the policy simulator](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html)
- [AWS IAM — How to simulate policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/policies_policy-simulator-how-to.html)
- [AWS What's New — IAM Policy Simulator moves to the IAM console and adds additional capabilities (2026-07-30)](https://aws.amazon.com/about-aws/whats-new/2026/07/iam-policy-simulator-iam-console/)
- [Amazon S3 — Bucket policy examples using condition keys](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html)
- [AWS IAM — Policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
- [AWS IAM — Determining whether a request is allowed or denied within an account](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html)
- [Sungmin Kim 강사 — IAM이란?](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43727)
- [Sungmin Kim 강사 — IAM 정책 시뮬레이터](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43728)

## 관련 문서
- [[IAM|IAM (인덱스)]]
- [[IAM-Entities-Access|IAM 엔티티와 액세스 타입]]
- [[IAM-Role-Federation|AssumeRole과 Federation]]
