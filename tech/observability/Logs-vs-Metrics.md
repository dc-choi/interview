---
tags: [observability, logging, metrics]
status: done
category: "Observability"
aliases: ["Logs vs Metrics", "로그 vs 메트릭"]
---

# 로그 vs 메트릭

관측 가능성(Observability)의 두 기본 축. 둘 다 시스템 상태를 추적하지만 **데이터 모양·보관 비용·질문 범위**가 달라서 서로를 대체하지 못한다. Trace(추적)를 더해 **3대 축**(Logs·Metrics·Traces)을 완성.

## 정의

### 로그 (Logs)
**시간 순으로 기록된 이벤트 문자열**. "무슨 일이 언제 있었는지" 세부 정보.

```
2026-04-17 17:00:12 [ERROR] user=dc123 action=pay amount=50000 error=timeout
2026-04-17 17:00:13 [INFO]  user=dc123 action=retry attempt=2
```

- 각 이벤트가 **고유한 맥락**을 담음 (user id, request id, stack trace)
- **사람이 읽는 것**에 가까움 (디버깅 용도)

### 메트릭 (Metrics)
**시간 단위로 집계된 수치**. "얼마나" 측정 가능한 것.

```
http_requests_total{status="500"}  — 5초마다 +13, +8, +21
jvm_memory_used_bytes  — 현재 값 1.2GB
```

- 수치형, 집계 가능 (평균·합계·분위수)
- **그래프·대시보드**에 최적화

## 핵심 차이표

| 축 | 로그 | 메트릭 |
|---|---|---|
| 형태 | 텍스트 이벤트 | 수치 + 시계열 |
| 카디널리티 | 높음 (각 요청 고유) | 낮음 (라벨 조합 수십~수백) |
| 저장 비용 | 매우 큼 (TB/일 흔함) | 작음 (GB/일) |
| 보관 기간 | 짧게 (7~30일) | 길게 (수개월~수년) |
| 질문 범위 | "이 사용자의 X 요청이 왜 실패했나?" | "전체 에러율이 평상시보다 높나?" |
| 실시간 알림 | 부적합 (파싱 비용) | **적합** (임계치 기반) |
| 쿼리 속도 | 느림 (풀텍스트 검색) | 빠름 (미리 집계된 수치) |

## 언제 무엇을 쓰는가

### 로그로 답하기 좋은 질문
- "어제 오후 5시 user=dc123에게 무슨 일이 있었나?"
- "이 트랜잭션 ID의 전체 여정을 추적"
- "5xx 에러의 구체적 스택 트레이스"
- "특정 기능 경로에서 생긴 예외 패턴"

### 메트릭으로 답하기 좋은 질문
- "지금 전체 QPS는?"
- "99 퍼센타일 응답 시간이 임계치를 넘었나?"
- "CPU 사용률이 지난 한 주 대비 얼마나 증가했나?"
- "에러율이 2%를 넘으면 알림"

두 축이 **상호 보완적**. 메트릭으로 이상을 감지 → 로그로 원인 파고들기가 전형적 워크플로.

## 카디널리티의 차이

메트릭은 **라벨의 조합 수**(cardinality)가 적어야 효율적. `http_requests_total{method, status, endpoint}`에서 method 3개 × status 5개 × endpoint 20개 = 300 조합 정도가 적정.

여기에 user_id(수만~수백만)를 라벨로 추가하면 **카디널리티 폭발** → 저장 비용 급증·쿼리 불가. Prometheus 운영 실패의 주 원인.

사용자 단위 추적은 **로그나 Trace에 맡기는 것**이 원칙.

## 실무 스택

### 메트릭 수집
- **Prometheus** (pull 기반, 시계열 DB)
- **Grafana** (시각화·대시보드)
- **Spring Boot Actuator / Micrometer** (앱에서 메트릭 노출)
- **StatsD·Datadog** (push 기반 상용)

### 로그 수집
- **Loki** (Prometheus 생태계의 로그 백엔드, 저비용)
- **Elasticsearch + Kibana (ELK)** (풀텍스트 검색 강력)
- **CloudWatch Logs·Datadog Logs** (관리형)
- **Logback·Winston·Pino** (앱 레벨 로거)

### 통합 레이어
- **OpenTelemetry** — 3대 축(logs·metrics·traces)을 **같은 계측기로** 수집하는 표준. 벤더 종속 줄임.
- **MDC (Mapped Diagnostic Context)** — 한 요청의 `traceId`를 로그 전체에 주입 → 검색 쉽게

## 알림 설계 원칙

메트릭 임계치 기반 알림이 기본. 로그 기반 알림은 보조.

- **Symptom 기반 (사용자에 보이는 증상)**: `error rate > 1%`, `p99 latency > 500ms`
- **Cause 기반 (원인)**: `CPU > 80%`, `disk full` → 대부분 Symptom이 먼저 터짐
- **알림 피로 방지**: 너무 많은 알림은 무시됨. Symptom 위주로 간소화

## 로그 레벨 관습

- **FATAL / ERROR**: 사람이 봐야 하는 장애
- **WARN**: 복구된 이상 (재시도 성공 등)
- **INFO**: 주요 비즈니스 이벤트 (주문 생성, 결제 완료)
- **DEBUG**: 개발·디버깅용 상세
- **TRACE**: 매우 상세 (함수 진입/종료 수준)

프로덕션은 INFO 이상만. 대량 트래픽에서 DEBUG 켜면 디스크·비용 폭발.

## Trace (3번째 축)

로그·메트릭 외에 **분산 추적(Distributed Tracing)**. 한 요청이 여러 서비스를 거칠 때의 전체 경로와 각 단계 소요시간.

- **Jaeger·Zipkin·Tempo**: Trace 백엔드
- **OpenTelemetry**: 계측 표준

MSA 환경에선 Trace가 로그·메트릭만큼 중요. 로그만으론 "어느 서비스에서 느려졌는지" 답하기 어려움.

## 흔한 실수

- **메트릭에 user_id·request_id 같은 고카디널리티 라벨** → Prometheus 메모리 폭발
- **로그를 메트릭처럼 쓰기** — "5분간 에러 로그 수" 집계를 로그 파싱으로 매번 하면 느림. 메트릭으로 카운터 만들기
- **구조화 안 된 로그** — `console.log("user failed: " + userId)` 대신 **JSON 구조화** (`{level, msg, userId, ...}`) — 검색·집계 가능
- **알림을 로그 기반으로만 — 지연 크고 비쌈. 메트릭 기반이 정석

## 면접 체크포인트

- 로그와 메트릭의 본질 차이 (고카디널리티 이벤트 vs 저카디널리티 수치)
- 메트릭에 고카디널리티 라벨을 넣으면 안 되는 이유
- 알림을 메트릭 기반으로 설계하는 이유
- Trace가 MSA 환경에서 중요한 이유
- MDC·OpenTelemetry 역할

## 출처
- [매일메일 — 로그와 메트릭](https://www.maeil-mail.kr/question/66)

## 관련 문서
(이 카테고리의 다른 문서 참고)
