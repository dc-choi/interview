---
tags: [nestjs, aop, interceptor, observable, rxjs]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS AOP Interceptor", "Observable AOP"]
---

# NestJS Interceptor — Observable 기반 AOP 설계

NestJS가 Interceptor 반환값으로 **Promise가 아닌 `Observable`** 을 요구하는 건 의도된 설계다. "RxJS를 싫어하는 팀"에 불편이지만, **AOP 관점에서 Observable은 Promise로 못 하는 일을 한다**. 이 문서는 왜 그런 설계가 나왔는지와, AOP 도구로 활용하는 실전 패턴.

## Promise vs Observable — AOP 관점 비교

| 능력 | Promise | Observable |
|---|---|---|
| 최종 결과 하나 전달 | ✅ | ✅ |
| **여러 값 emit** (스트리밍·SSE) | ✗ | ✅ |
| **취소(unsubscribe)** | ✗ | ✅ |
| **연산자 체이닝** (map·tap·retry·timeout) | 제한적 | ✅ 수십 종 |
| **라이프사이클 훅** (시작·진행·완료·에러) | 일부 | ✅ 전부 |
| **재시도 로직** | 수동 구현 | `retry(N)` 한 줄 |
| **다수 관찰자** | 불가 | ✅ multicast |

AOP는 **"원본 코드를 손대지 않고 횡단 관심사를 끼워 넣는" 기술**. 로깅·캐싱·재시도·모니터링·권한 체크 — 이 모든 게 **함수의 시작·진행·완료·에러·취소 지점**에 개입이 필요. Promise는 **완료 시점 하나**만 잡을 수 있어 AOP 도구로 부족.

## Observable이 여는 AOP Join Point

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('before handler');
    return next.handle().pipe(
      tap(() => console.log('after success')),
      catchError(err => { console.error('on error', err); throw err; }),
      finalize(() => console.log('always, even on cancel')),
    );
  }
}
```

| 연산자 | Join Point | 비고 |
|--------|-----------|------|
| `intercept()` 진입 | before | — |
| `tap` | after success | 부수 효과만 |
| `catchError` | on error | 가로채기·변환 |
| `finalize` | 성공·실패·취소 무관 종료 | 정리 로직 |
| `map` | transform | `{ success, data, timestamp }` envelope |
| `retry({ count, delay })` | 재시도 | 외부 호출 모듈에 |
| `timeout(ms)` | 타임아웃 | 단일 라인 |
| 스트리밍(`@Sse`) | chunk 단위 가로채기 | Promise는 첫 chunk만 가능 |

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

전역 등록(`useGlobalInterceptors` 또는 `APP_INTERCEPTOR`)으로 일관성. 단 페이지네이션·SSE 같은 특수 응답은 별도 처리 필요.

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

타임아웃 + 4xx는 재시도 안 함, 5xx·네트워크 에러만 재시도, 지수 백오프.

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

외부 API 호출 모듈 전용 Interceptor로 두는 게 안전 — 모든 핸들러에 자동 재시도는 멱등성 보장 안 된 메서드(POST·PATCH)에서 위험.

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
Service는 순수 비즈니스 로직만. 에러 매핑·메서드별 메시지·로깅이 모두 Interceptor 한 곳.

## Interceptor vs Exception Filter

| 축 | Interceptor | Exception Filter |
|---|---|---|
| 목적 | 횡단 관심사 (로깅·캐싱·변환) | 예외 → HTTP 응답 변환 |
| 적용 시점 | 요청 → 응답 전체 라이프사이클 | 예외 발생 시만 |
| 여러 개 중첩 | ✅ 순차 체이닝 | 예외 타입별 match |
| 응답 가로채기 | ✅ `map`·`tap` | 예외만 처리 |

**보완 관계**. Prisma 에러 변환은 Interceptor가 적합 (비즈니스 로직에서 발생한 정상 흐름도 같이 처리 가능). 순수 "예외 → 응답" 매핑은 Exception Filter.

## Observable이 싫다면

RxJS 학습 곡선이 부담이면 `firstValueFrom()`/`lastValueFrom()`로 Promise 변환·Middleware 대체 가능. 단 **재시도·스트리밍·취소·finalize**는 Observable 아니면 제대로 안 됨.

## 흔한 실수

- **Interceptor에서 `await`로 Observable 소비** → 스트리밍 깨짐. `.pipe()` 체이닝 유지
- **`tap` vs `map` 혼동** — `tap`은 부수 효과, `map`은 값 변환
- **Observable 에러를 `try-catch`로** → 안 잡힘. `catchError` 연산자로
- **모든 것에 Interceptor** → 경로마다 가로채기 누적. 적용 범위 의식

## 면접 체크포인트

- Interceptor가 `Observable`을 반환해야 하는 설계 의도
- Promise로 불가능한 AOP 케이스 4가지 (스트리밍·취소·재시도·finalize)
- `tap`·`map`·`catchError`·`finalize` 각각의 AOP 역할
- Interceptor vs Exception Filter 구분
- 메타데이터 + Reflector로 메서드별 설정 구현
- Prisma 같은 라이브러리 에러를 AOP로 중앙화하는 이점

## 출처
- [velog @miinhho — NestJS Interceptor가 Observable을 강제하는 AOP 설계 철학](https://velog.io/@miinhho/NestJS-Interceptor%EA%B0%80-Observable%EC%9D%84-%EA%B0%95%EC%A0%9C%ED%95%98%EB%8A%94-AOP-%EC%84%A4%EA%B3%84-%EC%B2%A0%ED%95%99)
- [velog @miinhho — NestJS AOP를 활용한 Prisma 에러 처리 리팩토링](https://velog.io/@miinhho/NestJS-AOP%EB%A5%BC-%ED%99%9C%EC%9A%A9%ED%95%9C-Prisma-%EC%97%90%EB%9F%AC-%EC%B2%98%EB%A6%AC-%EB%A6%AC%ED%8C%A9%ED%86%A0%EB%A7%81)

## 관련 문서
- [[NestJS|NestJS 개요 · 요청 파이프라인]]
- [[NestJS-vs-Spring|NestJS vs Spring (AOP 비교)]]
- [[NestJS-Custom-Decorator|NestJS 커스텀 데코레이터]]
- [[Spring-Exception-Handling|Spring Exception Handling]]
