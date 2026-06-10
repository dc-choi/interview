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
