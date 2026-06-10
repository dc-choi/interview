---
tags: [nestjs, exception-filter, error-handling, http-exception]
status: done
category: "OS & Runtime - NestJS"
aliases: ["전역 Catch-all Filter 패턴", "커스텀 HttpException"]
---

# NestJS Exception Filter — 구현 패턴

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

`errorCode`로 클라이언트가 분기 — 다국어 메시지, UX 처리.
