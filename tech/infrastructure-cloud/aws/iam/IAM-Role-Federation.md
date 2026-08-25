---
tags: [infrastructure, aws, iam, security, identity]
status: done
verified_at: 2026-08-21
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

### GitHub Actions OIDC — 장기 액세스 키 없는 배포 파이프라인

CI 워크플로우에 AWS 액세스 키를 리포지토리 시크릿으로 박아 두는 대신, GitHub가 발급한 OIDC 토큰으로 `AssumeRoleWithWebIdentity`를 호출해 임시 자격증명을 받는 구조. 계정에 IdP `https://token.actions.githubusercontent.com`를 등록하고 role의 신뢰 정책에서 클레임을 검증한다.

```json
{
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:my-org/my-repo:ref:refs/heads/main"
    }
  }
}
```

`sub` 클레임이 접근 범위를 정한다. 브랜치는 `repo:OWNER/REPO:ref:refs/heads/BRANCH`, 배포 환경은 `repo:OWNER/REPO:environment:prod` 형식이다. 2026-07-15 이후 생성했거나 불변 식별자에 옵트인한 리포지토리는 소유자와 리포 ID가 들어간 `repo:OWNER@123456/REPO@456789:...` 형태를 쓴다 (GitHub Enterprise Server 제외).

설계에서 갈리는 지점 세 가지.

- `sub`를 `repo:my-org/my-repo:*` 같은 와일드카드로 두면 그 리포의 어떤 브랜치, 어떤 워크플로우든 role을 가져간다. 운영 계정용 role은 브랜치나 environment까지 좁힌다.
- `aud` 조건을 빼면 다른 대상으로 발급된 토큰까지 통과할 여지가 생긴다. 두 조건을 함께 건다.
- 워크플로우 쪽에는 `permissions: id-token: write`가 있어야 토큰을 요청할 수 있다. 없으면 자격증명 설정 단계에서 실패한다.

## Permission Boundary — 권한 천장

```
실효 권한 = Identity Policy ∩ Permission Boundary
```

위임 관리자가 이 한도 안에서만 사용자와 Role을 만들 수 있게 보장한다. 개발자에게 IAM 관리 위임할 때, 자기보다 강한 권한 부여 못 하게 막는 가드.

## 출처
- [GitHub Docs, Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [AWS STS API Reference, AssumeRole](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) — DurationSeconds 900초(15분)~43200초(12시간)
- [AWS IAM User Guide, IAM roles, Roles terms and concepts](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html) — role chaining 최대 1시간

## 관련 문서
- [[IAM|IAM (인덱스)]]
- [[IAM-Policy|IAM 정책]]
- [[IAM-Best-Practices|IAM 모범 사례와 체크포인트]]
- [[ECS-Secrets-Injection|ECS 런타임 시크릿 주입 (런타임 시크릿과의 경계)]]
- [[GitHub-Actions|GitHub Actions]]
