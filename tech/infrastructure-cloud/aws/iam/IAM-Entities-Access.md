---
tags: [infrastructure, aws, iam, security, identity]
status: done
verified_at: 2026-09-03
category: "Infrastructure - AWS"
aliases: ["IAM 엔티티", "IAM User Group Role 액세스 타입"]
---

# IAM 엔티티와 액세스 타입

AWS 리소스에 대한 **인증, 인가**를 관리하는 글로벌 서비스. **누가(Principal), 무엇을(Action), 어디서(Resource), 어떤 조건에서(Condition)** 접근할 수 있는지를 JSON 정책으로 명시. **Region에 국한되지 않는 글로벌 서비스**.

주요 기능:
- AWS 계정에 대한 **공유 액세스** (다수의 사람, 서비스가 단일 계정 사용)
- 서비스, 리소스별 **세분화된 권한** 부여
- EC2, Lambda 등 AWS 서비스에서 실행되는 앱을 위한 **Role 기반** 리소스 접근
- **MFA (Multi-Factor Authentication)** 강제
- **자격 증명 연동 (Identity Federation)** — 외부 IdP 연계

## IAM 구성 요소: identity와 policy

| 구성 요소 | 의미 | 자격증명 |
|--------|------|---------|
| **User** | 사람, 서비스의 영구 ID | Access Key, Console 비밀번호 |
| **Group** | User 묶음 (정책 일괄 부여) | — |
| **Role** | 신뢰 정책과 호출자 권한이 허용한 principal이 AssumeRole해 사용 | **임시 자격증명** (STS) |
| **Policy** | 권한 정의 JSON | — |

AWS 용어에서 IAM identity는 User, Group, Role이다. 이 가운데 인증 주체로 직접 사용할 수 있는 IAM entity는 User와 Role이며, Group은 User의 모음이다. Policy는 권한을 정의해 identity나 리소스에 연결하는 IAM 리소스이지 identity나 entity가 아니다.

Role을 assume하려면 일반적으로 role의 trust policy가 principal을 신뢰하고 호출자 측 identity policy도 대상 role에 대한 `sts:AssumeRole`을 허용해야 한다. 같은 계정의 IAM user ARN을 trust policy의 `Principal`에 직접 넣는 경우처럼 resource-based grant만으로 허용되는 예외가 있다.

**Role 우선 원칙** — 영구 Access Key는 유출 위험. EC2, Lambda, ECS Task에는 **Role 부여**, 사람도 **IAM Identity Center(SSO) → Role AssumeRole**.

## User 액세스 타입

| 타입 | 자격증명 | 용도 |
|------|---------|------|
| **콘솔 액세스** | 비밀번호 + (MFA) | 웹 콘솔 로그인. 별도 로그인 링크(`https://<account>.signin.aws.amazon.com/console`) |
| **프로그래밍 액세스** | Access Key + Secret Access Key | CLI, SDK, API 호출 |

신규 유저 생성 시 기본 권한은 **없음**(빈 정책). Access Key는 **생성 시점에만 노출** — Secret Access Key는 다시 볼 수 없으니 즉시 안전한 곳에 보관(혹은 재발급).

## 출처

- [AWS 공식 문서, IAM identities](https://docs.aws.amazon.com/IAM/latest/UserGuide/id.html)
- [AWS 공식 문서, IAM roles and trust policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html#id_roles_terms-and-concepts)
- [AWS STS API, AssumeRole permissions](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)

## 관련 문서
- [[IAM|IAM (인덱스)]]
- [[IAM-Policy|IAM 정책]]
- [[IAM-Role-Federation|AssumeRole과 Federation]]
