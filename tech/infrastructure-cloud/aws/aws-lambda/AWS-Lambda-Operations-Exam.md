---
tags: [aws, lambda, serverless, faas, cold-start, provisioned-concurrency]
status: done
category: "Infrastructure - AWS"
aliases: ["Lambda 실무 패턴", "Lambda 비용과 면접 체크포인트"]
verified_at: 2026-07-21
---

# Lambda 실무 — EC2 비교, 패턴, 비용, 흔한 실수, 체크포인트

## EC2 vs Lambda

| 항목 | EC2 | Lambda |
|---|---|---|
| OS/네트워크 제어 | 사용자가 직접 | AWS가 추상화 |
| 스케일 | ASG 설정 필요 | 자동 (동시성 한도 내) |
| 과금 | 실행 중 인스턴스의 타입과 구매 모델에 따라 초 또는 시간 단위. 중지 중에는 컴퓨트 요금이 없지만 EBS, 공인 IPv4 등은 계속 과금 가능 | 요청과 실행 시간, 메모리 및 사용 기능에 따라 과금. 일반 온디맨드 함수의 유휴 실행 환경에는 컴퓨트 요금이 없지만 Provisioned Concurrency 등은 별도 |
| 실행 시간 제한 | 없음 | 15분 |
| Cold Start | 요청마다 실행 환경을 초기화하지는 않지만 인스턴스 시작, 배포와 애플리케이션 준비 시간은 존재 | 새 실행 환경 초기화 지연 가능 |
| 적합 워크로드 | 지속 부하, OS 제어, 장기 연결 등 | 이벤트성, 변동 부하, 짧은 처리 등. 비용과 SLO는 실제 트래픽으로 비교 |

## 장점

- **운영 부담 제거** — OS 패치, 오토스케일, 고가용성을 AWS가 담당
- **비용 효율** — 온디맨드 호출량이 적거나 변동이 클 때 유휴 컴퓨트 비용을 줄일 수 있음. Provisioned Concurrency와 연결 서비스 비용은 별도
- **자동 스케일** — 함수별 scaling rate, 계정 동시성 할당량과 downstream 용량 안에서 실행 환경을 늘림
- **이벤트 통합 생태계** — 여러 AWS 서비스의 이벤트 소스와 목적지에 관리형 통합 제공

## 단점, 한계

- **Cold Start** — 지연 민감 API에서 꼬리 지연 증가
- **15분 제한** — 긴 배치는 Step Functions + Lambda 분할 또는 ECS/Fargate
- **동시성 할당량** — 리전별 계정 동시성 기본 할당량은 일반적으로 1,000이며 증설 가능한 서비스 할당량이다. 신규 계정, 함수별 Reserved Concurrency와 scaling rate도 확인하고 비동기 흡수가 필요하면 SQS 검토
- **내구 상태 없음** — 실행 환경의 메모리와 `/tmp`가 재사용될 수 있지만 다음 호출에 유지된다고 보장되지 않는다. 내구 세션과 상태는 외부 저장소에 둠
- **벤더 종속** — 이벤트 포맷, 권한 모델이 AWS에 밀착
- **디버깅 어려움** — 로컬 재현, 분산 추적, 로그 집계에 별도 도구 필요(X-Ray, SAM Local, Serverless Framework)

## 실무 패턴

- **API 백엔드** — API Gateway + Lambda + DynamoDB (서버리스 3종 세트)
- **ETL, 이벤트 처리** — S3 업로드 → Lambda가 썸네일 생성, 메타데이터 추출
- **스케줄 작업** — EventBridge cron → Lambda가 정기 배치
- **실시간 스트림 처리** — Kinesis → Lambda → DynamoDB/S3
- **IoT 백엔드** — IoT Core 메시지 → Lambda 라우팅
- **CloudWatch Alarm 자동화** — 알람 → Lambda → Slack, PagerDuty

## RDB와 Lambda의 궁합 문제

- Lambda가 동시 실행 환경을 늘릴 때 **각 환경이 DB 커넥션을 열면 데이터베이스 연결 한도를 빠르게 소진**할 수 있음
- 해결: **RDS Proxy** — 커넥션 풀을 Proxy가 유지, Lambda가 Proxy에 접속
- 또는 연결 모델과 부하 특성에 따라 DynamoDB, Aurora Serverless v2, Data API 등을 비교
- 서버가 장기 연결을 직접 유지해야 하는 워크로드는 Lambda의 실행 시간과 연결 모델을 확인하고 ECS/Fargate 등과 비교

## 비용 구조

- **요청 수**: 요청, 아키텍처, 리전에 따른 최신 단가와 계정의 Free Tier 적용 조건을 요금표에서 확인
- **컴퓨트**: 메모리와 실행 시간의 적분으로 과금하며 CPU 아키텍처, 리전, Provisioned Concurrency, ephemeral storage 등의 단가가 다름
- **무거운 연산은 메모리를 늘려 CPU를 확보**하면 실행 시간 단축 → **총비용이 오히려 줄 수 있음** (AWS Lambda Power Tuning으로 최적 메모리 찾기)

## 흔한 실수

- **handler 안에서 매번 DB 풀 생성** → 호출마다 연결 수립. `handler` 밖(init phase)에 두어 실행 환경이 재사용될 때 연결을 재사용하되 유휴 연결 검증과 재연결 처리 필요
- **환경변수에 시크릿 평문** → SSM Parameter Store, Secrets Manager 사용
- **콜드 스타트 무시** → 지연 민감 API의 꼬리 지연을 실제 런타임, 패키지, VPC, 초기화 코드로 측정. 필요하면 Provisioned Concurrency, SnapStart 지원 범위, 초기화 최적화 또는 다른 컴퓨트 모델 비교
- **큰 이벤트 전체를 로그로** → CloudWatch Logs 비용 급증, 민감정보 유출
- **15분 안에 끝낼 수 있겠지**하고 긴 배치 → 중간 실패 시 재시도, 상태 복구가 지옥. Step Functions로 분할

## 언제 Lambda를 피해야 하는가

- 지속적으로 높은 트래픽 — Lambda가 부적합하다고 요청량만으로 단정하지 말고 실행 시간, 메모리, 동시성, 할인 모델, 운영비를 EC2/ECS와 계산
- 콜드 스타트 허용 불가 + Provisioned 비용 감당 안 됨
- 장시간 실행(15분 초과) 또는 대량 메모리 필요
- RDB 커넥션 중심 워크로드(RDS Proxy 비용, 복잡도 초과)

## 면접, 시험 체크포인트

- Lambda 실행 모델(Init-Invoke-Shutdown)과 컨테이너 재사용 개념
- Cold Start 원인과 완화 기법 3가지 이상 (Provisioned Concurrency, SnapStart, 작은 패키지)
- **Reserved vs Provisioned Concurrency** 차이 — 격리/상한 vs 상시 warm
- **호출 모델 3종**(Sync, Async, Event Source Mapping)과 재시도 동작
- **Destinations(OnSuccess/OnFailure)** 와 DLQ의 관계
- Lambda + RDB 조합의 커넥션 폭주 문제와 RDS Proxy 해법
- 15분 제한, 리전별 동시성 할당량과 함수별 scaling rate의 실무 영향, Throttle 발생 시 흐름
- **VPC Lambda** — VPC 연결 자체에 NAT Gateway가 필요한 것은 아니다. 인터넷 송신이나 public endpoint 접근 경로가 필요할 때 NAT, VPC endpoint 등 요구에 맞는 경로를 설계하고 Hyperplane ENI 모델 이해
- **Lambda@Edge vs CloudFront Functions** 차이
- **Layer**로 의존성 분리하는 이유 (패키지 크기, 재사용)
- 메모리를 늘리면 비용이 줄어들 수 있는 이유(CPU 비례)
- 서버리스가 어울리지 않는 워크로드 유형

## 출처

- [Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Lambda scaling behavior](https://docs.aws.amazon.com/lambda/latest/dg/scaling-behavior.html)
- [Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [Lambda VPC 인터넷 액세스](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html)
- [Lambda 요금](https://aws.amazon.com/lambda/pricing/)
- [EC2 On-Demand 요금](https://aws.amazon.com/ec2/pricing/on-demand/)
