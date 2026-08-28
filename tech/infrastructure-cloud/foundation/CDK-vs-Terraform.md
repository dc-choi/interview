---
tags: [infrastructure, iac, terraform, cdk, cloudformation, drift]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["CDK vs Terraform", "AWS CDK Terraform 비교", "CDK to Terraform"]
verified_at: 2026-08-28
---

# CDK vs Terraform (IaC 도구 선택)

AWS CDK와 Terraform은 모두 선언한 구성을 현재 상태와 비교해 변경을 계획하는 IaC 도구다. CDK는 CloudFormation 스택과 템플릿을, Terraform은 state와 provider 조회를 사용한다. `cdk diff`와 `terraform plan`의 모드에 따라 실제 리소스를 확인하는 범위가 달라지므로, 출력만으로 모든 변경 위험이 사라진다고 보지 않는다.

## 두 도구의 구조 차이

- **CDK**: TS/Python 등 범용 언어로 작성 → **CloudFormation 템플릿으로 합성** → CloudFormation이 배포. 상태는 CloudFormation 스택이 들고 있다.
- **Terraform**: HCL로 작성 → 자체 **상태 파일(state)** 로 관리 → 일반 `plan`은 provider를 통해 기존 원격 객체를 읽어 state를 갱신한 뒤 변경을 제안한다. `-refresh=false`면 이 확인을 생략한다.

두 도구 모두 생성할 리소스와 교체 가능성을 배포 전에 검토해야 한다. CDK는 `cdk synth`와 change set, Terraform은 최종 plan을 CI와 승인 절차에서 보관하면 추적성이 높아진다.

## 변경 예고와 드리프트 검증

`cdk diff`는 로컬 CDK 코드에서 합성한 CloudFormation 템플릿과 배포된 스택 템플릿을 비교한다. 기본 `--method=auto`는 가능한 경우 읽기 전용 CloudFormation change set을 만들어 교체 정보를 더 정확히 보여 주고, 권한 등의 이유로 만들 수 없으면 template-only diff로 fallback한다. 교체 판단이 중요한 배포에서는 `--method=change-set`으로 실패를 드러내거나, change set을 별도 승인 단계로 둔다.

`cdk drift`는 별도 명령이다. CloudFormation drift detection으로 실제 리소스와 기대 구성을 비교하지만, 지원되는 리소스와 속성에 한정된다. 감지 결과를 코드에 자동 반영하는 기능으로 해석하지 말고, 원인 확인 뒤 코드 또는 실제 구성을 의도적으로 맞춘다.

Terraform의 일반 `plan`은 원격 객체를 읽어 state를 최신화한 뒤 구성을 비교한다. 다만 `-refresh=false`면 외부 변경을 보지 않으며, speculative plan 뒤 다른 변경이 생기면 실제 apply 결과가 달라질 수 있다. apply 직전의 최종 plan을 다시 확인한다.

[[IaC#가변 vs 불변 인프라, 구성 드리프트|드리프트]] = 코드가 정의한 상태와 실제 인프라가 어긋나는 현상. 콘솔 수동 변경, AWS의 자동 업데이트(AMI ID 갱신, RDS 마이너 버전 업그레이드) 등으로 불가피하게 발생한다. 이를 전부 차단하는 것은 현실적으로 불가능하므로, 도구가 드리프트를 어떻게 보여주고 흡수하느냐가 중요하다.

- **CDK**: `cdk drift`로 CloudFormation이 지원하는 리소스의 실제 상태를 별도 검사한다.
- **Terraform**: 일반 plan의 refresh로 관리 대상 원격 객체 변경을 볼 수 있으나, refresh를 끈 plan과 plan 이후 변경은 별도 위험으로 남는다.

## 인프라 투명성

- **CDK**: 고수준 construct가 IAM 정책 등 여러 리소스를 합성할 수 있으므로 `cdk synth`와 change set으로 산출물을 확인한다.
- **Terraform**: module과 provider abstraction이 실제 리소스를 감출 수 있으므로 plan과 state를 함께 검토한다.

## 언어, 학습 곡선의 트레이드오프

| 항목 | AWS CDK | Terraform |
|---|---|---|
| 언어 | 범용 언어(TS/Python) | HCL(도메인 특화) |
| 초기 진입장벽 | 낮음(익숙한 언어) | 높음(HCL 학습) |
| 장기 운영성 | 프로젝트 구조가 복잡해지기 쉬움 | 문법이 단순해 유지보수 부담 적음 |
| 상태 추적 | CloudFormation 스택과 템플릿, diff 방법에 따라 change set 사용 | state와 provider 조회, `-refresh=false`면 원격 조회 생략 |
| 드리프트 대응 | `cdk drift`로 지원 범위 별도 검사 | 일반 plan refresh와 refresh-only plan으로 확인 |
| 커뮤니티, 문서 | 상대적으로 얕음 | 성숙(튜토리얼, 서적, 오픈소스 다수) |

CDK는 익숙한 언어로 빠르게 시작하지만 코드 구조가 커질수록 운영 복잡도가 오른다. Terraform은 HCL을 새로 익혀야 하나 문법이 단출하고 참고 자료가 많아 장기 운영에 유리하다.

## 의사결정 원칙

- 기술의 진보성보다, **팀 규모가 작을수록 운영 안정성, 문서, 커뮤니티 규모**의 가중치가 커진다.
- 선택 기준은 "가장 앞선 도구"가 아니라 **"지금 이 상황에 가장 도움이 되는 도구"**.
- diff가 어떤 입력을 비교하고, 교체와 drift를 어떤 별도 단계에서 검증하는가가 IaC 도구의 일급 평가 기준.

마이그레이션의 구현 상세(기존 리소스 `terraform import`, 모듈 구조, Terragrunt, Terratest)는 도구 선택과 별개의 후속 작업 영역이다.

## 면접 체크포인트

- CDK `diff`의 template-only와 change set 모드, `cdk drift`의 역할 차이
- Terraform 일반 plan의 remote refresh와 `-refresh=false`, apply 직전 재검토 필요성
- 드리프트가 불가피한 이유(콘솔 수정, AWS 자동 업데이트)와 두 도구의 대응 차이
- 고수준 construct와 Terraform module의 산출물을 plan, synth로 확인하는 방법
- IaC 도구 선택에서 진보성보다 운영 안정성, 커뮤니티를 우선하는 판단 근거

## 출처
- [AWS CDK, cdk diff](https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-diff.html)
- [AWS CDK, cdk drift](https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-drift.html)
- [HashiCorp Terraform, plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [AWS CDK에서 Terraform으로 마이그레이션한 이유 — 인프랩 기술블로그](https://tech.inflab.com/202202-aws-cdk-to-terraform/)

## 관련 문서
- [[IaC|IaC (Infrastructure as Code)]]
- [[IaC-Tooling-Evolution|IaC 도구 선택 사다리 (Terragrunt, Terratest, Pulumi)]]
- [[CloudFormation|AWS CloudFormation]]
- [[Declarative-Programming|선언형 프로그래밍]]
- [[Monolith-vs-Microservice|아임웹 MSA — 테라폼 모듈로 인프라 자동화]]
