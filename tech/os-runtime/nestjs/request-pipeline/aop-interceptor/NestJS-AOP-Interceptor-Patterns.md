---
tags: [nestjs, aop, interceptor, observable, rxjs]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Interceptor 실전 패턴", "Prisma 에러 중앙 처리"]
---

# NestJS AOP Interceptor — 보편 패턴과 Prisma 에러 중앙 처리

## 보편 패턴 카탈로그

### 응답 envelope 통일

모든 응답을 `{ success, data, timestamp, path }` 구조로 wrap. 컨트롤러는 raw 데이터만 반환하면 됨.

```ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        path: context.switchToHttp().getRequest().url,
      })),
    );
  }
}
```

전역 등록(`useGlobalInterceptors` 또는 `APP_INTERCEPTOR`)으로 일관성. 단 페이지네이션, SSE 같은 특수 응답은 별도 처리 필요.

### 메서드별 캐싱

같은 request key에 대한 응답을 메모리 캐시. Reflector + 메타데이터로 메서드별 TTL 분기.

```ts
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private cacheService: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const key = `${request.method}:${request.url}`;

    const cached = this.cacheService.get(key);
    if (cached) return of(cached);

    return next.handle().pipe(
      tap(response => this.cacheService.set(key, response, 60)),
    );
  }
}
```

운영급은 Redis 같은 공유 store 필수 — 메모리는 다중 인스턴스에서 일관성 깨짐. NestJS `CacheModule` + Redis store가 표준.

### 조건부 재시도 (Retry with backoff)

타임아웃 + 4xx는 재시도 안 함, 5xx, 네트워크 에러만 재시도, 지수 백오프.

```ts
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      retry({
        count: 3,
        delay: (error, retryCount) => {
          if (error.status >= 400 && error.status < 500) throw error;  // 4xx 단락
          return timer(Math.pow(2, retryCount) * 1000);                // 지수 백오프
        },
      }),
    );
  }
}
```

외부 API 호출 모듈 전용 Interceptor로 두는 게 안전 — 모든 핸들러에 자동 재시도는 멱등성 보장 안 된 메서드(POST, PATCH)에서 위험.

### 응답 직렬화 — 내장 ClassSerializerInterceptor

핸들러 반환값에 class-transformer의 `instanceToPlain()`을 적용해 엔티티의 `@Exclude()`/`@Expose()`/`@Transform()` 규칙을 실행하는 내장 인터셉터 — 전역 적용하면 민감 필드 제거가 중앙 강제된다. 데코레이터별 사용법, 클래스 인스턴스 반환 제약과 `@SerializeOptions({ type })` 우회, StreamableFile 미적용 등 전체 정리는 [[NestJS-Serialization|응답 직렬화]] 정본 참조.

## 실전 패턴: Prisma 에러 중앙 처리

Prisma 쿼리 에러(`PrismaClientKnownRequestError` 등)를 각 Service에서 try-catch하는 건 중복. AOP Interceptor로 **중앙 처리 + 메서드별 커스텀 메시지**.

### 구조
```ts
// 1. 메타데이터 데코레이터
export const PrismaErrorHandler = (messages?: Record<string, string>) =>
  applyDecorators(
    UseInterceptors(PrismaErrorInterceptor),
    SetMetadata('prisma-error-messages', messages),
  );

// 2. Interceptor
@Injectable()
export class PrismaErrorInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const messages = this.reflector.get('prisma-error-messages', ctx.getHandler());

    return next.handle().pipe(
      catchError(err => {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          throw mapPrismaError(err, messages);   // 코드별 HttpException
        }
        throw err;
      }),
    );
  }
}

// 3. Service 사용
@PrismaErrorHandler({ P2002: '이미 존재하는 이메일입니다' })
async createUser(dto) {
  return this.prisma.user.create({ data: dto });
  // try-catch 없음. Interceptor가 처리
}
```

### 효과
Service는 순수 비즈니스 로직만. 에러 매핑, 메서드별 메시지, 로깅이 모두 Interceptor 한 곳.

## 관련 문서
- [[NestJS-AOP-Interceptor|NestJS AOP Interceptor (TOC)]]

## 출처
- [NestJS — Serialization](https://docs.nestjs.com/techniques/serialization)
