---
tags: [kubernetes, infrastructure, observability, finops]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["컴포넌트별 버퍼 차등", "Right-Sizing 적용 순서", "Right-Sizing Rollout"]
verified_at: 2026-07-21
---

# Kubernetes Resource Right-Sizing — 컴포넌트별 버퍼 차등과 적용

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
| Grafana Mimir | 백분위 기준 없음, 배포 전반 | 트래픽 피크 대응을 위해 메모리와 디스크 +50% |
| AWS Compute Optimizer Balanced | P95, CPU/메모리 headroom 30% | 목표 70% 미만. Default 프리셋은 P99.5와 headroom 20%로 목표 80% 미만 |
| GKE VPA | 자체 recommender의 일반 기준 백분위와 마진은 공식 문서에 미공개 | OOMKilled 시 메모리 권장치를 약 +20% 또는 100MB 중 큰 값만 공개. 업스트림 VPA 기본 P90과 15% 마진을 GKE 값으로 간주하지 않음 |

벤더 권장치를 그대로 일괄 적용하지 말고 컴포넌트 특성으로 차등.

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

## 출처

- [옵저버빌리티 Right-Sizing: 여기어때에서 기준을 만드는 법 — 양현진(코플), 여기어때 기술블로그](https://techblog.gccompany.co.kr/%EC%98%B5%EC%A0%80%EB%B2%84%EB%B9%8C%EB%A6%AC%ED%8B%B0-right-sizing-%EC%97%AC%EA%B8%B0%EC%96%B4%EB%95%8C%EC%97%90%EC%84%9C-%EA%B8%B0%EC%A4%80%EC%9D%84-%EB%A7%8C%EB%93%9C%EB%8A%94-%EB%B2%95-8c9e1b3d3c97)
- [Grafana Mimir, Planning capacity](https://grafana.com/docs/mimir/latest/manage/run-production-environment/planning-capacity/)
- [AWS Compute Optimizer, Rightsizing recommendation preferences](https://docs.aws.amazon.com/compute-optimizer/latest/ug/rightsizing-preferences.html)
- [Google Kubernetes Engine, Vertical Pod autoscaling](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler)

## 관련 문서

- [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적]] — 카디널리티, 보관, 알림 설계 원칙
- [[K8s-Resource-Right-Sizing-Criteria|기준 수립]] — 버퍼를 차등할 때 쓰는 P95와 목표 사용률 정의
- [[K8s-Resource-Right-Sizing-PromQL|PromQL 쿼리]] — 롤백 조건으로 감시할 지표의 쿼리
- [[K8s-Resource-Right-Sizing|Kubernetes Resource Right-Sizing]] — 상위 목차
