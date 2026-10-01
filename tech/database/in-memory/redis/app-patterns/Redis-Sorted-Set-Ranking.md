---
tags: [database, redis, valkey, sorted-set, ranking, leaderboard, ecommerce]
status: done
verified_at: 2026-09-30
category: "Data & Storage - Cache & KV"
aliases: ["Redis Ranking", "Redis Leaderboard", "Sorted Set 랭킹", "실시간 인기 순위", "기간별 랭킹", "찜하기"]
---

# Sorted Set 랭킹 설계 — 찜 목록, 실시간 인기 순위, 기간별 랭킹

자료구조는 요구가 쌓일 때마다 다시 고른다. 중복 없는 집합이면 Set, 여기에 순서가 붙으면 Sorted Set이다. 이 문서는 커머스의 찜하기와 조회수 기반 인기 상품을 예로 Sorted Set 랭킹의 키 설계, 조회, 동점, 기간 합산과 운영 경계를 다룬다. 타입 개요는 [[Redis-Data-Structures|Redis 자료구조]], 검색어 top-k 근사는 [[OpenSearch-Popular-Keywords-TopK|인기 검색어 top-k 설계]]가 맡는다.

## 찜 목록은 Set, 인기순은 Sorted Set

- 찜은 중복이 없어야 한다. 애플리케이션이 매번 중복을 검사하면 빠뜨리기 쉬우므로 Set에 맡긴다. `SADD`는 이미 있는 멤버를 오류 없이 무시하고 새로 추가된 멤버 수를 돌려준다.
- 하트 표시는 목록 전체를 가져오지 않고 `SISMEMBER`로 1 또는 0만 묻는다.
- 같이 찜한 상품은 `SINTER`, 합집합은 `SUNION`으로 서버에서 계산해 애플리케이션의 이중 반복문을 없앤다. 결과 순서는 보장되지 않고 비용이 집합 크기에 비례하므로 큰 집합끼리의 연산은 명령 스레드를 오래 잡는다.
- 많이 찜한 순서가 필요해지면 Sorted Set을 더한다. `ZINCRBY rank:wish 1 <상품ID>`는 멤버가 없으면 0에서 시작해 만들므로 미리 `ZADD`하지 않아도 된다.

### 찜 목록과 순위판을 함께 갱신할 때

`SADD`와 `ZINCRBY`를 결과 확인 없이 연달아 보내면 같은 사용자의 중복 찜에도 점수가 오른다. `SADD`가 1을 돌려줄 때만 `ZINCRBY`하고, 찜 취소는 `SREM`이 1일 때만 `ZINCRBY ... -1`한다. 두 명령 사이에서 프로세스가 죽으면 점수가 어긋나므로 standalone이나 Sentinel 구성이면 두 키를 Lua 한 번으로 묶는다. Cluster에서는 사용자별 찜 키와 전역 순위판이 다른 slot이라 한 스크립트로 묶을 수 없으므로(CROSSSLOT), 원본 찜 데이터에서 순위판을 주기적으로 다시 계산해 어긋남을 되돌린다.

## 실시간 인기 순위와 날짜 키

- 조회 이벤트마다 `ZINCRBY rank:daily:20260930 1 <상품ID>`로 점수를 올린다. 날짜를 키에 넣으면 자정이 지나 새 키가 생기므로 리셋 배치가 필요 없고, 지난 일간 키는 기간 합산의 재료로 남는다.
- 일간 키는 매일 쌓이므로 TTL을 반드시 건다. 주간 합산이 7일치를 읽는다면 여유를 두어 2주 정도로 잡는다. 월간을 일간 키 합산으로 만들려면 31일 넘게 보존해야 하므로, 월간은 주간 결과를 합치거나 월간 키를 따로 누적하는 식으로 보존 기간과 함께 설계한다.
- 실시간 `ZINCRBY`는 화면이 늘 최신이지만 조회 트래픽이 그대로 쓰기 부하가 되고 순위 키 하나가 [[Hot-Key|hot key]]가 된다. 조회 로그를 쌓아 5~10분마다 집계해 `ZADD`하면 갱신은 늦지만 부하가 크게 준다. 실시간이 비즈니스에 정말 필요한지와 현재 트래픽 규모로 고른다.
- 순위에 오르면 메인 노출로 이어져 매크로 반복 조회 같은 어뷰징이 따라온다. 모든 조회 이벤트를 검증 없이 점수로 흘리지 않고, 짧은 시간 안의 반복 조회를 거르는 필터를 앞에 둔다.

## 조회 — 상위 K, 개별 순위, 점수

| 목적 | 명령 | 주의 |
|---|---|---|
| 상위 K | `ZRANGE key 0 K-1 REV WITHSCORES` | `REV`는 6.2+. `ZREVRANGE`도 동작하지만 Redis 문서는 6.2부터 deprecated로 표기하고, Valkey 문서는 deprecated 표시 없이 `ZRANGE ... REV`를 대안으로 안내한다 |
| 개별 순위 | `ZREVRANK key member` | 0부터 시작하므로 화면에는 1을 더한다. `ZRANK`는 점수 오름차순이라 조회수가 가장 적은 상품이 0이 된다 |
| 조회수 | `ZSCORE key member` | 점수는 double |
| 점수 구간 | `ZRANGE key min max BYSCORE` | `ZRANGEBYSCORE`의 대안 (6.2+) |

`WITHSCORES` 응답은 RESP2에서 멤버와 점수가 번갈아 나오는 평평한 배열이고 점수는 문자열이다. RESP3에서는 멤버와 점수 쌍의 배열이고 점수는 double이다. RESP2로 받는 ioredis 계열 클라이언트에서는 두 칸씩 묶어 파싱하는 코드를 자주 쓴다.

```ts
const flat = await valkey.zrange(key, 0, k - 1, 'REV', 'WITHSCORES');
const ranking = Array.from({ length: flat.length / 2 }, (_, i) => ({
  rank: i + 1,
  productId: flat[i * 2],
  views: Number(flat[i * 2 + 1]),
}));
```

## 동점 처리

점수가 같으면 멤버 문자열을 바이트 단위(`memcmp`)로 비교한 사전순이 2차 기준이고, `REV` 조회는 이 순서도 뒤집는다. 그래서 조회수가 같으면 `1005`가 `1003`보다 앞서는 식으로 문자열 크기 말고는 근거가 없는 순서가 고정된다. 보상이 걸린 랭킹이면 2차 기준을 점수에 넣는다. 정수부에 조회수, 소수부에 달성 시각을 두되, 먼저 달성한 쪽을 내림차순에서 앞세우려면 `최대시각 - 달성시각`처럼 뒤집어 넣는다. 점수는 double이라 정수부와 소수부를 합친 유효 자릿수가 약 15~16자리를 넘으면 정밀도가 깨지므로 자릿수 예산부터 계산한다 ([[Redis-Data-Structures|score는 double]]).

## 기간 합산

- 주간 랭킹은 따로 적재하지 않고 `ZUNIONSTORE rank:weekly:2026-W40 7 rank:daily:20260928 ... rank:daily:20261004`처럼 일간 키를 합친다. 기본은 `AGGREGATE SUM`이고 `MIN`, `MAX`와 `WEIGHTS`(최근 날짜 가중치 등)를 줄 수 있다.
- 대상 키가 이미 있으면 덮어쓰고 기존 TTL도 사라지므로 합산 뒤 `EXPIRE`를 다시 건다. 비용은 입력 원소 수와 결과 크기에 비례(O(N) + O(M log M))하므로 요청마다 합치지 말고 주기적으로 만들어 둔다.
- Cluster에서는 `ZUNIONSTORE`의 대상과 원본이 모두 같은 slot이어야 한다. `{rank}:daily:20260930`처럼 hash tag로 묶으면 되지만 순위 데이터 전체가 한 slot, 한 노드로 몰리는 대가가 있다 ([[Redis-Cluster-Sharding|Cluster]]).

## 흔한 실수

- **`ZRANK`로 인기 순위를 구함** → 오름차순이라 꼴찌가 1등으로 보인다. `ZREVRANK`에 1을 더한다.
- **날짜 키에 TTL 없음** → 서비스가 커질수록 키가 무한히 쌓인다.
- **`SADD` 결과를 보지 않고 `ZINCRBY`** → 중복 찜으로 점수가 부풀려진다.
- **큰 정수 ID나 나노초 타임스탬프를 score에 넣음** → double 정밀도 손실로 순서가 뭉개진다.

## 면접 체크포인트

- 중복 제거는 Set, 순서가 붙으면 Sorted Set으로 요구에 따라 자료구조를 바꾸는 판단
- 날짜 키로 리셋 배치를 없애는 이유와 TTL, 월간 보존 기간 설계
- `ZRANK`와 `ZREVRANK`, 0부터 시작하는 순위
- 동점 사전순의 함정과 복합 점수의 정밀도 한계
- `ZUNIONSTORE` 기간 합산과 cluster의 같은 slot 제약
- 실시간 집계와 배치 집계의 트레이드오프, 어뷰징 필터

## 출처

- [Valkey Documentation, Sorted sets](https://valkey.io/topics/sorted-sets/)
- [Valkey Documentation, ZRANGE](https://valkey.io/commands/zrange/)
- [Valkey Documentation, ZREVRANGE](https://valkey.io/commands/zrevrange/)
- [Valkey Documentation, ZUNIONSTORE](https://valkey.io/commands/zunionstore/)
- [Valkey Documentation, EXPIRE](https://valkey.io/commands/expire/)
- [Redis Documentation, ZREVRANGE](https://redis.io/docs/latest/commands/zrevrange/)
- [인프런, Hong, ZSet을 기반으로 구현하고 최적화하는 찜하기 기능](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481446)
- [인프런, Hong, 실시간 인기 순위(데이터 순위)를 최적화 하기 위한 기능과 기간별 랭킹 설계 방법](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481447)
- [인프런, Hong, 우리가 앞서 배웠던 기능들에 대한 프로그래밍 정적 구현하기](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481455)

## 관련 문서

- [[Redis-Data-Structures|Redis 자료구조]]
- [[Redis-Atomic-Operations|Redis 원자적 연산]]
- [[Redis-Atomic-Operations-Lua|Redis Lua 스크립트와 Functions]]
- [[Hot-Key|Hot key 대응]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding]]
- [[OpenSearch-Popular-Keywords-TopK|인기 검색어 top-k 설계]]
- [[ElastiCache-Use-Cases|ElastiCache 사용 사례 (리더보드)]]
