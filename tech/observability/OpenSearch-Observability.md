---
tags: [observability, aws, opensearch, opentelemetry, ppl, incident-response, ai-agent]
status: done
verified_at: 2026-07-15
category: "관측가능성(Observability)"
aliases: ["OpenSearch Observability", "Amazon OpenSearch 관측성", "OpenSearch 지능형 관측성"]
---

# Amazon OpenSearch 기반 통합 관측성

Amazon OpenSearch Service의 관측성 기능은 로그, trace, metric을 같은 운영 화면에서 탐색하고 서로 연결해 장애 원인을 좁히는 데 목적이 있다. 핵심은 세 신호를 한 저장소에 억지로 넣는 것이 아니라 **공통 context로 연결하고 신호마다 적합한 저장소와 query language를 쓰는 것**이다.

## 전체 구조

```text
Application and Infrastructure
  -> OpenTelemetry SDK and Collector
      -> logs, traces -> OpenSearch Ingestion -> OpenSearch domain or collection
      -> metrics      -> Amazon Managed Service for Prometheus

OpenSearch UI Observability workspace
  -> PPL for logs and traces
  -> PromQL for metrics
  -> correlation, dashboards, alerts, AI investigation
```

OpenTelemetry가 계측과 전송 형식을 표준화하고, OpenSearch Ingestion이 수집 후반의 filtering, enrichment, transformation, routing을 담당한다. 현재 AWS 참조 구조는 로그와 trace를 OpenSearch에 색인하고 metric은 Amazon Managed Service for Prometheus에서 직접 query한다. 모든 telemetry가 OpenSearch index에 저장된다고 이해하면 안 된다.

AWS 관측성 도구의 기능은 일부 겹친다. CloudWatch Application Signals도 service map, metric, trace, SLO와 원인 조사 workflow를 제공하고, OpenSearch Observability도 signal correlation과 service 분석을 제공한다. 참조 아키텍처에서는 CloudWatch를 AWS resource와 managed service monitoring의 중심으로, Amazon Managed Service for Prometheus를 대규모 metric 저장과 PromQL로, OpenSearch를 log와 trace의 심층 검색과 장기 보존으로 둘 수 있다. 실제 선택은 retention, query language, correlation workflow, 기존 계측과 비용으로 정한다.

## 세 신호가 답하는 질문

| 신호 | 먼저 답하는 질문 | 다음 이동 |
|---|---|---|
| Metric | 언제부터 오류율이나 지연이 변했는가 | 문제 시간대와 service를 trace로 좁힘 |
| Trace | 어느 service와 span에서 시간이 쓰이거나 실패했는가 | 같은 `trace_id`의 log를 확인 |
| Log | 실제 예외, 입력 context, retry 결과가 무엇인가 | 원인 가설을 검증하고 재현 |

Metric은 이상을 빠르게 찾고, trace는 blast radius와 병목 경로를 보여주며, log는 세부 원인을 확인한다. 세 신호의 일반 원리는 [[Logs-vs-Metrics]]를 참고한다.

## 상관분석의 데이터 계약

도구보다 먼저 필드가 맞아야 한다.

- 모든 hop에서 W3C Trace Context를 전파한다.
- Log에 `trace_id`와 `span_id`를 넣고 trace span과 같은 값을 사용한다.
- `service.name`, `service.version`, `deployment.environment`, `cloud.region`을 일관되게 기록한다.
- event time과 ingest time을 분리하고 clock skew를 관리한다.
- HTTP route는 parameter가 치환된 template으로 기록해 cardinality를 제어한다.
- 배포 version, feature flag, tenant 같은 장애 분할 기준을 resource attribute로 정한다.

Correlation은 단지 같은 화면에 신호 세 개를 배치하는 기능이 아니다. Slow trace에서 같은 trace ID의 log로 이동하고, 다시 service metric의 정상 구간과 장애 구간을 비교할 수 있어야 한다. 전파와 계측은 [[OpenTelemetry]]를 따른다.

## OpenSearch Dashboards와 OpenSearch UI

이름이 비슷하지만 운영 모델이 다르다.

| 구분 | OpenSearch Dashboards | OpenSearch UI |
|---|---|---|
| 배치 | 각 domain 또는 collection에 연결 | AWS가 호스팅하는 별도 application |
| 데이터 범위 | 자신이 속한 한 domain 또는 collection | 여러 domain, collection, AWS data source |
| 업그레이드 영향 | domain 유지보수의 영향을 받음 | UI가 cluster와 분리됨 |
| 협업 단위 | tenant와 saved object | use case별 workspace와 collaborator |
| 신규 통합 관측성 | 기존 plugin 기능 중심 | logs, traces, metrics 통합 경험의 기준 |

AWS 공식 문서는 신규 관측성 workload에 OpenSearch UI의 Observability workspace를 권장한다. 새 Discover, Application Monitoring, 통합 correlation 기능은 **OpenSearch UI 전용**이며 기존 OpenSearch Dashboards에 그대로 있다고 가정하면 안 된다.

반면 종료 예정인 [[Centralized-Logging-with-OpenSearch]] 솔루션의 template은 기존 OpenSearch Dashboards를 대상으로 한다. 두 세대의 UI와 배포 방식을 섞지 않는다.

## Workspace와 권한

OpenSearch UI application 하나는 여러 data source를 연결할 수 있고 Observability, Security Analytics, Search 같은 workspace로 사용 경험을 분리한다. Workspace privacy와 collaborator 설정은 화면과 saved object의 협업 경계다. 실제 index, document, field 접근은 IAM, domain access policy, fine-grained access control 같은 data-plane 권한이 계속 결정한다.

여러 팀이 같은 UI를 쓸 때는 다음을 분리한다.

- production과 non-production data source
- 운영팀, 보안팀, 개발팀의 index와 field 권한
- dashboard 편집 권한과 원본 data query 권한
- AI 기능과 외부 MCP client의 사용 주체

## Discover와 PPL

PPL은 Piped Processing Language의 약자로, Unix pipe처럼 앞 단계의 결과를 다음 단계에 넘겨 filter, transform, aggregate하는 언어다. OpenSearch UI의 Discover Logs와 Discover Traces에서 사용하고, metric에는 PromQL을 사용한다.

```text
source = app-logs
| where severity_text = 'ERROR' and service_name = 'checkout-service'
| stats count() as error_count by service_name, span(timestamp, 5m)
| sort -error_count
```

Discover에서 query 결과를 table과 chart로 확인하고 그대로 dashboard panel로 저장할 수 있다. PPL 기반 visualization은 Discover에서 만들어야 하며, 일반 Visualizations 화면의 DQL과 DSL 경로가 PPL을 지원한다고 가정하면 안 된다.

`join`, `lookup`, `timechart`, `eventstats`, `rex`, `spath` 같은 명령의 지원 범위는 OpenSearch index, S3 direct query, CloudWatch data source마다 다를 수 있다. 기능 이름만 보고 설계하지 말고 대상 data source와 engine version의 command matrix를 확인한다.

## Trace와 Application Map

Discover Traces는 service별 RED metric, span table, waterfall, 관련 log 이동을 제공한다. Application Monitoring은 trace에서 만든 topology와 Amazon Managed Service for Prometheus의 RED metric을 결합한다.

OpenSearch Ingestion의 `otel_apm_service_map` processor는 trace 관계에서 service topology를 만들고, Application Map은 service를 node, 호출을 edge로 표시한다. 색과 edge를 보고 영향 범위를 좁힌 뒤 개별 service, trace, log로 내려간다.

Service map이 원인을 자동 확정하는 것은 아니다. 누락된 instrumentation, 잘못된 status code, sampling 편향이 있으면 지도도 불완전하다. 장애가 없는 정상 traffic에서 먼저 map과 trace 연결을 검증한다.

## Dashboard, alert, anomaly detection

- Dashboard는 service health, throughput, error rate, latency를 한 화면에 묶는다.
- Alerting monitor는 index query나 cluster metric 조건을 주기적으로 검사하고 notification action을 실행한다.
- Anomaly Detection plugin은 Random Cut Forest로 near-real-time 이상 점수와 confidence를 계산하며 Alerting과 연결할 수 있다.
- Alert는 문제를 발견하는 장치이고 dashboard와 Discover는 원인을 조사하는 시작점이다.

Slack, webhook, SNS 같은 채널 전송에는 network 경로와 secret 관리가 필요하다. 비정상 점수만으로 page하지 말고 사용자 증상, 최소 지속 시간, 정상 peak를 함께 반영해 [[Alert-Fatigue|알림 피로]]를 줄인다.

## 저장과 비용

- 자주 조사하는 최근 log와 trace는 검색 가능한 hot 계층에 둔다.
- 오래된 OpenSearch index는 ISM으로 warm, cold, delete를 자동화한다.
- 원본 archive와 완전 replay가 필요하면 S3 보존을 별도로 둔다.
- S3 direct query는 S3를 자동 cold tier로 쓰는 기능이 아니라 별도 data source와 OCU 과금, format, Region 제약이 있는 query 경로다.
- Metric은 Amazon Managed Service for Prometheus의 retention과 cardinality를 별도로 관리한다.

모든 신호를 같은 기간 보관할 필요는 없다. Incident RTO, 감사 기간, query 빈도, 일일 ingest, sampling 비율로 신호별 retention을 정한다.

## 사람 중심 장애 조사 흐름

1. Alert의 symptom과 사용자 영향을 확인한다.
2. Dashboard에서 발생 시각, 환경, service, 배포 version을 고정한다.
3. Metric을 정상 구간과 비교해 변화가 시작된 범위를 찾는다.
4. 느리거나 실패한 trace의 critical path와 dependency를 확인한다.
5. 같은 `trace_id`의 log로 exception, timeout, retry를 검증한다.
6. 원인 후보마다 반증 query를 실행하고 다른 후보를 배제한다.
7. 먼저 안전한 완화를 수행한 뒤 근본 수정과 재발 방지를 분리한다.
8. query, time range, evidence link, 결론, 미확인 사항을 incident 기록에 남긴다.

## Agentic Chat과 Investigation Agent

OpenSearch UI의 Agentic Chat은 자연어를 PPL로 바꾸고 현재 Discover context에서 query와 time range를 수정한다. Investigation Agent는 목표를 받아 여러 단계로 query와 분석을 수행하고, 가능성이 높은 가설과 대안 가설을 evidence와 함께 제시한다. 사용자는 가설을 Accept 또는 Rule out하며 검증한다.

여기서 출력은 **원인 확정이 아니라 조사 가설**이다. 공식 기능도 근거와 대안 가설을 보여주는 검토 흐름을 전제로 한다. 매출 손실 계산, 장기 조치안, runbook 파일 생성은 별도 agent가 추가로 구현할 수 있는 workflow이지 OpenSearch가 항상 제공하는 보장은 아니다.

> [!note] Region 확인
> 2026-07-11 공식 Agentic AI 지원 Region 목록에는 서울이 없다. OpenSearch UI 자체는 서울에서 제공되더라도 Agentic Chat과 Investigation Agent는 별도 Region 지원표를 배포 전에 확인해야 한다.

## MCP 연결을 구분한다

| 경로 | 목적 | 주의점 |
|---|---|---|
| OpenSearch UI Observability MCP Apps | IDE에서 alert, trace, service map, metric 조사와 검증 UI 표시 | local MCP server와 UI application, workspace 필요 |
| AWS MCP Server와 OpenSearch skill | AWS domain과 Serverless collection의 관리 작업 | 제공 credential 권한으로 AWS API 실행 |
| OpenSearch project MCP server | OpenSearch cluster query와 tool 노출 | built-in과 standalone의 version, plugin 상태 확인 |

MCP는 agent가 tool을 호출하는 표준 연결 방식이지 자동으로 안전성을 주는 계층이 아니다. 외부 agent에는 production read-only role, index allowlist, 짧은 time range, query timeout과 result limit을 적용한다. Tool call과 생성 query를 감사 로그에 남기고, index 변경, scaling, pipeline 수정, remediation은 사람 승인을 거친다.

OpenSearch UI 내장 Agentic AI는 현재 사용자의 IAM과 RBAC, document와 field 권한을 상속한다. 외부 MCP server는 자신에게 제공한 AWS credential과 model provider의 데이터 처리 경계를 별도로 검토해야 한다.

## 도입 순서

1. OpenTelemetry로 service와 context naming을 표준화한다.
2. Collector와 OpenSearch Ingestion의 retry, buffer, DLQ를 검증한다.
3. Logs와 traces를 OpenSearch에, metrics를 Prometheus 계층에 연결한다.
4. Trace에서 related log로 왕복되는지 확인한다.
5. RED dashboard와 symptom 기반 alert를 먼저 만든다.
6. 반복 조사 query를 PPL saved query와 runbook으로 고정한다.
7. AI 기능은 같은 incident를 사람이 조사한 결과와 비교 평가한다.
8. MCP는 staging read-only부터 시작해 권한과 evidence 기록을 검증한다.

## 관련 문서

- [[OpenTelemetry|OpenTelemetry와 분산 추적]]
- [[Logs-vs-Metrics|로그, 메트릭, 추적의 역할]]
- [[Application-Performance-Monitoring|APM]]
- [[Log-Pipeline|중앙 집중식 로그 파이프라인]]
- [[OpenSearch-Service|Amazon OpenSearch Service]]
- [[Incident-Runbook|Incident runbook]]
- [[OpenSearch-Security-Production|OpenSearch 보안]]

## 출처

- [Observability in Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/observability.html)
- [CloudWatch Application Signals - AWS Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Services.html)
- [Using OpenSearch UI - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/application.html)
- [Ingesting application telemetry - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/observability-ingestion.html)
- [Discover Logs - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/observability-analyze-logs.html)
- [Discover Traces - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/observability-analyze-traces.html)
- [Application monitoring - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/observability-app-monitoring.html)
- [OpenSearch UI workspaces - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/application-workspaces.html)
- [Anomaly detection - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ad.html)
- [Alerting and notifications - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/alerting.html)
- [S3 direct query - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/direct-query-s3-overview.html)
- [PPL commands - OpenSearch Documentation](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/)
- [Agentic AI in Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/application-ai-assistant.html)
- [Investigation Agent - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/application-investigation-agent.html)
- [Agentic Observability with MCP Apps - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/opensearch-observability-mcp-app.html)
- [Amazon OpenSearch Service로 배우는 지능형 Observability - YouTube](https://www.youtube.com/watch?v=0H5ynofcRBM)
