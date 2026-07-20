---
tags: [nestjs, bullmq, queue, redis, background-job]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Queues", "@nestjs/bullmq", "BullMQ 통합"]
---

# NestJS Queues — @nestjs/bullmq

Redis 기반 BullMQ 잡 큐 통합. `BullModule.forRoot({ connection })`이 전역 Redis 설정을 잡고, `BullModule.registerQueue({ name: 'audio' })`로 큐를 등록한다. **큐 이름이 주입 토큰이자 컨슈머 연결 키**이고, 같은 Redis에 같은 자격으로 연결된 모듈과 프로세스끼리 큐를 공유한다. 부모-자식 의존 잡 플로우용 `registerFlowProducer()`도 지원.

## Producer

```ts
constructor(@InjectQueue('audio') private audioQueue: Queue) {}

await this.audioQueue.add('transcode', { foo: 'bar' }, { delay: 3000 });
```

잡은 Redis에 저장되므로 **직렬화 가능한 객체**여야 하고, 잡 이름('transcode')으로 컨슈머에서 분기한다.

### 잡 옵션

| 옵션 | 의미 |
|------|------|
| `priority` | 1(최고)~MAX_INT(최저). 사용 시 약간의 성능 비용 |
| `delay` | ms 지연 — 정확한 지연은 서버/클라이언트 시계 동기화 전제 |
| `attempts` + `backoff` | 실패 시 총 시도 횟수와 재시도 백오프 |
| `repeat` | cron 스펙 반복 |
| `lifo` | 큐 오른쪽(뒤)에 추가 — 스택처럼 |
| `jobId` | 기본 자동 유니크 정수를 오버라이드. **유일성은 사용자 책임 — 중복 id 잡은 추가되지 않음** |
| `removeOnComplete` / `removeOnFail` | true 또는 보관 개수. **기본은 완료/실패 셋에 계속 보관** — 정리 설정 안 하면 Redis에 누적 |

## Consumer

```ts
@Processor('audio')
export class AudioConsumer extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'transcode': /* ... */ await job.updateProgress(50); return result;
    }
  }
}
```

- 컨슈머는 **providers로 등록**해야 패키지가 인식한다.
- **잡 이름별 핸들러 분리는 BullMQ에서 미지원** — 레거시 Bull의 `@Process('transcode')` 방식은 혼란을 이유로 제거됐고, 단일 `process()` 안에서 `job.name`으로 switch 분기한다.
- process 반환값은 잡 객체에 저장되어 completed 이벤트 리스너에서 접근 가능.

## 이벤트 리스너

- **워커 레벨**: 컨슈머 클래스 안에서 `@OnWorkerEvent('active')` 등.
- **큐 레벨**: `@QueueEventsListener('audio')` 클래스가 `QueueEventsHost`를 상속하고 `@OnQueueEvent('active')` — 역시 providers 등록 필요.

## 큐 관리와 분리 프로세스

- `queue.pause()` / `resume()` — pause는 **새 잡 처리만** 멈추고, 진행 중인 잡은 끝까지 계속된다.
- **Separate processes**: processor를 파일 경로로 등록하면 forked 프로세스에서 실행 — 크래시가 워커에 전파되지 않고(샌드박스), 블로킹 코드를 써도 잡이 stall되지 않으며, 멀티코어 활용과 Redis 연결 수 감소 이점.

## 관련 문서

- [[Messaging-Broker-Comparison|브로커 비교 (BullMQ vs Kafka vs RabbitMQ 선택 기준)]]
- [[NestJS-Task-Scheduling|Task Scheduling (시간 트리거 — 큐는 작업 트리거)]]
- [[NestJS-Microservices|Microservices (Transport 추상화와의 구분)]]

## 출처
- [NestJS — Queues](https://docs.nestjs.com/techniques/queues)
