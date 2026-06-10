---
tags: [nestjs, websocket, gateway, socket-io, realtime]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS WebSocket Gateway", "WebSocketGateway", "SubscribeMessage"]
---

# NestJS WebSocket Gateway

`@nestjs/websockets`는 Socket.IO, ws를 NestJS DI/모듈에 통합. **Gateway**는 컨트롤러의 WebSocket 버전 — 같은 클래스에서 연결, 메시지, 종료 이벤트를 다룬다. Guard, Pipe, Interceptor 모두 호환되지만 컨텍스트 추출은 다름.

## Gateway 구조

```ts
@WebSocketGateway(3001, {
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger(ChatGateway.name);

  afterInit(server: Server) {
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
| `@WebSocketServer()` | Socket.IO Server 인스턴스 주입 |
| `@SubscribeMessage('event')` | 메시지 핸들러 |
| `@ConnectedSocket()` | 클라이언트 Socket |
| `@MessageBody()` | 메시지 페이로드 |

## 라이프사이클 훅

| 훅 | 시점 |
|----|------|
| `OnGatewayInit.afterInit` | 서버 초기화 직후 (1회) |
| `OnGatewayConnection.handleConnection` | 클라이언트 연결마다 |
| `OnGatewayDisconnect.handleDisconnect` | 클라이언트 종료마다 |

연결 시 인증, 룸 join, 종료 시 정리 작업 표준 패턴.

## 인증 — Connection 시점에 검증

WebSocket은 **연결 시점에 한 번 인증**하고 그 이후 메시지에는 컨텍스트로 사용자 정보를 들고 가는 게 일반적.

```ts
handleConnection(client: Socket) {
  const token = client.handshake.headers.authorization;
  try {
    const payload = this.jwtService.verify(token);
    client.data.user = payload;
    client.join(`user_${payload.sub}`);
  } catch {
    client.disconnect();
  }
}
```

매 메시지마다 JWT 재검증하면 비용 높고, 만료된 토큰 처리는 별도 정책(`setInterval`로 주기 검사 또는 토큰 만료 이벤트).

## Room 브로드캐스트

Socket.IO의 핵심 추상화 — 클라이언트를 그룹(`room`)으로 묶고 그룹 단위로 송신.

```ts
@SubscribeMessage('message')
@UseGuards(WsJwtGuard)
async handleMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: ChatMessageDto,
) {
  const message = await this.chatService.create(data, client.data.user.id);
  this.server.to(data.roomId).emit('newMessage', message);
  return { status: 'sent', messageId: message.id };
}
```

`server.to(room).emit(event, payload)` — 룸의 모든 클라이언트에 푸시. 송신자 본인 제외하려면 `client.broadcast.to(room).emit(...)`.

## Guard, Pipe, Interceptor 호환

HTTP용 Guard는 ExecutionContext 추출이 달라 그대로 안 씀. **WS 전용 Guard**를 따로 만들거나, 공통 Guard에서 `getType()` 분기.

```ts
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'ws') return true;
    const client = context.switchToWs().getClient<Socket>();
    return !!client.data.user;   // handleConnection에서 주입한 값
  }
}
```

`@MessageBody`에 `ValidationPipe` 적용도 됨 — DTO 검증.

## Adapter — 다중 인스턴스 확장

기본 인메모리 어댑터는 단일 인스턴스용. **다중 인스턴스에서 룸 메시지를 공유**하려면 Redis Adapter 필요.

```ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

class RedisIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any) {
    const server = super.createIOServer(port, options);
    const pubClient = createClient({ url: 'redis://...' });
    const subClient = pubClient.duplicate();
    server.adapter(createAdapter(pubClient, subClient));
    return server;
  }
}

// main.ts
app.useWebSocketAdapter(new RedisIoAdapter(app));
```

## 메시지 응답 — 두 가지 방식

1. **return 값** → ACK 콜백으로 자동 전달. 메시지 패턴이 요청-응답일 때.
2. **server.emit / client.emit** → 별도 이벤트로 푸시. 비동기 통보, 브로드캐스트.

## 흔한 실수

- **연결마다 JWT 재검증 안 함**: 만료된 토큰으로 무한 사용 가능. 주기 검사 또는 만료 이벤트로 disconnect.
- **handleConnection에서 비동기 검증 후 client.data 의존 → 다른 메시지가 먼저 도착**: 검증 끝나기 전 메시지 처리. `client.disconnect()` 또는 큐로 메시지 보류 패턴.
- **다중 인스턴스에서 인메모리 Adapter**: 룸 메시지가 같은 인스턴스 클라이언트에만 도달. Redis Adapter 필수.
- **HTTP Guard를 그대로 적용**: `switchToHttp()` 호출이 undefined → 에러. WS 전용 Guard 또는 분기.
- **CORS 설정 누락**: 브라우저에서 연결 거부. `@WebSocketGateway`의 `cors` 옵션.
- **Disconnect 핸들러에서 정리 누락**: 룸, DB 세션, 타이머가 살아남아 누수.

## 면접 체크포인트

- Gateway가 컨트롤러와 다른 점 — 라이프사이클 훅(connect/disconnect), `@SubscribeMessage`
- WebSocket 인증을 connect 시점에 한 번 하는 이유 — 매 메시지 검증 비용
- Room 추상화의 의미 — 그룹 단위 송신
- 다중 인스턴스 확장 — Redis Adapter가 해결하는 문제
- HTTP Guard와 WS Guard의 차이 — ExecutionContext 추출
- ACK 응답(return) vs 별도 이벤트 emit
- WebSocket vs SSE vs Long Polling 선택 기준

## 관련 문서

- [[NestJS|NestJS 개요]]
- [[NestJS-ExecutionContext|ExecutionContext (ws 분기)]]
- [[WebSocket|WebSocket 프로토콜]]
- [[Realtime-Communication-Comparison|실시간 통신 비교]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
