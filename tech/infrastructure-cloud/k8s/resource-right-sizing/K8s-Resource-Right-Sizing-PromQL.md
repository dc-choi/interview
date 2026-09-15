---
tags: [kubernetes, infrastructure, observability, prometheus, promql]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Right-Sizing PromQL", "리소스 사용률 PromQL", "CPU Throttling 쿼리"]
verified_at: 2026-07-21
---

# Kubernetes Resource Right-Sizing — PromQL 쿼리

## Memory 사용률 (P95 / Request)

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

## CPU 사용률 — 단독 해석 금지

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

## CPU Throttling 비율 — 위 쿼리와 반드시 함께

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

## 출처

- [옵저버빌리티 Right-Sizing: 여기어때에서 기준을 만드는 법 — 양현진(코플), 여기어때 기술블로그](https://techblog.gccompany.co.kr/%EC%98%B5%EC%A0%80%EB%B2%84%EB%B9%8C%EB%A6%AC%ED%8B%B0-right-sizing-%EC%97%AC%EA%B8%B0%EC%96%B4%EB%95%8C%EC%97%90%EC%84%9C-%EA%B8%B0%EC%A4%80%EC%9D%84-%EB%A7%8C%EB%93%9C%EB%8A%94-%EB%B2%95-8c9e1b3d3c97)
- [Kubernetes — Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

## 관련 문서

- [[Container-Monitoring|컨테이너 모니터링]] — cAdvisor, node_exporter, Prometheus 메트릭 수집 구조
- [[K8s-Resource-Right-Sizing-Criteria|기준 수립]] — 쿼리가 산출하는 값의 해석 기준과 역산식
- [[K8s-Resource-Right-Sizing-Component-Rollout|컴포넌트별 버퍼 차등과 적용]] — 측정 결과를 반영하는 순서와 롤백 기준
- [[K8s-Resource-Right-Sizing|Kubernetes Resource Right-Sizing]] — 상위 목차
