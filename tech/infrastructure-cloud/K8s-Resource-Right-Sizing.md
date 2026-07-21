---
tags: [kubernetes, infrastructure, observability, finops]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["K8s Right-Sizing", "Kubernetes Right Sizing", "Pod 리소스 적정화"]
verified_at: 2026-07-21
---

# Kubernetes Resource Right-Sizing

## 정의

Kubernetes 환경에서 각 Pod의 `resources.requests`/`limits`를 실제 사용 패턴에 맞춰 조정하는 작업. 단순히 "줄이는 일"이 아니라 **Over-provisioning과 Under-provisioning을 양방향으로 동시에 관리**하는 일이다.

- **Over-provisioning**: requests가 과다하면 스케줄러가 노드 가용 용량을 부족하다고 판단해 새로운 Pod이 스케줄되지 않고, 노드를 추가해도 실 사용률은 낮은 상태가 지속된다.
- **Under-provisioning**: request가 너무 낮으면 스케줄링 밀도가 과해지거나 경합 시 CPU 배분 비중이 작아질 수 있다. 별도로 memory limit 초과는 OOMKill, CPU limit의 quota 소진은 throttling을 유발할 수 있다.

`requests`는 단순 설정값이 아니라 **스케줄링 기준**이다. 스케줄러는 노드에 배치할 때 request 합계를 보고, Linux CPU 경합 시 request는 상대적 배분 비중에도 관여한다. request는 컨테이너의 hard usage cap이 아니다. limit은 실행 시 상한으로 작동해 CPU는 throttling, memory는 OOM 처리와 연결된다.

## Memory vs CPU — 버퍼 전략이 다른 이유

| 리소스 | 부족 시 동작 | 회복 | 데이터 안정성 | 버퍼 전략 |
|---|---|---|---|---|
| Memory | OOMKill (즉시 강제 종료, graceful shutdown 없음) | 비가역 — 재기동 필요 | 메모리 보관 데이터 유실 가능 | 안전 마진 충분히 |
| CPU | Linux CFS Throttling (quota 초과 시 일시 제한) | 부하 줄면 자동 회복 | 응답 지연 누적 | 낮은 버퍼 + Throttling 지표 별도 감시 |

CPU는 사용률만 봐서는 안 된다. 사용률이 낮아도 **CPU limit 때문에 throttling 중일 수 있다**. 이 경우 request를 낮추는 것이 직접 원인은 아니며, limit과 경합, 실제 수요를 함께 봐야 한다. 사용률과 throttling 비율을 함께 해석한다.

## 측정 지표

| 지표 | 용도 |
|---|---|
| `container_memory_working_set_bytes` | 실제 메모리 압박 반영. RSS와 달리 커널 회수 불가 메모리 포함. OOM 판단 기준과 완전히 일치하진 않지만 Right-Sizing 기준으로 충분 |
| `container_cpu_usage_seconds_total` | CPU 누적 사용 시간 — `rate()`로 사용률 산출 |
| `kube_pod_container_resource_requests` | 현재 설정된 requests — 분모 |
| `container_cpu_cfs_throttled_periods_total` / `container_cpu_cfs_periods_total` | CFS 주기 중 Throttling 발생 비율 |

## 집계 방식 — avg / max / P95 트레이드오프

| 방식 | 특징 | 함정 |
|---|---|---|
| `avg_over_time` | 전체 시간대 고르게 반영 | 피크 구간 사용량을 과소평가 — 평소 적게 쓰다 특정 시간 급증하는 패턴에서 Request 부족 발생 |
| `max_over_time` | 측정 기간 중 최고값 1회 | GC 순간, 컨테이너 init 직후 스파이크, 메트릭 수집 오류 이상값까지 모두 반영 → 과다할당 |
| `quantile_over_time(0.95)` (P95) | 상위 5% 극단값 제외한 95번째 백분위 | Flush, Compaction처럼 간헐 고부하 작업이 있는 컴포넌트는 실제 피크 과소 추정 가능 → max 보조 병행 |

**기본은 P95**, 버스트성 컴포넌트만 max로 검증.

## 측정 기간과 샘플링 간격

| 항목 | 선택 | 이유 |
|---|---|---|
| 측정 기간 | **1주일** + 1개월 교차 검증 | 평일/주말 트래픽 차이를 모두 포함 + 최근 운영 상태 반영. 3개월은 최근 변화 희석, 2주는 프로모션, 이벤트가 끼면 왜곡 |
| 샘플링 간격 | **5분** (1주일 ≈ 2,016 포인트) | 1분(10,080)은 P95 쓰면 어차피 극단값 필터되어 과한 정밀도. 15분(672)은 10~15분 flush 사이클, burst 패턴 누락 |

## 적정 Request 역산식

```
적정 Request = P95 사용량 / 목표 사용률
```

방향이 중요하다. "현재 Request 대비 사용률이 낮으면 잘라낸다"가 아니라, **"P95가 Request의 적정 비율을 차지하도록 역산"**한다.

- 예: P95 = 250Mi, 목표 사용률 80% → 적정 Request ≈ 312Mi. 현재 1,000Mi라면 약 3.2배 과할당.

목표 사용률을 100%가 아닌 70~80%로 잡는 두 가지 이유:
1. P95는 이미 상위 5% 극단값을 뺀 수치 — Request를 P95에 정확히 맞추면 나머지 5% 피크에서 초과 발생.
2. 배포, 트래픽 변동, 예외 상황에 대응할 안전 마진.

## 컴포넌트 분류별 버퍼 차등

단일 버퍼율을 모든 컴포넌트에 적용하면 한쪽은 낭비, 다른 쪽은 위험. **OOM 영향도 + 사용 패턴**으로 분류해 차등.

| 분류 | 예시 | Memory 버퍼 (목표 사용률) | 근거 |
|---|---|---|---|
| Stateless | Distributor, Query-frontend | 낮음 (예: +25%, ~80%) | 상태 없음, 수평 확장 용이, 재시작 영향 낮음, 사용 패턴 일정 |
| Stateful 읽기 | Store-gateway, Querier | 중간 | 장애 시 Latency 영향 |
| Stateful 쓰기 (파형 패턴) | Ingester (메모리 버퍼링 → 주기적 flush) | 높음 (예: +50%, ~67%) | OOM 발생 시 flush 안 된 데이터 유실 |
| 버스트 패턴 | Compactor (대기 → 순간 대용량 소비) | 높음 + max 병행 | P95가 실제 피크 과소 추정 |

벤더 권장치 비교 — 모두 **"피크에 100% 채우지 않는다"**로 수렴.

| 출처 | 기준 | 버퍼 |
|---|---|---|
| Grafana Mimir | P90 활용률, 쓰기 경로 컴포넌트 | +50% |
| AWS Compute Optimizer Balanced | P95 | 목표 ~57% |
| GKE VPA | 최대값 | +25% (Stateless 수준) |

벤더 권장치를 그대로 일괄 적용하지 말고 컴포넌트 특성으로 차등.

## PromQL 쿼리

### Memory 사용률 (P95 / Request)

```promql
100 *
quantile_over_time(0.95,
  (
    sum by (namespace, pod) (
      container_memory_working_set_bytes{namespace=~"<ns>", container!=""}
    )
  )[$__range:5m]
)
/
avg_over_time(
  (
    sum by (namespace, pod) (
      kube_pod_container_resource_requests{namespace=~"<ns>", resource="memory", container!=""}
    )
  )[$__range:5m]
)
```

결과는 P95가 현재 Request의 몇 %를 쓰는지. 25%가 나오면 P95 = Request × 0.25, 적정 Request(목표 80%) = P95 / 0.8 → 약 3.2배 과할당.

### CPU 사용률 — 단독 해석 금지

```promql
100 *
quantile_over_time(0.95,
  (
    sum by (namespace, pod) (
      rate(container_cpu_usage_seconds_total{namespace=~"<ns>", container!=""}[2m])
    )
  )[$__range:5m]
)
/
avg_over_time(
  (
    sum by (namespace, pod) (
      kube_pod_container_resource_requests{namespace=~"<ns>", resource="cpu", container!=""}
    )
  )[$__range:5m]
)
```

### CPU Throttling 비율 — 위 쿼리와 반드시 함께

```promql
100 *
sum by (namespace, pod) (
  rate(container_cpu_cfs_throttled_periods_total{namespace=~"<ns>"}[$__range])
)
/
sum by (namespace, pod) (
  rate(container_cpu_cfs_periods_total{namespace=~"<ns>"}[$__range])
)
```

CPU 사용률 + Throttling 두 쿼리 조합 → 조치 방향:

| CPU 사용률 | Throttling | 해석 |
|---|---|---|
| 낮음 | 없음 | 과할당 — Request 하향 |
| 낮음 | 있음 | CPU limit quota와 burst 패턴 확인 — 필요하면 limit 조정. request는 스케줄링과 경합 비중을 별도 검토 |
| 높음 | 없음 | 적정 |
| 높음 | 있음 | 수요가 높고 CPU limit도 제약 — request와 limit을 각 역할에 맞게 검토 |

`$__range`는 Grafana Panel 변수. Recording Rule, API 직접 호출에서는 명시적 기간 지정.

## 적용 순서와 롤백 기준

기준이 정의돼도 한 번에 적용하면 원인 특정이 어렵다. **장애 영향도, 복구 난이도** 기준 단계 적용, **각 단계마다 사전에 롤백 조건 정의** 필수.

1. **Stateless** (Distributor, Query-frontend) — 재시작 시 데이터 유실 없음, 수평 확장 용이.
2. **Stateful 읽기** (Store-gateway, Querier) — 장애 시 Latency 영향.
3. **Stateful 쓰기** (Ingester) — OOM 시 데이터 유실 — 충분한 검증 후.
4. **버스트 패턴** (Compactor) — 마지막 적용.

각 단계는 개발 환경에서 최소 **3~7일 검증** 후 운영 반영. **롤백 조건은 적용 전에 명시**(예: OOMKill 발생률, Throttling 비율, 응답 지연 임계값 초과 시 즉시 원복).

## 트레이드오프

- **정확도 vs 쿼리 부하**: 샘플링 간격 ↓ = 정밀도 ↑ = 쿼리 부하 ↑.
- **안정성 vs 비용**: 버퍼 ↑ = OOM 위험 ↓ = 리소스 비용 ↑.
- **단순성 vs 정합성**: 단일 버퍼율은 운영 단순하지만 컴포넌트 특성 무시. 차등 적용은 정합성 ↑, 분류 기준 유지 비용 ↑.
- **단기 패턴 vs 장기 안정성**: 측정 기간 짧음 = 최근 변화 빠르게 반영 = 이벤트로 인한 왜곡 위험. 길게 = 희석.

## 면접 체크포인트

- "Pod 리소스 사용률이 낮은데 줄여도 되는가?" → 사용률만 보면 안 됨. CPU는 Throttling 동시 확인, Memory는 P95 + 컴포넌트 특성(Stateless/Stateful/버스트) 고려.
- "왜 평균이나 max가 아니라 P95인가?" → 평균은 피크 과소평가, max는 GC, init 스파이크, 이상값까지 반영해 과다할당. P95가 일시 이상값 제외 + 반복 피크 반영의 균형점.
- "왜 목표 사용률을 100%가 아니라 70~80%로?" → P95가 이미 상위 5% 제외했으므로 그 5% 피크 + 배포, 트래픽 변동 안전 마진.
- "측정 기간을 1주로 잡은 이유?" → 평일/주말 패턴 포함 + 최근 상태 반영. 3개월은 최근 변화 희석, 2주는 이벤트 왜곡. 1개월 교차 검증으로 보완.
- "Memory와 CPU 버퍼를 다르게 가져가는 이유?" → Memory 부족은 OOMKill로 비가역, CPU 부족은 Throttling으로 자동 회복.
- "어떤 컴포넌트부터 적용?" → Stateless → Stateful 읽기 → Stateful 쓰기 → 버스트. 각 단계 3~7일 검증 + 롤백 조건 사전 정의.

## 관련 문서

- [[Container-Monitoring|컨테이너 모니터링]] — cAdvisor, node_exporter, Prometheus 메트릭 수집 구조
- [[Metric-Layer-Mismatch|메트릭 측정 레이어 함정]] — 같은 CPU도 측정 레이어에 따라 다른 값
- [[Container-Memory-Metrics|컨테이너 메모리 지표 해석]] — usage 성분 분해 (RSS, page cache), working set의 의미
- [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적]] — 카디널리티, 보관, 알림 설계 원칙

## 출처

- [옵저버빌리티 Right-Sizing: 여기어때에서 기준을 만드는 법 — 양현진(코플), 여기어때 기술블로그](https://techblog.gccompany.co.kr/%EC%98%B5%EC%A0%80%EB%B2%84%EB%B9%8C%EB%A6%AC%ED%8B%B0-right-sizing-%EC%97%AC%EA%B8%B0%EC%96%B4%EB%95%8C%EC%97%90%EC%84%9C-%EA%B8%B0%EC%A4%80%EC%9D%84-%EB%A7%8C%EB%93%9C%EB%8A%94-%EB%B2%95-8c9e1b3d3c97)
- [Kubernetes — Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
