---
tags: [nestjs, lifecycle, bootstrap, hooks]
status: done
verified_at: 2026-08-28
category: "OS & Runtime - NestJS"
aliases: ["NestJS Lifecycle Hooks", "OnApplicationBootstrap", "부팅과 생명주기 훅"]
---

# NestJS 부팅과 생명주기 훅

Bootstrap 표준 형태와 생명주기 훅 5종, 훅 실행 순서를 다룬다. 전체 단계 지도는 [[NestJS-Lifecycle|라이프사이클 인덱스]], 종료 쪽은 [[NestJS-Lifecycle-Shutdown|종료와 리소스 정리]].

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

  // Express 어댑터의 전역 미들웨어
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

## 생명주기 훅 5종

| 훅 | 시점 | 용도 |
|------|------|------|
| `OnModuleInit` | 모듈의 모든 의존성 해결 직후 | DB 연결, 초기 데이터 로드 |
| `OnApplicationBootstrap` | 모든 모듈 init 완료 후 | 외부 서비스 연결, 작업 스케줄러 시작, 다른 모듈 의존 작업 |
| `OnModuleDestroy` | `app.close()` 또는 `enableShutdownHooks()`를 설정한 종료 신호 수신 뒤 | 리소스 정리, 큐 비우기 |
| `BeforeApplicationShutdown` | 모든 OnModuleDestroy handler의 Promise가 resolve 또는 reject된 후, 연결 닫기(app.close()) 직전 | 종료 전 마지막 알림 (관제 통보) |
| `OnApplicationShutdown` | adapter와 연결 dispose 뒤, `app.close()`가 resolve되기 직전 | 남은 리소스 정리, 로그 flush |

종료 신호로 실행된 종료 훅은 신호 이름을 인자로 받을 수 있다.

위 훅들은 **request-scoped 클래스에는 호출되지 않는다** — 수명이 요청 단위(요청마다 생성, 응답 후 GC)라 앱 생명주기와 무관. init 계열(OnModuleInit, OnApplicationBootstrap)은 `app.init()`이나 `app.listen()`을 호출해야 트리거된다.
훅은 async 가능하다. init 훅은 Promise 완료를 기다린다. 종료 단계는 OnModuleDestroy handler들이 resolve 또는 reject된 뒤 다음 단계로 진행한다. 다만 Provider 간 세부 실행 순서와 오류 처리 구현은 프레임워크 버전에 따라 달라질 수 있으므로, 리소스 정리의 선후관계를 전역 훅 순서에 의존하지 않는다. 명시적인 소유자와 의존성을 두고 대상 Nest 버전에서 통합 테스트한다.

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
[OnModuleInit]                         ← module import 순서에 따라 이전 훅을 await
[OnApplicationBootstrap]               ← 모든 모듈 init 완료 후
... 요청 처리 ...
[OnModuleDestroy]                      ← app.close() 또는 종료 신호
[BeforeApplicationShutdown]            ← 모든 OnModuleDestroy 완료 후
[OnApplicationShutdown]
```

`OnModuleInit`과 `OnApplicationBootstrap`의 실행 순서는 module import 순서에 직접 의존하며 Nest는 이전 훅을 await한다. 반면 종료 훅의 전역 역순, 전역 모듈의 정확한 위치를 리소스 정리 계약으로 가정하지 않는다. 반드시 정해진 정리 순서가 있으면 한 Provider가 순서를 조정하거나 대상 Nest 버전 통합 테스트로 확인한다.

## OnModuleInit vs OnApplicationBootstrap

겉보기 비슷하지만 의미 다름.

- **OnModuleInit** — 이 모듈의 의존성이 다 해결됐다. *내 모듈 내부* 초기화에 적합.
- **OnApplicationBootstrap** — *전체 모듈 트리*가 준비됐다. 다른 모듈의 Provider를 호출해야 하는 작업, 스케줄러 시작에 적합.

전체 모듈이 준비된 뒤 시작해야 하는 작업은 `OnApplicationBootstrap`에 둔다. 특정 Provider의 준비 순서가 필요하면 import 순서의 우연에 기대지 말고 명시적인 초기화 API나 readiness 검증을 둔다.

## 면접 체크포인트

- Bootstrap 단계 순서 (NestFactory.create → 전역 설정 → 모듈 init → bootstrap → listen)
- `OnModuleInit` vs `OnApplicationBootstrap` 차이 — *내 모듈* vs *전체 트리*
- Constructor에서 비동기 작업 못 하는 이유, 대체 (OnModuleInit)
- init 훅은 module import 순서에 의존하며 이전 훅을 await
- 종료 단계의 순서 보장과 Provider 간 세부 순서는 구분하고, 의존하는 정리는 명시적으로 조정

## 관련 문서

- [[NestJS-Lifecycle|라이프사이클 인덱스]]
- [[NestJS-Lifecycle-Shutdown|종료와 리소스 정리]]
- [[NestJS-Module-Dynamic|Dynamic Module (registerAsync 옵션 초기화)]]

## 출처
- [NestJS — Lifecycle events](https://docs.nestjs.com/fundamentals/lifecycle-events)
