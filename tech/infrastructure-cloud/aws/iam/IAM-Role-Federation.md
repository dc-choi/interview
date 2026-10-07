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

## 계정 간 Bedrock 호출 — 역할 위임과 추론 권한

계정 B의 Lambda가 계정 A의 권한으로 Bedrock을 호출하는 경우, 세 가지 정책과 실제 요청 자격증명을 나누어 확인한다. 2026-10-07 공식 IAM과 Bedrock 문서로 대조한 범위다.

1. **A 역할의 trust policy**에서 B의 Lambda 실행 역할을 `Principal`로 지정하고 `sts:AssumeRole`을 허용한다.
2. **B 실행 역할의 identity policy**에서 A의 대상 역할 ARN에 대한 `sts:AssumeRole`을 허용한다. A가 B를 신뢰한다는 설정만으로 B의 호출 권한이 생기지는 않는다.
3. **A 역할의 permissions policy**에 사용할 모델과 API의 권한을 둔다. 일반 추론에는 `bedrock:InvokeModel`, 스트리밍에는 `bedrock:InvokeModelWithResponseStream`을 확인하고, inference profile 등 추가 리소스를 쓰면 해당 권한도 확인한다. 전체 Bedrock 권한을 기본값으로 복사하지 않는다.
4. Lambda에서 A 역할을 AssumeRole한 뒤 반환된 access key, secret key와 session token으로 `bedrock-runtime` 클라이언트를 구성한다. B의 기존 실행 자격증명으로 만든 클라이언트를 계속 쓰면 정책을 추가해도 A 역할로 호출한 것이 아니다.

실패를 진단할 때는 STS의 역할 위임 실패와 Bedrock의 모델 호출 실패를 분리한다. 전자는 양쪽 정책과 조직의 권한 제한을, 후자는 실제 호출 역할, 리전, 모델 식별자와 모델 사용 전제조건을 확인한다. 세션 만료와 갱신도 처리하고 자격증명을 로그에 남기지 않는다. 이 구성은 IAM 권한 경계이며, 비공개 네트워크 경로는 [[Bedrock-Private-Access|Bedrock 비공개 연결]]에서 별도로 설계한다.

## IAM 사용자 MFA — GetSessionToken

2026-10-07 공식 STS API 문서로 확인한 범위다. IAM 사용자의 장기 자격증명으로 MFA가 필요한 API를 호출해야 할 때, `GetSessionToken`에 MFA 장치의 `SerialNumber`와 6자리 `TokenCode`를 전달해 임시 자격증명을 받는다. 사람의 일상 접근은 federation을 우선하고, 이 절차를 장기 키 신규 발급의 기본 경로로 삼지는 않는다.

- 응답의 `AccessKeyId`, `SecretAccessKey`, `SessionToken`을 함께 사용하고 `Expiration`을 확인한다. 세션 토큰을 빠뜨리거나 만료된 세션을 재사용하지 않는다.
- IAM 사용자 세션은 900~129600초(15분~36시간), 기본 43200초(12시간)다. `AssumeRole`의 최대 시간과 혼동하지 않는다.
- `GetSessionToken`은 MFA 인증 작업이므로 호출 허용 정책을 추가해서 권한을 높이는 API가 아니다. 반환된 세션의 권한은 원래 IAM 사용자 권한을 바탕으로 하며, MFA 인증이 리소스 작업의 허용을 대신하지 않는다.
- 이 세션으로 다른 STS API를 호출할 때는 `AssumeRole`과 `GetCallerIdentity`만 허용된다. 임시 세션으로 `GetSessionToken`을 반복 호출해 갱신하는 구조를 만들지 않는다. 재발급은 원래 장기 자격증명으로 호출한다.

예를 들어 MFA 조건이 붙은 S3 접근에서는 MFA 세션 발급 성공과 대상 버킷 조회 성공을 각각 확인한다. 운영에서는 자격증명을 로그나 저장소에 남기지 않고, 사용자 정책과 리소스 정책의 허용 범위도 함께 점검한다.

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

## IAM Roles Anywhere — AWS 밖 워크로드의 임시 자격증명

온프레미스 서버와 컨테이너가 AWS 리소스를 호출할 때 장기 AWS 액세스 키 대신 X.509 인증서로 임시 자격증명을 발급받는 방식이다. 인증서에 연결된 개인 키로 `CreateSession` 요청에 서명하므로, 장기 AWS 키를 없애도 개인 키 보호와 인증서 수명 관리는 남는다.

1. 신뢰할 CA를 **trust anchor**로 등록한다.
2. **profile**에 사용할 IAM role과 필요하면 권한을 제한할 session policy를 지정한다.
3. role의 trust policy에서 `rolesanywhere.amazonaws.com`에 `sts:AssumeRole`, `sts:TagSession`, `sts:SetSourceIdentity`를 허용한다. `aws:SourceArn` 조건에 허용할 trust anchor ARN을 지정하고, 필요하면 인증서의 Subject나 Issuer 조건도 적용한다. 서비스 principal만 허용하면 같은 계정의 다른 trust anchor가 발급한 인증서도 role을 사용할 수 있으므로 신뢰 범위를 명시한다.
4. 인증서 신뢰 체인, 서명과 role 조건 검증을 거쳐 임시 자격증명을 받고 AWS API를 호출한다. session policy는 세션 권한을 제한하는 용도다.

IAM role 자체와 달리 Roles Anywhere 리소스는 리전 단위다. 함께 사용하는 trust anchor와 profile은 같은 계정과 리전에 둔다.

### SDK 연결과 운영 경계

- 공식 credential helper는 인증서 서명과 자격증명 발급을 처리한다. SDK의 `credential_process`에 연결할 수 있으며, 해당 SDK의 만료 전 재호출과 갱신 동작을 확인한다.
- `serve` 모드는 로컬 IMDSv2 호환 endpoint로 자격증명을 제공한다. 그 endpoint에 접근 가능한 다른 로컬 프로세스도 자격증명을 받을 수 있으므로, localhost라는 이유만으로 워크로드별 권한 격리가 완성되지는 않는다.
- 여러 워크로드 앞에 별도 자격증명 게이트웨이를 두는 것은 선택적인 설계다. 도입한다면 호출 워크로드와 허용 role의 매핑 검증, 게이트웨이 장애와 갱신 실패 대응을 추가로 설계한다.

이 절은 2026-10-07 공식 문서로 확인했다. 기존 STS와 GitHub OIDC 절 전체를 재검증한 날짜는 아니다.

## Account access manager — 기존 역할의 중앙 할당

Account access manager(AAM)는 각 AWS 계정에 존재하는 IAM role을 IAM Identity Center organization instance의 사용자와 그룹에 할당한다. 계정마다 다른 역할을 유지할 때 적합하며, 여러 계정에 공통 권한을 배포하는 permission set과 함께 사용할 수 있다. 역할 생성과 정책 관리는 계속 IAM 또는 IaC에서 수행한다.

설정은 다음 경계를 나누어 확인한다.

1. Organizations와 Identity Center의 organization instance를 준비한다. account instance는 지원하지 않는다. AAM은 관리 계정에서 해당 Identity Center의 기본 리전에 활성화한다.
2. 대상 role의 기존 trust policy에 `account-access.amazonaws.com`이 `sts:AssumeRole`과 `sts:SetContext`를 호출할 수 있는 statement를 추가한다. `aws:SourceAccount`와 `aws:SourceArn`으로 AAM을 소유한 계정과 application ARN을 한정해 confused deputy를 방지한다.
3. 사용자 또는 그룹, 대상 계정과 role을 연결한다. 콘솔이 계정 안의 role 목록을 자동 탐색하지 않으므로 이름을 미리 확인한다. 할당 관리는 관리 계정 또는 위임 관리자에서 수행할 수 있다.
4. 사용자는 account access portal로 역할에 접근한다. CLI는 브라우저 로그인 뒤 `aws login`으로 임시 역할 자격증명을 받는 경로를 제공한다. permission set의 `aws configure sso`와 `aws sso login` 경로와 구분한다.

IdP 속성을 session tag로 전달해 ABAC에 쓴다면 trust policy의 `sts:TagSession`도 검토한다. 역할을 할당했다는 사실만으로 리소스 작업이 허용되지는 않는다. 실제 역할 권한과 조직 정책을 함께 확인한다.

이 절은 2026-10-07 공식 문서로 확인했다. 기존 STS와 GitHub OIDC 절의 검증 날짜를 바꾸지는 않는다.

## Permission Boundary — 권한 천장

```
실효 권한 = Identity Policy ∩ Permission Boundary
```

위임 관리자가 이 한도 안에서만 사용자와 Role을 만들 수 있게 보장한다. 개발자에게 IAM 관리 위임할 때, 자기보다 강한 권한 부여 못 하게 막는 가드.

## 출처
- [AWS IAM User Guide, Delegate access across AWS accounts using IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html)
- [AWS Bedrock User Guide, Prerequisites for running model inference](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-prereq.html)
- [Use a cross-account to invoke Amazon Bedrock in another account — AWS re:Post](https://repost.aws/knowledge-center/bedrock-invoke-with-cross-account)
- [AWS STS API Reference, GetSessionToken](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html)
- [AWS IAM User Guide, Account access manager](https://docs.aws.amazon.com/IAM/latest/UserGuide/account-access-manager.html)
- [AWS IAM User Guide, Getting started with account access manager](https://docs.aws.amazon.com/IAM/latest/UserGuide/account-access-manager-getting-started.html)
- [AWS IAM User Guide, Prepare your IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/aam-prepare-roles.html)
- [AWS IAM User Guide, Assign and remove access](https://docs.aws.amazon.com/IAM/latest/UserGuide/aam-assign-remove-access.html)
- [AWS IAM Roles Anywhere User Guide, What is IAM Roles Anywhere?](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/introduction.html)
- [AWS IAM Roles Anywhere User Guide, The authentication process](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/authentication.html)
- [AWS IAM Roles Anywhere User Guide, The trust model](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/trust-model.html)
- [AWS IAM Roles Anywhere User Guide, Get temporary security credentials](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/credential-helper.html)
- [GitHub Docs, Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [AWS STS API Reference, AssumeRole](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) — DurationSeconds 900초(15분)~43200초(12시간)
- [AWS IAM User Guide, IAM roles, Roles terms and concepts](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html) — role chaining 최대 1시간

## 관련 문서
- [[IAM|IAM (인덱스)]]
- [[IAM-Policy|IAM 정책]]
- [[IAM-Best-Practices|IAM 모범 사례와 체크포인트]]
- [[ECS-Secrets-Injection|ECS 런타임 시크릿 주입 (런타임 시크릿과의 경계)]]
- [[GitHub-Actions|GitHub Actions]]
