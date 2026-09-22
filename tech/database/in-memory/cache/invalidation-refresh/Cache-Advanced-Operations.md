---
tags: [database, redis, cache, distributed-cache, warming, tagging]
status: done
verified_at: 2026-09-22
category: "Data & Storage - Cache & KV"
aliases: ["Cache Advanced Operations", "분산 무효화", "캐시 워밍업", "캐시 태깅"]
---

# Cache Advanced Operations — 분산 무효화, 워밍업, 태깅

캐시 도입 후 운영에서 마주치는 세 가지 흔한 요구. 단순 `GET`/`SET`/`DEL`로 충분치 않은 영역이다.

## 분산 무효화 — 패턴 매칭 삭제

특정 prefix 키를 한꺼번에 비우는 케이스(`user:123:*`, `product:list:*`).

### 잘못된 패턴 — `KEYS` + `DEL`

```ts
const keys = await redis.keys('user:123:*');   // ❌ 운영 금지
if (keys.length > 0) await redis.del(...keys);
```

`KEYS`는 **단일 스레드 Redis를 멈춰서** 전체 키스페이스를 스캔. 키 수가 많으면 수백 ms 블로킹 → 다른 모든 요청 대기. 운영급 데이터셋에선 사실상 장애.

### 올바른 패턴 — `SCAN` + 단일 키 `UNLINK`

```ts
async function deletePattern(redis: Redis, pattern: string) {
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = next;
    await Promise.all(keys.map((key) => redis.unlink(key)));
  } while (cursor !== '0');
}
```

- `SCAN`은 **여러 호출에 걸쳐 부분 결과** 반환 → 단일 호출이 짧음.
- `UNLINK`는 키 회수를 백그라운드로 — 큰 키 삭제 시 블로킹 회피.
- `COUNT`는 힌트(보장 X). 너무 크면 한 번에 많은 키 → 너무 작으면 라운드트립 ↑.

### Cluster 환경

Redis Cluster에서는 `SCAN`이 단일 노드만 본다. **모든 노드에 SCAN 반복** 필요 — `redis.nodes('master')`로 순회. 여러 key를 한 `UNLINK`에 넣으면 같은 hash slot이어야 하므로 key별 command를 보내거나 slot별 pipeline으로 묶는다.

## 캐시 워밍업

배포 직후, 콜드 캐시 상태에서 첫 요청들이 모두 DB로 몰림(스탬피드). **인기 데이터를 사전 적재**해 첫 충격 회피.

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

`@Cron`/`SchedulerRegistry`로 인기 데이터 주기 재적재. 비즈니스 트래픽 패턴(런치타임, 이벤트 시작)에 맞춰 시점 조정.

### 트레이드오프

| 축 | 워밍업 O | 워밍업 X (Lazy) |
|----|----------|----------------|
| 콜드 스타트 부하 | 분산 (점진 적재) | 첫 트래픽에 폭증 |
| 메모리 사용 | 즉시 차지 | 실 사용 후 차지 |
| 부팅 시간 | 길어짐 | 짧음 |
| 인기 분포 변화 | 워밍업 set 갱신 필요 | 자동 반영 |

서비스 첫 페이지, 홈, 인기 상품 같은 **확실히 hot한 데이터**만 워밍업, 롱테일은 lazy.

## 캐시 태깅 — 그룹 단위 무효화

여러 형태의 캐시 키를 한 그룹으로 무효화할 때 사용한다. 아래 예시는 값마다 태그 하나를 붙이고, 그 태그의 generation을 키에 포함한다. 무효화는 generation을 원자적으로 회전하는 짧은 명령이며 이전 generation의 값은 TTL까지 남아도 이후 read 경로에서는 도달하지 않는다. 같은 상품을 여러 카테고리 태그로 무효화하는 다중 태그 설계는 아래 한계에서 별도로 구분한다.

### 등록

```ts
interface TaggedCacheEntry {
  readonly tag: string;
  readonly key: string;
  readonly ttlSeconds: number;
}

const tagGenerationKey = (tag: string) => `cache-tag:{tag:${encodeURIComponent(tag)}}:generation`;
const taggedValueKey = (entry: TaggedCacheEntry, generation: string) =>
  `cache:{tag:${encodeURIComponent(entry.tag)}}:${generation}:${entry.key}`;

async function getOrLoadWithTag(
  redis: Redis,
  entry: TaggedCacheEntry,
  load: () => Promise<unknown>,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = (await redis.get(tagGenerationKey(entry.tag))) ?? '0';
    const cached = await redis.get(taggedValueKey(entry, before));
    const afterRead = (await redis.get(tagGenerationKey(entry.tag))) ?? '0';

    if (before !== afterRead) continue;
    if (cached !== null) return JSON.parse(cached);

    const value = await load();
    const afterLoad = (await redis.get(tagGenerationKey(entry.tag))) ?? '0';

    if (before !== afterLoad) continue;

    await redis.set(
      taggedValueKey(entry, before),
      JSON.stringify(value),
      'EX',
      entry.ttlSeconds,
    );
    return value;
  }

  return load(); // 무효화가 연속으로 겹쳤다. 이번 값은 cache에 쓰지 않는다.
}
```

태그를 인코딩해 `{`, `}`와 `:`가 키의 경계를 바꾸지 못하게 한다. 원본 load 전에 generation을 먼저 잡고, load 뒤에도 같은 generation인지 확인한다. load와 무효화가 겹치면 이전 값은 새 generation에 쓰지 않고 다시 시도한다. `GET`과 `INCR`는 Redis primary에서 각각 원자적으로 순서가 정해진다. read도 generation 전후를 확인해 무효화와 겹친 cached 값을 재시도한다. 이전 generation 값의 물리 삭제는 TTL에 맡기므로 즉시 메모리를 회수해야 하는 요구에는 맞지 않는다.

### 무효화

```ts
async function invalidateTag(redis: Redis, tag: string) {
  await redis.incr(tagGenerationKey(tag));
}
```

`INCR`가 generation 회전의 선형화 지점이다. generation metadata는 이전 값의 TTL보다 길게 보존하고 eviction과 복원 시 reset에서 제외해야 한다. 그렇지 않으면 generation이 되돌아가 이전 값이 다시 보이는 ABA 문제가 생긴다. 예시는 값과 generation key에 같은 `{tag}` hash tag를 넣어 Redis Cluster에서도 같은 slot으로 보낸다. 한 값에는 한 태그만 붙일 수 있고, 태그별 slot 집중도도 관측해야 한다. 여러 태그가 필요한 값, 즉시 삭제, tag별 대량 정리에는 모든 참여 key를 같은 slot에 배치한 Lua script 또는 별도 coordination store가 필요하다. 비동기 replica를 읽으면 read-after-invalidate 보장이 약해지므로 이 계약의 read와 invalidate는 Redis primary로 보낸다.

### 한계

- 이전 generation 값은 TTL 동안 남는다. 태그 무효화가 잦으면 TTL과 최대 generation 수를 기준으로 메모리 상한을 계산한다. generation metadata는 영속 저장하고 eviction 대상에서 제외하며, 복원 절차에서도 단조 증가를 지킨다.
- 이 예시는 한 값당 한 태그다. 다중 태그를 단순히 여러 slot에 나눠 등록하면 atomic 무효화 계약을 잃는다.

## 흔한 실수

- **운영 환경에서 `KEYS` 사용**: 단일 스레드 Redis 블로킹 → 장애. SCAN으로.
- **`DEL`로 큰 키 또는 대량 키 한 번에 회수**: 블로킹. UNLINK + 배치.
- **워밍업으로 모든 데이터 적재 시도**: 메모리, 부팅 시간 폭증. 인기 hot 데이터만.
- **Set 기반 태그 membership 방치**: 만료된 값의 참조가 누적되므로 TTL과 안전한 GC가 필요하다. 위 예제의 generation metadata에는 같은 TTL 정리를 적용하면 안 된다.
- **Cluster에서 SCAN 한 노드만**: 다른 노드 키 누락. 모든 마스터 노드 순회.
- **무효화 후 즉시 같은 키 재조회 → 다시 캐시 채움 race**: 무효화 → 짧은 negative-cache(stale lock) 또는 ETag로 보정.

## 면접 체크포인트

- 운영에서 `KEYS` 금지 이유 — 단일 스레드 블로킹
- `SCAN`/`SSCAN`의 cursor 기반 점진 스캔 동작
- `DEL` vs `UNLINK` — 동기 vs 백그라운드 회수
- Redis Cluster에서 SCAN의 한계와 노드별 순회
- 캐시 워밍업의 의의와 트레이드오프 (메모리, 부팅 시간 vs 콜드 스타트)
- 태그 generation 회전, 원본 load 전 세대 확인, 이전 값의 TTL 회수
- generation metadata의 단조 증가와 ABA 방지, Set membership TTL과의 차이

## 출처

- [Redis Docs, EXPIRE](https://redis.io/docs/latest/commands/expire/)
- [Redis Docs, INCR](https://redis.io/docs/latest/commands/incr/)
- [Redis Docs, Multi-key operations](https://redis.io/docs/latest/develop/using-commands/multi-key-operations/)

## 관련 문서

- [[Cache-Invalidation|기본 캐시 무효화 전략]]
- [[Cache-Stampede|Cache Stampede, Penetration, Avalanche]]
- [[Cache-Strategies|캐시 전략 (Cache-Aside, Write-Through, Write-Behind)]]
- [[Redis-Atomic-Operations|Redis 원자 연산]]
- [[Distributed-Lock|분산 락]]
