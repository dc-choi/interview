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

## 통제의 세 가지 동작

| 동작 | 구현 수단 | 판정할 때 주의할 점 |
|---|---|---|
| Preventive | Organizations의 SCP, RCP, declarative policy | 정책 위반 행위를 제한한다. 통제 활성화 여부와 실제 정책 범위를 확인한다 |
| Detective | AWS Config 규칙 | 위반을 탐지하고 표시한다. 탐지 결과를 행위 차단이나 자동 복구로 해석하지 않는다 |
| Proactive | CloudFormation hooks | CloudFormation으로 프로비저닝하는 리소스를 사전 검사한다. 모든 생성 경로에 적용된다고 가정하지 않는다 |

`mandatory`, `strongly recommended`, `elective`는 적용 권고 분류다. 위의 동작 분류와 별개다. 공식 문서 기준 랜딩 존 4.0부터 mandatory controls도 기본 적용되지 않으므로, 분류 이름 대신 환경에서 실제 활성화한 통제를 확인한다.

## 운영에서 확인할 경계

다음은 통제의 범위와 AWS 공동 책임 모델을 적용한 점검 기준이다.

1. 대상 계정과 OU가 의도한 거버넌스 범위에 들어왔는지 확인한다.
2. 통제별 적용 리전, 지원 리소스와 활성화 상태를 확인한다.
3. 탐지 통제에는 알림 담당자와 조치 절차를 연결한다.
4. 계정 생성 후 워크로드에 필요한 IAM, 네트워크와 로그 경로를 확인한다.
5. 설정 변경이나 드리프트가 생기면 현재 상태를 확인하고 복구한다.

Control Tower 도입 자체가 규제 준수의 완료 증거는 아니다. AWS가 관리하는 기반 시설과 별개로 고객은 데이터의 민감도, 조직 요구사항과 적용 법규에 대한 책임을 갖는다. 특정 산업의 준수 여부는 실제 요구사항과 통제 증거를 대조해 판단한다.

## 출처

- [AWS, What Is AWS Control Tower?](https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html)
- [AWS, Control behavior and guidance](https://docs.aws.amazon.com/controltower/latest/controlreference/control-behavior.html)
- [AWS, Security in AWS Control Tower](https://docs.aws.amazon.com/controltower/latest/userguide/security.html)
- [금융의 미래를 여는 BaaS, AWS와 함께한 우리은행의 여정 — Amazon Web Services Korea](https://www.youtube.com/watch?v=BwbzvLSvDpU)

## 관련 문서

- [[AWS-Organizations|AWS Organizations와 SCP]]
- [[CloudTrail-Config|감사 로그와 구성 추적]]
- [[IAM|IAM 정책과 권한]]
