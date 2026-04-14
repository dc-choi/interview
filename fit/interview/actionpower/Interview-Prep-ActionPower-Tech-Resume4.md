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
> 관련: [[Incident-Detection-Logging|장애탐지·로깅]], [[Structured-Logging|구조화로깅]], [[Log-Pipeline|로그파이프라인]]

**왜 GPL 자체 호스팅?**
- 기존 CloudWatch+SNS+Lambda 구조의 한계 — AWS 리소스 메트릭은 충분했지만:
  - **커스텀 비즈니스 메트릭 비용**: metric당 $0.30/month + 고카디널리티 dimension은 비용 폭증
  - **다차원 쿼리 부재**: PromQL 수준의 레이블 기반 슬라이싱/집계가 Metric Math로는 어색하고 제한적
  - **로그-메트릭 상관관계 약함**: Logs Insights UX 한계, traceId로 메트릭/로그를 한 화면에서 토글하기 어려움
  - **알림 라우팅 수동 구현**: SNS+Lambda로 디듀프/grouping/inhibition을 직접 만들어야 함 (Alertmanager 기본 제공)
- 가중치 기반 대안 비교 후 GPL 선택 (4.65점 / ELK 3.85 / Datadog 3.35 / CloudWatch 3.10)
  - TCO(0.25): GPL 최고 — ELK는 같은 데이터량에서 운영 복잡도, Datadog은 사용량 단가 치명적
  - 메트릭 생태계(0.15): Prometheus 최강급
  - 벤더 종속(0.10): GPL 완전 이식 가능, IaC/GitOps 친화

**아키텍처 구성**

| 계층 | 구성 요소 | 역할 |
|------|---------|------|
| **FE** | Sentry SDK → Sentry 서버 | 브라우저 JS 에러, 네트워크 지연, 퍼포먼스 트레이스 자동 수집. 이슈 그룹화 + 세션 리플레이 |
| **BE (App)** | TraceIdMiddleware | 요청마다 고유 `x-request-id` 생성 → 로그/메트릭에 전파하여 요청 단위 추적 |
| | HttpLoggingInterceptor | 요청/응답/예외를 한 지점에서 구조적으로 로깅 |
| | Winston JSON Logger | flat JSON line 포맷으로 기록 (파싱, 검색, 수집에 최적화) |
| | MetricsInterceptor + prom-client | 각 요청의 method, route, status, latency를 Prometheus 형식 메트릭으로 기록 |
| | `/metrics` 엔드포인트 | Prometheus가 주기적으로 scrape하는 노출 포인트 |
| **Log Routing** | FireLens(FluentBit) → Loki | ECS/Fargate 컨테이너 stdout → FireLens → Loki 중앙집중 로깅 |
| **Logs Plane** | Promtail → Loki(Distributor/Ingester) → S3 | JSON 파싱 → requestId/level 라벨 추가 → Chunk 저장 + 인덱스 최소화. Compactor가 오래된 로그 S3 압축/보관 |
| **Metrics Plane** | Prometheus → Thanos Sidecar → S3 | 메트릭 수집 → 블록 데이터 S3 업로드. Thanos Store Gateway/Querier로 여러 Prometheus를 하나처럼 조회 (수평 확장/멀티 리전) |
| **Alerting** | Grafana Alerting | Prometheus/Loki 기반 SLO 알람 → Slack/팀별 라우팅 |

**알림 기준 (SLO 기반)**
- `for: 5m` 지속 조건으로 단발성 스파이크 필터링 + 서비스/팀별 소유자 라우팅
  - Error rate 1% `for:5m`
  - Slow SQL 500ms+ 3회 지속
  - Event Loop Lag 100ms 3분 지속
  - RDS CPU 75% 5분
  - Replica Lag 5초 3분

**보존 전략**
- 메트릭: Prometheus 단기 보존(15일) → Thanos Sidecar가 S3로 업로드 (수개월~수년 장기 조회 가능, Prometheus 디스크 부담 감소)
- 로그: Loki 30일 핫 보관 → S3 Object Storage 콜드 보관. Compactor가 자동 블록 압축/정리
- 로그 폭증 시: Promtail `batchSize`/`batchWait`/`ingestion rate limit` 조정으로 쓰기 폭주 완충

**비용 관리**
- 메트릭 카디널리티 관리가 핵심: route/path 라벨 정규화, **userId/traceId를 라벨에 절대 포함하지 않음** (라벨 조합 폭증 → Prometheus 메모리 증가)
- 로그: flat JSON line + 불필요 필드 Drop stage → 저장/전송 비용 절감
- 저장소 사용량 정기 모니터링: Loki `bytes_ingested_total`, `chunks_stored_total` / Thanos object store upload량, 블록 수 증가율

**리스크 및 대응**

| 리스크                                  | 대응                                                       |
| ------------------------------------ | -------------------------------------------------------- |
| 카디널리티 폭발 (라벨 조합 폭증 → Prometheus OOM) | 라벨 가이드 수립, route 정규화, userId/traceId 라벨 금지               |
| 로그 과다 유입 (Loki 429)                  | Promtail batch/flush tuning, log sampling, drop stage 적용 |
| 구성 복잡성 증가                            | Helm values 표준화, ArgoCD 기반 GitOps 선언적 관리                 |

**꼬리 질문 대비**
- "CloudWatch 대신 자체 호스팅한 이유?" → CloudWatch가 AWS 리소스 메트릭은 충분하지만, 커스텀 비즈니스 메트릭 비용($0.30/metric/month)과 PromQL 수준의 레이블 기반 다차원 쿼리 부재가 한계였음. SNS+Lambda로 디듀프/inhibition을 수동 구현하던 부담도 컸음. 가중치 비교에서 GPL이 TCO(5점), 메트릭 생태계(5점), 벤더 종속 회피(5점)로 총 4.65점 최고, CloudWatch는 3.10점
- "ELK 대신 Loki인 이유?" → ELK는 로그 검색/집계는 강력하지만 같은 데이터량에서 운영 복잡도와 비용이 큼 (3.85점). Loki는 인덱스 최소화 설계라 저장 비용이 낮고, LogQL로 requestId/route/level 기반 필터링이면 우리 요구에 충분
- "Prometheus pull 방식의 한계?" → 짧은 수명 컨테이너는 스크래핑 전 사라질 수 있음 → Pushgateway로 보완. 대규모에서는 service discovery 필수
- "로그 양이 폭증하면?" → Promtail의 batchSize/batchWait/ingestion rate limit 조정 + log sampling(에러 100%, 정상 10%) + drop stage로 불필요 필드 제거 + 핫/콜드 분리 보존 정책
- "Thanos 없이 Prometheus만 쓰면 안 되나?" → Prometheus 단독은 단기 보존만 가능하고 디스크 부담 큼. Thanos Sidecar로 S3에 장기 보관하면 수개월~수년 메트릭 비교 가능 + Thanos Querier로 여러 Prometheus를 하나처럼 조회(멀티 인스턴스/리전 확장 대비)
- "traceId를 라벨에 넣으면 왜 안 되나?" → 라벨은 인덱스로 사용됨. traceId처럼 고유값을 라벨에 넣으면 카디널리티가 요청 수만큼 폭발 → Prometheus 메모리 OOM. traceId는 로그 본문(flat JSON)에 기록하고 LogQL로 검색
- "FE 모니터링은?" → Sentry SDK로 브라우저 JS 에러, 네트워크 지연, 퍼포먼스 트레이스 자동 수집. Sentry 서버에서 이슈 그룹화 + 세션 리플레이 제공. 백엔드 TraceId와 연계하면 FE→BE 요청 흐름 전체 추적 가능

---

## 관련 문서
- [[Interview-Prep-ActionPower|1차 면접 TOC]]
- [[Interview-Prep-ActionPower-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-ActionPower-Tech-Resume1|이력서 기술 질문 1 (DB/ORM)]]
- [[Interview-Prep-ActionPower-Tech-Resume2|이력서 기술 질문 2 (MQ·Docker)]]
- [[Interview-Prep-ActionPower-Tech-Resume3|이력서 기술 질문 3 (아키텍처 전환)]]
- [[Interview-Prep-ActionPower-Tech-JD|JD 기반 기술 질문]]
- [[Interview-Prep-ActionPower-Service|서비스 맥락 + 컬처핏 + 역질문]]
- [[Interview-Prep-ActionPower-Checklist|면접 준비 체크리스트]]
