---
tags: [database, redis, cache]
status: done
verified_at: 2026-09-30
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
- Redis 7.4+와 Valkey 9.0+의 **Hash field TTL**인 `HEXPIRE` 계열을 사용. 운영 엔진과 호환 service의 version 지원 여부를 확인한다.

## 값을 덮어쓰면 TTL이 사라진다

- `SET key value EX 60`처럼 값과 수명을 한 명령으로 쓴다. `SET` 뒤에 `EXPIRE`를 따로 보내면 두 명령 사이의 장애로 TTL 없는 키가 남을 수 있다.
- 성공한 `SET`은 기존 TTL을 버린다. 원래 수명이 다시 시작되는 것이 아니라 TTL 없는 영구 키(`TTL` 결과 -1)가 된다. 값만 바꾸고 수명을 유지하려면 `KEEPTTL`(6.0+)을 붙이고, 수명을 새로 정하려면 `EX`를 다시 준다. 캐시 갱신 코드에서 흔한 실수다.
- `TTL`은 남은 초, -1(만료 없음), -2(키 없음)를 돌려준다. `PERSIST`는 TTL을 제거하고, `GETEX key EX n`(6.2+)은 조회와 수명 연장을 한 번에 한다.
- `MSET`에는 TTL 옵션이 없어 캐시 적재에 쓰면 수명 보험이 빠진다. Redis 8.4+와 Valkey 9.1+는 `MSETEX numkeys k1 v1 ... EX n`으로 여러 키에 같은 수명을 원자적으로 준다.

## TTL 길이는 허용할 stale 시간이다

- 데이터가 오래돼도 괜찮은 시간만큼 잡는다. 거의 바뀌지 않는 상품명은 길게, 가격과 이벤트 배너는 짧게 둔다.
- 애매하면 짧게 시작한다. 짧아서 생기는 비용은 원본 조회와 DB 커넥션 증가이고, 길어서 생기는 비용은 오래된 가격 노출 같은 사용자 영향이라 후자가 더 비싼 경우가 많다.
- 무효화 코드에 버그가 있어도 수명이 끝나면 캐시가 사라지므로 어떤 무효화 전략을 쓰든 TTL을 마지막 안전망으로 건다 ([[Cache-Invalidation|Cache invalidation]]). 실시간성이 필수인 데이터는 캐시하지 않거나 변경 이벤트로 갱신하는 방식을 검토한다.

## 만료는 정확한 scheduler가 아니다

Redis는 접근한 만료 key를 passive 방식으로 제거하고, 주기적으로 일부 key를 검사하는 active expiration도 수행한다. client 관점에서는 만료 시각 뒤 값을 읽을 수 없지만, 내부 삭제 event가 지정 시각에 정확히 실행된다고 가정해 주문 취소, 정산 같은 업무 scheduler로 쓰지 않는다.

같은 이유로 논리적 만료와 메모리 반환 사이에는 시차가 있다. 서버는 모든 키의 만료를 실시간으로 추적하지 않고 접근 시점과 표본 검사로 나눠 지우므로, 만료 직후 메모리 그래프가 바로 내려가지 않아도 정상일 수 있다. Valkey 8.0+는 `lazyfree-lazy-expire`가 기본 `yes`라 만료 삭제의 메모리 해제도 백그라운드로 넘긴다.

TTL 갱신 정책도 제품 의미로 정한다.

- sliding TTL: cart/session을 수정하거나 사용할 때 수명을 연장한다.
- absolute TTL: 최초 생성 시각부터 최대 수명을 고정한다.
- jitter: 대량 cache key가 같은 순간 만료되어 source DB로 몰리는 것을 완화한다.
- TTL 없는 key 비율, expired/evicted key 수와 write error를 함께 관측한다.

## 출처
- [Redis Docs, EXPIRE](https://redis.io/docs/latest/commands/expire/)
- [Redis Docs, HEXPIRE](https://redis.io/docs/latest/commands/hexpire/)
- [Redis Docs, Key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis Docs, MSETEX](https://redis.io/docs/latest/commands/msetex/)
- [우아한테크세미나 191121 우아한레디스 — 우아한테크](https://www.youtube.com/watch?v=mPB2CZiAkKM)
- [Valkey Docs, SET](https://valkey.io/commands/set/)
- [Valkey Docs, TTL](https://valkey.io/commands/ttl/)
- [Valkey Docs, GETEX](https://valkey.io/commands/getex/)
- [Valkey Docs, MSETEX](https://valkey.io/commands/msetex/)
- [Valkey Docs, HEXPIRE](https://valkey.io/commands/hexpire/)
- [valkey.conf 9.1 LAZY FREEING — valkey-io/valkey](https://github.com/valkey-io/valkey/blob/9.1/valkey.conf)
- [인프런, Hong, 캐시는 왜 필요할까?? 그리고 SET 명령어 옵션으로 다루는 TTL](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481441)
- [인프런, Hong, 키 수명을 관리하는 TTL의 모든 것 그리고 객체 캐싱과 Multi 처리](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481442)

## 관련 문서
- [[Cache-Basics|캐시란?]]
- [[Cache-Invalidation|Cache invalidation]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Redis-Memory-Eviction|메모리 정책, Eviction]]
- [[Redis-Cart-Checkout-Consistency|Redis 장바구니와 주문 정합성]]
