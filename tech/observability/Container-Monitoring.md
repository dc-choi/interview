---
tags: [observability, docker, container, monitoring, prometheus, grafana, cadvisor, fluentd]
status: done
category: "관측가능성(Observability)"
aliases: ["Container Monitoring", "컨테이너 모니터링", "Docker 모니터링"]
---

# 컨테이너 모니터링

호스트 기반 VM 모니터링과 달리, 컨테이너 환경은 **수명이 짧고 개수가 많다**는 특성이 있다. 컨테이너는 생겼다 사라지므로 IP, PID, 호스트 기준의 전통 모니터링은 맞지 않는다. 로그, 메트릭, 알림 3축을 **컨테이너 라벨** 중심으로 재구성하는 것이 핵심.

## 모니터링 3축

| 축 | 대상 | 대표 스택 |
|---|---|---|
| **로그(Logs)** | 애플리케이션 stdout/stderr, 컨테이너 이벤트 | Fluentd/FluentBit → Elasticsearch/Loki → Kibana/Grafana |
| **메트릭(Metrics)** | CPU, 메모리, 네트워크, 컨테이너 수 | cAdvisor, node_exporter → Prometheus → Grafana |
| **알림(Alerts)** | 임계 초과, 장애 | Alertmanager, ElastAlert → Slack/Teams/PagerDuty |

세 축은 독립이 아니라 **서로 참조**한다 — 알람에서 로그, 대시보드로 점프 가능한 링크 설계가 현대 관측가능성의 기본.

## 핵심 데이터 소스

### cAdvisor (Container Advisor)

- Google이 만든 컨테이너 메트릭 수집기. **Docker, containerd, runc** 지원
- 호스트당 1개 실행 → 해당 호스트의 **모든 컨테이너 메트릭** 노출(`/metrics`)
- 수집 대상: CPU, 메모리, 네트워크, 파일시스템, 프로세스, OOM, 재시작

### node_exporter

- Prometheus의 표준 호스트 메트릭 수집기
- **커널, 하드웨어 수준** 메트릭: load average, disk I/O, filesystem 용량, iowait, TCP 상태
- 컨테이너 메트릭이 아니라 **호스트 메트릭** — cAdvisor와 **역할이 다름**, 둘 다 필요

### Prometheus

- 풀(pull) 기반 시계열 DB. cAdvisor, node_exporter 엔드포인트를 **스크레이프**
- 라벨 기반 쿼리 언어(PromQL) — 컨테이너 수명이 짧아도 라벨로 그룹 집계
- Rules로 알림 조건 정의 → Alertmanager가 라우팅

### Fluentd / Fluent Bit

- 로그 수집 에이전트. 컨테이너 stdout을 수집 → Elasticsearch, S3, Loki로 전송
- **Fluent Bit**는 C로 만든 경량 수집기다. 2026-09-03 공식 비교표의 기본 상주 메모리는 약 450KB지만, 실제 container 배포에서는 buffer가 추가된다. 예를 들어 `Mem_Buf_Limit` 10MB 구성은 36MB 이상의 메모리 할당을 권장한다. 사이드카, 데몬셋으로 많이 사용
- 파서, 필터, 태그로 로그를 구조화

### Grafana

- 시각화 대시보드. Prometheus, Loki, Elasticsearch, CloudWatch 등 다양한 소스 통합
- 컨테이너, 서비스 단위 대시보드를 라벨 쿼리로 자동 구성

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

- **데몬셋(K8s) / 호스트당 1개 컨테이너(Docker Swarm, 순수 Docker)**
- FluentBit, cAdvisor, node_exporter를 각각 하나씩
- Prometheus는 중앙 클러스터에 2~3대(HA) + 장기 보관은 Thanos, Mimir

### 사이드카 패턴

- 각 애플리케이션 파드에 로그 수집기를 **짝 컨테이너**로 배치
- 스탠다드아웃이 아닌 파일 기반 로그를 수집하거나, 앱에 특화된 전처리가 필요할 때
- 리소스 비용 증가 vs 수집 유연성 — 트레이드오프

### 애플리케이션 직접 노출

- 앱이 `/metrics` 엔드포인트로 Prometheus 포맷 메트릭을 직접 노출 (마이크로미터, client_golang, prom-client)
- 비즈니스 지표(주문 수, 결제 성공률)는 앱에서만 만들 수 있음

NAT나 방화벽 뒤 게이트웨이를 인바운드 개방 없이 중앙에서 수집하는 에이전트 push 토폴로지는 [[Network-Traffic-Monitoring|네트워크 트래픽 모니터링]] 참조.

## Kubernetes에서의 추가 고려

- **kube-state-metrics** — Deployment, Pod, Node 상태를 메트릭화
- **metrics-server** — HPA가 참고하는 실시간 리소스 사용량
- **Prometheus Operator** — ServiceMonitor CRD로 스크레이프 대상 동적 관리
- **라벨 카디널리티** — Pod IP, uuid 같은 고카디널리티 라벨은 폭발 주의

## EKS 관리형 수집기도 수집 성공을 따로 확인한다

부분 검증(2026-10-13): Amazon Managed Service for Prometheus의 관리형 collector 공식 문서를 대조했다. Collector는 Prometheus 호환 메트릭을 발견하고 수집한다. 로그와 트레이스 수집까지 완료하는 기능으로 해석하지 않는다.

EKS용 scraper는 지정한 서브넷마다 ENI를 만들고, 수집한 메트릭을 VPC endpoint를 통해 workspace로 전송한다. EKS endpoint의 private access와 VPC DNS를 활성화해야 한다. 생성 시 서로 다른 가용 영역의 서브넷을 두 개 이상 지정하며, 클러스터와 scraper, workspace는 같은 리전에 둔다.

접근 권한은 EKS access entry 또는 수동 구성을 확인한다. 기존 클러스터가 `API` 또는 `API_AND_CONFIG_MAP` 인증 모드라면 새 scraper를 생성할 때 access entry 정책이 자동으로 만들어진다. 이 구성과 애플리케이션이 의도한 메트릭을 노출하는지는 별개다.

| 조회 결과 | 다음 확인 |
|---|---|
| 해당 endpoint의 `up` 없음 | 대상 발견 설정, 권한과 VPC DNS |
| `up=0` | 프로토콜, 포트, HTTP 응답과 Prometheus 형식 |
| `up>0` | 수집 경로는 동작한다. 필요한 메트릭 이름, 라벨과 조회 조건을 별도 대조 |

운영 점검 제안: scraper 생성 성공, 시계열 도착과 알람 동작을 각각 확인한다. 관리형 수집으로 전환해도 업무 지표 정의와 누락 검증은 남는다. 이 절은 문서 대조이며 실제 AWS 환경의 수집 시험 결과는 아니다.

## 로그 수집 전략

- **Stdout/Stderr 우선** — 파일 출력이 필요한 앱은 사이드카로 파일을 읽어 표준 출력으로 보내거나 별도 수집기를 둔다
- **구조화 로그** — JSON 한 줄이 표준. [[Structured-Logging]] 참조
- **컨테이너 라벨 자동 첨부** — pod name, namespace, container name, image
- **보존 주기를 실행 자원과 분리** — 노드 로컬 파일만으로 장기 보존을 보장하지 않는다. 필요한 로그는 별도 백엔드로 전달한다
- **비용 관리** — 로그는 용량 폭증 1순위. 샘플링, 레벨 조정, 보존 기간 제한. 사례: [[TS-Backend-Meetup-1#로그 적재 비용 개선기|로그 비용 개선 300$→2$]]

### ECS FireLens는 로그 라우터와 전송 권한을 함께 구성한다

부분 검증(2026-10-16): ECS FireLens 공식 가이드와 작업 정의 예시를 대조했다. FireLens는 Fluent Bit 또는 Fluentd 기반 로그 라우팅 기능이며, Linux의 ECS on EC2와 Fargate 작업을 지원한다. Windows 컨테이너에는 지원되지 않는다.

작업 정의에는 `firelensConfiguration`이 있는 로그 라우터 컨테이너와 `awsfirelens` 로그 드라이버를 쓰는 애플리케이션 컨테이너를 둔다. AWS 목적지에 로그를 쓰는 권한은 **task role**에 필요하다. 이미지 다운로드 등 ECS 실행에 필요한 **task execution role**과 구분한다.

- ECS는 기본적으로 라우터를 먼저 시작하고 애플리케이션 컨테이너가 멈춘 뒤 라우터를 멈춘다. 직접 컨테이너 의존성을 지정하면 기본 시작 순서를 덮어쓰므로 이를 다시 확인한다.
- 수신 포트 `24224`를 작업 밖에 노출하지 않는다. `awsvpc`는 작업 보안 그룹, `host`는 호스트 보안 그룹에서 인바운드를 허용하지 않고, `bridge`에서는 이 포트의 매핑을 만들지 않는다.
- `ecs_cluster`, `ecs_task_arn`, `ecs_task_definition` 메타데이터는 기본으로 추가된다. 실제 로그에서 작업 ARN과 작업 정의 revision을 확인해 교체 전후 실행을 구분한다.

운영 점검 제안: 애플리케이션 로그와 라우터 자체 로그를 구분하고, 목적지 권한 오류와 전송 중단 때 재시도, 버퍼와 유실을 확인한다. 라우터 시작 성공은 저장소 도착 증거가 아니다. 이 절은 문서 대조이며 실제 ECS 작업의 전송 시험은 수행하지 않았다.

## Pod 교체 뒤에도 조사할 근거를 남긴다

부분 검증(2026-10-14): Kubernetes의 Pod 수명과 로그 보존, OpenTelemetry의 Kubernetes 메타데이터 연결을 공식 문서로 대조했다. 위 로그 수집 전략의 파일 출력과 보존 범위도 함께 정정했다.

Pod를 교체하면 이름이 같더라도 UID는 달라진다. 운영 설계에서는 서비스 단위 집계와 특정 Pod 인스턴스 조사를 구분하고, 장애 당시 시간과 Pod UID를 함께 남긴다. UID를 모든 메트릭 라벨에 추가하는 방식은 시계열 수를 늘리므로 신호별 저장 위치를 먼저 정한다.

OpenTelemetry의 `k8sattributes` processor는 Kubernetes API를 조회해 `k8s.namespace.name`, `k8s.pod.name`, `k8s.pod.uid`, `k8s.node.name` 등의 리소스 속성을 붙인다. 기본 연결은 들어오는 요청의 IP를 사용하며, 리소스 속성 기반의 Pod 연결 규칙도 설정할 수 있다. Collector의 Kubernetes API 조회 권한과 실제 속성 부착 여부를 따로 확인한다. 요청 단위 로그와 추적 연결은 [[Correlation-ID]]를 따른다.

로그 조회 가능 범위도 구분한다.

- 컨테이너 재시작 시 kubelet은 기본적으로 종료된 컨테이너 하나와 그 로그를 남긴다. 재시작 즉시 모든 로그가 없어진다고 단정하지 않는다.
- Pod가 노드에서 축출되면 해당 컨테이너와 로그도 제거된다. 노드와 독립된 보존이 필요하면 별도 로그 백엔드가 필요하다.
- `kubectl logs`는 최신 로그 파일의 내용만 반환한다. 회전된 파일 전체나 중앙 저장소의 보존 범위까지 조회하는 명령은 아니다.

운영 점검 제안: 테스트 로그를 남긴 뒤 컨테이너 재시작과 Pod 교체를 각각 수행하고, 중앙 저장소에서 이전 UID와 시간 범위로 찾을 수 있는지 확인한다. 이 문서는 해당 실험을 수행한 결과가 아니며, 수집 지연과 유실 대응은 [[Log-Pipeline]]에서 이어 본다.

## 알림 설계 원칙

- **증상 vs 원인**: 증상 알람("결제 실패율 5% 초과")을 기본으로, 원인 알람("CPU 90%")은 진단용
- **Rate of Change 기반** — 절대값보다 변화율이 조기 감지에 유리
- **페이지 vs 티켓** 분리 — 심각도 맞춰 라우팅. 과민하면 Alert Fatigue
- **라벨 기반 수신자**: `team=payment` 알람은 결제팀으로

자세한 설계는 [[Incident-Detection-Logging|장애 감지와 로깅/메트릭]].

## 흔한 실수

- **cAdvisor만 쓰고 node_exporter 없음** → 호스트 레이어 문제(디스크, iowait) 놓침
- **`container_memory_usage_bytes`로 OOM 판단** → 캐시 포함이라 실제 압박 오판. `working_set_bytes` 사용
- **고카디널리티 라벨 폭주** → Prometheus TSDB 비대. 사용자 ID, 요청 ID를 라벨로 쓰지 말 것(tracing은 Trace ID로)
- **로컬 로그만 보관** → stdout과 파일 출력 모두 외부 전달과 보존 구성이 없으면 Pod 축출이나 노드 손실 뒤 조사 근거를 잃을 수 있음
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
- [AWS, Send Amazon ECS logs to an AWS service or AWS Partner](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html)
- [AWS, Example Amazon ECS task definition: Route logs to FireLens](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/firelens-taskdef.html)
- [Kubernetes, Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Kubernetes, Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [OpenTelemetry, Important Components for Kubernetes](https://opentelemetry.io/docs/platforms/kubernetes/collector/components/)
- [AWS, Ingest metrics with AWS managed collectors](https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-collector.html)
- [AWS, Set up managed collectors for Amazon EKS](https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-collector-how-to.html)
- [m0rph2us — 컨테이너 모니터링 구축기](https://m0rph2us.github.io/docker/monitoring/2020/10/08/container-monitoring.html)
- [Fluent Bit, Fluentd and Fluent Bit](https://docs.fluentbit.io/manual/about/fluentd-and-fluent-bit)
- [Fluent Bit, Memory management](https://docs.fluentbit.io/manual/administration/memory-management)

## 관련 문서
- [[Incident-Detection-Logging|장애 감지와 로깅/메트릭]]
- [[Structured-Logging|Structured logging]]
- [[Log-Pipeline|Log pipeline]]
- [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정]]
- [[Container-Memory-Metrics|컨테이너 메모리 지표 해석 (usage 성분 분해, working set, page cache)]]
- [[Correlation-ID|Correlation ID / Trace ID]]
- [[Docker|Docker]]
