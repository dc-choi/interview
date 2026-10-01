---
tags: [kubernetes, configmap, secret, persistent-volume, probe, resources]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes Configuration Storage Probes", "K8s ConfigMap PV PVC Probe"]
verified_at: 2026-09-30
---

# Kubernetes configuration, storage와 probe

Pod 교체가 일상인 환경에서는 설정, 상태와 health contract를 image나 특정 Pod 수명에 묶지 않는다. ConfigMap/Secret, volume claim과 probe는 각각 다른 문제를 해결하며 서로 대신할 수 없다.

## ConfigMap과 Secret

| resource | 담을 것 | 보안 경계 |
|---|---|---|
| ConfigMap | 비기밀 설정, 작은 config file | 읽기 권한이 있는 주체에게 평문 노출 가능 |
| Secret | credential, key, token | base64는 암호화가 아니며 RBAC/at-rest encryption이 별도로 필요 |

설정을 image 밖에 두면 같은 image를 여러 환경에서 쓰고 설정을 바꿀 때 image를 다시 build하지 않는다. 소비 형태는 app이 설정을 읽는 방식으로 고른다.

| 형태 | mapping | 맞는 경우 |
|---|---|---|
| `env[].valueFrom.configMapKeyRef` | 고른 key 하나를 지정한 이름의 환경 변수로 | 일부 key만 쓰거나 app 변수명과 key 이름이 다를 때 |
| `envFrom[].configMapRef` | 모든 key를 환경 변수로. `prefix`로 이름 충돌 완화 | key가 많고 이름이 그대로 맞을 때 |
| `volumes[].configMap` + `volumeMounts` | key마다 mountPath 아래 같은 이름의 파일. `items`로 일부만 | `nginx.conf`, `application.yaml`처럼 파일을 읽는 app |

- 같은 이름이 여러 source에 있으면 `env`가 `envFrom`보다 우선하고, `envFrom` 사이에서는 뒤에 적은 source가 이긴다.
- 참조한 ConfigMap이나 key가 없으면 `optional: true`가 아닌 한 container가 시작하지 못한다.
- kubelet 1.29까지는 환경 변수 이름으로 쓸 수 없는 `envFrom` key를 건너뛰고 InvalidEnvironmentVariableNames event를 남겼지만 1.30부터 이 검사가 빠졌고, 1.34에서 이름 검증 완화가 GA가 되어 `=`를 뺀 출력 가능한 ASCII 이름이 허용된다. 숫자로 시작하거나 `.`, `-`가 든 key도 그대로 환경 변수가 되므로 app과 shell이 그 이름을 읽을 수 있는지 확인한다. 공식 task 문서에는 건너뛴다는 예전 설명이 남아 있다.
- `envFrom`은 ConfigMap에 key를 추가하는 것만으로 다음 시작부터 container 환경을 바꾼다. review 범위를 ConfigMap diff까지 넓힌다.

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

HTTP, TCP, exec와 gRPC probe를 사용할 수 있다. 성공 응답만 만드는 endpoint보다 실제 lifecycle contract를 표현해야 한다. process가 떠 있다는 사실만으로는 DB 연결이 끊긴 web server나 memory leak으로 응답하지 못하는 app을 잡지 못한다.

| handler | 성공 판정 | 쓰임과 함정 |
|---|---|---|
| `httpGet` | status 200 이상 400 미만 | web app. 3xx도 성공이다. kubelet은 같은 host로의 redirect만 따라가고, 다른 host로 redirect하면 따라가지 않은 채 성공으로 처리하며 ProbeWarning event를 남긴다. 인증 middleware가 health path를 외부 로그인 host로 보내면 app이 망가져도 성공할 수 있으므로 health path는 인증과 redirect 없이 판정한다 |
| `tcpSocket` | 지정 port에 TCP 연결 성립 | DB, Redis, MQ처럼 HTTP가 아닌 서버. listen만 하고 query를 처리하지 못하는 상태(복구 중, 복제 지연)는 잡지 못한다 |
| `exec` | container 안 명령의 종료 코드 0 | 파일 존재 확인이나 custom script. image에 실행할 shell과 도구가 있어야 한다 |
| `grpc` | gRPC Health Checking Protocol 응답 | gRPC 서버. Kubernetes 1.27부터 stable |

### 감지 시간 계산

기본값은 `initialDelaySeconds` 0, `periodSeconds` 10, `timeoutSeconds` 1, `successThreshold` 1(liveness와 startup은 1만 허용), `failureThreshold` 3이다(Kubernetes 1.37 문서 기준).

- liveness는 연속 `failureThreshold`번 실패하면 container를 재시작한다. 장애 시작부터 연속 실패 판정과 재시작 트리거까지 대략 (failureThreshold - 1) × periodSeconds에서 failureThreshold × periodSeconds 사이이고, probe가 응답 없이 걸리면 timeoutSeconds가 더해진다(계산 추정). 기본값이면 약 20~30초, period 3초와 threshold 3이면 약 6~9초다. 이는 재시작 완료 시간이 아니다. 실제 서비스 복구에는 종료 유예(`terminationGracePeriodSeconds`), 재시작 backoff, 기동과 readiness 통과 시간이 추가된다.
- readiness 실패는 container를 재시작하지 않고 Ready를 false로 바꿔 Service endpoint에서 뺀다. traffic이 실제로 끊기기까지는 같은 감지 시간에 EndpointSlice와 proxy 규칙 전파가 더해진다(추론).
- startup의 허용 시간은 failureThreshold × periodSeconds다. 공식 예시는 30 × 10 = 300초다. 성공 전에는 liveness와 readiness가 돌지 않고, 한 번 성공하면 liveness가 교착 감지를 넘겨받으며, 끝내 실패하면 그 시간 뒤 container를 죽이고 restartPolicy를 따른다.
- 실습으로 확인할 때는 exec liveness의 대상 파일을 지워 `kubectl describe pod`의 Unhealthy, Killing event와 RESTARTS 증가를 보고, readiness 대상 응답을 실패시켜(예: nginx 기본 페이지를 지워 403) restart 없이 endpoint에서만 빠지는지 본다.

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

### QoS class와 OOMKilled, eviction

| QoS | 조건 | 압박 시 |
|---|---|---|
| Guaranteed | 모든 container가 CPU와 memory의 request와 limit을 갖고 두 값이 같음 | 사용량이 request 안이면 축출 마지막 순위, node OOM 때 `oom_score_adj` -997 |
| Burstable | Guaranteed는 아니지만 CPU나 memory의 request 또는 limit이 하나라도 있음 | limit이 없으면 node capacity까지 쓸 수 있음. `oom_score_adj`는 memory request 비율로 2~999 |
| BestEffort | 어떤 container에도 CPU, memory의 request와 limit이 없음 | node 압박 때 먼저 축출 후보, `oom_score_adj` 1000 |

- limit만 쓰고 request를 생략하면 admission이 기본값을 넣지 않는 한 request가 limit 값으로 복사되어 의도치 않게 Guaranteed가 될 수 있다. class는 Pod 생성 때 정해지고, class가 바뀌는 in-place resize는 admission이 거부한다.
- kubelet의 node-pressure eviction은 class 이름이 아니라 (1) 사용량이 request를 넘는지, (2) Pod priority, (3) request 대비 사용량 순으로 정렬한다. 공식 문서도 QoS는 가능성 높은 축출 순서를 추정하는 데 쓰라고 하며, ephemeral storage 압박(DiskPressure)에는 이 추정이 맞지 않는다.
- OOMKilled와 eviction은 다른 사건이다. container가 자기 memory limit을 넘으면 cgroup OOM으로 그 container만 죽고 restartPolicy에 따라 같은 Pod에서 재시작된다(`Last State: Terminated`, `Reason: OOMKilled`). node 전체가 압박이면 kubelet이 Pod를 축출해 모든 container가 끝나고 controller가 대체 Pod를 다른 node에 만들 수 있다. kubelet이 회수하기 전에 node OOM이 나면 kernel OOM killer가 `oom_score_adj`를 반영해 고른다.
- 반복 종료는 CrashLoopBackOff로 보이고 재시작 지연은 10s, 20s, 40s처럼 늘어 300s에서 멈추며, 10분 정상 실행하면 초기화된다. 1.33 alpha(`ReduceDefaultCrashLoopBackOffDecay`)와 1.35 beta(`KubeletCrashLoopBackOffMax`, node별 상한) 기능이 이 값을 바꿀 수 있다.
- 중요 Pod를 Guaranteed로 두라는 권고에는 비용이 있다. CPU limit도 request와 같아야 하므로 burst 구간에서 throttling을 부를 수 있다. memory만 request와 limit을 같게 두고 CPU는 request만 두면 Burstable이지만 OOM 예측성과 throttling 회피를 함께 얻을 수 있다. 축출 보호는 실제 사용량이 request 안에 있는지와 PriorityClass가 좌우하므로 request를 측정값으로 맞춘다.
- 단위: CPU는 core 단위라 `100m`이 0.1 core다. `M`은 10^6 배수라 `cpu: 100M`은 1억 core 요청이 되어 어떤 node에도 배치되지 않는다. memory는 `Mi`(2^20)와 `M`(10^6)이 다르고, 소문자 `m`은 milli라 `400m` memory는 0.4 byte 요청이다.

## 장애 진단

| 증상 | 확인점 |
|---|---|
| 설정 변경이 반영되지 않음 | env vs volume, `subPath`, reload/restart contract |
| PVC가 Pending | StorageClass, provisioner, capacity, topology와 access mode |
| Pod는 Running이나 traffic 없음 | readiness event와 EndpointSlice |
| 반복 restart | liveness failure, OOMKilled, exit code와 previous log |
| CPU가 낮아 보이는데 latency 증가 | CPU throttling, request 경합과 probe timeout |
| Pod가 Failed, reason `Evicted` | node 압박 축출. request 초과 사용, priority와 node condition |
| probe는 성공인데 app 장애 | 다른 host로의 redirect(ProbeWarning event), 연결만 확인하는 TCP probe |

## 출처

- [Kubernetes Docs, ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes Docs, Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes Docs, Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes Docs, probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes Docs, resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Docs, configure liveness, readiness and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes Docs, Pod Quality of Service classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Kubernetes Docs, node-pressure eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes Docs, Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes Docs, configure a Pod to use a ConfigMap](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/)
- [Kubernetes API Reference, Pod v1](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/)
- [Kubernetes Docs, feature gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [kubelet envFrom 처리, release-1.29 — kubernetes/kubernetes](https://github.com/kubernetes/kubernetes/blob/release-1.29/pkg/kubelet/kubelet_pods.go)
- [kubelet envFrom 처리, release-1.30 — kubernetes/kubernetes](https://github.com/kubernetes/kubernetes/blob/release-1.30/pkg/kubelet/kubelet_pods.go)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, ConfigMap](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=410223)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, PV와 PVC](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=411212)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, probe](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=411213)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, CPU와 memory resource](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=411214)

## 관련 문서

- [[K8s-Core-Workloads-and-Service|Kubernetes core workload와 Service]]
- [[Container-Memory-Metrics|Container memory metrics]]
- [[Graceful-Shutdown|Graceful shutdown]]
