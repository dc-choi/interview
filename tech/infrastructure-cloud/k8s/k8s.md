---
tags: [infrastructure, kubernetes, index]
status: index
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes", "K8s"]
---

# Kubernetes

workload와 Service, 설정과 storage, traffic 진입과 배포, 리소스 적정화 — Kubernetes 운영의 기본 축.

## 목차
- [x] [[K8s-Core-Workloads-and-Service-Architecture|Control plane과 node component (API server, etcd, scheduler, kubelet, kube-proxy, apply에서 Running까지)]]
- [x] [[K8s-Core-Workloads-and-Service|Core workload와 Service (Pod, Deployment, RollingUpdate와 Recreate, selector 불일치, EndpointSlice, Namespace)]]
- [x] [[K8s-Configuration-Storage-and-Probes|Configuration, storage와 probe (ConfigMap 소비 형태, Secret, PV/PVC, probe 판정과 감지 시간, QoS와 eviction)]]
- [x] [[K8s-Traffic-Entry-Helm-and-GitOps|Traffic entry, Helm과 GitOps (Ingress pathType과 rewrite, ingress-nginx 은퇴, Gateway API, Argo CD)]]
- [x] [[K8s-Resource-Right-Sizing|Resource Right-Sizing (기준 수립, PromQL 쿼리, 컴포넌트 차등과 롤백 기준)]]
- [x] [[K8s-HPA-VPA|HPA와 VPA (스케일 기준, 요청값과 관측값, 충돌 회피)]]
- [x] [[K8s-PDB|PodDisruptionBudget (자발적 중단 가용성, drain과 롤링 업데이트)]]
- [x] [[K8s-NetworkPolicy|NetworkPolicy (방향별 격리와 합집합 허용, selector AND와 OR, default deny와 DNS egress, CNI 집행 구성과 kube-proxy 대체의 구분, 검증 절차)]]

## 관련 문서
- [[tech/infrastructure-cloud/인프라&클라우드(Infrastructure&Cloud)|인프라&클라우드]] — 상위 카테고리 인덱스
