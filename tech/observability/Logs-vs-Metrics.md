---
tags: [observability, logging, metrics]
status: done
verified_at: 2026-10-10
category: "Observability"
aliases: ["Logs vs Metrics", "로그 vs 메트릭"]
---

# 로그 vs 메트릭

관측 가능성(Observability)의 두 기본 축. 둘 다 시스템 상태를 추적하지만 **데이터 모양, 보관 비용, 질문 범위**가 달라서 서로를 대체하지 못한다. Trace(추적)를 더해 **3대 축**(Logs, Metrics, Traces)을 완성.

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

- 수치형, 집계 가능 (평균, 합계, 분위수)
- **그래프, 대시보드**에 최적화

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

여기에 user_id(수만~수백만)를 라벨로 추가하면 **카디널리티 폭발** → 저장 비용 급증, 쿼리 불가. Prometheus 운영 실패의 주 원인.

사용자 단위 추적은 **로그나 Trace에 맡기는 것**이 원칙.

## 실무 스택

### 메트릭 수집
- **Prometheus** (pull 기반, 시계열 DB)
- **Grafana** (시각화, 대시보드)
- **Spring Boot Actuator / Micrometer** (앱에서 메트릭 노출)
- **StatsD, Datadog** (push 기반 상용)

### 로그 수집
- **Loki** (Prometheus 생태계의 로그 백엔드, 저비용)
- **Elasticsearch + Kibana (ELK)** (풀텍스트 검색 강력)
- **CloudWatch Logs, Datadog Logs** (관리형)
- **Logback, Winston, Pino** (앱 레벨 로거)

### 통합 레이어
- **OpenTelemetry** — 3대 축(logs, metrics, traces)을 **같은 계측기로** 수집하는 표준. 벤더 종속 줄임.
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
- **DEBUG**: 개발, 디버깅용 상세
- **TRACE**: 매우 상세 (함수 진입/종료 수준)

프로덕션은 INFO 이상만. 대량 트래픽에서 DEBUG 켜면 디스크, 비용 폭발.

## Trace (3번째 축)

로그, 메트릭 외에 **분산 추적(Distributed Tracing)**. 한 요청이 여러 서비스를 거칠 때의 전체 경로와 각 단계 소요시간.

Trace는 서로 연결된 span으로 구성된다. Span은 시작과 종료 시각을 가진 작업 단위이며, 부모 span과 trace context로 호출 관계를 연결한다. 메트릭 여러 개를 모은 것과는 다르다.

- **Jaeger, Zipkin, Tempo**: Trace 백엔드
- **OpenTelemetry**: 계측 표준

MSA 환경에선 Trace가 로그, 메트릭만큼 중요. 로그만으론 "어느 서비스에서 느려졌는지" 답하기 어려움.

## 서버 관측과 사용자 경험을 함께 본다

로그, 메트릭, 트레이스는 데이터 형태의 구분이다. 어디에서 관측했는지도 별도로 확인해야 한다. 백엔드 APM에서 오류가 보이지 않는다는 사실만으로 브라우저의 사용자 여정이 정상이라고 판단할 수 없다.

| 관측 방식 | 확인하는 범위 | 해석할 때의 한계 |
|---|---|---|
| 백엔드 APM | 계측된 서버 요청의 처리 시간과 호출 관계 | 서버 요청 전에 발생한 화면 오류를 직접 설명하지 못할 수 있음 |
| 합성 점검(Synthetic Monitoring) | 미리 정한 API 요청이나 브라우저 사용자 여정을 실행한 결과 | 선택한 경로와 실행 환경 밖의 경험까지 보장하지 않음 |
| 실제 사용자 모니터링(RUM) | 수집된 사용자 세션의 프런트엔드 성능, JavaScript 오류와 동작 | 수집되지 않은 세션이나 사용하지 않은 경로의 정상 여부는 알 수 없음 |

예를 들어 주문 버튼의 JavaScript 오류로 요청 자체가 나가지 않으면 서버 오류율만으로는 원인을 찾기 어렵다. 다음 순서로 조사할 수 있다(진단 예시).

1. RUM에서 실패한 화면 동작과 오류를 찾고, 같은 시간대의 서버 요청 유무를 대조한다.
2. 합성 점검에 해당 사용자 여정과 기대 결과를 넣어 재현 가능한 실패인지 확인한다.
3. 서버까지 요청이 도달했다면 trace와 로그로 느리거나 실패한 단계를 좁힌다.

세 신호가 연결되지 않는 경우에도 장애 원인과 수집 누락을 구분한다. 공통 시간 범위, 환경, 배포 버전과 요청 식별자를 맞추고 계측 및 샘플링 범위를 확인한다. 쓰기 여정의 합성 점검은 테스트 데이터와 외부 부수효과를 통제한 환경에서 설계한다.

## 흔한 실수

- **메트릭에 user_id, request_id 같은 고카디널리티 라벨** → Prometheus 메모리 폭발
- **로그를 메트릭처럼 쓰기** — "5분간 에러 로그 수" 집계를 로그 파싱으로 매번 하면 느림. 메트릭으로 카운터 만들기
- **구조화 안 된 로그** — `console.log("user failed: " + userId)` 대신 **JSON 구조화** (`{level, msg, userId, ...}`) — 검색, 집계 가능
- **알림을 로그 기반으로만** — 지연과 쿼리 비용을 확인하고 반복적인 수치 집계는 메트릭으로 분리한다.

## 면접 체크포인트

- 로그와 메트릭의 본질 차이 (고카디널리티 이벤트 vs 저카디널리티 수치)
- 메트릭에 고카디널리티 라벨을 넣으면 안 되는 이유
- 알림을 메트릭 기반으로 설계하는 이유
- Trace가 MSA 환경에서 중요한 이유
- MDC, OpenTelemetry 역할

## 출처

2026-10-10에는 Trace의 span 구성과 서버 관측, 합성 점검, RUM의 범위를 대조했다. 개별 서비스의 계측 설정이나 실제 장애 재현을 검증한 기록은 아니다.

- [OpenTelemetry, Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Real User Monitoring — Datadog](https://www.datadoghq.com/product/real-user-monitoring/)
- [Synthetic Monitoring — Datadog](https://www.datadoghq.com/product/synthetic-monitoring/)
- [매일메일 — 로그와 메트릭](https://www.maeil-mail.kr/question/66)

## 관련 문서
- [[OpenTelemetry|OpenTelemetry와 분산 추적]]
- [[Datadog-Operations|Datadog 운영 지도]]
- [[Incident-Runbook|장애 대응 런북]]
