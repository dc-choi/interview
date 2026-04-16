---
tags: [observability, docker, container, monitoring, prometheus, grafana, cadvisor, fluentd]
status: done
category: "관측가능성(Observability)"
aliases: ["Container Monitoring", "컨테이너 모니터링", "Docker 모니터링"]
---

# 컨테이너 모니터링

호스트 기반 VM 모니터링과 달리, 컨테이너 환경은 **수명이 짧고 개수가 많다**는 특성이 있다. 컨테이너는 생겼다 사라지므로 IP·PID·호스트 기준의 전통 모니터링은 맞지 않는다. "로그·메트릭·알림" 3축을 **컨테이너 라벨** 중심으로 재구성하는 것이 핵심.

## 모니터링 3축

| 축 | 대상 | 대표 스택 |
|---|---|---|
| **로그(Logs)** | 애플리케이션 stdout/stderr, 컨테이너 이벤트 | Fluentd/FluentBit → Elasticsearch/Loki → Kibana/Grafana |
| **메트릭(Metrics)** | CPU·메모리·네트워크·컨테이너 수 | cAdvisor · node_exporter → Prometheus → Grafana |
| **알림(Alerts)** | 임계 초과·장애 | Alertmanager · ElastAlert → Slack/Teams/PagerDuty |

세 축은 독립이 아니라 **서로 참조**한다 — 알람에서 로그·대시보드로 점프 가능한 링크 설계가 현대 관측가능성의 기본.

## 핵심 데이터 소스

### cAdvisor (Container Advisor)

- Google이 만든 컨테이너 메트릭 수집기. **Docker·containerd·runc** 지원
- 호스트당 1개 실행 → 해당 호스트의 **모든 컨테이너 메트릭** 노출(`/metrics`)
- 수집 대상: CPU·메모리·네트워크·파일시스템·프로세스·OOM·재시작

### node_exporter

- Prometheus의 표준 호스트 메트릭 수집기
- **커널·하드웨어 수준** 메트릭: load average, disk I/O, filesystem 용량, iowait, TCP 상태
- 컨테이너 메트릭이 아니라 **호스트 메트릭** — cAdvisor와 **역할이 다름**, 둘 다 필요

### Prometheus

- 풀(pull) 기반 시계열 DB. cAdvisor·node_exporter 엔드포인트를 **스크레이프**
- 라벨 기반 쿼리 언어(PromQL) — 컨테이너 수명이 짧아도 라벨로 그룹 집계
- Rules로 알림 조건 정의 → Alertmanager가 라우팅

### Fluentd / Fluent Bit

- 로그 수집 에이전트. 컨테이너 stdout을 수집 → Elasticsearch·S3·Loki로 전송
- **Fluent Bit**는 C로 만든 경량판(메모리 수십 MB). 사이드카·데몬셋으로 많이 사용
- 파서·필터·태그로 로그를 구조화

### Grafana

- 시각화 대시보드. Prometheus·Loki·Elasticsearch·CloudWatch 등 다양한 소스 통합
- 컨테이너·서비스 단위 대시보드를 라벨 쿼리로 자동 구성

## 기본 메트릭과 해석

| 메트릭 | 의미 | 주의 |
|---|---|---|
| `container_cpu_usage_seconds_total` | CPU 누적 사용량 | rate()로 초당 사용률 계산 |
| `container_memory_working_set_bytes` | 실제 메모리 사용 | `rss`보다 OOM 판단에 적합 |
| `container_memory_usage_bytes` | 캐시 포함 메모리 | 오판 쉬움 — working_set을 보는 게 안전 |
| `container_network_receive_bytes_total` | 네트워크 RX | 네트워크 병목 판단 |
| `container_fs_usage_bytes` | 컨테이너 파일시스템 사용 | 오버레이 레이어 증가 감지 |
| `container_last_seen` | 마지막 수집 시점 | 사라진 컨테이너 감지 |

**호스트 레이어(node_exporter) 메트릭과 교차 확인 필요**. CPU가 컨테이너에서 30%라도 호스트가 iowait 50%면 근본 원인은 디스크. 자세한 함정은 [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정]].

## 전형적 배포 구조

### 호스트당 에이전트

- **데몬셋(K8s) / 호스트당 1개 컨테이너(Docker Swarm·순수 Docker)**
- FluentBit, cAdvisor, node_exporter를 각각 하나씩
- Prometheus는 중앙 클러스터에 2~3대(HA) + 장기 보관은 Thanos·Mimir

### 사이드카 패턴

- 각 애플리케이션 파드에 로그 수집기를 **짝 컨테이너**로 배치
- 스탠다드아웃이 아닌 파일 기반 로그를 수집하거나, 앱에 특화된 전처리가 필요할 때
- 리소스 비용 증가 vs 수집 유연성 — 트레이드오프

### 애플리케이션 직접 노출

- 앱이 `/metrics` 엔드포인트로 Prometheus 포맷 메트릭을 직접 노출 (마이크로미터·client_golang·prom-client)
- 비즈니스 지표(주문 수·결제 성공률)는 앱에서만 만들 수 있음

## Kubernetes에서의 추가 고려

- **kube-state-metrics** — Deployment·Pod·Node 상태를 메트릭화
- **metrics-server** — HPA가 참고하는 실시간 리소스 사용량
- **Prometheus Operator** — ServiceMonitor CRD로 스크레이프 대상 동적 관리
- **라벨 카디널리티** — Pod IP·uuid 같은 고카디널리티 라벨은 폭발 주의

## 로그 수집 전략

- **Stdout/Stderr 우선** — 12-factor 원칙. 파일 로그는 컨테이너 철학에 역행
- **구조화 로그** — JSON 한 줄이 표준. [[Structured-Logging]] 참조
- **컨테이너 라벨 자동 첨부** — pod name, namespace, container name, image
- **애플리케이션 로그는 호스트 볼륨에 영구 저장 후 수집기가 배달** — 컨테이너 크래시해도 로그 보존
- **비용 관리** — 로그는 용량 폭증 1순위. 샘플링·레벨 조정·보존 기간 제한. 사례: [[TS-Backend-Meetup-1#로그 적재 비용 개선기|로그 비용 개선 300$→2$]]

## 알림 설계 원칙

- **증상 vs 원인**: 증상 알람("결제 실패율 5% 초과")을 기본으로, 원인 알람("CPU 90%")은 진단용
- **Rate of Change 기반** — 절대값보다 변화율이 조기 감지에 유리
- **페이지 vs 티켓** 분리 — 심각도 맞춰 라우팅. 과민하면 Alert Fatigue
- **라벨 기반 수신자**: `team=payment` 알람은 결제팀으로

자세한 설계는 [[Incident-Detection-Logging|장애 감지와 로깅/메트릭]].

## 흔한 실수

- **cAdvisor만 쓰고 node_exporter 없음** → 호스트 레이어 문제(디스크·iowait) 놓침
- **`container_memory_usage_bytes`로 OOM 판단** → 캐시 포함이라 실제 압박 오판. `working_set_bytes` 사용
- **고카디널리티 라벨 폭주** → Prometheus TSDB 비대. 사용자 ID·요청 ID를 라벨로 쓰지 말 것(tracing은 Trace ID로)
- **stdout 대신 파일 로그** → 컨테이너 사라지면 로그도 사라짐
- **전역 알람 하나로 모두 수신** → 알람 피로도 → 진짜 장애 놓침
- **대시보드만 만들고 알람 없음** → 눈으로 봐야 아는 지표는 실질적 모니터링 아님

## 면접 체크포인트

- cAdvisor와 node_exporter의 역할 차이(컨테이너 vs 호스트)
- `container_memory_usage_bytes`와 `working_set_bytes`가 다른 이유
- 사이드카 vs 데몬셋 로그 수집의 트레이드오프
- 고카디널리티 라벨이 TSDB를 망치는 이유
- 증상 기반 알람과 원인 기반 알람의 설계 차이
- 쿠버네티스에서 kube-state-metrics가 추가로 필요한 이유

## 출처
- [m0rph2us — 컨테이너 모니터링 구축기](https://m0rph2us.github.io/docker/monitoring/2020/10/08/container-monitoring.html)

## 관련 문서
- [[Incident-Detection-Logging|장애 감지와 로깅/메트릭]]
- [[Structured-Logging|Structured logging]]
- [[Log-Pipeline|Log pipeline]]
- [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정]]
- [[Correlation-ID|Correlation ID / Trace ID]]
- [[Docker|Docker]]
