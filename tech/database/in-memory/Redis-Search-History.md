---
tags: [database, redis, search-history, use-case]
status: done
category: "Data & Storage - Redis"
aliases: ["Redis Search History", "최근 검색 기록"]
---

# Redis로 최근 검색 기록 관리

사용자별 "최근 검색어 10개"는 **매번 쓰기 + 중복 제거 + 최대 N개 유지**라는 패턴. RDB로 하면 매 요청마다 INSERT + DELETE + SELECT 조합이라 비효율. Redis의 **List** 또는 **Sorted Set** 한 번으로 O(log N) 또는 O(1) 처리.

## 요구사항 분해

- **사용자별 독립**: key에 user id 포함
- **최근순 정렬**: 최신이 맨 앞
- **중복 제거**: 같은 검색어 다시 치면 앞으로 이동
- **최대 N개**: 11번째 검색 시 오래된 항목 자동 제거
- **TTL**: 일정 기간 후 자동 정리 (선택)

## 방법 1: List (LPUSH + LTRIM)

단순·빠름. 중복 제거는 직접 구현.

```
# 새 검색어 추가
LREM search:user:123 0 "검색어"   # 중복 제거 (있으면)
LPUSH search:user:123 "검색어"    # 맨 앞에 추가
LTRIM search:user:123 0 9         # 10개만 유지

# 조회
LRANGE search:user:123 0 9

# 삭제
LREM search:user:123 0 "검색어"

# TTL
EXPIRE search:user:123 2592000    # 30일
```

**장점**: 구현 단순, 메모리 효율.
**단점**: `LREM`이 O(N) — 리스트가 커지면 느려짐 (10개 한정이면 무시 가능).

## 방법 2: Sorted Set (ZADD + ZRANGE)

시각 기반 정렬. 중복 자동 제거(score만 갱신).

```
# 새 검색어 추가 (timestamp를 score로)
ZADD search:user:123 <timestamp> "검색어"

# 10개 초과분 제거
ZREMRANGEBYRANK search:user:123 0 -11   # 오래된 것부터 제거

# 최근순 조회
ZREVRANGE search:user:123 0 9

# 특정 항목 삭제
ZREM search:user:123 "검색어"
```

**장점**: 중복 제거 자동, 시각 기준 정렬 명시적.
**단점**: List 대비 약간 무거움 (O(log N)).

## 선택 기준

- **검색어만 관리**: List (LPUSH + LTRIM)
- **시각·점수로 정렬·필터**: Sorted Set
- **"2시간 내 검색만" 같은 범위 쿼리 필요**: Sorted Set 필수

대부분 단순 "최근 N개" 용도면 List로 충분.

## 왜 Redis인가 (vs MySQL)

### MySQL 방식의 문제
```sql
-- 쓰기: INSERT + (중복 체크 + 삭제)
-- 조회: SELECT ORDER BY created_at DESC LIMIT 10
-- 11번째 초과 시: DELETE WHERE id = (가장 오래된 것)
```
- 매 요청마다 **I/O 다회**
- **인덱스 갱신 비용** 누적
- 사용자 수 × 평균 검색 빈도로 **쓰기 트래픽 폭발**

### Redis가 적합한 이유
- **인메모리** — RAM 접근은 디스크 대비 수백 배 빠름
- **자료구조 네이티브** — List·Sorted Set이 정확히 이 유스케이스
- **TTL 내장** — 오래된 사용자 검색 기록 자동 정리
- 쓰기 빈도 높아도 Redis 단일 인스턴스가 초당 수만 req 여유

## 영속성 고려

검색 기록은 **유실되어도 치명적이지 않은** 데이터. Redis의 RDB 스냅샷만 있어도 충분하고, 아예 persistence 끄고 순수 캐시로 써도 OK (사용자는 "최근 검색어 사라졌네" 정도 영향).

결제·주문 같은 영속 필수 데이터와 다른 도메인이므로 **별도 Redis 인스턴스**에 두어 운영 리스크 분리.

## 데이터 직렬화

검색어가 단순 문자열이면 그대로 저장. 추가 메타(검색 시각, 카테고리 등) 필요하면 JSON 직렬화.

```
# 단순
ZADD search:user:123 1747500000 "파이썬"

# 메타 포함
ZADD search:user:123 1747500000 '{"q":"파이썬","category":"book"}'
```

Spring이면 `RedisTemplate<String, SearchLog>`에 JSON 직렬화 설정.

## 확장 시나리오

### 인기 검색어 (집계)
사용자별 기록과 별개로 **전체 인기 검색어**는 다른 key에 HyperLogLog(cardinality) 또는 Sorted Set(count).
```
ZINCRBY popular:search:daily 1 "파이썬"
```

### 자동완성
Sorted Set + prefix 탐색으로 간단 구현.
```
ZRANGEBYLEX autocomplete "[py" "[py\xff"
```

### 검색 트렌드 시계열
RedisTimeSeries 모듈 또는 별도 TSDB (InfluxDB·Prometheus).

## 흔한 실수

- **user id 없이 전역 key** → 사용자 간 데이터 섞임
- **TTL 미설정** → 비활성 사용자 키가 영구 누적 → 메모리 소진
- **N 제한 없이 LPUSH만** → 리스트 무한 증가 → 메모리·조회 비용 폭증
- **중복 제거 빠뜨림** → "A·A·A·A·A" 같은 의미 없는 기록
- **검색 기록을 주요 영속 데이터와 같은 Redis에** → 장애 영향 섞임

## 면접 체크포인트

- List vs Sorted Set 중 선택 기준
- 왜 RDB가 이 유스케이스에 부적합한가
- LTRIM·ZREMRANGEBYRANK로 최대 N개 유지하는 방법
- TTL이 필요한 이유 (비활성 사용자 정리)
- 검색 기록 Redis와 주요 서비스 Redis를 분리해야 하는 이유

## 출처
- [dgjinsu — Redis로 최근 검색 기록 관리하기](https://dgjinsu.tistory.com/35)

## 관련 문서
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Cache-Strategies|Cache Strategies]]
- [[TTL|TTL 전략]]
