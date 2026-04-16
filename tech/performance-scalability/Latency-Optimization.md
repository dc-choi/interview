---
tags: [performance, latency, cache, database, network, async]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["Latency Optimization", "레이턴시 최적화", "응답 시간 최적화"]
---

# 레이턴시 최적화 개관

**레이턴시(Latency)**: 사용자가 요청을 전송한 시점부터 응답을 수신한 시점까지의 시간. 처리량(Throughput, 단위 시간당 처리 요청 수)과는 별개 지표다. 사용자 체감에는 **처리량보다 레이턴시가 지배적**이다.

## 레이턴시 예산 분해

레이턴시는 하나의 숫자가 아니라 **여러 구간의 합**이다. 최적화 전에 어느 구간이 병목인지부터 쪼개야 한다.

| 구간 | 대표 지연 원인 | 계측 도구 |
|---|---|---|
| **클라이언트 → Edge** | 지리적 거리, DNS 룩업, TCP/TLS 핸드셰이크 | Real User Monitoring, WebPageTest |
| **Edge → Origin** | 백본 네트워크, 부하분산, Keep-Alive 부재 | CDN 로그, APM |
| **Application 처리** | 직렬 I/O, CPU 바운드 로직, GC/Pause | APM, flame graph |
| **Database / 외부 API** | 쿼리 실행, 인덱스 미스, 외부 응답 대기 | slow query log, 분산 추적 |
| **Application → 클라이언트** | 페이로드 크기, 압축 여부, HTTP 버전 | 네트워크 탭, CDN 리포트 |

**먼저 측정, 그다음 최적화.** 측정 없이 뛰어들면 엉뚱한 구간을 튜닝하게 된다.

## 4대 최적화 전략

### 1. 캐싱 — "반복 요청을 원천에서 막는다"

| 계층 | 도구 | 트레이드오프 |
|---|---|---|
| **브라우저** | `Cache-Control`, `ETag`, `Last-Modified` | TTL 설계 실수 시 stale 데이터 |
| **CDN** | CloudFront, Cloudflare, Fastly | 캐시 무효화 전략 필요 |
| **Application** | in-memory(LRU), 분산 캐시(Redis, Memcached) | 일관성 vs 가용성 선택 |
| **DB 쿼리 결과** | Redis, Materialized View | 쓰기 비용 증가 |

**캐싱의 고전적 함정**: cache stampede(동시 만료), thundering herd, cache penetration(없는 키 반복 조회). 각각 jitter 있는 TTL, request coalescing, negative caching으로 완화.

→ 깊이 있게: [[Cache-Strategy|Cache strategy]] (체크리스트 항목)

### 2. 데이터베이스 최적화 — "DB는 거의 항상 병목이다"

- **쿼리 튜닝**: `EXPLAIN`으로 실행 계획 확인, N+1 제거, 불필요한 `SELECT *` 제거
- **인덱스 설계**: WHERE/JOIN/ORDER BY 순서에 맞춘 복합 인덱스, 커버링 인덱스. 인덱스는 쓰기 비용과 트레이드오프
- **샤딩 / 파티셔닝**: 샤드 키 선택이 핵심. Hot partition 위험을 피하는 키 설계
- **비정규화**: 조인을 쿼리 시점이 아닌 쓰기 시점으로 옮김. 일관성 복잡도 증가와 trade-off
- **Connection Pool 사이징**: 너무 크면 DB가 죽고, 너무 작으면 대기 큐가 길어짐. **DB CPU 코어 × 2~4 정도가 시작점**

→ 깊이 있게: [[Transaction-Lock-Contention|트랜잭션 경합]], [[Sorting-Operations|정렬 연산 회피]]

### 3. 비동기 처리 — "응답 임계 경로에서 작업을 들어낸다"

사용자 응답 경로에 꼭 있을 필요 없는 작업(이메일 발송, 이미지 리사이즈, 통계 집계, 외부 API 호출)을 **메시지 큐**로 밀어낸다.

| 도구 | 언제 |
|---|---|
| **Kafka** | 높은 처리량, 이벤트 소싱, 재처리 | 
| **RabbitMQ / SQS** | 작업 큐, 낮은 지연, 가벼운 팬아웃 |
| **Redis Streams / BullMQ** | Node.js 생태계, 가볍게 시작 |

핵심 설계: **멱등성(idempotent consumer)**, **재시도 + DLQ**, **순서 보장이 필요한가** 3요소.

→ 깊이 있게: 메시징 카테고리 [[메시징&파이프라인(Messaging&Pipeline)]]

### 4. 네트워크 최적화 — "왕복 횟수와 페이로드를 줄인다"

- **HTTP/2, HTTP/3**: 멀티플렉싱, 헤더 압축, QUIC로 핸드셰이크 단축
- **Keep-Alive / Connection Reuse**: TCP·TLS 핸드셰이크 재사용. HTTP 클라이언트의 connection pool 설정 확인
- **압축**: 텍스트 응답은 Brotli > gzip. 이미지는 WebP/AVIF
- **페이로드 최소화**: 필요한 필드만 반환(GraphQL 또는 field mask), 불필요한 목록 페이징
- **CDN 앞단 배치**: 정적 리소스뿐 아니라 API 캐시도 고려
- **프리로드 / 프리페치**: `<link rel="preload">`, 서비스 워커 캐시

→ 깊이 있게: [[HTTP-Seminar|HTTP 세미나]], [[HTTPS-TLS|HTTPS/TLS]]

## 측정과 검증 — 평균이 아니라 꼬리를 본다

- **P50, P95, P99, P99.9**: 평균값은 꼬리를 감춘다. 사용자 불만은 꼬리에서 나옴
- **분산 추적 (Distributed Tracing)**: OpenTelemetry, Jaeger, Tempo로 구간별 분해
- **부하 테스트**: k6, Locust, Gatling로 실제 부하 하에서의 P99 검증
- **SLO 설정**: "API P99 < 300ms at 99.9% availability" 같은 구체 목표를 먼저 정하고 최적화

## 흔한 실수

- **병목 측정 없이 캐시부터 넣는다** → 정작 병목은 외부 API였음
- **P50만 본다** → 10%의 고객이 20초를 기다리는데 보이지 않음
- **모든 것을 비동기로 만든다** → 응답 일관성·디버깅 난이도만 급증
- **인덱스를 무작정 추가한다** → 쓰기 성능 붕괴, insert·update TPS 급락
- **캐시 TTL이 전부 같다** → cache stampede로 DB가 한 번에 터짐
- **로컬에서만 테스트한다** → 지리적 거리·네트워크 조건을 반영 못함

## 면접 체크포인트

- **레이턴시 vs 처리량** 차이를 설명할 수 있는가
- **P50 vs P99** 중 어느 쪽을 왜 보는가
- **캐시 일관성 전략**(write-through / write-back / write-around)을 말할 수 있는가
- **N+1 문제**와 해결법(eager loading, DataLoader, batching)을 설명할 수 있는가
- 비동기 처리에서 **멱등성·순서·실패 재처리**를 어떻게 다룰 것인가
- **HTTP/2 · HTTP/3**가 왜 레이턴시에 유리한가
- 측정 없이 최적화하면 왜 위험한가

## 출처
- [DevPill — 서비스가 느리다고요? 레이턴시 최적화의 모든 것](https://maily.so/devpill/posts/8do7dnkyogq)

## 관련 문서
- [[Transaction-Lock-Contention|트랜잭션 경합과 Lock 문제]]
- [[Sorting-Operations|정렬 연산 회피]]
- [[HTTP-Seminar|HTTP 세미나]]
- [[HTTPS-TLS|HTTPS / TLS]]
- [[Rate-Limiting|Rate Limiting]]
- [[메시징&파이프라인(Messaging&Pipeline)|메시징 & 파이프라인 인덱스]]
- [[데이터&저장소(Data&Storage)|데이터 & 저장소 인덱스]]
