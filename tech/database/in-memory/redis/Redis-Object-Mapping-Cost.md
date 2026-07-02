---
tags: [database, redis, cache, object-mapping, spring-data-redis, performance]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Redis Object Mapping Cost", "Redis OM 추상화 비용", "Repository vs RedisTemplate", "Spring Data Redis Repository", "RedisHash"]
---

# Redis 객체 매핑 추상화의 비용 — Repository vs 단순 KV

Redis 객체 매핑(OM) 추상화는 객체를 Hash 자료구조로 변환해 저장하고 Repository 인터페이스(CRUD, count, 파생 쿼리)를 제공하는 레이어다 — Spring Data Redis의 CrudRepository(@RedisHash)가 대표적이다. 모듈 없는 순정 Redis 위에서 인덱스를 흉내내야 하므로, 편의의 대가로 **저장 한 번에 다중 명령과 부가 자료구조**가 생긴다. 단순 캐싱에는 직렬화한 값을 SET 하나로 넣는 단순 KV 방식이 맞다. (참고: Node.js와 Python의 redis-om은 RedisJSON, RediSearch 모듈에 저장과 인덱싱을 위임해 명령 증폭 구조가 다르다 — 어떤 추상화든 실제로 발행하는 Redis 명령을 알고 써야 한다는 원칙은 동일.)

## 두 방식의 내부 동작 (Spring Data Redis @RedisHash 기준)

| 연산 | OM Repository | 단순 KV (Template) |
|---|---|---|
| 저장 | DEL(기존 삭제) + HMSET(필드 전개) + SADD(키 목록 Set) + 인덱스 필드당 SADD 2회 — 최소 4~5개 | SET key json EX ttl — 1개 |
| 조회 | HGETALL(Hash 전체) + 객체 매핑 | GET + 역직렬화 |
| 삭제 | HGETALL + DEL + SREM + 인덱스 정리 — 3개 이상 | DEL — 1개 |
| 카운트 | SCARD 가능 | 불가 (직접 구현) |
| 생성 키 | Hash(데이터) + Set(전체 키 목록) + 인덱스 Set들 | String 1개 |

## 왜 명령이 불어나나 — KV 저장소의 한계 보완

Redis는 기본적으로 키(PK)로만 접근 가능하고, 전체 개수나 특정 필드 조회 기능이 없다. OM 레이어는 이 한계를 극복하려고 **전체 키를 담는 Set과 필드 인덱스 Set을 라이브러리가 직접 관리**한다 — count()는 SCARD로, findBy필드()는 인덱스 Set 조회 후 실제 Hash 재조회로 동작한다.

또 하나의 증폭 요인은 **중첩 객체의 필드 평탄화**다. Hash로 저장하려면 중첩 구조가 `items[0].detail.price` 같은 경로 키로 전개되는데, 깊고 넓은 객체는 HMSET 하나에 수천 개 필드가 실린다. 도메인 객체가 커질수록 저장 명령 자체가 무거워지는 구조다.

## 성능과 메모리 차이

구조적 이유와 실측 예 (JMH 벤치마크, 낮을수록 좋음):

| 시나리오 | Repository | 단순 KV | 차이 | 이유 |
|---|---|---|---|---|
| 저장 | 2,272μs | 926μs | 2.45배 | 다중 명령 + 추상화 레이어 오버헤드 |
| 조회 | 2,035μs | 1,509μs | 1.35배 | 같은 1개 명령이어도 HGETALL이 GET보다 무거움 |
| 저장+조회 | 3,291μs | 3,192μs | 1.03배 | 네트워크 왕복(RTT)이 지배하면 명령 수 차이가 희석 |

- **메모리는 약 1.6배** 차이 — 같은 객체가 Repository는 키당 약 1,400바이트(Hash 데이터 + 키 목록 Set + 인덱스 Set 합산), 단순 KV는 약 860바이트(String 데이터만). 수십만 건을 캐싱하면 수 GB 차이가 난다.
- 벤치마크의 절대값보다 방향이 중요하다. 동시 요청이 늘수록 Redis는 싱글 스레드라 명령량 차이가 CPU 포화로 누적된다 — 단건 벤치마크에서 2배 차이가 피크 타임에는 장애와 정상의 차이가 된다.

## 장애 패턴 — 캐시 저장이 Redis CPU를 태운다

도입 초기에는 문제가 없다가, 캐시 대상 객체가 커지고 저장 빈도가 늘면서 임계를 넘는 패턴이 전형적이다. 필드 수천 개짜리 HMSET이 초당 수백 건 들어오면 Redis 엔진의 처리량이 폭증해 CPU가 포화되고, 응답 지연과 타임아웃으로 번진다. 증상은 애플리케이션이 아니라 Redis CPU에서 먼저 나타나므로, 캐시를 썼는데 Redis가 병목이 되면 클라이언트 추상화가 발행하는 명령부터 의심한다.

## 선택 가이드

**단순 KV(또는 @Cacheable 류 캐시 추상화)를 쓰는 경우 — 사실상 모든 캐싱**: API 응답, DB 조회 결과, 외부 API 결과, 계산 결과, 세션. 대량 데이터 캐싱에서 OM을 쓰면 수백만 키를 담은 거대한 Set이 생겨 메모리 낭비와 성능 저하가 겹친다.

**OM Repository가 정당한 경우 — Redis가 캐시가 아니라 주 저장소일 때**:

- 실시간 투표처럼 필드 조건 조회와 집계(count)가 필수 기능일 때
- Feature Flag, 설정 관리처럼 소량(수백~수천 건)이고 그룹 조회가 필요할 때
- TTL로 자동 정리되는 배치 작업 상태 추적처럼 상태별 집계가 필요할 때

사용 전 체크리스트 — 하나라도 아니오면 단순 KV로:

1. count(), findAll()이 정말 필요한가?
2. 인덱스 필드 검색이 필수 기능인가?
3. 부가 메모리와 성능 저하를 감수할 가치가 있는가?
4. 데이터 규모가 관리 가능한 수준(수만 건 이하)인가?

## 진단법 — 추상화 아래를 확인한다

- `MONITOR`: 저장 한 번에 실제로 어떤 명령이 몇 개 나가는지 본다. 예상보다 많은 명령, 불필요한 SADD와 SREM, TTL 미설정이 확인 포인트. (프로덕션에서는 MONITOR 자체가 부하이므로 주의)
- `KEYS 프리픽스*` + `TYPE`: 데이터 외에 Set, 인덱스 키가 생겼는지 확인.
- `MEMORY USAGE 키`: 방식별 실제 메모리 비교.
- P50, P95, P99 응답 시간으로 방식 전환 전후를 실측.

## 사례

숙박 플랫폼의 상품 상세(PDP) 캐시에서 피크 타임마다 Redis CPU가 85~100%에 도달해 응답이 3~5배 느려지고 간헐적 타임아웃이 발생했다. 원인은 @RedisHash Repository가 중첩 객체(예: 객실 그룹 14개가 `roomGroups[0].stayInfo.checkInHour` 식으로 평탄화)를 필드 1,600~2,000개짜리 HMSET + SADD로 저장하는 구조에서 데이터 크기와 요청 빈도가 함께 늘어난 것. RedisTemplate의 SET 1개(JSON 직렬화 + EX)로 전환한 뒤 Redis CPU 100% → 10%, 평균 응답 150ms → 50ms, 타임아웃 에러 제거로 회복했다.

## 면접 체크포인트

- "캐시를 도입했는데 Redis CPU가 높다면?" → MONITOR로 실제 발행 명령 확인. 클라이언트 추상화의 부가 명령(다중 명령, 인덱스 Set)부터 의심. 추상화가 샐 때 밑단을 아는 사람이 원인을 짚는다.
- "Repository 방식과 Template 방식의 차이는?" → 편의(CRUD, count, 파생 쿼리) vs 명령 수와 메모리. 캐싱이면 단순 KV, Redis가 주 저장소이고 조건 조회가 필수일 때만 OM.
- "왜 저장은 2배대 차이인데 저장+조회 복합은 차이가 거의 없나?" → RTT가 전체 시간을 지배하면 명령 수 차이가 희석된다. 반대로 서버 CPU 관점에서는 명령량 차이가 그대로 누적된다 — 클라이언트 레이턴시와 서버 부하는 다른 축.

## 관련 문서

- [[Redis-Architecture|Redis architecture (Event Loop, RESP, Pipeline)]] — 싱글 스레드와 RTT
- [[Redis-Data-Structures|Redis 자료구조]] — Hash vs String
- [[Operations|운영 팁]] — 싱글 스레드 주의사항, 모니터링 지표
- [[Cache-Strategies|Cache 전략]]
- [[TTL|TTL 전략]]

## 출처

- [Spring Data Redis: Repository vs RedisTemplate — 실전 성능 비교 — 여기어때 기술블로그](https://techblog.gccompany.co.kr/spring-data-redis-repository-vs-redistemplate-%EC%8B%A4%EC%A0%84-%EC%84%B1%EB%8A%A5-%EB%B9%84%EA%B5%90-3e1a6ab8bda3)
