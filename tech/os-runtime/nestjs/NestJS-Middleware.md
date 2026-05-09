---
tags: [nestjs, middleware, express, rate-limit]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Middleware", "NestMiddleware"]
---

# NestJS Middleware

요청 파이프라인의 **가장 바깥쪽 단계**. Express/Fastify 미들웨어와 호환되며, 라우팅 매칭 직후·Guard 직전에 실행. 보통 로깅·CORS·요청 ID 부착·압축·헬멧 같은 **HTTP 레벨 횡단 관심사**.

## 위치 — 요청 파이프라인에서

```
Request → [Middleware] → Guard → Interceptor(pre) → Pipe → Handler → ...
            ↑
    Express 호환 영역 — req/res/next
```

NestJS 컨텍스트(ExecutionContext, Reflector, DI 토큰)는 Middleware에서 **부분적으로만** 접근 가능. 클래스형으로 만들면 DI는 받지만, ExecutionContext는 없음. NestJS 메타데이터/Guard·Pipe와 결합한 작업은 Interceptor·Guard로.

## 함수형 vs 클래스형

### 함수형
```ts
export function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`Request ${req.method} ${req.path}`);
  next();
}
```
간단한 횡단 작업·Express 미들웨어 그대로 사용에 적합. DI 못 받음.

### 클래스형
```ts
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('User-Agent') || '';

    res.on('finish', () => {
      const { statusCode } = res;
      this.logger.log(`${method} ${originalUrl} ${statusCode} - ${userAgent} ${ip}`);
    });

    next();
  }
}
```

DI 가능 — `Logger`·`ConfigService` 같은 Provider 주입. **응답 후 로깅**은 `res.on('finish')` 패턴.

## 적용 — MiddlewareConsumer

`NestModule` 인터페이스의 `configure()`에서 `MiddlewareConsumer`로 등록.

```ts
@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL })

      .apply(RateLimitMiddleware)
      .forRoutes({ path: '/api/*', method: RequestMethod.ALL })

      .apply(cors(), helmet())  // Express 미들웨어 그대로
      .forRoutes('*');
  }
}
```

| 메서드 | 용도 |
|--------|------|
| `forRoutes(path)` | 경로 패턴으로 적용 |
| `forRoutes(Controller)` | 컨트롤러 클래스로 적용 |
| `exclude(path)` | 특정 경로 제외 (헬스체크·Swagger 같은 것) |
| `apply(...mw)` | 여러 미들웨어를 한 번에 |

## Express 미들웨어 호환

`helmet()`, `cors()`, `compression()`, `cookie-parser()` 같은 Express 생태계 미들웨어를 그대로 쓸 수 있는 것이 강점.

전역 적용은 `main.ts`의 `app.use(...)`로도 가능. `MiddlewareConsumer`는 **경로별·DI가 필요한 경우** 사용.

```ts
// main.ts — 전역, DI 불필요
app.use(helmet());
app.use(compression());
```

## 패턴: Rate Limiting

```ts
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, number[]>();

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxRequests = 100;

    const userRequests = this.requests.get(ip) ?? [];
    const validRequests = userRequests.filter(time => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)}s`,
      });
    }

    validRequests.push(now);
    this.requests.set(ip, validRequests);
    next();
  }
}
```

**메모리 기반은 단일 인스턴스용**. 다중 인스턴스/오토스케일 환경에서는 **Redis** 같은 공유 저장소 필요. 운영급은 `@nestjs/throttler` 또는 `express-rate-limit` + Redis store.

## Middleware vs Guard vs Interceptor

| 축 | Middleware | Guard | Interceptor |
|---|---|---|---|
| 위치 | 가장 바깥 (라우팅 직후) | Pipe 앞 | Pipe 앞·Handler 후 |
| Nest 컨텍스트 | 제한적 (ExecutionContext 없음) | ✅ ExecutionContext | ✅ ExecutionContext |
| DI | 클래스형이면 가능 | ✅ | ✅ |
| 응답 변환 | 가능하지만 비표준 | ✗ | ✅ map/tap |
| 적합한 일 | HTTP 헤더·로깅·CORS·압축 | 인증/인가 | AOP·캐싱·재시도·envelope |

**책임 분리 원칙**:
- HTTP 레벨 일반 처리 → Middleware
- 인가 결정 → Guard
- 비즈니스 횡단 관심사 → Interceptor

## 흔한 실수

- **인가 검증을 Middleware에서**: ExecutionContext·Reflector 없어 메서드 메타데이터 못 읽음. Guard로.
- **next() 호출 누락**: 응답 무한 대기. 모든 분기에서 `next()` 또는 `res.send()` 둘 중 하나는 반드시.
- **DI 필요한데 함수형으로**: Provider 주입 안 됨. 클래스형으로.
- **메모리 기반 rate limiter를 다중 인스턴스에**: 인스턴스마다 카운터 따로 → 사용자가 한도의 N배 사용 가능. Redis 공유 필수.
- **`forRoutes('*')` 후 무거운 미들웨어**: 헬스체크·정적 파일까지 다 통과 → 성능 영향. `exclude` 활용.

## 면접 체크포인트

- Middleware의 위치 — Guard보다 앞, ExecutionContext 없는 영역
- 함수형 vs 클래스형 — DI 필요 여부로 선택
- `MiddlewareConsumer.forRoutes` / `exclude` / `apply` 사용법
- Express 미들웨어 호환 — `helmet`/`cors`/`compression` 그대로
- Middleware vs Guard 책임 경계 — HTTP 레벨 vs 인가 결정
- Rate Limiting 단일 인스턴스 vs 다중 인스턴스 (Redis 공유 store 필요)
- `next()` 누락 패턴

## 관련 문서

- [[NestJS|NestJS 요청 파이프라인]]
- [[NestJS-Guards|Guards (Middleware 다음 단계)]]
- [[NestJS-AOP-Interceptor|Interceptor와 책임 분리]]
- [[NestJS-Lifecycle|애플리케이션 라이프사이클]]
