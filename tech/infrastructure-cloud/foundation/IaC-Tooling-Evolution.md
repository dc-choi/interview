---
tags: [infrastructure, iac, terraform, terragrunt, terratest, pulumi, atlantis, testing]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Terragrunt", "Terratest", "Pulumi", "Atlantis", "IaC 도구 선택", "Terraform 모듈 테스트", "terraform test"]
verified_at: 2026-09-03
---

# IaC 도구 선택 사다리 (Terragrunt, Terratest, Pulumi)

순수 Terraform으로 시작해도 규모가 커지면 **중복(DRY), 테스트, 협업, 표현력**의 한계에 차례로 부딪힌다. 각 한계를 메우려 보조 도구가 얹히고(Terragrunt, Terratest, Atlantis), 한계가 누적되면 아예 **범용 언어 기반 IaC(Pulumi)** 로 패러다임을 바꾸기도 한다. 도구는 진보 순이 아니라 **지금의 한계를 푸는가**로 고른다.

운영 가능한 IaC가 갖춰야 할 수준은 보통 셋으로 정리된다.

1. 특수 케이스를 제외한 **모든 인프라를 IaC로** 관리
2. 한 번 구축한 구성을 **누구든 쉽고 빠르게 재구축**
3. **정책 준수와 오류 검증을 자동화**

각 도구는 이 셋 중 어디를 채워 주느냐로 평가한다.

## Terragrunt — Terraform의 DRY 래퍼

순수 Terraform은 dev/staging/prod처럼 거의 같은 구성을 환경마다 복제하게 만든다. Terragrunt는 Terraform을 감싸는 **얇은 래퍼**로, remote backend, provider 설정, 변수 주입을 한 곳에 정의해 HCL 중복을 줄인다(래퍼 스택 패턴). 현행 `run --all apply`로 여러 스택에 apply를 실행할 수 있다. 예전 `run-all` 명령은 deprecated이며 strict mode에서는 거부된다.

트레이드오프:

- **IDE 지원 부족** — HCL 한계 그대로라 자동완성, 타입 힌팅, 안전한 리팩터링이 어렵다.
- **표현력 한계** — 간단한 조건문, 반복도 코드 복잡도가 급격히 오른다.
- **`.terragrunt-cache`** — 캐시 디렉토리가 `node_modules`급으로 무거워지고 꼬인다.
- **`run --all apply` 실행 위험** — 여러 스택의 출력이 섞이고 shared stdin 제약 때문에 `apply`와 `destroy`에는 `-auto-approve`가 자동 추가된다. 먼저 `plan`을 검토하고 filter나 CI approval로 범위를 제한한다.
- **종속성 관리 비효율** — 스택 간 의존 처리로 느려진다.

DRY는 얻지만 가독성, 표현력, 도구 경험은 HCL의 천장에 묶인다.

## Terraform 모듈 테스트

2026-10-14 HashiCorp와 AWS 공식 문서, 각 도구 저장소 대조 기준이며, 이 절만 추가 대조했다.

공용 모듈은 한 사용처에서 동작해도 다른 사용처에서 깨질 수 있다. 사용처마다 Terraform과 provider 버전이 다르고, 리전마다 제공하는 서비스와 기능이 다르며, 중국 리전은 별도 파티션(`aws-cn`)과 별도 계정 유형을 쓴다. 이런 차이는 사용처에 적용하기 전에 모듈 저장소의 버전과 리전 조합 테스트에서 먼저 드러나게 한다.

| 단계 | 도구 예 | 확인하는 것 | 비용과 한계 |
|---|---|---|---|
| 정적 검사 | `fmt`, `validate`, TFLint(provider별 ruleset 플러그인) | 서식, 구문, 잘못된 인스턴스 타입 같은 provider 규칙, 미사용 선언 | 기본 검사는 실제 계정 상태와 리전별 지원을 모른다. AWS ruleset의 `deep_check`를 켜면 자격 증명으로 일부 참조 리소스(IAM 인스턴스 프로파일 등)의 존재를 조회한다 |
| plan 기반 검증 | `terraform test`의 `command = plan`, mock provider, Terratest의 plan 검사 | 입력에 따라 계획되는 리소스 구성과 assert 조건 | mock 값은 실제 provider 응답 형식과 다를 수 있다 |
| apply 기반 통합 | `terraform test` 기본값(`apply`), Terratest | 실제 생성 여부, 생성 뒤의 속성과 연결 | 실제 리소스 비용과 시간, 정리 실패 위험 |
| 배포된 리소스 속성 검증 | awspec(RSpec), InSpec AWS resource pack | VPC 옵션, 보안 그룹 규칙 같은 결과 속성 | 도구가 지원하는 리소스와 속성 범위에 묶인다 |

- `terraform test`(v1.6.0 이상)는 기본 테스트 디렉터리 `tests/`와 루트 구성 디렉터리의 `.tftest.hcl`(또는 `.tftest.json`) 파일에서 `run` 블록과 `assert`(조건과 오류 메시지)를 실행한다. `command`의 기본값은 `apply`라 실제 인프라를 만들고, 테스트 파일이 끝나면 만든 리소스의 삭제를 시도하며 지우지 못한 리소스 목록을 보고한다. 테스트 state는 파일별로 메모리에 두며 기존 구성의 state와 분리된다. HashiCorp는 주기적으로 비울 수 있는 전용 테스트 계정을 권한다.
- mock provider(v1.7.0 이상)는 자격 증명과 실제 인프라 없이 computed 속성에 가짜 값을 채운다. 테스트 파일 안에서만 쓸 수 있고 필수 속성은 직접 채워야 한다.
- Terratest는 주로 실제 리소스를 띄운 뒤 HTTP 요청이나 SSH 같은 사후 확인을 Go 코드로 짜는 라이브러리다. `InitAndPlanAndShowWithStruct` 계열 함수로 plan 결과만 구조체로 읽어 검사하는 테스트도 쓸 수 있다. 시나리오가 유연한 대신 Go 작성 능력이 필요하고, apply 기반 테스트는 실제 프로비저닝에 의존하므로 단위 테스트 용도로는 비용과 시간이 크다. 2026-10-14 저장소 README 기준 v2를 개발 중이며 v1 계열은 보안 수정만 받는다.
- Test Kitchen 위에서 Terraform을 적용하고 InSpec으로 검증하던 kitchen-terraform은 Terraform 1.6의 네이티브 테스트 발표 뒤 deprecated됐고, 저장소는 2024-10-22 보관(archived)됐다. 새 구성은 `terraform test`부터 검토한다.
- 매 PR에는 정적 검사와 plan 기반 검증을 돌리고, 비용이 드는 apply 기반 통합은 공용 모듈 릴리스 전이나 Terraform과 provider 버전을 올릴 때 지원 리전 조합으로 돌린다(운영 제안). 단계별 결과를 통과, 실패, 생략으로 나눠 기록하는 기준은 [[IaC#검사가 통과한 단계를 구분한다|IaC 검사 단계]]를 따른다.

apply 기반 테스트를 통과해도 실제 사용처의 변수 조합, quota와 기존 리소스와의 충돌까지 검증한 것은 아니다.

## Atlantis — PR 기반 plan/apply 협업

PR 변경을 기준으로 `terraform plan`을 실행하고, PR 명령으로 해당 plan의 `apply`를 수행할 수 있는 협업 도구다. 승인 후 apply를 강제할지는 `apply_requirements` 설정에 달려 있다. 인프라 변경을 코드 리뷰 흐름에 태워 [[IaC#CI/CD, DevOps, GitOps 연결|GitOps]]에 가깝게 만든다.

트레이드오프: 중앙 파이프라인 구축이 예상보다 손이 많이 간다(운영 복잡도).

## Pulumi — 범용 언어 기반 IaC

HCL 대신 **TypeScript, Python, Go 등 범용 언어**로 인프라를 작성한다. 조건, 반복, 추상화, 패키지 분리를 언어 그대로 쓰므로 Terragrunt가 끙끙대던 표현력, IDE 문제를 근본에서 해소한다. 내부적으로는 [[CDK-vs-Terraform|선언적 상태]]를 유지한다.

도입 시 흔히 거는 요구사항:

- **범용 언어** 기반(익숙한 언어 + 타입 시스템)
- IaC 외부에서 만든 리소스의 **import 용이성**
- state를 **자체 저장**(예: S3 DIY backend)할 수 있는가

강점:

- **타입 안전성, IDE** — 자동완성, 타입 힌팅, 리팩터링을 일반 언어 도구와 함께 활용
- **테스트** — Pulumi Mock으로 **단위 테스트**가 되고, 픽스처로 최소 비용 통합 테스트. Terratest의 단위 테스트 한계를 넘음. Terraform도 v1.7.0부터 테스트 파일에서 mock provider를 쓸 수 있으므로, 차이는 범용 언어의 테스트 도구와 표현력 쪽에 있다.
- **State 자체 관리** — Pulumi Cloud가 기본 backend이지만, S3 등 DIY backend로 state를 직접 운영할 수 있다. 이 경우 백업, 접근 제어, 운영 책임도 팀에 있다.
- **모노레포** — Nx 등으로 스택, 컴포넌트 간 종속성 관리.
- **라이선스 경계** — Pulumi는 Terraform과 별도 프로젝트이고, OpenTofu는 BUSL 전환 전 Terraform을 기반으로 출범한 포크다. provider 호환성과 이주 비용은 별도로 검토한다.

트레이드오프:

- **자유도의 대가** — 범용 언어라 표현력이 큰 만큼 컨벤션 없이는 일관성이 흐트러진다.
- **파이프라인 선택** — CI나 Automation API처럼 팀의 승인과 배포 흐름에 맞는 실행 경로를 정해야 한다.

### ComponentResource로 반복 구성을 묶기

Pulumi는 별도의 프로그래밍 언어가 아니라 범용 언어의 SDK로 인프라를 정의하는 도구다. `ComponentResource`는 여러 리소스를 하나의 논리적 부모 아래 묶고, 호출자가 필요한 입력과 출력만 다루게 하는 재사용 단위다.

2026-10-07 Pulumi 공식 컴포넌트 문서 대조 범위는 다음과 같다. 다른 도구의 기능과 정책을 다시 검증한 것은 아니다.

- TypeScript에서는 `ComponentResource`를 상속하고 자식 리소스마다 `parent: this`를 지정한다. CLI의 리소스 트리에 소속이 드러나며 부모의 provider 구성을 상속할 수 있다.
- 자식의 논리적 이름에 컴포넌트의 `name`을 포함해, 같은 컴포넌트를 여러 번 사용할 때 이름이 겹치지 않게 한다.
- 생성자 끝의 `registerOutputs`는 자식 등록을 마쳤음을 엔진에 알리고 컴포넌트 출력을 state에 저장한다. 출력이 없어도 빈 객체로 호출한다. 이는 애플리케이션의 정상 동작을 검사한 결과가 아니다.
- 예를 들어 버킷과 관련 설정을 묶고 endpoint를 출력하면, 사용자는 내부 리소스를 하나씩 연결하지 않아도 된다. 다만 컴포넌트로 감쌌다는 이유만으로 권한과 공개 범위가 안전해지지는 않는다.

적용 판단에서는 실제로 반복되는 리소스 조합과 공통 설정이 있는지 먼저 확인한다. 작은 구성이 한 번만 쓰이면 그대로 두고, 여러 서비스에서 같은 변경을 반복하거나 설정이 어긋날 때 컴포넌트로 추출한다.

## Terraform 라이선스 이슈 (BUSL)

HashiCorp는 2023년 8월 이후 Terraform을 포함한 제품의 향후 릴리스 소스 코드를 MPL 2.0에서 BUSL 1.1로 바꾼다고 발표했다. 이 발표는 Terraform provider와 SDK 대부분에는 적용되지 않았다. 뒤이어 OpenTofu가 Terraform 포크로 출범했다. 라이선스와 배포 방식은 IaC 도구 선택의 실질 변수다.

## 도구 선택 원칙

- **진보성이 아니라 현재 한계를 푸는가**로 고른다. 팀이 작을수록 운영 안정성, 커뮤니티, IDE 생산성의 가중치가 크다.
- 도구 교체는 코드 변경이 아니라 **협업 방식과 관리 철학의 변경**이다. 명확한 필요(pain)와 조직적 지원이 있을 때만 전환이 성공한다.
- 도구를 얹는 순서: 순수 Terraform → DRY 한계(Terragrunt) → 테스트 한계(`terraform test`, 필요하면 Terratest) → 협업(Atlantis) → 표현력, IDE, 테스트의 근본 해결(Pulumi). 모든 팀이 끝까지 갈 필요는 없고, 자기 한계 지점에서 멈춘다.

## 면접 체크포인트

- Terragrunt가 푸는 문제(HCL DRY)와 그 대가(IDE, 표현력, `.terragrunt-cache`, `run --all apply` 출력)
- Terraform 모듈 테스트 단계(정적 검사, plan과 mock 검증, apply 기반 통합)와 Terratest의 apply 기반 테스트가 단위 테스트로 비싼 이유(실제 프로비저닝 의존)
- Atlantis의 PR 기반 plan/apply 협업 모델과 GitOps 연결
- Pulumi가 HCL 도구 대비 주는 것(타입 안전, 범용 언어의 테스트 도구와 표현력)과 대가(일관성 부담, 파이프라인 직접 구성)
- BUSL 라이선스 전환과 OpenTofu 포크가 도구 선택에 미치는 영향

## 출처
- [인프랩 IaC 구축기 — 인프랩 기술블로그](https://tech.inflab.com/20240201-inflab-iac/)
- [Terragrunt, Strict controls](https://docs.terragrunt.com/reference/strict-controls/)
- [Terragrunt, Implicit Stacks](https://docs.terragrunt.com/features/stacks/implicit/)
- [Terragrunt, `run --all`](https://docs.terragrunt.com/reference/cli/commands/run/#all)
- [Terratest, Terragrunt module](https://github.com/gruntwork-io/terratest/tree/main/modules/terragrunt)
- [Terraform, Tests](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform, Mocks](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform, test command](https://developer.hashicorp.com/terraform/cli/commands/test)
- [AWS, AWS Regions](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html)
- [AWS, Identify AWS resources with Amazon Resource Names (ARNs)](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html)
- [terraform-linters, TFLint](https://github.com/terraform-linters/tflint)
- [terraform-linters, TFLint AWS ruleset deep checking](https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/deep_checking.md)
- [gruntwork-io, Terratest](https://github.com/gruntwork-io/terratest)
- [newcontext-oss, Kitchen-Terraform](https://github.com/newcontext-oss/kitchen-terraform)
- [k1LoW, awspec](https://github.com/k1LoW/awspec)
- [InSpec, InSpec AWS Resource Pack](https://github.com/inspec/inspec-aws)
- [Amazon Web Services Korea, Terraform을 기반한 AWS 기반 대규모 마이크로서비스 인프라 운영 노하우](https://www.youtube.com/watch?v=9PTdO7DM6XQ)
- [Atlantis, Using Atlantis](https://www.runatlantis.io/docs/using-atlantis)
- [Pulumi, State and Backends](https://www.pulumi.com/docs/reference/state/)
- [Pulumi, Unit Testing Pulumi Programs](https://www.pulumi.com/docs/iac/guides/testing/unit/)
- [Pulumi, Component Resources](https://www.pulumi.com/docs/iac/concepts/components/)
- [Pulumi, Build a Component](https://www.pulumi.com/docs/iac/guides/building-extending/components/build-a-component/)
- [HashiCorp, Business Source License announcement](https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license)
- [OpenTofu, Fork announcement](https://opentofu.org/blog/opentofu-announces-fork-of-terraform/)

## 관련 문서
- [[IaC|IaC (Infrastructure as Code)]]
- [[CDK-vs-Terraform|CDK vs Terraform (IaC 도구 선택)]]
- [[CloudFormation|AWS CloudFormation]]
- [[Monolith-vs-Microservice|아임웹 MSA — 테라폼 모듈로 인프라 자동화]]
