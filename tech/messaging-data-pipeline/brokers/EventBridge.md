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

| 종류 | 설명 |
|------|------|
| **Default** | 계정당 1개 자동 생성. AWS 서비스 이벤트(EC2, S3 등)가 자동으로 흐름 |
| **Custom** | 사용자 생성. 자체 애플리케이션 이벤트를 `PutEvents` API로 발행 |
| **Partner** | SaaS 파트너(Zendesk, Datadog, Auth0 등)의 이벤트 수신 |

### Event 구조
```json
{
  "source": "com.myapp.orders",      // 이벤트 출처
  "detail-type": "OrderCreated",     // 이벤트 종류
  "detail": { "orderId": "123", "amount": 50000 }  // 비즈니스 페이로드
}
```
- `source` + `detail-type`으로 이벤트를 식별하고 라우팅

### Rules와 Targets
- **Rule**: 이벤트 패턴으로 매칭 → 조건에 맞는 이벤트만 타겟으로 전달
- **Target**: Rule당 최대 **5개**. Lambda, SQS, SNS, Step Functions, ECS Task, API Destination 등
- 하나의 이벤트가 여러 Rule에 매칭 → 여러 타겟으로 동시 전달 가능

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

## 아키텍처 패턴

### EventBridge + SQS (버퍼링 패턴)
```
App → PutEvents → EventBridge → [Rule 필터링] → SQS → Consumer (ECS 워커)
```
- EventBridge가 라우팅/필터링, SQS가 버퍼링/속도 조절
- Consumer가 자기 속도로 Pull → 백프레셔 해결
- SQS DLQ로 소비 측 실패도 안전하게 관리
- **가장 일반적인 서버리스 이벤트 아키텍처 패턴**

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

## 신뢰성

### 전달 보장
- **At-least-once**: 동일 이벤트가 2번 이상 전달될 수 있음 → 소비자 측 멱등성 필요

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
| Rule 수 | 이벤트 버스당 **300개** (조정 가능) |
| Target 수 | Rule당 **5개** (조정 불가) |

### Schema Registry
- 이벤트 구조를 중앙에서 관리
- **Schema Discovery**: 이벤트를 자동 감지하여 스키마 등록
- **Code Bindings**: 스키마에서 TypeScript/Java/Python 코드 자동 생성

### 비용
- Custom/Partner Events: ~$1.00 / 100만 건
- AWS 서비스 이벤트: **무료**
- Pipes: ~$0.40 / 100만 건
- Archive: 저장 비용 + 리플레이 시 이벤트 비용

## 관련 문서
- [[SQS|SQS]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|전달 보장]]
- [[Transactional-Outbox|Transactional Outbox]]
