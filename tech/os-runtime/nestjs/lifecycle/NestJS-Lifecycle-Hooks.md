---
tags: [nestjs, lifecycle, bootstrap, hooks]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Lifecycle Hooks", "OnApplicationBootstrap", "부팅과 생명주기 훅"]
---

# NestJS 부팅과 생명주기 훅

Bootstrap 표준 형태와 생명주기 훅 6종, 훅 실행 순서를 다룬다. 전체 단계 지도는 [[NestJS-Lifecycle|라이프사이클 인덱스]], 종료 쪽은 [[NestJS-Lifecycle-Shutdown|종료와 리소스 정리]].

## Bootstrap 코드 표준 형태

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    cors: true,
    bodyParser: true,
  });

  // 전역 횡단 관심사
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Express/Fastify 미들웨어
  app.use(helmet());
  app.use(compression());

  // Swagger (개발 환경)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder().setTitle('API').setVersion('1.0').addBearerAuth().build();
    SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
  }

  // Graceful shutdown 활성화
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

`enableShutdownHooks()`의 역할과 함정은 [[NestJS-Lifecycle-Shutdown|종료와 리소스 정리]] 참조.

## 생명주기 훅 6종

| 훅 | 시점 | 용도 |
|------|------|------|
| `OnModuleInit` | 모듈의 모든 의존성 해결 직후 | DB 연결, 초기 데이터 로드 |
| `OnApplicationBootstrap` | 모든 모듈 init 완료 후 | 외부 서비스 연결, 작업 스케줄러 시작, 다른 모듈 의존 작업 |
| `OnModuleDestroy` | 종료 신호 수신 시 (모듈별, init 역순) | 리소스 정리, 큐 비우기 |
| `BeforeApplicationShutdown` | 모든 OnModuleDestroy 완료(Promise resolve/reject 포함) 후, 연결 닫기(app.close()) 직전 | 종료 전 마지막 알림 (관제 통보) |
| `OnApplicationShutdown` | 연결이 닫힌 뒤 (app.close() resolve 후) | 남은 리소스 정리, 로그 flush |
| (signal 인자 받음) | SIGTERM/SIGINT 등 | 신호 종류별 분기 처리 |

위 훅들은 **request-scoped 클래스에는 호출되지 않는다** — 수명이 요청 단위(요청마다 생성, 응답 후 GC)라 앱 생명주기와 무관. init 계열(OnModuleInit, OnApplicationBootstrap)은 `app.init()`이나 `app.listen()`을 호출해야 트리거된다.
훅은 async 가능 — Promise를 반환하면 Nest가 resolve/reject까지 다음 단계를 진행하지 않는다 (초기화 완료 보장에 유용, 반대로 무거운 await는 부팅 지연).

## 실행 순서

```ts
@Injectable()
export class MyService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MyService.name);

  constructor() { this.logger.log('1. Constructor'); }
  onModuleInit() { this.logger.log('2. OnModuleInit'); }
  onApplicationBootstrap() { this.logger.log('3. OnApplicationBootstrap'); }
  onModuleDestroy() { this.logger.log('4. OnModuleDestroy'); }
}
```

```
[Constructor]                          ← Provider 인스턴스화
[OnModuleInit]                         ← 의존성 순서대로 (의존하는 쪽이 먼저 init 받음)
[OnApplicationBootstrap]               ← 모든 모듈 init 완료 후
... 요청 처리 ...
[OnModuleDestroy]                      ← 종료 신호, init 역순
[OnApplicationShutdown]
```

모듈 간 순서는 의존성 그래프를 따른다 — A가 B에, B가 C에 의존하면 init은 C → B → A (의존받는 쪽 먼저), destroy 계열(OnModuleDestroy, BeforeApplicationShutdown, OnApplicationShutdown)은 정확히 그 역순 A → B → C. **종료 훅의 역순 실행은 v11부터 보장**된 동작이다 (v10까지는 역순이 아니었다). **전역 모듈(@Global)은 모든 모듈의 의존성으로 취급**되어 가장 먼저 init되고 가장 마지막에 destroy된다.

## OnModuleInit vs OnApplicationBootstrap

겉보기 비슷하지만 의미 다름.

- **OnModuleInit** — 이 모듈의 의존성이 다 해결됐다. *내 모듈 내부* 초기화에 적합.
- **OnApplicationBootstrap** — *전체 모듈 트리*가 준비됐다. 다른 모듈의 Provider를 호출해야 하는 작업, 스케줄러 시작에 적합.

체감 차이: A가 B에 의존할 때 A의 `OnModuleInit`은 B의 `OnModuleInit` 후에 실행되지만, A가 *B의 다른 메서드를 호출*하기엔 불안정한 시점일 수 있음. 안전하게 다른 모듈을 쓰려면 `OnApplicationBootstrap`.

## 면접 체크포인트

- Bootstrap 단계 순서 (NestFactory.create → 전역 설정 → 모듈 init → bootstrap → listen)
- `OnModuleInit` vs `OnApplicationBootstrap` 차이 — *내 모듈* vs *전체 트리*
- Constructor에서 비동기 작업 못 하는 이유, 대체 (OnModuleInit)
- 의존성 그래프 init 순서 — 의존받는 쪽이 먼저 init, 전역 모듈이 최초 init/최후 destroy
- 종료는 init 역순 (v11부터 보장)

## 관련 문서

- [[NestJS-Lifecycle|라이프사이클 인덱스]]
- [[NestJS-Lifecycle-Shutdown|종료와 리소스 정리]]
- [[NestJS-Module-Dynamic|Dynamic Module (registerAsync 옵션 초기화)]]

## 출처
- [NestJS — Lifecycle events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [NestJS — Migration guide (v11)](https://docs.nestjs.com/migration-guide)
