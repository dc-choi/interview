---
tags: [infrastructure, aws, iam, security, identity]
status: done
category: "Infrastructure - AWS"
aliases: ["IAM 모범 사례", "IAM 면접 체크포인트"]
verified_at: 2026-09-30
---

# IAM 모범 사례, 흔한 실수, 체크포인트

## 모범 사례

- **Root 사용자 일상 사용 금지** — passkey 또는 MFA로 보호하고 AWS가 root credentials를 요구하는 root-only task에만 사용. 일상 작업은 federation과 IAM Role의 임시 자격증명을 우선
- **최소 권한 원칙** — `*` 정책 회피, 필요한 Action, Resource만
- **MFA 강제** — 콘솔, 민감 API 호출
- **장기 Access Key 최소화** — 사람은 federation, workload는 IAM Role의 임시 자격증명을 우선. 장기 키가 불가피하면 사용 사례에 필요한 시점에 갱신하고 미사용 키를 제거하며 노출을 모니터링
- **CloudTrail로 감사** — 모든 IAM 호출 기록
- **Access Analyzer** — 외부 공개, 크로스 어카운트 노출 자동 탐지
- **태그 기반 권한** — `aws:RequestTag` / `aws:ResourceTag`로 동적 분리

## Access Analyzer의 분석 범위와 조치 경계

이 절은 2026-10-09 AWS 공식 문서 기준이다. 정책 문법 검증, 외부 접근 분석과 미사용 권한 분석은 서로 다른 질문에 답한다.

| 기능 | 확인하는 내용 | 해석 경계 |
|---|---|---|
| 정책 검증 | 정책 문법과 AWS 모범 사례 위반 | 검사 통과만으로 업무에 필요한 최소 권한임을 증명하지 않는다 |
| 외부 접근 분석 | 신뢰 영역인 계정 또는 조직 밖에 허용된 리소스 접근 | 지원 리소스의 정책 분석이다. 실제 침입이나 API 실행 기록을 뜻하지 않는다 |
| 미사용 접근 분석 | 사용하지 않는 역할, access key, 비밀번호와 서비스/작업 권한 | 사용 이력에 근거한 검토 대상이다. 삭제 전에 정기 배치와 비상 복구 경로를 확인한다 |

외부 접근 분석기는 지원 리소스를 사용하는 리전마다 구성한다. 미사용 접근 결과는 리전별로 달라지지 않으므로 같은 범위를 여러 리전에 중복 생성할 필요가 없고, 생성한 분석기마다 과금될 수 있다.

Finding의 접근이 의도된 것인지 먼저 판단한다. `Archived`는 결과를 활성 목록에서 숨기는 상태 변경이며 권한 회수가 아니다. 의도하지 않은 접근은 실제 정책을 수정하고 재분석으로 해소 여부를 확인한다. AI 요약을 사용하더라도 원본 finding과 정책을 대조하고 변경 전후의 정상 호출을 검증한다.

### 미사용 결과가 없을 때도 분석 대상을 확인한다

2026-10-10 AWS 생성 절차 문서 기준, 미사용 접근 분석의 추적 기간은 1~365일로 설정한다. 선택한 기간 전체에 걸쳐 존재한 IAM 엔티티의 권한을 평가하므로, 90일로 설정했다면 생성된 지 얼마 되지 않은 권한까지 같은 기준으로 평가됐다고 가정하지 않는다. 분석기를 생성하거나 갱신한 직후에는 결과가 나타나기까지 시간이 걸릴 수 있다.

태그로 제외한 사용자와 역할에는 finding이 생성되지 않으며 조직 분석에서는 계정도 제외할 수 있다. 따라서 결과가 없다는 사실과 모든 권한이 적절하다는 판단을 구분한다. 점검 기록에는 추적 기간, 제외 범위와 결과 조회 시점을 함께 남기는 방식을 권한다. 앞서 설명한 리전별 중복 생성 불필요 원칙은 미사용 분석에 적용하며, 외부 접근 분석의 리전별 구성과 혼동하지 않는다.

## 에이전트의 실행 권한과 요청자를 연결한다

에이전트가 여러 도구를 고를 수 있어도 실행 권한은 작업에 필요한 범위로 제한한다. 사람의 넓은 권한을 복제하기보다 워크로드 역할과 임시 자격증명을 사용하고, 도구 실행 단계에서 허용된 action과 resource를 확인한다. 이는 IAM 최소 권한 원칙을 에이전트에 적용한 설계 기준이며 별도의 IAM 엔티티 유형을 뜻하지 않는다.

2026-10-10 AWS 공식 문서 기준, 역할을 맡을 때 지정한 source identity는 CloudTrail에서 역할 세션의 요청자를 추적하는 데 사용할 수 있다. 다만 AWS가 이 값의 진위를 자동 보장하지 않으므로 애플리케이션이나 IdP가 값의 전달 경로를 통제해야 한다.

- source identity 설정에는 `sts:SetSourceIdentity` 권한이 필요하다. 역할 연결(role chaining)에서는 호출 역할의 권한 정책과 대상 역할의 신뢰 정책을 함께 확인한다.
- AWS 서비스나 service-linked role이 federated/workforce identity를 대신해 수행한 작업에는 source identity가 CloudTrail에 기록되지 않는 예외가 있다. 모든 후속 작업이 자동으로 최종 사용자에게 연결된다고 가정하지 않는다.
- 운영 점검에서는 요청, 실행 역할, 도구 호출과 감사 이벤트를 연결하고 금지한 리소스 접근이 실제로 거부되는지 시험한다. 추적 식별자는 인가를 대신하지 않으며, 원문 프롬프트나 비밀 값을 감사 식별자에 넣지 않는다(설계 제안).

모델의 행동 선택과 실제 권한 집행의 경계는 [[LLM-Application-Security|LLM 애플리케이션 보안]]에서 이어진다.

## IAM 사용자 비밀번호 정책 — 주기 변경 강제의 트레이드오프

사람의 AWS 접근은 IAM Identity Center나 federation의 임시 자격 증명과 MFA를 기본으로 하고, 비밀번호를 가진 장기 IAM 사용자는 예외로 줄인다. 불가피한 IAM 사용자에게는 계정 비밀번호 정책을 둔다.

- 사용자 지정 정책이 없으면 기본 정책이 적용된다: 8~128자, 대문자, 소문자, 숫자, 특수문자 중 3종 이상, 계정 이름이나 이메일과 다를 것, 만료 없음
- 사용자 지정 옵션: 최소 길이 6~128자, 문자 종류 요구, 만료 1~1,095일, 만료 뒤 관리자 재설정 요구(hard expiry), 본인 변경 허용, 이전 비밀번호 재사용 방지 1~24개
- root 사용자 비밀번호와 IAM 사용자 access key에는 적용되지 않는다. 비밀번호가 만료돼도 콘솔 로그인만 막히고 access key는 계속 동작하므로 주기 변경으로 프로그래밍 자격 증명 위험은 줄지 않는다
- 길이와 문자 종류 변경은 다음 비밀번호 변경 때 적용되지만 만료 기간은 즉시 적용된다. 기존 비밀번호가 그 기간보다 오래된 사용자는 다음 로그인에서 바꿔야 한다
- hard expiry를 켜기 전에 비밀번호를 재설정할 수 있는 관리자(`iam:UpdateLoginProfile`)를 둘 이상 둬 잠김을 막는다
- 로그인 실패 횟수로 잠그는 lockout 정책은 만들 수 없으므로 MFA와 함께 쓴다
- NIST SP 800-63B-4(2025-07-31 최종)는 주기적 비밀번호 변경 요구를 금지하고 침해 증거가 있을 때만 변경을 강제하게 한다. 문자 종류 조합 규칙도 금지하며, 길이(단일 요소면 15자 이상, MFA의 일부면 8자 이상)와 흔하거나 유출된 비밀번호 차단 목록 대조를 요구한다. 주기 강제는 사용자가 예측 가능한 변형을 만들게 하기 쉽다
- 적용 방향: 길이 중심 정책, 재사용 방지, MFA를 기본으로 두고 만료는 규정이 요구할 때만 켠다. 규정 때문에 켰다면 그 근거를 기록한다. 매달이나 분기마다 전 사용자 비밀번호를 바꾸게 하는 방침은 이 기준과 맞지 않는다

## 흔한 실수

- **Access Key를 코드, git에 커밋** — 즉시 자격증명 침해. Role + IRSA, Instance Profile 사용
- **`*` 정책으로 시작해 좁힐 계획** — 계속 그 상태 유지됨. 처음부터 좁게
- **Trust Policy 광범위** — 의도하지 않은 principal이 AssumeRole할 수 있음. Principal과 조건을 좁히고, 제3자에게 역할을 위임해 confused deputy 위험이 있을 때는 `ExternalId`를 사용. 조직 내부 등 모든 신뢰 정책에 ExternalId가 필수인 것은 아님
- **Resource Policy + Identity Policy 충돌** — Deny 한쪽이라도 있으면 차단
- **Permission Boundary 무시** — 위임 관리 시 권한 escalation 위험
- **콘솔에서 직접 정책 변경** — CloudTrail로 감사할 수는 있지만 IaC의 review, state와 재현 가능한 배포 경로 밖에서 drift가 생김. break-glass를 제외한 정상 변경은 Terraform, CDK 등 코드 경로로 관리하고 CloudTrail과 drift detection을 함께 사용
- **Inline policy 남발** — 추적, 재사용 어려움. Managed policy 우선

## 면접 / 시험 체크포인트

- IAM은 **글로벌 서비스** — Region 무관
- 정책 평가 순서 — 명시 Deny → 명시 Allow → default Deny
- Identity vs Resource Policy 차이와 평가 시 합집합
- Permissions Boundary는 identity-based policy가 부여할 수 있는 상한이다. 실제 권한은 resource-based policy, SCP/RCP, session policy와 명시적 Deny까지 요청 문맥 전체로 평가
- AssumeRole의 STS 임시 자격증명 흐름과 Trust Policy
- Cross-Account Access의 ExternalId 패턴
- EC2 Instance Profile, IRSA의 자격증명 노출 메커니즘 (IMDS, OIDC)
- Condition Key로 IP, MFA, 암호화 강제하는 fine-grained 제어
- Access Key vs Role — 왜 Role 우선인가
- **Secret Access Key만 생성 시점에 확인 가능** — Access Key ID는 나중에도 조회 가능. Secret 분실 시 기존 키 삭제와 새 키 생성
- 신규 User는 기본 **권한 없음**, 콘솔, 프로그래밍 액세스 별도 선택
- 계정 비밀번호 정책은 root 비밀번호와 access key에 적용되지 않고, 만료 기간은 설정 즉시 적용된다
- JSON 정책의 주요 요소는 `Effect`, `Action`, `Resource`, `Condition` 등이며 정책 유형마다 허용 요소가 다르다. `Principal`은 resource-based policy와 role trust policy에 사용하고 identity-based policy에는 넣지 않는다
- Federation 종류: **SAML, OIDC, Web Identity, IAM Identity Center**

## 관련 문서
- [[IAM|IAM (인덱스)]]
- [[IAM-Policy|IAM 정책]]
- [[IAM-Role-Federation|AssumeRole과 Federation]]

## 출처

- [AWS, Monitor and control actions taken with assumed roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_control-access_monitor.html)
- [AWS, Create an IAM Access Analyzer unused access analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-create-unused.html)
- [AWS, Using AWS Identity and Access Management Access Analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)
- [AWS, Review IAM Access Analyzer findings](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-findings-view.html)
- [AWS, Manage access keys for IAM users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
- [AWS IAM API, ListAccessKeys](https://docs.aws.amazon.com/IAM/latest/APIReference/API_ListAccessKeys.html)
- [AWS IAM — Security best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Principal 정책 요소](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html)
- [IAM 정책 평가 로직](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
- [제3자 접근과 ExternalId](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html)
- [Root user 전용 작업](https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-tasks.html)
- [IAM과 CloudTrail](https://docs.aws.amazon.com/IAM/latest/UserGuide/cloudtrail-integration.html)
- [IAM 계정 비밀번호 정책](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html)
- [NIST SP 800-63B-4 Authentication and Authenticator Management](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [NIST, SP 800-63B-4 publication record](https://csrc.nist.gov/pubs/sp/800/63/b/4/final)
- [인프런, Sungmin Kim, IAM이란?](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43727)
