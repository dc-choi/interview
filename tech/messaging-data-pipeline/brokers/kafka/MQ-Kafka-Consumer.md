---
tags: [messaging, kafka, nestjs, consumer]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Consumer", "NestJS Kafka", "eachMessage vs eachBatch"]
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
    eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
        const holder = new BulkDataHolder();
        for (const message of batch.messages) {
            try {
                const parsed = JSON.parse(message.value?.toString() ?? '');
                holder.add(parsed);
            } catch (err) {
                // 단일 메시지 에러는 스킵하여 메시지 유실 방지
            }
        }
        await holder.flush();  // 배치 단위 벌크 처리
    },
});
```

### 선택 기준
| 상황 | 권장 |
|---|---|
| 메시지별 독립 처리 (알림, 이벤트 라우팅) | `eachMessage` |
| DB 벌크 INSERT, 집계, 대용량 파이프라인 | `eachBatch` |
| 전역 버퍼에 메시지 누적해서 주기적 flush | `eachBatch` + 지역 변수 홀더 |

**주의:** `eachBatch`에서 전역 변수에 누적하면 메모리 누수 발생. **배치 내부 지역 스코프**로 홀더를 두고 끝나면 즉시 GC되도록 해야 한다.

## 관련 문서

- [[MQ-Kafka|Kafka 인덱스]]
- [[MQ-Kafka-Patterns|실전 패턴]]
- [[CDC-Debezium|CDC, Debezium]]
- [[SCD-Type2|SCD Type 2]]
- [[Consumer-Group|Consumer Group]]
