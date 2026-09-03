---
tags: [runtime, nestjs, cache, interceptor, decorator]
status: done
verified_at: 2026-08-26
category: "OS & Runtime"
aliases: ["NestJS Caching", "NestJS 캐시 통합", "NestJS Cache Integration"]
---

# NestJS Caching Integration

NestJS의 **Interceptor, Decorator, Provider, Module** 메커니즘으로 캐시를 통합하는 패턴. 캐시 일반론은 [[Cache-Strategies|Cache 전략]], [[Multi-Level-Cache|Multi-Level Cache]] 참조, 여기서는 NestJS 컨텍스트에서 어떻게 매핑하는지에 집중.

## 통합 지점 — NestJS의 어디에서 캐시를 거는가

| 지점 | 적합 | 부적합 |
|------|------|-------|
| **Interceptor** | HTTP, WebSocket, 마이크로서비스 handler 응답 캐시 | 임의의 서비스 메서드, 세밀한 무효화 |
| **Handler 데코레이터** | 컨트롤러와 transport handler별 TTL, 키 설정 | 일반 Provider 메서드 |
| **Provider 직접 호출** | 서비스 메서드, Multi-Level, Stampede 보호 등 복잡한 로직 | 보일러플레이트 ↑ |
| **Middleware** | 요청 단계 정적 자원 캐시 | 비즈니스 로직 |

요청 파이프라인 ([[NestJS|NestJS 요청 처리]]): `Middleware → Guard → Interceptor → Pipe → Handler → Filter`. 캐시는 보통 Interceptor (요청, 응답 양쪽 접근)나 Provider 직접 호출.

## 공식 CacheModule 메커니즘 (@nestjs/cache-manager)

- `CacheModule.register()` — 기본 인메모리. 저장 값은 structured clone 알고리즘이 지원하는 타입만.
- 수동 조작: `@Inject(CACHE_MANAGER) private cache: Cache` 주입 후 `get`(미존재 시 현재 버전은 `undefined`, cache-manager v6 이하에서는 `null`. 마이그레이션 호환이 필요하면 `value == null`로 두 miss 값만 확인하고 `0`, `false`, 빈 문자열 같은 유효한 hit를 일반 falsy 검사로 버리지 않는다), `set(key, value, ttl)` — **TTL 단위는 밀리초**, `ttl 0`이면 만료 없음, `del`, `clear`.
- `CacheInterceptor` 자동 응답 캐시 — **GET 엔드포인트만** 캐시되고, `@Res()`를 주입한 라우트는 사용 불가. **GraphQL에서는 인터셉터가 필드 리졸버마다 실행되므로 CacheModule이 제대로 동작하지 않는다** (공식 경고).
- 캐시 키는 HTTP에선 요청 URL 기준 — Authorization 헤더별 분리 같은 커스텀은 `CacheInterceptor`를 상속해 `trackBy(context)`를 오버라이드.
- `@CacheKey`, `@CacheTTL`로 라우트별 오버라이드. WebSocket/마이크로서비스 핸들러에도 적용 가능하지만 그땐 `@CacheKey` 명시가 필수.
- 스토어: cache-manager v6+는 **Keyv 기반** — Redis는 `@keyv/redis`(KeyvRedis), 인메모리 LRU는 cacheable의 KeyvCacheableMemory, `stores: [...]` 배열로 L1+L2 다층 구성이 공식 경로.

## 패턴 1 — Handler 데코레이터 + Interceptor

`applyDecorators(SetMetadata(...), UseInterceptors(CacheInterceptor))`로 컨트롤러, Gateway나 마이크로서비스 handler에 캐시 설정을 부착한다. Nest는 임의의 Provider 메서드 호출에 interceptor를 적용하지 않으므로 서비스 메서드 캐싱에는 이 패턴을 쓰지 않는다. Interceptor는 `Reflector`로 메타데이터를 읽고, hit면 `of(value)`로 단락하고 miss면 `next.handle().pipe(tap(...))`으로 결과를 적재한다. 서비스 계층에서는 캐시 Provider를 명시적으로 호출하거나 [[NestJS-Custom-Decorator-Pipeline|Provider 래핑 방식]]을 사용한다.

옵션 구성: `{ key, ttl, level: 'L1'|'L2'|'L1+L2', stampedeProtection }`. `key`는 문자열 또는 인자 기반 함수.

## 패턴 2 — Multi-Level Provider

L1(인메모리 LRU) + L2(Redis)를 단일 Provider(`MultiLevelCacheService`)로 묶어 컨트롤러는 의식하지 않게. `get(key, loader)` 한 메서드로 L1 → L2 → loader 순 조회 + 양쪽 적재.

LRUCacheService는 `Map + 이중 연결 리스트`로 O(1) get/set/eviction. capacity는 보통 1만~10만, 그 이상은 GC 부담. 자세한 계층 설계는 [[Multi-Level-Cache]].

## 패턴 3 — Stampede 보호 통합

`Reflector`로 `stampedeProtection` 플래그 확인 후 분산 락 또는 XFetch 적용. 핵심 컴포넌트:

| 컴포넌트 | 역할 |
|---------|------|
| **inflight Map (프로세스 내)** | Single-flight — 같은 키 중복 요청 합치기 |
| **Redis SET NX EX (분산)** | 멀티 인스턴스에서 한 인스턴스만 DB 조회 |
| **Lua 스크립트** | 자기 락만 atomic 해제 (`get` + `del` 단일 실행) |
| **XFetch (확률적 조기 갱신)** | 락 없이 만료 직전부터 일부 요청만 갱신 |

Lua 스크립트의 atomic 해제 — 락 TTL 만료 후 다른 요청이 새 락을 잡았을 때 **자기 락 토큰 검증 없이 DEL하면 남의 락을 풀어버림**. `if get == own_token then del`을 EVAL로.

자세한 Stampede 알고리즘은 [[Cache-Stampede]].

## 패턴 4 — 멀티 인스턴스 캐시 일관성 (Pub/Sub)

NestJS 인스턴스 N개의 L1 캐시는 **각 프로세스 독립** — 한 인스턴스가 DB 갱신해도 다른 인스턴스 L1은 stale.

`OnModuleInit`에서 `redis.duplicate()`로 별도 connection을 만들고 `cache:invalidation` 채널을 구독한다. 쓰기는 **DB commit → 공유 L2 삭제 또는 갱신 → writer의 L1 삭제 또는 갱신 → `{ key, instanceId, op }` publish → 다른 인스턴스의 L1 삭제** 순서로 처리한다. L2를 먼저 처리해야 다른 인스턴스가 L1을 비운 직후 stale L2로 다시 채우지 않는다. 자기 메시지를 무시해도 안전한 이유는 publish 전에 writer가 L2와 자기 L1을 이미 처리했기 때문이다.

핵심 디테일:
- **별도 Redis 커넥션** — `duplicate()`. RESP2 연결은 구독 상태에서 구독 제어와 `PING`, `QUIT`, `RESET`만 허용하고, RESP3는 임의 명령도 허용한다. 프로토콜과 무관하게 구독 전용 연결을 분리하는 편이 안전
- **L2 우선 무효화** — 공유 L2를 먼저 삭제하거나 갱신한 뒤 각 인스턴스의 L1을 비움
- **writer L1 직접 처리** — L2 처리 뒤 writer의 L1을 삭제하거나 새 값으로 갱신하고 publish
- **자기 메시지 무시** — 로컬 무효화가 끝난 뒤 instanceId 필터로 echo 방지
- **DB/Redis 원자성 한계** — DB commit과 L2 무효화, publish는 한 transaction이 아니다. 실패 재시도와 transactional outbox를 두고 TTL로 stale 상한을 제한한다. 강한 read-after-write가 필요하면 versioned key나 cache bypass 같은 별도 계약이 필요
- **at-most-once 한계** — Pub/Sub 메시지가 유실될 수 있으므로 L1 TTL로 stale 상한을 제한
- **Cluster** — 일반 Pub/Sub은 모든 노드 브로드캐스트, 7.0+의 Sharded Pub/Sub (SPUBLISH) 사용

영속과 ACK가 필요해도 하나의 shared Consumer Group을 쓰면 안 된다. 같은 group에서는 이벤트를 인스턴스 하나만 받아 L1 무효화가 fan-out되지 않는다. 안정적인 인스턴스 식별자마다 독립 group/offset을 두고 retention, 재접속 catch-up과 폐기된 group 정리를 운영하거나, outbox와 durable fan-out 구독을 사용한다. [[Redis-Streams-PubSub|Streams와 Consumer Group 차이]] 및 [[Cache-Invalidation]] 참고.

## 패턴 5 — CacheModule.registerAsync (Global)

`@nestjs/cache-manager`로 표준 캐시 매니저 등록 (`CacheModule.registerAsync({ isGlobal: true, useFactory })`). Redis 스토어는 cache-manager v6+ 기준 Keyv 어댑터(`@keyv/redis`)로 연결한다 — `cache-manager-redis-yet`은 v5 시절 스토어 패키지. 직접 만든 Provider(LRU, MultiLevel, Stampede, Coherency)와 병행 가능. 자세한 동적 모듈 패턴은 [[NestJS-Module-Dynamic]].

`@Global()` 사용 시 imports에 매번 추가할 필요 없지만 의존 방향이 흐려질 수 있어, 도메인 모듈에서만 쓰는 캐시는 모듈 단위로 두는 것도 정당.

## 패턴 6 — 메트릭 노출 (Prometheus)

`CacheMetricsService`가 hits, misses, latencies(p50, p95, p99), topMissedKeys 추적, `/metrics` 엔드포인트에서 `cache_hit_rate`, `cache_requests_total`, `cache_latency_p99` 등을 Prometheus 형식으로 노출. 운영 판단은 워크로드별 기준선과 목표 대비 hit rate가 지속 하락할 때 캐시 도입 가치, 키, TTL을 재검토한다 ([[Cache-Decision]]). p99 급등은 Redis 부하나 네트워크를, topMissedKeys의 동일 키 반복은 무효화 누락을 의심할 신호다.

## NestJS 특이 주의점

- **REQUEST scope Provider 주입 X** — 캐시 서비스는 보통 DEFAULT(싱글톤). REQUEST를 주입받으면 캐시도 REQUEST scope로 전파되어 매 요청 새 인스턴스
- **Lifecycle 훅** — `OnModuleInit`에서 Pub/Sub를 구독한다. `OnApplicationShutdown`은 `app.close()`를 호출했거나 bootstrap에서 `app.enableShutdownHooks()`를 켠 뒤 `SIGTERM` 같은 종료 신호를 받을 때만 기대할 수 있다. Write-Back flush와 subscriber 종료는 이 경로에 두되, 영속성 보장으로 취급하지 않는다
- **Microservice 환경** — `ClientProxy`로 RPC 호출 결과 캐시할 때 RxJS Observable 캐싱 주의 (subscribe 시점마다 실행)
- **GraphQL** — DataLoader가 요청 내 N+1 해결, 그 위에 [[Multi-Level-Cache|MultiLevelCache]]로 요청 간 캐시 ([[NestJS-GraphQL]])
- **테스트** — `overrideProvider`로 캐시 서비스를 Mock으로 교체 ([[NestJS|TestingModule]])

## 흔한 실수

- **Interceptor에서 직접 Promise resolve** — RxJS Observable 강제 ([[NestJS-AOP-Interceptor]]). `of(value)`로 감쌈
- **캐시 키에 `JSON.stringify(req.params)`** — 키 순서 다르면 다른 키. 정렬, 정규화 필요
- **REQUEST scope 캐시** — 매 요청 새 LRU 생성 → 사실상 캐시 없음
- **Pub/Sub subscriber connection에 일반 명령 실행** — subscriber mode 연결은 일반 명령에 쓰지 않고 `duplicate()`로 별도 연결 사용
- **종료 훅만으로 Write-Back 내구성 보장 기대** — `SIGKILL`, 프로세스 crash, 종료 유예시간 초과에는 훅이 실행되지 않을 수 있다. flush는 시간 제한을 두고, 중요한 쓰기는 영속 저장소나 재처리 가능한 queue와 startup recovery로 보호
- **Reflector를 비즈니스 컨트롤러에서 직접 해석** — 메타데이터 해석을 Interceptor, Guard나 전용 Provider에 모아 횡단 관심사를 분리
- **CacheModule.register만으로 멀티 인스턴스 일관성 기대** — Pub/Sub 무효화 별도 구현 필수

## 면접 체크포인트

- NestJS Interceptor가 캐시에 적합한 이유 (요청, 응답 양쪽 접근, RxJS pipe로 단락 가능)
- `applyDecorators` + `SetMetadata` + Reflector 조합이 transport handler에만 적용되는 이유
- Multi-Level Cache를 NestJS Provider로 통합하는 패턴
- Pub/Sub subscriber에 별도 connection (duplicate)가 필요한 이유
- 분산 락 해제에 Lua 스크립트가 필요한 이유 (자기 락 토큰 검증)
- REQUEST scope Provider 주입이 캐시 서비스를 망치는 이유 (scope 전파)
- shutdown hook 활성화 조건과 Write-Back flush가 보장하지 않는 강제 종료 경로
- DataLoader (요청 내 N+1) vs MultiLevelCache (요청 간) 역할 구분

## 출처
- [NestJS — Caching](https://docs.nestjs.com/techniques/caching)
- [NestJS — Lifecycle events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [Node.js — Process](https://nodejs.org/api/process.html)
- [Redis, Pub/Sub](https://redis.io/docs/latest/develop/pubsub/)

## 관련 문서
- [[NestJS|NestJS 개관]]
- [[NestJS-Custom-Decorator|커스텀 데코레이터]]
- [[NestJS-AOP-Interceptor|Interceptor 기반 AOP]]
- [[NestJS-Module-Dynamic|Dynamic Module, registerAsync]]
- [[Cache-Strategies|Cache 전략]]
- [[Multi-Level-Cache|Multi-Level Cache]]
- [[Cache-Stampede|Cache Stampede 방지]]
- [[Cache-Invalidation|Cache Invalidation (Pub/Sub)]]
- [[Consistent-Hashing|Consistent Hashing]]
