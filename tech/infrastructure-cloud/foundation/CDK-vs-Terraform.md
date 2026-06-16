---
tags: [infrastructure, iac, terraform, cdk, cloudformation, drift]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["CDK vs Terraform", "AWS CDK Terraform 비교", "CDK to Terraform"]
---

# CDK vs Terraform (IaC 도구 선택)

AWS CDK와 Terraform은 둘 다 IaC 도구지만 **상태를 추적하는 방식**이 근본적으로 다르다. CDK는 CloudFormation을 경유하고, Terraform은 실제 인프라를 직접 조회한다. 이 차이가 diff(변경 예고)의 신뢰성과 운영 안정성을 가른다. 도구의 화려함보다 **상태 추적의 정확성, 투명성, 커뮤니티 성숙도**가 선택의 실질 기준이 된다.

## 두 도구의 구조 차이

- **CDK**: TS/Python 등 범용 언어로 작성 → **CloudFormation 템플릿으로 합성** → CloudFormation이 배포. 상태는 CloudFormation 스택이 들고 있다.
- **Terraform**: HCL로 작성 → 자체 **상태 파일(state)** 로 관리 → apply 전 **실제 클라우드 API를 refresh**해 현재 상태를 읽는다.

핵심은 CDK가 한 단계(CloudFormation)를 더 거치고, 그 계층의 판단이 사용자에게 불투명하게 작동한다는 점이다.

## 핵심 문제: CloudFormation 경유 diff의 신뢰성

CDK의 `diff`는 **코드와 CloudFormation 템플릿의 차이만** 비교한다. 실제 인프라의 현재 상태는 조회하지 않는다. 그래서 코드, 템플릿, 현실 셋이 어긋나면 diff가 거짓을 말할 수 있다.

대표 시나리오:

1. CDK로 리소스 생성 (파라미터 = 1)
2. 누군가 콘솔에서 수동 수정 (파라미터 = 3)
3. CDK 코드에서 값을 2로 변경
4. CDK diff는 "1 → 2, 정상 in-place 업데이트"라고 표시 (현실의 3을 모름)
5. 실제 배포 시 CloudFormation은 현실(3)을 보고 "3 → 2는 **재생성 필요**"로 판단 → 리소스 삭제 후 재생성

즉 CDK가 경고하지 않은 **파괴적 변경**이 외부 요인 + CloudFormation의 판단으로 실행될 수 있다. 운영자 입장에서 diff를 믿을 수 없다는 것이 가장 큰 불안 요소다.

Terraform은 plan 시 실제 상태를 먼저 refresh한 뒤 diff를 제시하므로 **코드와 현실이 1:1**로 맞춰진다. 외부에서 바뀐 값도 plan에 드러난다.

## 구성 드리프트(Drift) 대응 비교

[[IaC#가변 vs 불변 인프라, 구성 드리프트|드리프트]] = 코드가 정의한 상태와 실제 인프라가 어긋나는 현상. 콘솔 수동 변경, AWS의 자동 업데이트(AMI ID 갱신, RDS 마이너 버전 업그레이드) 등으로 불가피하게 발생한다. 이를 전부 차단하는 것은 현실적으로 불가능하므로, 도구가 드리프트를 어떻게 보여주고 흡수하느냐가 중요하다.

- **CDK**: Drift Detection이 선택적이고, 감지해도 **복원만 가능**(현실을 코드로 역반영하지 못함).
- **Terraform**: plan이 항상 현실을 조회하므로 드리프트가 자연히 노출되고, 코드로 흡수하거나 명시적으로 대응할 옵션이 풍부.

## 인프라 투명성

- **CDK**: 고수준 construct가 IAM 정책 등 부수 리소스를 **자동으로 숨겨진 채 생성**한다. 무엇이 실제로 만들어지는지 코드만 봐선 알기 어렵다.
- **Terraform**: 리소스가 HCL 코드와 1:1로 대응해, 코드가 곧 인프라의 명세다.

## 언어, 학습 곡선의 트레이드오프

| 항목 | AWS CDK | Terraform |
|---|---|---|
| 언어 | 범용 언어(TS/Python) | HCL(도메인 특화) |
| 초기 진입장벽 | 낮음(익숙한 언어) | 높음(HCL 학습) |
| 장기 운영성 | 프로젝트 구조가 복잡해지기 쉬움 | 문법이 단순해 유지보수 부담 적음 |
| 상태 추적 | CloudFormation 경유(현실 미조회) | 실제 상태 직접 조회 |
| 드리프트 대응 | 제한적(복원만) | 풍부 |
| 커뮤니티, 문서 | 상대적으로 얕음 | 성숙(튜토리얼, 서적, 오픈소스 다수) |

CDK는 익숙한 언어로 빠르게 시작하지만 코드 구조가 커질수록 운영 복잡도가 오른다. Terraform은 HCL을 새로 익혀야 하나 문법이 단출하고 참고 자료가 많아 장기 운영에 유리하다.

## 의사결정 원칙

- 기술의 진보성보다, **팀 규모가 작을수록 운영 안정성, 문서, 커뮤니티 규모**의 가중치가 커진다.
- 선택 기준은 "가장 앞선 도구"가 아니라 **"지금 이 상황에 가장 도움이 되는 도구"**.
- diff를 신뢰할 수 있는가(상태 추적의 정확성)가 IaC 도구의 일급 평가 기준.

마이그레이션의 구현 상세(기존 리소스 `terraform import`, 모듈 구조, Terragrunt, Terratest)는 도구 선택과 별개의 후속 작업 영역이다.

## 면접 체크포인트

- CDK가 CloudFormation을 경유하며 생기는 diff 신뢰성 문제(코드, 템플릿, 현실 3자 불일치 시 파괴적 변경)
- Terraform이 plan 단계에서 실제 상태를 refresh해 얻는 1:1 대응의 가치
- 드리프트가 불가피한 이유(콘솔 수정, AWS 자동 업데이트)와 두 도구의 대응 차이
- 고수준 construct의 자동 생성이 인프라 투명성을 낮추는 지점
- IaC 도구 선택에서 진보성보다 운영 안정성, 커뮤니티를 우선하는 판단 근거

## 출처
- [AWS CDK에서 Terraform으로 마이그레이션한 이유 — 인프랩 기술블로그](https://tech.inflab.com/202202-aws-cdk-to-terraform/)

## 관련 문서
- [[IaC|IaC (Infrastructure as Code)]]
- [[IaC-Tooling-Evolution|IaC 도구 선택 사다리 (Terragrunt, Terratest, Pulumi)]]
- [[CloudFormation|AWS CloudFormation]]
- [[Declarative-Programming|선언형 프로그래밍]]
- [[Monolith-vs-Microservice|아임웹 MSA — 테라폼 모듈로 인프라 자동화]]
