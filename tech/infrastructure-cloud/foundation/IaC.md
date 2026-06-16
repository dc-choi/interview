---
tags: [infrastructure, iac, terraform, ansible, gitops, devops]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["IaC", "Infrastructure as Code", "테라폼", "코드형 인프라"]
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
| 제거, 변경 | 상태 추적으로 간편(코드에서 빼면 삭제됨) | 변경, 삭제 절차를 직접 작성 |
| 예 | Terraform, Ansible 플레이북, Puppet, CloudFormation | 셸 스크립트, Chef 레시피(절차적) |

선언형이 IaC의 주류다. 현재 상태를 몰라도 원하는 상태만 적으면 되니 멱등성과 드리프트 교정에 유리하다.

**CDK, Pulumi의 위치**: 범용 프로그래밍 언어(TS, Python 등)로 인프라를 작성해 절차적 작성 경험을 주지만, 내부적으로는 선언적 모델(CDK는 CloudFormation 템플릿)로 합성한다. 즉 **작성 패러다임과 실행 모델은 별개**다. 한 회사의 영속 리소스를 팀 단위로 관리한다면 선언형 도구(Terraform 등)가 무난하고, 애플리케이션 생명주기에 묶이는 일시적 리소스에는 CDK/Pulumi가 어울린다.

## push vs pull 모델

구성을 대상 노드에 어떻게 전달하느냐의 구분.

- **push**: 중앙 제어 노드가 대상 서버로 구성을 밀어 넣는다. 대상에 에이전트 설치가 필요 없을 수 있다(에이전트리스). 예: **Ansible**(SSH로 push).
- **pull**: 대상 서버의 에이전트가 중앙 서버에서 원하는 상태를 주기적으로 당겨와 스스로 적용한다. 주기적 동기화라 드리프트를 지속 교정하는 데 강하다. 예: **Puppet, Chef, SaltStack**.

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
- **락킹(Locking)**: 동시에 여러 명이 상태를 바꾸지 못하게 잠금(DynamoDB 등으로).
- **Plan**: apply 전 변경 사항을 미리 계산, 검토. 실수 적용을 막는 안전장치.

## 가변 vs 불변 인프라, 구성 드리프트

- **구성 드리프트(Configuration Drift)**: 코드가 정의한 원하는 상태와 실제 인프라가 어긋나는 현상. 주로 누군가 콘솔에서 수동으로 손대거나, 서버마다 패치가 제각각 쌓이며 발생(스노우플레이크 서버).
- **가변(Mutable) 인프라**: 기존 서버를 in-place로 수정. 누적될수록 드리프트, 비재현성 위험.
- **불변(Immutable) 인프라**: 변경 시 기존을 고치지 않고 **새 이미지/인스턴스로 통째 교체**(골든 이미지, 블루-그린). 드리프트를 원천 차단하고 롤백이 깨끗하다. IaC 모범 사례는 불변 지향.

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

- 선언형 vs 명령형의 차이와 각 도구가 어디에 속하는지(Terraform, Ansible = 선언형 / 스크립트, Chef = 절차형)
- push(Ansible) vs pull(Puppet, Chef) 모델의 트레이드오프
- 프로비저닝 도구 vs 구성 관리 도구의 역할 구분과 조합
- 상태, 멱등성, 구성 드리프트, 불변 인프라가 왜 IaC의 핵심 가치인지
- IaC가 CI/CD, GitOps와 어떻게 맞물려 DevOps를 떠받치는지

## 출처
- [Infrastructure as Code(IaC)란? — Red Hat](https://www.redhat.com/ko/topics/automation/what-is-infrastructure-as-code-iac)
- [AWSome IaC 발표 자료](https://github.com/drakejin/20250628-tbm)

## 관련 문서
- [[CDK-vs-Terraform|CDK vs Terraform (IaC 도구 선택)]]
- [[IaC-Tooling-Evolution|IaC 도구 선택 사다리 (Terragrunt, Terratest, Pulumi)]]
- [[Declarative-Programming|선언형 프로그래밍]]
- [[CloudFormation|AWS CloudFormation]]
- [[ECS-SQS-Worker-Terraform|ECS SQS Worker — Terraform 구성]]
- [[Blue-Green|Blue-Green 배포 (불변 인프라)]]
- [[DevOps-vs-DevSecOps|DevOps vs DevSecOps]]
- [[Monolith-vs-Microservice|아임웹 MSA — 테라폼 모듈로 인프라 자동화]]
