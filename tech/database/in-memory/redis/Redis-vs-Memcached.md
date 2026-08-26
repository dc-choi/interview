---
tags: [database, redis, cache]
status: done
verified_at: 2026-08-26
category: "Data & Storage - Cache & KV"
aliases: ["redis와 memcached의 차이점", "Redis vs Memcached"]
---

# Redis와 Memcached 비교

둘 다 메모리를 활용하는 저지연 key-value 시스템이지만 지향점이 다르다. Redis는 여러 자료구조와 서버 측 연산, 선택 가능한 persistence를 제공하는 data structure server다. Memcached는 단순하고 폐기 가능한 cache item을 빠르게 저장하는 데 집중한다.

## 핵심 차이

| 기준 | Redis | Memcached |
|---|---|---|
| 데이터 모델 | String, Hash, List, Set, Sorted Set, Stream 등 | 불투명한 key-value item 중심 |
| 서버 측 연산 | 자료구조별 원자 명령, transaction, Lua script와 function | `add`, `cas`, `incr`, `decr` 같은 단순 원자 연산 |
| Persistence | RDB, AOF, 둘의 조합 또는 비활성화 | 기본은 폐기 가능한 cache. Extstore는 flash로 용량을 늘리지만 durable database가 되지는 않음 |
| 분산 | Redis Cluster가 hash slot 기반 sharding과 replica failover 제공 | 전통적으로 client가 node를 선택하며, 최신 버전은 built-in proxy로 routing 가능 |
| 메모리 회수 | `allkeys-*`, `volatile-*`, `noeviction` 등 정책 선택 | slab class와 segmented LRU 기반 eviction |
| 부가 기능 | Pub/Sub, Streams, replication, Sentinel과 Cluster | cache protocol과 item 저장에 집중 |

Memcached에 영속성이 없다고만 외우면 Extstore와 warm restart 같은 기능을 놓친다. 다만 이 기능들은 cache의 용량이나 재시작 복구를 돕는 기능이며, Redis의 RDB/AOF나 일반 데이터베이스와 같은 내구성 계약을 뜻하지 않는다. 반대로 Redis도 persistence를 끌 수 있고 비동기 복제 중 장애가 나면 확인된 쓰기가 유실될 수 있으므로, Redis라는 이유만으로 정본 저장소로 간주하지 않는다.

## 선택 기준

- 값 전체를 key로 넣고 빼는 단순 캐시이고 다양한 클라이언트가 동일한 routing 규칙을 유지할 수 있다면 Memcached가 작은 기능 표면으로 충분하다.
- collection 연산, TTL 외의 자료구조, 원자적 서버 측 로직, Pub/Sub나 운영 가능한 replica/failover가 필요하면 Redis가 적합하다.
- 제품 이름보다 workload를 먼저 측정한다. item 크기 분포, hit rate, eviction, 필요한 일관성, 장애 시 허용 가능한 유실과 운영 인력을 기준으로 결정한다.
- 세션, lock, queue처럼 cache miss가 단순 재계산으로 끝나지 않는 용도는 장애와 복구 계약을 별도로 검증한다.

## 출처

- [Redis Docs, Redis data types](https://redis.io/docs/latest/develop/data-types/)
- [Redis Docs, Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Redis Docs, Scale with Redis Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- [Memcached Documentation, User Guide](https://docs.memcached.org/userguide/)
- [Memcached Documentation, Built-in proxy](https://docs.memcached.org/features/proxy/)
- [Memcached Documentation, Warm Restart](https://docs.memcached.org/features/restart/)
- [Memcached Documentation, Flash Storage](https://docs.memcached.org/features/flashstorage/)

## 관련 문서

- [[Redis-Architecture|Redis architecture]]
- [[Use-Cases|Use cases]]
