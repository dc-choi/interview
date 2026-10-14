---
tags: [infrastructure, iac, terraform, ansible, gitops, devops]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["IaC", "Infrastructure as Code", "테라폼", "코드형 인프라"]
verified_at: 2026-09-03
---

# IaC (Infrastructure as Code)

IaC는 서버, 네트워크, 로드밸런서, 방화벽 같은 인프라를 콘솔의 수동 클릭이 아니라 **코드(구성 파일)로 정의하고 프로비저닝**하는 방식이다. 인프라 사양이 텍스트로 남으므로 버전 관리, 코드 리뷰, 자동 배포가 가능해지고, 매번 동일한 환경을 재현할 수 있다. 핵심 명제는 **인프라를 애플리케이션 코드처럼 다룬다**는 것.

## IaC를 하는 이유

- **재현성, 일관성**: 같은 코드로 개발, 스테이징, 프로덕션을 동일하게 찍어낸다. 환경 간 차이(works on my machine)를 제거.
- **속도, 비용**: 수동 셋업보다 빠르고, 콘솔 클릭으로 잊고 방치되는 리소스(과금 누수)를 줄인다.
- **추적, 롤백**: Git 히스토리로 누가 무엇을 왜 바꿨는지 추적하고 되돌린다.
- **명확한 실패**: 적용 실패 시 에러 메시지로 원인을 받는다(콘솔 수동 작업은 침묵 실패가 많음).
- **부수 효과**: 인프라를 코드로 다루면 네트워크, 보안, 트래픽 구조를 보는 눈이 같이 자란다.

## 선언형 vs 명령형

| | 선언형 (Declarative) | 명령형/절차형 (Imperative/Procedural) |
|---|---|---|
| 기술 대상 | **원하는 최종 상태(desired state)만** 기술 | 도달까지의 **명령과 순서**를 직접 기술 |
| 도달 방법 | 도구가 현재 상태와 비교해 차이만 자동 적용 | 사람이 어떻게 바꿀지 단계로 명시 |
| 제거, 변경 | 원하는 부재 상태도 선언. Terraform 같은 state-authoritative 도구는 구성을 제거하면 destroy를 계획할 수 있지만, Ansible/Chef는 `absent`, `remove` 같은 상태를 명시 | 변경, 삭제 절차를 직접 작성 |
| 예 | Terraform, CloudFormation, Ansible과 Chef의 리소스 선언 | 셸 스크립트, 도구 안의 절차적 helper와 명시적 순서 제어 |

선언형이 IaC의 주류다. 원하는 상태를 적으면 도구가 현재 상태와 비교하므로 멱등성과 드리프트 교정에 유리하다. 다만 도구 전체를 둘 중 하나로만 분류하면 안 된다. Terraform, Ansible과 Chef 모두 선언적 resource 모델을 중심으로 쓰면서 provisioner, task 순서, 조건문이나 Ruby helper 같은 절차적 제어를 섞을 수 있다.

**CDK, Pulumi의 위치**: 범용 프로그래밍 언어(TS, Python 등)로 인프라를 작성해 절차적 작성 경험을 주지만, 내부적으로는 선언적 모델(CDK는 CloudFormation 템플릿)로 합성한다. 즉 **작성 패러다임과 실행 모델은 별개**다. 한 회사의 영속 리소스를 팀 단위로 관리한다면 선언형 도구(Terraform 등)가 무난하고, 애플리케이션 생명주기에 묶이는 일시적 리소스에는 CDK/Pulumi가 어울린다.

## push vs pull 모델

구성을 대상 노드에 어떻게 전달하느냐의 구분.

- **push**: 중앙 제어 노드가 대상 서버로 구성을 밀어 넣는다. 대상에 에이전트 설치가 필요 없을 수 있다(에이전트리스). 예: **Ansible**(SSH로 push).
- **pull**: 대상 서버의 에이전트가 중앙 서버에서 원하는 상태를 주기적으로 당겨와 스스로 적용한다. 주기적 동기화라 드리프트를 지속 교정하는 데 강하다. 예: **Puppet, Chef**.
- **SaltStack**: 기본 원격 실행은 master가 minion에 job을 publish하는 방식이다. 상태 파일은 master fileserver에서 받아 로컬 적용하며, 주기적 동기화는 minion scheduler 같은 별도 설정으로 구성한다.

## 대표 도구 (두 갈래)

| 갈래 | 역할 | 도구 |
|---|---|---|
| **프로비저닝(Provisioning)** | 인프라 리소스 자체를 생성, 변경(VM, 네트워크, LB) | Terraform, CloudFormation(AWS 전용), Pulumi, CDK |
| **구성 관리(Configuration Management)** | 이미 뜬 서버 위에 SW 설치, 설정 | Ansible, Chef, Puppet, SaltStack |

경계는 겹친다 — Ansible로 일부 프로비저닝도, Terraform로 일부 설정도 가능. 실무에선 Terraform(프로비저닝) + Ansible(구성)처럼 조합하는 경우가 흔하다.

## Terraform 핵심 개념

- **상태(State)**: 코드가 관리하는 인프라의 현재 상태를 별도 파일로 추적. 원격 백엔드(S3 등)에 두고 공유.
- **멱등성(Idempotency)**: 같은 코드를 여러 번 실행해도 결과가 같다. 이미 원하는 상태면 변경 없음.
- **프로바이더(Provider)**: AWS, GCP 등 벤더별 플러그인. 같은 문법으로 멀티 클라우드.
- **락킹(Locking)**: 동시에 여러 명이 상태를 바꾸지 못하게 잠근다. S3 backend의 state locking은 opt-in이며, 새 구성에서는 `use_lockfile = true`로 `.tflock` 파일을 사용한다. `dynamodb_table` 기반 잠금은 deprecated 상태다.
- **Plan**: apply 전 변경 사항을 미리 계산, 검토. 실수 적용을 막는 안전장치.

## 규모가 커질 때의 Terraform 구성 분할

2026-10-14 HashiCorp와 AWS 공식 문서 대조 기준이며, 이 절만 추가 대조했다. 여러 팀의 서비스 인프라를 한 운영 조직이 함께 관리하는 상황을 전제로 한다.

한 폴더(root module)에 리소스를 계속 더하면 plan과 apply가 느려지고, 같은 state 잠금을 기다리는 작업이 늘며, 실수 하나의 영향이 전체로 번진다. HashiCorp는 논리적으로 관련된 리소스만 묶어 폭발 반경(blast radius)을 작게 유지하고, 변경 빈도, 팀 책임과 필요한 권한, 리소스 규모를 기준으로 구성을 나누라고 권한다. 서비스 단위로 나누면 담당 팀의 권한도 그 서비스 범위로 좁힐 수 있다.

| 구성 단위 | 예 | 따로 두는 이유 |
|---|---|---|
| 계정과 리전의 공용 기반 | VPC, 서브넷 | 변경이 드물고 여러 서비스가 의존한다 |
| 서비스 구성 | 서비스 모듈 호출과 버전 지정만 둔 폴더 | 담당 팀과 변경 주기가 같다 |
| 공용 모듈 | LB, 오토스케일링 그룹이나 컨테이너 서비스, 서비스 전용 IAM과 DB를 찍어내는 블록 | 태그, 네이밍과 보안 기본값을 한 곳에서 바꾼다 |

- **환경 분리:** AWS는 비운영과 운영을 별도 계정에 두면 리소스와 데이터가 기본적으로 분리되고, 문제의 영향을 한 계정 안에 가둘 수 있다고 설명한다. Terraform CLI workspace는 하나의 backend를 공유하며 state만 바꿔 쓰므로, 시스템 분해나 별도 자격 증명과 접근 통제가 필요한 배포의 격리 수단으로 쓰지 않는다. 환경마다 backend가 다른 구성을 두고 공통 부분은 모듈로 재사용한다. HCP Terraform workspace는 구성, 변수와 state를 따로 갖는 단위라 CLI workspace와 의미가 다르다.
- **모듈 버전 승격:** Git 소스는 `?ref=`로 태그, 브랜치 또는 커밋을 지정하고, 레지스트리 모듈은 `version` 제약을 쓴다. 새 모듈 버전은 개발 환경 구성에서 먼저 참조해 검증한 뒤 스테이징과 운영 구성의 참조를 차례로 올린다. 재사용 모듈은 Terraform과 provider의 최소 버전만 제약하고, provider의 상한과 하한(`~>`)은 root module이 정한다.
- **서비스 리소스의 위치:** 서비스 전용 IAM 역할을 전역 폴더에 따로 두면 서비스를 없애거나 담당자가 바뀔 때 함께 정리할 대상을 놓치기 쉽다. 서비스 모듈 안에서 만들되, 같은 계정에서 모듈을 여러 번 쓰면 이름이 겹칠 수 있다. IAM 사용자, 그룹, 역할과 인스턴스 프로파일의 이름은 계정 안에서 대소문자를 구분하지 않고 고유해야 하므로 환경과 서비스 이름을 이름에 넣는다.
- **구성 간 값 공유:** `terraform_remote_state`는 root module의 output만 노출하지만, 읽는 쪽은 민감 정보가 들어 있을 수 있는 state snapshot 전체에 접근해야 한다. HashiCorp는 공유할 값을 SSM Parameter Store 같은 별도 위치에 게시하고 data source로 읽어, 공유 값과 state에 다른 접근 통제를 적용하라고 권한다.
- **구조 변경과 교체:** 리소스 이름을 바꾸거나 모듈 안으로 옮기면 Terraform은 기본적으로 기존 객체를 삭제하고 새 주소에 다시 만든다. Terraform v1.1 이상은 `moved` 블록으로 교체 없이 주소를 옮길 수 있고, 공유 모듈에서 이전 `moved` 블록을 지우면 사용자에게는 삭제 후 재생성이 되므로 남겨 둔다. DB처럼 지우면 안 되는 리소스의 `prevent_destroy`는 리소스 블록 자체를 구성에서 지우면 삭제를 막지 못한다. plan의 교체와 삭제 항목을 리뷰 기준으로 둔다.
- **배포 도구와의 소유 경계:** 배포마다 이미지를 새로 굽고 오토스케일링 그룹이나 태스크 정의를 교체하는 불변 배포에서 같은 속성을 Terraform과 배포 도구가 함께 바꾸면 서로 덮어쓴다. 정적인 기반은 Terraform이, 배포마다 바뀌는 속성은 배포 도구가 맡고, Terraform에는 외부 프로세스가 관리하는 속성을 `lifecycle.ignore_changes`로 지정한다.

공용 모듈을 여러 사용처가 쓰면 Terraform 버전과 리전 차이로 한 곳에서만 깨질 수 있으므로 모듈 저장소에서 먼저 시험한다([[IaC-Tooling-Evolution#Terraform 모듈 테스트|Terraform 모듈 테스트]]).

## 검사가 통과한 단계를 구분한다

검사 스크립트가 정상 종료해도 필요한 모든 단계가 실행됐다는 뜻은 아니다. 단계별 결과를 통과, 실패, 생략으로 나누고 대상 환경과 생략 사유를 함께 남긴다.

| 단계 | 확인하는 범위 | 이 결과만으로 알 수 없는 것 |
|---|---|---|
| `fmt -check` | 구성 파일의 표준 서식 | 설정의 의미와 배포 가능 여부 |
| `validate` | 구성의 구문과 내부 일관성 | 원격 state, provider API와 실제 환경의 유효성 |
| 환경별 `plan` | 선택한 workspace, 변수와 상태를 바탕으로 한 변경 계획 | 실제 적용 성공과 서비스 정상 동작 |
| `apply` | 계획한 리소스 변경의 실행 결과 | 애플리케이션의 업무 기능, 데이터 보존과 사용자 영향 |
| 배포 후 확인 | 미리 정한 기능과 운영 기준의 충족 여부 | 검사하지 않은 경로와 이후의 장애 가능성 |

자격증명이 없는 PR 검사에서 `plan`을 생략할 수는 있다. 그 경우 `validate 통과, plan 생략: 자격증명 없음`처럼 표현하고 배포 준비 완료로 해석하지 않는다. 자격증명 탐지 로직이 지원하지 않는 인증 방식도 있을 수 있으므로, 탐지 실패를 실제 접근 권한이 없다는 증거로 쓰지 않는다.

배포 단계에서는 필수 검사들이 실제 수행됐는지 확인한다. `plan -detailed-exitcode`를 쓰면 0은 변경 없음, 1은 오류, 2는 변경 있음이므로 2를 일반 실패로 취급하지 않는다. 옵션을 사용하지 않는 실행이나 wrapper 스크립트의 종료 코드와도 구분한다.

2026-09-22 보강: 로컬 배포 검사 스크립트의 조건부 `plan` 생략 경로에서 일반화했다. 스크립트를 실행하거나 배포 준비 상태를 판정한 기록은 아니다. 단계별 의미는 Terraform 공식 명령 문서와 대조했다.

## 가변 vs 불변 인프라, 구성 드리프트

- **구성 드리프트(Configuration Drift)**: 코드가 정의한 원하는 상태와 실제 인프라가 어긋나는 현상. 주로 누군가 콘솔에서 수동으로 손대거나, 서버마다 패치가 제각각 쌓이며 발생(스노우플레이크 서버).
- **가변(Mutable) 인프라**: 기존 서버를 in-place로 수정. 누적될수록 드리프트, 비재현성 위험.
- **불변(Immutable) 인프라**: 변경 시 기존을 고치지 않고 **새 이미지/인스턴스로 통째 교체**(골든 이미지, 블루-그린). 서버 내부에 변경이 누적되는 드리프트를 줄이고 롤백을 단순하게 한다. 다만 콘솔의 수동 변경이나 외부 리소스 변화까지 막지는 않으므로 IaC의 탐지와 재수렴은 여전히 필요하다.

## CI/CD, DevOps, GitOps 연결

- 인프라 변경을 앱 코드처럼 **PR → 리뷰 → 자동 테스트 → 머지 → 배포** 파이프라인에 태운다. 개발팀과 운영팀이 같은 환경 정의를 공유해 경계가 흐려지는 게 DevOps의 핵심.
- **GitOps**: Git 저장소를 단일 진실 공급원(SSOT)으로 두고, Git에 선언된 상태를 실제 인프라에 지속 동기화한다. 웹훅 push 또는 에이전트 pull로 동작.
- **Policy as Code**: 보안, 거버넌스 규칙(승인 권한, 허용 리전 등)도 코드로 강제(OPA 등). IaC → Operations as Code → Policy as Code로 운영 범위가 확장된다.

## 모범 사례

- **모든 것을 버전 제어** — 협업, 추적, 롤백의 전제.
- **모듈화, 재사용** — 중복을 줄이고 유지보수를 쉽게.
- **자동 테스트** — 인프라 코드도 배포 전 검증을 CI에 통합.
- **불변 지향으로 드리프트 감소** — 수정 대신 재프로비저닝.
- **시크릿 하드코딩 금지** — 비밀은 코드에 박지 말고 시크릿 매니저로. 최소 권한 IAM.
- **거버넌스 명확화** — 역할, 책임, 승인 워크플로, Policy as Code.

## 과제, 주의사항

| 과제 | 대응 |
|---|---|
| 학습 곡선 | 단계적 도입, 팀 교육 |
| 보안 취약점(하드코딩 시크릿, 과도한 IAM) | 시크릿 매니저, 보안 스캔, 최소 권한 |
| 표준화 부족(팀마다 제각각) | 네이밍, 모듈 가이드라인 통일 |
| 디버깅 복잡 | 로깅, 점진적 롤아웃 |
| 레거시 통합 | 리버스 엔지니어링, 단계적 마이그레이션 |

## 면접 체크포인트

- 선언형 vs 명령형의 차이, 그리고 한 도구 안에서도 선언적 resource와 절차적 제어가 섞일 수 있는 이유
- push(Ansible) vs pull(Puppet, Chef) 모델의 트레이드오프
- 프로비저닝 도구 vs 구성 관리 도구의 역할 구분과 조합
- 상태, 멱등성, 구성 드리프트, 불변 인프라가 왜 IaC의 핵심 가치인지
- IaC가 CI/CD, GitOps와 어떻게 맞물려 DevOps를 떠받치는지
- Terraform 구성을 나누는 기준(폭발 반경, 변경 빈도, 팀 권한, 규모)과 CLI workspace를 환경 격리 수단으로 쓰지 않는 이유

## 출처
- [Infrastructure as Code(IaC)란? — Red Hat](https://www.redhat.com/ko/topics/automation/what-is-infrastructure-as-code-iac)
- [AWSome IaC 발표 자료](https://github.com/drakejin/20250628-tbm)
- [Salt Project, Architecture](https://docs.saltproject.io/en/latest/topics/development/architecture.html)
- [Chef Infra Client Overview](https://docs.chef.io/chef_client_overview/)
- [Ansible, package module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html)
- [Chef, package resource](https://docs.chef.io/client/18/resources/bundled/package/)
- [Terraform, What is Terraform](https://developer.hashicorp.com/terraform/intro)
- [Terraform, S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3)
- [Terraform, fmt](https://developer.hashicorp.com/terraform/cli/commands/fmt)
- [Terraform, validate](https://developer.hashicorp.com/terraform/cli/commands/validate)
- [Terraform, plan](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform, apply](https://developer.hashicorp.com/terraform/cli/commands/apply)
- [HCP Terraform, Workspace best practices](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/best-practices)
- [Terraform, Workspaces](https://developer.hashicorp.com/terraform/cli/workspaces)
- [Terraform, module block](https://developer.hashicorp.com/terraform/language/block/module)
- [Terraform, Module sources](https://developer.hashicorp.com/terraform/language/modules/sources)
- [Terraform, Version constraints](https://developer.hashicorp.com/terraform/language/expressions/version-constraints)
- [Terraform, terraform_remote_state data source](https://developer.hashicorp.com/terraform/language/state/remote-state-data)
- [Terraform, Refactoring modules](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)
- [Terraform, lifecycle meta-argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [AWS, Benefits of using multiple AWS accounts](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/benefits-of-using-multiple-aws-accounts.html)
- [AWS, IAM and AWS STS quotas](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html)
- [Terraform을 기반한 AWS 기반 대규모 마이크로서비스 인프라 운영 노하우 — Amazon Web Services Korea](https://www.youtube.com/watch?v=9PTdO7DM6XQ)

## 관련 문서
- [[CDK-vs-Terraform|CDK vs Terraform (IaC 도구 선택)]]
- [[IaC-Tooling-Evolution|IaC 도구 선택 사다리 (Terragrunt, Terratest, Pulumi)]]
- [[Declarative-Programming|선언형 프로그래밍]]
- [[CloudFormation|AWS CloudFormation]]
- [[ECS-SQS-Worker-Terraform|ECS SQS Worker — Terraform 구성]]
- [[Blue-Green|Blue-Green 배포 (불변 인프라)]]
- [[DevOps-vs-DevSecOps|DevOps vs DevSecOps]]
- [[Monolith-vs-Microservice|아임웹 MSA — 테라폼 모듈로 인프라 자동화]]
