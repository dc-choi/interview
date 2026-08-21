---
tags: [observability, logging, loki, logql, object-storage, s3]
status: done
verified_at: 2026-08-21
category: "관측가능성(Observability)"
aliases: ["Loki", "Grafana Loki", "LogQL"]
---

# Loki

Grafana 진영의 로그 백엔드. 설계 한 줄은 **로그 본문은 인덱싱하지 않고 라벨만 인덱싱한다**이다. 공식 문서는 "Loki does not index the contents of the logs, but only indexes metadata about your logs as a set of labels for each log stream"으로 못박는다. 전문 색인을 포기한 대신 저장 비용과 운영 복잡도를 낮춰, Elasticsearch 계열과 다른 지점에 선다. [[Logs-vs-Metrics]]

## 저장 모델 — 스트림과 청크

- **스트림(stream)**: 라벨 집합이 일치하는 로그 줄의 묶음. Loki의 인덱스 단위는 개별 로그 줄이 아니라 이 스트림이다.
- **청크(chunk)**: 스트림의 로그 줄을 모아 압축한 블록. 인제스터가 메모리에서 쌓다가 설정된 조건에서 오브젝트 스토리지로 flush한다.
- **오브젝트 스토리지**: 압축된 청크가 S3, GCS 같은 저장소에 놓인다. 인덱스도 같은 오브젝트 스토리지에 올라간다.

쿼리는 두 단계다. 라벨로 대상 스트림을 좁히고, 그 스트림의 청크만 내려받아 압축을 풀어 본문을 훑는다. 라벨이 좁게 걸리지 않으면 그 뒤가 전부 스캔이 된다.

## 컴포넌트와 경로

| 컴포넌트 | 역할 |
|---|---|
| Distributor | 쓰기 진입점. 유효성과 테넌트 한도 검사 후 consistent hashing과 replication factor로 인제스터를 고른다 |
| Ingester | 스트림을 메모리에서 청크로 쌓고 설정된 간격에 백엔드 저장소로 flush |
| Query frontend | 큰 쿼리를 잘게 나눠 병렬 실행하고 결과를 캐시 |
| Querier | LogQL 실행. 인제스터의 최신분과 저장소의 과거분을 함께 읽고, 나노초 타임스탬프와 라벨셋과 메시지가 같은 줄은 중복 제거 |
| Index gateway | shipper 계열 인덱스의 메타데이터를 서빙해 querier가 읽을 청크를 고르게 함 |
| Compactor | 인덱스 압축과 보존 정책 적용 |

## 인덱스 — TSDB shipper

TSDB 인덱스는 v2.7에 실험 기능으로 들어왔고 **v2.8부터 권장 인덱스**다. Prometheus TSDB 설계를 가져왔고 인덱스 파일 자체가 오브젝트 스토리지에 놓인다. 로컬 `active_index_directory`에서 인덱스를 만든 뒤 오브젝트 스토리지로 shipping하는 구조라, 인덱스 전용 DB를 따로 운영하지 않아도 된다.

쿼리 샤딩도 인덱스가 계산한 데이터량 기준이다. 샤드가 처리할 양이 목표치를 넘으면 Loki가 해당 쿼리의 샤드 수를 두 배로 늘린다(`tsdb_max_bytes_per_shard`).

## Compactor — 인덱스 압축과 보존

Compactor는 두 가지를 한다.

- **인덱스 압축**: 테이블 안의 여러 인덱스 파일을 테넌트별 하루 단위 단일 인덱스 파일로 합친다.
- **보존 적용**: 인덱스를 순회하며 만료된 청크를 삭제 표시한다. 이때 청크를 즉시 지우지 않고 sweeper 프로세스가 비동기로 지운다. 그 사이 index gateway가 갱신된 인덱스를 받아가게 하려는 지연이다.
- **단일 인스턴스로 운영**한다(singleton). 여러 개를 띄우면 상태가 충돌한다.

## 스트림 카디널리티 — Loki에서의 폭발

Prometheus의 시계열 폭발과 같은 원리다. 라벨 조합 하나가 스트림 하나이므로, 값 범위가 무한한 라벨을 붙이면 인덱스가 비대해지고 **작은 청크가 수천 개씩 flush**된다. 공식 가이드는 라벨 수를 최대 10~15개로 제한하라고 권한다.

높은 카디널리티인데 자주 검색해야 하는 값은 라벨이 아니라 **structured metadata**에 둔다. 인덱싱도 본문 삽입도 하지 않으면서 쿼리 시 자동으로 추출되어 label filter로 걸린다. `trace_id`가 대표 사례다.

```logql
{job="example"} | trace_id="0242ac120002"
```

이 자리 구분이 [[Cardinality|카디널리티 관리]]의 로그 쪽 대응이다. traceId는 메트릭 라벨이 아니라 로그의 본문 또는 structured metadata에 두고, 메트릭 쪽 연결은 [[Exemplars|exemplar]]로 푼다.

## LogQL

### 로그 쿼리

구조는 **스트림 셀렉터(필수) + 로그 파이프라인(선택)**이다.

```logql
{app="api", env="prod"}          # 스트림 셀렉터: = != =~ !~
  |= "error" != "timeout"        # 라인 필터: |= !~ 등
  | json                         # 파서: json, logfmt, pattern, regexp
  | status >= 500                # 라벨 필터
  | line_format "{{.trace_id}}"  # 출력 재구성
```

라인 필터는 인덱스가 아니라 청크 본문을 훑는 분산 grep이다. 그래서 셀렉터로 스트림을 얼마나 줄였는지가 쿼리 비용을 결정한다.

### 메트릭 쿼리

로그를 시계열로 바꿔 알림과 대시보드에 쓴다.

```logql
sum by (route) (rate({app="api"} |= "error" [5m]))

quantile_over_time(0.99,
  {app="api"} | json | unwrap duration_seconds [5m]) by (route)
```

`rate`, `count_over_time`은 로그 줄 수를 세고, `| unwrap <라벨>`은 추출한 라벨 값을 숫자 샘플로 꺼내 `sum_over_time`, `quantile_over_time` 같은 집계를 건다. 다만 상시 감시 지표를 LogQL로 매번 계산하는 것은 비싸다. 지속적으로 볼 수치는 애플리케이션에서 Prometheus 메트릭으로 노출하는 쪽이 정석이다. [[Logs-vs-Metrics]]

## 수집 에이전트 — Promtail에서 Alloy로

Promtail은 **2026-03-02부로 EOL**이며 상용 지원이 종료됐다. 이후 기능 개발은 Grafana Alloy에서 이뤄지므로, 기존 Promtail 사용자는 Alloy 또는 다른 지원 클라이언트로 이전해야 한다. 컨테이너 환경에서는 FireLens, Fluent Bit 등 다른 라우터에서 Loki로 직접 보내는 구성도 쓴다. [[Log-Pipeline]]

## 운영 체크포인트

- 라벨은 로그의 출처를 설명하는 유한한 값(app, env, cluster, level)까지. 요청 단위 식별자는 본문이나 structured metadata로.
- 보존은 Compactor 설정으로 잡고, 청크 삭제가 비동기라는 점을 감안해 용량 회수 시점을 즉시로 가정하지 않는다. [[Long-Term-Retention]]
- 인제스터는 메모리에 청크를 들고 있으므로, 재시작 시 미flush 데이터 처리와 replication factor를 함께 본다.
- 쿼리가 느리면 먼저 셀렉터가 좁은지 본다. 라인 필터 최적화보다 스트림 축소가 효과가 크다.
- 로그 유입 자체가 끊기면 대시보드는 장애 없는 상태와 구분되지 않는다. ingestion rate 감소를 별도 알람으로 건다. [[Alert-Fatigue]]

## 흔한 함정

- pod name, request id, IP를 라벨로 승격 → 스트림 폭발, 작은 청크 남발, 인덱스 비대
- 라벨 없이 넓은 셀렉터로 전 구간 grep → 오브젝트 스토리지 read 폭증
- Loki를 Elasticsearch처럼 쓰려다 전문 검색 성능을 기대 → 설계 전제가 다르다
- Compactor를 여러 개 띄움
- 상시 지표를 LogQL 메트릭 쿼리로 계산 → 비용과 지연

## 면접 체크포인트

- 어떻게 구축했나: 에이전트가 라벨을 붙여 push, Distributor가 해싱해 Ingester로, Ingester가 청크로 압축해 S3로 flush, TSDB 인덱스도 S3, Compactor가 인덱스 압축과 보존, Grafana가 LogQL로 조회
- 왜 Loki였나: 라벨만 인덱싱하는 구조라 같은 로그량 대비 저장과 운영 비용이 낮고 Prometheus 라벨 모델과 쿼리 감각이 이어진다 ([[Incident-Detection-Logging|스택 비교]])
- Loki에서의 카디널리티: 시계열이 아니라 스트림이 폭발하고, 증상은 인덱스 비대와 작은 청크 다발
- 라벨 vs structured metadata vs 본문의 자리 구분
- LogQL 셀렉터, 라인 필터, 파서, unwrap의 역할과 비용 구조

## 출처

- [Loki — Loki overview](https://grafana.com/docs/loki/latest/get-started/overview/)
- [Loki — Understand labels](https://grafana.com/docs/loki/latest/get-started/labels/)
- [Loki — Structured metadata](https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/)
- [Loki — Loki components](https://grafana.com/docs/loki/latest/get-started/components/)
- [Loki — TSDB index](https://grafana.com/docs/loki/latest/operations/storage/tsdb/)
- [Grafana Labs 블로그 — Loki 2.7 릴리스 (TSDB 인덱스 실험 도입)](https://grafana.com/blog/2022/12/01/grafana-loki-2.7-release/)
- [Loki — Log retention (Compactor)](https://grafana.com/docs/loki/latest/operations/storage/retention/)
- [Loki — Log queries (LogQL)](https://grafana.com/docs/loki/latest/query/log_queries/)
- [Loki — Metric queries (LogQL)](https://grafana.com/docs/loki/latest/query/metric_queries/)
- [Loki — Promtail agent (EOL 공지)](https://grafana.com/docs/loki/latest/send-data/promtail/)

## 관련 문서

- [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적 (신호 선택)]]
- [[Cardinality|카디널리티 관리 (라벨 폭발의 원리)]]
- [[Structured-Logging|Structured logging (JSON 구조화)]]
- [[Log-Pipeline|중앙 집중식 로그 파이프라인]]
- [[Exemplars|Exemplar (메트릭에서 트레이스로 연결)]]
- [[Prometheus|Prometheus (같은 라벨 모델, 메트릭 축)]]
- [[Long-Term-Retention|장기 보존]]
- [[Incident-Detection-Logging|장애 감지와 로깅 (GPL 스택 선택 기록)]]
