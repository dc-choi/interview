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

하이브리드는 같은 컨트롤러에서 HTTP 엔드포인트 + 메시지 핸들러 공존 가능. 도메인 코어는 한 곳에 두고 입구만 다중화.

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
