---
tags: [nestjs, exception-filter, error-handling, http-exception]
status: done
category: "OS & Runtime - NestJS"
aliases: ["Exception Filter 파이프라인 위치", "ExceptionFilter 시그니처"]
---

# NestJS Exception Filter — 위치, 내장 HttpException, 시그니처

## 위치 — 요청 파이프라인에서

```
Request → Middleware → Guard → Pipe → Handler → Response
                ↘       ↘     ↘      ↘
             throw 시 모두 → Exception Filter → 응답 변환
```

## 기본 HttpException

NestJS는 `HttpException`을 자동으로 적절한 HTTP 응답으로 변환. 별도 Filter 없이도 동작.

```ts
throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
throw new BadRequestException('invalid input');
throw new NotFoundException();
throw new UnauthorizedException();
throw new ConflictException();
```

내장 서브클래스들이 status, message 매핑을 다 함. **Filter는 그 동작을 커스터마이징하거나 비-HttpException을 처리할 때** 사용.

- **미인식 예외의 기본 처리**: HttpException 계열이 아닌 예외는 내장 전역 필터가 `{ "statusCode": 500, "message": "Internal server error" }`로 변환한다. 예외에 statusCode와 message 프로퍼티가 있으면(http-errors 라이브러리 스타일) 그 값을 그대로 반영한다.
- **내장 예외는 로그되지 않는다**: HttpException 계열(WsException, RpcException 포함)은 정상 애플리케이션 흐름으로 간주돼 콘솔에 찍히지 않는다 — 이들이 상속하는 IntrinsicException이 정상 흐름 예외와 그 밖의 예외를 구분하는 기준이다. 이 예외들을 로그하려면 커스텀 필터가 필요하다.
- **WebSocket 계층 차이**: 게이트웨이에선 HttpException 대신 `WsException`(@nestjs/websockets)을 던진다. 처리 결과는 HTTP 응답이 아니라 클라이언트로 **`exception` 이벤트를 emit** — 페이로드는 `{ status: 'error', message }`. 필터 동작은 HTTP와 동등하고, 코어 필터 확장은 BaseExceptionFilter 대신 `BaseWsExceptionFilter` 상속.
- **Microservice(RPC) 계층 차이**: `RpcException`(@nestjs/microservices)을 던지면 `{ status: 'error', message }` 에러 객체로 응답된다. RPC 필터는 한 가지가 다르다 — **catch()가 Observable을 반환해야** 한다 (보통 `throwError(() => exception.getError())`). 코어 확장은 `BaseRpcExceptionFilter`.

## ExceptionFilter 시그니처

```ts
@Catch(SomeException)
export class SomeFilter implements ExceptionFilter {
  catch(exception: SomeException, host: ArgumentsHost) {
    // host에서 request/response 추출 → 직접 응답 작성
  }
}
```

- `@Catch(...)` — 잡을 예외 타입. 비우면 모든 예외(`@Catch()`).
- `ArgumentsHost` — `ExecutionContext`의 부모 — http/ws/rpc 컨텍스트 분기 가능.

## 출처

- [NestJS — Exception filters](https://docs.nestjs.com/exception-filters)
- [NestJS — WebSocket Exception filters](https://docs.nestjs.com/websockets/exception-filters)
- [NestJS — Microservices Exception filters](https://docs.nestjs.com/microservices/exception-filters)
