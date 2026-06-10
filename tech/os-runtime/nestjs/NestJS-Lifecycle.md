---
tags: [nestjs, lifecycle, bootstrap, hooks, graceful-shutdown]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Lifecycle", "Bootstrap", "OnModuleInit"]
---

# NestJS 애플리케이션 라이프사이클

NestJS 앱은 **Bootstrap → 모듈 초기화 → 요청 처리 → 종료** 순으로 진행. 각 단계에 훅이 있어 DI 컨테이너 위에서 안전하게 초기화, 정리 작업을 끼워 넣을 수 있다.

## 단계 개요

```
1. NestFactory.create()           → Provider 인스턴스화, DI 그래프 구성
2. 전역 설정 적용                  → useGlobalPipes/Filters/Interceptors, Express 미들웨어
3. OnModuleInit (각 모듈)          → 의존성 그래프 순서대로
4. OnApplicationBootstrap (각 모듈) → 모든 모듈 init 후
5. app.listen()                    → HTTP 서버 시작, 요청 수신
                                   ── 운영 ──
6. SIGTERM/SIGINT
7. OnModuleDestroy (각 모듈, 역순)
8. OnApplicationShutdown
9. 프로세스 종료
```

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

`enableShutdownHooks()` 호출 안 하면 `OnModuleDestroy`/`OnApplicationShutdown`이 신호로 트리거되지 않음. 컨테이너 환경(K8s SIGTERM)에서 필수.

## 생명주기 훅 6종

| 훅 | 시점 | 용도 |
|------|------|------|
| `OnModuleInit` | 모듈의 모든 의존성 해결 직후 | DB 연결, 초기 데이터 로드 |
| `OnApplicationBootstrap` | 모든 모듈 init 완료 후 | 외부 서비스 연결, 작업 스케줄러 시작, 다른 모듈 의존 작업 |
| `OnModuleDestroy` | 종료 신호 수신 시 (모듈별, 역순) | 리소스 정리, 큐 비우기 |
| `BeforeApplicationShutdown` | OnModuleDestroy 직후 | 종료 전 마지막 알림 (관제 통보) |
| `OnApplicationShutdown` | 마지막 단계 | 외부 연결 끊기, 로그 flush |
| (signal 인자 받음) | SIGTERM/SIGINT 등 | 신호 종류별 분기 처리 |

## 실행 순서 예시

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

## OnModuleInit vs OnApplicationBootstrap

겉보기 비슷하지만 의미 다름.

- **OnModuleInit** — 이 모듈의 의존성이 다 해결됐다. *내 모듈 내부* 초기화에 적합.
- **OnApplicationBootstrap** — *전체 모듈 트리*가 준비됐다. 다른 모듈의 Provider를 호출해야 하는 작업, 스케줄러 시작에 적합.

체감 차이: A가 B에 의존할 때 A의 `OnModuleInit`은 B의 `OnModuleInit` 후에 실행되지만, A가 *B의 다른 메서드를 호출*하기엔 불안정한 시점일 수 있음. 안전하게 다른 모듈을 쓰려면 `OnApplicationBootstrap`.

## 메모리 누수 방지 — 구독, 타이머, 이벤트 리스너 정리

장기 실행 Provider가 RxJS Subscription, `setInterval`, 이벤트 리스너를 만들었으면 종료 시 해제 필수. 안 하면 종료가 멈추거나, 핫 리로드 환경(dev)에서 누수 누적.

```ts
@Injectable()
export class OptimizedService implements OnModuleDestroy {
  private subscriptions: Subscription[] = [];
  private timers: NodeJS.Timeout[] = [];

  constructor(private events: EventEmitter2) {
    const sub = someObservable$.subscribe(() => {});
    this.subscriptions.push(sub);

    this.timers.push(setInterval(() => this.tick(), 5000));

    this.events.on('user.created', this.onUserCreated);
  }

  onModuleDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.timers.forEach(t => clearInterval(t));
    this.events.off('user.created', this.onUserCreated);
  }
}
```

REQUEST 스코프 Provider는 요청 종료 시 자동 GC지만, **DEFAULT 스코프(싱글톤)의 부수 효과**는 명시 정리해야 함.

## Graceful Shutdown 패턴

K8s/ECS 환경에서 **롤링 배포 중 in-flight 요청을 안전하게 마무리**하는 패턴.

```ts
// 1. 시그널 수신 시 헬스체크 unhealthy 응답으로 전환
@Injectable()
export class HealthService implements OnModuleDestroy {
  private isShuttingDown = false;

  isHealthy() { return !this.isShuttingDown; }

  onModuleDestroy() {
    this.isShuttingDown = true;
  }
}

// 2. enableShutdownHooks 활성화 → SIGTERM 들어오면
//    - HealthService가 unhealthy로 전환
//    - 로드밸런서가 트래픽 끊음 (헬스체크 실패)
//    - 진행 중 요청 끝나길 대기
//    - DB 연결, 큐 컨슈머 등 정리
```

`process.on('SIGTERM', ...)` 직접 등록도 가능하지만, NestJS 훅이 DI/모듈 의존 순서를 보장.

## 타임아웃, 강제 종료

종료 훅이 무한 대기에 걸리지 않게 외부에서 타임아웃을 강제. K8s `terminationGracePeriodSeconds` 기본 30초 — 이보다 짧게 정리 끝나야 함.

## 흔한 실수

- **enableShutdownHooks 호출 누락**: OnModuleDestroy 안 불림. K8s에서 in-flight 요청이 끊김.
- **OnModuleInit에서 다른 모듈 메서드 호출**: 그 모듈이 아직 init 안 됐을 수 있음. `OnApplicationBootstrap`로 미루기.
- **constructor에서 비동기 초기화**: 생성자는 동기 — `await` 못 씀. `OnModuleInit`으로.
- **종료 훅에서 새 비동기 작업 시작**: 정리 끝나기 전에 새 작업 만들면 영원히 안 끝남. 이미 시작된 작업 마무리만.
- **OnModuleDestroy에서 DB 쓰기 시도하다 연결 이미 끊김**: 다른 Provider의 종료가 먼저 일어났을 수 있음 — 의존성 순서 확인.

## 면접 체크포인트

- Bootstrap 단계 순서 (NestFactory.create → 전역 설정 → 모듈 init → bootstrap → listen)
- `OnModuleInit` vs `OnApplicationBootstrap` 차이 — *내 모듈* vs *전체 트리*
- `enableShutdownHooks()`의 역할 — 시그널 → 종료 훅 트리거
- Graceful Shutdown — 헬스체크 unhealthy 전환 → LB 트래픽 차단 → in-flight 요청 마무리
- K8s `terminationGracePeriodSeconds`와 종료 훅의 관계
- Constructor에서 비동기 작업 못 하는 이유, 대체 (OnModuleInit)
- 의존성 그래프 init 순서 — 의존받는 쪽이 먼저 init
- 종료는 init 역순

## 관련 문서

- [[NestJS|NestJS 요청 파이프라인]]
- [[NestJS-Module-Dynamic|Dynamic Module (registerAsync 옵션 초기화)]]
- [[NestJS-Cold-Start-Optimization|Cold Start 최적화 (Lazy Module로 init 비용 분산)]]
