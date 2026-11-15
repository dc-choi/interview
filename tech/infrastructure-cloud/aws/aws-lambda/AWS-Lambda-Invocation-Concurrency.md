---
tags: [aws, lambda, serverless, faas, cold-start, provisioned-concurrency]
status: done
category: "Infrastructure - AWS"
aliases: ["Lambda 호출 모델", "Lambda 동시성 제어"]
verified_at: 2026-09-30
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

### 다른 계정의 SNS 토픽에 함수 구독하기

2026-11-15 AWS Lambda, SNS 개발자 가이드 대조 기준이다. SNS는 Lambda를 비동기로 호출하며, SNS 트리거는 standard 토픽만 지원하고 FIFO 토픽은 지원하지 않는다. 토픽이 계정 A, 함수가 계정 B에 있으면 권한이 양쪽에 필요하다. 아래 명령은 주요 옵션만 적은 생략형이며 전체 형태는 Lambda 개발자 가이드의 교차 계정 자습서에 있다.

| 위치 | 필요한 권한 | 예 (생략형) |
|---|---|---|
| 계정 A의 토픽 정책 | 계정 B가 구독할 수 있게 허용 | `aws sns add-permission --topic-arn <토픽 ARN> --label <이름> --aws-account-id <B> --action-name Subscribe ListSubscriptionsByTopic` |
| 계정 B의 함수 리소스 기반 정책 | `sns.amazonaws.com`의 `lambda:InvokeFunction` 허용, `AWS:SourceArn`을 토픽 ARN으로 제한 | `aws lambda add-permission --function-name <함수> --statement-id <ID> --principal sns.amazonaws.com --source-arn <토픽 ARN> --action lambda:InvokeFunction` |

자습서는 토픽 계정이 opt-in 리전에 있으면 리전이 같아도 principal을 `sns.<토픽 리전>.amazonaws.com`으로 지정하라고 안내한다(예: 홍콩 리전은 `sns.ap-east-1.amazonaws.com`).

같은 리전 자습서 기준으로 구독은 계정 B에서 `aws sns subscribe --topic-arn <토픽 ARN> --protocol lambda --notification-endpoint <함수 ARN>`으로 만든다. 콘솔의 Add trigger로 SNS를 붙이면 Lambda가 필요한 권한과 구독을 설정한다고 개발자 가이드가 밝히지만 교차 계정에서도 같은지는 명시하지 않는다. AWS Knowledge Center 영상은 토픽 정책을 먼저 허용한 뒤 계정 B의 Add trigger에 토픽 ARN을 넣는 경로를 제시하지만 이 문서에서 시험하지는 않았으므로, 어느 경로든 두 정책을 직접 확인한다. 연결 뒤에는 토픽에 테스트 메시지를 게시하고 계정 B의 `Invocations` 지표나 로그로 실제 호출을 확인한다.

리전이 다른 경우 구독 명령은 토픽이 있는 리전으로 실행한다. SNS 교차 리전 페이지의 예시는 이때 구독 명령을 토픽 계정 A에서 실행하므로, 계정과 리전이 모두 다른 조합에서 계정 B가 구독하는 경로는 확인되지 않았다. 구독 뒤 확인 대기(`PendingConfirmation`) 상태가 아닌지 본다. opt-in 리전의 토픽에서 기본 활성 리전의 함수로 보낼 때는 함수 정책의 principal을 `sns.<토픽 리전>.amazonaws.com`으로 바꾼다. 그 밖의 조합(기본 활성 리전에서 opt-in 리전으로, opt-in 리전끼리)은 2026-11-15 기준 SNS 개발자 가이드의 Lambda 전제 조건 페이지가 미지원으로, 교차 리전 전달 페이지가 principal을 함수 리전으로 둔 지원으로 적어 서로 상충하므로 실제 구성 전에 현행 문서와 시험으로 확인한다. 이 절은 권한과 구독 절차만 대조했으며 실제 계정에서 구독을 만들어 시험하지 않았다. SQS 큐를 교차 계정으로 구독하는 경우의 확인 절차는 [[SNS#교차 계정 SNS와 SQS의 구독 확인|SNS의 교차 계정 SQS 구독]]에서 다룬다.

## 동시성 제어

### 사용자 수를 호출률과 실행 시간으로 바꿔 계산한다

가입자 수나 월간 사용자 수만으로 Lambda 용량을 정할 수 없다. 일반 Lambda 함수의 동시 실행 수는 같은 관측 구간의 **초당 요청 수 × 평균 실행 시간(초)**으로 추정한다. 예를 들어 5,000 RPS에 평균 0.2초면 동시 실행은 약 1,000이다. 이는 주어진 트래픽과 실행 시간을 가정한 계산이며 특정 사용자 수를 처리한다는 보장이 아니다.

- **평균과 급증:** 평균값의 곱만으로 짧은 트래픽 급증이나 실행 시간 분포의 꼬리를 설명하지 못한다. 실제 `ConcurrentExecutions`와 throttling을 부하 시험에서 확인한다(운영 제안).
- **동시성과 RPS:** 동기 호출은 동시성 외에도 초당 요청 한도를 확인한다. 실행 시간이 짧아 동시성이 작더라도 RPS 한도에 먼저 도달할 수 있다.
- **함수와 하위 시스템:** Reserved Concurrency로 함수의 최대 동시성을 제한해 DB와 외부 API의 과부하를 줄일 수 있다. 다만 함수 한 번이 만드는 쿼리 수와 연결 수는 코드에 따라 달라서 함수 동시성을 그대로 DB 연결 수로 해석하지 않는다(설계 해석).

2026-10-13 부분 검증: 산정식, 동시성과 RPS의 구분, Reserved Concurrency의 하위 시스템 보호 목적을 AWS 공식 문서와 대조했다. 이 절은 Managed Instances의 인스턴스 수 산정이나 실제 부하 시험 결과가 아니다. 기존 호출 모델 전체의 `verified_at`은 유지한다.

| 종류 | 동작 | 용도 |
|---|---|---|
| **Reserved Concurrency** | 특정 함수가 사용할 동시성 용량을 예약하면서 그 함수의 최대 동시성도 같은 값으로 제한 | 중요 함수 용량 격리, 하위 시스템 보호 |
| **Provisioned Concurrency** | 특정 버전 또는 Alias에 지정 수의 실행 환경을 미리 초기화 | 준비된 용량 안에서 초기화 지연 완화 |
| **Account Concurrency Quota** | 계정, 리전 단위 기본 할당량이 있으며 증설 요청 가능 | 가용 동시성 초과 시 **Throttle (TooManyRequestsException)** |

Throttle 발생 시: 동기 호출은 즉시 에러, 비동기는 자동 재시도. 버퍼링이 필요하면 **SQS를 앞에 끼우면** 자연스럽게 흡수.

### Throttling 오류 진단 순서

진단 순서는 AWS Knowledge Center 영상의 절차를 따르고, 지표 정의와 수치는 2026-11-15 AWS Lambda 개발자 가이드와 API 레퍼런스로 대조했다. 이 순서는 일반 Lambda 함수의 호출 throttle을 다룬다. Managed Instances는 CPU, 메모리, 디스크, 동시성별 throttle 지표를 따로 제공하고, Lambda 관리 API의 초당 요청 한도 초과는 `Throttles`에 세지 않는 별도 원인이다. `Rate exceeded`나 `TooManyRequestsException`이 보이면 먼저 Lambda가 호출을 거절했는지, 함수 코드가 부른 다른 API가 거절당했는지 가른다.

1. **함수 throttle인지 확인:** CloudWatch의 함수별 `Throttles`를 `Sum`으로 본다. 이 지표는 throttle된 호출 요청 수이며, throttle된 요청은 `Invocations`나 `Errors`에 세지 않는다. `Throttles`가 0인데 오류가 보이면 함수 코드가 호출한 다른 서비스 API의 throttling일 수 있으므로 실행 로그에서 어느 호출이 거절됐는지 확인한다.
2. **동시성 사용량 확인:** 함수별 `ConcurrentExecutions`와 리전 단위 지표를 `Max`로 본다. 동시성 한도는 리전의 모든 함수가 공유하므로 함수 하나만 봐서는 부족하다. `ClaimedAccountConcurrency`는 예약, 프로비저닝으로 잡힌 동시성과 예약 없는 함수의 사용량을 더한 값으로, Lambda가 on-demand 호출에 남은 동시성을 판단할 때 쓴다. 이 값을 동시성 quota로 나눈 사용률에 알람을 건다(문서 예시는 70%).
3. **원인 구분:** 트래픽이 늘거나 실행 시간이 길어지면 동시성 사용량이 함께 는다. 리전 quota에 닿기 전에 throttle되면 Reserved Concurrency가 너무 낮지 않은지 본다. 예약 동시성은 그 함수의 상한이기도 해서 다른 곳에 남은 동시성을 끌어 쓰지 못하며, 0으로 두면 모든 호출이 throttle된다. 함수별 확장 속도(10초마다 실행 환경 1,000개)에 먼저 닿는 경우도 있다. 동기 on-demand 호출은 초당 요청 한도(동시성의 10배)도 받고, 비동기 호출은 가용 동시성으로만 제한된다. Provisioned concurrency는 할당량이나 그 10배의 초당 요청을 넘으면 on-demand 동시성으로 넘쳐(spillover) 콜드 스타트가 생길 수 있으며, on-demand 쪽까지 소진돼야 throttle된다.
4. **대응:** 동기 호출의 호출 측은 지수 백오프로 재시도한다. 비동기 호출은 throttle(429)과 시스템 오류(5xx) 때 Lambda가 이벤트를 큐로 되돌려 기본 최대 6시간 동안 재시도하고, 간격은 1초에서 최대 5분까지 지수적으로 늘어난다. 만료되거나 재시도를 다 쓴 이벤트는 버려지므로 DLQ나 OnFailure 대상을 둔다. 예외로 예약 동시성이 0인 함수의 비동기 이벤트는 재시도 없이 바로 DLQ나 OnFailure 대상으로 간다. 버려진 비동기 이벤트는 DLQ나 대상으로 먼저 보냈는지와 관계없이 `AsyncEventsDropped`에 집계된다. 지속적으로 더 큰 동시성이 필요하면 Service Quotas에서 증설을 요청한다.

기본 계정 동시성은 리전당 1,000이고, 예약하지 않은 함수를 위해 100은 항상 남겨 두므로 기본값에서는 최대 900까지 예약할 수 있다. `aws lambda get-account-settings` 출력의 `UnreservedConcurrentExecutions`는 계정 한도에서 함수별 예약 합계를 뺀 예약되지 않은 풀이며, 추가로 예약할 수 있는 양은 여기서 100을 뺀 값이다(예약이 없는 기본 계정이면 1,000이고 예약 가능량은 900). 이 정의는 API 레퍼런스를 따른 것이며, 개발자 가이드의 동시성 페이지는 이 값을 아직 할당할 수 있는 예약 동시성으로 다르게 설명한다. 같은 이름의 CloudWatch 지표는 예약 없는 함수의 사용량이라 의미가 다르다. 한도 값은 계정과 시점에 따라 다르므로 Service Quotas에서 확인한다.

### Provisioned Concurrency의 준비와 실제 사용 확인

2026-10-13 공식 문서 부분 대조 기준이다. 아래는 사전 초기화한 환경을 사용하는 일반 Lambda 함수의 운영 절차다.

1. **호출 대상:** `$LATEST`에는 설정할 수 없다. 버전이나 Alias에 용량을 할당한 뒤 API Gateway 등 호출 측도 그 버전이나 Alias를 가리키는지 확인한다.
2. **준비 완료:** 설정 요청의 성공과 할당 완료를 구분한다. `GetProvisionedConcurrencyConfig`의 `Status`가 `READY`인지 확인하고 요청량, 할당량과 가용량을 함께 본다. `IN_PROGRESS`는 준비 중이며 `FAILED`면 `StatusReason`을 확인한다.
3. **실제 사용:** `ProvisionedConcurrencyInvocations`의 `Sum`은 사전 초기화 환경에서 처리한 호출 수다. `ProvisionedConcurrentExecutions`의 `Max`는 동시에 처리 중인 환경 수로, 할당한 전체 용량이 아니다.
4. **초과와 유휴:** `ProvisionedConcurrencySpilloverInvocations`의 `Sum`은 준비된 용량이 모두 사용 중일 때 일반 동시성으로 실행된 호출 수다. `ProvisionedConcurrencyUtilization`의 `Max`가 지속해서 낮으면 과다 할당 가능성을 확인한다.

예를 들어 용량 100개 중 한 관측 구간에 최대 40개만 처리 중이었다면 실행 환경 지표의 Max는 40이다. 이것만으로 나머지 60개의 준비가 실패했다고 판단하지 않는다. 실제 지연과 spillover를 함께 보고 용량을 조정한다(운영 제안).

## VPC Lambda

- Lambda 함수를 VPC 내부 리소스(RDS, ElastiCache, EC2)에 붙이려면 **VPC 구성** 필요. 기본 함수는 Lambda가 관리하는 VPC에서 실행되어 고객 VPC의 private subnet 리소스에 닿지 않는다
- 함수에 ENI가 할당되고 지정 서브넷, 보안 그룹에서 동작. 대상 리소스가 있는 VPC의 private subnet ID와 security group ID를 지정하며, Lambda는 subnet과 security group 조합마다 Hyperplane ENI를 만들고 같은 조합을 쓰는 함수끼리 공유한다
- 고가용성을 위해 서로 다른 AZ의 subnet을 둘 이상 지정한다. ENI가 지정한 subnet에 만들어지므로 한 AZ의 subnet만 쓰면 그 AZ 장애가 곧 VPC 접근 장애가 된다
- 대상 리소스 security group의 인바운드가 Lambda security group을 허용하고, Lambda security group의 아웃바운드가 대상 포트를 허용해야 한다

### VPC 연결에 필요한 권한

- 실행 역할에 ENI 생성, 조회, 삭제 권한이 필요하다. AWS 관리형 정책 `AWSLambdaVPCAccessExecutionRole`을 붙이거나 `ec2:CreateNetworkInterface`, `ec2:DescribeNetworkInterfaces`, `ec2:DescribeSubnets`, `ec2:DeleteNetworkInterface`, `ec2:AssignPrivateIpAddresses`, `ec2:UnassignPrivateIpAddresses`를 `Resource: "*"`로 준다
- 콘솔에서 새 함수를 만들며 VPC를 붙이면 이 정책이 자동으로 붙는다. CLI, SAM, IaC나 기존 함수에 사용자 지정 실행 역할을 쓰면 직접 넣어야 하고, 빠지면 CreateNetworkInterface 권한이 없다는 오류로 VPC 설정이 실패한다. 설정하는 사용자에게도 `ec2:DescribeSecurityGroups`, `ec2:DescribeSubnets`, `ec2:DescribeVpcs` 조회 권한이 필요하다
- 이 EC2 권한은 함수 코드에도 암묵적으로 주어진다. 최소 권한이 필요하면 `lambda:SourceFunctionArn` 조건으로 코드의 EC2 API 호출만 거부하는 Deny 정책을 실행 역할에 더한다
- 이 권한은 ENI를 만들고 지울 때 쓰이므로 연결 뒤에 빼도 호출은 된다. 다만 VPC 구성을 제거하면 Lambda가 실행 역할 권한으로 Hyperplane ENI를 지우므로(최대 20분), 역할을 먼저 지우면 ENI가 남아 수동으로 삭제해야 한다

### 인터넷과 ENI 지연

- 새 함수는 Hyperplane ENI가 준비될 때까지 몇 분간 `Pending`이라 호출할 수 없다. 14일 동안 호출이 없으면 ENI가 회수되어 `Inactive`가 되고, 다음 호출은 실패한 뒤 다시 `Pending`을 거친다. ENI가 계속 유지된다고 가정하지 않는다

- VPC에 연결한 함수가 IPv4 인터넷으로 나가려면 일반적으로 프라이빗 서브넷의 NAT 경로가 필요하다. AWS 서비스 접근은 VPC 엔드포인트를 쓸 수 있고, IPv6 경로는 별도 구성한다.
- 과거엔 Cold Start 시 ENI 생성으로 지연 컸으나, **Hyperplane ENI(공유 ENI)** 도입 후 초기화 지연 대폭 감소

### VPC 함수에서 DynamoDB로 연결하기

부분 검증(2026-10-13): 아래는 같은 리전의 DynamoDB에 gateway endpoint로 접근하는 구성이다. 기존 호출 모델 전체를 재검증한 날짜는 아니다.

1. **라우팅:** DynamoDB gateway endpoint를 만들고 Lambda에 지정한 각 서브넷의 라우트 테이블과 연결한다. 이 경로의 DynamoDB 요청에는 NAT나 인터넷 게이트웨이가 필요하지 않다. 다른 외부 API의 인터넷 경로까지 생기는 것은 아니다.
2. **권한:** 실행 역할의 DynamoDB 작업 권한과 endpoint policy를 함께 확인한다. `GetItem` 예제라면 대상 테이블의 `dynamodb:GetItem`을 허용한다. endpoint policy는 IAM과 리소스 정책을 대체하지 않으며, ENI 관리 권한만으로 테이블을 읽을 수는 없다.
3. **통신:** DNS 해석, 함수 SG의 DynamoDB 방향 HTTPS 아웃바운드와 NACL의 요청, 응답 규칙을 확인한다. SG에는 DynamoDB prefix list를 쓸 수 있지만 NACL에는 해당 IP 범위가 필요하다.
4. **변경 검증:** endpoint 생성이나 변경은 기존 TCP 연결을 끊을 수 있다. SDK의 재연결과 실제 테이블 조회를 시험한다. public subnet을 지정하는 것만으로 Lambda에 공인 IP가 생기지는 않는다.

진단 제안: timeout은 DNS, 라우팅과 통신 규칙부터, `AccessDenied`는 실행 역할, endpoint policy와 테이블의 접근 정책부터 확인한다. 응답 유형은 조사 순서의 단서이며 원인 확정은 아니다.

## Lambda@Edge, CloudFront Functions

- **Lambda@Edge** — CloudFront 엣지에서 실행. 4가지 이벤트(Viewer Request/Response, Origin Request/Response)에서 동작. A/B 테스트, 헤더 조작, SEO 라우팅, 이미지 변환
- **CloudFront Functions** — 더 가벼운 JS 함수. Viewer Request/Response에서 submillisecond 실행을 목표로 하며 URL 재작성, 헤더 조작에 특화. 요금은 실행 시간의 마이크로초가 아니라 호출 횟수 기준
- 결정: 복잡한 로직, 외부 호출이면 Lambda@Edge, 초경량 헤더 조작이면 CloudFront Functions

Provisioned Concurrency는 콜드 스타트를 절대 제거하지 않는다. 준비된 용량을 넘는 spillover 호출, 잘못된 버전이나 Alias 호출, 실행 환경 재설정 같은 경우에는 초기화 지연이 발생할 수 있다.

## 출처

- [Provisioned Concurrency 구성과 호출 대상](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [GetProvisionedConcurrencyConfig 응답과 상태](https://docs.aws.amazon.com/lambda/latest/api/API_GetProvisionedConcurrencyConfig.html)
- [Lambda 동시성 모니터링 지표](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-concurrency.html)
- [DynamoDB gateway endpoint 구성과 고려사항](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html)
- [VPC endpoint policy의 접근 제어 범위](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html)
- [Lambda 함수 확장과 동시성](https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html)
- [Provisioned Concurrency 문제 해결](https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-invocation.html)
- [비동기 호출 기록과 Destinations](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html)
- [CloudFront Functions 청구와 사용량](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/billing-and-usage-interpreting.html)
- [Lambda 함수의 Amazon VPC 리소스 접근](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html)
- [Lambda 복원력과 다중 AZ](https://docs.aws.amazon.com/lambda/latest/dg/security-resilience.html)
- [인프런, Sungmin Kim, Lambda - VPC Access](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=75666)
- [Lambda 함수 지표 유형 (Throttles, ConcurrentExecutions, ClaimedAccountConcurrency)](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html)
- [Lambda 확장 동작과 확장 속도](https://docs.aws.amazon.com/lambda/latest/dg/scaling-behavior.html)
- [Lambda 예약 동시성 구성](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html)
- [Lambda 비동기 호출 오류 처리와 재시도](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html)
- [Amazon SNS 알림으로 Lambda 호출](https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html)
- [교차 계정 SNS 토픽으로 Lambda 호출 자습서](https://docs.aws.amazon.com/lambda/latest/dg/with-sns-example.html)
- [SNS와 다른 리전 Lambda 연결 전제 조건](https://docs.aws.amazon.com/sns/latest/dg/lambda-prereq.html)
- [SNS 교차 리전 전달 지원 표](https://docs.aws.amazon.com/sns/latest/dg/sns-cross-region-delivery.html)
- [AccountLimit API의 UnreservedConcurrentExecutions 정의](https://docs.aws.amazon.com/lambda/latest/api/API_AccountLimit.html)
- [Lambda quota (동기, 비동기 호출의 초당 요청 한도)](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [How do I resolve Lambda function Rate exceeded and TooManyRequestsException throttling errors? — Amazon Web Services (YouTube)](https://www.youtube.com/watch?v=0RR3cM3N6fs)
- [How do I set up a cross-account AWS Lambda subscription with an SNS topic? — Amazon Web Services (YouTube)](https://www.youtube.com/watch?v=Q3GDJawgfr8)
