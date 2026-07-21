---
tags: [aws, lambda, serverless, faas, cold-start, provisioned-concurrency]
status: done
category: "Infrastructure - AWS"
aliases: ["Lambda 호출 모델", "Lambda 동시성 제어"]
verified_at: 2026-07-21
---

# Lambda 호출 모델과 동시성 — 트리거, Destinations, VPC, Edge

## 트리거 종류

- **API Gateway** — REST, HTTP, WebSocket API 백엔드
- **S3** — 객체 업로드, 삭제 이벤트
- **SQS** — 큐 메시지 소비 (자동 polling, 배치 지원)
- **DynamoDB Streams, Kinesis** — 스트림 레코드 처리
- **EventBridge, CloudWatch Events** — 이벤트 버스, 스케줄(cron)
- **SNS** — 토픽 fanout
- **ALB** — HTTP 백엔드로 직접 연결
- **CloudWatch Logs** — 로그 필터 매칭 시 호출

## 호출 모델 (Invocation Type)

| 모델 | 설명 | 예시 트리거 |
|---|---|---|
| **Synchronous (동기)** | 호출자가 결과를 기다림. 에러는 호출자에게 반환 | API Gateway, ALB, CLI 직접 호출 |
| **Asynchronous (비동기)** | 이벤트 큐에 적재 후 즉시 반환. 함수 오류 시 기본 재시도 횟수와 최대 이벤트 수명을 구성 가능 | S3, SNS, EventBridge |
| **Event Source Mapping (Poll)** | Lambda가 소스를 폴링하며 배치로 처리 | SQS, Kinesis, DynamoDB Stream |

### Destinations (전달 대상)

비동기 호출 결과를 자동 라우팅한다. 이벤트 소스 매핑도 별도 대상 구성을 제공하지만 지원되는 조건과 대상은 소스별로 다르다.

- **OnSuccess / OnFailure** 분리 지정
- OnSuccess 대상: **SNS, SQS, Lambda, EventBridge**. OnFailure에는 이 대상들에 더해 **S3**를 사용할 수 있음
- 예: SNS → Lambda 처리 → 성공 시 SQS 큐 적재, 실패 시 다른 토픽 알림

### DLQ (Dead Letter Queue)

- 비동기 호출에서 **재시도 모두 실패** 시 메시지를 SQS/SNS로 격리
- Destinations(OnFailure)가 더 유연한 후속자. 신규는 Destinations 권장

## 동시성 제어

| 종류 | 동작 | 용도 |
|---|---|---|
| **Reserved Concurrency** | 특정 함수가 사용할 동시성 용량을 예약하면서 그 함수의 최대 동시성도 같은 값으로 제한 | 중요 함수 용량 격리, 하위 시스템 보호 |
| **Provisioned Concurrency** | 특정 버전 또는 Alias에 지정 수의 실행 환경을 미리 초기화 | 준비된 용량 안에서 초기화 지연 완화 |
| **Account Concurrency Quota** | 계정, 리전 단위 기본 할당량이 있으며 증설 요청 가능 | 가용 동시성 초과 시 **Throttle (TooManyRequestsException)** |

Throttle 발생 시: 동기 호출은 즉시 에러, 비동기는 자동 재시도. 버퍼링이 필요하면 **SQS를 앞에 끼우면** 자연스럽게 흡수.

## VPC Lambda

- Lambda 함수를 VPC 내부 리소스(RDS, ElastiCache, EC2)에 붙이려면 **VPC 구성** 필요
- 함수에 ENI가 할당되고 지정 서브넷, 보안 그룹에서 동작
- VPC에 연결한 함수가 IPv4 인터넷으로 나가려면 일반적으로 프라이빗 서브넷의 NAT 경로가 필요하다. AWS 서비스 접근은 VPC 엔드포인트를 쓸 수 있고, IPv6 경로는 별도 구성한다.
- 과거엔 Cold Start 시 ENI 생성으로 지연 컸으나, **Hyperplane ENI(공유 ENI)** 도입 후 초기화 지연 대폭 감소

## Lambda@Edge, CloudFront Functions

- **Lambda@Edge** — CloudFront 엣지에서 실행. 4가지 이벤트(Viewer Request/Response, Origin Request/Response)에서 동작. A/B 테스트, 헤더 조작, SEO 라우팅, 이미지 변환
- **CloudFront Functions** — 더 가벼운 JS 함수. Viewer Request/Response에서 submillisecond 실행을 목표로 하며 URL 재작성, 헤더 조작에 특화. 요금은 실행 시간의 마이크로초가 아니라 호출 횟수 기준
- 결정: 복잡한 로직, 외부 호출이면 Lambda@Edge, 초경량 헤더 조작이면 CloudFront Functions

Provisioned Concurrency는 콜드 스타트를 절대 제거하지 않는다. 준비된 용량을 넘는 spillover 호출, 잘못된 버전이나 Alias 호출, 실행 환경 재설정 같은 경우에는 초기화 지연이 발생할 수 있다.

## 출처

- [Lambda 함수 확장과 동시성](https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html)
- [Provisioned Concurrency 문제 해결](https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-invocation.html)
- [비동기 호출 기록과 Destinations](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html)
- [CloudFront Functions 청구와 사용량](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/billing-and-usage-interpreting.html)
