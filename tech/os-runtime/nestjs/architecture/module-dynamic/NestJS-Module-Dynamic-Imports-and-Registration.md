---
tags: [nestjs, module, dynamic-module]
status: done
verified_at: 2026-08-26
category: "OS & Runtime - NestJS"
aliases: ["NestJS Dynamic Module", "Global Module", "register registerAsync"]
---

# NestJS Dynamic Module: Import와 등록

`@Module()` 데코레이터의 기본 사용법(imports/exports/providers/controllers) 위에, **런타임 설정을 받아 모듈 자체를 생성, 구성**하는 패턴들. ConfigModule, TypeOrmModule, JwtModule 같은 라이브러리가 모두 이 구조 위에 있다.

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

한 번 import하면 **모든 모듈에서 별도 import 없이** 사용 가능. 루트 모듈 트리에 한 번만 등록되며, 보통 **인프라성 Provider**(Logger, DB Connection, EventBus)에 적합.

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
| `forRoot(options)` | 앱 전역 1회 — DB, Cache, Queue 같은 싱글톤성 인프라 |
| `forRootAsync(options)` | 위와 동일하나 옵션을 다른 Provider에 의존해 비동기로 생성 |
| `forFeature(options)` | 도메인/모듈별 — TypeOrmModule.forFeature([User]) 같은 기능 등록 |
| `register(options)` | 옵션 인자로 모듈 인스턴스 생성 — forRoot보다 가벼운 용도 |

v11부터 동적 모듈의 동일성은 **객체 참조**로 판정한다 — v10까지는 동적 메타데이터의 딥 해시로 같은 `forFeature([User])` 호출들을 한 노드로 중복 제거했지만, 이제 호출마다 별개 모듈이다. **여러 모듈이 같은 동적 모듈을 공유하려면 변수에 담아 그 참조를 import**한다 (성능, 메모리 개선 목적. 통합 테스트에서 의존성 인스턴스가 여러 개 생기는 영향과 대응은 [[NestJS-Testing|NestJS 테스트]]).

## `registerAsync` — 비동기, DI 의존 옵션

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

## 출처
- [NestJS — Dynamic modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [NestJS — Migration guide (v11)](https://docs.nestjs.com/v11/migration-guide)
