---
tags: [infrastructure, iac, terraform, terragrunt, terratest, pulumi, atlantis]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Terragrunt", "Terratest", "Pulumi", "Atlantis", "IaC 도구 선택"]
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

## Terratest — Terraform 테스트

Go로 작성하는 테스트 라이브러리. `apply`로 실제 리소스를 띄우고 그 결과를 검증하는 **통합 테스트** 도구다.

한계: 실제 프로비저닝을 거쳐야 하므로 **진짜 단위 테스트는 어렵다**(비용, 속도). Go 래퍼라 HCL 로직 자체를 격리 검증하기보다 결과를 사후 확인하는 데 가깝다.

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
- **테스트** — Pulumi Mock으로 **단위 테스트**가 되고, 픽스처로 최소 비용 통합 테스트. Terratest의 단위 테스트 한계를 넘음.
- **State 자체 관리** — Pulumi Cloud가 기본 backend이지만, S3 등 DIY backend로 state를 직접 운영할 수 있다. 이 경우 백업, 접근 제어, 운영 책임도 팀에 있다.
- **모노레포** — Nx 등으로 스택, 컴포넌트 간 종속성 관리.
- **라이선스 경계** — Pulumi는 Terraform과 별도 프로젝트이고, OpenTofu는 BUSL 전환 전 Terraform을 기반으로 출범한 포크다. provider 호환성과 이주 비용은 별도로 검토한다.

트레이드오프:

- **자유도의 대가** — 범용 언어라 표현력이 큰 만큼 컨벤션 없이는 일관성이 흐트러진다.
- **파이프라인 선택** — CI나 Automation API처럼 팀의 승인과 배포 흐름에 맞는 실행 경로를 정해야 한다.

## Terraform 라이선스 이슈 (BUSL)

HashiCorp는 2023년 8월 이후 Terraform을 포함한 제품의 향후 릴리스 소스 코드를 MPL 2.0에서 BUSL 1.1로 바꾼다고 발표했다. 이 발표는 Terraform provider와 SDK 대부분에는 적용되지 않았다. 뒤이어 OpenTofu가 Terraform 포크로 출범했다. 라이선스와 배포 방식은 IaC 도구 선택의 실질 변수다.

## 도구 선택 원칙

- **진보성이 아니라 현재 한계를 푸는가**로 고른다. 팀이 작을수록 운영 안정성, 커뮤니티, IDE 생산성의 가중치가 크다.
- 도구 교체는 코드 변경이 아니라 **협업 방식과 관리 철학의 변경**이다. 명확한 필요(pain)와 조직적 지원이 있을 때만 전환이 성공한다.
- 도구를 얹는 순서: 순수 Terraform → DRY 한계(Terragrunt) → 테스트 한계(Terratest) → 협업(Atlantis) → 표현력, IDE, 테스트의 근본 해결(Pulumi). 모든 팀이 끝까지 갈 필요는 없고, 자기 한계 지점에서 멈춘다.

## 면접 체크포인트

- Terragrunt가 푸는 문제(HCL DRY)와 그 대가(IDE, 표현력, `.terragrunt-cache`, `run --all apply` 출력)
- Terratest가 통합 테스트는 되지만 단위 테스트가 어려운 이유(실제 프로비저닝 의존)
- Atlantis의 PR 기반 plan/apply 협업 모델과 GitOps 연결
- Pulumi가 HCL 도구 대비 주는 것(타입 안전, 단위 테스트, 범용 언어 표현력)과 대가(일관성 부담, 파이프라인 직접 구성)
- BUSL 라이선스 전환과 OpenTofu 포크가 도구 선택에 미치는 영향

## 출처
- [인프랩 IaC 구축기 — 인프랩 기술블로그](https://tech.inflab.com/20240201-inflab-iac/)
- [Terragrunt, Strict controls](https://docs.terragrunt.com/reference/strict-controls/)
- [Terragrunt, Implicit Stacks](https://docs.terragrunt.com/features/stacks/implicit/)
- [Terragrunt, `run --all`](https://docs.terragrunt.com/reference/cli/commands/run/#all)
- [Terratest, Terragrunt module](https://github.com/gruntwork-io/terratest/tree/main/modules/terragrunt)
- [Atlantis, Using Atlantis](https://www.runatlantis.io/docs/using-atlantis)
- [Pulumi, State and Backends](https://www.pulumi.com/docs/reference/state/)
- [Pulumi, Unit Testing Pulumi Programs](https://www.pulumi.com/docs/iac/guides/testing/unit/)
- [HashiCorp, Business Source License announcement](https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license)
- [OpenTofu, Fork announcement](https://opentofu.org/blog/opentofu-announces-fork-of-terraform/)

## 관련 문서
- [[IaC|IaC (Infrastructure as Code)]]
- [[CDK-vs-Terraform|CDK vs Terraform (IaC 도구 선택)]]
- [[CloudFormation|AWS CloudFormation]]
- [[Monolith-vs-Microservice|아임웹 MSA — 테라폼 모듈로 인프라 자동화]]
