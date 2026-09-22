---
tags: [nestjs, aop, interceptor, observable, rxjs]
status: done
verified_at: 2026-09-22
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

### 공개 GET 응답만 opt-in 캐싱

응답 캐시는 공개적이고 동일한 응답을 주는 GET handler에만 명시적으로 붙인다. 인증 헤더, cookie, request user 중 하나라도 있으면 캐시를 우회한다. URL만 키로 쓰면 언어, 공개 tenant 같은 변형 응답도 섞이므로 실제 응답을 바꾸는 공개 variant는 allowlist에 넣어 키에 포함한다. 역할, 사용자 ID, session처럼 접근 권한에 연결된 값은 variant로 삼지 말고 캐시하지 않는다.

```ts
export interface PublicCacheOptions {
  readonly ttlSeconds: number;
  readonly varyBy?: readonly ('accept-language' | 'x-public-tenant')[];
}

export const PUBLIC_CACHE_OPTIONS = 'public-cache-options';
export const PublicCache = (options: PublicCacheOptions) =>
  SetMetadata(PUBLIC_CACHE_OPTIONS, options);

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const options = this.reflector.getAllAndOverride<PublicCacheOptions>(
      PUBLIC_CACHE_OPTIONS,
      [context.getHandler(), context.getClass()],
    );
    const hasIdentity =
      request.headers.authorization !== undefined ||
      request.headers.cookie !== undefined ||
      request.user !== undefined;

    if (request.method !== 'GET' || options === undefined || hasIdentity) {
      return next.handle();
    }

    const variants = (options.varyBy ?? []).map((header) => [
      header,
      request.headers[header] ?? '',
    ]);
    const key = JSON.stringify([
      request.method,
      request.originalUrl ?? request.url,
      variants,
    ]);

    const cached = this.cacheService.get(key);
    // 이 예제에서 cache miss는 undefined다. 0, false, 빈 문자열, null은 유효한 hit다.
    if (cached !== undefined) return of(cached);

    return next.handle().pipe(
      tap((response) => this.cacheService.set(key, response, options.ttlSeconds)),
    );
  }
}

@Get('catalog')
@PublicCache({ ttlSeconds: 60, varyBy: ['accept-language'] })
findCatalog() { /* 인증, cookie, 사용자별 내용이 없는 공개 응답 */ }
```

`@PublicCache`는 공유해도 되는 응답이라는 계약이다. 예를 들어 locale, 공개 tenant host, 실험 variant처럼 응답을 바꾸는 값은 명시적으로 키에 포함하고, 개인화, 로그인 여부, 권한별 필드가 있는 route는 데코레이터를 붙이지 않는다. 이 예제의 `CacheService`는 동기 custom store다. `@nestjs/cache-manager`처럼 Promise를 반환하는 store는 `defer` 또는 `from`으로 Observable 안에서 `get`과 `set`을 호출한다. 다중 인스턴스가 같은 결과를 봐야 한다면 Redis 같은 shared store를 사용한다. instance별 cache도 허용할 수 있지만 서로 다른 값을 잠시 반환할 수 있으므로 허용 가능한 stale 범위와 invalidation 방식을 먼저 정한다.

### 타임아웃과 재시도 경계 분리

핸들러 전체를 감싸는 Interceptor에는 deadline만 둔다. `retry()`는 source를 재구독하므로 `next.handle()`에 적용하면 DB 쓰기나 외부 호출을 포함한 핸들러 전체가 다시 실행될 수 있다.

```ts
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError(error => {
        if (error instanceof TimeoutError) throw new RequestTimeoutException();
        throw error;
      }),
    );
  }
}
```

재시도는 멱등성을 판단할 수 있는 outbound client 메서드에 둔다. API 계약에 따라 일시적인 네트워크 오류, timeout, 일부 408/425/429와 5xx만 분류하고, 횟수 상한, backoff, jitter와 `Retry-After`를 적용한다. status가 없다는 이유만으로 모든 오류를 재시도하지 않는다. 비멱등 요청은 idempotency key가 없으면 자동 재시도하지 않는다. 자세한 규율은 [[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]].

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

// 3. Controller의 route handler에 적용
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @PrismaErrorHandler({ P2002: '이미 존재하는 이메일입니다' })
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
    // Service에는 try-catch가 없다. Interceptor가 route handler를 감싼다.
  }
}
```

`@UseInterceptors()`는 controller, route handler 또는 전역 범위에 붙는다. Service provider의 메서드에 데코레이터만 붙여서는 HTTP 요청 파이프라인이 그 메서드를 감싸지 않는다. 모든 route에 같은 Prisma 매핑이 필요하면 전역 interceptor로 등록하고, 메서드별 메시지가 필요하면 위처럼 controller handler에 메타데이터를 둔다.

### 효과
Service는 순수 비즈니스 로직만. 에러 매핑, 메서드별 메시지, 로깅이 모두 Interceptor 한 곳.

## 관련 문서
- [[NestJS-AOP-Interceptor|NestJS AOP Interceptor (TOC)]]

## 출처
- [NestJS — Serialization](https://docs.nestjs.com/techniques/serialization)
- [NestJS, Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS, Caching](https://docs.nestjs.com/techniques/caching)
