---
tags: [messaging, kafka, nestjs, consumer]
status: done
verified_at: 2026-09-30
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Consumer", "NestJS Kafka", "eachMessage vs eachBatch", "Kafka 소비 누락 진단"]
---

# Kafka 컨슈머 구현 (NestJS)

> 상위 인덱스: [[MQ-Kafka|Kafka]]

## NestJS Kafka 마이크로서비스

NestJS는 `@nestjs/microservices`로 Kafka를 1급 트랜스포트로 지원. 컨슈머만 따로 떠 있는 **배치/이벤트 처리 서버**를 구성할 때 자주 쓰이는 패턴.

```typescript
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    BatchServerModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'batch-server',
          brokers: [process.env.KAFKA_HOST],
        },
        consumer: {
          groupId: 'batch-server-consumer',
        },
        subscribe: {
          fromBeginning: true,
        },
      },
    },
  );
  await app.listen();
}
```

핸들러는 `@MessagePattern`(요청-응답) 또는 `@EventPattern`(단방향 이벤트) 데코레이터로 토픽을 구독.

```typescript
@Controller()
export class CdcConsumer {
  @EventPattern('inhabob.public.customer')
  async handleCustomerChange(@Payload() event: DebeziumEvent) {
    // before/after를 SCD Type 2 행으로 변환해 적재
  }
}
```

### 주의점
- `fromBeginning: true`는 **새 컨슈머 그룹**일 때만 첫 메시지부터 — 기존 그룹이 있으면 offset에서 이어 처리
- `@nestjs/microservices`의 기본 직렬화는 JSON. Debezium Avro 출력 사용 시 별도 Deserializer 등록
- 백프레셔와 동시성 제어가 필요하면 내부적으로 `kafkajs`의 `eachBatch`로 내려가는 옵션 활용 (아래 참고)
- handler에는 payload 확인과 service 호출만 두고 업무 로직은 service에 둔다. HTTP와 메시지 입구가 같은 로직을 쓰고 테스트도 service 단위로 할 수 있다.

## Consumer 배치 처리: eachMessage vs eachBatch

`kafkajs` 기준, 컨슈머가 메시지를 소비하는 방식은 두 가지다.

### eachMessage (메시지 단위)
메시지 하나씩 콜백으로 넘겨받아 처리한다. 단순하지만 I/O와 DB 호출이 메시지당 발생하므로 **대량 처리 시 처리량 부족과 메모리 누적** 위험이 있다.

```typescript
await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
        await processOne(message);  // 메시지당 1회 처리
    },
});
```

### eachBatch (배치 단위)
한 번에 파티션에서 가져온 메시지 묶음(Batch) 단위로 처리한다. **벌크 INSERT, 집계, DB 트랜잭션 최적화에 유리**하다.

```typescript
await consumer.run({
    autoCommit: false,
    eachBatchAutoResolve: false,
    eachBatch: async ({
        batch,
        resolveOffset,
        heartbeat,
        isRunning,
        isStale,
    }) => {
        const holder = new BulkDataHolder();
        const offsetsAfterFlush: string[] = [];
        for (const message of batch.messages) {
            if (!isRunning() || isStale()) break;
            try {
                const parsed = JSON.parse(message.value?.toString() ?? '');
                holder.add(parsed);
            } catch (err) {
                await sendToDlq(message, err);
            }
            offsetsAfterFlush.push(message.offset);
            await heartbeat();
        }

        const lastProcessedOffset = offsetsAfterFlush[offsetsAfterFlush.length - 1];
        if (isStale() || lastProcessedOffset === undefined) return;

        await holder.flush(); // 실패하면 성공 메시지 offset은 resolve하지 않음
        for (const offset of offsetsAfterFlush) {
            resolveOffset(offset);
        }
        await heartbeat();
        await consumer.commitOffsets([{
            topic: batch.topic,
            partition: batch.partition,
            offset: (BigInt(lastProcessedOffset) + 1n).toString(),
        }]);
    },
});
```

`autoCommit: false`를 쓰면 성공한 offset을 직접 `resolveOffset`하고 다음에 읽을 offset인 `마지막 처리 offset + 1`을 커밋해야 한다. 인자 없는 `commitOffsetsIfNecessary()`는 `autoCommitInterval`이나 `autoCommitThreshold` 조건이 없으면 커밋하지 않으므로 이 예제는 `consumer.commitOffsets()`를 명시적으로 호출한다. 벌크 저장이 끝나기 전에 뒤쪽 offset을 resolve하면 앞쪽의 미반영 메시지까지 처리된 것처럼 보일 수 있으므로, 배치의 DB 반영과 DLQ 저장이 모두 성공한 뒤 순서대로 resolve한다. 배치 후반 오류로 재시도되면 이미 보낸 DLQ가 중복될 수 있으므로 DLQ 쓰기도 멱등하게 만든다. 실패 메시지를 조용히 건너뛰고 offset만 올리면 유실이므로 DLQ, 재시도 토픽, 처리 중단 중 하나를 명확히 선택한다 (설계 결정 축은 [[MQ-Kafka-Retry-DLT|재시도와 DLT]] 참고).

### 선택 기준
| 상황 | 권장 |
|---|---|
| 메시지별 독립 처리 (알림, 이벤트 라우팅) | `eachMessage` |
| DB 벌크 INSERT, 집계, 대용량 파이프라인 | `eachBatch` |
| 전역 버퍼에 메시지 누적해서 주기적 flush | `eachBatch` + 지역 변수 홀더 |

**주의:** `eachBatch`에서 전역 변수에 누적하면 메모리 누수 발생. **배치 내부 지역 스코프**로 홀더를 두고 끝나면 즉시 GC되도록 해야 한다.

## 발행은 됐는데 후처리가 일어나지 않을 때

HTTP 호출이 성공해도 이벤트 후처리까지 끝났다는 뜻은 아니다. 생산 측과 소비 측을 나눠 어느 구간에서 멈췄는지 좁힌다.

1. **발행 측**: 기대한 topic이 있는지, 이벤트 시점에 해당 partition의 log end offset이 늘었는지, key와 value가 기대한 payload인지 본다. topic 이름이 틀리면 자동 생성이 켜진 broker는 오류 없이 다른 topic을 만든다 ([[Kafka-Partition-Sizing#자동 토픽 생성은 산정을 우회한다|자동 토픽 생성]]). offset이 늘지 않았으면 producer 쪽(ClientProxy 연결, `emit` 호출 경로, 에러 로그)을 본다.
2. **소비 측 group**: topic을 구독하는 consumer group이 있고 멤버가 붙어 있는지 본다. group이나 멤버가 없으면 consumer가 뜨지 않은 것이다. NestJS는 server 쪽 `clientId`와 `groupId`에 기본으로 `-server`를 붙이므로(`postfixId`로 변경) 위 예제의 group은 broker에서 `batch-server-consumer-server`로 보인다. 하이브리드 앱이면 `connectMicroservice()`와 `startAllMicroservices()` 호출부터 확인한다 ([[NestJS-Microservices]]).
3. **lag**: group은 있는데 lag가 쌓이면 handler 예외와 재전달, offset 커밋 정책을 본다. NestJS의 `@EventPattern` handler에서 처리되지 않은 예외는 기본으로 retriable이라 offset이 커밋되지 않고 kafkajs가 같은 메시지를 다시 전달한다(`@MessagePattern`은 `KafkaRetriableException`일 때만). 계속 실패하는 메시지가 partition을 막지 않도록 재시도 상한과 격리 경로를 둔다 ([[MQ-Kafka-Retry-DLT|재시도와 DLT]]). lag가 0인데 효과가 없으면 handler 로직, 멱등 처리 조건, 대상 key 형식(예: cache key)을 본다.
4. **테스트**: 통합 테스트는 HTTP 성공 뒤 최종 상태를 제한 시간 안에서 polling하고, 시간 초과 시 consumer lag를 함께 출력한다 ([[First-Come-Coupon-Patterns-Failure-and-Verification|비동기 완료 대기 검증]]).

하이브리드 앱에서 `startAllMicroservices()`를 `listen()`보다 먼저 호출하면 `onModuleInit`, `onApplicationBootstrap` 완료 전에 소비가 시작된다. 모든 모듈이 초기화된 뒤에 받아야 하면 `listen()` 또는 `init()` 뒤에 호출한다 (NestJS 공식 문서).

확인 도구는 Kafka 배포판의 CLI가 기준이다 (Apache Kafka 4.3 문서).

```bash
# group 상태(STATE)와 멤버 수(#MEMBERS)
bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group <group> --state
# partition별 CURRENT-OFFSET, LOG-END-OFFSET, LAG, CONSUMER-ID
bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group <group>
# 메시지 내용 확인. 앱의 group id로 읽지 않는다
bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic <topic> --from-beginning
```

Kafka UI 계열 web 도구(예: provectus kafka-ui를 초기 핵심 기여자들이 이어 가는 kafbat UI)는 broker와 controller 상태, topic과 메시지, consumer group의 offset과 lag를 한 화면에 보여 준다. 이 도구들은 topic 생성과 설정 변경도 할 수 있으므로 운영 cluster에 붙일 때는 인증, RBAC와 cluster 단위 읽기 전용 설정(kafbat `readOnly`, 기본값 false)을 켠다. 도구 이름과 유지 주체가 바뀌어 왔으므로 도입 시 공식 저장소를 확인한다.

## 출처

- [KafkaJS 공식 문서, Consuming Messages](https://kafka.js.org/docs/2.1.0/consuming)
- [Apache Kafka 4.3 공식 문서, Basic Kafka Operations (Managing consumer groups)](https://kafka.apache.org/43/operations/basic-kafka-operations/)
- [Apache Kafka 4.3 공식 문서, Quick Start](https://kafka.apache.org/43/getting-started/quickstart/)
- [NestJS 공식 문서, Kafka (Naming conventions, Retriable exceptions)](https://docs.nestjs.com/microservices/kafka)
- [NestJS 공식 문서, Hybrid application](https://docs.nestjs.com/faq/hybrid-application)
- [Kafbat UI 저장소 — GitHub](https://github.com/kafbat/kafka-ui)
- [인프런, 김빌, Kafka 이론](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273696)
- [인프런, 김빌, Kafka Docker 로 띄우기](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273697)
- [인프런, 김빌, Kafka 로 비지니스 로직 리펙토링!](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273698)

## 관련 문서

- [[MQ-Kafka|Kafka 인덱스]]
- [[MQ-Kafka-Patterns|실전 패턴]]
- [[CDC-Debezium|CDC, Debezium]]
- [[SCD-Type2|SCD Type 2]]
- [[Consumer-Group|Consumer Group]]
- [[NestJS-Microservices|NestJS Microservices (하이브리드 앱, send와 emit)]]
- [[MQ-Kafka-Retry-DLT|재시도와 DLT]]
- [[Kafka-Partition-Sizing|파티션 개수 산정 (자동 토픽 생성)]]
