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

## 패턴 3: BaseExceptionFilter 상속

전부 새로 쓰는 대신 내장 전역 필터를 확장하는 길. `@nestjs/core`의 `BaseExceptionFilter`를 상속하고 필요한 분기만 처리한 뒤 `super.catch(exception, host)`로 기본 동작에 위임한다 — 플랫폼 종속 응답 로직을 재구현하지 않아도 된다.

```ts
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // 커스텀 분기 (로깅, 특정 예외 변환 등)
    super.catch(exception, host);
  }
}
```

주의: BaseExceptionFilter를 상속한 필터를 메서드나 컨트롤러 스코프에 쓸 때 `new`로 직접 인스턴스화하지 않는다 — 프레임워크가 인스턴스화하게 둔다(HttpAdapter 주입이 필요하기 때문).

## 패턴 4: 전역 필터 + 에러 트래킹(Sentry) 결합

전역 catch-all 필터가 예외를 응답으로 변환해 **삼키면 외부 에러 트래킹이 그 예외를 못 본다.** Sentry(@sentry/nestjs) 결합 시 두 가지가 계약이다:

- 계측 초기화(`Sentry.init`)를 담은 instrument 파일을 **다른 모든 모듈 import보다 먼저** 로드한다 — require 훅 기반 계측이라 순서가 깨지면 누락된다.
- 전역 catch-all 필터의 `catch()`에 `@SentryExceptionCaptured()` 데코레이터를 붙여, 필터가 처리하는 예외도 Sentry로 보고되게 한다.

## 출처

- [NestJS — Exception filters](https://docs.nestjs.com/exception-filters)
- [NestJS — Sentry](https://docs.nestjs.com/recipes/sentry)
