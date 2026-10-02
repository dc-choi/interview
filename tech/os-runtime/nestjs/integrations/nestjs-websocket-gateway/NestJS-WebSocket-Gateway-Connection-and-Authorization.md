---
tags: [nestjs, websocket, gateway, socket-io, realtime]
status: done
verified_at: 2026-09-30
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

NestJS v12는 request-scoped Gateway를 지원한다. 이때 DI subtree는 **연결 하나의 수명**을 따르며 메시지마다 재생성되지 않는다. `REQUEST` 주입값은 client socket이고 disconnect 때 정리된다. 싱글턴 Gateway에 요청별 사용자 상태를 필드로 저장하는 것과 혼동하지 않는다.

`afterInit`은 서버 초기화 직후 한 번, `handleConnection`과 `handleDisconnect`는 클라이언트 연결과 종료마다 실행된다. 연결 시 인증과 room join, 종료 시 자원 정리를 둔다.

## Socket.IO 프로토콜 경계

Socket.IO는 WebSocket 구현이 아니다. 전송에 WebSocket을 쓰더라도 packet마다 자체 metadata를 붙이므로, 순수 WebSocket 클라이언트는 Socket.IO 서버에 연결할 수 없고 Socket.IO 클라이언트도 순수 WebSocket 서버에 붙지 못한다. 어댑터를 `WsAdapter`로 바꾸면 클라이언트도 네이티브 WebSocket으로 바꿔야 한다([[NestJS-WebSocket-Gateway-Scaling-and-Operations#ws 어댑터 — socket.io 대안|ws 어댑터]]).

- **전송 업그레이드**: 기본 연결은 HTTP long-polling으로 먼저 맺고 가능하면 WebSocket으로 업그레이드한다. 회사 proxy, 개인 방화벽, 백신 때문에 WebSocket 연결이 항상 되지는 않는다는 경험에서 나온 설계다. 브라우저 개발자 도구의 network 탭에서 polling 요청 뒤 WebSocket 전환을 확인할 수 있다.
- **업그레이드의 운영 비용**: long-polling은 한 세션 동안 HTTP 요청을 여러 번 보내므로 다중 인스턴스에서는 같은 세션의 요청을 같은 인스턴스로 보내는 sticky routing이 필요하다. 클라이언트에서 `transports: ['websocket']`로 polling을 끄면 sticky 요구는 사라지지만, WebSocket이 막힌 네트워크의 클라이언트는 연결 자체에 실패한다([[NestJS-WebSocket-Gateway-Scaling-and-Operations#Adapter — 다중 인스턴스 확장|다중 인스턴스 확장]]).
- **namespace**: 하나의 연결 위에서 논리 채널을 나누는 multiplexing 단위다. 채팅과 주문 알림처럼 관심사가 다른 이벤트를 나누고, Gateway 하나가 한 namespace의 이벤트를 모은다. 서버는 `@WebSocketGateway({ namespace: 'chattings' })`, 클라이언트는 `io('/chattings')`로 맞춘다. 서버에 없는 namespace로 접속하면 서버가 `Invalid namespace` 연결 오류를 돌려준다.
- **room**: namespace 안의 하위 그룹이다. 이름이 같아도 namespace가 다르면 다른 room이다. room은 서버 전용 개념이라 클라이언트는 자기가 속한 room 목록을 알 수 없고, 서버가 `socket.join()`으로 넣는다. 연결이 끊기면 모든 room에서 자동으로 빠진다.
- **`socket.id`는 임시 식별자**: 연결마다 무작위로 부여되고 재연결이나 새로고침 때 다시 만들어진다. 브라우저 탭마다 다르고, 서버는 이 ID 앞으로 message queue를 쌓아 두지 않아 연결이 끊긴 동안 보낸 메시지는 사라진다. 사용자나 세션 식별에는 쿠키나 `auth` payload로 보내는 별도 세션 ID를 쓴다. `socket.id`와 사용자 이름의 매핑을 DB에 둔다면 `handleDisconnect`에서 지우고, 프로세스가 비정상 종료되면 disconnect 처리가 돌지 않으므로 기동 시 정리나 TTL을 둔다.

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

| 서버 쪽 호출 | 받는 대상 |
|---|---|
| `client.emit(ev, data)` | 그 클라이언트 하나 |
| handler의 return 값 | 클라이언트가 ack callback을 넘긴 경우 그 송신자에게만([[NestJS-WebSocket-Gateway-Scaling-and-Operations#메시지 응답 — 두 가지 방식|메시지 응답]]) |
| `client.broadcast.emit(ev, data)` | 같은 namespace에서 송신자를 뺀 모든 클라이언트 |
| `namespace.emit(ev, data)` | 그 namespace의 송신자를 포함한 모든 클라이언트 |
| `namespace.to(room).emit`, `client.to(room).emit` | room 전체, 또는 송신자를 뺀 room |

`connect`, `connect_error`, `disconnect`, `disconnecting`, `newListener`, `removeListener`는 예약된 이벤트 이름이라 애플리케이션 이벤트로 쓰지 않는다.

### 이벤트를 먼저 설계한다

이벤트 이름, 방향, payload와 서버 처리를 먼저 정하면 구현이 따라온다. 익명 채팅을 예로 들면 다음과 같다.

| 이벤트 | 방향과 payload | 서버 처리 |
|---|---|---|
| `new_user` | 클라이언트에서 서버, username | 중복이면 접미사를 붙여 저장, 다른 사용자에게 `user_connected` 브로드캐스트, 확정 username을 ack로 반환 |
| `submit_chat` | 클라이언트에서 서버, 메시지 | 매핑으로 사용자를 찾아 로그 저장, 다른 사용자에게 `new_chat`(chat, username) 브로드캐스트 |
| 연결 종료 | 자동 | 매핑 조회, `disconnect_user` 브로드캐스트, 매핑 삭제 |

- 브로드캐스트가 송신자를 빼므로 송신자 화면은 클라이언트가 제출 즉시 직접 그린다. 이 낙관적 렌더링은 단순하지만 저장 실패와 서버 순서를 반영하지 못한다. 서버가 저장 뒤 송신자에게도 보내거나 ack로 서버 ID와 순번을 돌려주는 방식이 [[Realtime-Chat-Architecture]]의 `ACK(messageId, roomSequence)` 설계다.
- 채팅 로그에 매핑 문서 참조와 함께 당시 username을 복사해 두면 매핑이 지워진 뒤에도 기록을 읽을 수 있다([[MongoDB-Schema-Design#Extended Reference (하이브리드)|Extended Reference]]).
- username 중복을 확인한 뒤 저장하는 흐름은 동시 입장에서 중복이 생길 수 있다. 유일해야 하면 unique index로 강제한다([[NestJS-MongoDB#unique는 validator가 아니다|unique와 경쟁 조건]]).

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

`@MessageBody`에 `ValidationPipe` 적용도 됨 — DTO 검증. v12에서 method, Gateway, global pipe는 handler의 모든 인자에 적용되므로, payload만 검증하려면 `@MessageBody(pipe)`에 한정한다.  ValidationPipe는 기본으로 HTTP 예외를 던지므로 `new ValidationPipe({ exceptionFactory: errors => new WsException(errors) })`로 예외 타입을 WS용으로 바꿔야 한다.

v12에서는 `useGlobalGuards/Pipes/Interceptors`와 `APP_GUARD/PIPE/INTERCEPTOR`도 Gateway에 적용된다. 공통 구현은 WS context에 맞게 분기해야 한다. 반면 global exception filter는 Gateway에 적용되지 않아 method 또는 Gateway에 바인딩한다. Guard가 false를 반환하면 `WsException`의 Forbidden resource 응답으로 바뀐다.

`WsException`의 기본 cause에는 메시지 pattern과 data가 포함될 수 있다. token, 개인정보를 error payload로 반송하지 않으려면 `BaseWsExceptionFilter({ includeCause: false })` 또는 안전한 `causeFactory`로 제한한다.

Guard는 inbound handler가 실행될 때만 검사한다. 서버 push만 받는 연결은 token 만료 타이머나 재인증 정책으로 만료 시 room에서 제거하고 연결을 끊어야 한다.

## 출처
- [NestJS — WebSocket Exception filters](https://docs.nestjs.com/websockets/exception-filters)
- [NestJS — Migration guide](https://docs.nestjs.com/migration-guide)
- [NestJS — Gateways](https://docs.nestjs.com/websockets/gateways)
- [NestJS — WebSocket Pipes](https://docs.nestjs.com/websockets/pipes), [Guards](https://docs.nestjs.com/websockets/guards), [Interceptors](https://docs.nestjs.com/websockets/interceptors)
- [Socket.IO — Introduction](https://socket.io/docs/v4/) (What Socket.IO is not)
- [Socket.IO — How it works](https://socket.io/docs/v4/how-it-works/) (long-polling 뒤 WebSocket 업그레이드)
- [Socket.IO — Using multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/) (sticky session과 `transports: ['websocket']`의 한계)
- [Socket.IO — Namespaces](https://socket.io/docs/v4/namespaces/), [Rooms](https://socket.io/docs/v4/rooms/)
- [Socket.IO — Emit cheatsheet](https://socket.io/docs/v4/emit-cheatsheet/) (송신 범위와 예약 이벤트 이름)
- [Socket.IO — The Socket instance (server-side)](https://socket.io/docs/v4/server-socket-instance/) (`socket.id`의 수명)
- [client.ts — Socket.IO GitHub](https://github.com/socketio/socket.io/blob/main/packages/socket.io/lib/client.ts) (`Invalid namespace` CONNECT_ERROR)
- [인프런, 윤상석, HTTP vs Socket](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=86990)
- [인프런, 윤상석, 유니캐스팅 (Unicasting) : emit & on](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=87102)
- [인프런, 윤상석, 네임스페이스의 이해와 Gateway 생명주기](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=87104)
- [인프런, 윤상석, 브로드캐스팅 (Broadcasting)](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=87108)
- [인프런, 윤상석, 이벤트 설계와 기본 서비스 로직 완성](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=87569)
- [인프런, 윤상석, DB 설계](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=87597)
- [인프런, 윤상석, DB 연결 및 서비스 로직 마무리](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=87598)
