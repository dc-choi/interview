---
tags: [nestjs, websocket, gateway, socket-io, realtime]
status: done
verified_at: 2026-08-26
category: "OS & Runtime - NestJS"
aliases: ["NestJS WebSocket Gateway", "WebSocketGateway", "SubscribeMessage"]
---
# NestJS WebSocket Gateway

`@nestjs/websockets`는 Socket.IO, ws를 NestJS DI/모듈에 통합. **Gateway**는 컨트롤러의 WebSocket 버전 — 같은 클래스에서 연결, 메시지, 종료 이벤트를 다룬다. Guard, Pipe, Interceptor 모두 호환되지만 컨텍스트 추출은 다름. 게이트웨이 자체는 플랫폼 무관이고 어댑터가 라이브러리를 연결한다 — 내장 지지 플랫폼은 socket.io와 ws 둘, 커스텀 어댑터도 가능. **기본으로 HTTP 서버와 같은 포트를 리슨**하고, `@WebSocketGateway(80)`처럼 인자를 줄 때만 분리된다.

## Gateway 구조

```ts
@WebSocketGateway(3001, {
  cors: { origin: 'https://app.example.com' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() namespace: Namespace;
  private logger = new Logger(ChatGateway.name);

  afterInit(namespace: Namespace) {
    this.logger.log('Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: ChatMessageDto) {
    return { status: 'sent' };
  }
}
```
| 데코레이터 | 용도 |
|-----------|------|
| `@WebSocketGateway(port, options)` | 클래스 마킹 + 포트, 네임스페이스, CORS |
| `@WebSocketServer()` | 플랫폼별 서버 인스턴스 주입, Socket.IO namespace 옵션 사용 시 `Namespace` |
| `@SubscribeMessage('event')` | 메시지 핸들러 |
| `@ConnectedSocket()` | 클라이언트 Socket |
| `@MessageBody()` | 메시지 페이로드 |

## 라이프사이클 훅

`afterInit`은 서버 초기화 직후 한 번, `handleConnection`과 `handleDisconnect`는 클라이언트 연결과 종료마다 실행된다. 연결 시 인증과 room join, 종료 시 자원 정리를 둔다.
## 연결 인증과 메시지 권한 검사

연결 시 token을 검증하고 server-side socket context에 사용자 정보를 저장할 수 있다. 연결이 오래 유지되므로 token 만료와 재인증 정책을 별도로 두고, 각 메시지에서는 해당 사용자가 대상 room이나 resource를 사용할 권한이 있는지 검사한다.

```ts
handleConnection(client: Socket) {
  const [scheme, token] = client.handshake.headers.authorization?.split(' ') ?? [];
  try {
    if (scheme !== 'Bearer' || !token) throw new Error('missing bearer token');
    const payload = this.jwtService.verify(token);
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') throw new Error('required claims missing');
    client.data.user = payload;
    client.data.tokenExpiresAt = payload.exp * 1000;
    client.join(`user_${payload.sub}`);
  } catch {
    client.disconnect();
  }
}
```

매 메시지마다 signature를 다시 검증하지 않더라도 Guard에서 `tokenExpiresAt`과 사용자 context를 확인하고, 만료 시 연결을 끊거나 명시적 재인증 protocol을 수행한다. token 인증은 room membership 같은 resource 권한 검사를 대신하지 않는다.
## Room 브로드캐스트

Socket.IO의 핵심 추상화 — 클라이언트를 그룹(`room`)으로 묶고 그룹 단위로 송신.

```ts
@SubscribeMessage('message')
@UseGuards(WsJwtGuard)
async handleMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: ChatMessageDto,
) {
  await this.chatService.assertCanPost(client.data.user.sub, data.roomId);
  const message = await this.chatService.create(data, client.data.user.sub);
  this.namespace.to(data.roomId).emit('newMessage', message);
  return { status: 'sent', messageId: message.id };
}
```

`namespace.to(room).emit(event, payload)` — 룸의 모든 클라이언트에 푸시. 송신자 본인 제외하려면 `client.broadcast.to(room).emit(...)`.
## Guard, Pipe, Interceptor 호환

HTTP용 Guard는 ExecutionContext 추출이 달라 그대로 안 씀. **WS 전용 Guard**를 따로 만들거나, 공통 Guard에서 `getType()` 분기.

```ts
@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'ws') return true;
    const client = context.switchToWs().getClient<Socket>();
    const valid = !!client.data.user && Date.now() < client.data.tokenExpiresAt;
    if (!valid) client.disconnect(true);
    return valid;
  }
}
```

`@MessageBody`에 `ValidationPipe` 적용도 됨 — DTO 검증. 단 WS에서 파이프는 **data 파라미터에만 적용**되고(client 인스턴스 검증은 무의미), ValidationPipe는 기본으로 HTTP 예외를 던지므로 `new ValidationPipe({ exceptionFactory: errors => new WsException(errors) })`로 예외 타입을 WS용으로 바꿔야 한다.

Guard는 inbound handler가 실행될 때만 검사한다. 서버 push만 받는 연결은 token 만료 타이머나 재인증 정책으로 만료 시 room에서 제거하고 연결을 끊어야 한다.
## Adapter — 다중 인스턴스 확장

기본 인메모리 어댑터는 단일 인스턴스용. **다중 인스턴스에서 룸 메시지를 공유**하려면 Redis Adapter 같은 shared adapter를 둔다. Socket.IO polling을 유지하면 WebSocket 전용 전송 또는 로드밸런서의 cookie 기반 sticky routing도 함께 구성한다.

```ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Logger } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor!: ReturnType<typeof createAdapter>;
  private pubClient?: RedisClientType;
  private subClient?: RedisClientType;
  async connectToRedis() {
    const pubClient = createClient({ url: 'redis://...' });
    const subClient = pubClient.duplicate();
    this.pubClient = pubClient;
    this.subClient = subClient;
    [pubClient, subClient].forEach(client =>
      client.on('error', error => this.logger.error(error)),
    );
    try {
      await pubClient.connect();
      await subClient.connect();
      this.adapterConstructor = createAdapter(pubClient, subClient);
    } catch (error) {
      await this.dispose();
      throw error;
    }
  }
  createIOServer(port: number, options?: any) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
  async dispose() {
    try {
      await super.dispose();
    } finally {
      await Promise.allSettled(
        [this.pubClient, this.subClient]
          .filter((client): client is RedisClientType => !!client?.isOpen)
          .map(client => client.close()),
      );
      this.pubClient = undefined;
      this.subClient = undefined;
    }
  }
}
const redisIoAdapter = new RedisIoAdapter(app);
await redisIoAdapter.connectToRedis();
app.useWebSocketAdapter(redisIoAdapter);
```

Nest는 애플리케이션 종료 시 custom adapter의 `dispose()`를 호출한다. node-redis v5에서는 정상 종료에 `close()`, 즉시 폐기에 `destroy()`를 쓰며 연결 전에 `error` listener를 등록한다. 순차 연결은 두 번째 연결 실패 중 다른 연결 작업이 남는 경합도 피한다.
### ws 어댑터 — socket.io 대안

`WsAdapter`(@nestjs/platform-ws)를 `app.useWebSocketAdapter(new WsAdapter(app))`로 걸면 socket.io 대신 순수 ws 라이브러리를 쓴다 — **네이티브 브라우저 WebSocket과 호환되고 프로토콜이 단순한 대신 room 같은 내장 기능이 크게 적다.** 커스텀 어댑터는 `WebSocketAdapter` 인터페이스(create, bindClientConnect, bindMessageHandlers 등) 구현으로 어떤 WS 라이브러리든 연결 가능.

## 메시지 응답 — 두 가지 방식

1. **Socket.IO handler의 return 값** → 클라이언트가 ACK 콜백을 전달한 경우에만 응답. 메시지 패턴이 요청-응답일 때.
2. **server.emit / client.emit** → 별도 이벤트로 푸시. 비동기 통보, 브로드캐스트.

네이티브 WebSocket과 `WsAdapter`에는 ACK가 없으므로 `WsResponse<T>`(`{ event, data }`)나 별도 emit 이벤트로 응답한다. data가 ClassSerializerInterceptor 직렬화에 의존하면 **WsResponse 구현 클래스 인스턴스**를 반환해야 한다 (평문 객체는 직렬화가 무시). `Observable<WsResponse>`를 반환하면 스트림이 완료될 때까지 값이 나올 때마다 응답이 전송된다.

## 단방향 푸시면 SSE

양방향이 필요 없으면 컨트롤러의 `@Sse()`와 `Observable<MessageEvent>`로 충분하다. 클라이언트는 EventSource로 수신하고, 연결 종료 시 Nest가 구독을 해제한다. 선택 기준과 구현은 [[Realtime-Communication-Comparison]]에서 다룬다.

## 흔한 실수

- **연결마다 JWT 재검증 안 함**: 만료된 토큰으로 무한 사용 가능. 주기 검사 또는 만료 이벤트로 disconnect.
- **handleConnection에서 비동기 검증 후 client.data 의존 → 다른 메시지가 먼저 도착**: 검증 끝나기 전 메시지 처리. `client.disconnect()` 또는 큐로 메시지 보류 패턴.
- **다중 인스턴스에서 인메모리 Adapter**: 룸 메시지가 같은 인스턴스 클라이언트에만 도달. Redis Adapter 같은 shared adapter 필요.
- **HTTP Guard를 그대로 적용**: `switchToHttp()` 호출이 undefined → 에러. WS 전용 Guard 또는 분기.
- **CORS 설정 누락**: 브라우저에서 연결 거부. `@WebSocketGateway`의 `cors` 옵션.
- **Disconnect 핸들러에서 정리 누락**: 룸, DB 세션, 타이머가 살아남아 누수.

## 관련 문서

- [[NestJS|NestJS 개요]], [[NestJS-ExecutionContext|ExecutionContext (ws 분기)]], [[WebSocket|WebSocket 프로토콜]], [[Realtime-Communication-Comparison|실시간 통신 비교]], [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]

## 출처
- [NestJS — Gateways](https://docs.nestjs.com/websockets/gateways)
- [NestJS — WebSocket Pipes](https://docs.nestjs.com/websockets/pipes), [Guards](https://docs.nestjs.com/websockets/guards), [Interceptors](https://docs.nestjs.com/websockets/interceptors)
- [NestJS — WebSocket Adapters](https://docs.nestjs.com/websockets/adapter)
- [NestJS — Server-Sent Events](https://docs.nestjs.com/techniques/server-sent-events)
