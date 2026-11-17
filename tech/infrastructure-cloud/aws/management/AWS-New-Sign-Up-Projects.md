---
tags: [infrastructure, aws, account, sign-up, projects, organizations, free-tier]
status: done
verified_at: 2026-11-17
category: "Infrastructure - AWS"
aliases: ["Sign up for AWS (new)", "AWS 새 가입 경로", "AWS Projects", "AWS Settings 프로젝트"]
---

# AWS 새 가입 경로와 프로젝트 (Sign up for AWS (new))

AWS 계정 관리 문서는 가입 방법을 두 가지로 나눈다. 기존의 `Sign up for AWS (advanced)`는 root 사용자를 가진 독립 계정을 만들고, `Sign up for AWS (new)`는 AWS Builder ID로 로그인해 **프로젝트** 단위로 계정을 만든다. 같은 AWS 계정이지만 리전 선택, 사용할 수 있는 서비스와 관리 책임이 다르므로 처음 가입할 때 어느 경로인지 먼저 정한다. 이 문서는 2026-11-17 계정 관리 문서와 Free Tier FAQ 대조 기준이다.

## 구조

- **프로젝트 = AWS 계정 하나:** 프로젝트는 리소스를 만드는 AWS 계정 하나와 협업자 공유 설정을 담는다. 소유한 프로젝트들이 모여 하나의 조직을 이루며, 이는 AWS Organizations와 같은 조직이지만 AWS가 일부를 대신 관리한다.
- **소유자는 Builder ID:** 이 경로는 root 사용자를 만들지 않는다. 가입 때 만든 AWS Builder ID가 프로젝트 계정을 소유하고, 로그인은 Google, GitHub, Apple, Amazon 계정을 지원한다. IAM 사용자와 역할은 프로그래밍 방식 접근에만 쓰고 콘솔 로그인에는 쓸 수 없다. Builder ID 프로필 복구는 [[AWS-Builder-ID-Recovery|AWS Builder ID 복구 이메일]]을 따른다.
- **관리 화면:** 프로젝트 생성과 협업자 공유 설정은 AWS Settings(`settings.aws.com`)에서 한다. 콘솔의 `Manage projects`에서도 들어간다.

## 리전은 고를 수 없다

프로젝트를 만들면 AWS가 연락처 주소의 국가에 따라 US East (Ohio) `us-east-2`, Europe (Stockholm) `eu-north-1`, Asia Pacific (Sydney) `ap-southeast-2` 중 하나를 배정하고 리전 리소스는 모두 그 리전에 만든다. 2026-08-18 기준 국가표에서 한국은 Sydney 리전에 배정된다. 리전은 바꿀 수 없고 나중에 연락처 주소를 바꿔도 그대로이며, opt-in 리전도 쓸 수 없다.

예외도 있다. 글로벌 서비스는 자체 리전에서 동작하고, AWS WAF와 CloudWatch Logs는 배정 리전 외에 US East (N. Virginia) `us-east-1`에서도 쓸 수 있다. Amazon Bedrock은 리소스를 만들지 않는 API를 기본 활성화된 모든 상용 리전에서 호출할 수 있어 추론 요청이 배정 리전 밖에서 처리될 수 있다. 선택한 리전 밖에 리소스를 만드는 CloudFront 기능(CloudFront에 AWS WAF 연결 등)은 쓸 수 없다.

설계 판단: 한국 사용자를 대상으로 지연 시간이나 데이터 위치 요구가 있으면 이 경로의 Sydney 배정이 맞는지 먼저 확인한다. 서울 리전이 필요하면 `advanced` 경로를 쓰거나 아래 고급 기능을 활성화해야 한다.

## 결제 수단과 요금 통제

- **Free plan 결제 수단:** FAQ는 대부분의 신규 고객이 결제 수단 없이 가입할 수 있다고 적는다. 다만 본인 확인을 위해 결제 정보를 요청할 수 있고, 가입 문서 기준 이때 USD 1달러(또는 상당액)를 3~5일 동안 보류한다. Free Tier 자격이 없으면 결제 정보를 넣고 Paid plan으로 시작한다.
- **Free Tier 크레딧:** 이 경로의 계정은 Free Tier로 시작해 가입 크레딧 100달러와 추가 크레딧 최대 100달러를 받는다. 크레딧을 다 쓰거나 계정을 연 지 6개월이 지나면 업그레이드해야 하고, 그대로 두면 계정과 프로젝트가 정지되며 데이터는 90일 보관 뒤 영구 삭제된다. 처음부터 AWS Organizations에 들어가 있지만 Free Tier에 머물므로, `advanced` 경로의 Organizations 가입 시 Paid 자동 전환 규칙([[AWS-Pricing#신규 계정의 크레딧과 Free plan 종료|AWS 요금 구조]])을 적용하지 않는다. FAQ는 크레딧 만료를 6개월과 12개월로 다르게 적는 문항이 섞여 있으므로 FAQ는 이 경로의 만료일을 AWS Settings에서 확인하라고 안내하며, Billing 콘솔의 Credits 페이지는 새 가입 경험 이전 가입자용이다.
- **Spend limit:** Paid plan에서는 프로젝트마다 월 세전 비용 한도를 둘 수 있으며 `advanced` 경로 계정에는 없는 기능이다. 계정 관리 문서는 spend limit을 AWS Budgets의 한 유형으로 설명한다. 최소값은 20달러와 AWS가 보수적으로 추정한 예상 지출 중 큰 값이라 리소스가 이미 많이 돌고 있으면 20달러로 설정하지 못할 수 있고, spend limit을 둘 수 있는 프로젝트는 10개까지다. 50%, 75%, 90% 도달과 10일 안 도달 예상 때 알리고, 선택하면 한도 며칠 전부터 새 리소스 시작을 막거나 유휴, 고비용 리소스를 멈추는 사전 통제를 쓸 수 있다.
- **한도 도달:** AWS가 프로젝트를 일시 중지하고 모든 리소스를 멈춘다. 데이터는 보존되며 AWS Settings에서 한도를 올리면 다시 활성화되지만 일부 리소스는 직접 재시작해야 할 수 있다. 중지 후 90일 안에 조치하지 않으면 프로젝트 데이터가 영구 삭제된다. FAQ는 다음 달까지 멈춘다고 적지만 계정 관리 문서는 다음 달 자동 재개를 확인하지 않는다. 일반 예산은 알림과 지정한 대상에 대한 Budget Actions([[Budget-Alert|예산 알람]])를 실행하는 반면 spend limit은 프로젝트 전체를 멈추므로, 운영 서비스에서는 한도 도달이 곧 장애다(운영 판단).

## 고급 기능 활성화

`Explore advanced features`로 고급 기능을 활성화하면 프로젝트를 담은 AWS Organization, 관리 계정과 위임 관리자 계정을 사용자가 직접 관리한다. Paid plan으로 업그레이드한 뒤에만 할 수 있고 되돌릴 수 없다.

- 관리 계정의 root 이메일과 비밀번호를 정하고, 프로젝트는 멤버 계정이 되며, 팀원은 IAM Identity Center의 workforce identity가 된다. Builder ID에서 외부 identity source로 바꾸면 그 변경도 되돌릴 수 없다.
- SCP와 RCP를 직접 설정하고([[AWS-Organizations|AWS Organizations]]), 모든 서비스와 opt-in을 포함한 더 많은 리전, 콘솔의 리전 선택기를 쓸 수 있다. 다만 다른 리전에 리소스를 만들려면 모든 사용자에게 적용된 SCP의 `RegionFloor` 문에 그 리전을 추가해야 한다.
- 설정된 spend limit은 제거되고 일시 중지된 프로젝트는 다시 활성화된다. 그 뒤 비용 상한은 사용자가 직접 관리해야 한다. FAQ 기준 Free Tier 추가 크레딧을 더 받을 수 없고 Free plan으로 돌아갈 수 없다.
- 활성화 뒤 AWS Settings는 콘솔 메뉴가 아니라 `settings.aws.com`으로만 들어가며, identity source가 Builder ID인 동안만 쓸 수 있다.
- 조직 이탈과 관리형 역할 변경을 막는 기본 SCP는 활성화 뒤에도 조직 root에 남아 나중에 만들거나 초대한 멤버 계정에도 적용된다.
- 프로젝트 계정은 조직에서 제거할 수 없고 root로 로그인할 수 없다. 활성화한 조직에는 새 프로젝트를 만들 수 없으며, AWS Settings에서 만든 새 프로젝트는 별도의 관리형 조직이 된다.

## AI 코딩 도구 연결

AWS Settings에서 프로젝트를 고른 뒤 `Copy agent prompt`로 만든 프롬프트를 코딩 에이전트에 붙여 넣으면 에이전트가 Agent Toolkit을 설치한다. Agent Toolkit은 AWS MCP 서버 설정, 선별된 agent skill과 rules 파일을 묶은 것이다. 발급되는 자격 증명은 12시간 유효하며 `aws login`으로 최대 90일까지 갱신하고, 그 뒤에는 브라우저에서 다시 권한을 준다. AI 코딩 도구가 프로젝트에서 한 작업의 책임은 사용자에게 있다. MCP와 에이전트 권한 설계는 [[MCP|MCP]]를 함께 본다.

## 어느 경로를 고를까

| 상황 | 권장 경로 |
|---|---|
| 처음 학습하거나 작은 실험을 하고, 결제 수단 없이 시작하고 싶다 | new |
| 비용 상한에서 자동으로 멈추는 장치가 필요하다 | new(Paid plan의 spend limit) |
| 서울 등 특정 리전, opt-in 리전, 전체 서비스가 필요하다 | advanced, 또는 new에서 고급 기능 활성화 |
| HIPAA, FedRAMP 워크로드나 세밀한 권한 제어, net-terms 결제가 필요하다 | advanced(문서가 new 경로를 쓰지 말라고 안내) |

외주로 고객 계정을 만들 때는 고객이 계정 소유자가 되도록 고객의 Builder ID나 root 이메일로 만들고, 리전 배정과 spend limit 중단 동작을 계약 전에 설명한다(운영 제안).

## 흔한 함정

- 새 경로 계정에서 서울 리전 리소스를 찾거나 만들려고 한다. 리전은 주소 국가로 고정된다.
- spend limit을 알림으로만 생각한다. 한도에 닿으면 리소스가 멈추고, 재활성화 뒤에도 일부 리소스는 직접 재시작해야 하며 90일 동안 조치하지 않으면 데이터가 삭제된다.
- 고급 기능 활성화를 시험 삼아 켠다. 되돌릴 수 없고 spend limit도 사라진다.
- `advanced` 경로 기준의 root 사용자 보호 절차([[IAM-Best-Practices|IAM 보안 모범 사례]])를 새 경로 계정에 그대로 적용한다.

## 출처

- [AWS Account Management, Compare sign-up options](https://docs.aws.amazon.com/accounts/latest/reference/sign-up-for-aws.html)
- [AWS Account Management, Sign in to AWS (new)](https://docs.aws.amazon.com/accounts/latest/reference/sign-in-new.html)
- [AWS Account Management, Project Regions](https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html)
- [AWS Account Management, Create a project](https://docs.aws.amazon.com/accounts/latest/reference/create-project.html)
- [AWS Account Management, Activate advanced features](https://docs.aws.amazon.com/accounts/latest/reference/activate-advanced-features.html)
- [AWS Account Management, Connect an AI coding tool](https://docs.aws.amazon.com/accounts/latest/reference/connect-ai-coding-tool.html)
- [AWS Account Management, Create a spend limit](https://docs.aws.amazon.com/accounts/latest/reference/create-spend-limit.html)
- [AWS Account Management, Upgrade your account](https://docs.aws.amazon.com/accounts/latest/reference/upgrade-account.html)
- [AWS Account Management, SCPs and RCPs for projects](https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html)
- [AWS, AWS Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/)
- [The NEW Way to Start on AWS | Cloud Report — Amazon Web Services](https://www.youtube.com/watch?v=-DjzhOxh0d0)

## 관련 문서

- [[AWS-Pricing|AWS 요금 구조]]
- [[AWS-Organizations|AWS Organizations]]
- [[AWS-Builder-ID-Recovery|AWS Builder ID 복구 이메일]]
- [[IAM-Best-Practices|IAM 보안 모범 사례]]
- [[Budget-Alert|예산 알람]]
