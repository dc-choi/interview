---
tags: [infrastructure, kubernetes, index]
status: index
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes", "K8s"]
---

# Kubernetes

workload와 Service, 설정과 storage, traffic 진입과 배포, 리소스 적정화 — Kubernetes 운영의 기본 축.

## 목차
- [x] [[K8s-CKA-Operations-Practice|CKA 운영 실습 (공식 범위, 약점 lab과 모의 과제, host/context 확인, 결과 검증과 허용 자료)]]
- [x] [[K8s-Core-Workloads-and-Service-Architecture|Control plane과 node component (API server, etcd, scheduler, kubelet, kube-proxy, apply에서 Running까지, cluster DNS와 ndots, VPC DNS 한도, 버전 skew와 in-place, blue/green 업그레이드)]]
- [x] [[K8s-Core-Workloads-and-Service|Core workload와 Service (Pod, Deployment, RollingUpdate와 Recreate, selector 불일치, EndpointSlice, Namespace)]]
- [x] [[K8s-Configuration-Storage-and-Probes|Configuration, storage와 probe (ConfigMap 소비 형태, Secret, PV/PVC, probe 판정과 감지 시간, QoS와 eviction)]]
- [x] [[K8s-Traffic-Entry-Helm-and-GitOps|Traffic entry, Helm과 GitOps (Ingress pathType과 rewrite, Ingress와 HTTPRoute의 match 범위, ingress-nginx 은퇴, Gateway API, Argo CD)]]
- [x] [[K8s-Resource-Right-Sizing|Resource Right-Sizing (기준 수립, PromQL, 컴포넌트 차등, Karpenter 노드 통합과 중단 제약, Spot 중단 대응과 인스턴스 범위, 예비 용량)]]
- [x] [[K8s-HPA-VPA|HPA와 VPA (스케일 기준, 요청값과 관측값, 충돌 회피)]]
- [x] [[K8s-PDB|PodDisruptionBudget (자발적 중단 가용성, drain과 롤링 업데이트)]]
- [x] [[K8s-NetworkPolicy|NetworkPolicy (방향별 격리와 합집합 허용, selector AND와 OR, default deny와 DNS egress, CNI 집행 구성과 kube-proxy 대체의 구분, 검증 절차)]]
- [x] [[K8s-Falco-Runtime-Security|Falco 런타임 보안 (설치 방식, modern eBPF와 kmod 드라이버, 호스트 설치와 서비스 확인, 시험 경보, 규칙 파일과 CKS 허용 자료)]]
- [x] [[K8s-AI-Workloads|AI 워크로드 (ai-workloads/ 서브폴더): Run:ai와 KAI Scheduler의 GPU 공유와 팀별 할당, Agent Substrate의 에이전트 스냅샷 재개와 sandbox 격리]]

## 관련 문서
- [[tech/infrastructure-cloud/인프라&클라우드(Infrastructure&Cloud)|인프라&클라우드]] — 상위 카테고리 인덱스
