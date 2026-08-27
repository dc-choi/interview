---
tags: [messaging, rabbitmq, bullmq, sqs, kafka, broker]
status: done
verified_at: 2026-08-26
category: "Messaging - 브로커"
aliases: ["Messaging Broker Comparison", "메시지 브로커 비교"]
---

# 메시지 브로커 비교 (RabbitMQ, BullMQ, SQS, Kafka)

주요 메시지 브로커 4종의 **성격, 성능, 운영 부담, 적합 유스케이스** 비교. 각자 잘하는 영역이 달라 "가장 좋은 브로커"는 없고 **워크로드별 선택**이 맞다.

## 한 줄 요약

| 브로커 | 한 줄 성격 | 주 용도 |
|---|---|---|
| **RabbitMQ** | 성숙한 AMQP 브로커, 유연한 라우팅 | 복잡한 pub/sub, RPC, 워크 큐 |
| **BullMQ** | Redis 기반 Node.js 작업 큐 | 작업 상태 추적, 재시도, 지연 큐 |
| **SQS** | AWS 관리형 단순 큐 | 서버리스, AWS 통합, 낮은 인프라 운영 부담 |
| **Kafka** | 분산 로그, 스트리밍 플랫폼 | 대용량 이벤트 스트리밍, 재생 |

## 성능 비교 (특정 실험 1건의 결과)

아래는 브로커 일반의 성능 순위가 아니라, Node.js 앱에서 메시지 30만 건을 돌린 한 회사(마이프차) 기술 블로그의 실험 1건의 결과다.

- **실험 조건**: 메시지 300,000개, Publish를 모두 끝낸 뒤 Consume 시작, RabbitMQ는 `amqplib`, BullMQ는 `bullmq`와 `ioredis`, BullMQ Worker는 `concurrency=1000`. 하드웨어, 노드 구성, 브로커 튜닝 값은 원문에 없다.
- **실측 대상은 RabbitMQ와 BullMQ 둘뿐**: RabbitMQ가 더 빨랐고(TCP 직접 통신, 단순 메시지 전달에 최적화), BullMQ는 상태 추적과 재시도, 백오프 오버헤드로 느렸다.
- **SQS는 측정하지 않았다**: 원문은 폴링 특성상 BullMQ보다 낮을 것이라는 저자의 추정치만 적었다.
- **Kafka는 실험에 포함되지 않았다**: 원문도 후속 과제로만 언급한다. Kafka 처리량은 파티션 수, 배치 크기, `acks` 설정에 좌우돼 단일 클라이언트 단건 전송 실험으로는 순위를 매길 수 없다.

즉 이 순위는 단건 전송 위주의 한 조건에서 나온 값이고, 아래 Kafka 항목의 대량 스트리밍 처리량은 파티션 확장과 배치 전송을 전제한 다른 조건이다. 성능만으로 선택하면 **운영 편의, 기능 부족**으로 후회할 수 있음.

## RabbitMQ

### 강점
- **성숙도**: 2007년부터 프로덕션 사용. 검증됨
- **유연한 라우팅**: Direct, Fanout, Topic, Headers Exchange 4종으로 거의 모든 메시징 패턴 표현
- **지연 특성**: 장기 AMQP 연결로 메시지를 전달한다. 실제 지연은 publisher confirm, persistence, queue 종류와 복제 설정을 함께 측정
- **프로토콜**: AMQP 0-9-1과 AMQP 1.0을 중심으로, plugin을 통해 MQTT와 STOMP 등을 지원. HTTP는 관리 API의 별도 경로
- **복제 고가용성**: RabbitMQ 4.x에서는 Quorum Queue 또는 Stream을 사용. classic queue mirroring은 4.0에서 제거됐고, persistence만으로는 복제나 고가용성을 제공하지 않음

### 약점
- **운영 부담**: 클러스터링, Quorum Queue 또는 Stream, Disk, Erlang 런타임 이해 필요
- **수동 처리 필요**: 커넥션, 재시도, persistence 옵션을 앱에서 설계해야
- **Node.js 통합**: 라이브러리는 있으나 BullMQ만큼 매끈하지 않음

### 적합
- 복잡한 라우팅, RPC, 요청-응답 패턴
- 자원 있는 팀, 전담 운영자
- 마이크로서비스 간 메시지 브로커 표준화

## BullMQ

### 강점
- **작업 상태 내장**: wait, prioritized, delayed, waiting-children, active, completed, failed 등을 관리
- **재시도, 백오프**: 내장. 설정만 하면 됨
- **NestJS 친화**: BullMQ consumer는 `@Processor()`와 `WorkerHost.process(job)`로 선언적으로 구현 (`@Process()` handler는 BullMQ에 쓰지 않음)
- **Bull Board**: 웹 대시보드로 작업 모니터링
- **지연 작업, Job Scheduler**: 지연 실행과 cron 또는 주기 기반 작업 생성 지원

### 약점
- **Redis 의존**: Redis 장애가 곧 큐 장애. Redis 자체 이중화 필요
- **메시지 브로커보다 작업 큐**: pub/sub, fanout 패턴은 Redis pub/sub으로 별도
- **상태 관리 비용**: 작업 상태, 재시도와 잠금 갱신을 Redis에 기록하므로 단순 전달 브로커와 비용 구조가 다름. 처리량은 작업 옵션과 Redis 구성으로 측정

### 적합
- Node.js/NestJS 환경
- **작업 상태 추적이 핵심**: 이메일 발송, PDF 생성, 이미지 처리 같은 백그라운드 작업
- 재시도, 실패 복구가 중요한 작업
- 간단한 인프라 (이미 Redis 쓰는 환경)

## SQS (Amazon Simple Queue Service)

### 강점
- **완전 관리형**: 브로커 서버와 클러스터를 직접 운영하지 않음
- **AWS 네이티브 통합**: Lambda, EventBridge, SNS, Step Functions 자연 연결
- **관리형 확장**: Standard queue는 높은 처리량을 제공하지만 service quota, consumer 처리량과 downstream 용량은 직접 설계
- **비용**: 사용량 기반 (저트래픽이면 매우 저렴)
- **DLQ, FIFO**: 내장 지원

### 약점
- **폴링 기반**: 컨슈머가 `ReceiveMessage`로 배치를 가져간다. long polling은 빈 응답과 호출 수를 줄이지만, 처리 지연은 poll 대기, consumer 수와 batch 설정으로 측정해야 한다. 위 성능 절의 SQS 평가는 실측이 아니다
- **메시지 순서**: Standard는 순서 보장 없음. 일반 FIFO 기본 한도는 API 작업별 초당 300회, 최대 10개 배치 시 API 작업별 초당 3,000개 메시지이며 고처리량 FIFO는 리전별 API 할당량과 MessageGroupId 분산을 확인
- **라우팅 약함**: Fanout은 SNS+SQS 조합으로 우회
- **AWS 종속**: IAM, EventBridge, Lambda 통합을 깊게 쓰면 다른 큐로 이전할 때 어댑터와 운영 구성을 다시 만들어야 함

### 적합
- AWS 생태계 중심 인프라
- 서버리스 아키텍처 (Lambda 트리거)
- 브로커 인프라 운영 부담 최소화가 우선이고 팀 크기가 작음
- 트래픽이 불규칙, 저트래픽

## Kafka

### 강점
- **대용량 이벤트 스트리밍**: 파티션 확장과 배치 전송을 전제로 한 높은 처리량. 절대 수치는 파티션 수, 배치 크기, `acks`와 하드웨어에 좌우되므로 벤치마크 조건 없이 인용하지 않는다
- **재생(Replay) 가능**: 메시지 보관 기간 내 임의 시점부터 재소비
- **파티션 기반 확장**: broker와 partition을 늘려 병렬 처리량을 확장. 증가 폭은 key 분포, rebalance, replication과 storage 병목에 따라 선형이 아닐 수 있음
- **생태계**: Connect, Streams, KSQL 등 통합 도구
- **read-process-write 경계의 exactly-once**: Kafka 토픽에서 읽어 처리하고 Kafka 토픽으로 쓰는 구간은 Idempotent Producer와 트랜잭션으로 출력과 오프셋 커밋을 원자적으로 묶는다. 외부 DB나 API 같은 다른 destination은 해당 시스템의 협조가 필요해, 종단 간으로는 at-least-once 전달 + 멱등 처리로 effectively-once를 만든다 ([[Delivery-Semantics|전달 보장]], [[Idempotent-Consumer|멱등 컨슈머]])

### 약점
- **운영 복잡도**: KRaft controller, broker, topic과 partition 관리. Kafka 4.0부터 ZooKeeper mode는 제거됐고 기존 3.x cluster는 migration이 필요
- **단건 지연 tradeoff**: batching, `linger.ms`, replication과 `acks` 설정이 처리량과 지연을 함께 바꿈
- **학습 곡선**: Consumer Group, Offset, Rebalancing 이해 필요
- **저트래픽에 과함**: 작은 서비스엔 인프라 비용 낭비

### 적합
- **이벤트 소싱, CDC**: 모든 변경을 로그로
- **대용량 실시간 분석**: 클릭스트림, IoT, 로그 수집
- **메시지 재생 필요** 도메인
- 운영 전문성을 갖추거나 관리형 Kafka의 비용을 감당할 수 있는 조직

## 선택 플로차트

```
재생과 장기 보관이 핵심이고 파티션 확장이 필요한가?
  ├─ YES → Kafka
  └─ NO
      ↓
    AWS Lambda, 서버리스 중심?
      ├─ YES → SQS (+ SNS로 fanout)
      └─ NO
          ↓
        Node.js, 작업 상태 추적 중요?
          ├─ YES → BullMQ
          └─ NO (복잡 라우팅 or 다언어) → RabbitMQ
```

## 조합 사용도 흔함

요구사항이 분명히 다르면 여러 브로커를 조합할 수 있다:
- 내부 이벤트, CDC: **Kafka**
- 비동기 작업 처리 (이메일, 알림): **BullMQ** 또는 **SQS**
- 서비스 간 RPC, fanout: **RabbitMQ** (또는 Kafka)

각 도구의 강점만 쓰는 조합이 현실적.

## 본인이 직접 수행한 경험을 공개 가능한 범위로 일반화한 사례 — 비동기 업무 자동화에서 Kafka를 기각한 판단

비동기 업무 자동화에서 Kafka를 먼저 검토했지만, 실제 처리량과 재생 요구가 낮고 중요한 요구가 재시도와 DLQ였기 때문에 EventBridge와 SQS 같은 관리형 조합을 선택했다.

- **비용 비교**: 과거 산정값을 그대로 인용하지 않고, 현재 workload, 배치, 재시도, payload 크기, 리전과 가격표로 다시 계산한다. 관리형 Kafka의 과금 모델도 배포 방식에 따라 다르므로 같은 고정비 모델로 일반화하지 않는다.
- **처리 특성**: 초 단위 실시간성이나 장기 replay보다 최종 일관성과 처리 실패의 감지와 복구가 중요하다면, 처리량만으로 Kafka를 선택하지 않는다.
- **실패 처리**: 소비자별 재시도, DLQ, 재처리와 보상 동작을 명시해 전달 실패가 사용자 업무에 남기는 영향을 줄인다.

후속 비동기 처리를 도메인 로직에서 분리해 결합도를 낮추고, 실패는 소비자별 재시도와 DLQ 정책으로 다룰 수 있게 했다. 다만 관리형 서비스도 사용량 과금과 운영 한계가 있으므로 채널별 실패율, DLQ 적재와 실제 비용을 별도로 관찰한다. [[EventBridge-SQS-Target|EventBridge → SQS 타겟 패턴]]

## 운영 관점 차이

| 축 | RabbitMQ | BullMQ | SQS | Kafka |
|---|---|---|---|---|
| 셋업 난이도 | 중 | **낮음** | **낮음** (IAM, queue policy, DLQ와 alarm 구성) | 높음 |
| 운영 부담 | 중~높 | 중 | **낮음** (quota, consumer, DLQ와 비용 감시) | **높음** |
| 관측성 도구 | Management UI | Bull Board | CloudWatch | Prometheus, Grafana, Confluent |
| 확장성 | 클러스터링 | Redis Cluster | 자동 | 파티션 확장 |
| 메시지 보관 | ACK까지 보관, TTL과 queue limit 설정 가능. ACK 뒤 Kafka식 replay는 불가 | Redis 설정 | 최대 14일 | retention 설정 범위에서 replay 가능 |

## 흔한 실수

- **단순 작업 큐에 Kafka** — 오버엔지니어링, 운영 비용 폭발
- **라우팅 복잡한데 SQS** — SNS+SQS 조합으로 복잡해짐
- **BullMQ를 pub/sub 메시지 버스로** — 원래 목적 아님. Redis pub/sub 또는 RabbitMQ
- **RabbitMQ를 이벤트 소싱에** — 재생, 장기 보관이 약함. Kafka 영역
- **성능만 보고 선택** — 운영 편의, 팀 숙련도 무시

## 면접 체크포인트

- 4가지 브로커 각각의 한 줄 성격
- RabbitMQ가 AMQP 브로커라는 의미와 Exchange 4종
- BullMQ가 "작업 큐"이지 "메시지 브로커"가 아닌 이유
- SQS의 Polling 기반 한계와 장점
- Kafka의 재생(Replay), 파티션이 제공하는 능력
- 조합 사용이 실무에서 일반적인 이유
- 선택 기준 (트래픽, 운영, 팀, 인프라)

## 출처
- [Amazon MSK pricing](https://aws.amazon.com/msk/pricing/)
- [Amazon SQS pricing — 요청 과금, Free Tier](https://aws.amazon.com/sqs/pricing/)
- [AWS Price List API — Amazon SQS 현재 리전별 단가](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSQueueService/current/index.json)
- [AWS 공식 문서, Amazon SQS message quotas](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html)
- [RabbitMQ 공식 문서, What's New in RabbitMQ 4.0](https://blog.rabbitmq.com/docs/4.0/whats-new)
- [NestJS 공식 문서, Queues (BullMQ consumers)](https://docs.nestjs.com/techniques/queues)
- [BullMQ 공식 문서, Architecture와 job lifecycle](https://docs.bullmq.io/guide/architecture)
- [RabbitMQ 공식 문서, Time-To-Live and Expiration](https://www.rabbitmq.com/docs/ttl)
- [Apache Kafka Documentation — Message Delivery Semantics](https://kafka.apache.org/documentation/#semantics)
- [Apache Kafka 4.0 Release Announcement — KRaft only](https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/)
- [마이프차 기술 블로그 (Medium) — RabbitMQ vs BullMQ (+SQS) 실사용 후 솔직 후기 (30만 건 실험, RabbitMQ와 BullMQ만 실측)](https://medium.com/@myfranchise/rabbitmq-vs-bullmq-sqs-%EC%8B%A4%EC%82%AC%EC%9A%A9-%ED%9B%84-%EC%86%94%EC%A7%81-%ED%9B%84%EA%B8%B0-c74c1a485143)

## 관련 문서
- [[SQS|SQS]]
- [[MQ-Kafka|Kafka]]
- [[Redis|Redis Messaging]]
- [[EventBridge|EventBridge]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|Delivery Semantics]]
- [[Idempotent-Consumer|멱등 컨슈머]]
