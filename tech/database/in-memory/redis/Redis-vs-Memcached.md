---
tags: [database, redis, cache]
status: done
verified_at: 2026-09-29
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

## 순수 캐시에서 Memcached가 가벼운 이유

- **멀티스레드 처리**: Memcached는 worker thread마다 자체 event loop로 클라이언트를 처리하고 중앙 락으로 캐시를 공유한다. 단순 GET/SET 처리량을 여러 코어로 늘리기 쉽다. Redis는 명령 실행을 단일 스레드로 유지해 락 없는 원자성을 얻는 대신 명령 실행이 한 코어에 묶인다 ([[Redis-Architecture|Redis architecture]]).
- **slab allocator**: 메모리를 기본 1MB page로 나누고 page를 slab class별 고정 크기 chunk로 잘라 item을 넣는다. 범용 할당기의 단편화를 줄이지만 item 크기 분포가 바뀌면 class 사이에 메모리가 치우칠 수 있어 slab별 사용률과 eviction을 따로 본다.
- **영속성 비용 없음**: 디스크 스냅샷, 로그 기록과 그에 따른 fork나 디스크 I/O가 없다. 사라져도 원본에서 다시 채우면 된다는 전제가 운영을 단순하게 만든다. Redis도 RDB와 AOF를 끌 수 있으므로 이 차이는 기본 설계 방향의 차이다.

Redis가 필요한 조건은 자료구조와 서버 측 연산(Sorted Set 랭킹, Hash 세션, Stream 큐, `SET NX EX` 락), 영속성, 복제와 자동 failover, Cluster 샤딩, Pub/Sub, Lua와 function이다. 이 중 하나라도 핵심 요구라면 Memcached의 단순성은 장점이 아니라 제약이 된다.

## 판단 질문 3가지

1. **캐시만 하는가**: 원본이 따로 있고 miss 때 재계산이나 DB 조회로 끝나는가, 아니면 캐시가 유일한 사본인 데이터가 있는가
2. **데이터 구조가 필요한가**: 단일 키 조회 위주인가, 서버에서 정렬, 집합 연산, 카운터 같은 연산이 필요한가
3. **유실을 허용하는가**: 노드 재시작이나 장애로 전부 비어도 서비스가 워밍업으로 회복되는가

세 질문의 답이 캐시 전용, 단일 키, 유실 허용이면 Memcached로 충분하다. 실제 선택에서는 조직이 이미 운영 중인 엔진, 클라이언트 라이브러리와 모니터링 체계를 따르는 편이 전환 비용보다 싼 경우가 많다.

## Amazon ElastiCache에서의 선택

AWS 엔진 선택 가이드는 가장 단순한 모델, 멀티코어 대형 노드, 노드 추가와 제거로 확장, 객체 캐시가 필요하면 Memcached를 권한다. node-based Memcached는 복제, 자동 failover, 백업과 복원을 제공하지 않는다(Serverless 캐시는 백업 가능).

Valkey 8.0은 명령 실행을 메인 스레드에 두고 클라이언트 읽기, 파싱, 응답 쓰기를 I/O thread로 넘기는 비동기 I/O threading을 도입했다(`io-threads` 설정). Valkey 프로젝트는 특정 EC2 인스턴스 벤치마크에서 처리량이 약 3배 늘었다고 보고했으며, 이는 해당 환경의 측정값이다. 2026-09-29 AWS 가격 페이지 기준 ElastiCache for Valkey는 다른 지원 엔진 대비 node-based 20%, Serverless 33% 낮은 가격을 제시한다. 그래서 AWS에서 순수 캐시도 영속성을 끈 Valkey를 후보로 함께 비교한다. 이전 절차는 [[Redis-Valkey-Migration|Redis에서 Valkey로]]를 따른다.

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
- [Memcached Documentation, Performance](https://docs.memcached.org/serverguide/performance/)
- [Unlock 1 Million RPS: Experience Triple the Speed with Valkey — Valkey Blog](https://valkey.io/blog/unlock-one-million-rps/)
- [Amazon ElastiCache User Guide, Comparing node-based Valkey, Memcached, and Redis OSS clusters](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/SelectEngine.html)
- [Amazon ElastiCache, Pricing](https://aws.amazon.com/elasticache/pricing/)
- [Redis vs Memcached, 캐시만 할 거면 Memcached — Threads, bear_dba](https://www.threads.com/@bear_dba/post/DbVgI4vGIlL)

## 관련 문서

- [[Redis-Architecture|Redis architecture]]
- [[Use-Cases|Use cases]]
- [[Redis-Valkey-Migration|Redis에서 Valkey로]]
- [[ElastiCache-Engine-Deployment|ElastiCache 엔진 선택]]
- [[Cache-Decision|Cache 도입, 제거 의사결정]]
