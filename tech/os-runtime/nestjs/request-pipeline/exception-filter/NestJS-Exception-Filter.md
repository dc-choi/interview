---
tags: [nestjs, exception-filter, error-handling, http-exception]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Exception Filter", "AllExceptionsFilter"]
---

# NestJS Exception Filter — 예외 → 응답 변환

`ExceptionFilter` 인터페이스를 구현하는 Provider. **예외를 HTTP 응답으로 변환**하는 마지막 단계. Guard·Pipe·Interceptor·Handler 어디서 throw됐든 모두 Filter로 흘러옴.

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

내장 서브클래스들이 status·message 매핑을 다 함. **Filter는 그 동작을 커스터마이징하거나 비-HttpException을 처리할 때** 사용.

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

## 패턴 1: 전역 Catch-all Filter

모든 예외를 표준 응답 포맷으로 통일. 예상치 못한 에러는 5xx로.

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let errors: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      if (typeof errorResponse === 'object') {
        message = (errorResponse as any).message || exception.message;
        errors = (errorResponse as any).errors;
      } else {
        message = errorResponse as string;
      }
    } else if (exception instanceof QueryFailedError) {
      // TypeORM 쿼리 실패 → 400으로
      status = 400;
      message = 'Database query failed';
      errors = exception.driverError;
    } else {
      // 진짜 예상 못한 에러
      status = 500;
      message = 'Internal server error';
      this.logger.error('Unexpected error', exception);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(errors && { errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: (exception as Error).stack }),
    });
  }
}
```

핵심:
- `instanceof` 분기로 **알려진 예외 → 매핑, 모르는 예외 → 5xx + 로깅**.
- 운영에서는 stack trace 노출 금지.
- `errors` 같은 부가 필드는 검증 실패 같이 구조적 에러일 때만.

## 패턴 2: 특정 예외 타입 Filter

```ts
@Catch(ValidationException)
export class ValidationFilter implements ExceptionFilter {
  catch(exception: ValidationException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    response.status(422).json({
      statusCode: 422,
      message: 'Validation failed',
      errors: exception.validationErrors,
    });
  }
}
```

같은 컨트롤러에 `AllExceptionsFilter`와 함께 두면 **구체 타입이 우선** — 검증 예외만 422로, 나머지는 일반 처리.

## 커스텀 HttpException

도메인 예외를 HTTP 응답에 잘 매핑되게 정의.

```ts
export class BusinessLogicException extends HttpException {
  constructor(message: string, errorCode: string) {
    super(
      { message, errorCode, timestamp: new Date().toISOString() },
      HttpStatus.BAD_REQUEST,
    );
  }
}

// 사용
throw new BusinessLogicException('Insufficient balance', 'BALANCE_TOO_LOW');
```

`errorCode`로 클라이언트가 분기 — 다국어 메시지·UX 처리.

## 적용 범위

```ts
// 전역 (DI 안 됨)
app.useGlobalFilters(new AllExceptionsFilter());

// 전역 (DI 됨)
{ provide: APP_FILTER, useClass: AllExceptionsFilter }

// 컨트롤러
@UseFilters(SomeFilter)
@Controller()

// 메서드
@UseFilters(SomeFilter)
@Post()
```

DI가 필요한 Filter(Logger·ConfigService 주입)는 `APP_FILTER` 토큰.

## 우선순위 — 적용 범위와 타입 구체성

여러 Filter가 적용된 경우:
1. **타입이 더 구체적인 Filter 우선** — `@Catch(ValidationException)`이 `@Catch()`보다 먼저.
2. **적용 범위가 좁은 것이 우선** — 메서드 > 컨트롤러 > 전역.
3. **여러 Filter가 같은 예외를 잡으면 처음 매칭된 것이 처리**.

## Pipe 검증 실패와의 관계

`ValidationPipe` throw → `BadRequestException` (400). Filter에서 응답 포맷만 통일하면 됨. 별도로 검증 결과 가공이 필요하면 `exceptionFactory` 옵션으로:

```ts
new ValidationPipe({
  exceptionFactory: (errors) =>
    new BadRequestException({
      message: 'Validation failed',
      errors: errors.map(e => ({ field: e.property, constraints: e.constraints })),
    }),
})
```

## 흔한 실수

- **모든 에러를 200으로**: "에러도 success: false 필드로 통일"하려다 200 + body의 status 코드만 다르게. HTTP 시멘틱 깨짐 — 캐싱·모니터링·재시도 정책이 망가짐.
- **운영에서 stack trace 노출**: 내부 구조 누출. `NODE_ENV` 분기 필수.
- **`@Catch()` 하나로 다 잡고 instanceof 분기**: 가능하지만 타입별 Filter가 가독성·테스트성 좋음.
- **`useGlobalFilters(new ...)`로 DI 시도**: 안 됨. `APP_FILTER` 토큰 등록 필요.
- **HttpException 외 예외 무시**: TypeORM·외부 SDK 예외가 그대로 5xx로 → 클라이언트가 디버깅 불가. catch-all에서 명시적 매핑 필요.
- **Filter에서 비즈니스 로직**: 응답 포맷·로깅 외 작업 금지 — 트랜잭션 롤백 등은 Filter에 들어오기 전에 끝났어야.

## 면접 체크포인트

- Exception Filter가 요청 파이프라인 어디에 위치하는지
- `@Catch()` 데코레이터 — 타입별 vs catch-all
- `ArgumentsHost` vs `ExecutionContext` 차이 (전자가 부모)
- 내장 HttpException 서브클래스의 자동 매핑 (별도 Filter 없이도 동작)
- 적용 우선순위 — 타입 구체성 + 적용 범위
- `APP_FILTER` 토큰 등록 vs `useGlobalFilters` (DI 가능/불가)
- 운영/개발 환경 분기 — stack trace 노출 통제
- `ValidationPipe`의 `exceptionFactory`로 검증 실패 응답 커스터마이징

## 관련 문서

- [[NestJS|NestJS 요청 파이프라인]]
- [[NestJS-Pipes|Pipes (검증 실패 throw → Filter)]]
- [[NestJS-AOP-Interceptor|Interceptor vs Exception Filter]]
- [[NestJS-Guards|Guards (인증 실패 throw → Filter)]]
