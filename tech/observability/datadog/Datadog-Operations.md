---
tags: [observability, datadog, apm, slo, incident-response]
status: done
verified_at: 2026-07-15
category: "관측가능성(Observability)"
aliases: ["Datadog Operations", "Datadog 운영 지도"]
---

# Datadog 운영 지도

이 문서는 RED, SLO, 카디널리티 같은 관측성 원리를 Datadog의 화면과 설정에 연결한다. 제품 메뉴를 순서대로 설명하지 않고 서비스 하나를 식별하고, 장애를 탐지하고, 원인을 좁히고, 배포와 연결하는 운영 흐름을 기준으로 삼는다.

## 1. 서비스 식별부터 통일한다

Datadog은 `env`, `service`, `version` 세 예약 태그를 Unified Service Tagging의 중심으로 사용한다.

| 태그 | 질문 | 예시 원칙 |
|---|---|---|
| `env` | 어느 실행 환경인가 | `prod`, `staging`처럼 제한된 집합 |
| `service` | 어느 논리 서비스가 책임지는가 | 저장소나 컨테이너 이미지명이 아니라 운영 단위 |
| `version` | 어느 배포 결과인가 | 배포 버전이며 Git SHA는 별도 메타데이터로 연결 |

세 태그가 로그, 메트릭, 트레이스와 컨테이너에서 다르면 신호 간 통합 탐색, 필터링과 배포 비교가 깨질 수 있다. 먼저 서비스별 태그 값과 생성 지점을 정하고 `DD_ENV`, `DD_SERVICE`, `DD_VERSION` 또는 해당 통합 설정이 배포마다 일치하는지 검증한다. `git.commit.sha`는 이 세 태그를 대체하지 않는다.

사용자 ID, 요청 ID, 전체 URL처럼 값의 종류가 계속 늘어나는 정보는 메트릭 태그로 두지 않는다. 요청 단위 식별자는 로그와 트레이스 속성으로 보낸다.

## 2. Catalog에 운영 책임을 붙인다

Catalog는 서비스 목록만 만드는 공간이 아니라 책임과 운영 문맥을 연결하는 진입점이다.

- 소유자는 개인이 아니라 Team으로 지정한다.
- 서비스 설명, 저장소, 대시보드, Runbook과 온콜 링크를 연결한다.
- monitor에 `service`와 `team` 태그를 붙여 검색과 라우팅 기준을 맞춘다.
- 주 소유 팀은 하나로 두고 보조 소유자는 필요한 경우에만 추가한다.

서비스가 APM에 나타나는 것과 운영 책임이 정의된 것은 별개다. 새 서비스가 자동 발견돼도 소유자와 Runbook이 없으면 장애 시 담당자를 찾는 시간이 남는다.

## 3. 로그와 트레이스를 요청 단위로 연결한다

로그에는 Datadog 상관분석용 필드인 `dd.trace_id`, `dd.span_id`와 Unified Service Tagging 값인 `env`, `service`, `version`이 들어가야 한다. 자동 log injection을 지원하는 언어에서는 이를 우선 사용하고, 로그 수집 파이프라인이 해당 값을 속성으로 파싱하는지 확인한다. Node.js에서는 JSON 로그를 사용하고 tracer를 logger보다 먼저 초기화한다. NestJS의 사용자 정의 logger는 자동 주입이 실제 출력까지 이어지는지 별도로 시험한다.

```text
Monitor
  → Service Page
  → 느리거나 실패한 Resource
  → Trace flame graph
  → 문제 Span
  → 같은 trace_id의 로그
  → DB, 외부 API, 인프라 신호
```

트레이스와 로그는 서로 독립적으로 샘플링될 수 있다. 로그에 trace ID가 있는데 연결된 트레이스가 보이지 않는 현상만으로 계측 실패라고 단정하지 않고 ingestion과 retention 설정을 확인한다.

## 4. Service Page에서 RED를 본다

Service Page의 시작점은 요청 수, 오류율, 지연이다. 전체 서비스에서 이상을 찾은 뒤 Resource 단위로 내려가 endpoint나 query를 좁힌다.

1. 요청량 변화가 오류율과 함께 움직이는지 본다.
2. 평균보다 p95와 p99 지연을 본다.
3. 특정 resource, version과 dependency에 편중됐는지 나눈다.
4. trace에서 시간이 가장 긴 span과 error span을 확인한다.
5. 관련 로그와 DB, 컨테이너 지표로 원인 가설을 검증한다.

APM trace는 원인을 확정하는 증거가 아니라 다음 확인 지점을 좁히는 지도다. 샘플링되지 않은 요청과 애플리케이션 밖의 병목은 다른 신호로 보완한다.

## 5. Monitor와 SLO의 역할을 분리한다

| 수단 | 답하는 질문 | 예시 |
|---|---|---|
| Monitor | 지금 사람이 행동해야 하는가 | 결제 실패, 수집 중단, 오류율 급증 |
| SLO | 일정 기간 사용자 약속을 지켰는가 | 성공 요청 비율, freshness 충족 비율 |
| Dashboard | 상태와 원인을 탐색할 수 있는가 | RED, dependency, 배포 비교 |

건별로 놓치면 안 되는 크리티컬 이벤트를 장기 비율에 숨기지 않는다. 반대로 요청 수가 많은 API의 개별 5xx마다 호출하지 않고 좋은 이벤트와 나쁜 이벤트의 비율, 지속 시간과 error budget 소모로 판단한다.

Datadog SLO 유형은 다음처럼 구분한다.

- Metric-based는 `good / (good + bad)` 형태의 count 기반 SLI에 적합하다.
- Monitor-based는 monitor의 상태 이력을 사용한다. `WARN`은 정상으로 계산되며 missing data의 판정은 monitor 설정을 따른다.
- Time Slice는 1분 또는 5분 구간마다 SLI 임계값 충족 여부를 계산한다. missing data는 uptime으로 계산되므로 무수집을 성공으로 오해하지 않도록 별도 monitor가 필요하다.

기존 monitor를 SLO로 바꾸기 전에 그것이 사용자 경험을 직접 대표하는지 확인한다.

## 6. 행동 가능한 Monitor를 만든다

알림에는 다음 정보가 있어야 한다.

- 무엇이 실패했고 사용자 영향이 무엇인지
- 현재 값, 임계값과 지속 시간
- 영향을 받은 `service`, `env`, `version`과 resource
- 첫 확인 대시보드와 trace 검색 링크
- 즉시 완화 절차와 Runbook
- 담당 팀과 escalation 경로
- 복구 알림 조건

CPU나 메모리 같은 원인 후보보다 오류율, 처리 지연, backlog와 freshness처럼 사용자 영향에 가까운 증상으로 호출한다. 자원 지표는 진단과 용량 경보에 사용한다.

임계값은 다른 회사의 숫자를 복사하지 않는다. 평시 분포, 허용 가능한 사용자 영향, 대응에 필요한 lead time으로 정하고 false positive와 미탐을 회고해 조정한다.

## 7. 배포를 관측 신호로 만든다

`version` 태그가 일관되면 배포 전후의 요청량, 오류율, 지연과 새 error type을 비교할 수 있다.

```text
build artifact
  → version과 git SHA 주입
  → 배포
  → 새 version의 trace 관측
  → 이전 version과 RED 비교
  → 이상 시 rollback 또는 forward fix
```

Datadog의 trace 기반 배포 감지는 새 `version`의 trace를 처음 관측한 시점을 배포로 본다. 트래픽이 없는 서비스는 감지가 늦거나 나타나지 않으므로 배포 파이프라인 이벤트로 보완하고, 장애 알림에는 직전 배포 링크를 붙인다.

## 8. 수집량과 보존량을 분리해 운영한다

| 대상 | Datadog 제어 지점 | 확인할 질문 |
|---|---|---|
| 전송되는 span | Ingestion Controls | 어떤 서비스와 resource를 어느 비율로 수집하는가 |
| 검색 가능한 span | Retention Filters | 어떤 span을 어떤 비율로 색인해 15일간 검색 가능하게 할 것인가 |
| 검색 가능한 로그 | index exclusion filter와 retention | 어떤 로그를 인덱스에서 제외하거나 짧게 보존하는가 |
| custom metric | 태그 cardinality와 사용량 분석 | 어떤 태그 조합이 시계열 수를 늘리는가 |

route는 실제 URL이 아니라 `/contents/:id` 같은 템플릿으로 기록하고 `user_id`, `request_id`, `content_id`는 메트릭 태그에서 제외한다. Ingestion과 retention은 서로 다른 단계이므로 오류 trace가 항상 전송되거나 검색 가능하다고 가정하지 말고 각각 검증한다.

카디널리티는 조회 성능 문제이며, 계약의 커스텀 메트릭 과금 모델에 따라 비용 문제이기도 하다. 새 태그를 추가할 때 가능한 값의 수, 필요한 보존 기간과 실제 질문을 함께 검토한다.

## 9. Monitor에서 Incident로 전환한다

조직에서 Incident Management를 사용한다면 공동 대응과 상태 공유가 필요한 장애에 incident를 열고 영향, 심각도, 지휘 역할과 타임라인을 한곳에 모은다. monitor 알림에는 incident 생성 기준과 Runbook을 연결하고 종료 뒤에는 탐지, 완화와 재발 방지 항목을 회고한다.

## 10. 기존 환경을 인수할 때 확인할 것

1. Catalog에서 담당 서비스와 dependency를 찾는다.
2. `env`, `service`, `version` 태그가 모든 신호에 이어지는지 확인한다.
3. 주요 resource의 RED 기준선과 최근 배포 차이를 본다.
4. paging monitor를 열어 임계 근거, 수신자, Runbook과 recovery 조건을 확인한다.
5. SLO가 실제 사용자 여정이나 도메인 freshness를 대표하는지 확인한다.
6. trace에서 로그, DB와 인프라로 이동할 수 있는지 시험한다.
7. ingestion, retention과 고카디널리티 태그의 비용 경로를 확인한다.

내부 URL, 실제 태그 값, 고객 식별자와 운영 임계값은 공개 가능한 vault에 옮기지 않는다. 이 문서에는 재사용 가능한 판단 기준만 남긴다.

## 관련 문서

- [[Application-Performance-Monitoring|APM과 RED]]
- [[OpenTelemetry|OpenTelemetry와 Trace Context]]
- [[Cardinality|카디널리티 관리]]
- [[SLI-SLO|SLI, SLO와 Error Budget]]
- [[Alert-Fatigue|행동 가능한 알림]]
- [[Deploy-Observability|배포 가시성]]
- [[Incident-Runbook|Incident Runbook]]

## 출처

- [Unified Service Tagging - Datadog](https://docs.datadoghq.com/getting_started/tagging/unified_service_tagging/)
- [Catalog - Datadog](https://docs.datadoghq.com/internal_developer_portal/software_catalog/)
- [Define ownership for Catalog entities - Datadog](https://docs.datadoghq.com/internal_developer_portal/catalog/set_up/ownership/)
- [Correlate Logs and Traces - Datadog](https://docs.datadoghq.com/tracing/other_telemetry/connect_logs_and_traces/)
- [Correlate Node.js Logs and Traces - Datadog](https://docs.datadoghq.com/tracing/other_telemetry/connect_logs_and_traces/nodejs/)
- [Service Page - Datadog](https://docs.datadoghq.com/tracing/services/service_page/)
- [Monitor Best Practices - Datadog](https://docs.datadoghq.com/monitors/guide/monitor_best_practices/)
- [Notification Message Best Practices - Datadog](https://docs.datadoghq.com/monitors/guide/notification-message-best-practices/)
- [Service Level Objectives - Datadog](https://docs.datadoghq.com/service_level_objectives/)
- [Metric-based SLOs - Datadog](https://docs.datadoghq.com/service_level_objectives/metric/)
- [Monitor-based SLOs - Datadog](https://docs.datadoghq.com/service_level_objectives/monitor/)
- [Time Slice SLOs - Datadog](https://docs.datadoghq.com/service_level_objectives/time_slice/)
- [Deployment Tracking - Datadog](https://docs.datadoghq.com/tracing/services/deployment_tracking/)
- [Ingestion Controls - Datadog](https://docs.datadoghq.com/tracing/trace_pipeline/ingestion_controls/)
- [Trace Retention - Datadog](https://docs.datadoghq.com/tracing/trace_pipeline/trace_retention/)
- [Custom Metrics Billing - Datadog](https://docs.datadoghq.com/account_management/billing/custom_metrics/)
- [Metric Name Pricing - Datadog](https://docs.datadoghq.com/account_management/billing/metric_name_pricing/)
- [Incident Management - Datadog](https://docs.datadoghq.com/incident_response/incident_management/)
