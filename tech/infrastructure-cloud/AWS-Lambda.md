---
tags: [aws, lambda, serverless, faas, cold-start]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["AWS Lambda", "Lambda", "서버리스 FaaS"]
---

# AWS Lambda · 서버리스 FaaS

AWS Lambda는 **이벤트 구동 함수 실행 서비스(FaaS, Function as a Service)**. 요청이 들어올 때만 함수 인스턴스를 띄워 실행하고, 끝나면 반납한다. 서버·OS·런타임 관리·오토스케일이 모두 AWS 쪽이라 **인프라 부담을 함수 수준으로 압축**한 것이 핵심 가치. 비용은 **호출 수 + 실행 시간 + 메모리**로만 청구된다.

## 핵심 명제

- **서버 없음 아님 → 서버 관리 없음** — 물리 서버는 있지만 개발자가 관여하지 않음
- **코드가 곧 함수 단위** — 요청-응답 사이클 하나를 처리하는 짧은 함수
- **이벤트 구동** — API Gateway·S3·SQS·DynamoDB Stream·EventBridge 같은 **트리거**가 있어야 실행
- **동시 실행 = 인스턴스 수** — 요청 1개당 **인스턴스 1개**가 전담, 함수 내부에서 여러 요청을 섞지 않음(단일 실행 모델)
- **상태 비보유(Stateless)** — 호출 간 메모리 보장 없음. 상태는 외부(DynamoDB·ElastiCache·S3)로

## 실행 모델 · 수명주기

1. **Init phase** — 컨테이너 준비, 런타임 로드, 글로벌 코드 실행(`handler` 밖 `import`·DB 풀 생성 등)
2. **Invoke phase** — `handler(event, context)` 실행 → 응답 반환
3. **Shutdown phase** — 유휴 상태가 길어지면 AWS가 정리

"컨테이너"라 부르는 micro-VM(firecracker)을 재사용하는 동안은 **warm**, 새로 뜨는 순간은 **cold**.

### Cold Start

- **원인**: 새 micro-VM 부팅 + 런타임 로드 + 초기화 코드 실행
- **체감**: Node.js·Python 100~300ms, Java·.NET 1~5초
- **완화 방법**:
  - **Provisioned Concurrency** — 미리 warm 인스턴스 유지(비용 증가)
  - **SnapStart**(Java) — JVM 스냅샷으로 시작 시간 단축
  - **작은 패키지** — 의존성·코드 크기 최소화
  - **Init 코드 최소화** — 무거운 초기화는 LazyLoad
  - **주기적 ping**으로 warm 유지 — 공식 권장은 아니나 관행

## 제약과 스펙

| 항목 | 한도 |
|---|---|
| 최대 실행 시간 | 15분 (900초) |
| 메모리 | 128MB ~ 10,240MB (CPU는 메모리에 비례) |
| 배포 패키지 | 압축 50MB, 비압축 250MB / 컨테이너 이미지 10GB |
| 임시 디스크 `/tmp` | 512MB~10,240MB 설정 |
| 리전당 동시 실행 | 기본 1,000 (증설 신청 가능) |
| 환경변수 크기 | 4KB |

## 트리거 종류

- **API Gateway** — REST·HTTP·WebSocket API 백엔드
- **S3** — 객체 업로드·삭제 이벤트
- **SQS** — 큐 메시지 소비 (자동 polling, 배치 지원)
- **DynamoDB Streams·Kinesis** — 스트림 레코드 처리
- **EventBridge·CloudWatch Events** — 이벤트 버스·스케줄(cron)
- **SNS** — 토픽 fanout
- **ALB** — HTTP 백엔드로 직접 연결

## 장점

- **운영 부담 제거** — OS 패치·오토스케일·고가용성을 AWS가 담당
- **비용 효율** — 호출량이 적거나 spiky할 때 유휴 비용 없음
- **자동 스케일** — 순간에 수백~수천 동시 인스턴스로 확장
- **이벤트 통합 생태계** — AWS 서비스들과 원클릭 연결

## 단점·한계

- **Cold Start** — 지연 민감 API에서 꼬리 지연 증가
- **15분 제한** — 긴 배치는 Step Functions + Lambda 분할 또는 ECS/Fargate
- **동시 실행 1,000 한도** — 대량 호출 시 throttle. 버퍼링 위해 SQS 삽입
- **Stateless** — 세션·캐시는 외부에 두어야 함
- **벤더 종속** — 이벤트 포맷·권한 모델이 AWS에 밀착
- **디버깅 어려움** — 로컬 재현·분산 추적·로그 집계에 별도 도구 필요(X-Ray, SAM Local, Serverless Framework)

## 실무 패턴

- **API 백엔드** — API Gateway + Lambda + DynamoDB (서버리스 3종 세트)
- **ETL·이벤트 처리** — S3 업로드 → Lambda가 썸네일 생성·메타데이터 추출
- **스케줄 작업** — EventBridge cron → Lambda가 정기 배치
- **실시간 스트림 처리** — Kinesis → Lambda → DynamoDB/S3
- **IoT 백엔드** — IoT Core 메시지 → Lambda 라우팅
- **CloudWatch Alarm 자동화** — 알람 → Lambda → Slack·PagerDuty

## RDB와 Lambda의 궁합 문제

- Lambda는 순간에 수백 인스턴스로 늘어나므로 **각 인스턴스가 DB 커넥션을 열면 커넥션 풀 폭주**
- 해결: **RDS Proxy** — 커넥션 풀을 Proxy가 유지, Lambda가 Proxy에 접속
- 또는 **DynamoDB·Aurora Serverless** 같은 서버리스 친화 DB
- 장기 커넥션이 필요한 워크로드는 Lambda가 부적합 — ECS/Fargate 고려

## 비용 구조

- **호출 수**: 처음 1M 호출 무료, 이후 1M당 약 $0.20
- **GB-초**: 메모리 × 실행 시간의 적분. 처음 400,000 GB-초 무료
- **무거운 연산은 메모리를 늘려 CPU를 확보**하면 실행 시간 단축 → **총비용이 오히려 줄 수 있음** (AWS Lambda Power Tuning으로 최적 메모리 찾기)

## 흔한 실수

- **handler 안에서 DB 풀 생성** → 호출마다 연결 수립. `handler` 밖(init phase)에 두어 컨테이너 재사용
- **환경변수에 시크릿 평문** → SSM Parameter Store·Secrets Manager 사용
- **콜드 스타트 무시** → 실시간 API가 P99 5초로 튐. Provisioned Concurrency 또는 ECS 이주
- **큰 이벤트 전체를 로그로** → CloudWatch Logs 비용 급증, 민감정보 유출
- **15분 안에 끝낼 수 있겠지**하고 긴 배치 → 중간 실패 시 재시도·상태 복구가 지옥. Step Functions로 분할

## 언제 Lambda를 피해야 하는가

- 지속적으로 높은 트래픽(초당 수천 req) — EC2/ECS가 비용 효율 높음
- 콜드 스타트 허용 불가 + Provisioned 비용 감당 안 됨
- 장시간 실행(15분 초과) 또는 대량 메모리 필요
- RDB 커넥션 중심 워크로드(RDS Proxy 비용·복잡도 초과)

## 면접 체크포인트

- Lambda 실행 모델(Init-Invoke-Shutdown)과 컨테이너 재사용 개념
- Cold Start 원인과 완화 기법 3가지 이상
- Lambda + RDB 조합의 커넥션 폭주 문제와 RDS Proxy 해법
- 15분 제한·1,000 동시성 한도의 실무 영향
- 메모리를 늘리면 비용이 줄어들 수 있는 이유(CPU 비례)
- 서버리스가 어울리지 않는 워크로드 유형

## 출처
- [inpa — AWS Lambda 개념·원리](https://inpa.tistory.com/entry/AWS-%F0%9F%93%9A-%EB%9E%8C%EB%8B%A4Lambda-%EA%B0%9C%EB%85%90-%EC%9B%90%EB%A6%AC)

## 관련 문서
- [[AWS|AWS]]
- [[Load-Balancer|Load Balancer]]
- [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]
- [[Latency-Optimization|레이턴시 최적화]]
- [[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]
