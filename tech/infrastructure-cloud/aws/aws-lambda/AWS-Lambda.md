---
tags: [aws, lambda, serverless, faas, cold-start, provisioned-concurrency]
status: index
category: "Infrastructure - AWS"
aliases: ["AWS Lambda", "Lambda", "서버리스 FaaS"]
verified_at: 2026-08-27
---

# AWS Lambda, 서버리스 FaaS

AWS Lambda는 **이벤트 구동 함수 실행 서비스(FaaS, Function as a Service)**. 표준 함수는 단일 호출을 최대 15분 실행하고, Durable Functions는 checkpoint와 상태 복원으로 최대 1년의 워크플로를 실행한다. 기본 컴퓨팅은 실행 환경마다 한 번에 호출 하나를 처리하지만, 고객 계정의 EC2에서 동작하는 Managed Instances는 한 실행 환경이 여러 호출을 동시에 처리한다. 기본 컴퓨팅은 요청 수와 실행 시간 중심, Managed Instances는 EC2 기반의 별도 요금 모델을 사용한다.

- [[AWS-Lambda-Execution-Model|핵심 명제, 실행 모델과 수명주기, Cold Start 완화, 제약과 스펙, Function 구성요소]]
- [[AWS-Lambda-Invocation-Concurrency|트리거 종류, 호출 모델 3종과 Destinations, DLQ, 동시성 제어, VPC Lambda, Lambda@Edge]]
- [[AWS-Lambda-Operations-Exam|EC2 비교, 장단점, 실무 패턴, RDB 궁합과 비용 구조, 흔한 실수, 면접 체크포인트]]
- [[AWS-Lambda-MicroVMs|MicroVMs — Firecracker 스냅샷 기반 상태 보존형 격리 샌드박스, suspend/resume, Function 비교]]

## 출처

- [AWS, What is AWS Lambda?](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [AWS, Understanding the Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [AWS, Choosing a Lambda programming model](https://docs.aws.amazon.com/lambda/latest/dg/foundation-progmodel.html)
- [AWS, Lambda Managed Instances](https://docs.aws.amazon.com/lambda/latest/dg/lambda-managed-instances.html)
- [AWS, AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/)
- [inpa — AWS Lambda 개념, 원리](https://inpa.tistory.com/entry/AWS-%F0%9F%93%9A-%EB%9E%8C%EB%8B%A4Lambda-%EA%B0%9C%EB%85%90-%EC%9B%90%EB%A6%AC)
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[AWS서비스(AWSServices)|AWS]]
- [[API-Gateway|API Gateway]]
- [[SQS|Amazon SQS]]
- [[SNS|Amazon SNS]]
- [[EventBridge|EventBridge]]
- [[Kinesis|Kinesis]]
- [[Load-Balancer|Load Balancer]]
- [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]
- [[Latency-Optimization|레이턴시 최적화]]
- [[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]
