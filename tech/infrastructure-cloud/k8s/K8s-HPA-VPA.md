---
tags: [kubernetes, autoscaling, hpa, vpa, infrastructure]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["K8s HPA", "K8s VPA", "Kubernetes Autoscaling"]
verified_at: 2026-08-31
---

# Kubernetes HPA와 VPA

HPA는 replica 수를, VPA는 Pod의 resource request를 바꾸는 서로 다른 controller다. HPA의 Resource `Utilization`은 request를 분모로 삼고, VPA는 관측한 사용량과 OOM 같은 신호로 적정 request를 추천한다. 따라서 잘못된 request는 HPA 판단을 직접 왜곡하고 VPA의 초기 상태와 적용 결과에도 영향을 준다. request와 limit의 정적 산정 방법론은 [[K8s-Resource-Right-Sizing|Kubernetes resource right-sizing]]에 있고, 이 문서는 그 값을 동적으로 조정하는 두 축을 다룬다.

## HPA는 비율 계산을 반복하는 제어 루프다

```
desiredReplicas = ceil[ currentReplicas × ( currentMetricValue / desiredMetricValue ) ]
```

- kube-controller-manager가 `--horizontal-pod-autoscaler-sync-period` 주기로 평가한다. 문서 기준 기본값은 15초다.
- **tolerance**의 기본값은 0.1이다. 비율이 1.0에서 10% 이내면 replica를 건드리지 않아 잔진동을 흡수한다.
- 계산 결과는 `minReplicas`와 `maxReplicas` 사이로 clamp된다.
- 삭제 타임스탬프가 붙은 Pod와 failed Pod는 per-pod resource 메트릭 계산에서 제외한다. 메트릭이 없는 Pod와 아직 ready가 아닌 Pod만 따로 두고 최종 스케일 폭을 보수적으로 보정한다. 결측치는 scale down에서 100%, scale up에서 0% 사용으로, not-yet-ready Pod는 scale up에서 0% 사용으로 가정한다.

| Resource type target | 의미 | request 의존 |
|---|---|---|
| `Utilization` | Pod들의 평균 사용량을 **request 대비 백분율**로 환산해 목표와 비교 | 분모가 request. request가 없는 컨테이너가 있으면 그 Pod의 utilization은 정의되지 않고, HPA는 그 지표로 스케일하지 않는다 |
| `AverageValue` | Pod당 평균 사용량의 절대값(예: `500m`)과 비교 | request와 무관하게 동작 |

여기서 HPA와 right-sizing이 맞물린다. request를 과다하게 잡으면 실제로 바쁜 Pod도 사용률이 낮게 보여 HPA가 둔감해지고, request를 과소하게 잡으면 상시 스케일 아웃 상태가 된다. **HPA를 손대기 전에 request가 실사용에 맞는지부터 확인**해야 하는 이유다.

## 지표는 세 계층의 aggregated API로 들어온다

| API group | 제공 주체 | 대표 용도 |
|---|---|---|
| `metrics.k8s.io` | Metrics Server | Pod의 CPU, memory 사용량 (Resource type) |
| `custom.metrics.k8s.io` | Prometheus Adapter 등 adapter | 클러스터 오브젝트에 딸린 애플리케이션 지표 (RPS, 활성 커넥션) |
| `external.metrics.k8s.io` | 외부 시스템 adapter | 클러스터 밖 지표 (큐 depth, 클라우드 지표) |

KEDA는 별도 축이 아니라 이 중 external metrics adapter 자리에 들어가 ScaledObject로부터 HPA를 만들어 주는 계층이다. 실제 replica 결정은 여전히 위의 HPA 공식이 한다.

## CPU 타깃이 맞지 않는 워크로드가 있다

- **IO 바운드 서비스**: 외부 API나 DB 응답을 기다리는 동안 CPU는 한가한데 커넥션과 지연은 쌓인다. CPU 타깃은 이미 늦은 뒤에야 반응한다.
- **큐 소비자**: 처리해야 할 일의 양은 큐에 있지 Pod의 CPU에 있지 않다. backlog 기반 타깃으로 가야 하고, 소비자당 backlog를 목표치로 두는 실무 계산은 [[ECS-Service-AutoScaling|ECS Service Auto Scaling]]의 backlog-per-task 방식과 같은 형태다.
- **memory 타깃**: working set은 page cache 회수 특성 때문에 부하가 빠져도 잘 내려오지 않아 축소가 걸리지 않을 수 있다. 지표 해석은 [[Container-Memory-Metrics|컨테이너 메모리 지표 해석]]을 따른다.

판단 기준은 단순하다. **부하 증가가 그 지표에 선형에 가깝게 반영되는가.** 그렇지 않으면 custom이나 external 지표로 옮긴다.

## behavior로 확장과 축소를 비대칭으로 만든다

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 0
    policies:
      - type: Percent
        value: 100
        periodSeconds: 15
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

- `stabilizationWindowSeconds`의 기본값은 scaleUp 0초, scaleDown 300초다. 축소는 창 안의 권장값 중 가장 큰 값을 골라 성급한 감축을 막는다.
- `policies`는 `Pods`(절대 개수) 또는 `Percent`(비율)로 기간당 변화 폭을 제한하고, `selectPolicy`는 `Max`, `Min`, `Disabled` 중 하나로 정책 선택 방식을 정한다.
- **비대칭이 기본이다.** 확장이 늦으면 장애지만 축소가 늦으면 비용일 뿐이다. 비용 관점의 정리는 [[Autoscaling-Cost|오토스케일링 비용]]으로 넘긴다.
- 지표를 여러 개 걸면 각각 독립적으로 desiredReplicas를 계산한 뒤 **가장 큰 값**을 채택한다. 지표 하나를 추가하는 것은 사실상 하한을 하나 더 다는 일이다.

ASG의 target tracking, step scaling, cooldown과의 대응 관계는 [[Auto-Scaling|EC2 Auto Scaling]]을 참고한다.

## VPA는 세 컴포넌트가 역할을 나눈다

VPA는 Kubernetes 기본 탑재가 아니라 autoscaler 저장소에서 별도로 배포하는 add-on이고, Metrics Server를 필요로 한다.

| 컴포넌트 | 역할 |
|---|---|
| Recommender | 과거와 현재 사용량으로 컨테이너별 권장 request를 계산해 VPA object에 기록 |
| Updater | 권장치와 어긋난 Pod 중 무엇을 갱신할지 결정 |
| Admission Controller | mutating admission webhook으로 등록되어 Pod 생성 경로에서 권장 request를 주입 |

| updateMode | 동작 | 비고 |
|---|---|---|
| `Off` | 자원을 바꾸지 않고 권장치만 기록 | dry run 용도. 권장치 해석은 right-sizing 문서의 목표 사용률 기준을 쓴다 |
| `Initial` | Pod 생성 시에만 할당하고 수명 중에는 바꾸지 않음 | |
| `Recreate` | 생성 시 할당 + 수명 중 Pod을 삭제하고 다시 만들어 갱신 | 재기동 동반 |
| `Auto` | 사용 가능한 방법으로 갱신. VPA 문서 기준 현재는 `Recreate`와 동등하며 deprecated | 명시적 모드 사용 권장 |
| `InPlaceOrRecreate` | 먼저 in-place 갱신을 시도하고 실패하면 `Recreate`로 폴백 | 클러스터의 `InPlacePodVerticalScaling` feature gate 필요 |
| `InPlace` | in-place만 시도하고 eviction하지 않음 | 클러스터의 `InPlacePodVerticalScaling`과 VPA admission controller/updater의 `InPlace` feature gate를 모두 켜야 한다. `InPlaceOrRecreate`에는 클러스터 gate만 필요하다 |

`Recreate` 계열은 Pod 재기동을 동반하므로 상태를 들고 있는 워크로드에서 비용이 크다. 공식 문서도 VPA가 evict한 Pod의 재생성 성공을 보장하지 않는다고 명시한다. 권장치가 노드 크기나 quota를 넘으면 Pod이 Pending으로 남을 수도 있다. in-place 갱신 계열은 feature gate와 VPA 버전 조합에 따라 가용 여부가 달라지므로 클러스터 버전 기준으로 확인하고 쓴다.

## HPA와 VPA를 같은 리소스 지표에 겹치지 않는다

VPA 공식 known limitations는 **같은 리소스 지표(CPU 또는 memory)에 대해 HPA와 VPA를 함께 쓰지 말 것**을 명시하고, custom이나 external 지표 위의 HPA와는 함께 쓸 수 있다고 안내한다. 이유는 피드백 루프다. VPA가 request를 올리면 HPA의 Utilization 분모가 커져 사용률이 떨어지고, HPA가 replica를 줄이면 Pod당 부하가 올라가 VPA가 request를 다시 올린다.

실무 조합은 셋 중 하나다.

1. HPA는 CPU로, VPA는 `Off` 모드 권장자로만 두고 사람이 주기적으로 request를 반영한다.
2. HPA는 custom이나 external 지표로, VPA는 CPU와 memory를 담당한다.
3. VPA의 `controlledResources`를 memory로 좁히고 HPA는 CPU만 본다.

수직 확장과 수평 확장의 일반 비교는 [[Scale-Up-vs-Out|Scale Up vs Scale Out]]에 있다.

## 스케일 아웃 지연은 구간의 합이다

HPA를 15초 주기로 돌려도 트래픽이 실제 처리되기까지는 여러 구간이 누적된다.

1. 메트릭 수집과 노출 지연 (Metrics Server 또는 adapter의 스크레이프 주기)
2. HPA 동기화 주기와 tolerance 통과 여부
3. Pod 생성, 스케줄 가능한 노드가 없으면 Pending
4. 노드 프로비저닝 (노드 축 도구의 감지와 부팅, 도구 비교는 [[EKS#Cluster Autoscaler vs Karpenter|EKS의 노드 오토스케일러 비교]]로 위임)
5. 이미지 pull과 컨테이너 기동, 애플리케이션 warm-up
6. readiness probe 통과 후 EndpointSlice 반영

각 구간을 지연 예산으로 적어 두면 어디를 줄여야 할지가 드러난다. 이미지 크기와 warm-up이 지배적인데 HPA 주기만 줄이는 식의 오조준을 막아 준다. probe 계약은 [[K8s-Configuration-Storage-and-Probes|Kubernetes configuration, storage와 probe]]를 따른다.

## 진단 순서

1. `kubectl describe hpa`로 현재 지표 값과 타깃을 본다. `<unknown>`이면 지표 경로 문제다.
2. `ScalingActive` condition이 False면 metrics API 응답 실패이거나 request 미설정이다. Utilization 타깃은 request 없이 동작하지 않는다.
3. `ScalingLimited`가 True면 `maxReplicas`나 `minReplicas`에 걸려 있는 것이다. 지표를 고쳐도 replica는 움직이지 않는다.
4. 축소가 안 되면 scaleDown stabilization window와 `minReplicas`를 본다. HPA가 Deployment replica를 줄이는 동작은 자발적 중단이므로 PodDisruptionBudget의 eviction 제한을 받지 않는다.
5. replica는 늘었는데 지연이 안 잡히면 readiness를 본다. probe가 부실하면 준비 안 된 Pod에 트래픽이 조기 유입되고, 지나치게 늦으면 확장 효과가 그만큼 늦게 나타난다.
6. VPA를 함께 쓰는 중이면 같은 리소스 지표를 두 controller가 동시에 보고 있는지부터 확인한다.

## 면접 체크포인트

- "HPA 계산식의 분모가 왜 request인가?" → Resource type의 `Utilization` 타깃이 request 대비 백분율로 정의되기 때문. request가 틀리면 스케일 판단 전체가 틀어지고, request가 없는 컨테이너에서는 그 지표로 아예 스케일하지 않는다.
- "CPU 지표가 부적합한 워크로드는?" → IO 바운드 서비스와 큐 소비자. 부하 증가가 CPU에 선형으로 반영되지 않아 custom이나 external 지표로 옮긴다.
- "HPA와 VPA를 함께 쓰면 무엇이 충돌하는가?" → 같은 리소스 지표에서 VPA의 request 변경이 HPA의 분모를 흔들어 피드백 루프가 생긴다. 공식 문서도 같은 지표 병용을 권장하지 않는다. 지표를 분리하거나 VPA를 권장자로만 쓴다.
- "스케일 아웃이 늦다. 어떻게 분해하는가?" → 메트릭 지연, HPA 주기, 스케줄과 노드 프로비저닝, 이미지 pull과 warm-up, readiness 통과로 구간을 나눠 각각 측정한다.
- "VPA `Auto`나 `Recreate`를 stateful 워크로드에 쓰지 않는 이유는?" → Pod 재생성을 동반하고 재생성 성공이 보장되지 않으며, 권장치가 노드 용량을 넘으면 Pending으로 남을 수 있다.
- "scaleUp과 scaleDown을 왜 비대칭으로 두는가?" → 확장 지연은 장애로, 축소 지연은 비용으로 나타나기 때문. 기본값도 scaleUp 0초, scaleDown 300초로 비대칭이다.

## 출처

- [Kubernetes Docs, Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes Docs, HorizontalPodAutoscaler Walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)
- [Kubernetes Docs, Autoscaling Workloads](https://kubernetes.io/docs/concepts/workloads/autoscaling/)
- [Kubernetes autoscaler, Vertical Pod Autoscaler Known Limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [Kubernetes autoscaler, Vertical Pod Autoscaler Components](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/components.md)
- [Kubernetes autoscaler, VerticalPodAutoscaler v1 API types](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go)

## 관련 문서

- [[K8s-Resource-Right-Sizing|Kubernetes resource right-sizing]] — HPA 분모이자 VPA 권장치 해석 기준인 request 산정 방법론
- [[K8s-Configuration-Storage-and-Probes|Kubernetes configuration, storage와 probe]] — readiness 계약과 QoS 기초
- [[K8s-Core-Workloads-and-Service|Kubernetes core workload와 Service]] — Deployment replica와 EndpointSlice 반영 경로
- [[EKS|Amazon EKS]] — 노드 축 오토스케일러 비교와 3축 정리
- [[ECS-Service-AutoScaling|ECS Service Auto Scaling]] — 큐 backlog 기반 타깃 계산 실무
- [[Auto-Scaling|EC2 Auto Scaling]] — target tracking, step, cooldown과 warmup
- [[Scale-Up-vs-Out|Scale Up vs Scale Out]] — 수직 확장과 수평 확장의 일반 비교
- [[Container-Memory-Metrics|컨테이너 메모리 지표 해석]] — memory 타깃이 잘 내려오지 않는 이유
- [[Autoscaling-Cost|오토스케일링 비용]] — 축소 정책과 비용 레버
