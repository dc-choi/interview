---
tags: [aws, elasticache, redis, valkey, cache, pubsub]
status: done
category: "Infrastructure - AWS"
aliases: ["ElastiCache 사용 사례", "ElastiCache Redis 패턴"]
verified_at: 2026-07-21
---

# Amazon ElastiCache — 주요 사용 사례

## 1. 쿼리 캐시 (Cache-Aside)

가장 흔한 패턴. 읽기 경로에서 캐시 miss 시 DB 조회 후 캐시 write. 아래 의사 코드는 캐시 어댑터가 miss만 고유한 `CACHE_MISS` sentinel로 반환한다고 가정한다. `0`, `false`, 빈 문자열처럼 유효하지만 falsy인 값도 hit로 처리해야 한다.

```
CACHE_MISS = unique sentinel
value = cache.get(key)
if value is not CACHE_MISS: return value
value = db.query(...)
cache.set(key, value, ttl)
return value
```

- 캐시 대상: **조회가 느리고, 자주 읽히고, 자주 바뀌지 않는** 데이터 (예: 상품 상세, 사용자 프로필, 설정값)

## 2. 세션 스토어

로드밸런싱된 여러 앱 서버가 세션을 공유. 단일 서버 메모리에 두면 sticky session, failover 문제.

## 3. 리더보드 — Sorted Set

`ZADD`로 점수 저장, `ZREVRANGE`로 상위 N명, `ZREVRANK`로 특정 유저 순위. 10만 명 리더보드도 밀리초 단위 조회.

```
ZADD leaderboard 381 Adam 231 Sandra 132 Robert 32 June
ZREVRANGEBYSCORE leaderboard +inf -inf
ZREVRANK leaderboard June   → 3
```

## 4. Pub/Sub 메시징

발행자가 구독자를 몰라도 채널 기반 전송. 간단한 실시간 알림, 팬아웃에 적합.

```
SUBSCRIBE news.sports.golf
PSUBSCRIBE news.sports.*        # 패턴 구독
PUBLISH news.sports.golf "메시지"
```

- **영속성 없음** — 구독자가 연결 안 돼있으면 메시지 유실. 영속, 재전송이 필요하면 Kafka, SQS 선택

## 5. 분산락

여러 프로세스, 인스턴스가 동일 자원에 접근하는 경쟁 제어.

- `SETNX` 기반 단순 락: 락이 리더 노드 장애 시 소실될 수 있음
- **Redlock** 알고리즘: 여러 독립 Redis 노드에서 lease를 획득하는 방식. 안전성은 장애 모델, 시간 가정, lease 만료 처리에 좌우되므로 정확성이 중요한 락에는 fencing token과 저장소의 조건부 쓰기 같은 추가 보호를 검토한다.
- [[Distributed-Lock|분산락 주제 문서]]에서 패턴, 안티패턴 참고

## 6. Rate Limiting, 카운터

`INCR` 자체는 원자적이지만 새 key에 TTL을 붙이는 별도 `EXPIRE`와 합치면 중간 실패 race가 생긴다. Lua script 또는 적절한 transaction으로 증가와 최초 TTL 설정을 하나의 원자적 작업으로 묶는다.

```lua
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
```

반환값이 허용량을 넘으면 요청을 거부한다. `EXPIRE`는 key를 처음 만든 호출에만 설정해 후속 요청마다 고정 window가 연장되지 않게 한다. sliding window나 token bucket은 요구 정확도에 맞는 별도 알고리즘을 사용한다.

## 7. 추천, 호불호 집계 — Hash

HSET으로 사용자별 평가, INCR로 누적 좋아요, 싫어요.

## 8. Semantic Cache (Gen AI)

LLM 응답을 프롬프트 임베딩 기반으로 캐시하면 유사 프롬프트에 저장된 응답을 반환해 **LLM 비용과 지연을 줄일 수 있다**. ElastiCache Search의 vector search는 현재 **node-based Valkey 8.2 이상**에서 지원되며 Serverless나 Redis OSS 엔진의 일반 기능으로 보면 안 된다. Full-text와 hybrid search는 node-based Valkey 9.0 이상 범위를 확인한다.

- RAG(Retrieval-Augmented Generation)의 세션 메모리, 지식 검색에도 활용. ElastiCache Search의 엔진, 버전, 배포 제한이 맞지 않으면 OpenSearch k-NN이나 별도 벡터 저장소를 비교

## 출처

- [AWS Docs, 일반적인 ElastiCache 사용 사례](https://docs.aws.amazon.com/ko_kr/AmazonElastiCache/latest/dg/elasticache-use-cases.html)
- [ElastiCache Search 지원 범위](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/search-features-limits.html)
- [Redis INCR rate limiter와 race condition](https://redis.io/docs/latest/commands/incr/)

## 관련 문서

- [[ElastiCache|Amazon ElastiCache]]
- [[ElastiCache-Engine-Deployment|ElastiCache 엔진 선택, 운영 기능과 클러스터 구조]]
- [[ElastiCache-Caching-Strategy|ElastiCache 캐시 전략과 체크포인트]]
- [[Distributed-Lock|분산락 (Redlock)]]
- [[Redis-Atomic-Operations|Redis 원자 연산]]
- [[Realtime-Chat-Architecture|실시간 아키텍처 (Pub/Sub)]]
