---
tags: [infrastructure, iac, terraform, terragrunt, terratest, pulumi, atlantis]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Terragrunt", "Terratest", "Pulumi", "Atlantis", "IaC 도구 선택"]
---

# IaC 도구 선택 사다리 (Terragrunt, Terratest, Pulumi)

순수 Terraform으로 시작해도 규모가 커지면 **중복(DRY), 테스트, 협업, 표현력**의 한계에 차례로 부딪힌다. 각 한계를 메우려 보조 도구가 얹히고(Terragrunt, Terratest, Atlantis), 한계가 누적되면 아예 **범용 언어 기반 IaC(Pulumi)** 로 패러다임을 바꾸기도 한다. 도구는 진보 순이 아니라 **지금의 한계를 푸는가**로 고른다.

운영 가능한 IaC가 갖춰야 할 수준은 보통 셋으로 정리된다.

1. 특수 케이스를 제외한 **모든 인프라를 IaC로** 관리
2. 한 번 구축한 구성을 **누구든 쉽고 빠르게 재구축**
3. **정책 준수와 오류 검증을 자동화**

각 도구는 이 셋 중 어디를 채워 주느냐로 평가한다.

## Terragrunt — Terraform의 DRY 래퍼

순수 Terraform은 dev/staging/prod처럼 거의 같은 구성을 환경마다 복제하게 만든다. Terragrunt는 Terraform을 감싸는 **얇은 래퍼**로, remote backend, provider 설정, 변수 주입을 한 곳에 정의해 HCL 중복을 줄인다(래퍼 스택 패턴). `run-all`로 여러 스택을 한 번에 적용한다.

트레이드오프:

- **IDE 지원 부족** — HCL 한계 그대로라 자동완성, 타입 힌팅, 안전한 리팩터링이 어렵다.
- **표현력 한계** — 간단한 조건문, 반복도 코드 복잡도가 급격히 오른다.
- **`.terragrunt-cache`** — 캐시 디렉토리가 `node_modules`급으로 무거워지고 꼬인다.
- **`run-all` 출력 혼선** — 여러 스택의 출력이 섞여 가독성이 떨어진다.
- **종속성 관리 비효율** — 스택 간 의존 처리로 느려진다.

DRY는 얻지만 가독성, 표현력, 도구 경험은 HCL의 천장에 묶인다.

## Terratest — Terraform 테스트

Go로 작성하는 테스트 라이브러리. `apply`로 실제 리소스를 띄우고 그 결과를 검증하는 **통합 테스트** 도구다.

한계: 실제 프로비저닝을 거쳐야 하므로 **진짜 단위 테스트는 어렵다**(비용, 속도). Go 래퍼라 HCL 로직 자체를 격리 검증하기보다 결과를 사후 확인하는 데 가깝다.

## Atlantis — PR 기반 plan/apply 협업

`terraform plan` 결과를 **PR 코멘트로 자동 게시**하고, 리뷰 승인 후 `apply`까지 PR에서 수행하는 협업 워크플로우 도구. 인프라 변경을 코드 리뷰 흐름에 태워 [[IaC#CI/CD, DevOps, GitOps 연결|GitOps]]에 가깝게 만든다.

트레이드오프: 중앙 파이프라인 구축이 예상보다 손이 많이 간다(운영 복잡도).

## Pulumi — 범용 언어 기반 IaC

HCL 대신 **TypeScript, Python, Go 등 범용 언어**로 인프라를 작성한다. 조건, 반복, 추상화, 패키지 분리를 언어 그대로 쓰므로 Terragrunt가 끙끙대던 표현력, IDE 문제를 근본에서 해소한다. 내부적으로는 [[CDK-vs-Terraform|선언적 상태]]를 유지한다.

도입 시 흔히 거는 요구사항:

- **범용 언어** 기반(익숙한 언어 + 타입 시스템)
- IaC 외부에서 만든 리소스의 **import 용이성**
- state를 **자체 저장**(예: S3) — 벤더 SaaS 강제 거부

강점:

- **타입 안전성, IDE** — 자동완성, 타입 힌팅, 리팩터링. (Pulumi Automation API + 제네릭으로 전 영역 타입 힌팅 확보 가능)
- **테스트** — Pulumi Mock으로 **단위 테스트**가 되고, 픽스처로 최소 비용 통합 테스트. Terratest의 단위 테스트 한계를 넘음.
- **State 자체 관리** — S3 백엔드로 SaaS 없이 운영. StackReference도 SaaS 없이 동작.
- **모노레포** — Nx 등으로 스택, 컴포넌트 간 종속성 관리.
- **비밀 관리** — Secrets Manager에서 캐싱해 사용.
- **라이선스 독립** — 아래 Terraform BUSL 전환의 영향을 받지 않는다.

트레이드오프:

- **자유도의 대가** — 범용 언어라 표현력이 큰 만큼 컨벤션 없이는 일관성이 흐트러진다.
- **파이프라인 직접 구성** — 중앙 집중식 배포가 기본 제공되지 않아, 엔지니어 PC 실행 + 슬랙 알림 같은 보완이 필요할 수 있다.

## Terraform 라이선스 이슈 (BUSL)

Terraform은 2023년 8월 오픈소스(MPL)에서 **BUSL(Business Source License)** 로 전환됐다. 경쟁 제품 제공을 제약하는 조항 탓에 일부 조직은 도구 선택을 재검토했고, 커뮤니티는 **OpenTofu**(Linux Foundation)로 포크했다. 범용 언어 기반 도구(Pulumi 등)나 OpenTofu는 이 변경의 직접 영향을 받지 않는다. 라이선스는 IaC 도구 선택의 실질 변수다.

## 도구 선택 원칙

- **진보성이 아니라 현재 한계를 푸는가**로 고른다. 팀이 작을수록 운영 안정성, 커뮤니티, IDE 생산성의 가중치가 크다.
- 도구 교체는 코드 변경이 아니라 **협업 방식과 관리 철학의 변경**이다. 명확한 필요(pain)와 조직적 지원이 있을 때만 전환이 성공한다.
- 도구를 얹는 순서: 순수 Terraform → DRY 한계(Terragrunt) → 테스트 한계(Terratest) → 협업(Atlantis) → 표현력, IDE, 테스트의 근본 해결(Pulumi). 모든 팀이 끝까지 갈 필요는 없고, 자기 한계 지점에서 멈춘다.

## 면접 체크포인트

- Terragrunt가 푸는 문제(HCL DRY)와 그 대가(IDE, 표현력, `.terragrunt-cache`, run-all 출력)
- Terratest가 통합 테스트는 되지만 단위 테스트가 어려운 이유(실제 프로비저닝 의존)
- Atlantis의 PR 기반 plan/apply 협업 모델과 GitOps 연결
- Pulumi가 HCL 도구 대비 주는 것(타입 안전, 단위 테스트, 범용 언어 표현력)과 대가(일관성 부담, 파이프라인 직접 구성)
- BUSL 라이선스 전환과 OpenTofu 포크가 도구 선택에 미치는 영향

## 출처
- [인프랩 IaC 구축기 — 인프랩 기술블로그](https://tech.inflab.com/20240201-inflab-iac/)

## 관련 문서
- [[IaC|IaC (Infrastructure as Code)]]
- [[CDK-vs-Terraform|CDK vs Terraform (IaC 도구 선택)]]
- [[CloudFormation|AWS CloudFormation]]
- [[Monolith-vs-Microservice|아임웹 MSA — 테라폼 모듈로 인프라 자동화]]
