---
tags: [messaging, aws, eventbridge, event-driven]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["EventBridge", "Amazon EventBridge"]
---

# Amazon EventBridge

AWS 서버리스 이벤트 버스. 이벤트 기반 아키텍처의 **중앙 라우터** 역할. 규칙 기반으로 이벤트를 필터링하고 적절한 타겟으로 전달한다.

## 핵심 개념

### Event Bus

이벤트가 도착하는 파이프라인. 세 종류이고 핵심 차이는 **누가 만들고 어떤 이벤트가 들어오느냐**다.

| 구분 | Default | Custom | Partner |
|---|---|---|---|
| 생성 주체 | AWS 자동 (계정당 리전당 1개) | 사용자가 직접 생성 | 파트너 소스 연결 시 자동 생성 |
| 주 용도 | AWS 서비스 이벤트 수신 | 자체 앱 이벤트, 도메인 격리 | SaaS 서드파티 이벤트 |
| AWS 서비스 이벤트 | 자동 수신 | 자동으로 안 들어옴 | 해당 없음 |
| 커스텀 이벤트(PutEvents) | 가능 (버스명 생략 시 기본) | 가능 | 불가 (파트너가 발행) |
| 삭제 | 불가 (AWS 관리) | 가능 | 연결 해제로 제거 |
| 리소스 정책 | 제한적 | cross-account 수신 제어 | 파트너 연동 기반 |

**핵심 함정 (시험에 자주 출제)**: AWS 서비스 이벤트(EC2, S3, CloudTrail 등)는 **default 버스로만** 발행된다. custom 버스에서 받으려면 default 버스에 규칙을 걸어 **타겟을 custom 버스로 지정**해야 한다(버스에서 버스로 forwarding). custom 버스의 강점은 도메인별 격리(orders-bus, payments-bus)와 **resource-based policy를 통한 cross-account 이벤트 수신**이다.

**Partner 버스 생성 흐름**: 직접 `CreateEventBus`로 만드는 게 아니다. 파트너나 AWS Marketplace가 제공하는 partner event source가 계정에 Pending으로 뜨면, 그것을 associate(연결)하는 순간 대응하는 partner 버스가 생성된다.

### Event 구조
```json
{
  "source": "com.myapp.orders",      // 이벤트 출처
  "detail-type": "OrderCreated",     // 이벤트 종류
  "detail": { "orderId": "123", "amount": 50000 }  // 비즈니스 페이로드
}
```
- `source` + `detail-type`으로 이벤트를 식별하고 라우팅
- `PutEvents` 발행 시 `Detail`은 **반드시 `JSON.stringify`된 문자열**이어야 한다. 객체를 그대로 넣으면 실패 (흔한 실수)
- `id`, `version`, `account`, `time`, `region`은 EventBridge가 자동으로 채운다 (발행 시 `source`, `detail-type`, `detail`만 채우면 됨)

### Rules와 Targets
- **Rule**: 이벤트 패턴으로 매칭 → 조건에 맞는 이벤트만 타겟으로 전달
- **Target**: Rule당 최대 **5개**. Lambda, SQS, SNS, Step Functions, ECS Task, API Destination 등
- 하나의 이벤트가 여러 Rule에 매칭 → 여러 타겟으로 동시 전달 가능 (버스의 모든 규칙이 독립적으로 동시 평가, fan-out)
- **API Destinations**: 타겟을 AWS 서비스가 아니라 **외부 HTTP 엔드포인트**로 지정 (외부 SaaS Webhook 호출). 인증과 rate limit 관리 포함

### Event Pattern 매칭
```json
{
  "source": ["com.myapp.orders"],
  "detail-type": ["OrderCreated"],
  "detail": {
    "status": ["CONFIRMED"],
    "amount": [{ "numeric": [">", 100] }]
  }
}
```
- 배열 내 값은 **OR**, 필드 간은 **AND**
- 연산자: exact, prefix, suffix, anything-but, numeric range, exists, wildcard, CIDR
- 연산자별 상세 문법, 매칭 규칙, `$or`, 패턴 테스트(Sandbox, TestEventPattern)는 → [[EventBridge-Event-Patterns|이벤트 패턴 매칭]]

## 아키텍처 패턴

### EventBridge + SQS (버퍼링 패턴)
```
App → PutEvents → EventBridge → [Rule 필터링] → SQS → Consumer (ECS 워커)
```
- EventBridge가 라우팅/필터링, SQS가 버퍼링/속도 조절
- Consumer가 자기 속도로 Pull → 백프레셔 해결
- SQS DLQ로 소비 측 실패도 안전하게 관리
- **가장 일반적인 서버리스 이벤트 아키텍처 패턴**
- 큐 리소스 정책 함정(전달 조용히 실패), 메시지 envelope 구조, 컨슈머(Lambda 부분 배치 실패, NestJS 워커), 2단 DLQ는 → [[EventBridge-SQS-Target|EventBridge → SQS 타겟 패턴]]

### EventBridge + Lambda (즉시 처리 패턴)
- Rule 타겟으로 Lambda 지정 → 비동기 호출
- 이벤트 수신 즉시 서버리스 함수로 처리
- Lambda 자체 retry/DLQ 활용 가능

### EventBridge Pipes (Point-to-Point 통합)
```
Source(SQS/DynamoDB Stream/Kinesis) → [Filter] → [Enrichment] → Target
```
- Source 1개 → Target 1개의 직접 연결
- Enrichment: Lambda나 API로 데이터 보강 후 전달
- 필터 매칭된 이벤트만 과금 (비용 최적화)

### EventBridge Scheduler (스케줄 트리거)
```
cron/rate 표현식 → Scheduler → Target (Lambda, SQS, Step Functions 등)
```
- cron 또는 rate 표현식으로 정기 이벤트를 만드는 전용 서비스
- 과거에는 버스에 거는 scheduled rule을 썼지만, 신규 프로젝트는 확장성과 기능이 더 나은 **EventBridge Scheduler** 권장 (타임존, 일회성 스케줄, 유연한 재시도와 DLQ 지원)

## 신뢰성

### 전달 보장
- **At-least-once**: 동일 이벤트가 2번 이상 전달될 수 있음 → 소비자 측 멱등성 필요
- **순서 보장 없음**: 이벤트 순서를 보장하지 않음. 순서가 중요하면 SQS FIFO 같은 별도 설계로 풀어야 함
- **Push 기반**: Kafka처럼 컨슈머가 폴링하는 게 아니라 EventBridge가 타겟으로 밀어넣음

### Retry Policy
- 기본: 최대 **185회** 재시도, 이벤트 최대 수명 **24시간**
- 조정 가능: `MaximumRetryAttempts` (0~185), `MaximumEventAgeInSeconds` (60~86400)
- **지수 백오프** 적용

### DLQ 연동
- Rule의 타겟별로 SQS DLQ 설정 가능
- 모든 재시도 실패 후 이벤트가 DLQ로 이동 (원본 이벤트 + 오류 정보 포함)

### Archive & Replay
- **Archive**: 이벤트를 저장. 패턴 필터로 선택적 아카이빙, 보관 기간 지정 또는 무기한
- **Replay**: 아카이브된 이벤트를 시간 범위 지정하여 이벤트 버스에 재전송
- 활용: 장애 복구, 새 서비스 배포 후 과거 이벤트 재처리, 디버깅

## EventBridge vs SNS

| 기준 | SNS | EventBridge |
|------|-----|-------------|
| 라우팅 | 토픽 기반 단순 팬아웃 | 규칙 기반 콘텐츠 필터링 |
| 필터링 | 메시지 속성 기반 (제한적) | JSON 패턴 매칭 (풍부한 연산자) |
| 스키마 | 없음 | Schema Registry 제공 |
| 리플레이 | 불가 | Archive & Replay 지원 |
| SaaS 연동 | 없음 | Partner Event Bus |
| 처리량 | 매우 높음 | 리전별 TPS 제한 |
| 지연시간 | 더 낮음 | 약간 더 높음 |

**선택 기준**: 단순 팬아웃 → SNS, 콘텐츠 필터링/스키마/리플레이 필요 → EventBridge

## 운영

| 항목 | 값 |
|------|-----|
| 이벤트 크기 | 최대 **256KB** |
| PutEvents TPS | 주요 리전 10,000/sec, 기타 400~2,400/sec |
| Rule 수 | 이벤트 버스당 **300개** (최대 2000까지 상향) |
| Target 수 | Rule당 **5개** (조정 불가, 하드 리밋) |

**타겟 5개는 하드 리밋**이다. Rule 수처럼 Service Quotas로 상향되는 다른 한도와 달리 증설 요청이 안 된다. `PutTargets` API는 호출당 10 엔트리를 받지만 규칙에 실제 붙는 총량은 5개라, 넘기면 거부된다 (시험에서 조정 가능 vs 불가능 구분이 함정). 5개로 부족할 때 워크어라운드:
- **동일 패턴 규칙 다중화**: 같은 이벤트 패턴 규칙을 2~3개 만들어 타겟을 나눠 담으면 사실상 10~15개. 한 이벤트가 여러 규칙에 매칭되므로 문제없다 (규칙은 버스당 최대 2000개).
- **SNS 팬아웃**: 타겟 하나를 SNS 토픽으로 두고 구독자를 붙인다. SNS 구독자 수는 사실상 무제한이라 대량 팬아웃에 더 깔끔.

### Schema Registry
- 이벤트 구조를 중앙에서 관리
- **Schema Discovery**: 이벤트를 자동 감지하여 스키마 등록
- **Code Bindings**: 스키마에서 TypeScript/Java/Python 코드 자동 생성

### 비용
- Custom/Partner Events: ~$1.00 / 100만 건
- AWS 서비스 이벤트: **무료**
- Pipes: ~$0.40 / 100만 건
- Archive: 저장 비용 + 리플레이 시 이벤트 비용

## 하위 문서

- [[EventBridge-Event-Patterns|이벤트 패턴 매칭 (연산자 문법, 매칭 규칙, 테스트)]]
- [[EventBridge-SQS-Target|EventBridge → SQS 타겟 패턴 (리소스 정책, 메시지 구조, 컨슈머)]]

## 관련 문서
- [[SQS|SQS]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|전달 보장]]
- [[Transactional-Outbox|Transactional Outbox]]
