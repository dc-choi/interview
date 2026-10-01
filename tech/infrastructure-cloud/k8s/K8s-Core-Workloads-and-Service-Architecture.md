---
tags: [kubernetes, control-plane, kube-apiserver, etcd, scheduler, kubelet, kube-proxy, cri]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes Architecture", "K8s control plane과 node component", "kubectl apply에서 Running까지"]
verified_at: 2026-09-30
---

# Kubernetes control plane과 node component

container 하나는 Docker로 쉽게 띄우지만 서비스는 수십에서 수백 개 container를 여러 서버에서 운영한다. 수동 운영에서는 사람이 장애 container 재시작, traffic 급증 때 증설, 중단 없는 version 교체와 흩어진 container 관리를 맡는다. Kubernetes는 원하는 상태를 선언받아 self-healing(선언한 replica 수 유지), autoscaling, Service load balancing과 rolling update로 이 일을 control loop에 넘긴다. object 문법과 workload, Service는 [[K8s-Core-Workloads-and-Service]]가 다룬다.

## 구성 요소

| 위치 | component | 하는 일 |
|---|---|---|
| control plane | kube-apiserver | Kubernetes HTTP API를 노출하는 control plane의 front end. 인증, 인가, admission과 validation을 거쳐 object를 저장하고 다른 component는 모두 API server를 통해 상태를 읽고 쓴다 |
| control plane | etcd | cluster data 전체를 담는 일관성 있는 고가용 key-value store. 직접 읽고 쓰는 주체는 API server다 |
| control plane | kube-scheduler | node가 정해지지 않은 새 Pod를 watch해 filtering과 scoring으로 node를 고르고 binding으로 API server에 알린다 |
| control plane | kube-controller-manager | Deployment, ReplicaSet, Node 같은 controller를 실행해 desired와 actual 상태의 차이를 줄인다 |
| node | kubelet | 자기 node에 배정된 Pod의 container가 실행되도록 CRI runtime을 호출하고 상태와 probe 결과를 보고한다 |
| node | kube-proxy(선택) | Service와 EndpointSlice를 watch해 Service IP로 오는 traffic을 endpoint로 보내는 node 규칙을 프로그래밍한다 |
| node | container runtime | containerd, CRI-O 같은 CRI 구현체가 container를 만들고 지운다 |

## kubectl apply에서 Running까지

```text
kubectl apply (Deployment)
  -> API server: 인증, 인가, admission, validation 뒤 etcd에 저장
  -> Deployment controller: ReplicaSet 생성
  -> ReplicaSet controller: node가 비어 있는 Pod object 생성
  -> scheduler: node 선택, binding으로 spec.nodeName 기록
  -> 그 node의 kubelet: image pull, CNI와 volume 준비, CRI로 container 시작
  -> kubelet: Pod status와 readiness 보고 -> EndpointSlice 갱신
```

- component는 API server에서 명령을 push받는 구조가 아니라 API server를 watch하며 자기 담당 변화에 반응한다. 모든 변경이 API server를 거치므로 감사, 권한과 admission을 한곳에서 건다.
- Deployment를 apply하면 scheduler보다 먼저 Deployment controller와 ReplicaSet controller가 ReplicaSet과 Pod object를 만든다. 이 단계를 빼고 이해하면 ReplicaSet은 있는데 Pod가 없는 장애를 설명하지 못한다.
- kube-proxy는 요청마다 판단하는 proxy가 아니라 규칙을 프로그래밍하는 controller에 가깝다. mode는 iptables, nftables, ipvs(이상 Linux)와 kernelspace(Windows)다. ipvs는 1.35에서 deprecated되어 1.40부터 기본 비활성, 1.43에 제거 예정이고 nftables가 대체로 권장된다(Kubernetes 1.37 문서 기준). Service forwarding을 직접 구현하는 network plugin을 쓰면 kube-proxy 없이 운영할 수 있다.
- Kubernetes 1.24에서 dockershim이 제거되어 kubelet은 Docker Engine을 직접 쓰지 않는다. Docker Engine을 runtime으로 쓰려면 cri-dockerd adapter가 필요하고, `docker build`로 만든 image는 모든 CRI 구현에서 그대로 실행된다.
- etcd를 잃으면 cluster 상태가 사라지므로 etcd backup 계획이 필요하다. EKS는 Region 안 3개 AZ에 API server 2개 이상과 etcd 3개를 두고 AWS가 운영하므로, 관리형 control plane에서는 사용자 책임 범위를 provider 문서로 확인한다([[EKS]], [[Backup-Restore]]).

## 멈춘 단계로 담당 component를 좁힌다

| 증상 | 먼저 볼 곳 |
|---|---|
| apply가 거부됨 | API server validation, admission webhook과 policy |
| ReplicaSet은 있는데 Pod가 없음 | ReplicaSet event, ResourceQuota, admission |
| Pod가 Pending | scheduler event, request, affinity, taint와 PVC binding |
| ContainerCreating, ImagePullBackOff | kubelet event, image pull 권한, CNI, volume attach |
| Running인데 Service가 불통 | readiness, EndpointSlice, kube-proxy 또는 CNI 규칙 |

이 표는 흐름에서 끌어낸 범위 좁히기 규칙이다. 실제 원인은 `kubectl describe`와 event로 확인한다([[K8s-Core-Workloads-and-Service#진단 순서|진단 순서]]).

## 출처

- [Kubernetes Docs, cluster architecture](https://kubernetes.io/docs/concepts/architecture/)
- [Kubernetes Docs, Kubernetes components](https://kubernetes.io/docs/concepts/overview/components/)
- [Kubernetes Docs, Kubernetes scheduler](https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/)
- [Kubernetes Docs, Virtual IPs and service proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes Docs, migrating from dockershim](https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/)
- [Kubernetes Docs, container runtimes](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)
- [Updated: Dockershim Removal FAQ — Kubernetes Blog](https://kubernetes.io/blog/2022/02/17/dockershim-faq/)
- [Amazon EKS User Guide, Amazon EKS architecture](https://docs.aws.amazon.com/eks/latest/userguide/eks-architecture.html)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Kubernetes와 선언적 관리](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=409161)

## 관련 문서

- [[K8s-Core-Workloads-and-Service|Kubernetes core workload와 Service]]
- [[K8s-Configuration-Storage-and-Probes|Kubernetes configuration, storage와 probe]]
- [[EKS|Amazon EKS]]
- [[Graceful-Shutdown|Graceful shutdown]]
