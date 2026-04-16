---
tags: [database, redis, cache, cache-strategy]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Cache 전략", "Cache Strategies", "캐싱 전략"]
---

# Cache 전략

캐싱 전략은 **데이터 접근 패턴(읽기/쓰기 비율·일관성 요구·재사용 빈도)** 에 따라 선택해야 한다. 잘못된 전략은 캐시 무용지물이 되거나 오히려 장애를 만든다. 읽기 쪽 2가지, 쓰기 쪽 3가지, 총 5가지가 실무의 표준 레퍼토리.

## 전략 개관

| 전략 | 영역 | 데이터 흐름 | 주 용도 |
|---|---|---|---|
| **Cache-Aside (Look-Aside)** | 읽기 | 앱이 캐시·DB를 직접 조율 | 범용, 가장 흔함 |
| **Read-Through** | 읽기 | 캐시가 미스 시 자동으로 DB 조회 | 캐시 라이브러리 제공 시 |
| **Write-Through** | 쓰기 | 쓰기를 캐시와 DB 동시에 (동기) | 일관성 필수, 재사용 확실 |
| **Write-Around** | 쓰기 | DB에만 쓰고 캐시는 건너뜀 | 쓰고 나서 거의 안 읽는 데이터 |
| **Write-Back (Write-Behind)** | 쓰기 | 캐시에 쓰고 DB는 비동기 | 쓰기 성능 최우선 |

## 읽기 전략

### 1. Cache-Aside (Look-Aside) — 가장 흔함

**흐름**
1. 앱이 먼저 캐시 조회
2. **Hit**: 값 반환
3. **Miss**: DB 조회 → 결과를 캐시에 저장 → 반환

값이 없을 때만 로드하므로 **Lazy Loading**이라고도 부름.

**장점**
- 구현 단순, 어떤 캐시·DB 조합에도 적용
- 캐시 장애 시에도 DB로 fallback 가능 (복원력)

**단점**
- 첫 요청마다 미스 지연 (cache warming으로 완화)
- **Cache Stampede**: 인기 키가 만료되는 순간 동시 DB 조회 폭주 ([[Cache-Stampede]])
- 캐시와 DB의 일관성을 앱이 관리 — 쓰기 후 캐시 무효화 로직이 빠지면 stale 데이터

### 2. Read-Through — 캐시 라이브러리가 자동

**흐름**
1. 앱이 캐시에게 요청
2. **Hit**: 반환
3. **Miss**: **캐시 라이브러리**가 자동으로 DB 조회 → 캐시 갱신 → 반환 (앱은 DB 모름)

**장점**
- 앱 코드가 캐시·DB 이원화 관리 안 해도 됨 — 단순
- 모든 미스를 동일 방식으로 처리 (일관된 데이터 모델)

**단점**
- 캐시와 DB의 데이터 모델이 같아야 함 (중간 변환 불가)
- 캐시 라이브러리 의존 (EHCache, Caffeine + loader, AWS DAX 등)
- 첫 요청 지연은 Cache-Aside와 동일

### Cache Warming (공통 보완)

두 읽기 전략 모두 "첫 미스 지연"이 있다. **캐시 워밍**으로 사전 주입해 완화:
- 서비스 오픈 전 미리 hot 데이터 적재
- 배포 후 `preloader` 스크립트로 필수 키 주입
- 정기 새로고침 (인기 상품, 자주 조회되는 카테고리)

## 쓰기 전략

### 3. Write-Through — 동시에 쓰기 (동기)

**흐름**
1. 앱이 쓰기 요청
2. 캐시에 저장 + DB에 저장 (둘 다 성공해야 완료)
3. 응답

**장점**
- 캐시-DB **강한 일관성** (읽을 때 항상 최신)
- Read-Through와 조합 시 캐시 미스 자체가 거의 없어짐

**단점**
- 매 쓰기가 두 저장소 대기 → 지연 증가
- **재사용되지 않는 데이터도 캐시에 저장** → 리소스 낭비 (TTL 설계 필수)
- 한쪽 실패 시 롤백·재시도 로직 필요

### 4. Write-Around — DB에만 쓰고 캐시 건너뜀

**흐름**
1. 쓰기는 DB로만
2. 캐시에는 아무것도 하지 않음
3. 이후 읽기에서 Cache-Aside/Read-Through가 자연스럽게 캐시에 올림

**장점**
- **쓰고 나서 거의 안 읽히는 데이터**에 최적 (로그·시계열)
- 불필요한 캐시 적재 방지

**단점**
- 쓰기 직후 읽기에서 무조건 미스 (최초 지연)
- 쓰기 후 바로 읽는 패턴에는 부적합

### 5. Write-Back (Write-Behind) — 비동기 쓰기

**흐름**
1. 쓰기는 캐시에만 저장 → 즉시 응답
2. 백그라운드로 DB에 배치 쓰기

**장점**
- 쓰기 응답 지연 최소 (캐시만 대기)
- 여러 쓰기를 묶어 **DB 부하 급감** (예: DynamoDB 요청 수 절감으로 비용 절감)

**단점**
- **캐시 장애 시 데이터 손실 위험** — 아직 DB 반영 안 된 데이터가 사라짐
- 구현 복잡 (배치·재시도·순서 보장·중복 처리)
- 일관성 윈도우가 길어 다른 소비자가 stale 데이터 조회 가능

## 전략 선택 매트릭스

| 데이터 특성 | 권장 전략 |
|---|---|
| 읽기 중심, 일관성 적당히 | **Cache-Aside + TTL** |
| 읽기·쓰기 모두 많고 일관성 필수 | **Read-Through + Write-Through** |
| 쓰고 나서 잘 안 읽히는 로그·시계열 | **Write-Around** |
| 쓰기 폭주 + 즉시 DB 반영 불필요 | **Write-Back** (단, 손실 허용) |
| 사용자 프로필·설정 (읽기 중심, 가끔 갱신) | **Cache-Aside + 쓰기 시 캐시 무효화** |
| 인증 토큰·세션 (재생성 가능) | **Cache-Aside** or **Write-Around** |

## 실무 고려사항

- **TTL 설계**: 얼마나 stale이 허용되는가? 프로필은 분, 뉴스는 초, 재고는 즉시
- **캐시 무효화 전략** — 쓰기 시 `DEL`/`EVICT`를 꼭 호출해야 일관성 유지 (자세한 건 [[Cache-Invalidation]])
- **Cache Stampede 방지** — 인기 키 만료 시 동시 쿼리 폭주. Jitter TTL·Request Coalescing·probabilistic refresh ([[Cache-Stampede]])
- **Hot Key 분산** — 특정 키에 트래픽 집중 시 샤딩·로컬 캐시 추가 ([[Hot-Key]])
- **캐시 크기·Eviction 정책** — LRU·LFU·ARC 선택. 메모리 부족 시 제거 순서 결정
- **모니터링 필수** — hit rate·miss rate·eviction rate·p99 latency. Hit rate < 80%면 전략 재검토

## 흔한 실수

- **Write-Through 없이 쓰기 후 캐시 무효화 누락** → stale 영구 노출
- **Write-Back에 중요 데이터 사용** → 장애 시 손실
- **모든 쿼리에 캐시** → 재사용 없는 데이터까지 올려 메모리 낭비 (Write-Around 미사용)
- **무한 TTL** → 잊혀진 데이터가 메모리 점유
- **캐시를 "DB 보조"로만 생각** → Request Coalescing·Hot Key 같은 고유 패턴 놓침
- **AWS DAX 같은 Write-Through 전용 도구에 쓰기 폭주 워크로드** → 비용 절감 효과 없음

## 면접 체크포인트

- **5가지 전략**의 동작 원리와 선택 기준
- **Cache-Aside vs Read-Through** 차이 (앱이 관리 vs 캐시 라이브러리가 관리)
- **Write-Through vs Write-Back** 트레이드오프 (일관성 vs 쓰기 성능)
- **Write-Around**가 어떤 데이터 유형에 적합한가 (로그·시계열)
- Cache-Aside의 **Cache Stampede** 발생 원인과 완화책
- 전략과 **일관성·지연·비용** 트레이드오프
- TTL·무효화·워밍이 각 전략에 주는 영향

## 출처
- [DevPill — 잘못된 캐싱 전략이 당신의 서비스를 망치고 있습니다](https://maily.so/devpill/posts/8do7dxleogq)

## 관련 문서
- [[Cache-Basics|캐시 기초]]
- [[Cache-Invalidation|Cache invalidation]]
- [[Cache-Stampede|Cache stampede 방지]]
- [[Hot-Key|Hot key 대응]]
- [[TTL|TTL 전략]]
- [[Redis-Architecture|Redis Architecture]]
- [[Latency-Optimization|레이턴시 최적화 개관]]
