---
tags: [nestjs, microservices, client-proxy, transport, message-pattern]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Microservices", "ClientProxy", "Message Pattern"]
---

# NestJS Microservices — Transport 추상화

`@nestjs/microservices`는 HTTP 외 트랜스포트(TCP, Redis, RabbitMQ, Kafka, NATS, gRPC)로 서비스 간 통신을 추상화한다. 컨트롤러, 핸들러 구조는 동일하게 유지하면서 메시지 패턴(요청-응답)과 이벤트 패턴(발행-구독) 둘 다 지원.

## Transport 종류

| Transport | 모델 | 용도 |
|-----------|------|------|
| `TCP` | 점대점, 낮은 지연 | 사내 서비스 간 단순 호출 |
| `REDIS` | Pub/Sub | 가벼운 fan-out, 이벤트 통보 |
| `NATS` | Pub/Sub + Request/Reply | 빠른 메시지 라우팅, 가벼움 |
| `RabbitMQ` | 큐 기반 | 작업 큐, ACK, 재시도, 라우팅 키 |
| `Kafka` | 로그 기반 | 이벤트 소싱, 리플레이, 고처리량 |
| `gRPC` | RPC | 강타입 IDL, 다언어 호환 |
| `MQTT` | Pub/Sub | IoT, 경량 |

선택 기준: **요청-응답이 주면 TCP/gRPC**, **이벤트 발행이 주면 Redis/Kafka/RabbitMQ**, **다언어 강타입은 gRPC**.

### 전송별 시맨틱 노트

- **Redis** (ioredis 기반): Pub/Sub 채널이라 **fire-and-forget** — 구독자가 없으면 메시지가 제거되고 복구 불가, 최소 1회 처리 보장이 없다. 한 메시지를 다수 구독자가 수신 가능. `wildcards: true`면 내부적으로 psubscribe/pmessage를 써 패턴 채널 구독. 컨텍스트는 `RedisContext.getChannel()`.
- **MQTT**: 제약된 디바이스, 저대역폭/불안정 네트워크용 경량 Pub/Sub. 토픽 와일드카드는 `+`(단일 레벨), `#`(다중 레벨). **구독의 기본 QoS는 0** — 전역은 `subscribeOptions.qos`, 패턴별은 데코레이터 `extras`의 `qos`로 올린다. 컨텍스트는 `MqttContext.getTopic()`.
- **NATS**: 요청-응답은 내장 request-reply, 이벤트는 subject 기반 fan-out. **queue group**(`queue: 'cats_queue'`)이 내장 로드밸런싱 — 같은 그룹의 구독자 중 **하나만** 메시지를 받아 인스턴스 스케일아웃 시 중복 처리를 막는다. subject 와일드카드는 `*`(한 토큰), `>`(꼬리 전체), 헤더 전달 지원. 컨텍스트는 `NatsContext.getSubject()`.
- **RabbitMQ**: 유실 방지의 축은 **수동 ACK** — `noAck: false`로 켜고 핸들러에서 `RmqContext.getChannelRef()`와 `getMessage()`로 `channel.ack(originalMsg)`를 보낸다. ACK 없이 컨슈머가 죽으면(채널/연결 종료) RabbitMQ가 메시지를 **재큐잉**한다. `prefetchCount`로 미ACK 상태 선인출 개수 제한, `queueOptions.durable`로 큐 영속성. 라우팅 키 와일드카드는 `*`(정확히 한 단어), `#`(0개 이상 단어) — `wildcards: true`로 활성.
- **gRPC**: 다른 전송과 계약이 다르다 — `@MessagePattern` 대신 **`@GrpcMethod('서비스명', '메서드명')`**을 쓰고(인자 생략 시 핸들러명 UpperCamelCase, 클래스명으로 자동 매칭), 클라이언트도 ClientProxy가 아니라 **`ClientGrpc`에서 `getService<T>()`로 proto 서비스 인터페이스를 꺼내** 호출한다 (`package` + `protoPath` 옵션으로 .proto 로드). 스트리밍은 RxJS Subject/Observable 핸들러 또는 순수 call stream(Duplex) 두 방식, K8s 헬스체크는 gRPC Health Check 표준(grpc-health-check 패키지)으로. 프로토콜 자체는 [[gRPC]] 정본.
- **Kafka** (kafkajs 기반): 요청-응답은 Kafka에 없는 모델이라 **reply 토픽으로 구현** — 클라이언트가 `subscribeToResponseOf('토픽')`을 (비동기 생성이면 connect 전에) 호출해 파생 reply 토픽을 구독해야 send가 동작한다. 충돌 방지로 clientId/groupId에 `-client`/`-server`가 **자동 접미**된다. 수신 메시지의 key/value/headers Buffer는 문자열로, object 형태면 JSON으로 자동 파싱. 발신 시 `{ key, value }`로 **키를 실어야 co-partitioning(같은 키 → 같은 파티션 순서 보장)**이 성립한다. 오프셋은 기본 자동 커밋이고 `KafkaContext`의 consumer로 수동 커밋 가능. 핸들러가 예외를 던지면 kafkajs가 **재전달**한다 — 오프셋 미커밋 (이벤트 핸들러의 미처리 예외는 기본이 retriable, 명시적으로는 `KafkaRetriableException`).

## Microservice 부트스트랩

```ts
// 마이크로서비스 단독 모드
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.REDIS,
  options: { host: 'localhost', port: 6379 },
});
await app.listen();

// 하이브리드 (HTTP + Microservice 동시)
const app = await NestFactory.create(AppModule);
app.connectMicroservice({ transport: Transport.KAFKA, options: {...} });
await app.startAllMicroservices();
await app.listen(3000);
```

하이브리드는 같은 컨트롤러에서 HTTP 엔드포인트 + 메시지 핸들러 공존 가능. 도메인 코어는 한 곳에 두고 입구만 다중화. **함정: 전역 파이프/가드/인터셉터/필터가 마이크로서비스 쪽에는 기본 미적용** — 상속하려면 `connectMicroservice(options, { inheritAppConfig: true })`.

## 메시지 패턴 vs 이벤트 패턴

### `@MessagePattern` — 요청-응답

응답 필요. 클라이언트는 응답을 기다림(Observable). 동기적 문맥의 비동기 호출.

```ts
@Controller()
export class MathController {
  @MessagePattern({ cmd: 'calculate' })
  calculate(data: { a: number; b: number }): number {
    return data.a + data.b;
  }
}
```

### `@EventPattern` — 발행-구독

응답 없음. 발행자는 구독자 처리 결과를 모름. 다수 구독자가 같은 이벤트를 받을 수 있음.

```ts
@EventPattern('user.created')
async handleUserCreated(payload: UserCreatedEvent) {
  await this.email.sendWelcome(payload);
}
```

## ClientProxy로 호출

소비자는 `ClientProxy`를 주입받아 `send`(요청-응답) 또는 `emit`(이벤트) 호출.

```ts
@Controller()
export class GatewayController {
  constructor(
    @Inject('MATH_SERVICE') private mathClient: ClientProxy,
    @Inject('USER_SERVICE') private userClient: ClientProxy,
  ) {}

  @Get('calculate')
  calculate(@Query() query: CalcDto): Observable<number> {
    return this.mathClient.send({ cmd: 'calculate' }, query);   // 응답 기다림
  }

  @Post('notify')
  notify(@Body() data: NotificationDto): Observable<void> {
    return this.userClient.emit('user.notification', data);     // 응답 안 기다림
  }
}
```

`send` 결과가 **Observable** → 컨트롤러에서 그대로 반환하면 NestJS가 구독, 응답. `await firstValueFrom(...)`도 가능.

## 클라이언트 모듈 등록

```ts
@Module({
  imports: [
    ClientsModule.register([
      { name: 'MATH_SERVICE', transport: Transport.TCP, options: { port: 3001 } },
      { name: 'USER_SERVICE', transport: Transport.REDIS, options: { host: 'redis', port: 6379 } },
    ]),
  ],
})
```

`ClientsModule.registerAsync`로 ConfigService 의존 옵션도 가능.

## send vs emit — 운영 영향

| 축 | send (요청-응답) | emit (이벤트) |
|----|----------------|--------------|
| 응답 | 기다림 | 안 기다림 |
| 결합 | 수신자가 1개 | 수신자가 0~N개 |
| 실패 처리 | 호출자가 인지 | 호출자는 모름 (재시도, DLQ는 브로커 책임) |
| 적합 | 동기적 비즈니스 결정 | 통보, 로깅, 후처리 |
| 운영 위험 | 수신자 장애가 호출자에 전파 | 메시지 유실은 브로커 설정에 종속 |

**규칙**: 비즈니스 결정에 의존하면 `send`, 곁가지 후처리는 `emit`. emit으로 모든 걸 처리하면 일관성 깨짐, send만 쓰면 연쇄 장애 발생.

## 메시지 패턴 직렬화, 역직렬화

기본은 JSON. Kafka, gRPC는 별도 직렬화기(`Avro`, `Protobuf`)로 강타입, 압축. 클라이언트, 서버 양쪽 옵션을 같게 둬야 함.

## 커스텀 트랜스포터

내장 전송이 없는 브로커(예: Google Cloud Pub/Sub)는 직접 만든다:

- **서버**: `Server`를 상속하고 `CustomTransportStrategy`(listen/close) 구현 — `strategy: new MyServer()`로 등록. `messageHandlers`가 패턴을 키로 한 핸들러 Map이라, 수신 메시지를 패턴으로 lookup해 디스패치한다. 인터셉터와 함께 쓰면 핸들러가 RxJS 스트림으로 감싸지므로 **subscribe해야 실행**된다.
- **클라이언트**: `ClientProxy`를 상속해 connect/close/publish(요청-응답)/dispatchEvent(이벤트)를 구현하거나, 그냥 라이브러리 SDK를 직접 쓴다.

## 세부 계약

- 핸들러 인자는 `@Payload()`로 메시지 본문을, `@Ctx()`로 **전송별 컨텍스트**(NatsContext 등 — 토픽, 채널, 파티션 같은 전송 메타)를 추출한다.
- `@MessagePattern` 핸들러가 **Observable을 반환하면 스트림이 완료될 때까지의 값들이 모두 응답**으로 전송된다 (다중 응답).
- `send()`에는 rxjs `timeout` 오퍼레이터를 파이프해 응답 무한 대기를 끊는 것이 공식 권장 패턴.
- 운영 관측: `client.status`가 connected/disconnected 상태 변화 Observable이고, `client.on('error', ...)`로 내부 에러 이벤트를 듣고, `unwrap()`으로 하부 드라이버 인스턴스에 직접 접근한다 (서버 쪽도 동일 계열).
- 파이프, 가드, 필터는 HTTP와 동일하되 예외만 `RpcException`으로 — ValidationPipe는 `exceptionFactory: errors => new RpcException(errors)`로 교체해서 쓴다 (WS의 WsException 교체와 같은 패턴, 필터 상세는 [[NestJS-Exception-Filter-Basics]]).

## 흔한 실수

- **emit으로 보냈는데 응답 기대**: emit은 응답 X. send 써야 함.
- **send 호출하고 Observable 안 구독**: 호출 자체가 안 일어남. `subscribe()` 또는 컨트롤러에서 그대로 반환.
- **하이브리드 앱에서 startAllMicroservices 누락**: HTTP만 뜨고 메시지 핸들러는 죽어 있음.
- **Kafka 컨슈머 그룹 ID 미설정, 동일 그룹**: 메시지가 한 인스턴스에만 가거나 모든 인스턴스에 중복 → 운영 의도 어긋남.
- **MessagePattern 응답 시간이 긴데 클라이언트 timeout 짧음**: 호출자만 끊기고 처리는 계속 → 멱등성 깨짐.

## 면접 체크포인트

- HTTP 외 트랜스포트(TCP, Redis, Kafka, gRPC) 선택 기준 — 요청-응답 vs 이벤트, 처리량, 강타입 필요 여부
- `@MessagePattern` vs `@EventPattern` 차이
- `send` vs `emit` 운영 영향 — 결합도, 장애 전파, 실패 인지
- 하이브리드 앱(HTTP + Microservice)의 부트스트랩 차이
- ClientProxy `send`가 Observable 반환하는 이유 (재시도, 취소, 다수 응답)
- Kafka 컨슈머 그룹 ID와 인스턴스 메시지 분배

## 관련 문서

- [[NestJS|NestJS 개요]]
- [[NestJS-ExecutionContext|ExecutionContext (rpc 분기)]]
- [[MQ-Kafka|Kafka — 메시지 큐 기반 트랜스포트]]
- [[Realtime-Communication-Comparison|실시간 통신 비교]]

## 출처
- [NestJS — Microservices basics](https://docs.nestjs.com/microservices/basics)
- [NestJS — Redis transporter](https://docs.nestjs.com/microservices/redis)
- [NestJS — MQTT transporter](https://docs.nestjs.com/microservices/mqtt)
- [NestJS — NATS transporter](https://docs.nestjs.com/microservices/nats)
- [NestJS — RabbitMQ transporter](https://docs.nestjs.com/microservices/rabbitmq)
- [NestJS — Kafka transporter](https://docs.nestjs.com/microservices/kafka)
- [NestJS — gRPC transporter](https://docs.nestjs.com/microservices/grpc)
- [NestJS — Custom transporters](https://docs.nestjs.com/microservices/custom-transport)
- [NestJS — Microservices Pipes](https://docs.nestjs.com/microservices/pipes)
- [NestJS — Microservices Guards](https://docs.nestjs.com/microservices/guards)
- [NestJS — Microservices Interceptors](https://docs.nestjs.com/microservices/interceptors)
- [NestJS — Hybrid application (FAQ)](https://docs.nestjs.com/faq/hybrid-application)
