---
tags: [infrastructure, aws, step-functions, workflow, orchestration, serverless]
status: done
verified_at: 2026-08-04
category: "Infrastructure - AWS"
aliases: ["AWS Step Functions", "Step Functions", "State Machine"]
---

# AWS Step Functions

AWS 서비스 호출과 애플리케이션 작업을 상태 머신으로 연결하는 관리형 워크플로 오케스트레이션 서비스다. 분기, 병렬 처리, 대기, 재시도와 실패 경로를 코드 밖의 명시적 실행 흐름으로 관리한다.

## 상태 머신과 상태

워크플로는 Amazon States Language로 정의한다. 각 상태는 입력을 받고 결과를 다음 상태로 전달한다.

| 상태 | 역할 |
|---|---|
| `Task` | Lambda, AWS API, HTTPS API 또는 작업자 호출 |
| `Choice` | 조건에 따라 다음 경로 선택 |
| `Parallel` | 독립 분기를 동시에 실행하고 결과 결합 |
| `Map` | 배열이나 데이터 소스의 항목을 반복 처리 |
| `Wait` | 지정 시간이나 시각까지 실행 중지 |
| `Pass` | 데이터 변환 또는 자리 표시 |
| `Succeed`, `Fail` | 실행을 명시적으로 성공 또는 실패 종료 |

상태 사이에 전달하는 데이터는 JSONPath 또는 JSONata 기반 필드로 선택, 변환한다. 큰 페이로드를 상태에 계속 복사하기보다 S3 같은 외부 저장소에 두고 식별자만 전달하면 실행 기록 크기와 비용을 제어하기 쉽다.

## Standard와 Express

| 기준 | Standard | Express |
|---|---|---|
| 적합한 작업 | 장기 실행, 감사 가능한 비즈니스 흐름 | 고빈도, 짧은 이벤트 처리 |
| 실행 의미 | 명시한 `Retry`를 제외한 exactly-once 워크플로 실행 | 비동기식은 at-least-once, 동기식은 at-most-once |
| 실행 기록 | Step Functions가 실행 기록 보관 | CloudWatch Logs를 명시적으로 활성화 |
| 통합 제약 | 모든 통합 패턴 지원 | `.sync`, `.waitForTaskToken` 미지원 |

워크플로 유형은 생성 후 바꿀 수 없다. Express 작업은 중복 실행 가능성을 전제로 멱등하게 설계하고, 결제처럼 비멱등 작업은 Standard를 우선 검토한다. Standard라고 외부 서비스 호출 자체가 자동으로 멱등해지는 것은 아니므로 재시도 대상 작업에는 idempotency key나 조건부 쓰기가 필요하다.

## 서비스 통합 패턴

| 패턴 | 완료 판단 |
|---|---|
| Request Response | API 응답을 받으면 다음 상태로 이동 |
| Run a Job (`.sync`) | Batch, ECS 같은 작업의 종료까지 대기 |
| Wait for Callback (`.waitForTaskToken`) | 외부 작업자가 task token을 돌려줄 때까지 대기 |

지원 여부는 워크플로 유형과 대상 서비스에 따라 다르다. Lambda 호출뿐 아니라 AWS SDK 통합, 최적화 통합, HTTPS API 호출을 사용할 수 있으며, 가능하면 워크플로용 응답 처리가 적용된 최적화 통합을 먼저 검토한다.

## 오류와 보상 설계

- `Task`, `Parallel`, `Map`에 `Retry`를 두고 오류 이름별 `IntervalSeconds`, `BackoffRate`, `MaxAttempts`, `MaxDelaySeconds`, `JitterStrategy`를 설정한다.
- 재시도 소진 뒤 `Catch`로 복구 상태를 연결하고 `ResultPath`로 원래 입력과 오류 정보를 함께 보존한다.
- `States.ALL`이 모든 종료 오류를 잡는 것은 아니다. 런타임 오류와 데이터 크기 오류 등은 별도로 이해해야 한다.
- 최상위 실행 실패는 같은 실행의 `Catch`로 잡을 수 없다. 호출자가 처리하거나 부모 워크플로에 중첩하고, Standard 실행 상태 이벤트를 EventBridge로 처리한다.
- 여러 시스템에 이미 반영된 작업은 단순 롤백보다 취소 주문, 환불처럼 도메인 보상 작업을 명시한다.

## 운영 체크리스트

- 각 `Task`에 timeout과 필요한 경우 heartbeat를 둔다.
- 재시도 가능 오류와 즉시 실패할 오류를 구분하고, 재시도 횟수와 총 지연 시간을 제한한다.
- 상태 머신 실행 역할에는 실제 호출할 작업만 최소 권한으로 부여한다.
- Express는 CloudWatch Logs를 켜고, 입력에 자격 증명이나 민감 정보를 넣지 않는다.
- 실행 이름, 업무 식별자, trace id를 연결해 재실행과 장애 분석 경로를 만든다.
- Map의 동시성과 하위 서비스 할당량을 함께 제한해 fan-out이 스로틀링을 증폭하지 않게 한다.

## 선택 기준

- 여러 Lambda에 분기, 병렬 실행, 대기, 재시도와 보상이 필요하면 Step Functions가 적합하다.
- 단일 함수 안의 짧고 단순한 순차 로직까지 상태 머신으로 쪼개면 전이 비용과 운영 복잡도만 늘 수 있다.
- 이벤트 라우팅은 [[EventBridge]], 작업 완충은 [[SQS]], 실행 순서와 상태 관리는 Step Functions로 책임을 나눈다.

## 출처

- [AWS Step Functions — Choosing workflow type](https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html)
- [AWS Step Functions — Service integrations](https://docs.aws.amazon.com/step-functions/latest/dg/integrate-services.html)
- [AWS Step Functions — Error handling](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)
- [Sungmin Kim 강사 — Serverless란?](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69321)
- [Sungmin Kim 강사 — Step Function](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69322)

## 관련 문서

- [[AWS-Lambda|AWS Lambda]]
- [[EventBridge]]
- [[SQS]]
- [[CloudFormation]]
