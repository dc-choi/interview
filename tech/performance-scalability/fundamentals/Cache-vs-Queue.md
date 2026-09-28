---
tags: [performance, cache, queue, messaging, architecture]
status: done
verified_at: 2026-09-28
category: "성능&확장성(Performance&Scalability)"
aliases: ["Cache vs Queue", "캐시 vs 큐"]
---

# 캐시와 큐

캐시와 큐는 트래픽 급증을 완화할 수 있지만 해결하는 문제가 다르다. 캐시는 이전에 만든 값을 재사용해 반복 읽기 비용을 줄이고, 큐는 지금 끝내지 않아도 되는 작업을 접수한 뒤 consumer의 속도에 맞춰 처리한다. 제품 이름보다 병목과 처리 계약을 먼저 정해야 한다.

## 핵심 비교

| 축 | 캐시 | 큐 |
|----|------|----|
| 주 질문 | 이 값을 다시 계산하거나 조회해야 하는가? | 이 작업을 지금 완료해야 하는가? |
| 주 목적 | 반복 읽기 지연과 원본 부하 감소 | producer와 consumer 분리, burst 흡수, 비동기 처리 |
| 저장 대상 | 원본에서 다시 만들 수 있는 값이나 계산 결과 | 처리할 command, job이나 전달할 event |
| 반환 | 요청한 값 | 접수 결과와 작업 식별자 |
| 수명 종료 | TTL, 무효화, eviction | ACK, retention 만료, 성공이나 DLQ 이동 |
| 핵심 지표 | hit rate, miss rate, eviction, stale 비율 | enqueue rate, consume rate, backlog, oldest age, retry와 DLQ |
| 주요 실패 | stale data, stampede, hot key | 중복, 순서 변경, 유실, backlog와 poison message |

## 캐시 동작

대표적인 cache-aside 흐름은 다음과 같다.

1. 애플리케이션이 cache를 조회한다.
2. hit이면 값을 바로 반환한다.
3. miss이면 원본을 조회하거나 계산한다.
4. 결과를 cache에 저장하고 반환한다.

반복 접근이 많고 값의 재사용 기간이 충분해야 이득이 난다. 최신성이 중요한 값은 TTL만으로 맡기지 않고 쓰기 시 무효화, versioned key나 write-through 같은 갱신 계약을 둔다. 자세한 선택지는 [[Cache-Strategies]]와 [[Cache-Invalidation]]을 따른다.

## 큐 동작

작업 큐의 기본 흐름은 다음과 같다.

1. API가 요청을 검증하고 idempotency key와 함께 작업을 저장한다.
2. 클라이언트에는 완료가 아니라 접수 상태와 job ID를 반환한다.
3. worker가 메시지를 가져가 실제 작업을 수행한다.
4. 성공하면 ACK하고 상태를 완료로 바꾼다.
5. 일시 오류는 제한된 재시도와 backoff를 적용하고, 영구 오류는 DLQ로 격리한다.

큐는 요청의 동기 지연을 줄이고 순간 유입을 완충하지만 consumer의 처리 능력을 자동으로 높이지 않는다. 유입률이 처리율보다 계속 높으면 backlog와 완료 지연이 커진다. [[Backpressure|배압]], admission control, worker 확장과 보존 한계를 함께 설계해야 한다.

### burst 흡수와 backlog 소진 시간

Azure Architecture Center는 이 구성을 Queue-Based Load Leveling 패턴으로 정리한다. 큐가 간헐적인 부하를 완충하므로 처리 인스턴스를 최대 부하가 아니라 평균 부하에 맞출 수 있다. 반대로 부하가 예측 가능하게 낮고 안정적이면 큐가 더하는 복잡도에 비해 이득이 작다. 그래서 부하 평탄화용 큐가 필요한지는 평균 유입량이 아니라 burst 크기를 처리율, 하류 용량과 완료 기한에 비교해 판단한다.

- burst 동안 유입률 λ가 처리율 μ를 넘으면 backlog는 대략 `(λ - μ) × burst 지속 시간`까지 쌓이고, burst가 끝난 뒤에도 `backlog ÷ (μ - 평시 유입률)`만큼 더 지나야 비워진다(μ가 평시 유입률보다 클 때). μ가 평시 유입률 이하이면 backlog는 줄지 않는다. μ는 동시 처리 수를 건당 처리 시간으로 나눠 추정한다([[Throughput-vs-Latency|Little's Law]]).
- 사례: 평소 초당 1건 미만이어도 특정 10분에 1만 건 이상이 몰린 사례를 1만 건으로 계산하면, 한 건씩 약 0.1초에 처리하는(초당 약 10건) 워커 한 대로는 burst 끝에 약 4,000건이 쌓이고 이를 비우는 데 7분 안팎이 더 걸린다. 워커 한 대가 한 건씩 처리해 하류 유입이 처리율 이하로 묶이므로 큐가 뒷단 과부하를 막고 메시지를 보관하지만, 마지막 건의 완료 지연은 분 단위로 남는다.
- 이 소진 시간이 완료 기한(예: 알림 도착 허용 지연) 안에 들도록 consumer 수의 하한을 정하고, 상한은 파티션 수와 하류(예: 외부 발송 API)가 감당할 합산 처리율 안에서 정한다. 하류가 포화되면 건당 처리 시간이 늘어 consumer를 늘려도 μ가 비례해 늘지 않고 과부하만 하류로 옮겨 간다. [[Consumer-Group|Kafka consumer group]]은 한 시점에 파티션 하나를 그룹 안의 consumer 하나에만 배정하므로 파티션 수가 병렬 consumer 수의 상한이다. Kafka 4.3 문서 기준 share group은 consumer 수가 파티션 수를 넘을 수 있지만 레코드 순서를 포기하는 대가이므로, 순서 있는 스트림이 아니라 레코드를 한 건씩 독립적으로 처리하는 작업에 맞다.
- backlog를 줄이는 것은 버퍼의 종류가 아니라 처리율이다. 테이블을 주기적으로 읽는 배치도 처리율이 같으면 비슷한 backlog가 생기고, 폴링 주기만큼 지연이 더해질 수 있다. 이런 배치도 producer와 consumer를 분리하고 미처리 건수로 backlog를 볼 수 있다. 브로커 큐가 더하는 것은 여러 consumer의 배타적 할당이나 경쟁 소비, 처리 위치 기록과 재처리, queue depth 같은 backlog 지표를 기본 기능으로 제공한다는 점이고, 테이블로 같은 일을 하려면 행 점유와 집계를 직접 구현하고 검증해야 한다.

## 접수와 완료를 구분한다

비동기 처리에서 enqueue 성공은 비즈니스 작업 성공이 아니다. HTTP API라면 `202 Accepted`와 job ID를 반환하고 다음 방식 중 하나로 완료를 알릴 수 있다.

- 상태 조회 API를 polling한다.
- webhook, SSE나 WebSocket으로 상태 변화를 전달한다.
- 사용자가 기다릴 필요 없는 작업은 알림이나 이력에서 사후 확인하게 한다.

결제와 재고처럼 승인 결과가 다음 행동을 결정하는 작업을 무조건 큐 뒤로 보내면 잘못된 성공 응답을 만들 수 있다. 동기적으로 확정할 경계와 비동기로 넘길 후속 작업을 분리한다.

## 선택 기준

### 캐시가 먼저인 경우

- 같은 조회나 계산이 반복되어 DB와 외부 API가 병목이다.
- 일정 시간 오래된 값을 허용할 수 있다.
- hit rate가 충분하고 무효화 규칙을 설명할 수 있다.

### 큐가 먼저인 경우

- 이메일, 이미지 변환과 통계 갱신처럼 응답 전에 끝낼 필요가 없는 작업이 길다.
- 순간 burst를 consumer가 감당 가능한 속도로 평탄화해야 한다.
- 재시도, 중복과 순서에 대한 처리 계약을 만들 수 있다.

### 둘 다 필요한 경우

상품 조회는 cache로 원본 부하를 줄이고, 주문 후 알림과 검색 index 갱신은 queue로 분리할 수 있다. 두 도구는 대체 관계가 아니라 서로 다른 경로에 함께 배치되는 경우가 많다.

## 제품보다 계약이 먼저다

Redis는 cache, stream이나 작업 큐의 기반으로 모두 사용할 수 있고 Kafka는 보존과 replay가 가능한 분산 로그로 활용할 수 있다. 같은 제품을 쓴다고 역할이 같아지는 것은 아니다. 다음 계약을 먼저 정한 뒤 요구에 맞는 제품을 고른다.

- 값 재사용인가, 작업 전달인가?
- 최신값과 순서가 어느 범위까지 필요한가?
- 데이터 유실과 중복 중 무엇을 허용하는가?
- backlog와 보존 기간의 상한은 얼마인가?
- 장애 후 원본에서 재생성하거나 replay할 수 있는가?

## 관련 문서

- [[Cache-Basics|캐시 기초]]
- [[Cache-Strategies|캐시 전략]]
- [[Messaging-Broker-Comparison|메시지 브로커 비교]]
- [[Delivery-Semantics|메시지 전달 보장]]
- [[Backpressure|배압]]
- [[Throughput-vs-Latency|처리량과 지연시간]]
- [[Consumer-Group|소비자 그룹]]

## 출처

- [캐시 vs 큐 — YouTube, 코딩하는기술사](https://www.youtube.com/watch?v=dVCB5jQAYMA)
- [때로는 오버엔지니어링이 필요합니다 — 올리브영 테크블로그](https://oliveyoung.tech/2026-09-23/overengineering-message-system/)
- [Azure Architecture Center, Queue-Based Load Leveling pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling)
- [Apache Kafka 4.3, Design](https://kafka.apache.org/43/design/design/)
- [Apache Kafka 4.3 Javadoc, KafkaShareConsumer](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaShareConsumer.html)
- [Apache Kafka 4.3, Upgrading](https://kafka.apache.org/43/getting-started/upgrade/)
- [Redis 공식 문서, Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/)
- [Redis 공식 문서, Redis lists](https://redis.io/docs/latest/develop/data-types/lists/)
- [Redis 공식 문서, Key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
