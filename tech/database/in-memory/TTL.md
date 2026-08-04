---
tags: [database, redis, cache]
status: done
verified_at: 2026-08-04
category: "Data & Storage - Cache & KV"
aliases: ["TTL 전략", "TTL"]
---

# TTL 전략

TTL은 임시 데이터의 수명 계약이고 eviction은 memory 압력 때 어떤 key를 제거할지 정하는 별도 정책이다. cache key에는 보통 TTL을 두지만 TTL만 설정한다고 memory 상한, eviction과 복구 정책이 자동으로 정해지지는 않는다.

- 64-bit Redis Open Source의 기본 `maxmemory 0`은 dataset memory 제한이 없다는 뜻이다. host/container limit까지 자라 OOM이 날 수 있으므로 운영에서는 명시적인 예산과 관측이 필요하다.
- `maxmemory`를 넘었을 때 `noeviction`이면 새 데이터를 추가하는 write가 error를 반환한다.
- `allkeys-lru`는 TTL 여부와 무관하게 전체 key 중 근사 LRU 대상으로 고른다.
- `volatile-lru`, `volatile-lfu`, `volatile-ttl` 같은 `volatile-*`는 TTL이 있는 key만 eviction 후보로 삼는다. 후보가 없으면 `noeviction`처럼 동작할 수 있다.

## EXPIRE는 키 단위다

`EXPIRE`는 **key 전체**에 걸린다. Hash, Set, Sorted Set, List에 `EXPIRE`를 걸면 원소 일부가 아니라 collection key 전체가 만료된다.

원소별 만료가 필요하면 다음 중 하나를 선택한다.
- 원소마다 **별도 키**로 저장하고 각 키에 개별 TTL.
- Sorted Set에 만료 시각을 score로 넣고, 주기적으로 `ZREMRANGEBYSCORE`로 지난 원소를 청소.
- Redis 7.4+의 **Hash field TTL**인 `HEXPIRE` 계열을 사용. 운영 Redis와 호환 service의 version 지원 여부를 확인한다.

## 만료는 정확한 scheduler가 아니다

Redis는 접근한 만료 key를 passive 방식으로 제거하고, 주기적으로 일부 key를 검사하는 active expiration도 수행한다. client 관점에서는 만료 시각 뒤 값을 읽을 수 없지만, 내부 삭제 event가 지정 시각에 정확히 실행된다고 가정해 주문 취소, 정산 같은 업무 scheduler로 쓰지 않는다.

TTL 갱신 정책도 제품 의미로 정한다.

- sliding TTL: cart/session을 수정하거나 사용할 때 수명을 연장한다.
- absolute TTL: 최초 생성 시각부터 최대 수명을 고정한다.
- jitter: 대량 cache key가 같은 순간 만료되어 source DB로 몰리는 것을 완화한다.
- TTL 없는 key 비율, expired/evicted key 수와 write error를 함께 관측한다.

## 출처
- [Redis Docs, EXPIRE](https://redis.io/docs/latest/commands/expire/)
- [Redis Docs, HEXPIRE](https://redis.io/docs/latest/commands/hexpire/)
- [Redis Docs, Key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [우아한테크, Redis 운영, 자료구조, 분산 설계](https://www.youtube.com/watch?v=mPB2CZiAkKM)

## 관련 문서
- [[Cache-Basics|캐시란?]]
- [[Cache-Invalidation|Cache invalidation]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Redis-Memory-Eviction|메모리 정책, Eviction]]
- [[Redis-Cart-Checkout-Consistency|Redis 장바구니와 주문 정합성]]
