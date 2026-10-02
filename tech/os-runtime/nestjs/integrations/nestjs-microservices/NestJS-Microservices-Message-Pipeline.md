---
tags: [nestjs, microservices, client-proxy, transport, message-pattern]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS Microservices", "ClientProxy", "Message Pattern"]
---

# NestJS 메시지 처리와 ClientProxy

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

전송별 전달 보장, ACK, 스트리밍과 드라이버 차이는 [[NestJS-Microservices-Transport-Contracts]]에서 비교한다.

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
await app.init(); // 핸들러가 전체 앱 초기화에 의존하는 경우 먼저 완료
await app.startAllMicroservices();
await app.listen(3000);
```

하이브리드는 같은 컨트롤러에서 HTTP 엔드포인트 + 메시지 핸들러 공존 가능. 도메인 코어는 한 곳에 두고 입구만 다중화. **함정: 전역 파이프/가드/인터셉터/필터가 마이크로서비스 쪽에는 기본 미적용** — 상속하려면 `connectMicroservice(options, { inheritAppConfig: true })`.

## 메시지 패턴 vs 이벤트 패턴

### `@MessagePattern` — 요청-응답

응답이 필요한 비동기 호출이다. `@MessagePattern()`은 컨트롤러에 등록해야 하며 provider에 붙이면 Nest 런타임이 무시한다.

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

응답 없음. 발행자는 구독자 처리 결과를 모른다. 같은 패턴에 여러 이벤트 핸들러를 등록하면 Nest는 병렬로 호출한다. 브로커의 큐나 consumer group 설정에 따른 인스턴스 간 분배와 구분한다.

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

`send()`는 cold Observable이라 구독해야 전송된다. `emit()`은 hot Observable이라 구독하지 않아도 전달을 시도하지만 소비자의 처리 완료를 확인하는 응답은 아니다. `firstValueFrom(send(...))`은 첫 응답 뒤 구독을 끝내므로 다중 응답이 필요한 호출에서는 전체 스트림을 처리한다.

`ClientProxy`는 첫 호출 때 연결하는 lazy client다. 연결 실패를 앱 시작 실패로 드러내려면 `onApplicationBootstrap()`에서 `await client.connect()`한다. `createMicroservice()`의 전송 설정은 provider 생성 전 필요하지만, v12의 `AsyncMicroserviceOptions.useFactory`와 `inject`로 ConfigService를 주입받아 설정할 수도 있다.

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
| 실패 처리 | 호출자가 인지 | 호출자는 모름 (전송 실패와 소비 처리 실패를 구분하고 재시도/DLQ 설계) |
| 적합 | 동기적 비즈니스 결정 | 통보, 로깅, 후처리 |
| 운영 위험 | 수신자 장애가 호출자에 전파 | 메시지 유실은 브로커 설정에 종속 |

**선택 기준**: 결과가 필요한 비즈니스 결정에는 `send`, 비동기 후처리에는 `emit`을 검토한다. 선택만으로 일관성이나 연쇄 장애가 결정되지는 않으므로, 보장 수준과 timeout, retry, DLQ를 함께 설계한다.

## 메시지 컨텍스트와 처리 전 훅

- request-scoped provider는 HTTP의 `REQUEST` 대신 `@Inject(CONTEXT)`로 `RequestContext`를 받는다. `pattern`, `data`, 전송별 `context`가 있으며 하나의 메시지 처리 범위다.
- v12 `registerPreRequestHook((ctx, next) => Observable)`은 등록 순서대로 guard 이전에 실행된다. ALS 초기화는 Observable **구독 안에서** `als.run()`과 `next().subscribe()`를 감싸야 처리 전체로 전파된다. 훅은 `next()`를 호출하고 반환 Observable에 구독 해제를 전달해야 한다.
- 훅은 `init()`/`listen()` 전에 등록한다. 하이브리드 `connectMicroservice()`는 기본으로 즉시 초기화하므로 두 번째 인자에 `deferInitialization: true`를 주고 훅을 등록한다. 훅은 전역이며 개별 패턴이나 WebSocket gateway에는 적용되지 않는다.
- 하이브리드 앱의 `inheritAppConfig: true`는 전역 enhancer 설정을 공유한다. HTTP의 전역 설정을 **connectMicroservice 이전**에 등록하고, `HttpException` 기반 파이프를 RPC에서 그대로 사용하지 않는다. `@Payload({ schema })` + `StandardSchemaValidationPipe`도 `exceptionFactory`를 `RpcException`으로 바꾼다.
- guard의 `false`는 RPC의 `Forbidden resource` 오류가 된다. 필터의 `catch()`는 Observable을 반환하며, 이벤트 필터가 오류를 다시 던져도 생산자에게 도달할 응답 스트림이 없다. 이벤트 오류의 기록, 재시도와 ACK는 소비 측에서 정한다.

## 메시지 패턴 직렬화, 역직렬화

직렬화는 전송별로 다르다. Nest Kafka 전송은 기본적으로 객체를 JSON으로 직렬화하며, gRPC 계약은 `.proto`의 Protobuf를 사용한다. Avro 같은 추가 형식은 별도 serializer 또는 클라이언트 통합으로 양쪽 계약을 맞춘다.

## 커스텀 트랜스포터

내장 전송이 없는 브로커(예: Google Cloud Pub/Sub)는 직접 만든다:

- **서버**: `Server`를 상속하고 `CustomTransportStrategy`(listen/close) 구현 — `strategy: new MyServer()`로 등록. `messageHandlers`가 패턴을 키로 한 핸들러 Map이라, 수신 메시지를 패턴으로 lookup해 디스패치한다. 인터셉터와 함께 쓰면 핸들러가 RxJS 스트림으로 감싸지므로 **subscribe해야 실행**된다.
- **클라이언트**: `ClientProxy`를 상속해 connect/close/publish(요청-응답)/dispatchEvent(이벤트)를 구현하거나, 그냥 라이브러리 SDK를 직접 쓴다.

커스텀 `publish()`는 종료 시 `isDisposed: true`를 보내고 구독 해제용 teardown을 반환한다. 호출 timeout은 구독을 끝내도 원격 부수 효과를 되돌리지 않는다. `propagatesEventHandlerErrors: true`는 Kafka처럼 드라이버가 이벤트 실패를 보고할 때 Nest의 중복 로그를 막는 옵션이며 자동 재시도 설정이 아니다.

## 세부 계약

- 핸들러 인자는 `@Payload()`로 메시지 본문을, `@Ctx()`로 **전송별 컨텍스트**(NatsContext 등 — 토픽, 채널, 파티션 같은 전송 메타)를 추출한다.
- `@MessagePattern` 핸들러가 **Observable을 반환하면 스트림이 완료될 때까지의 값들이 모두 응답**으로 전송된다 (다중 응답).
- `send()`에는 rxjs `timeout` 오퍼레이터를 파이프해 응답 무한 대기를 끊는 것이 공식 권장 패턴.
- 운영 관측: `client.status`가 connected/disconnected 상태 변화 Observable이고, `client.on('error', ...)`로 내부 에러 이벤트를 듣고, `unwrap()`으로 하부 드라이버 인스턴스에 직접 접근한다 (서버 쪽도 동일 계열). 상태 종류와 이벤트 콜백 인자는 전송마다 달라 TCP 타입을 모든 전송에 재사용하지 않는다.
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
- [NestJS — Custom transporters](https://docs.nestjs.com/microservices/custom-transport)
- [NestJS — Pre-request hooks](https://docs.nestjs.com/microservices/pre-request-hooks)
- [NestJS — Microservices exception filters](https://docs.nestjs.com/microservices/exception-filters)
- [NestJS — Microservices pipes](https://docs.nestjs.com/microservices/pipes)
- [NestJS — Microservices guards](https://docs.nestjs.com/microservices/guards)
- [NestJS — Microservices interceptors](https://docs.nestjs.com/microservices/interceptors)
- [NestJS — Hybrid application](https://docs.nestjs.com/faq/hybrid-application)
