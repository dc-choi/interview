---
tags: [kubernetes, storage, storageclass, pvc, scheduling, cka]
status: done
verified_at: 2026-11-17
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes Volume Binding Mode", "volumeBindingMode", "WaitForFirstConsumer", "볼륨 바인딩 모드"]
---

# StorageClass의 volume binding mode

StorageClass의 `volumeBindingMode`는 PVC에 PV를 묶거나 동적 provisioning을 시작하는 시점을 정한다. 질문은 하나다. 저장소를 PVC가 생길 때 준비할 것인가, 그 PVC를 쓰는 Pod가 생길 때 준비할 것인가. 정적 binding의 짝 맞추기 조건(class, access mode, 용량)은 [[K8s-Configuration-Storage-and-Probes#미리 만든 PV에 PVC가 붙는 조건|미리 만든 PV에 PVC가 붙는 조건]]에 있다.

## 두 모드

| 모드 | binding과 provisioning 시점 | 맞는 경우 |
|---|---|---|
| `Immediate` (필드를 비우면 기본값) | PVC가 생성되는 즉시 | 모든 node에서 접근할 수 있는 저장소 |
| `WaitForFirstConsumer` | 그 PVC를 쓰는 Pod가 생성될 때까지 미룸 | zone이나 node에 묶인 저장소, local volume |

### Immediate가 Pod를 못 뜨게 하는 경우

zone 단위 블록 스토리지처럼 topology에 묶여 모든 node에서 접근할 수 없는 backend에서 `Immediate`를 쓰면, PV가 Pod의 scheduling 요구를 모른 채 묶이거나 만들어진다. 예를 들어 volume이 zone A에 만들어졌는데 Pod의 node selector나 자원 요구를 만족하는 node가 zone B에만 있으면 Pod는 배치될 곳이 없어 Pending에 머문다.

### WaitForFirstConsumer의 동작

Pod가 생기면 scheduler가 Pod의 제약을 함께 보고 PV를 고르거나 만든다. 공식 문서가 드는 제약은 resource 요구, node selector, Pod affinity와 anti-affinity, taint와 toleration이다(이것에 한정되지 않는다).

```text
PVC 생성 ─▶ Pending (아직 binding 안 함)
Pod 생성 ─▶ scheduler가 node 선택(Pod 제약 + 저장소 topology)
        ─▶ 그 node에서 쓸 수 있는 PV를 binding 또는 provisioning
        ─▶ PVC Bound, Pod 시작
```

이 모드에서는 Pod가 생기기 전까지 PVC가 Pending인 것이 정상이다. 장애로 오인하지 않도록 `kubectl describe pvc`의 event로 첫 consumer를 기다리는 중인지 확인한다(적용 제안).

## 지원 범위 (Kubernetes v1.37 문서 기준)

- **동적 provisioning과 함께**: CSI volume. 해당 CSI driver가 지원하는 경우에 한한다.
- **미리 만든 PV binding과 함께**: CSI volume(driver가 지원하는 경우)과 `local` volume.
- **local volume**: 동적 provisioning을 지원하지 않는다. 그래도 `kubernetes.io/no-provisioner` provisioner와 `WaitForFirstConsumer`로 StorageClass를 만들어, Pod가 적절한 node에 배치될 때까지 binding을 미루라고 권한다. 미루면 scheduler가 PV를 고를 때 Pod의 모든 scheduling 제약을 고려할 수 있다.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
```

## 함정

- **`nodeName`과 함께 쓰지 않는다.** `WaitForFirstConsumer`에서 Pod spec의 `nodeName`으로 node를 고르면 scheduler를 우회하므로 PVC가 계속 Pending에 남는다. 특정 node가 필요하면 `nodeSelector`에 `kubernetes.io/hostname`을 쓴다.
- **`allowedTopologies`는 대개 필요 없다.** `WaitForFirstConsumer`이면 provisioning을 특정 topology로 제한할 필요가 대부분 사라진다. 그래도 제한해야 하면 `allowedTopologies`로 zone을 지정하며, 지원 plugin의 `zone`, `zones` parameter를 대체한다.
- **binding 뒤에는 PV의 node affinity가 배치를 제한한다.** PV를 쓰는 Pod는 그 PV의 node affinity가 고른 node에만 배치된다. 기본 설정에서 이 값은 바뀌지 않으므로 zone에 묶인 volume을 쓰는 Pod는 재생성돼도 그 zone으로만 간다. 예외로 v1.35 alpha이고 기본으로 꺼진 `MutablePVNodeAffinity` feature gate를 켜면 PV의 `.spec.nodeAffinity`를 바꿀 수 있다. binding 모드는 처음 위치를 정하는 시점만 바꾸므로, 이미 묶인 뒤 그 zone의 node가 부족해지는 문제는 따로 다룬다(추론).

## 장애 진단

| 증상 | 확인점 |
|---|---|
| PVC가 Pending이고 Pod가 없음 | `WaitForFirstConsumer`이면 정상. Pod를 만들었는지 확인 |
| Pod와 PVC가 모두 Pending | `nodeName` 사용 여부, Pod 제약을 만족하는 node가 저장소 topology 안에 있는지 |
| `Immediate`에서 Pod만 Pending | PV가 만들어진 zone과 Pod가 갈 수 있는 node의 zone 비교 |

## 면접 체크포인트

- `Immediate`가 topology 제약이 있는 저장소에서 Pod를 배치 불가능하게 만드는 순서를 설명할 수 있는가
- `WaitForFirstConsumer`에서 `nodeName` 대신 `nodeSelector`를 써야 하는 이유를 scheduler 우회로 설명할 수 있는가
- local volume에 provisioner가 없어도 StorageClass를 만드는 이유를 말할 수 있는가

## 출처

- [Kubernetes Docs, Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/) — Volume binding mode, Allowed topologies, Local 절. 2026-11-17 kubernetes/website 원본과 대조
- [Kubernetes Docs, Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [CKA Full Course Storage, Lecture 13 volume binding Mode — YouTube, NeoKloud](https://www.youtube.com/watch?v=Wkem4I7_ib4)

## 관련 문서

- [[K8s-Configuration-Storage-and-Probes|Configuration, storage와 probe]]
- [[K8s-CKA-Operations-Practice|CKA 운영 실습]]
