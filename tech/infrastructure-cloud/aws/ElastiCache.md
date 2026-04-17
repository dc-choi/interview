---
tags: [aws, elasticache, redis, memcached, cache, valkey]
status: done
category: "Infrastructure - AWS"
aliases: ["ElastiCache", "Amazon ElastiCache", "AWS Redis"]
---

# Amazon ElastiCache

AWS 관리형 인메모리 캐시 서비스. **Redis·Valkey·Memcached** 엔진을 선택해 **<1ms 지연**으로 데이터 접근을 제공한다. DB 쿼리 결과·세션·리더보드·Pub/Sub·분산락 같은 고속 접근 워크로드에 사용.

## 왜 필요한가

- **DB 부담 완화**: 복잡한 조인·집계 결과를 캐시해 재계산 제거
- **지연 절감**: RDBMS는 보통 10~100ms, 캐시는 <1ms. 사용자 체감 차이는 250ms 정도부터 나타나며 **100ms 지연 증가 = 매출 1% 감소** 같은 수치도 보고됨
- **스파이크 흡수**: 순간 트래픽 증가 시 DB 폭주를 막는 버퍼
- **글로벌 상태 공유**: 여러 앱 서버가 세션·락·카운터를 공유

## 엔진 선택 — Redis vs Memcached vs Valkey

| 항목 | Redis / Valkey | Memcached |
|---|---|---|
| 자료구조 | String·Hash·List·Set·Sorted Set·Stream·Bitmap | String만 |
| 영속성 | RDB·AOF로 영속화 가능 | 없음 (메모리만) |
| 복제·클러스터 | 공식 지원 | 제한적 |
| Pub/Sub | 지원 | 미지원 |
| 분산락 | SETNX·Redlock | 미지원 |
| 사용 패턴 | 다양한 자료구조·복잡한 로직 | 단순 KV 캐시·멀티스레드 고속 |

대부분 워크로드는 **Redis/Valkey**가 정답. Memcached는 단순 KV 캐시·멀티스레드 활용이 필요한 특수 상황.

**Valkey**는 Redis 라이선스 변경(2024) 이후 AWS·Google·Oracle 등이 포크한 오픈소스 fork. API 호환이라 기존 Redis 클라이언트가 그대로 동작.

## 주요 사용 사례

### 1. 쿼리 캐시 (Cache-Aside)

가장 흔한 패턴. 읽기 경로에서 캐시 miss 시 DB 조회 후 캐시 write.

```
if (value = cache.get(key)) return value
else:
  value = db.query(...)
  cache.set(key, value, ttl)
  return value
```

- 캐시 대상: **조회가 느리고·자주 읽히고·자주 바뀌지 않는** 데이터
- 예: 상품 상세·사용자 프로필·설정값

### 2. 세션 스토어

로드밸런싱된 여러 앱 서버가 세션을 공유. 단일 서버 메모리에 두면 sticky session·failover 문제.

### 3. 리더보드 — Sorted Set

`ZADD`로 점수 저장, `ZREVRANGE`로 상위 N명, `ZREVRANK`로 특정 유저 순위. 10만 명 리더보드도 밀리초 단위 조회.

```
ZADD leaderboard 381 Adam 231 Sandra 132 Robert 32 June
ZREVRANGEBYSCORE leaderboard +inf -inf
ZREVRANK leaderboard June   → 3
```

### 4. Pub/Sub 메시징

발행자가 구독자를 몰라도 채널 기반 전송. 간단한 실시간 알림·팬아웃에 적합.

```
SUBSCRIBE news.sports.golf
PSUBSCRIBE news.sports.*        # 패턴 구독
PUBLISH news.sports.golf "메시지"
```

- **영속성 없음** — 구독자가 연결 안 돼있으면 메시지 유실
- 영속·재전송이 필요하면 Kafka·SQS 선택

### 5. 분산락

여러 프로세스·인스턴스가 동일 자원에 접근하는 경쟁 제어.

- `SETNX` 기반 단순 락: 락이 리더 노드 장애 시 소실될 수 있음
- **Redlock** 알고리즘: 여러 Redis 노드 합의로 안전성↑
- [[Distributed-Lock|분산락 주제 문서]]에서 패턴·안티패턴 참고

### 6. Rate Limiting·카운터

INCR·DECR의 **원자성**으로 요청 수 카운트·토큰 버킷 구현.

```
INCR rate_limit:user:123:minute_202604181234
EXPIRE rate_limit:user:123:minute_202604181234 60
# 값이 60 초과면 차단
```

### 7. 추천·호불호 집계 — Hash

HSET으로 사용자별 평가, INCR로 누적 좋아요·싫어요.

### 8. Semantic Cache (Gen AI)

LLM 응답을 프롬프트 임베딩 기반으로 캐시. 유사 프롬프트에 캐시된 응답을 반환해 **LLM 비용·지연 절감**. Redis/Valkey의 **벡터 검색** 기능으로 구현.

- RAG(Retrieval-Augmented Generation)의 세션 메모리·지식 검색에도 활용
- Redis Stack / OpenSearch kNN 등과 조합

## ElastiCache 운영 기능

| 기능 | 설명 |
|---|---|
| **Multi-AZ with Auto Failover** | 프라이머리 장애 시 레플리카 자동 승격 |
| **Global Datastore** | 리전 간 복제 (Redis/Valkey 한정) |
| **Backup·Snapshot** | S3로 자동 백업, 특정 시점 복구 |
| **In-transit / At-rest Encryption** | TLS·KMS 연동 |
| **ElastiCache Serverless** | 사용량 기반 자동 스케일, 기본 가용성 99.99% |

### ElastiCache Serverless 주의점

- **ACU 단위 과금** — 유휴 시에도 최소 요금 발생
- 상시 부하가 적은 경우 Provisioned 클러스터가 싸다
- 트래픽 패턴이 예측 불가·변동 큰 워크로드에 유리

## 캐시 전략

### 쓰기 전략

- **Write-Through**: DB 쓰기 시 캐시도 동시에 갱신 — 일관성↑, 쓰기 지연↑
- **Write-Behind**: 캐시만 갱신, DB는 지연 쓰기 — 쓰기 빠름, 일관성↓·손실 위험
- **Cache-Aside + TTL**: 읽을 때만 캐시 채움, TTL 만료로 갱신 — 가장 널리 쓰임

### 무효화

- **TTL 기반**: 짧게 두면 자주 갱신(정합성↑), 길면 부하↓
- **명시적 invalidate**: DB 쓰기와 함께 `DEL`
- **버전 키**(`user:123:v2`): 새 버전 키로 교체해 구 캐시 무시

### Stale 허용 여부

- **허용**: 리더보드(초 단위 지연 OK)·집계 통계
- **불허**: 결제·재고·실시간 가격

## 비용·사이징

- **인스턴스 타입**: `cache.r7g.large` 같은 메모리 최적화 권장. Graviton(G 계열)이 성능·비용 유리
- **샤딩**: 단일 노드 메모리 한도(100GB+) 넘으면 Redis Cluster 모드로 샤딩
- **비용 지표**: 인스턴스 시간 + 데이터 전송 + 스냅샷 스토리지

## 흔한 실수

- **세션을 DB에 저장하며 동시에 ElastiCache도 도입** — 혼선. 세션은 한 곳으로 일원화
- **TTL 없이 캐시** — 메모리 누적·오래된 데이터 잔존
- **큰 값을 캐시** — 수 MB 문서를 통째로 저장해 네트워크·메모리 압박. 필요한 필드만
- **캐시 스탬피드**(Thundering Herd) — TTL 만료 순간 수천 요청이 동시에 DB로. 락·지수 백오프·Probabilistic Early Recomputation으로 방어
- **Memcached 선택 후 자료구조 필요해짐** — 설계 시점에 Redis/Valkey가 더 범용적임을 기억

## 면접 체크포인트

- **Redis vs Memcached** 선택 기준 (자료구조·영속성·Pub/Sub)
- **Cache-Aside / Write-Through / Write-Behind** 차이와 선택 기준
- **캐시 스탬피드** 문제와 방어 전략
- **분산락**을 ElastiCache로 구현할 때 주의점(Redlock·락 TTL)
- **ElastiCache Serverless**가 Provisioned 대비 언제 유리한가
- Sorted Set으로 리더보드를 O(log N)에 구현하는 원리

## 출처
- [AWS Docs — 일반적인 ElastiCache 사용 사례](https://docs.aws.amazon.com/ko_kr/AmazonElastiCache/latest/dg/elasticache-use-cases.html)

## 관련 문서
- [[Cache-Strategies|캐시 전략 (Cache-Aside·Write-Through·TTL)]]
- [[Distributed-Lock|분산락 (Redlock)]]
- [[Redis-Atomic-Operations|Redis 원자 연산]]
- [[Connection-Pool|Connection Pool]]
- [[Realtime-Chat-Architecture|실시간 아키텍처 (Pub/Sub)]]
