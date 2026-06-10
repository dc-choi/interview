---
tags: [nestjs, decorator, metadata, aop]
status: done
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
