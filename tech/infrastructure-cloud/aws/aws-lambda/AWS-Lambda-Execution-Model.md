---
tags: [aws, lambda, serverless, faas, cold-start, provisioned-concurrency]
status: done
category: "Infrastructure - AWS"
aliases: ["Lambda 실행 모델", "Lambda Cold Start"]
verified_at: 2026-08-27
---

# Lambda 실행 모델 — 표준 함수, Durable Functions, Cold Start

아래 기본 수명주기와 단일 동시 실행 설명은 **Lambda 기본 컴퓨팅의 표준 함수(Standard Functions)** 기준이다. Durable Functions와 Lambda Managed Instances는 각각 다른 상태, 실행 환경 모델을 쓴다.

## 핵심 명제

- **서버 없음 아님** — 기본 컴퓨팅의 인프라는 AWS가 관리한다. Managed Instances도 수명주기는 AWS가 관리하지만 사용자가 capacity provider, VPC와 instance 요구사항을 정한다
- **코드가 곧 함수 단위** — 핸들러가 짧은 작업을 처리하는 실행 단위
- **표준 함수 호출 모델** — API Gateway, S3, SQS, DynamoDB Stream, EventBridge 같은 이벤트 소스 통합 또는 Lambda API의 직접 호출로 실행
- **기본 컴퓨팅의 동시 실행 = 실행 환경 수** — 실행 환경 하나가 한 번에 요청 하나만 처리함
- **기본 컴퓨팅 표준 함수의 내구 상태 없음** — 실행 환경의 메모리와 `/tmp`가 재사용될 수 있지만 호출 간 유지는 보장되지 않음. 상태는 외부(DynamoDB, ElastiCache, S3)로

## 실행 모델, 수명주기

1. **Init phase** — 컨테이너 준비, 런타임 로드, 글로벌 코드 실행(`handler` 밖 `import`, DB 풀 생성 등)
2. **Invoke phase** — `handler(event, context)` 실행 → 응답 반환
3. **Shutdown phase** — Lambda가 환경을 종료할 때 런타임과 확장을 정리

호출이 끝나도 실행 환경은 freeze되어 일정 기간 재사용될 수 있다. 종료 시점과 다음 호출에서의 재사용은 보장되지 않는다. 새 실행 환경을 준비하는 호출은 **cold start**, 준비된 환경 재사용은 **warm start**다.

### Durable Functions

Durable Functions는 checkpoint, 대기와 재시도를 코드로 정의하고 AWS가 실행 상태를 저장해 재개하는 모델이다. 최대 1년 동안 실행할 수 있다. 이는 표준 함수의 메모리나 `/tmp`가 호출 사이에 유지된다는 뜻이 아니므로 두 상태 모델을 구분한다.

### Lambda Managed Instances

Managed Instances는 고객 계정의 EC2 인스턴스에서 실행되며 실행 환경 하나가 여러 호출을 동시에 처리할 수 있다. 기본 컴퓨팅과 달리 호출 사이에 환경을 freeze하지 않고 계속 실행하므로, 런타임별 thread safety, 공유 상태와 요청 context 격리를 따로 설계해야 한다.

### Cold Start, 기본 컴퓨팅

- **원인**: 코드 다운로드, 실행 환경 준비, 런타임과 핸들러 밖 초기화 코드 실행
- **시간**: 런타임, 패키지 크기, 메모리, 초기화 코드와 네트워크 구성에 따라 달라지므로 고정값으로 외우지 않고 실제 함수에서 측정
- **완화 방법**:
  - **Provisioned Concurrency** — 미리 warm 인스턴스 유지(비용 증가)
  - **SnapStart** — 지원되는 Java, Python, .NET 관리형 런타임에서 초기화된 상태의 스냅샷으로 시작 시간 단축
  - **작은 패키지** — 의존성, 코드 크기 최소화
  - **Init 코드 최소화** — 무거운 초기화는 LazyLoad
  - **주기적 ping**은 환경 재사용을 보장하지 않으므로, 예측 가능한 시작 시간이 필요하면 Provisioned Concurrency를 우선 검토

## 기본 컴퓨팅 표준 함수의 제약과 스펙

| 항목 | 한도 |
|---|---|
| 표준 함수 최대 실행 시간 | 15분 (900초) |
| 메모리 | 128MB ~ 10,240MB (CPU는 메모리에 비례) |
| 배포 패키지 | 압축 50MB, 비압축 250MB / 컨테이너 이미지 10GB |
| 임시 디스크 `/tmp` | 512MB~10,240MB 설정 |
| 리전당 동시 실행 | 계정, 리전 합산 기본 1,000. 신규 계정은 더 낮을 수 있으며 증설 신청 가능 |
| 환경변수 크기 | 4KB |

## Function 구성요소

함수(Function)는 코드 실행을 위해 호출되는 최소 단위 리소스. 다음 4가지로 구성된다.

- **함수 코드** — 실제 실행되는 핸들러. Runtime(Node.js, Python, Java, Go, Ruby, .NET, Custom), IAM 실행 역할, VPC 설정, 메모리 등을 함께 지정
- **계층 (Layer)** — 의존성, 공통 라이브러리, 런타임 확장을 별도 zip으로 분리. 함수당 최대 5개. 패키지 크기 압박 완화, 버전 공유
- **트리거** — 함수를 발동시키는 이벤트 소스. 종류와 호출 모델은 [[AWS-Lambda-Invocation-Concurrency|트리거 종류와 호출 모델]] 참고
- **전달 대상 (Destinations)** — 비동기 호출 결과를 후속 서비스로 전달

## 출처

- [AWS, Understanding the Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [AWS, Choosing a Lambda programming model](https://docs.aws.amazon.com/lambda/latest/dg/foundation-progmodel.html)
- [AWS, Lambda Managed Instances](https://docs.aws.amazon.com/lambda/latest/dg/lambda-managed-instances.html)
- [AWS, Understanding the Lambda Managed Instances execution environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-managed-instances-execution-environment.html)
- [AWS, Improving startup performance with Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html)
- [AWS, Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
