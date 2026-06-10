---
tags: [aws, lambda, serverless, faas, cold-start, provisioned-concurrency]
status: index
category: "Infrastructure - AWS"
aliases: ["AWS Lambda", "Lambda", "서버리스 FaaS"]
---

# AWS Lambda, 서버리스 FaaS

AWS Lambda는 **이벤트 구동 함수 실행 서비스(FaaS, Function as a Service)**. 요청이 들어올 때만 함수 인스턴스를 띄워 실행하고, 끝나면 반납한다. 서버, OS, 런타임 관리, 오토스케일이 모두 AWS 쪽이라 **인프라 부담을 함수 수준으로 압축**한 것이 핵심 가치. 비용은 **호출 수 + 실행 시간 + 메모리**로만 청구된다.

- [[AWS-Lambda-Execution-Model|핵심 명제, 실행 모델과 수명주기, Cold Start 완화, 제약과 스펙, Function 구성요소]]
- [[AWS-Lambda-Invocation-Concurrency|트리거 종류, 호출 모델 3종과 Destinations, DLQ, 동시성 제어, VPC Lambda, Lambda@Edge]]
- [[AWS-Lambda-Operations-Exam|EC2 비교, 장단점, 실무 패턴, RDB 궁합과 비용 구조, 흔한 실수, 면접 체크포인트]]

## 출처
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
