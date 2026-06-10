---
tags: [aws, lambda, serverless, faas, cold-start, provisioned-concurrency]
status: done
category: "Infrastructure - AWS"
aliases: ["Lambda 실무 패턴", "Lambda 비용과 면접 체크포인트"]
---

# Lambda 실무 — EC2 비교, 패턴, 비용, 흔한 실수, 체크포인트

## EC2 vs Lambda

| 항목 | EC2 | Lambda |
|---|---|---|
| OS/네트워크 제어 | 사용자가 직접 | AWS가 추상화 |
| 스케일 | ASG 설정 필요 | 자동 (동시성 한도 내) |
| 과금 | 시간 단위 (요금 항상) | 호출 + 실행 시간 + 메모리 (유휴 무료) |
| 실행 시간 제한 | 없음 | 15분 |
| Cold Start | 없음 (상시 가동) | 있음 |
| 적합 워크로드 | 지속, 고트래픽, 장기 연결 | 이벤트성, spiky, 짧은 처리 |

## 장점

- **운영 부담 제거** — OS 패치, 오토스케일, 고가용성을 AWS가 담당
- **비용 효율** — 호출량이 적거나 spiky할 때 유휴 비용 없음
- **자동 스케일** — 순간에 수백~수천 동시 인스턴스로 확장
- **이벤트 통합 생태계** — AWS 서비스들과 원클릭 연결

## 단점, 한계

- **Cold Start** — 지연 민감 API에서 꼬리 지연 증가
- **15분 제한** — 긴 배치는 Step Functions + Lambda 분할 또는 ECS/Fargate
- **동시 실행 1,000 한도** — 대량 호출 시 throttle. 버퍼링 위해 SQS 삽입
- **Stateless** — 세션, 캐시는 외부에 두어야 함
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

- Lambda는 순간에 수백 인스턴스로 늘어나므로 **각 인스턴스가 DB 커넥션을 열면 커넥션 풀 폭주**
- 해결: **RDS Proxy** — 커넥션 풀을 Proxy가 유지, Lambda가 Proxy에 접속
- 또는 **DynamoDB, Aurora Serverless** 같은 서버리스 친화 DB
- 장기 커넥션이 필요한 워크로드는 Lambda가 부적합 — ECS/Fargate 고려

## 비용 구조

- **호출 수**: 처음 1M 호출 무료, 이후 1M당 약 $0.20
- **GB-초**: 메모리 × 실행 시간의 적분. 처음 400,000 GB-초 무료
- **무거운 연산은 메모리를 늘려 CPU를 확보**하면 실행 시간 단축 → **총비용이 오히려 줄 수 있음** (AWS Lambda Power Tuning으로 최적 메모리 찾기)

## 흔한 실수

- **handler 안에서 DB 풀 생성** → 호출마다 연결 수립. `handler` 밖(init phase)에 두어 컨테이너 재사용
- **환경변수에 시크릿 평문** → SSM Parameter Store, Secrets Manager 사용
- **콜드 스타트 무시** → 실시간 API가 P99 5초로 튐. Provisioned Concurrency 또는 ECS 이주
- **큰 이벤트 전체를 로그로** → CloudWatch Logs 비용 급증, 민감정보 유출
- **15분 안에 끝낼 수 있겠지**하고 긴 배치 → 중간 실패 시 재시도, 상태 복구가 지옥. Step Functions로 분할

## 언제 Lambda를 피해야 하는가

- 지속적으로 높은 트래픽(초당 수천 req) — EC2/ECS가 비용 효율 높음
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
- 15분 제한, 1,000 동시성 한도의 실무 영향, Throttle 발생 시 흐름
- **VPC Lambda** — NAT Gateway 필요성, ENI 모델
- **Lambda@Edge vs CloudFront Functions** 차이
- **Layer**로 의존성 분리하는 이유 (패키지 크기, 재사용)
- 메모리를 늘리면 비용이 줄어들 수 있는 이유(CPU 비례)
- 서버리스가 어울리지 않는 워크로드 유형
