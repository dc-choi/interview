---
tags: [kubernetes, configmap, secret, persistent-volume, probe, resources]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes Configuration Storage Probes", "K8s ConfigMap PV PVC Probe"]
verified_at: 2026-08-04
---

# Kubernetes configuration, storage와 probe

Pod 교체가 일상인 환경에서는 설정, 상태와 health contract를 image나 특정 Pod 수명에 묶지 않는다. ConfigMap/Secret, volume claim과 probe는 각각 다른 문제를 해결하며 서로 대신할 수 없다.

## ConfigMap과 Secret

| resource | 담을 것 | 보안 경계 |
|---|---|---|
| ConfigMap | 비기밀 설정, 작은 config file | 읽기 권한이 있는 주체에게 평문 노출 가능 |
| Secret | credential, key, token | base64는 암호화가 아니며 RBAC/at-rest encryption이 별도로 필요 |

주입 방식은 시작 시점과 갱신 계약이 다르다.

- environment variable로 주입한 값은 container 시작 시 고정된다. 변경 후 rollout/restart가 필요하다.
- volume projection은 kubelet이 변경을 eventually 반영할 수 있지만 application이 file reload를 지원해야 한다.
- `subPath`로 mount한 ConfigMap/Secret file은 자동 update를 받지 않는다.
- immutable config는 실수로 live object를 바꾸는 것을 막고 watch 부하를 줄이지만 새 이름/version과 rollout 절차가 필요하다.

설정 변경도 release다. config content hash를 Pod template annotation에 넣어 새 ReplicaSet을 만들고, validation과 rollback 가능한 version을 남긴다. Secret은 Git 평문과 ConfigMap에 넣지 않고 external secret manager, encryption과 workload identity를 결합한다. [[Secret-Management]]

## Pod volume에서 persistent storage까지

| 선택 | lifecycle/배치 | 적합 |
|---|---|---|
| container writable layer | container와 함께 사라질 수 있음 | 임시 scratch만 |
| `emptyDir` | Pod가 존재하는 동안 유지, 같은 Pod container가 공유 | cache, 임시 파일, sidecar 교환 |
| `hostPath` | 특정 node path에 결합 | 제한된 node agent나 local 실습, 일반 app DB에는 부적합 |
| PV/PVC | Pod와 독립된 storage resource/claim | database data, durable state |

PV는 cluster storage resource이고 PVC는 namespaced storage 요청이다. StorageClass와 CSI provisioner가 PVC를 보고 volume을 동적으로 만들 수 있다.

- access mode는 backend capability와 attach topology를 함께 확인한다. 이름만 보고 모든 storage driver가 동일한 강제 의미를 제공한다고 가정하지 않는다.
- volume binding, node/AZ affinity와 scheduler가 맞지 않으면 Pod가 Pending에 머문다.
- reclaim policy `Delete`와 `Retain`은 PVC 삭제 뒤 PV/backend 처리에 영향을 준다.
- PV가 있다고 backup이 생기는 것은 아니다. application-consistent snapshot, restore drill과 retention을 별도로 설계한다.
- 여러 Pod가 같은 filesystem을 mount할 수 있다는 것과 application data가 동시 쓰기에 안전하다는 것은 별개다.

## 세 probe의 계약

| probe | 질문 | 실패 효과 |
|---|---|---|
| startup | initialization을 끝냈는가 | 성공 전 liveness/readiness를 지연시켜 느린 시작을 보호 |
| readiness | 지금 새 traffic을 받아도 되는가 | Pod를 Service endpoint에서 제외, container는 계속 실행 |
| liveness | restart만이 회복 수단인 dead state인가 | kubelet이 container restart |

HTTP, TCP, exec와 gRPC probe를 사용할 수 있다. 성공 응답만 만드는 endpoint보다 실제 lifecycle contract를 표현해야 한다.

### 안전한 설계

- liveness에 database, 외부 API 같은 공유 dependency를 넣지 않는다. dependency 장애가 모든 Pod restart 폭풍으로 번질 수 있다.
- readiness는 startup 완료, local queue saturation이나 serving capability처럼 traffic 수신 가능성을 판정한다.
- 긴 시작 시간을 큰 `initialDelaySeconds` 하나로 숨기기보다 startup probe의 failure budget으로 모델링한다.
- probe timeout/period/failureThreshold를 실제 GC pause, cold start와 장애 감지 목표로 정한다.
- shutdown에서는 readiness를 먼저 내리고 endpoint propagation, in-flight drain과 `terminationGracePeriodSeconds`를 맞춘다.
- probe 성공은 end-to-end SLO, mesh control plane 연결과 business transaction 성공을 보장하지 않는다.

## request, limit과 QoS

`requests`는 scheduler의 배치 기준이고 CPU 경합 시 상대적 share에 관여한다. `limits`는 runtime 상한으로 CPU throttling과 memory OOM에 연결된다. QoS class는 설정 조합에서 파생되지만 class 이름만으로 안전성이 결정되지는 않는다.

- request/limit을 임의의 동일 숫자로 복사하지 않는다.
- startup peak, steady state, burst와 stateful recovery를 측정한다.
- Namespace 기본값은 LimitRange, 총량은 ResourceQuota로 guardrail을 둔다.
- 실제 산정과 PromQL은 [[K8s-Resource-Right-Sizing]].

## 장애 진단

| 증상 | 확인점 |
|---|---|
| 설정 변경이 반영되지 않음 | env vs volume, `subPath`, reload/restart contract |
| PVC가 Pending | StorageClass, provisioner, capacity, topology와 access mode |
| Pod는 Running이나 traffic 없음 | readiness event와 EndpointSlice |
| 반복 restart | liveness failure, OOMKilled, exit code와 previous log |
| CPU가 낮아 보이는데 latency 증가 | CPU throttling, request 경합과 probe timeout |

## 출처

- [Kubernetes Docs, ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes Docs, Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes Docs, Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes Docs, probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes Docs, resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, ConfigMap](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=410223)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, PV와 PVC](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=411212)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, probe](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=411213)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, CPU와 memory resource](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=411214)

## 관련 문서

- [[K8s-Core-Workloads-and-Service|Kubernetes core workload와 Service]]
- [[Container-Memory-Metrics|Container memory metrics]]
- [[Graceful-Shutdown|Graceful shutdown]]
