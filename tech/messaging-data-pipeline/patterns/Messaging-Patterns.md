---
tags: [messaging]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Messaging Patterns", "메시징 패턴"]
verified_at: 2026-08-26
---

# 메시징 패턴 (Messaging Patterns)

분산 시스템에서 컴포넌트 간 통신을 위한 세 가지 핵심 패턴

## 메시지 유형

| 유형 | 목적 | 예시 |
|------|------|------|
| Command | 특정 동작 실행 요청 | RPC 호출, HTTP 요청 |
| Event | 발생한 사실 알림 | 결제 완료, 사용자 가입 |
| Document | 데이터 전달 (실행 지시 없음) | 쿼리 결과, 리포트 |

## 전달 방식

| 방식 | 장점 | 단점 |
|------|------|------|
| P2P (Peer-to-Peer) | 단일 장애점 없음, 낮은 지연 | 복잡한 구현, 직접 연결 관리 |
| Broker 기반 | 발신/수신 분리, 메시지 영속성, 고급 라우팅 | 인프라 오버헤드, 브로커 장애 위험 |

## 1. Pub/Sub (발행/구독)

분산 Observer 패턴. 발행자가 메시지를 브로드캐스트하고, 관심 있는 구독자만 수신한다.

특징:
- 발행자는 구독자를 알 필요 없음 (느슨한 결합)
- 토픽/채널 기반 메시지 분류
- Fan-out: 관심 있는 구독마다 같은 이벤트를 독립적으로 소비
- 뒤늦게 구독한 소비자의 과거 이벤트 조회 가능 여부는 보존과 재생 정책에 따라 다르다. Kafka는 보존된 로그를 다시 읽을 수 있다.

적합한 경우: 이벤트 전파, 실시간 알림, 로그 수집, 캐시 무효화

## 2. Task Distribution (작업 분배)

작업을 경쟁 소비자(competing consumers)에게 분배하여 병렬 처리한다.

특징:
- 같은 작업을 경쟁 소비자에게 분배하지만, 재전달로 같은 메시지를 다시 처리할 수 있으므로 멱등성이 필요하다.
- 로드 밸런싱: 라운드 로빈 또는 최소 부하 할당
- Fanout/Fanin: 여러 단계의 파이프라인 처리
- 처리 완료 후 ACK 또는 offset commit으로 진행 상태를 기록한다. 영속성, 재전달과 외부 부수효과의 보장은 별도로 확인한다.

적합한 경우: 이미지 처리, 이메일 발송, 데이터 변환, 배치 작업

## 3. Request/Reply (요청/응답)

비동기 채널 위에 동기적 요청-응답 추상화를 구현한다.

특징:
- Correlation ID: 요청과 응답을 매칭하는 고유 식별자
- Return Address: 응답을 보낼 큐/채널 지정
- 타임아웃: 응답 대기 시간 제한으로 무한 블로킹 방지
- 순서 비보장: 응답이 요청 순서대로 오지 않을 수 있음

적합한 경우: 마이크로서비스 간 RPC, API Gateway, 동기 워크플로우

## 기술별 패턴 지원

| 기술 | Pub/Sub | Task Distribution | Request/Reply |
|------|---------|-------------------|---------------|
| Redis Pub/Sub | 최적 (비영속) | 미지원 | 구현 가능 |
| Redis Streams | 소비자 그룹 | 소비자 그룹 | 구현 가능 |
| Kafka | 토픽 기반 | 소비자 그룹 | 구현 가능 |
| RabbitMQ | Exchange | Work Queue | Reply Queue |
| ZeroMQ | PUB/SUB 소켓 | PUSH/PULL 소켓 | REQ/REP 소켓 |
| BullMQ | 미지원 | Job Queue | Job 결과 반환 |

## 패턴 선택 가이드
- 알림/이벤트 전파 → Pub/Sub
- 병렬 작업 분배 → Task Distribution
- 응답이 필요한 호출 → Request/Reply
- 대규모 스트림 처리 → Kafka + Consumer Group

## 기술 비교 (Kafka vs SQS vs Pub/Sub)

| 기준 | Kafka | SQS | Pub/Sub (GCP) |
|------|-------|-----|---------------|
| 모델 | 분산 로그 (Consumer가 offset 관리) | 큐 (메시지 삭제형) | Topic 기반 팬아웃 (1:N) |
| 순서 보장 | 파티션에 기록된 순서대로 읽음 | Standard: 미보장, FIFO: 같은 message group 내 보장 | 미보장 (ordering key로 부분 보장) |
| 메시지 보존 | 보존 정책에 따라 유지 (남아 있는 로그 리플레이 가능) | 소비자가 처리 후 명시적으로 삭제, 미삭제 메시지도 보존 기간 만료 가능 | ACK 후 timestamp seek로 재생하려면 topic retention 또는 acknowledged message retention 필요. 미리 만든 유효한 snapshot으로의 seek는 별도 경로 |
| 처리량 | 파티션, 브로커 구성과 워크로드에 따라 측정 | Standard는 매우 높은 처리량을 지원. FIFO 할당량은 리전, 파티션과 배치 여부에 따라 확인 | 프로젝트와 리전 할당량, 메시지 크기에 따라 확인 |
| 비용 구조 | 직접 운영과 프로비저닝형 서비스는 용량 고정비와 운영 비용이 있고, MSK Serverless는 사용량 과금 | 요청과 데이터 전송 기반 사용량 과금. 무료 사용량은 현재 계정 자격과 가격 정책을 확인 | 처리량과 데이터 전송 기반 사용량 과금. 현재 가격 정책을 확인 |
| 적합 | 이벤트 리플레이, 로그 수집, 파티션 내 순서 보장 필요 | 작업 큐, 비동기 처리, 운영 부담 최소화 | 마이크로서비스 간 이벤트 팬아웃 |

### 선택 기준
1. **Kafka** — 이벤트 리플레이, 파티션 내 순서 보장, 높은 지속 처리량, 여러 소비자 그룹의 독립 소비
2. **SQS** — 여러 worker가 경쟁 소비하는 작업 큐, 최종 일관성 허용, 운영 부담 최소화
3. **Pub/Sub** — 하나의 이벤트를 여러 서비스가 구독(팬아웃), GCP 생태계

### AWS 이벤트 서비스 조합
- **EventBridge + SQS**: EventBridge가 이벤트 라우팅(규칙 기반 필터링), SQS가 큐 역할. 서버리스 이벤트 아키텍처에 적합
- **SNS + SQS**: SNS가 팬아웃(1:N), SQS가 소비자별 큐. 다수 소비자가 같은 이벤트를 받아야 할 때

## 큐, 순서와 복제의 보장 경계

2026-10-07 Kafka 4.1 문서와 Amazon SQS, Google Cloud Pub/Sub 공식 문서로 이 절과 위의 전달, 보존 설명을 대조했다. 가격과 전체 제품 기능표를 다시 검증한 날짜는 아니다.

- **큐는 대기를 옮긴다:** 소비자가 멈춰도 발행을 계속하려면 브로커가 메시지를 받아 보존할 수 있어야 한다. 유입량이 처리량보다 크면 적체가 늘어난다. 큐 길이뿐 아니라 가장 오래된 미처리 메시지의 나이와 보존 기간을 함께 본다. SQS 지표는 근삿값이고 일부 독성 메시지를 나이 계산에서 제외하므로 DLQ도 확인한다.
- **소비자를 늘리는 데도 경계가 있다:** Kafka의 일반 consumer group은 파티션을 그룹 구성원에게 나눠 할당한다. 파티션 수보다 소비자가 많으면 추가 소비자가 맡을 파티션이 없을 수 있다. 서로 다른 그룹은 같은 로그를 독립적으로 읽는다. 이 설명을 share group이나 모든 큐 제품의 동작으로 일반화하지 않는다.
- **읽기 순서와 업무 완료 순서는 다르다:** 같은 파티션에서 순서대로 읽어도 애플리케이션이 외부 작업을 병렬 실행하거나 실패 건을 따로 재시도하면 완료 순서는 바뀔 수 있다. 주문별 상태 전이처럼 순서가 필요한 범위를 정하고, 그 범위의 처리와 재시도까지 직렬화할지 판단한다. SQS FIFO도 서로 다른 message group 간 전역 순서는 보장하지 않는다.
- **복제만으로 무중단과 무손실을 단정하지 않는다:** Kafka에서 `acks=all`은 현재 ISR의 확인을 기다린다는 뜻이다. `min.insync.replicas`를 함께 설정하면 ISR이 최소 수보다 적을 때 쓰기를 거부해 내구성을 우선할 수 있다. 장애 감지와 리더 교체 중에는 지연이나 실패가 생길 수 있고, ACK된 로그의 보존과 외부 DB 반영의 중복 방지는 별개다.

실무에서는 소비자를 잠시 중단했을 때 적체와 복구 시간을 관찰하고, 같은 메시지를 두 번 처리해도 부수효과가 중복되지 않는지 확인한다. 순서와 재시도의 상세는 [[MQ-Kafka-Event-Ordering|Kafka 순서 보장]], [[Idempotent-Consumer|멱등 소비자]], [[Backpressure|백프레셔]]로 이어진다.

## 출처
- [Apache Kafka 4.1 Documentation, Introduction](https://kafka.apache.org/41/getting-started/introduction/)
- [Apache Kafka 4.1 Documentation, Design](https://kafka.apache.org/41/design/design/)
- [Amazon SQS Developer Guide, At-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS Developer Guide, FIFO queue delivery logic](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html)
- [Amazon SQS Developer Guide, Available CloudWatch metrics](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html)
- [Google Cloud, Replay and purge messages with seek](https://docs.cloud.google.com/pubsub/docs/replay-overview)
- [AWS 공식 문서, Amazon SQS message quotas](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html)
- [Amazon Web Services, Amazon MSK pricing](https://aws.amazon.com/msk/pricing/)
- [Amazon Web Services, Amazon SQS pricing](https://aws.amazon.com/sqs/pricing/)
- [Google Cloud, Pub/Sub pricing](https://cloud.google.com/pubsub/pricing)
- [Google Cloud, Pub/Sub quotas and limits](https://docs.cloud.google.com/pubsub/quotas)

## 관련 문서
- [[Delivery-Semantics|전달 보장]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Consumer-Group|소비자 그룹]]
- [[MQ-Kafka|Kafka]]
- [[SQS|SQS]]
- [[EventBridge|EventBridge]]
- [[Redis|Redis Messaging]]
- [[RabbitMQ-Exchange-Routing|RabbitMQ Exchange 라우팅 (exchange 타입과 Pub/Sub, 작업 분배)]]
