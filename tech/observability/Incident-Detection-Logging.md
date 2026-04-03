---
tags: [observability, logging, metrics, incident]
status: seminar
category: "관측가능성(Observability)"
aliases: ["장애 감지와 로깅"]
---

# 장애감지와로깅/메트릭

> 출처: [[Toss-Runners-High-Seminar|토스 러너스하이 세미나]] 기술 운영 평가

## 장애감지설계

### 스스로에게물어볼질문
1. 장애를 감지하는 방법은 무엇인가?
2. 고객 문의를 통해 감지하는가, 시스템적으로 발견하는가?
3. 현재 감지 방식이 장애를 놓칠 가능성이 있는가?
4. 더 편리하고 빠르고 안정적으로 개선할 방법은 없는가?

### 감지도구예시
- **ES Watcher + Grafana**: 로그 기반 알림과 메트릭 시각화
- **VivaSystem Fault Injection**: 장애 주입을 통한 사전 감지 테스트

## 로깅과메트릭

### 문제파악용이한상태
- 로컬 환경에서만 디버깅이 가능한가? → 프로덕션에서도 분석할 수 있어야 함
- 문제 상황 자체를 분석하기 위한 **로깅**
- 시스템 상태를 수치로 파악하기 위한 **캐시 메트릭** 등

### 가설검증을데이터로확인
- 문제와 해결 방법에 대한 가설이 정말 맞는지?
- 단순한 추측이 아닌 **데이터로 확인**했는가?
- 가설이 올바른지 검증하는 프로세스 필요

## 배포임팩트측정

- 내가 배포한 작업의 임팩트를 측정하고 명확히 보여줄 수 있는가?
- 어느 정도 개선되었는가?
- 결과가 예상과 일치하는가?
- **측정할 수 없으면 개선했다고 말할 수 없다**

## 모니터링 스택 선택

### 대안 비교 (가중치 평가)
| 스택 | TCO (0.25) | 메트릭 생태계 (0.15) | 벤더 종속 (0.10) | 총점 |
|------|-----------|-------------------|----------------|------|
| **GPL (Grafana+Prometheus+Loki)** | 5 | 5 | 5 | **4.65** |
| ELK | 3 | 4 | 4 | 3.85 |
| Datadog | 2 | 5 | 2 | 3.35 |
| CloudWatch | 3 | 3 | 2 | 3.10 |

- ELK: 로그 검색/집계는 강력하지만 동일 데이터량에서 운영 복잡도와 비용이 큼
- Datadog: 기능은 최고지만 사용량 단가가 치명적
- CloudWatch: 쿼리 UX 약하고 비용 예측성 낮음

## 모니터링 아키텍처

| 계층 | 구성 요소 | 역할 |
|------|---------|------|
| **FE** | Sentry SDK → Sentry 서버 | 브라우저 JS 에러, 네트워크 지연, 퍼포먼스 트레이스 자동 수집 |
| **BE (App)** | TraceIdMiddleware | 요청마다 고유 `x-request-id` 생성 → 로그/메트릭에 전파 |
| | HttpLoggingInterceptor | 요청/응답/예외를 한 지점에서 구조적으로 로깅 |
| | Winston JSON Logger | flat JSON line 포맷으로 기록 |
| | MetricsInterceptor + prom-client | method, route, status, latency를 Prometheus 형식으로 기록 |
| **Log Routing** | FireLens(FluentBit) → Loki | ECS/Fargate 컨테이너 stdout → 중앙집중 로깅 |
| **Metrics Plane** | Prometheus → Thanos Sidecar → S3 | 메트릭 수집 → 장기 보관. Thanos Querier로 멀티 인스턴스 통합 조회 |
| **Alerting** | Grafana Alerting → Slack | SLO 기반 알람 → 서비스/팀별 라우팅 |

## 알림 기준 (SLO 기반)

`for: 5m` 지속 조건으로 단발성 스파이크 필터링:

| 메트릭 | 임계값 | 지속 시간 |
|--------|--------|----------|
| Error rate | 1% | 5분 |
| Slow SQL | 500ms+ | 3회 지속 |
| Event Loop Lag | 100ms | 3분 |
| RDS CPU | 75% | 5분 |
| Replica Lag | 5초 | 3분 |

## 보존 전략
- **메트릭**: Prometheus 단기 보존(15일) → Thanos Sidecar가 S3로 업로드 (장기 조회 가능)
- **로그**: Loki 30일 핫 보관 → S3 콜드 보관. Compactor가 자동 블록 압축/정리
- **로그 폭증 시**: Promtail `batchSize`/`batchWait`/`ingestion rate limit` 조정 + log sampling

## 카디널리티 관리
- route/path 라벨 정규화 (URL 파라미터를 `:id`로 치환)
- **userId, traceId를 라벨에 절대 포함하지 않음** → 라벨 조합 폭증 → Prometheus OOM
- traceId는 로그 본문(flat JSON)에 기록하고 LogQL로 검색

## 면접포인트
- "장애를 어떻게 감지하나?" → SLO 기반 알림(Error rate, Slow SQL, Event Loop Lag 등)으로 시스템적 감지. `for` 지속 조건으로 오탐 필터링
- "로깅 전략?" → flat JSON line 포맷 + TraceId 전파 + 구조적 필터링(requestId/route/level)
- "배포 후 무엇을 확인하나?" → 임팩트 측정, 예상 vs 실제 비교. Grafana 대시보드에서 배포 전후 메트릭 비교
- "Prometheus pull 방식의 한계?" → 짧은 수명 컨테이너는 스크래핑 전 사라질 수 있음 → Pushgateway로 보완
- "Thanos 없이 Prometheus만?" → 단기 보존만 가능하고 디스크 부담. Thanos로 S3 장기 보관 + 멀티 인스턴스 통합 조회
