---
tags: [kubernetes, pdb, availability, operations]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["PodDisruptionBudget", "K8s PDB", "Pod Disruption Budget"]
verified_at: 2026-08-31
---

# Kubernetes PodDisruptionBudget

PodDisruptionBudget(PDB)은 배포를 느리게 만드는 장치가 아니라 selector가 묶은 Pod 집합에 대해 동시에 몇 개까지 자발적으로 내려도 되는지를 선언하는 가용성 하한 계약이다. 적용 주체는 Deployment controller가 아니라 API server의 eviction subresource이고, eviction 경로를 타지 않는 삭제는 PDB를 그냥 통과한다. 이 문서는 2026-08-31에 대조한 Kubernetes 공식 문서 기준으로 그 경계와 계산 방식, 운영에서 걸리는 지점을 정리한다.

## 자발적 중단과 비자발적 중단

PDB가 막을 수 있는 것은 eviction API를 호출하는 자발적 중단(voluntary disruption)뿐이다. 비자발적 중단(involuntary disruption)은 PDB로 막지 못하고, 다만 그만큼 예산을 소비한다.

| 중단 유형 | 사례 | PDB 적용 |
|---|---|---|
| 자발적, eviction 경유 | `kubectl drain`, 노드 업그레이드, autoscaler의 노드 축소, descheduler, eviction API를 호출하는 operator | 적용됨 |
| 자발적, eviction 미경유 | `kubectl delete pod`, Deployment나 controller object 자체 삭제, Pod template 변경에 따른 rollout | 적용되지 않음 |
| 비자발적 | 하드웨어 장애, kernel panic, node NotReady와 network partition, node out-of-resource eviction, VM 소실 | 막지 못하나 예산에는 반영됨 |

- 흔한 오해: PDB를 걸면 Pod가 안 죽는다. PDB는 API server가 eviction 요청을 거절할 근거일 뿐이고, 삭제 API로 직접 지우면 그대로 사라진다.
- 공식 문서 표현으로도 deployment나 pod를 삭제하는 경로는 PDB를 우회한다. 안전장치를 원하면 자동화가 eviction API를 쓰도록 강제하는 쪽이 먼저다.
- rolling upgrade로 사라진 Pod는 예산 계산에 반영되지만, Deployment와 StatefulSet의 rollout 자체는 PDB에 의해 제한되지 않는다.

## minAvailable과 maxUnavailable

두 필드는 같은 제약의 반대 표현이고, 하나의 PDB에 동시에 지정할 수 없다.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: api
```

- `minAvailable`은 eviction 이후에도 남아 있어야 하는 최소 healthy Pod 수, `maxUnavailable`은 eviction 이후 허용되는 최대 unavailable Pod 수다.
- 백분율은 둘 다 올림이다. Pod 7개에 `minAvailable: "50%"`면 4개가 남아야 하고, `maxUnavailable: "30%"`면 3개까지 내릴 수 있어 지정한 비율을 넘길 수 있다.
- `maxUnavailable`은 selector가 같은 controller가 관리하는 Pod 전체를 정확히 고르고, 그 controller가 desired replica 수를 계산할 수 있을 때만 쓴다. 내장 workload 또는 `scale` subresource를 제공하는 custom controller가 이 조건을 만족한다. 여러 controller, owner 없는 Pod, 임의 부분 집합에는 정수 `minAvailable`만 쓴다.
- replica 수가 변할 때 의미가 갈린다. 절대값 `minAvailable: 3`은 replica가 3으로 줄면 예산이 0이 되어 drain을 영구히 막고, `maxUnavailable: 1`은 replica가 변해도 한 개 여유를 유지한다.
- 판단 기준: replica 수가 오토스케일링으로 변하는 stateless 워크로드는 `maxUnavailable` 절대값을 기본으로 두고, quorum이 걸린 stateful 워크로드는 `minAvailable`을 quorum 크기로 명시한다.
- Deployment, ReplicaSet, ReplicationController, StatefulSet과 `scale` subresource를 가진 custom controller의 Pod 전체에 붙일 수 있다.

## eviction API가 disruptionsAllowed를 계산하는 방식

healthy 판정은 Pod의 `Ready` condition이 `True`인지로만 한다. readiness가 늦게 올라오는 워크로드는 그만큼 예산이 늦게 회복된다. [[K8s-Configuration-Storage-and-Probes|probe 설계]]

- disruption controller가 `status.currentHealthy`, `status.desiredHealthy`, `status.expectedPods`를 갱신하고 그 차이로 `status.disruptionsAllowed`를 낸다.
- `disruptionsAllowed`가 0이면 eviction 요청은 429 Too Many Requests로 거절된다. `kubectl drain`은 이 응답을 받고 재시도하며 대기하므로 멈춘 것처럼 보인다.
- 같은 Pod를 여러 PDB가 가리키면 eviction은 500으로 실패한다. 설정 오류이지 일시적 대기가 아니다.
- `status.conditions`의 `DisruptionAllowed` reason이 판단을 좁혀 준다. `InsufficientPods`는 예산 부족, `SyncFailed`는 controller 오류다.
- `status.disruptedPods`는 eviction이 처리됐지만 controller가 아직 관측하지 못한 Pod다. 여기에 항목이 오래 쌓이면 Pod 삭제가 지연되고 있다는 신호다.

```
NAME     MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
zk-pdb   2               <none>            1                     7d
```

drain이 진행되지 않을 때 로그보다 먼저 `ALLOWED DISRUPTIONS` 값을 본다. 0이면 예산 문제, 1 이상인데도 멈춰 있으면 종료 지연이나 재스케줄 실패 쪽이다.

## 운영에서 실제로 터지는 함정

- **replica 1에 `minAvailable: 1`**: 예산이 처음부터 0이라 해당 Pod가 있는 노드의 drain이 끝나지 않는다. 단일 인스턴스는 PDB를 걸지 않거나 replica를 늘리고 예산을 잡는다. 공식 문서도 `maxUnavailable: 0`이나 `minAvailable`을 replica 수로 두면 drain이 완료되지 않는다고 명시한다.
- **PDB를 아예 안 건 워크로드**: 노드 업그레이드가 한 번에 여러 replica를 같은 시점에 evict해도 막을 근거가 없다. 노드 교체가 잦은 환경에서는 무예산이 곧 동시 전멸 위험이다.
- **selector 오설정**: null selector는 아무 Pod도 고르지 않아 조용히 무력화되고, 빈 selector `{}`는 namespace 전체를 고른다. 여러 워크로드에 겹치면 한쪽 장애가 다른 쪽 drain을 막는다.
- **unhealthy Pod가 예산을 잡아먹는 경우**: 기본값 `unhealthyPodEvictionPolicy: IfHealthyBudget`에서는 아직 Ready가 아닌 Pod도 예산이 남아야 evict된다. 그래서 CrashLoop 중인 Pod가 노드 drain을 막는다. `AlwaysAllow`로 두면 Ready가 아닌 Pod는 예산과 무관하게 evict된다. 이 필드는 feature gate `PDBUnhealthyPodEvictionPolicy` 기준으로 v1.26 alpha, v1.27 beta 기본 활성, v1.31 stable이고 v1.33에서 gate가 제거됐다. 클러스터 버전을 확인한 뒤 적용한다.
- **StatefulSet과 단일 리더 컴포넌트**: quorum 기반이면 `minAvailable`을 quorum 크기로 두고, leader가 하나뿐인 컴포넌트는 PDB로 리더 전환 시간을 벌기보다 리더 재선출이 빠른지를 먼저 확인한다. [[Istio-Ambient-Upgrade|노드 blue-green 업그레이드 사례]]

## 다른 무중단 장치와의 역할 분담

세 장치는 계층이 달라 서로를 대체하지 않는다.

| 장치 | 적용 주체 | 적용 범위 |
|---|---|---|
| rollout의 `maxUnavailable` | Deployment controller | 자기 rollout 중의 Pod 교체 속도 |
| PDB | API server의 eviction subresource | eviction 경로를 타는 모든 중단 |
| readiness와 preStop, graceful shutdown | kubelet과 Pod 자신 | Pod 하나의 종료 계약 |

rollout `maxUnavailable`은 배포 속도만 통제하고 노드 drain은 통제하지 않는다. 반대로 PDB는 노드 drain을 통제하지만 rollout 자체를 제한하지 않는다. 개별 Pod가 종료 신호를 받고 in-flight 요청을 흘려보내는 계약은 [[Graceful-Shutdown|graceful shutdown]]이 담당하고, PDB는 그 계약이 지켜진다는 전제 위에서 집합 수준의 동시 종료 개수만 제한한다. rollout 파라미터의 상세는 [[K8s-Core-Workloads-and-Service|core workload 문서]], 무중단 배포 전반의 계층은 [[Zero-Downtime-Deployment|무중단 배포]]에 있다.

## 운영 체크리스트와 진단

```bash
kubectl get pdb -A
kubectl describe pdb NAME -n NAMESPACE
kubectl get pdb NAME -n NAMESPACE -o jsonpath='{.status}'
kubectl get pod -n NAMESPACE -l app=api -o wide
kubectl drain NODE --ignore-daemonsets --delete-emptydir-data
```

1. `ALLOWED DISRUPTIONS`가 0인지 본다. 0이면 예산 문제로 확정하고 아래로 내려간다.
2. selector가 실제로 어떤 Pod를 고르는지 확인한다. 0개면 무력한 PDB, 여러 워크로드에 걸치면 설계 오류다.
3. Ready가 아닌 Pod를 센다. unhealthy Pod가 예산을 잡고 있으면 그 Pod의 장애를 먼저 고치거나 `unhealthyPodEvictionPolicy`를 검토한다.
4. `status.expectedPods` 대비 `desiredHealthy`를 본다. replica 축소로 절대값 예산이 과도해진 경우가 여기서 드러난다.
5. `status.disruptedPods`에 항목이 쌓여 있으면 종료가 지연되는 것이다. `terminationGracePeriodSeconds`와 preStop 쪽을 본다.

노드를 병렬로 drain해도 PDB는 그대로 지켜지므로, 업그레이드 자동화는 예산을 우회하는 강제 삭제 대신 eviction 재시도로 기다리게 설계한다. 노드 축소와 버전 업그레이드가 자발적 중단의 주된 출처이므로 [[EKS|EKS]]처럼 관리형 노드 그룹을 쓰는 환경에서는 PDB와 노드 교체 정책을 한 세트로 본다.

## 출처

- [Kubernetes Docs, Disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Kubernetes Docs, Specifying a Disruption Budget for your Application](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [Kubernetes Docs, API-initiated Eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/)
- [Kubernetes Docs, Safely Drain a Node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [Kubernetes Docs, PodDisruptionBudget v1](https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/)
- [Kubernetes Docs, Feature Gates (removed)](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/)

## 관련 문서

- [[K8s-Core-Workloads-and-Service|Kubernetes core workload와 Service]]
- [[K8s-Configuration-Storage-and-Probes|Kubernetes configuration, storage와 probe]]
- [[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes traffic entry, Helm과 GitOps]]
- [[Graceful-Shutdown|Graceful shutdown]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[EKS|Amazon EKS]]
