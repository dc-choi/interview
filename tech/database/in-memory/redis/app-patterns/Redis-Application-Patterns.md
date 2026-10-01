---
tags: [database, redis, consistency, use-case]
status: index
category: "Data & Storage - Cache & KV"
aliases: ["Redis Application Patterns", "Redis 애플리케이션 패턴"]
---

# Redis 애플리케이션 패턴

애플리케이션이 Redis를 실제로 어떻게 쓰는지 다루는 문서 묶음. 키와 자료구조 모델링, 동시 접근 시 정합성 확보, 클라이언트 추상화가 발행하는 명령의 비용까지. 엔진 내부와 토폴로지는 상위 폴더의 [[redis-deep-dive|Redis 심화]] 참고.

- [[Redis-Atomic-Operations|Redis 원자적 연산]]: INCR, MULTI/EXEC, WATCH, Lua
- [[Redis-Atomic-Operations-Lua|Redis Lua 스크립트와 Functions]]: KEYS와 ARGV 계약, BUSY와 SCRIPT KILL, EVALSHA 캐시, DELIFEQ
- [[Redis-Cart-Checkout-Consistency|Redis 장바구니와 주문 정합성]]: Hash, TTL, cart version, Outbox cleanup
- [[Redis-Sorted-Set-Ranking|Sorted Set 랭킹 설계]]: 찜하기 Set과 ZINCRBY, 날짜 키, ZREVRANK, 동점, ZUNIONSTORE
- [[Redis-Search-History|Redis 최근 검색 기록]]: List LPUSH/LTRIM, Sorted Set ZADD
- [[Redis-Object-Mapping-Cost|Redis 객체 매핑 추상화 비용]]: Repository vs 단순 KV, HMSET과 인덱스 Set, MONITOR 진단

## 함께 볼 문서

- [[redis-deep-dive|Redis 심화]]
