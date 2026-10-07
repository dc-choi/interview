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

### 정확 일치와 의미 기반 재사용

LLM 응답도 입력과 재사용 조건이 같으면 해시 키로 캐시할 수 있다. 시맨틱 캐시는 표현이 다른 질문까지 재사용 후보로 찾는 확장이다. 임베딩 검색으로 후보를 얻고 유사도 기준을 통과하면 저장된 답을 반환하며, 미스이면 모델을 호출하고 새 응답을 저장한다. 같은 답을 다시 제공해도 되는 요청에 적용하며 새 생성이나 최신 조회가 필요한 요청은 제외한다.

유사도 점수는 답이 맞을 확률이 아니다. 유사도는 클수록 가까운 반면 거리 지표는 작을수록 가까우므로 임계값의 방향부터 확인한다. 예를 들어 RedisVL의 `distance_threshold`를 유사도 하한으로 해석하면 안 된다. 임베딩과 거리 함수가 달라지면 숫자를 그대로 옮기지 않고, 같은 답을 써도 되는 질문 쌍과 비슷하지만 답이 다른 쌍으로 오적중을 측정한다.

### 문맥, 권한과 수명

- 다중 턴 대화는 마지막 질문만으로 검색하지 않는다. 답변에 필요한 대화 문맥과 사실을 함께 구성한다. 같은 문장이어도 대상 상품이나 이전 대화가 다르면 답이 달라질 수 있다.
- 테넌트, 사용자 권한과 지역처럼 재사용 범위를 결정하는 값은 인증된 애플리케이션 문맥에서 정해 검색 필터나 별도 인덱스로 제한한다. 모델이 생성한 필터에 권한 결정을 맡기지 않는다. ElastiCache Search의 ACL 검사는 인덱스 전체 단위이므로 결과마다 사용자 권한을 대신 확인해 주는 것으로 가정하지 않는다.
- TTL은 허용 가능한 데이터 노후도에 맞춘다. 지식, 정책, 프롬프트나 모델을 바꾸면 기존 답의 재사용 가능성을 다시 판단하고, 호환되지 않는 항목은 무효화하거나 캐시 버전을 분리한다. TTL만으로 변경 직후의 정확성이 보장되지는 않는다.
- 적중률과 함께 오적중률, 오래된 답의 반환, 권한 경계 침범과 전체 응답 지연을 본다. 적중해도 임베딩, 검색과 저장소 운영 비용은 남으므로 줄어든 모델 호출 비용에서 이 비용을 빼고 비교한다. 고정된 절감 배수는 일반 기준으로 쓰지 않는다.

이 절의 검색 지원 범위와 시맨틱 캐시 운영 조건은 2026-10-07에 AWS와 Redis 공식 문서로 대조했다. 문서의 다른 사용 사례 전체를 재검증한 날짜는 아니다.

## 9. 챗봇의 캐시 대상과 지연 측정

대화 이력, 검색 결과와 완성된 답변은 서로 다른 재사용 단위다. 무엇을 캐시했는지에 따라 생략할 수 있는 작업이 달라진다.

| 저장한 대상 | 재사용하는 것 | 적중해도 남을 수 있는 작업 |
|---|---|---|
| 대화 이력과 선호도 | 사용자의 이전 맥락 | 검색과 새 응답 생성 |
| 입력별 임베딩 | 같은 입력의 벡터 변환 결과 | 벡터 검색과 새 응답 생성 |
| 검색 결과 | 이미 찾은 문서나 데이터 | 프롬프트 구성과 새 응답 생성 |
| 완성된 응답 | 이전에 생성한 답변 | 권한, 문맥과 최신성 확인 |

대화 이력은 list, 세션 메타데이터는 hash, TTL이 있는 도구 결과는 string으로 저장하는 구성을 사용할 수 있다. 이런 키 기반 저장이 곧 벡터 검색 기능 사용을 뜻하지 않는다. 벡터 검색의 엔진과 배포 조건은 앞의 Semantic Cache 절을 따른다. [대화 상태의 저장 유형](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/agentic-memory-types.html)

다음은 캐시와 RAG 흐름에서 도출한 설계 점검 기준이다. 임베딩 캐시 키에는 입력과 임베딩 모델 버전을 구분하고, 검색 결과에는 지식 버전과 접근 범위를 연결한다. 가격과 재고처럼 변하는 값은 허용 가능한 오래됨의 범위를 먼저 정하고, 예약 같은 상태 변경 직전에는 정본에서 다시 확인한다.

캐시 조회가 빨라도 모델 생성과 외부 API 호출이 남으면 전체 응답이 같은 시간 안에 끝나지 않는다. 조회 단계의 지연, 첫 응답 지연과 최종 완료 지연을 따로 측정한다. 적중과 미적중 경로도 나눠 비교한다. 특정 데모의 캐시 조회 시간을 챗봇 전체나 예약 완료 시간의 보장값으로 사용하지 않는다.

이 절의 저장 유형과 캐시 재사용 구분은 2026-10-07 공식 문서에 대조했다. 측정과 키 구성은 적용 시 확인할 설계 기준이다.

## 출처

- [AWS Docs, 일반적인 ElastiCache 사용 사례](https://docs.aws.amazon.com/ko_kr/AmazonElastiCache/latest/dg/elasticache-use-cases.html)
- [ElastiCache Search 지원 범위](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/search-features-limits.html)
- [AWS Docs, Implementing a semantic cache with ElastiCache for Valkey](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/semantic-caching-implementation.html)
- [AWS Docs, Semantic caching best practices](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/semantic-caching-best-practices.html)
- [AWS Docs, Types of agentic memory](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/agentic-memory-types.html)
- [Redis Docs, Semantic cache](https://redis.io/docs/latest/develop/use-cases/semantic-cache/)
- [Redis Docs, RedisVL LLM Cache API](https://redis.io/docs/latest/develop/ai/redisvl/api/cache/)
- [Redis INCR rate limiter와 race condition](https://redis.io/docs/latest/commands/incr/)

## 관련 문서

- [[ElastiCache|Amazon ElastiCache]]
- [[ElastiCache-Engine-Deployment|ElastiCache 엔진 선택, 운영 기능과 클러스터 구조]]
- [[ElastiCache-Caching-Strategy|ElastiCache 캐시 전략과 체크포인트]]
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]] — 입력 계산의 재사용과 완성된 답변 재사용의 구분
- [[LLM-Application-Security|LLM 애플리케이션 보안]] — 검색과 출력의 권한 경계
- [[Distributed-Lock|분산락 (Redlock)]]
- [[Redis-Atomic-Operations|Redis 원자 연산]]
- [[Realtime-Chat-Architecture|실시간 아키텍처 (Pub/Sub)]]
