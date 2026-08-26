---
tags: [fit, interview, actionpower]
status: done
category: "Interview - Fit"
aliases: ["ActionPower 이력서 기술 질문 4", "액션파워 GPL 모니터링 질문"]
---
# 액션파워 1차 — 이력서 기반 기술 질문 (4/4): GPL 모니터링 스택

> 상위 TOC: [[Interview-Prep-ActionPower|액션파워 1차 면접 준비]]

---

### Grafana/Prometheus/Loki — 무엇을 모니터링? 알림 기준?
> 관련: [[Incident-Detection-Logging|장애탐지, 로깅]], [[Structured-Logging|구조화로깅]], [[Log-Pipeline|로그파이프라인]]

**왜 GPL 자체 호스팅?**
- 기존 CloudWatch+SNS+Lambda 구조의 한계 — AWS 리소스 메트릭은 충분했지만:
  - **커스텀 비즈니스 메트릭 비용**: 메트릭 수와 API 사용량에 따른 비용 + 고카디널리티 dimension의 비용과 운영 부담
  - **다차원 쿼리 부재**: PromQL 수준의 레이블 기반 슬라이싱/집계가 Metric Math로는 어색하고 제한적
  - **로그-메트릭 상관관계 약함**: Logs Insights UX 한계, requestId로 로그는 연결했지만 메트릭과 로그를 한 화면에서 잇기 어려움
  - **알림 라우팅 수동 구현**: SNS+Lambda로 디듀프/grouping/inhibition을 직접 만들어야 함 (Alertmanager 기본 제공)
- 당시 TCO, 메트릭 생태계와 벤더 종속 회피를 비교해 GPL 선택. 일부 평가 축만 남아 총점은 재현하지 않음
  - TCO(0.25): GPL 최고 — ELK는 같은 데이터량에서 운영 복잡도, Datadog은 사용량 단가 치명적
  - 메트릭 생태계(0.15): Prometheus 최강급
  - 벤더 종속(0.10): GPL 완전 이식 가능, IaC/GitOps 친화

**아키텍처 구성**

| 계층 | 구성 요소 | 역할 |
|------|---------|------|
| **FE** | Sentry SDK → Sentry 서버 | 브라우저 JS 에러, 네트워크 지연, 퍼포먼스 트레이스 자동 수집. 이슈 그룹화 + 세션 리플레이 |
| **BE (App)** | TraceIdMiddleware | 이름과 달리 분산 trace가 아니라 요청마다 고유 `x-request-id` 생성 → 응답과 JSON 로그를 요청 단위로 연결. Prometheus 메트릭은 method, 정규화한 route와 status 같은 제한된 label만 사용 |
| | HttpLoggingInterceptor | 요청/응답/예외를 한 지점에서 구조적으로 로깅 |
| | Winston JSON Logger | flat JSON line 포맷으로 기록 (파싱, 검색, 수집에 최적화) |
| | MetricsInterceptor + prom-client | 각 요청의 method, route, status, latency를 Prometheus 형식 메트릭으로 기록 |
| | `/metrics` 엔드포인트 | Prometheus가 주기적으로 scrape하는 노출 포인트 |
| **Log Routing** | FireLens(FluentBit) → Loki | ECS/Fargate 컨테이너 stdout → FireLens → Loki 중앙집중 로깅 |
| **Logs Plane** | Promtail → Loki, S3 사용 기록 | JSON 파싱과 라벨 구성, 청크 저장과 조회. S3가 Loki object store였는지 별도 archive였는지, 보존과 복원 경로는 현재 기록으로 확인할 수 없음 |
| **Metrics Plane** | Prometheus → Thanos Sidecar → S3 | 메트릭 수집 → 블록 데이터 S3 업로드. Thanos Store Gateway/Querier로 여러 Prometheus를 하나처럼 조회 (수평 확장/멀티 리전) |
| **Alerting** | Grafana Alerting | Prometheus/Loki 기반 정적 임계 알람 → Slack/팀별 라우팅 |

**당시 정적 임계 알림**
- `for: 5m` 지속 조건으로 단발성 스파이크 필터링 + 서비스/팀별 소유자 라우팅
  - Error rate 1% `for:5m`
  - Slow SQL 500ms+ 3회 지속
  - Event Loop Lag 100ms 3분 지속
  - RDS CPU 75% 5분
  - Replica Lag 5초 3분

**보존 전략**
- 메트릭: Prometheus 단기 보존(15일) → Thanos Sidecar가 S3로 업로드 (수개월~수년 장기 조회 가능, Prometheus 디스크 부담 감소)
- 로그: 당시 기록에는 Loki 30일 핫 보관과 S3 콜드 보관으로 남아 있으나 자동 전환 메커니즘과 정확한 저장 경계는 확인되지 않음. Compactor는 인덱스 압축과 설정된 보존 정책을 담당하며 별도 archive를 자동 구성하지 않음
- 로그 폭증 시: 당시 Promtail의 batch 설정과 Loki ingestion rate limit, sampling과 drop stage를 조정. 신규 구성은 지원 중인 Alloy나 Fluent Bit의 대응 설정을 확인

**비용 관리**
- 메트릭 카디널리티 관리가 핵심: route/path 라벨 정규화, **userId/traceId를 라벨에 절대 포함하지 않음** (라벨 조합 폭증 → Prometheus 메모리 증가)
- 로그: flat JSON line + 불필요 필드 Drop stage → 저장/전송 비용 절감
- 저장소 사용량 정기 모니터링: Loki 수집량과 active stream, object store 증가량 / Thanos object store upload량과 블록 수 증가율. 실제 metric 이름은 사용 버전에서 확인

**리스크 및 대응**

| 리스크                                  | 대응                                                       |
| ------------------------------------ | -------------------------------------------------------- |
| 카디널리티 폭발 (라벨 조합 폭증 → Prometheus OOM) | 라벨 가이드 수립, route 정규화, userId/traceId 라벨 금지               |
| 로그 과다 유입 (Loki 429)                  | Promtail batch/flush tuning, log sampling, drop stage 적용 |
| 구성 복잡성 증가                            | Helm values 표준화, ArgoCD 기반 GitOps 선언적 관리                 |

**꼬리 질문 대비**
- "CloudWatch 대신 자체 호스팅한 이유?" → CloudWatch가 AWS 리소스 메트릭은 충분하지만, 커스텀 비즈니스 메트릭 비용과 PromQL 수준의 레이블 기반 다차원 쿼리 제약이 당시 요구와 맞지 않았음. SNS+Lambda로 디듀프와 inhibition을 수동 구현하던 부담도 컸음. 남아 있는 비교 축은 TCO, 메트릭 생태계와 벤더 종속 회피이며 총점은 재현하지 않음
- "ELK 대신 Loki인 이유?" → ELK는 로그 검색과 집계가 강력하지만 당시 팀이 감당할 운영 복잡도가 컸음. Loki의 제한된 인덱싱과 LogQL 필터링이 당시 요구에 맞았으며 비용 우위는 데이터량과 보존 정책을 포함해 비교해야 함
- "Prometheus pull 방식의 한계?" → 짧은 수명 작업은 스크래핑 전에 사라질 수 있음. 서비스 수준 batch job에는 Pushgateway를 제한적으로 검토하고, 일반 컨테이너는 service discovery와 수집 주기, 필요하면 remote write 또는 OpenTelemetry 경로를 설계
- "로그 양이 폭증하면?" → 수집기의 batch 설정과 Loki rate limit 조정 + 정책 기반 sampling + drop stage로 불필요 필드 제거. 저장 경계와 보존 정책은 실제 구성에서 확인
- "Thanos 없이 Prometheus만 쓰면 안 되나?" → Prometheus도 로컬 보존 기간을 설정할 수 있지만 장기 object storage, 여러 인스턴스 통합 조회와 HA 운영이 필요하면 Thanos를 검토. Sidecar 업로드와 Querier, Store Gateway의 운영 비용도 함께 고려
- "고유 ID를 라벨에 넣으면 왜 안 되나?" → requestId나 traceId 같은 고유값을 라벨에 넣으면 카디널리티가 요청 수만큼 폭발해 Prometheus 메모리를 고갈시킬 수 있음. 당시 requestId는 로그 본문에 기록하고 LogQL로 검색했으며, 분산 추적을 추가하면 traceId는 로그와 exemplar로 연결
- "FE 모니터링은?" → Sentry SDK로 브라우저 JS 에러, 네트워크 지연, 퍼포먼스 데이터를 수집. 프런트와 백엔드의 전체 요청 흐름을 연결하려면 trace context 전파와 양쪽 SDK 구성이 별도로 필요

---

## 관련 문서
- [[Interview-Prep-ActionPower|1차 면접 TOC]]
- [[Interview-Prep-ActionPower-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-ActionPower-Tech-Resume1|이력서 기술 질문 1 (DB/ORM)]]
- [[Interview-Prep-ActionPower-Tech-Resume2|이력서 기술 질문 2 (MQ, Docker)]]
- [[Interview-Prep-ActionPower-Tech-Resume3|이력서 기술 질문 3 (아키텍처 전환)]]
- [[Interview-Prep-ActionPower-Tech-JD|JD 기반 기술 질문]]
- [[Interview-Prep-ActionPower-Service|서비스 맥락 + 컬처핏 + 역질문]]
- [[Interview-Prep-ActionPower-Checklist|면접 준비 체크리스트]]
