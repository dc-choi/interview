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
- **장애 주입 도구**: 장애 주입을 통한 사전 감지 테스트

## 로깅과메트릭

### 문제파악용이한상태
- 로컬 환경에서만 디버깅이 가능한가? → 프로덕션에서도 분석할 수 있어야 함
- 문제 상황 자체를 분석하기 위한 **로깅**
- 시스템 상태를 수치로 파악하기 위한 **캐시 메트릭** 등

### 가설검증을데이터로확인
- 문제와 해결 방법에 대한 가설이 정말 맞는지?
- 단순한 추측이 아닌 **데이터로 확인**했는가?
- 가설이 올바른지 검증하는 프로세스 필요

### 예외를 삼키는 로그는 로그가 아니다
- 재시도 래퍼가 예외를 잡아 토픽과 시도 횟수 같은 요약만 남기면, 안전한 재시도 코드가 정작 원인 추적의 눈을 가린다
- 스택트레이스 없는 에러 로그는 무언가 실패했다는 알림일 뿐이다 — 재시도하더라도 원인 예외의 메시지와 스택은 남긴다

## 배포임팩트측정

- 내가 배포한 작업의 임팩트를 측정하고 명확히 보여줄 수 있는가?
- 어느 정도 개선되었는가?
- 결과가 예상과 일치하는가?
- 개선을 주장하려면 정량 지표, 사용자 피드백이나 재현 가능한 관찰처럼 판단 가능한 근거가 필요하다. 근거가 아직 없으면 구현 완료와 개선 검증을 구분한다.

## 모니터링 스택 선택

아래는 본인이 직접 수행한 경험을 공개 가능한 범위로 일반화한 사례다. 스택은 특정 서비스의 과거 점수표가 아니라 운영 인력, 예상 사용량, 데이터 보존, 검색 요구, 벤더 종속과 대응 속도를 함께 비교해 골랐다.

- **Prometheus, Grafana, Loki 계열**: 유연한 메트릭과 로그 조합을 만들 수 있지만 수집, 보존과 고가용성을 직접 운영한다.
- **ELK 계열**: 로그 검색과 집계에 강점이 있지만 데이터량에 따라 운영 복잡도와 비용을 검토한다.
- **상용 APM**: 빠른 도입과 풍부한 기능이 장점이지만 사용량 과금과 데이터 경계를 확인한다.
- **클라우드 기본 도구**: 리소스 메트릭과 서비스 통합에는 유리하지만 커스텀 지표, 고카디널리티와 알림 운영 요구를 함께 본다.

## 참조 아키텍처

이 경험에서는 프런트 오류 추적, 요청 식별자와 구조화 로그, 메트릭 수집, 로그 라우팅과 알림을 연결해 고객 문의 외에도 시스템 신호로 이상을 확인하고 배포 전후의 가설을 비교할 수 있게 했다. 아래는 제품명, 보존 기간과 운영 토폴로지를 제외한 계층별 판단이다.

| 계층 | 구성 요소 | 역할 |
|------|---------|------|
| **FE** | 오류 추적 SDK | 브라우저 오류, 네트워크 지연과 성능 trace 수집 |
| **BE (App)** | request ID, 구조화 로거와 메트릭 미들웨어 | 요청과 로그 연결, 요청과 예외 기록, route와 status 기반 지표 노출 |
| **Log Routing** | 지원되는 수집기와 로그 저장소 | stdout 수집, JSON 파싱, 라벨 정규화와 라우팅 |
| **Metrics Plane** | Prometheus 호환 수집기와 장기 저장소 | 단기 조회, 장기 보존과 통합 질의 |
| **Alerting** | 알림 엔진과 온콜 채널 | 사용자 영향과 인프라 신호의 라우팅, 억제와 중복 제거 |

수집기와 저장소의 지원 수명, 보존 정책과 데이터 경계는 배포 전에 현재 공식 문서로 확인한다. [[Loki]]

## 정적 임계 경보 설계

지속 조건(`for`)으로 단발성 스파이크를 걸러도 정적 임계 경보가 SLO 경보가 되는 것은 아니다. 실제 규칙을 만들 때 Error rate와 latency는 사용자 영향 SLI 후보로, slow query, event loop lag, CPU와 replica lag는 원인 또는 증상 지표로 나눴다. SLO로 개선한다면 목표 기간과 에러 버짓을 정한 뒤 multi-window, multi-burn-rate를 별도로 적용한다. 각 임계값은 서비스 baseline과 사용자 영향 근거를 함께 남긴다. [[Alert-Fatigue|Alert fatigue 방지]], [[SLI-SLO|SLI, SLO, Error Budget]]

| 메트릭 | 설계 기준 |
|--------|----------|
| Error rate, latency | 사용자 영향 baseline, 최소 트래픽과 지속 시간 |
| Slow query | query class별 정상 범위, 반복 횟수와 조사 가능성 |
| Event loop lag | 런타임 특성, backlog와 GC 영향 |
| CPU, connection, memory | 포화 전 여유와 autoscaling 또는 완화 수단 |
| Replica lag | read consistency 계약과 허용 가능한 freshness |

## 보존 전략
- **메트릭**: 단기 운영 조회와 장기 분석의 보존 목적을 분리하고, 장기 저장소와 통합 질의가 필요한지 결정한다.
- **로그**: hot 보관, archive, lifecycle과 복원 경로를 함께 설계한다. 정확한 저장 경계와 보존 기간은 규정과 조사 요구에 맞춰 정한다.
- **로그 폭증 시**: 수집기의 batch와 rate limit, log sampling, drop 정책을 조정하되 중요한 오류와 감사 로그를 잃지 않도록 검증한다.

## 카디널리티 관리
- route/path 라벨 정규화 (URL 파라미터를 `:id`로 치환)
- **userId, requestId를 메트릭 라벨에 포함하지 않음** → 라벨 조합 폭증과 메모리 사용량 증가
- requestId는 로그 본문(flat JSON)에 기록하고 LogQL로 검색. 실제 분산 추적을 도입하면 별도의 traceId와 spanId를 전파한다
- 알람과 대시보드에서 쓰지 않는 라벨과 필드는 수집 단계에서 drop (`metric_relabel_configs`) — 저장 전에 잘라야 비용과 OOM을 동시에 막는다 ([[Cardinality]])

## 면접포인트
- "장애를 어떻게 감지하나?" → Error rate, Slow SQL, Event Loop Lag 등의 정적 임계 경보와 `for` 지속 조건을 조합한다. SLO 경보는 사용자 영향 SLI와 burn rate를 별도로 설계한다.
- "로깅 전략?" → flat JSON line 포맷, requestId 전파와 구조적 필터링(requestId/route/level)을 사용한다. 분산 추적이 없을 때도 원인 예외와 요청 맥락을 남긴다.
- "배포 후 무엇을 확인하나?" → 사전에 둔 가설과 실제 지표를 비교하고, 배포 전후 대시보드 변화를 확인한다.
- "Prometheus pull 방식의 한계?" → 스크랩 전에 끝나는 서비스 수준 batch job은 Pushgateway를 검토. 일반적인 단명 컨테이너는 서비스 디스커버리나 지원되는 수집 에이전트로 관측하고 Pushgateway에 무차별 push하지 않음
- "Thanos 없이 Prometheus만?" → Prometheus의 로컬 보존 기간은 설정할 수 있지만 단일 인스턴스 디스크와 조회 범위에 묶인다. Thanos로 object storage 장기 보관, 글로벌 조회와 HA 구성을 더함

## 출처

- [Prometheus, When to use the Pushgateway](https://prometheus.io/docs/practices/pushing/)
- [Prometheus, Storage](https://prometheus.io/docs/prometheus/latest/storage/)
- [Thanos, Getting Started](https://thanos.io/tip/thanos/getting-started.md/)
- [유닛 테스트 209개를 통과한 PR인데, 실제로 돌려보니 저장이 한 건도 안 됐다 — velog](https://velog.io/@donghoong2/OCR-WORKER-%EC%9C%A0%EB%8B%9B-%ED%85%8C%EC%8A%A4%ED%8A%B8-209%EA%B0%9C%EB%A5%BC-%ED%86%B5%EA%B3%BC%ED%95%9C-PR%EC%9D%B8%EB%8D%B0-%EC%8B%A4%EC%A0%9C%EB%A1%9C-%EB%8F%8C%EB%A0%A4%EB%B3%B4%EB%8B%88-%EC%A0%80%EC%9E%A5%EC%9D%B4-%ED%95%9C-%EA%B1%B4%EB%8F%84-%EC%95%88-%EB%90%90%EB%8B%A4)
