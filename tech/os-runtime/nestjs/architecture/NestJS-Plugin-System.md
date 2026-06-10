---
tags: [nestjs, plugin, discovery-service, dynamic-module, extensibility]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Plugin System", "DiscoveryService Plugin", "확장 시스템"]
---

# NestJS 플러그인 시스템

`DiscoveryService`로 앱 전체 Provider를 훑고 **메타데이터로 표시된 것들만 골라 부팅 시 일괄 초기화**. 외부 코드(또는 도메인 모듈)가 핵심 코드를 건드리지 않고 기능을 끼워 넣는 확장 지점.

## 동작 모델

```
1. @Plugin() 메타데이터로 플러그인 클래스 마킹
2. PluginLoader가 OnModuleInit 시점에 DiscoveryService.getProviders() 순회
3. 메타데이터가 붙은 Provider만 필터링
4. 각 인스턴스의 initialize() 호출 — 핵심 코드는 변경 없음
```

[[NestJS-Custom-Decorator|커스텀 데코레이터]]의 3단계(마킹, 탐색, 실행) 패턴 위에 만들어지며, **클래스 단위 확장**에 특화.

## 기본 구조

```ts
export const PLUGIN = Symbol('isPlugin');
export const Plugin = () => SetMetadata(PLUGIN, true);

interface PluginContract {
  initialize(): Promise<void>;
}

@Plugin()
@Injectable()
export class AnalyticsPlugin implements PluginContract {
  async initialize() {
    // hook 등록, 이벤트 구독, 외부 SDK 초기화
  }
}

@Injectable()
export class PluginLoader implements OnModuleInit {
  private readonly logger = new Logger(PluginLoader.name);

  constructor(private discoveryService: DiscoveryService) {}

  async onModuleInit() {
    const plugins = this.discoveryService
      .getProviders()
      .filter(w => w.metatype && Reflect.getMetadata(PLUGIN, w.metatype))
      .map(w => w.instance as PluginContract);

    for (const p of plugins) {
      await p.initialize();
      this.logger.log(`Plugin loaded: ${p.constructor.name}`);
    }
  }
}
```

`OnModuleInit` 시점이라 모든 Provider 인스턴스가 준비된 후 실행 — 다른 모듈에 의존해도 안전.

## 동적 모듈과 결합

플러그인이 **옵션을 받아 모듈로 노출**되는 형태가 흔함. 사용처가 `forRootAsync`로 설정만 넘기면 알아서 등록, 연결.

```ts
export class ConfigurableFeatureModule {
  static forRootAsync(options: ConfigurableFeatureAsyncOptions): DynamicModule {
    return {
      module: ConfigurableFeatureModule,
      imports: options.imports || [],
      providers: [
        {
          provide: FEATURE_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
      exports: [FEATURE_MODULE_OPTIONS],
      global: options.global || false,
    };
  }
}
```

ConfigService 등 다른 Provider 의존 옵션도 자연스럽게 처리. 자세한 패턴은 [[NestJS-Module-Dynamic|Dynamic Module]].

## 플러그인 라이프사이클 확장

`initialize()` 외에 종료, 헬스체크 등 다단계 컨트랙트로 확장 가능.

```ts
interface FullPluginContract {
  initialize(): Promise<void>;
  healthCheck?(): Promise<boolean>;
  shutdown?(): Promise<void>;
}
```

PluginLoader가 `OnModuleDestroy`도 구현해 종료 시 역순 `shutdown()` 호출 → 리소스 정리.

## 메타데이터 확장 — 플러그인 분류, 우선순위

마킹 데코레이터에 옵션을 받으면 그룹, 순서, 조건 부팅을 표현.

```ts
export const Plugin = (options: { priority?: number; group?: string } = {}) =>
  SetMetadata(PLUGIN, { ...options, isPlugin: true });

// Loader에서
const plugins = this.discoveryService.getProviders()
  .map(w => ({ wrapper: w, meta: Reflect.getMetadata(PLUGIN, w.metatype) }))
  .filter(x => x.meta?.isPlugin)
  .sort((a, b) => (a.meta.priority ?? 0) - (b.meta.priority ?? 0));
```

## 트레이드오프

| 축 | 플러그인 시스템 도입 | 단순 명시 import |
|----|--------------------|----------------|
| 확장성 | 외부에서 끼워 넣기 쉬움 | 새 기능마다 코드 수정 |
| 부팅 시간 | 스캔, initialize 누적 | 빠름 |
| 의존 추적 | 암묵적 (메타데이터로 발견) | 명시적 (import 그래프에 표시) |
| 디버깅 | 호출 흐름이 코드만으로 안 보임 | 추적 쉬움 |
| 테스트 | 플러그인 격리 어려움 | 모듈 단위 mock 단순 |

**도입 시점**: 플러그인이 3~4개 이상 모이고, 각각 독립 도메인 모듈에서 제공될 때. 1~2개면 명시 등록이 더 깔끔.

## 흔한 실수

- **PluginLoader가 다른 Provider에 의존하고 그 Provider가 플러그인** → 초기화 순서 꼬임. Loader는 의존을 최소화하거나 `OnApplicationBootstrap`로 미루기.
- **initialize()에서 무거운 외부 호출 + 부팅 블로킹**: 부팅 시간 폭증. 백그라운드 실행 또는 헬스체크 통과 전까지 ready 미반환.
- **플러그인 실패가 부팅 자체를 막음**: 선택적 플러그인은 try-catch로 격리, 핵심 플러그인만 실패 시 throw.
- **메타데이터 키가 문자열로 충돌**: `Symbol`로 충돌 회피.
- **다중 인스턴스 환경에서 같은 외부 hook을 모든 인스턴스가 등록**: 중복 처리. 리더 인스턴스만 등록하거나 멱등성 보장.

## 면접 체크포인트

- 플러그인 시스템이 해결하는 문제 — 핵심 코드 변경 없이 기능 추가 (Open-Closed Principle)
- `DiscoveryService` + `Reflect.getMetadata` 조합 동작
- `OnModuleInit` vs `OnApplicationBootstrap` 어느 시점에 로드해야 안전한지
- 동적 모듈과 결합 — `forRootAsync`로 옵션 전달
- 도입의 트레이드오프 — 부팅 시간, 암묵적 의존성, 디버깅 어려움
- 플러그인 우선순위, 그룹화 — 메타데이터 옵션 활용
- 다중 인스턴스 환경에서 외부 hook 등록의 중복 문제

## 관련 문서

- [[NestJS-Custom-Decorator|커스텀 데코레이터 (마킹, 탐색, 실행 3단계)]]
- [[NestJS-Module-Dynamic|Dynamic Module, forRootAsync]]
- [[NestJS-Lifecycle|애플리케이션 라이프사이클 훅]]
- [[NestJS-AOP-Interceptor|Interceptor 기반 AOP]]
