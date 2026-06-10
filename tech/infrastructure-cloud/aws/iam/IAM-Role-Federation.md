---
tags: [infrastructure, aws, iam, security, identity]
status: done
category: "Infrastructure - AWS"
aliases: ["AssumeRole과 STS", "IAM Federation과 Permission Boundary"]
---

# IAM Role — AssumeRole, STS, Federation

## AssumeRole, STS, 임시 자격증명

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
| **Federation** | SAML, OIDC로 외부 ID → Role |
| **AssumeRole 체인** | A → AssumeRole(B) → AssumeRole(C) (체인은 1시간 한도) |

Role의 특징:
- **다수의 정책을 하나의 Role에 연결** 가능
- **Region에 국한되지 않음** (글로벌)
- Role의 주체(Principal)는 IAM User, AWS 서비스(EC2, RDS, ELB 등), 외부 IdP로 인증된 사용자

## Identity Federation — 외부 ID 연동

| 방식 | 시나리오 |
|------|---------|
| **SAML 2.0** | 기업 AD/SSO와 연동 (Okta, ADFS, Azure AD) |
| **OIDC** | GitHub Actions, Kubernetes, 외부 OIDC IdP |
| **Web Identity Federation** | Cognito, Google, Facebook (모바일/웹 앱) |
| **IAM Identity Center (구 SSO)** | 다중 계정, SAML 앱 통합 SSO |

외부에서 인증된 사용자 → **STS AssumeRoleWithSAML / AssumeRoleWithWebIdentity** → 임시 자격증명 발급.

## Permission Boundary — 권한 천장

```
실효 권한 = Identity Policy ∩ Permission Boundary
```

위임 관리자에게 **"이 한도 안에서만 사용자, Role을 만들 수 있다"** 보장. 개발자에게 IAM 관리 위임할 때, 자기보다 강한 권한 부여 못 하게 막는 가드.

## 관련 문서
- [[IAM|IAM (인덱스)]]
- [[IAM-Policy|IAM 정책]]
- [[IAM-Best-Practices|IAM 모범 사례와 체크포인트]]
