---
tags: [aws, lambda, serverless, faas, cold-start, provisioned-concurrency]
status: done
category: "Infrastructure - AWS"
aliases: ["Lambda 호출 모델", "Lambda 동시성 제어"]
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
| **Asynchronous (비동기)** | 이벤트 큐에 적재 후 즉시 반환. Lambda가 백그라운드 실행, 실패 시 2회 자동 재시도 | S3, SNS, EventBridge |
| **Event Source Mapping (Poll)** | Lambda가 소스를 폴링하며 배치로 처리 | SQS, Kinesis, DynamoDB Stream |

### Destinations (전달 대상)

비동기 호출 또는 Stream/Queue 처리 결과를 자동 라우팅.

- **OnSuccess / OnFailure** 분리 지정
- 대상: **SNS, SQS, Lambda, EventBridge**
- 예: SNS → Lambda 처리 → 성공 시 SQS 큐 적재, 실패 시 다른 토픽 알림

### DLQ (Dead Letter Queue)

- 비동기 호출에서 **재시도 모두 실패** 시 메시지를 SQS/SNS로 격리
- Destinations(OnFailure)가 더 유연한 후속자. 신규는 Destinations 권장

## 동시성 제어

| 종류 | 동작 | 용도 |
|---|---|---|
| **Reserved Concurrency** | 특정 함수에 동시 실행 슬롯을 **예약**. 다른 함수와 격리 + 상한 보장 | 폭주 함수가 계정 한도(1,000) 잡아먹지 않게 |
| **Provisioned Concurrency** | 지정 수만큼 **항상 warm 유지** | Cold Start 제거. API 백엔드 지연 안정화 |
| **Account Concurrency Limit** | 리전당 기본 1,000 (증설 가능) | 한도 초과 시 **Throttle (429 TooManyRequests)** |

Throttle 발생 시: 동기 호출은 즉시 에러, 비동기는 자동 재시도. 버퍼링이 필요하면 **SQS를 앞에 끼우면** 자연스럽게 흡수.

## VPC Lambda

- Lambda 함수를 VPC 내부 리소스(RDS, ElastiCache, EC2)에 붙이려면 **VPC 구성** 필요
- 함수에 ENI가 할당되고 지정 서브넷, 보안 그룹에서 동작
- 인터넷 통신은 **NAT Gateway** 필요 (퍼블릭 IP 직접 부여 불가)
- 과거엔 Cold Start 시 ENI 생성으로 지연 컸으나, **Hyperplane ENI(공유 ENI)** 도입 후 초기화 지연 대폭 감소

## Lambda@Edge, CloudFront Functions

- **Lambda@Edge** — CloudFront 엣지에서 실행. 4가지 이벤트(Viewer Request/Response, Origin Request/Response)에서 동작. A/B 테스트, 헤더 조작, SEO 라우팅, 이미지 변환
- **CloudFront Functions** — 더 가벼운 JS 함수. Viewer Request/Response만, 1ms 미만 실행. URL 재작성, 헤더 조작에 특화 (μ초 단위 비용)
- 결정: 복잡한 로직, 외부 호출이면 Lambda@Edge, 초경량 헤더 조작이면 CloudFront Functions
