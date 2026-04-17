---
tags: [messaging, fan-out, sns, sqs, lambda, eventbridge, batch]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Fan-Out Architecture", "팬아웃 아키텍처", "팬아웃 패턴"]
---

# Fan-out Architecture

하나의 이벤트·메시지를 **여러 수신자에게 동시에 분배하거나, 여러 작업으로 쪼개어 병렬 처리**하는 분산 메시징 패턴. 대용량 일괄 처리·다수 소비자에게 같은 이벤트 전달·처리 격리에 쓰인다.

## Fan-out vs Fan-in

| 패턴 | 방향 | 용도 |
|---|---|---|
| **Fan-out** | 1 → N | 하나의 메시지를 여러 곳으로 분배 (Pub/Sub, 작업 분할) |
| **Fan-in** | N → 1 | 여러 곳의 메시지를 한 곳으로 모음 (집계, 결과 수집) |

대부분의 일괄 처리 파이프라인은 Fan-out → 병렬 처리 → Fan-in의 구조를 가진다.

## 사용 시점

- **대용량 일괄 처리**: 수십만~수천만 건의 동일 작업(쿠폰 지급, 푸시 발송, 데이터 마이그레이션)을 정해진 시간 안에 처리
- **다수 소비자가 같은 이벤트 필요**: 결제 완료 → 메일·재고·통계·CRM 등이 동시에 반응
- **API 경로에서 무거운 작업 분리**: API 응답 임계 경로에 비동기 작업 분리 (백프레셔·격리)
- **소비자별 독립 확장**: 각 소비자 그룹이 자기 속도로 처리

## 구현 패턴 (메시지 분배 형태)

### 1. SNS → 다중 SQS → 다중 Consumer (AWS 표준 fan-out)

```
Producer → SNS Topic ─┬─ SQS A → Consumer A
                      ├─ SQS B → Consumer B
                      └─ SQS C → Consumer C
```

- **SNS Message Filtering**: 메시지 속성 기반으로 특정 SQS로만 라우팅 가능
- 각 SQS가 독립 큐 → 한 소비자 장애가 다른 소비자에 전파되지 않음
- Producer는 SNS만 알면 됨 (구독 추가가 Producer 코드 수정 없이 가능)

### 2. Kafka 단일 토픽 + 다중 Consumer Group

```
Producer → Topic ─┬─ Consumer Group A (메일)
                  ├─ Consumer Group B (재고)
                  └─ Consumer Group C (통계)
```

- 같은 메시지를 그룹마다 독립 offset으로 소비
- 리플레이·순서 보장(파티션 내) 강점, 운영 부담 큼

### 3. GCP Pub/Sub Topic → 다중 Subscription

- SNS+SQS와 비슷한 구조이지만 SQS+소비자 역할을 Subscription이 맡음

### 4. 작업 분할형 Fan-out (단일 토픽/큐 → N 워커)

```
Producer → Queue → Workers (N 동시 소비)
```

- 같은 큐에서 여러 워커가 경쟁 소비(Competing Consumers)
- 분배 자체는 큐가 함 — 별도 fan-out 인프라 불필요
- 가장 단순. 작업이 모두 같은 종류일 때

## 다중 큐 vs 단일 큐 — 결정 기준

대용량 일괄 처리 시 "큐를 몇 개로 쪼갤까"는 자주 발생하는 결정. 흔한 오해와 진실:

| 오해 | 진실 |
|---|---|
| "SQS는 큐당 메시지 수 한계가 있어 여러 개 필요" | 표준 SQS는 **저장 메시지 수 사실상 무제한**. 진짜 제약은 **in-flight 메시지(처리 중)** 약 12만 개 |
| "큐 N개 = 처리량 N배" | 처리량은 **소비자 동시성**으로 결정됨. 큐 1개 + 소비자 N개도 동일 |
| "큐를 쪼개야 격리됨" | 같은 종류 작업이면 격리 가치 작음. 다른 종류 작업이면 의미 있음 |

**큐를 쪼개야 하는 진짜 이유**:
- **메시지 종류별 격리**가 필요할 때 (메일은 느려도 결제는 빨라야 함)
- 메시지 처리 중 **in-flight 한계**(12만)에 부딪힐 때
- 컨슈머 그룹별 **독립 스케일링·재시도 정책**이 필요할 때

같은 종류 작업이면 **큐 1개 + 소비자 동시성 조절**이 단순하고 충분한 경우가 많다.

## 동시성 점진 증가 (Warm-up)

대형 배치 시작 시 모든 소비자를 한 번에 띄우면 다운스트림(DB·외부 API)이 폭발한다. **점진 증가**가 안전.

- **EventBridge Scheduler / Cron**: 5분마다 Lambda 동시성 +1
- **Step Functions**: 단계별 동시성 증가 + 모니터링 트리거
- **Kafka Consumer Group**: 파티션 수에 맞춘 단계적 컨슈머 추가
- DB 커넥션 풀·외부 API rate limit과 함께 설계해야 함

## 흔한 함정

- **중복 메시지** — SNS at-least-once. 컨슈머는 **반드시 멱등** ([[Idempotency-Key]])
- **부분 실패 누락** — 일부 SQS만 메시지를 못 받는 상황. SNS 구독 상태 알람 필수
- **DLQ 누락** — 처리 실패 메시지가 사라지면 누가 못 받았는지 파악 불가. 모든 SQS에 [[DLQ]] 의무
- **순서 의존** — Fan-out은 순서 보장 안 됨. 순서가 필요하면 FIFO SQS / Kafka 파티션 키
- **백프레셔 부재** — 컨슈머가 못 따라가는데 계속 발행 → 큐 폭증, in-flight 한계 초과
- **다운스트림 동시성** — Lambda 동시성을 늘려도 DB가 못 받으면 의미 없음. 전 구간 처리량 측정 필요
- **모니터링 누락** — 큐 깊이·소비 속도·DLQ 항목 수·처리 지연 4개는 기본

## 측정해야 할 메트릭

| 메트릭 | 의미 | 알람 임계 |
|---|---|---|
| **큐 깊이(ApproximateNumberOfMessages)** | 적재량 | 평소 대비 N배 또는 일정 임계 |
| **메시지 age(SQS)/lag(Kafka)** | 가장 오래된 메시지 대기 시간 | 30초~몇 분 (SLO에 따라) |
| **소비 속도(Throughput)** | 분당 처리 건수 | 예상 처리량의 80% 미만 |
| **DLQ 건수** | 실패 누적 | 0 외 발생 시 |
| **컨슈머 가용성** | Lambda 오류율, 컨슈머 lag | 1% 이상 |

## 사례 (참고)

대규모 쿠폰 일괄 지급(수백만 건) 같은 시나리오에서 SNS → 35개 SQS → Lambda 5개 패턴으로 분당 ~10,500건 처리한 사례가 있다. 이후 깨달음: **SQS의 진짜 제약은 in-flight 12만 개**라는 사실을 알고 큐를 1~2개로 줄여도 같은 처리량 달성 가능. 큐 개수보다 **소비자 동시성·다운스트림 처리량·멱등성**이 본질이라는 시사점.

## 면접 체크포인트

- **Fan-out vs Fan-in** 구분과 흔한 결합 패턴
- **SNS+SQS** 패턴이 단일 SQS보다 나은 점 (격리·라우팅·확장)
- **SQS의 in-flight 한계**(12만)와 큐 분할의 진짜 이유
- **다중 큐 vs 단일 큐 + 다중 컨슈머**의 트레이드오프
- Fan-out 시 **멱등성**이 필수인 이유
- **Warm-up(동시성 점진 증가)** 가 필요한 시나리오
- 모니터링해야 할 4대 메트릭 (큐 깊이·age·throughput·DLQ)

## 출처
- [sienna1022 — 팬아웃 아키텍처를 활용한 320만개 쿠폰 안정적으로 배포하기](https://sienna1022.tistory.com/entry/%ED%8C%AC%EC%95%84%EC%9B%83-%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98%EB%A5%BC-%ED%99%9C%EC%9A%A9%ED%95%9C-320%EB%A7%8C%EA%B0%9C-%EC%BF%A0%ED%8F%B0-%EC%95%88%EC%A0%95%EC%A0%81%EC%9C%BC%EB%A1%9C-%EB%B0%B0%ED%8F%AC%ED%95%98%EA%B8%B0)

## 관련 문서
- [[Messaging-Patterns|메시징 패턴 (Pub/Sub, Task Distribution, Request/Reply)]]
- [[SQS|SQS]]
- [[EventBridge|EventBridge]]
- [[MQ-Kafka|Kafka]]
- [[Idempotency-Key|Idempotency Key]]
- [[At-Least-Once|At-Least-Once]]
- [[Delivery-Semantics|Delivery Semantics]]
