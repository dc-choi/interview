---
tags: [nestjs, decorator, metadata, aop]
status: done
verified_at: 2026-08-26
category: "OS & Runtime - NestJS"
aliases: ["커스텀 데코레이터 3단계 구조", "마킹 탐색 실행 파이프라인"]
---

# NestJS 커스텀 데코레이터 — 3단계 구조

## 커스텀 데코레이터의 3단계 구조

```
1. 마킹 (SetMetadata)           ← 메서드, 클래스에 메타데이터 부착
     ↓
2. 탐색 (DiscoveryService)       ← 앱 전체에서 마킹된 것 찾기
     ↓
3. 실행 (래핑 or 인터셉트)         ← 찾은 것에 동작 주입
```

## 1단계: 마킹 (Metadata 부착)

NestJS의 `SetMetadata()`는 내부적으로 `Reflect.defineMetadata()`를 호출해 커스텀 메타데이터를 붙인다. 이를 위해 `reflect-metadata`가 로드되어야 한다. `emitDecoratorMetadata`는 TypeScript가 타입 기반 design metadata를 내보내는 별도 옵션이므로, `SetMetadata()` 자체의 필수 조건은 아니다.

```ts
export const CACHEABLE_KEY = Symbol('cacheable');

export const Cacheable = (options: CacheOptions) =>
  SetMetadata(CACHEABLE_KEY, options);

// 사용
class UserService {
  @Cacheable({ ttl: 60_000 }) // cache-manager TTL은 밀리초
  getUser(id: string) { ... }
}
```

이 단계까진 **데이터만 붙임**. 실행 시 동작은 없음.

## 2단계: 탐색 (DiscoveryService + MetadataScanner)

NestJS의 `DiscoveryService`로 앱 전체 Provider를 훑고, `MetadataScanner`로 각 Provider의 메서드를 순회.

```ts
import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';

@Injectable()
export class CacheableExplorer implements OnModuleInit {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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

`OnModuleInit`에서 앱 부팅 시 한 번만 스캔한다. 반복 스캔 비용은 없지만 교체된 wrapper와 캐시 조회 비용은 각 호출에 남는다.

- **DiscoveryModule import 필수**: `DiscoveryService`를 주입받으려면 그 모듈의 imports에 `DiscoveryModule`(@nestjs/core)을 등록해야 한다.
- 캐시를 쓰는 모듈은 `CacheModule`을 등록하고, `CacheableExplorer` 자체도 해당 모듈의 `providers`에 넣어야 초기화 훅이 실행된다.
- `getProviders()`처럼 `getControllers()`도 있다 — 컨트롤러 대상 일괄 처리(분석 트래킹, 자동 등록)에 사용.
- **전용 데코레이터 팩토리**: `DiscoveryService.createDecorator()`로 만든 데코레이터(`@FeatureFlag('experimental')`)는 `discoveryService.getMetadataByDecorator(FeatureFlag, wrapper)`로 읽는다 — SetMetadata + Reflector 조합 없이 wrapper 단위로 바로 필터링하는 API.

```ts
@Module({
  imports: [DiscoveryModule, CacheModule.register()],
  providers: [CacheableExplorer],
})
export class CacheableModule {}
```

## 3단계: 실행 (메서드 래핑)

찾은 메서드를 **래퍼 함수로 교체**. 원본 호출 전후에 로직 주입.

```ts
private wrap(instance: any, methodName: string, options: CacheOptions) {
  const original = instance[methodName];
  const self = this;

  instance[methodName] = async function (...args: any[]) {
    const cacheKey = generateKey(methodName, args);
    const cached = await self.cacheManager.get(cacheKey);
    // 이 예제에서 cache miss는 undefined다. 0, false, 빈 문자열, null은 유효한 hit다.
    if (cached !== undefined) return cached;

    const result = await original.apply(this, args);
    await self.cacheManager.set(cacheKey, result, options.ttl);
    return result;
  };
}
```

### 중요: 메타데이터 보존

일반 데코레이터가 메서드를 래핑하면 **원본에 저장된 메타데이터가 증발**. NestJS의 Guard, Pipe 등이 메타데이터 기반이라 깨짐.

**해결**:
```ts
// 래퍼의 prototype을 원본으로 지정해 메타데이터 체인 유지
Object.setPrototypeOf(instance[methodName], original);
```

또는 `Reflect.getMetadataKeys(original)`로 키를 복사해 새 함수에 `defineMetadata`.

## 관련 문서
- [[NestJS-Custom-Decorator|NestJS 커스텀 데코레이터 (TOC)]]
- [[NestJS-Custom-Decorator-Patterns|커스텀 데코레이터 활용 패턴]]
- [[NestJS-Custom-Decorator-Pitfalls|@toss/nestjs-aop과 흔한 실수]]

## 출처
- [NestJS — Discovery service](https://docs.nestjs.com/fundamentals/discovery-service)
- [NestJS — Caching](https://docs.nestjs.com/techniques/caching)
- [NestJS — SetMetadata decorator source](https://github.com/nestjs/nest/blob/master/packages/common/decorators/core/set-metadata.decorator.ts)
