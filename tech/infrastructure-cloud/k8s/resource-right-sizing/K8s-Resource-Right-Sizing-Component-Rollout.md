---
tags: [kubernetes, infrastructure, observability, finops, karpenter, spot]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["컴포넌트별 버퍼 차등", "Right-Sizing 적용 순서", "Right-Sizing Rollout", "Spot NodePool 인스턴스 선택"]
verified_at: 2026-10-11
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

벤더 권장치 비교 — 피크와 운영 변동에 대응할 여유를 둔다.

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

## Pod 적정화와 노드 통합을 분리한다

2026-10-07 Karpenter 공식 문서와 AWS 운영 가이드 대조 기준. Pod의 `requests`를 실측에 맞추는 작업과 Karpenter가 노드를 통합하는 작업은 서로 다른 조정이다.

Karpenter는 Pod의 resource requests와 스케줄링 제약을 이용해 노드를 구성한다. CPU와 메모리 실사용량이 낮다는 이유만으로 Pod의 requests를 자동으로 줄이지 않는다. 과다한 requests를 유지하면 노드 통합만으로 낭비를 충분히 줄이기 어렵고, requests를 과하게 줄이면 배치 밀도가 높아져 자원 경합 위험이 커진다.

Consolidation은 빈 노드 제거, 다른 노드로 Pod 이동 또는 더 저렴한 노드로 교체를 검토한다. 비용 최적화 과정에서도 Pod 재배치와 중단이 생길 수 있으므로 다음을 함께 확인한다.

- `consolidationPolicy`와 `consolidateAfter`로 통합 대상과 대기 시간을 정한다.
- NodePool의 `spec.disruption.budgets`는 자발적 consolidation과 drift 등의 속도를 제한한다. expiration이나 Spot interruption까지 막는 장치로 해석하지 않는다.
- PDB와 `karpenter.sh/do-not-disrupt`는 자발적 교체를 제약한다. 별도의 `terminationGracePeriod`가 설정된 종료에서는 기한에 따른 강제 삭제 가능성도 검토한다.

운영 적용 시에는 Pod requests 변경과 노드 정책 변경을 한꺼번에 적용하지 않는 방식을 검토한다. 먼저 작은 워크로드 집합에서 Pending, OOMKill, CPU throttling과 지연을 관찰하고, 이후 노드 교체 빈도와 비용을 함께 비교한다. 이 순서는 원인 분리를 위한 운영 제안이며 Karpenter가 보장하는 무중단 절차는 아니다.

## Spot 중단 대응과 대체 용량의 준비를 분리한다

2026-10-10 Karpenter 공식 문서의 interruption handling 대조 기준. Spot을 도입할 때는 할인율뿐 아니라 중단 이벤트 전달과 워크로드 복구 시간을 확인한다.

- Spot 중단 이벤트를 전달하려면 EventBridge 규칙과 대상, SQS 큐를 구성하고 Karpenter의 `--interruption-queue`에 큐 이름을 지정한다. 노드 상태 검사와 달리 이 이벤트 경로에는 큐 구성이 필요하다.
- Karpenter는 Spot 중단 경고를 받으면 기존 노드를 drain하면서 대체 노드를 병렬로 준비한다. 대체 노드가 Ready가 될 때까지 기존 노드의 drain을 미루는 절차가 아니다.
- Spot rebalance recommendation은 Kubernetes 이벤트로 게시하지만 Karpenter 자체의 taint, drain, terminate 처리 대상은 아니다. 중단 경고와 같은 이벤트로 취급하지 않는다.

운영 검증에서는 이벤트 수신, 대체 노드 준비, 이미지 다운로드, Pod readiness와 실제 요청 성공을 구분해 측정한다. 큐를 연결했다는 사실만으로 무중단 복구가 입증되지는 않는다. 이는 공식 동작을 바탕으로 한 점검 제안이며 특정 비용 절감률이나 복구 시간을 보장하지 않는다.

## Spot NodePool의 인스턴스 범위를 정한다

Spot 비중을 높일수록 NodePool이 허용하는 인스턴스 범위가 비용과 가용성을 함께 좌우한다. 아래 앞의 세 항목은 2026-10-11 Karpenter v1.15 문서(NodePools, NodeClasses, FAQs, Disruption, Settings)와 Amazon EKS Best Practices Guide의 Karpenter 절을 대조한 공식 동작이며, 항목 안에서 추론이라고 표시한 문장은 그 동작에서 도출한 판단이다.

- **용량 유형의 우선순위:** `karpenter.sh/capacity-type`에 여러 유형을 허용하면 Karpenter는 `reserved`, `spot`, `on-demand` 순으로 우선한다. `reserved`는 RI가 아니라 EC2NodeClass에서 고른 On-Demand 용량 예약과 Capacity Blocks다. EC2 Fleet API가 용량 부족을 돌려주면 그 인스턴스 타입과 가용 영역의 해당 용량 유형을 3분간 후보에서 뺀다. 상위 유형에 남은 후보가 없으면 하위 유형으로 전환을 시도하며 문서는 이 전환이 보통 밀리초 안에 일어난다고 설명한다. 전환이 빠르다는 사실이 새 노드의 준비 시간까지 보장하지는 않고, FAQ는 Spot이 부족할 때 On-Demand도 부족할 수 있다고 적는다.
- **price-capacity-optimized:** Spot 요청은 EC2가 중단 위험이 낮은 깊은 풀 가운데 가격이 낮은 풀을 고르는 전략을 쓴다. 따라서 Spot에서 가장 싼 타입이 고정적으로 선택되지는 않는다. 허용한 타입이 많을수록 EC2가 Spot 인스턴스의 실행 지속을 더 잘 최적화할 수 있다. 타입을 지나치게 좁히면 Spot만 허용한 NodePool에서는 풀이 회수되고 대안이 없을 때 Pod가 Pending에 머물 수 있다. On-Demand를 함께 허용한 NodePool에서는 On-Demand로 전환되는 빈도가 늘어 비용이 오를 수 있다(추론). 가이드는 Spot을 쓸 때 다양한 인스턴스 타입을 허용하는 것을 일반 원칙으로 둔다.
- **범위와 통합:** NodePools 문서는 인스턴스 타입 관련 요구사항을 정하지 않아 선택지를 최대화하는 쪽을 권장한다. 요구사항에는 `Gte`, `Lte`를 포함한 연산자를 쓸 수 있다. `minValues`는 후보에 서로 다른 값이 최소 몇 개 남도록 요구하는 다양성 하한이며(문서 예시 주석은 이 필드를 ALPHA로 표시한다), 기본 `Strict` 정책에서는 하한을 채우지 못하면 그 NodePool로 스케줄하지 못하고 `--min-values-policy=BestEffort`에서는 하한을 완화한다. Spot 노드를 더 싼 Spot 노드로 바꾸는 교체 통합은 `SpotToSpotConsolidation` 기능 플래그(v1.15 기준 alpha, 기본값 false)를 켜야 하고, 한 대를 한 대로 바꿀 때는 인스턴스 타입 유연성이 최소 15개 필요하다. 플래그를 켜지 않으면 Spot 노드에는 삭제 통합만 적용된다. 범위를 좁히면 이 교체 기회도 줄어든다(추론).

다음은 위 동작을 바탕으로 한 운영 제안이다.

- 제외는 관측 근거가 있는 범위로 한정한다. 오래된 세대에서 성능 편차나 오류가 관측됐다면 `karpenter.k8s.aws/instance-generation`의 하한으로 그 세대와 더 오래된 세대를 빼고(특정 세대 하나만 빼려면 `NotIn`), 카테고리, 크기와 가용 영역은 넓게 둔다. 하한을 둬도 남은 세대와 CPU 제조사 사이의 성능 차이는 남으므로 지연에 민감한 서비스는 노드 유형별 지연과 오류율을 나눠 본다.
- 카테고리를 넓게 열어 둔 NodePool에서는 Karpenter가 Pod의 requests에 맞는 타입을 고르므로, 사람이 카테고리를 미리 고르기보다 실제 노드 구성과 청구액을 확인한다. On-Demand 노드는 consolidation이 더 싼 노드로의 교체를 검토하지만, Spot 노드끼리의 교체는 위 `SpotToSpotConsolidation`을 켠 경우에만 일어난다. 카테고리를 직접 정해야 하는 경우(카테고리를 고정한 노드 그룹이나 성능 일관성 때문에 범위를 좁힌 NodePool)에는 CPU와 메모리 비율이 맞는지만으로 고르지 않는다. 요청 합계를 담고 남는 자원과 실제로 내는 시간당 가격(Spot이면 해당 가용 영역의 Spot 가격)을 함께 비교하면 비율이 가까운 범용 타입보다 컴퓨팅 최적화나 메모리 최적화 타입이 싼 경우가 있다. 특정 타입이 항상 싸다는 뜻은 아니며, Spot 가격은 EC2가 인스턴스 타입과 가용 영역별로 정하고 장기 수급에 따라 점진적으로 조정한다.

사례로 2023년 AWS re:Invent의 국내 음식 배달 서비스 발표는 Spot을 많이 쓰던 중 5세대와 6세대를 섞었다가 5세대 노드의 성능이 예상보다 낮아 5세대 쪽에서 장애가 많이 발생했고, 6세대 하나로 통일했다고 밝혔다. 발표 시점에는 노드의 80% 가까이를 Spot으로 운영하고, 비용을 비교해 2XL에서는 메모리 최적화 타입을, 4XL에서는 컴퓨팅 최적화와 메모리 최적화 타입을 섞어 쓴다고 설명했다. Spot 비율은 발표자가 밝힌 값이며 다른 환경의 목표치가 아니다. 운영 제안: 세대, 카테고리와 크기를 함께 좁힌 구성은 위 가이드의 다양성 원칙과 긴장 관계에 있으므로 Pending 시간, On-Demand 전환 비율과 Spot 중단에 따른 노드 교체 빈도를 함께 관찰한다.

## 예비 용량으로 노드 생성 대기를 줄인다

2026-10-10 Kubernetes와 Karpenter 공식 문서 대조 기준. 노드 비용을 줄이는 consolidation과 신규 Pod를 빠르게 배치하기 위한 예비 용량은 서로 다른 목표다.

낮은 우선순위의 placeholder Pod에 CPU와 메모리 `requests`를 지정하면 스케줄러 관점에서 용량을 미리 차지한다. 더 높은 우선순위의 업무 Pod가 공간을 필요로 할 때 placeholder가 선점 대상이 되고, 업무 Pod는 그 자원을 사용할 수 있다. Kubernetes 공식 예제는 음수 PriorityClass와 서로 다른 노드를 선호하는 Pod anti-affinity를 사용한다.

Karpenter는 배치할 수 없는 Pod의 requests와 스케줄링 조건을 바탕으로 노드를 준비한다. 선점 뒤 대체 placeholder가 Pending이 되면 조건을 만족하는 새 용량을 요청하는 구성을 만들 수 있다. NodePool의 허용 범위나 한도 때문에 배치하지 못하는 상황까지 해결하는 방식은 아니다.

운영 점검 제안: placeholder 수와 requests로 유지할 여유를 정하고, 업무 Pod의 우선순위, 노드와 가용 영역 배치 제약을 함께 확인한다. 여유 용량 비용, Pending 시간과 실제 readiness 시간을 비교한다. 선점 가능성이 즉시 기동이나 이미지 다운로드 완료를 보장하지 않으며, 특정 사례의 비용 절감률과 노드 준비 시간을 일반 목표값으로 사용하지 않는다.

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

- [Kubernetes, Overprovision Node Capacity For A Cluster](https://kubernetes.io/docs/tasks/administer-cluster/node-overprovisioning/)
- [Karpenter, Scheduling](https://karpenter.sh/docs/concepts/scheduling/)
- [Karpenter, Disruption](https://karpenter.sh/docs/concepts/disruption/)
- [Karpenter, NodePools](https://karpenter.sh/docs/concepts/nodepools/)
- [Karpenter, NodeClasses](https://karpenter.sh/docs/concepts/nodeclasses/)
- [Karpenter, FAQs](https://karpenter.sh/docs/faq/)
- [Karpenter, Settings](https://karpenter.sh/docs/reference/settings/)
- [Amazon EKS Best Practices Guide, Karpenter](https://docs.aws.amazon.com/eks/latest/best-practices/karpenter.html)
- [Amazon EC2, Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [AWS, Karpenter Best Practices](https://aws.github.io/aws-emr-containers-best-practices/performance/docs/karpenter/)
- [옵저버빌리티 Right-Sizing: 여기어때에서 기준을 만드는 법 — 양현진(코플), 여기어때 기술블로그](https://techblog.gccompany.co.kr/%EC%98%B5%EC%A0%80%EB%B2%84%EB%B9%8C%EB%A6%AC%ED%8B%B0-right-sizing-%EC%97%AC%EA%B8%B0%EC%96%B4%EB%95%8C%EC%97%90%EC%84%9C-%EA%B8%B0%EC%A4%80%EC%9D%84-%EB%A7%8C%EB%93%9C%EB%8A%94-%EB%B2%95-8c9e1b3d3c97)
- [Grafana Mimir, Planning capacity](https://grafana.com/docs/mimir/latest/manage/run-production-environment/planning-capacity/)
- [AWS Compute Optimizer, Rightsizing recommendation preferences](https://docs.aws.amazon.com/compute-optimizer/latest/ug/rightsizing-preferences.html)
- [Google Kubernetes Engine, Vertical Pod autoscaling](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler)
- [Continuous resource tracking with Amazon EKS for cost optimization (GBL210) — AWS re:Invent 2023](https://www.youtube.com/watch?v=xIDx2QmIS9A)

## 관련 문서

- [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적]] — 카디널리티, 보관, 알림 설계 원칙
- [[K8s-Resource-Right-Sizing-Criteria|기준 수립]] — 버퍼를 차등할 때 쓰는 P95와 목표 사용률 정의
- [[K8s-Resource-Right-Sizing-PromQL|PromQL 쿼리]] — 롤백 조건으로 감시할 지표의 쿼리
- [[K8s-Resource-Right-Sizing|Kubernetes Resource Right-Sizing]] — 상위 목차
- [[Autoscaling-Cost|오토스케일링 비용]] — Spot과 약정 혼합, 인스턴스 타입 다양화
- [[Resource-Right-Sizing|리소스 적정화]] — 인스턴스 타입 변경의 비용 판단
- [[EKS|Amazon EKS]] — Cluster Autoscaler와 Karpenter의 노드 선택 비교
