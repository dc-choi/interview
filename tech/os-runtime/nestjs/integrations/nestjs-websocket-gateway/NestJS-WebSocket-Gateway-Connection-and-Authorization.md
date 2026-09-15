---
tags: [nestjs, websocket, gateway, socket-io, realtime]
status: done
verified_at: 2026-08-26
category: "OS & Runtime - NestJS"
aliases: ["NestJS WebSocket Gateway", "WebSocketGateway", "SubscribeMessage"]
---

# NestJS WebSocket Gateway: 연결과 인증

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

## 출처
- [NestJS — Gateways](https://docs.nestjs.com/websockets/gateways)
- [NestJS — WebSocket Pipes](https://docs.nestjs.com/websockets/pipes), [Guards](https://docs.nestjs.com/websockets/guards), [Interceptors](https://docs.nestjs.com/websockets/interceptors)
