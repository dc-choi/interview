---
tags: [database, redis, cache, distributed-cache, warming, tagging]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Cache Advanced Operations", "분산 무효화", "캐시 워밍업", "캐시 태깅"]
---

# Cache Advanced Operations — 분산 무효화·워밍업·태깅

캐시 도입 후 운영에서 마주치는 세 가지 흔한 요구. 단순 `GET`/`SET`/`DEL`로 충분치 않은 영역이다.

## 분산 무효화 — 패턴 매칭 삭제

특정 prefix 키를 한꺼번에 비우는 케이스(`user:123:*`, `product:list:*`).

### 잘못된 패턴 — `KEYS` + `DEL`

```ts
const keys = await redis.keys('user:123:*');   // ❌ 운영 금지
if (keys.length > 0) await redis.del(...keys);
```

`KEYS`는 **단일 스레드 Redis를 멈춰서** 전체 키스페이스를 스캔. 키 수가 많으면 수백 ms 블로킹 → 다른 모든 요청 대기. 운영급 데이터셋에선 사실상 장애.

### 올바른 패턴 — `SCAN` + 배치 `DEL`

```ts
async function deletePattern(redis: Redis, pattern: string) {
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = next;
    if (keys.length) await redis.unlink(...keys);   // DEL보다 비동기 회수 — 블로킹 적음
  } while (cursor !== '0');
}
```

- `SCAN`은 **여러 호출에 걸쳐 부분 결과** 반환 → 단일 호출이 짧음.
- `UNLINK`는 키 회수를 백그라운드로 — 큰 키 삭제 시 블로킹 회피.
- `COUNT`는 힌트(보장 X). 너무 크면 한 번에 많은 키 → 너무 작으면 라운드트립 ↑.

### Cluster 환경

Redis Cluster에서는 `SCAN`이 단일 노드만 본다. **모든 노드에 SCAN 반복** 필요 — `redis.nodes('master')`로 순회.

## 캐시 워밍업

배포 직후·콜드 캐시 상태에서 첫 요청들이 모두 DB로 몰림(스탬피드). **인기 데이터를 사전 적재**해 첫 충격 회피.

### 부팅 시 한 번

```ts
@Injectable()
export class CacheWarmer implements OnApplicationBootstrap {
  constructor(private redis: Redis, private userService: UserService) {}

  async onApplicationBootstrap() {
    const popular = await this.userService.getPopularUsers();
    const pipeline = this.redis.pipeline();
    popular.forEach(u => pipeline.setex(`user:${u.id}`, 3600, JSON.stringify(u)));
    await pipeline.exec();
  }
}
```

`pipeline`으로 라운드트립 1회로 묶음 — 수천 키도 빠름.

### 주기 갱신

`@Cron`/`SchedulerRegistry`로 인기 데이터 주기 재적재. 비즈니스 트래픽 패턴(런치타임·이벤트 시작)에 맞춰 시점 조정.

### 트레이드오프

| 축 | 워밍업 O | 워밍업 X (Lazy) |
|----|----------|----------------|
| 콜드 스타트 부하 | 분산 (점진 적재) | 첫 트래픽에 폭증 |
| 메모리 사용 | 즉시 차지 | 실 사용 후 차지 |
| 부팅 시간 | 길어짐 | 짧음 |
| 인기 분포 변화 | 워밍업 set 갱신 필요 | 자동 반영 |

서비스 첫 페이지·홈·인기 상품 같은 **확실히 hot한 데이터**만 워밍업, 롱테일은 lazy.

## 캐시 태깅 — 그룹 단위 무효화

키 자체로 prefix를 묶을 수 없는 케이스(예: 같은 상품이 여러 카테고리에 속함). **태그 → 키 집합** 매핑으로 그룹 무효화.

### 등록

```ts
async function setWithTags(redis: Redis, key: string, value: any, tags: string[], ttl: number) {
  const pipeline = redis.pipeline();
  pipeline.setex(key, ttl, JSON.stringify(value));
  tags.forEach(tag => {
    pipeline.sadd(`tag:${tag}`, key);
    pipeline.expire(`tag:${tag}`, ttl);
  });
  await pipeline.exec();
}
```

각 태그를 Redis Set으로 — 그 Set 안에 해당 태그를 가진 모든 캐시 키.

### 무효화

```ts
async function invalidateTag(redis: Redis, tag: string) {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length) {
    const pipeline = redis.pipeline();
    pipeline.unlink(...keys);
    pipeline.del(`tag:${tag}`);
    await pipeline.exec();
  }
}
```

태그에 속한 모든 키 한 번에 회수 + 태그 자체도 정리.

### 한계

- 태그 Set이 클수록 SMEMBERS 결과 크기 ↑ → SSCAN으로 분할.
- 태그 TTL과 키 TTL 동기화 어려움 — 태그가 먼저 만료되면 무효화 누락. 보통 태그 TTL을 **가장 긴 키 TTL + 여유**로.
- 키가 만료돼도 태그 Set엔 dangling 멤버가 남음. 주기 정리 또는 무효화 시 존재 확인.

## 흔한 실수

- **운영 환경에서 `KEYS` 사용**: 단일 스레드 Redis 블로킹 → 장애. SCAN으로.
- **`DEL`로 큰 키 또는 대량 키 한 번에 회수**: 블로킹. UNLINK + 배치.
- **워밍업으로 모든 데이터 적재 시도**: 메모리·부팅 시간 폭증. 인기 hot 데이터만.
- **태그 Set TTL 안 둠**: 태그가 영구 누적 → 메모리 누수. TTL 또는 주기 GC.
- **Cluster에서 SCAN 한 노드만**: 다른 노드 키 누락. 모든 마스터 노드 순회.
- **무효화 후 즉시 같은 키 재조회 → 다시 캐시 채움 race**: 무효화 → 짧은 negative-cache(stale lock) 또는 ETag로 보정.

## 면접 체크포인트

- 운영에서 `KEYS` 금지 이유 — 단일 스레드 블로킹
- `SCAN`/`SSCAN`의 cursor 기반 점진 스캔 동작
- `DEL` vs `UNLINK` — 동기 vs 백그라운드 회수
- Redis Cluster에서 SCAN의 한계와 노드별 순회
- 캐시 워밍업의 의의와 트레이드오프 (메모리·부팅 시간 vs 콜드 스타트)
- 태그 기반 무효화 — Set으로 매핑, 그룹 단위 회수
- 태그 TTL과 키 TTL 동기화 문제

## 관련 문서

- [[Cache-Invalidation|기본 캐시 무효화 전략]]
- [[Cache-Stampede|Cache Stampede·Penetration·Avalanche]]
- [[Cache-Strategies|캐시 전략 (Cache-Aside·Write-Through·Write-Behind)]]
- [[Redis-Atomic-Operations|Redis 원자 연산]]
- [[Distributed-Lock|분산 락]]
