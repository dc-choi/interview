---
tags: [kubernetes, pod, deployment, service, namespace, orchestration]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes Core Workloads", "K8s Pod Deployment Service"]
verified_at: 2026-08-04
---

# Kubernetes core workload와 Service

Kubernetes의 핵심은 container 실행 명령을 여러 서버에 대신 내리는 것이 아니라 API에 기록된 desired state와 실제 상태의 차이를 controller가 계속 줄이는 reconciliation model이다. 자동 복구, rollout과 scaling은 이 control loop 위에서 동작한다.

## object를 읽는 공통 문법

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  labels:
    app.kubernetes.io/name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: registry.example/api@sha256:...
```

- `apiVersion`과 `kind`가 schema와 resource type을 정한다.
- `metadata`는 identity, label과 annotation을 담는다. label은 selector와 policy에 쓰고 annotation은 비식별 metadata에 쓴다.
- `spec`은 사용자가 원하는 상태다. `status`는 controller가 관측한 현재 상태다.
- YAML은 전송 형식일 뿐 선언성의 원인이 아니다. API server에 저장된 desired state와 controller가 선언적 동작을 만든다.
- `kubectl apply` 전에 server-side dry run, schema validation과 diff를 수행한다. live object를 직접 편집해 Git의 desired state와 갈라지게 하지 않는다.

## Pod는 공동 실행 문맥이다

Pod는 Kubernetes가 schedule하는 최소 단위다. 같은 Pod의 container는 network namespace와 IP/port 공간을 공유하고 선언된 volume을 함께 mount할 수 있다.

- 서로 강하게 결합되어 같은 node와 lifecycle을 가져야 하는 container만 한 Pod에 둔다.
- Pod IP와 Pod instance는 일시적이다. process가 죽으면 kubelet이 container를 재시작할 수 있고, Pod가 교체되면 새 UID와 IP를 받는다.
- production application을 bare Pod로 운영하지 않는다. Deployment, StatefulSet, DaemonSet, Job처럼 목적에 맞는 controller가 Pod를 소유하게 한다.
- container가 둘이라고 자동으로 sidecar가 되는 것은 아니다. 책임, startup/termination ordering과 resource budget을 명시한다.

## Deployment와 rollout

Deployment는 ReplicaSet을 통해 stateless Pod replica와 rollout을 관리한다.

```text
Deployment desired template
  -> ReplicaSet revision
  -> Pod replicas
  -> readiness를 통과한 endpoint만 Service에 참여
```

- replica가 사라지면 controller가 새 Pod를 만든다. 같은 Pod를 치료하거나 application data를 복구하는 것은 아니다.
- RollingUpdate의 `maxSurge`와 `maxUnavailable`은 capacity, rollout 속도와 자원 여유의 교환이다.
- rollout 완료는 새 Pod 수만 맞는 것이 아니라 `progressDeadlineSeconds`, readiness와 application SLO로 판정한다.
- `kubectl rollout undo`는 Deployment revision을 되돌리지만 database migration, ConfigMap과 외부 dependency를 함께 되돌리지 않는다.
- mutable image tag는 같은 manifest가 다른 content를 실행하게 한다. release는 digest로 고정한다.

상태 identity, 순서와 안정된 storage가 필요하면 StatefulSet, node마다 하나면 DaemonSet, 완료되는 작업이면 Job/CronJob을 검토한다.

## Service는 변하는 Pod 앞의 안정된 발견 계약이다

Service selector가 일치하는 Pod를 EndpointSlice로 묶고 안정된 DNS 이름과 virtual IP를 제공한다. Service가 application-level 요청 의미를 이해하는 것은 아니며 일반적인 Service load balancing은 L4 연결 단위다.

| type | 범위 | 주의점 |
|---|---|---|
| ClusterIP | cluster 내부 virtual IP | 기본값, 외부에서는 직접 접근하지 않음 |
| NodePort | 각 node port로 노출 | 운영 진입점보다는 구현 기반으로 쓰이는 경우가 많음 |
| LoadBalancer | cloud/external LB 연동 | controller와 provider가 실제 LB를 만들어야 함 |
| ExternalName | DNS CNAME 반환 | proxy나 endpoint health check가 아님 |
| headless | `clusterIP: None`, endpoint DNS | client-side discovery와 StatefulSet에 활용 |

`port`는 Service가 받는 port, `targetPort`는 Pod로 전달할 port다. selector가 잘못되거나 Pod가 ready가 아니면 Service object는 있어도 endpoint가 비어 있다.

## Namespace의 실제 경계

Namespace는 namespaced object의 이름 범위와 관리 단위다. DNS에서 다른 namespace의 Service는 `service.namespace.svc`처럼 구분한다. Namespace만 만들었다고 보안이나 비용이 자동 격리되지는 않는다.

- RBAC으로 API 접근을 나눈다.
- NetworkPolicy와 이를 구현하는 CNI로 traffic을 제한한다.
- ResourceQuota와 LimitRange로 자원 사용 정책을 둔다.
- cluster-scoped resource, CRD와 node는 Namespace 밖에 있다.

환경을 Namespace로만 분리할지 cluster까지 나눌지는 blast radius, 규제, upgrade 독립성과 운영 비용으로 결정한다.

## 진단 순서

```bash
kubectl get deploy,rs,pod,svc,endpointslice -n NAMESPACE
kubectl describe pod POD -n NAMESPACE
kubectl logs POD -c CONTAINER --previous -n NAMESPACE
kubectl rollout status deploy/NAME -n NAMESPACE
kubectl get events -n NAMESPACE --sort-by=.lastTimestamp
```

1. Deployment condition과 rollout revision을 본다.
2. Pending이면 scheduler event, request와 node constraint를 본다.
3. CrashLoop이면 current/previous log와 probe를 본다.
4. Service 장애면 selector, Pod label, readiness와 EndpointSlice를 잇는다.
5. DNS, NetworkPolicy와 CNI 경로를 그 다음에 확인한다.

## 출처

- [Kubernetes Docs, Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Kubernetes Docs, Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes Docs, Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Kubernetes와 선언적 관리](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=409161)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Pod](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=409163)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Deployment](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=409164)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Service](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=410220)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Namespace](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=410222)

## 관련 문서

- [[K8s-Configuration-Storage-and-Probes|Kubernetes configuration, storage와 probe]]
- [[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes traffic entry, Helm과 GitOps]]
- [[K8s-Resource-Right-Sizing|Kubernetes resource right-sizing]]
- [[EKS|Amazon EKS]]
