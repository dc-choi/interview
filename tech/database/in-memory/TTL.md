---
tags: [database, redis, cache]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["TTL 전략", "TTL"]
---

# TTL 전략

레디스를 캐시로 사용하는 경우에는 expire-time을 설정하는 것이 좋음. 이 값을 설정하지 않으면 레디스 메모리가 가득참.

기본값은 메모리가 가득차면 입력을 하지 않는다는 이야기를 하기 때문에 장애가 발생할 수 있음.

MAXMEMORY-POLICY = ALLKEYS-LRU 기준으로 설정하게 된다면 expire-time이 없는 데이터부터 삭제가 됨.

## EXPIRE는 키 단위다

`EXPIRE`, TTL은 **키 전체**에 걸린다. Hash, Set, Sorted Set, List 같은 컬렉션의 **개별 원소에는 TTL을 걸 수 없다** — 컬렉션에 EXPIRE를 걸면 원소 일부가 아니라 컬렉션 전체가 한 번에 사라진다. 이 점을 설계에 반영해야 한다.

원소별 만료가 필요하면 우회한다.
- 원소마다 **별도 키**로 저장하고 각 키에 개별 TTL.
- Sorted Set에 만료 시각을 score로 넣고, 주기적으로 `ZREMRANGEBYSCORE`로 지난 원소를 청소.
- Redis 7.4+의 **Hash 필드 단위 TTL**(`HEXPIRE`)로 필드별 만료.

## 출처
- [우아한테크 — Redis 운영, 자료구조, 분산 설계](https://www.youtube.com/watch?v=mPB2CZiAkKM)

## 관련 문서
- [[Cache-Basics|캐시란?]]
- [[Cache-Invalidation|Cache invalidation]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Redis-Memory-Eviction|메모리 정책, Eviction]]
