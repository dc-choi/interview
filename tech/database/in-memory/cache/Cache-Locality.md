---
tags: [database, cache, locality, fundamentals]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Cache Locality", "Locality Principle", "지역성 원리"]
---

# Cache Locality 원리

캐시가 효과를 내는 근본 이유는 **데이터 접근이 균등하지 않다**는 사실. 특정 데이터가 짧은 시간 안에 다시 접근되거나, 인접한 데이터가 함께 접근되는 패턴이 존재하기 때문에 작은 메모리에 hot 데이터만 담아도 평균 응답 시간이 극적으로 줄어든다.

## 두 가지 지역성

| 종류 | 정의 | 캐시 적용 |
|------|------|----------|
| **Temporal Locality (시간적)** | 한 번 접근한 데이터는 가까운 미래에 다시 접근될 가능성↑ | LRU, LFU 같은 eviction 정책의 근거 |
| **Spatial Locality (공간적)** | 한 데이터 근처의 데이터도 곧 접근될 가능성↑ | Prefetch, 캐시 라인, 인덱스 페이지 단위 적재 |

## 80/20 법칙 (Pareto)

실제 워크로드에서 **20%의 hot 데이터가 80%의 요청을 처리**하는 분포가 흔하다. 이 분포가 곧 캐시의 성공 조건:

| 분포 | 캐시 효과 |
|------|----------|
| 멱법칙(Power Law), Zipfian | 매우 큼 — 작은 캐시로도 hit rate 90%+ |
| 균등(Uniform) | 작음 — 캐시 크기 ≈ 데이터 크기여야 효과 |
| 일회성, 랜덤 | 거의 없음 — 캐시가 오히려 오버헤드 |

캐시 도입 전에 **분포 측정이 선행**돼야 한다. Hit rate 추정의 본질은 분포 추정.

## 암달의 법칙 (부분 개선의 상한)

80/20 분포가 어디를 캐시할지 알려 준다면, 암달의 법칙은 그 부분을 빠르게 했을 때 전체가 얼마나 빨라질 수 있는지의 상한을 준다. 병렬 처리의 한계를 다룬 1967년 논문에서 이름이 왔고, 일반형은 개선한 부분의 비율과 배수로 쓴다.

```
전체 속도 향상 = 1 / ((1 - p) + p / s)
p = 개선 대상이 전체 실행 시간에서 차지하는 비율
s = 그 부분만 떼어 본 속도 향상 배수
```

| p | s | 전체 속도 향상 |
|---|---|---------------|
| 0.8 | 10 | 1 / (0.2 + 0.08), 약 3.6배 |
| 0.8 | 무한대 | 최대 1 / 0.2 = 5배 |
| 0.2 | 무한대 | 최대 1 / 0.8 = 1.25배 |

- s를 아무리 키워도 전체 향상은 `1 / (1 - p)`를 넘지 못한다. 요청 시간에서 비중이 작은 경로는 캐시로 아무리 빠르게 해도 체감이 작으므로, 캐시 대상은 시간 비중이 큰 hot 경로여야 한다. p는 구간별 지연을 쪼개 측정해서 구한다 ([[Latency-Optimization|레이턴시 예산 분해]])
- 캐시에서 s는 적중률이 정한다. 원본 조회 o, 캐시 조회 c, 적중률 h면 캐시를 붙인 조회의 평균 시간은 `h × c + (1 - h) × (c + o)`다 (miss 뒤 캐시 저장 비용은 생략). o = 40ms, c = 1ms로 가정하면 h = 0.9에서 평균 5ms라 s = 8이고, 이 조회가 요청 시간의 80%면 전체는 1 / (0.2 + 0.1), 약 3.3배다. h가 0.8로 내려가면 평균 9ms, s는 약 4.4, 전체는 약 2.6배로 줄어든다
- p를 어떤 시간 기준으로 잴지 먼저 정한다. 한 API의 응답 시간이면 그 요청 안에서의 비중이고, 서버나 DB 전체 부하면 모든 요청의 시간 합에서 그 경로가 차지하는 비중이다. 노출이 적은 화면은 요청 안의 비중이 커도 전체 부하 기준의 p가 작다 ([[Cache-Decision|캐시 도입과 제거의 노출률]])
- 같은 식이 병렬화 이득의 상한에도 쓰인다. 병렬로 나눌 수 없는 구간의 비율이 전체 향상의 천장을 정한다

## 적용 사례 — 계층별 동일 원리

| 계층 | Temporal 활용 | Spatial 활용 |
|------|--------------|-------------|
| **CPU 캐시** (L1/L2/L3) | 최근 명령, 데이터 보관 | **캐시 라인** 64B 단위 적재 |
| **OS 페이지 캐시** | 최근 파일 페이지 보관 | **read-ahead** (인접 페이지 미리) |
| **DB Buffer Pool** | hot 페이지 보관 | **B+Tree leaf** 인접 페이지 함께 |
| **앱 캐시 (Redis 등)** | LRU, LFU eviction | **Prefetch** (관련 키 미리 로드) |
| **CDN** | 최근 콘텐츠 엣지 보관 | 동일 origin 인접 리소스 사전 캐시 |

같은 원리가 nanoseconds 부터 millisecond까지 모든 계층에 일관되게 작동.

## Spatial Locality와 Prefetch

Spatial은 코드로 직접 활용 가능 — **읽힐 것을 미리 읽기**.

| 패턴 | 예시 |
|------|------|
| **ID 인접** | `/users/123` 조회 → `/users/122`, `/users/124`도 곧 조회 가능성 |
| **카테고리** | 상품 상세 → 같은 카테고리 다른 상품 |
| **시계열** | 오늘 데이터 → 어제, 내일 데이터 |
| **그래프 인접** | 친구 목록 조회 → 각 친구 프로필 일괄 |

NestJS 같은 환경에서는 응답 직후 `setImmediate`로 비동기 prefetch 트리거 — 응답 차단 없이 인접 데이터를 캐시에 올린다.

## 일회성 트래픽이 hot 키를 밀어내는 함정

LRU는 최근에 쓰지 않은 키부터 지우므로 **크롤러, 이상 트래픽이 한 번에 대량 키에 접근**하면 진짜 hot 키가 밀려난다 (cache pollution).

대응:
- **LFU로 전환** — 빈도 기반이라 일회성 폭증에 강함
- **bot 트래픽 분리** — 별도 캐시 인스턴스 또는 캐시 우회
- **Window LFU, ARC** 같은 하이브리드 정책 — 최신성과 빈도 동시 고려

## Working Set 개념

특정 시간 윈도우 안에 접근되는 **고유 키의 집합**. 캐시 크기는 working set 크기 이상이어야 hit rate가 의미 있게 나옴.

```
hit_rate ≈ 1 - (working_set_size - cache_size) / total_requests   (간략)
```

운영 모니터링:
- 캐시 크기 vs 추정 working set 비교
- `evicted_keys` 폭증 = cache_size < working_set 신호
- 시간대별 working set 변동 (피크 vs 야간)

## 흔한 실수

- **분포 측정 없이 도입** — 균등 분포면 캐시 효과 없음
- **Spatial 무시 단일 키 캐시** — 인접 데이터까지 prefetch하면 hit rate 크게 오름
- **bot 트래픽이 진짜 hot을 가림** — 측정 시 user-agent 필터 필요
- **working set 변동 무시** — 야간엔 작아도 피크엔 캐시보다 큰 경우
- **CPU 캐시 라인 무시한 자료구조** — 핫 필드끼리 묶어 같은 캐시 라인에 두면 spatial 활용
- **요청 시간 비중이 작은 경로를 캐시** — 적중률이 높아도 전체 향상은 `1 / (1 - p)`에 묶임

## 면접 체크포인트

- Temporal vs Spatial Locality 차이와 각각 어떤 정책에 매핑되는가
- 80/20 분포가 캐시의 전제 조건인 이유 — 균등 분포면 무용
- 암달의 법칙으로 캐시 효과의 상한을 계산하는 방법 (p, s, 적중률이 s를 정하는 방식)
- LRU의 cache pollution 문제 → LFU, ARC 대안
- Spatial Locality를 앱에서 활용하는 방법 (prefetch 패턴)
- 같은 원리가 CPU, OS, DB, 앱, CDN까지 일관되게 적용되는 이유
- working set과 캐시 크기 관계
- DB의 B+Tree leaf 인접 페이지 적재가 spatial 활용 사례

## 출처
- [TS Backend Meetup — NestJS 캐싱 전략 정리]
- [AFIPS Spring Joint Computer Conference 1967 — Validity of the single processor approach to achieving large scale computing capabilities](https://dl.acm.org/doi/10.1145/1465482.1465560)
- [인프런, 성장랜턴, 캐시 & CDN](https://www.inflearn.com/courses/lecture?courseId=335130&unitId=278151)

## 관련 문서
- [[Cache-Basics|캐시 기초]]
- [[Cache-Decision|Cache 도입, 제거 의사결정 (노출률)]]
- [[Cache-Strategies|Cache 전략]]
- [[Multi-Level-Cache|Multi-Level Cache]]
- [[Hot-Key|Hot key 대응]]
- [[Redis-Memory-Eviction|Redis Eviction (LRU/LFU)]]
