---
tags: [nestjs, middleware, express, rate-limit]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Middleware", "NestMiddleware"]
---

# NestJS Middleware

요청 파이프라인의 **가장 바깥쪽 단계**. Express/Fastify 미들웨어와 호환되며, 라우팅 매칭 직후, Guard 직전에 실행. 보통 로깅, CORS, 요청 ID 부착, 압축, 헬멧 같은 **HTTP 레벨 횡단 관심사**.

## 위치 — 요청 파이프라인에서

```
Request → [Middleware] → Guard → Interceptor(pre) → Pipe → Handler → ...
            ↑
    Express 호환 영역 — req/res/next
```

NestJS 컨텍스트(ExecutionContext, Reflector, DI 토큰)는 Middleware에서 **부분적으로만** 접근 가능. 클래스형으로 만들면 DI는 받지만, ExecutionContext는 없음. NestJS 메타데이터/Guard, Pipe와 결합한 작업은 Interceptor, Guard로.

## 함수형 vs 클래스형

### 함수형
```ts
export function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`Request ${req.method} ${req.path}`);
  next();
}
```
간단한 횡단 작업, Express 미들웨어 그대로 사용에 적합. DI 못 받음.

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

DI 가능 — `Logger`, `ConfigService` 같은 Provider 주입. **응답 후 로깅**은 `res.on('finish')` 패턴.

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
| `exclude(path)` | 특정 경로 제외 (헬스체크, Swagger 같은 것) |
| `apply(...mw)` | 여러 미들웨어를 한 번에 |

와일드카드 문법 (Express v5 기준): forRoutes 경로 패턴은 named wildcard로 쓴다 — `abcd/*splat`(이름은 임의)은 abcd/ 뒤에 뭔가 있는 경로만 매칭하고, `abcd/` 자체까지 포함하려면 중괄호로 감싸 `abcd/{*splat}`로 옵셔널화한다. 전체 매칭 `forRoutes('*')`는 그대로 쓸 수 있다. 위 예시의 `/api/*` 같은 bare 와일드카드는 v4 시절 문법이다.

## Express 미들웨어 호환

`helmet()`, `cors()`, `compression()`, `cookie-parser()` 같은 Express 생태계 미들웨어를 그대로 쓸 수 있는 것이 강점.

전역 적용은 `main.ts`의 `app.use(...)`로도 가능. `MiddlewareConsumer`는 **경로별, DI가 필요한 경우** 사용.

**등록 순서 규칙**: helmet, cors 같은 전역 미들웨어는 다른 `app.use()`나 라우트 정의보다 **먼저** 등록해야 한다 — Express/Fastify는 미들웨어와 라우트의 정의 순서가 곧 적용 순서라, 라우트 정의 뒤에 등록한 미들웨어는 그 라우트에 적용되지 않는다.

모듈 미들웨어(MiddlewareConsumer) 간에는 v11부터 **전역 모듈(@Global)에 등록한 미들웨어가 의존성 그래프상 위치와 무관하게 최우선 실행**된다 — v10까지는 전역/일반 구분 없이 루트 모듈로부터의 위상 정렬 거리 순이어서 비일관적이었다.

쿠키가 대표 사례 — NestJS는 쿠키 파싱을 내장하지 않고 미들웨어에 위임한다:
- `cookie-parser`가 Cookie 헤더를 파싱해 `req.cookies`로, secret을 주면 서명 쿠키를 검증해 `req.signedCookies`로 노출. **서명 검증에 실패한(변조된) 쿠키는 값이 false**로 들어온다.
- 응답 쿠키는 `@Res({ passthrough: true })`로 받은 response의 `cookie()` — passthrough 없이 `@Res()`만 쓰면 프레임워크의 응답 처리가 꺼진다.
- Fastify는 미들웨어 대신 `@fastify/cookie` 플러그인을 `app.register()`로 등록. 플랫폼 무관 접근이 필요하면 `createParamDecorator`로 `@Cookies()` 커스텀 데코레이터를 만든다.

세션도 동일 — `express-session`을 `app.use(session({ secret, resave: false, saveUninitialized: false }))`로 걸고 핸들러에서 `@Session()` 데코레이터(@nestjs/common)로 추출:
- **기본 인메모리 store는 운영 금지** — 공식 문구로 메모리 누수, 단일 프로세스 한계, 디버깅/개발 전용. 운영은 Redis 같은 외부 store.
- `secret` 배열이면 첫 요소로 서명하고 전체로 검증 — 시크릿 로테이션 구조. `resave` 기본 true는 deprecated라 false 명시. `saveUninitialized: false`는 로그인 세션, 저장 절약, 쿠키 동의법 준수, 무세션 병렬 요청 race 완화에 유용.
- `secure: true` 권장 (HTTPS 필수) — 프록시 뒤에서는 Express `trust proxy` 설정 필요. Fastify는 `@fastify/secure-session` 플러그인.

응답 압축도 같은 구조 — Express는 `compression()`(gzip), Fastify는 `@fastify/compress` 플러그인:
- **고트래픽 운영에선 앱 서버 압축을 쓰지 말고 리버스 프록시(Nginx)로 오프로드**하는 것이 공식 강력 권장 — 그 경우 compression 미들웨어를 빼야 한다.
- `@fastify/compress`는 브라우저가 지원하면 **기본 Brotli** — 압축률은 좋지만 기본 품질 11이 느리다. `BROTLI_PARAM_QUALITY`(0~11) 튜닝 또는 `encodings: ['gzip', 'deflate']`로 제한해 응답은 커져도 전달을 빠르게 하는 트레이드오프.

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
| 위치 | 가장 바깥 (라우팅 직후) | Pipe 앞 | Pipe 앞, Handler 후 |
| Nest 컨텍스트 | 제한적 (ExecutionContext 없음) | ✅ ExecutionContext | ✅ ExecutionContext |
| DI | 클래스형이면 가능 | ✅ | ✅ |
| 응답 변환 | 가능하지만 비표준 | ✗ | ✅ map/tap |
| 적합한 일 | HTTP 헤더, 로깅, CORS, 압축 | 인증/인가 | AOP, 캐싱, 재시도, envelope |

**책임 분리 원칙**:
- HTTP 레벨 일반 처리 → Middleware
- 인가 결정 → Guard
- 비즈니스 횡단 관심사 → Interceptor

## 흔한 실수

- **인가 검증을 Middleware에서**: ExecutionContext, Reflector 없어 메서드 메타데이터 못 읽음. Guard로.
- **next() 호출 누락**: 응답 무한 대기. 모든 분기에서 `next()` 또는 `res.send()` 둘 중 하나는 반드시.
- **DI 필요한데 함수형으로**: Provider 주입 안 됨. 클래스형으로.
- **메모리 기반 rate limiter를 다중 인스턴스에**: 인스턴스마다 카운터 따로 → 사용자가 한도의 N배 사용 가능. Redis 공유 필수.
- **`forRoutes('*')` 후 무거운 미들웨어**: 헬스체크, 정적 파일까지 다 통과 → 성능 영향. `exclude` 활용.

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

## 출처

- [NestJS — Middleware](https://docs.nestjs.com/middleware)
- [NestJS — Cookies](https://docs.nestjs.com/techniques/cookies)
- [NestJS — Compression](https://docs.nestjs.com/techniques/compression)
- [NestJS — Session](https://docs.nestjs.com/techniques/session)
- [NestJS — Helmet](https://docs.nestjs.com/security/helmet)
- [NestJS — Migration guide (v11)](https://docs.nestjs.com/migration-guide)
