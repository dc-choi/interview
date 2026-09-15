---
tags: [nestjs, websocket, gateway, socket-io, realtime]
status: done
verified_at: 2026-08-26
category: "OS & Runtime - NestJS"
aliases: ["NestJS WebSocket Gateway", "WebSocketGateway", "SubscribeMessage"]
---

# NestJS WebSocket Gateway: 확장과 운영

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
