---
tags: [nestjs, module, dynamic-module]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Dynamic Module", "Global Module", "register registerAsync"]
---

# NestJS Module 시스템 — Dynamic / Global Module

`@Module()` 데코레이터의 기본 사용법(imports/exports/providers/controllers) 위에, **런타임 설정을 받아 모듈 자체를 생성·구성**하는 패턴들. ConfigModule·TypeOrmModule·JwtModule 같은 라이브러리가 모두 이 구조 위에 있다.

## Static Import vs Dynamic Import

```ts
@Module({
  imports: [
    // 정적 — 모듈 자체를 그대로
    UserModule,

    // 동적 — 모듈이 호출 시점에 설정으로 빌드됨
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
      }),
      inject: [ConfigService],
    }),

    // 조건부 — 환경별 모듈 끼우기
    ...(process.env.NODE_ENV === 'development' ? [DevModule] : []),
  ],
})
```

## Global Module — `@Global()`

한 번 import하면 **모든 모듈에서 별도 import 없이** 사용 가능. 루트 모듈 트리에 한 번만 등록되며, 보통 **인프라성 Provider**(Logger·DB Connection·EventBus)에 적합.

```ts
@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
```

- 남용 금지 — 어디서든 보이지만, 의존 관계가 **암묵적**이 되어 모듈 경계가 흐려짐.
- 도메인 Provider는 명시적 import 우선.

## Dynamic Module — `register()` / `forRoot()` / `forFeature()`

모듈 import 시점에 **옵션을 인자로 받아** Provider 구성을 결정. 같은 모듈이 여러 인스턴스로 쓰일 수 있게 됨.

```ts
@Module({})
export class ConfigurableModule {
  static register(options: ModuleOptions): DynamicModule {
    return {
      module: ConfigurableModule,
      providers: [
        { provide: 'MODULE_OPTIONS', useValue: options },
        SomeService,
      ],
      exports: [SomeService],
    };
  }
}

// 사용
@Module({
  imports: [ConfigurableModule.register({ apiKey: 'xxx' })],
})
export class AppModule {}
```

### 명명 컨벤션

| 메서드 | 용도 |
|--------|------|
| `forRoot(options)` | 앱 전역 1회 — DB·Cache·Queue 같은 싱글톤성 인프라 |
| `forRootAsync(options)` | 위와 동일하나 옵션을 다른 Provider에 의존해 비동기로 생성 |
| `forFeature(options)` | 도메인/모듈별 — TypeOrmModule.forFeature([User]) 같은 기능 등록 |
| `register(options)` | 옵션 인자로 모듈 인스턴스 생성 — forRoot보다 가벼운 용도 |

## `registerAsync` — 비동기·DI 의존 옵션

옵션이 다른 Provider(예: `ConfigService`)에 의존하거나 비동기 호출 결과로 결정될 때.

```ts
static registerAsync(options: ModuleAsyncOptions): DynamicModule {
  return {
    module: ConfigurableModule,
    imports: options.imports || [],
    providers: [
      {
        provide: 'MODULE_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      SomeService,
    ],
    exports: [SomeService],
  };
}

// 사용
ConfigurableModule.registerAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({ apiKey: config.get('API_KEY') }),
  inject: [ConfigService],
});
```

`useFactory` / `useClass` / `useExisting` 세 가지 패턴을 다 지원하도록 만드는 것이 라이브러리 모듈의 표준.

## 순환 참조와 `forwardRef()`

A → B, B → A 양방향 의존이 발생할 때 NestJS가 모듈/Provider 등록 순서를 결정 못 함. `forwardRef()`로 lazy 참조.

```ts
@Module({
  imports: [forwardRef(() => UserModule)],
})
export class AuthModule {}

@Injectable()
export class AuthService {
  constructor(@Inject(forwardRef(() => UserService)) private userService: UserService) {}
}
```

근본 해결은 **단방향 의존**으로 모듈 경계 재설계. `forwardRef`는 구조가 정말 어쩔 수 없을 때만. 5가지 해결 전략(forwardRef·ModuleRef·Event·Facade·Domain) 비교·트레이드오프·자동화 방어는 [[NestJS-Circular-Dependency|순환 의존성 해결 전략]].

### 이벤트 기반 대안

순환의 근본 원인이 "A가 B를 호출해 알리고, B도 A에 알려야" 같은 상호 통보인 경우, **EventEmitter/Pub-Sub로 연결을 끊는 것**이 정공법.

```ts
// Before: AService → BService, BService → AService (순환)
// After: 둘 다 EventEmitter만 의존
@Injectable()
export class AService {
  constructor(private events: EventEmitter2) {}
  doWork() {
    this.events.emit('a.done', { id: 1 });
  }
}

@Injectable()
export class BService implements OnModuleInit {
  constructor(private events: EventEmitter2) {}
  onModuleInit() {
    this.events.on('a.done', payload => this.handleA(payload));
  }
}
```

호출 → 통보 → 응답 패턴이 **느슨하게 결합**되며, 새 구독자가 늘어도 발행자 수정 불필요. 단점은 호출 흐름이 코드만 봐서는 안 보여 디버깅 추적성이 떨어짐 → 도메인 이벤트 카탈로그 문서화 병행.

## exports 규칙

- export하지 않은 Provider는 **모듈 외부에서 주입 불가**.
- export 토큰은 `provide` 토큰과 동일해야 함 — 클래스 토큰이면 클래스, 문자열/Symbol 토큰이면 그대로.
- 다른 모듈을 그대로 re-export 가능: `exports: [UserService, OtherModule]`.

## 흔한 실수

- **Global 남용**: 모든 인프라성 Provider를 Global로 → 의존 관계 추적 불가, 테스트 격리 어려움.
- **register vs forRoot 혼용**: 의도가 같은 모듈에 두 메서드 정의 → 사용처마다 호출이 달라 일관성 깨짐.
- **forwardRef로 순환 회피만**: 근본 원인은 모듈 경계 설계 — `forwardRef`를 쓰는 순간 리팩토링 검토 시그널.
- **registerAsync에서 inject 누락**: 옵션 팩토리가 `ConfigService` 받는데 `inject: []` → 런타임에 `undefined`.

## 면접 체크포인트

- Static Module vs Dynamic Module 차이 — 옵션 인자로 모듈 구성을 결정하느냐
- `@Global()`을 언제 쓰고 언제 피해야 하는지
- `forRoot` / `forFeature` / `register` 컨벤션의 의미
- `registerAsync` 패턴 — `useFactory` + `inject`로 다른 Provider에 의존하는 옵션 만들기
- 순환 참조 발생 시 `forwardRef`로 임시 해결, 근본은 모듈 단방향화
- export하지 않은 Provider는 외부 주입 불가

## 관련 문서

- [[NestJS|NestJS 개요 · DI · 모듈 기본]]
- [[NestJS-Lifecycle|NestJS Lifecycle (Bootstrap 단계·생명주기 훅)]]
- [[NestJS-vs-Spring|NestJS vs Spring (DI 모듈 비교)]]
