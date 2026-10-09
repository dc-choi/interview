---
tags: [infrastructure, aws, control-tower, governance, multi-account]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["AWS Control Tower", "랜딩 존과 계정 거버넌스"]
---

# AWS Control Tower

AWS Organizations 등 여러 서비스의 기능을 조합해 멀티 계정 환경을 구성하고 관리하는 서비스다. 공통 기반인 **랜딩 존**, 계정 생성 절차와 통제를 제공한다. 계정마다 운영자가 같은 설정을 반복하는 부담을 줄이는 데 쓰인다.

## 관리 단위를 먼저 나눈다

- **Organizations와 OU**: 여러 계정을 조직하고 정책을 적용할 범위를 정한다.
- **랜딩 존**: 계정 구조와 공통 거버넌스의 기반을 구성한다.
- **Account Factory**: 조직의 표준에 맞춘 계정 프로비저닝을 돕는다.
- **Controls**: 정책 위반을 차단하거나 탐지한다. 이름이 비슷해도 동작과 적용 범위는 다르다.

예를 들어 외부 API를 제공하는 계정과 내부 업무 계정을 분리하면 각 경계에 적용할 권한과 통제를 다르게 설계할 수 있다. 다만 계정을 만들었다는 사실만으로 애플리케이션 인증, 네트워크 연결과 데이터 접근 정책까지 완성되지는 않는다.

## 랜딩 존 설계와 구현 수단을 구분한다

랜딩 존은 Control Tower라는 제품명과 같은 뜻이 아니다. AWS 공식 지침은 Control Tower 기반 구성과 직접 구축하는 사용자 정의 랜딩 존을 구분한다. 어느 방식을 택하든 접근 관리, 기술 스택과 모니터링 요구사항은 조직의 조건에 맞춰 정하고 문서화해야 한다(2026-10-10 확인).

첫 서비스에 맞춘 기반을 여러 서비스로 확장할 때는 계정 생성 속도뿐 아니라 다음 경계를 다시 검토한다. 이는 랜딩 존 설계 지침을 적용한 운영 제안이다.

- **분리할 것:** 서비스와 환경별 접근 권한, 변경 영향과 비용을 구분할 계정 경계
- **공통으로 관리할 것:** 표준 설정, 감사 로그, 모니터링 요구사항과 운영 담당자
- **변경할 때 남길 것:** 설계 이유, 승인된 변경 이력과 실제 대상에 적용된 결과

설계 문서는 개발자와 운영자가 함께 볼 수 있는 위치에서 관리하고, 조직에 맞는 변경 검토와 승인 절차를 둔다. IaC 템플릿을 재사용해도 새 워크로드의 접근 권한이나 운영 요구사항이 자동으로 충족되는 것은 아니다. 외부 구축 업체가 참여했는지와 별개로 내부 운영자가 구조, 예외와 변경 절차를 이해할 수 있어야 한다.

## 통제의 세 가지 동작

| 동작 | 구현 수단 | 판정할 때 주의할 점 |
|---|---|---|
| Preventive | Organizations의 SCP, RCP, declarative policy | 정책 위반 행위를 제한한다. 통제 활성화 여부와 실제 정책 범위를 확인한다 |
| Detective | AWS Config 규칙 | 위반을 탐지하고 표시한다. 탐지 결과를 행위 차단이나 자동 복구로 해석하지 않는다 |
| Proactive | CloudFormation hooks | CloudFormation으로 프로비저닝하는 리소스를 사전 검사한다. 모든 생성 경로에 적용된다고 가정하지 않는다 |

`mandatory`, `strongly recommended`, `elective`는 적용 권고 분류다. 위의 동작 분류와 별개다. 공식 문서 기준 랜딩 존 4.0부터 mandatory controls도 기본 적용되지 않으므로, 분류 이름 대신 환경에서 실제 활성화한 통제를 확인한다.

## CfCT — 공통 정책 배포와 승인

Customizations for AWS Control Tower(CfCT)는 CloudFormation 템플릿과 SCP, RCP를 계정 또는 OU에 배포해 랜딩 존을 확장한다. Account Factory의 새 계정 생성 같은 lifecycle event와도 연결된다. 대상 OU에는 `AWSControlTowerBaseline`이 활성화되어 있어야 한다.

2026-10-08 공식 문서로 확인한 구성과 실행 경계는 다음과 같다.

1. **설치 위치:** Control Tower 관리 계정과 홈 리전에 CfCT를 배포한다.
2. **입력 검증:** 구성 패키지의 manifest, 템플릿과 정책을 CodePipeline으로 처리한다. Build 단계는 manifest의 구문과 스키마, CloudFormation 템플릿을 검사한다.
3. **승인:** 수동 승인 단계는 기본으로 꺼져 있다. `Pipeline Approval Stage`를 `Yes`로 설정하면 검증 후 배포를 멈추고 승인을 기다린다. IaC를 사용한다는 사실만으로 사람의 승인이 보장되지는 않는다.
4. **배포:** SCP, RCP와 CloudFormation 리소스 배포 단계가 이어진다. CloudFormation 리소스 간 의존성은 manifest에 나열한 순서로 표현한다.

운영에서는 검증 통과, 승인 완료와 대상 계정의 배포 성공을 별도 상태로 확인한다. 문법 검사는 조직의 권한 설계나 애플리케이션 동작의 적합성까지 보장하지 않는다. 이 절은 설정 문서 대조이며 실제 계정에 배포한 결과는 아니다.

## 운영에서 확인할 경계

다음은 통제의 범위와 AWS 공동 책임 모델을 적용한 점검 기준이다.

1. 대상 계정과 OU가 의도한 거버넌스 범위에 들어왔는지 확인한다.
2. 통제별 적용 리전, 지원 리소스와 활성화 상태를 확인한다.
3. 탐지 통제에는 알림 담당자와 조치 절차를 연결한다.
4. 계정 생성 후 워크로드에 필요한 IAM, 네트워크와 로그 경로를 확인한다.
5. 설정 변경이나 드리프트가 생기면 현재 상태를 확인하고 복구한다.

Control Tower 도입 자체가 규제 준수의 완료 증거는 아니다. AWS가 관리하는 기반 시설과 별개로 고객은 데이터의 민감도, 조직 요구사항과 적용 법규에 대한 책임을 갖는다. 특정 산업의 준수 여부는 실제 요구사항과 통제 증거를 대조해 판단한다.

## 출처

- [AWS Prescriptive Guidance, Document your AWS landing zone design](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/document-your-aws-landing-zone-design.html)
- [AWS와 함께하는 신한카드의 pLay — Amazon Web Services Korea](https://www.youtube.com/watch?v=FUt8eR5o3Kc) — 랜딩 존 재설계와 표준화의 발표 사례. 자체 구축을 Control Tower 도입 사례로 단정하지 않는다.
- [AWS, Customizations for AWS Control Tower (CfCT) overview](https://docs.aws.amazon.com/controltower/latest/userguide/cfct-overview.html)
- [AWS, Code pipeline overview](https://docs.aws.amazon.com/controltower/latest/userguide/cfct-codepipeline-overview.html)
- [AWS, Deployment considerations](https://docs.aws.amazon.com/controltower/latest/userguide/cfct-considerations.html)
- [AWS, What Is AWS Control Tower?](https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html)
- [AWS, Control behavior and guidance](https://docs.aws.amazon.com/controltower/latest/controlreference/control-behavior.html)
- [AWS, Security in AWS Control Tower](https://docs.aws.amazon.com/controltower/latest/userguide/security.html)
- [금융의 미래를 여는 BaaS, AWS와 함께한 우리은행의 여정 — Amazon Web Services Korea](https://www.youtube.com/watch?v=BwbzvLSvDpU)

## 관련 문서

- [[AWS-Organizations|AWS Organizations와 SCP]]
- [[CloudTrail-Config|감사 로그와 구성 추적]]
- [[IAM|IAM 정책과 권한]]
