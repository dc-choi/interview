---
tags: [nestjs, decorator, metadata, aop]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Custom Decorator", "커스텀 데코레이터"]
---

# NestJS 커스텀 데코레이터

`@Get`·`@Body`·`@UseGuards` 같은 NestJS 기본 데코레이터로 부족할 때, **메타데이터 + 런타임 탐색 + 실행 조작** 3단계를 직접 구현해 팀 고유의 횡단 관심사를 데코레이터로 표현할 수 있다. 서비스가 커질수록 Interceptor·Guard와 결합한 커스텀 데코레이터가 **반복 코드를 폭발적으로 줄인다**.

## 커스텀 데코레이터의 3단계 구조

```
1. 마킹 (SetMetadata)           ← 메서드·클래스에 메타데이터 부착
     ↓
2. 탐색 (DiscoveryService)       ← 앱 전체에서 마킹된 것 찾기
     ↓
3. 실행 (래핑 or 인터셉트)         ← 찾은 것에 동작 주입
```

## 1단계: 마킹 (Metadata 부착)

NestJS의 `SetMetadata()`는 내부적으로 `Reflect.defineMetadata()` 호출. `reflect-metadata` 폴리필 필요 (`tsconfig`의 `emitDecoratorMetadata: true`).

```ts
export const CACHEABLE_KEY = Symbol('cacheable');

export const Cacheable = (options: CacheOptions) =>
  SetMetadata(CACHEABLE_KEY, options);

// 사용
class UserService {
  @Cacheable({ ttl: 60 })
  getUser(id: string) { ... }
}
```

이 단계까진 **데이터만 붙임**. 실행 시 동작은 없음.

## 2단계: 탐색 (DiscoveryService + MetadataScanner)

NestJS의 `DiscoveryService`로 앱 전체 Provider를 훑고, `MetadataScanner`로 각 Provider의 메서드를 순회.

```ts
@Injectable()
export class CacheableExplorer implements OnModuleInit {
  constructor(
    private discoveryService: DiscoveryService,
    private metadataScanner: MetadataScanner,
    private reflector: Reflector,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    providers.forEach(wrapper => {
      const { instance } = wrapper;
      if (!instance) return;

      const prototype = Object.getPrototypeOf(instance);
      this.metadataScanner.scanFromPrototype(
        instance,
        prototype,
        (methodName) => this.wrapIfCacheable(instance, methodName),
      );
    });
  }

  private wrapIfCacheable(instance: any, methodName: string) {
    const method = instance[methodName];
    const options = this.reflector.get<CacheOptions>(CACHEABLE_KEY, method);
    if (!options) return;

    // 3단계로 전달
    this.wrap(instance, methodName, options);
  }
}
```

`OnModuleInit`에서 실행 → 앱 부팅 시 한 번만 스캔. 런타임 오버헤드 없음.

## 3단계: 실행 (메서드 래핑)

찾은 메서드를 **래퍼 함수로 교체**. 원본 호출 전후에 로직 주입.

```ts
private wrap(instance: any, methodName: string, options: CacheOptions) {
  const original = instance[methodName];
  const self = this;

  instance[methodName] = async function (...args: any[]) {
    const cacheKey = generateKey(methodName, args);
    const cached = await self.cacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await original.apply(this, args);
    await self.cacheManager.set(cacheKey, result, options.ttl);
    return result;
  };
}
```

### 중요: 메타데이터 보존

일반 데코레이터가 메서드를 래핑하면 **원본에 저장된 메타데이터가 증발**. NestJS의 Guard·Pipe 등이 메타데이터 기반이라 깨짐.

**해결**:
```ts
// 래퍼의 prototype을 원본으로 지정해 메타데이터 체인 유지
Object.setPrototypeOf(instance[methodName], original);
```

또는 `Reflect.getMetadataKeys(original)`로 키를 복사해 새 함수에 `defineMetadata`.

## Parameter Decorator (요청 파라미터 추출)

메서드 파라미터에 붙어 값을 주입하는 패턴.

```ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// 사용
@Get('me')
getMe(@CurrentUser() user: User) { ... }
```

`createParamDecorator`는 NestJS가 제공하는 팩토리. 파라미터 값을 ExecutionContext에서 뽑아 주입.

용도:
- `@CurrentUser` — JWT에서 추출된 사용자
- `@TraceId` — 요청 추적 ID
- `@ClientIp` — X-Forwarded-For 해석된 IP

## Method Decorator + Guard/Interceptor 조합

데코레이터 하나가 여러 NestJS 기본 데코레이터를 묶는 **`applyDecorators`** 패턴:

```ts
export const AdminOnly = () =>
  applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    SetMetadata('roles', ['admin']),
    ApiBearerAuth(),
  );

// 사용
@AdminOnly()
@Delete(':id')
delete(@Param('id') id: string) { ... }
```

반복되는 3줄이 한 줄로 정리. 팀 컨벤션 강제도 쉬워짐.

## 오픈소스: @toss/nestjs-aop

위의 3단계 구조(마킹·탐색·실행)를 라이브러리화한 **`@toss/nestjs-aop`**. 보일러플레이트 크게 감소.

```ts
// 1. Aspect 정의
@Aspect(CacheableSymbol)
export class CacheableAspect implements LazyDecorator<any, CacheOptions> {
  wrap({ method, metadata }: WrapParams<any, CacheOptions>) {
    return async (...args: any[]) => {
      // 캐시 로직
      return method(...args);
    };
  }
}

// 2. Decorator 생성
export const Cacheable = (options: CacheOptions) =>
  createDecorator(CacheableSymbol, options);

// 3. 사용
class UserService {
  @Cacheable({ ttl: 60 })
  getUser(id: string) { ... }
}
```

직접 DiscoveryService·MetadataScanner 다루는 대신 `@Aspect`·`LazyDecorator` 추상화로. 팀 내 AOP 데코레이터가 많아지면 도입 고려.

## 흔한 실수

### 메타데이터 소실
래퍼 함수로 교체 후 Guard가 동작 안 함 → prototype·메타데이터 복사 누락.

### 순환 의존
커스텀 데코레이터 Explorer가 다른 Provider에 의존 → 그 Provider가 커스텀 데코레이터 사용 → 초기화 순서 꼬임. **Lazy 주입 or 별도 초기화 단계**.

### 테스트 어려움
래핑된 메서드가 원본과 다르게 동작 → 유닛 테스트 복잡화. **Aspect를 Mock으로 교체**하거나, 핵심 로직은 데코레이터 없이 직접 호출.

### 과도한 AOP
모든 반복을 데코레이터로 바꾸려는 유혹 → 디버깅 어려움·학습 곡선. 비즈니스 로직은 드러나는 게 낫다. **정말 횡단적인 것만** (캐싱·로깅·권한·트랜잭션).

## 면접 체크포인트

- NestJS 커스텀 데코레이터의 3단계 (마킹·탐색·실행)
- `SetMetadata` + `Reflector` 조합 원리
- `DiscoveryService`·`MetadataScanner`가 OnModuleInit에서 하는 일
- 메서드 래핑 시 메타데이터 보존 방법
- `createParamDecorator`의 용도와 예시
- `applyDecorators`로 여러 데코레이터를 묶는 이유
- 과도한 AOP·데코레이터 남용의 폐해

## 출처
- [Toss Tech — NestJS 환경에 맞는 Custom Decorator 만들기](https://toss.tech/article/nestjs-custom-decorator)

## 관련 문서
- [[NestJS|NestJS 개요]]
- [[NestJS-AOP-Interceptor|Interceptor 기반 AOP]]
- [[Clean-Architecture-NestJS|Clean Architecture with NestJS]]
