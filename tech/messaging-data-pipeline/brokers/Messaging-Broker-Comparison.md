---
tags: [messaging, rabbitmq, bullmq, sqs, kafka, broker]
status: done
category: "Messaging - 브로커"
aliases: ["Messaging Broker Comparison", "메시지 브로커 비교"]
---

# 메시지 브로커 비교 (RabbitMQ · BullMQ · SQS · Kafka)

주요 메시지 브로커 4종의 **성격·성능·운영 부담·적합 유스케이스** 비교. 각자 잘하는 영역이 달라 "가장 좋은 브로커"는 없고 **워크로드별 선택**이 맞다.

## 한 줄 요약

| 브로커 | 한 줄 성격 | 주 용도 |
|---|---|---|
| **RabbitMQ** | 성숙한 AMQP 브로커, 유연한 라우팅 | 복잡한 pub/sub·RPC·워크 큐 |
| **BullMQ** | Redis 기반 Node.js 작업 큐 | 작업 상태 추적·재시도·지연 큐 |
| **SQS** | AWS 관리형 단순 큐 | 서버리스·AWS 통합·무관리 |
| **Kafka** | 분산 로그·스트리밍 플랫폼 | 대용량 이벤트 스트리밍·재생 |

## 성능 비교 (단순 메시지 처리)

30만 건 기준 처리량:
1. **RabbitMQ** — 가장 빠름 (TCP 직접 통신, 최적화된 AMQP)
2. **BullMQ** — 중간 (Redis 레이턴시 + 상태 추적 오버헤드)
3. **SQS** — 느림 (HTTP + polling 기반, Visibility Timeout 비용)
4. **Kafka** — 대용량 배치에 최적, 낮은 단건 지연은 아님

단, 성능만으로 선택하면 **운영 편의·기능 부족**으로 후회할 수 있음.

## RabbitMQ

### 강점
- **성숙도**: 2007년부터 프로덕션 사용. 검증됨
- **유연한 라우팅**: Direct·Fanout·Topic·Headers Exchange 4종으로 거의 모든 메시징 패턴 표현
- **성능**: TCP 기반 직접 통신 → 낮은 지연
- **프로토콜**: AMQP·MQTT·STOMP·HTTP 등 다양
- **신뢰성**: Mirroring·Persistence·Quorum Queue로 고가용성

### 약점
- **운영 부담**: 클러스터링·미러링·Disk·Erlang 런타임 이해 필요
- **수동 처리 필요**: 커넥션·재시도·persistence 옵션을 앱에서 설계해야
- **Node.js 통합**: 라이브러리는 있으나 BullMQ만큼 매끈하지 않음

### 적합
- 복잡한 라우팅·RPC·요청-응답 패턴
- 자원 있는 팀·전담 운영자
- 마이크로서비스 간 메시지 브로커 표준화

## BullMQ

### 강점
- **작업 상태 내장**: Pending·Active·Completed·Failed·Delayed·Waiting 자동 관리
- **재시도·백오프**: 내장. 설정만 하면 됨
- **NestJS 친화**: `@Processor()`·`@Process()` 데코레이터로 선언적
- **Bull Board**: 웹 대시보드로 작업 모니터링
- **지연 큐·반복 작업**: cron 표현으로 정기 작업 간단

### 약점
- **Redis 의존**: Redis 장애가 곧 큐 장애. Redis 자체 이중화 필요
- **메시지 브로커보다 작업 큐**: pub/sub·fanout 패턴은 Redis pub/sub으로 별도
- **성능**: RabbitMQ 대비 느림 (Redis 오버헤드)

### 적합
- Node.js/NestJS 환경
- **작업 상태 추적이 핵심**: 이메일 발송·PDF 생성·이미지 처리 같은 백그라운드 작업
- 재시도·실패 복구가 중요한 작업
- 간단한 인프라 (이미 Redis 쓰는 환경)

## SQS (Amazon Simple Queue Service)

### 강점
- **완전 관리형**: 서버·클러스터링 고민 0
- **AWS 네이티브 통합**: Lambda·EventBridge·SNS·Step Functions 자연 연결
- **무한 확장**: AWS가 알아서 스케일
- **비용**: 사용량 기반 (저트래픽이면 매우 저렴)
- **DLQ·FIFO**: 내장 지원

### 약점
- **폴링 기반**: Long Polling도 수초 지연. RabbitMQ 대비 느림
- **메시지 순서**: Standard는 순서 보장 없음. FIFO는 300 TPS 제한
- **라우팅 약함**: Fanout은 SNS+SQS 조합으로 우회
- **AWS 종속**: 이식성 없음

### 적합
- AWS 생태계 중심 인프라
- 서버리스 아키텍처 (Lambda 트리거)
- 무관리 우선·팀 크기 작음
- 트래픽이 불규칙·저트래픽

## Kafka

### 강점
- **대용량 이벤트 스트리밍**: 초당 수십만~수백만 msg
- **재생(Replay) 가능**: 메시지 보관 기간 내 임의 시점부터 재소비
- **파티션 기반 확장**: 수평 확장 선형
- **생태계**: Connect·Streams·KSQL 등 통합 도구
- **정확히 한 번(Exactly-once)** 처리 가능 (Idempotent Producer + Transactions)

### 약점
- **운영 복잡도**: Zookeeper(또는 KRaft)·Broker·토픽·파티션 관리
- **단건 지연 높음**: 배치 최적화라 단건 처리엔 오버헤드
- **학습 곡선**: Consumer Group·Offset·Rebalancing 이해 필요
- **저트래픽에 과함**: 작은 서비스엔 인프라 비용 낭비

### 적합
- **이벤트 소싱·CDC**: 모든 변경을 로그로
- **대용량 실시간 분석**: 클릭스트림·IoT·로그 수집
- **메시지 재생 필요** 도메인
- 대기업·데이터팀이 있는 조직

## 선택 플로차트

```
메시지 양 > 수만/초 + 재생 필요?
  ├─ YES → Kafka
  └─ NO
      ↓
    AWS Lambda·서버리스 중심?
      ├─ YES → SQS (+ SNS로 fanout)
      └─ NO
          ↓
        Node.js·작업 상태 추적 중요?
          ├─ YES → BullMQ
          └─ NO (복잡 라우팅 or 다언어) → RabbitMQ
```

## 조합 사용도 흔함

실제 대규모 시스템은 **한 브로커만 쓰지 않음**:
- 내부 이벤트·CDC: **Kafka**
- 비동기 작업 처리 (이메일·알림): **BullMQ** 또는 **SQS**
- 서비스 간 RPC·fanout: **RabbitMQ** (또는 Kafka)

각 도구의 강점만 쓰는 조합이 현실적.

## 운영 관점 차이

| 축 | RabbitMQ | BullMQ | SQS | Kafka |
|---|---|---|---|---|
| 셋업 난이도 | 중 | **낮음** | **0 (관리형)** | 높음 |
| 운영 부담 | 중~높 | 중 | **0** | **높** |
| 관측성 도구 | Management UI | Bull Board | CloudWatch | Prometheus·Grafana·Confluent |
| 확장성 | 클러스터링 | Redis Cluster | 자동 | 파티션 확장 |
| 메시지 보관 | 짧음 (ACK 전) | Redis 설정 | 최대 14일 | 설정 가능 (장기 가능) |

## 흔한 실수

- **단순 작업 큐에 Kafka** — 오버엔지니어링, 운영 비용 폭발
- **라우팅 복잡한데 SQS** — SNS+SQS 조합으로 복잡해짐
- **BullMQ를 pub/sub 메시지 버스로** — 원래 목적 아님. Redis pub/sub 또는 RabbitMQ
- **RabbitMQ를 이벤트 소싱에** — 재생·장기 보관이 약함. Kafka 영역
- **성능만 보고 선택** — 운영 편의·팀 숙련도 무시

## 면접 체크포인트

- 4가지 브로커 각각의 한 줄 성격
- RabbitMQ가 AMQP 브로커라는 의미와 Exchange 4종
- BullMQ가 "작업 큐"이지 "메시지 브로커"가 아닌 이유
- SQS의 Polling 기반 한계와 장점
- Kafka의 재생(Replay)·파티션이 제공하는 능력
- 조합 사용이 실무에서 일반적인 이유
- 선택 기준 (트래픽·운영·팀·인프라)

## 출처
- [myfranchise (Medium) — RabbitMQ vs BullMQ vs SQS 실사용 후기](https://medium.com/@myfranchise/rabbitmq-vs-bullmq-sqs-%EC%8B%A4%EC%82%AC%EC%9A%A9-%ED%9B%84-%EC%86%94%EC%A7%81-%ED%9B%84%EA%B8%B0-c74c1a485143)

## 관련 문서
- [[SQS|SQS]]
- [[MQ-Kafka|Kafka]]
- [[Redis|Redis Messaging]]
- [[EventBridge|EventBridge]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|Delivery Semantics]]
