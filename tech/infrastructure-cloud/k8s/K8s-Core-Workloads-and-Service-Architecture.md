---
tags: [kubernetes, control-plane, kube-apiserver, etcd, scheduler, kubelet, kube-proxy, cri, coredns, dns, version-skew, cluster-upgrade]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes Architecture", "K8s control plane과 node component", "kubectl apply에서 Running까지", "Kubernetes cluster DNS", "CoreDNS와 ndots", "Kubernetes version skew", "Kubernetes cluster 업그레이드"]
verified_at: 2026-09-30
---

# Kubernetes control plane과 node component

container 하나는 Docker로 쉽게 띄우지만 서비스는 수십에서 수백 개 container를 여러 서버에서 운영한다. 수동 운영에서는 사람이 장애 container 재시작, traffic 급증 때 증설, 중단 없는 version 교체와 흩어진 container 관리를 맡는다. Kubernetes는 원하는 상태를 선언받아 self-healing(선언한 replica 수 유지), autoscaling, Service load balancing과 rolling update로 이 일을 control loop에 넘긴다. object 문법과 workload, Service는 [[K8s-Core-Workloads-and-Service]]가 다룬다. cluster DNS add-on의 이름 해석 경로와 component 버전 차이에 따른 업그레이드 경로도 이 문서에서 다룬다.

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

## Cluster DNS add-on과 이름 해석

2026-10-14 Kubernetes, CoreDNS, Amazon EKS와 Amazon VPC 문서 대조 기준. cluster DNS는 control plane이나 node component가 아닌 add-on이지만 Service 이름 해석이 모두 이곳을 지난다. kubelet이 Pod마다 `/etc/resolv.conf`를 구성하고 Pod는 `kube-dns` Service 뒤의 CoreDNS에 질의한다.

```text
Pod의 /etc/resolv.conf
  nameserver <kube-dns Service IP>
  search <namespace>.svc.cluster.local svc.cluster.local cluster.local
  options ndots:5
-> CoreDNS
     cluster domain(cluster.local): kubernetes plugin이 Service와 Pod 정보로 응답
     그 밖의 이름: forward plugin이 node의 /etc/resolv.conf에 있는 upstream으로 전달
-> upstream resolver (AmazonProvidedDNS를 쓰는 VPC는 169.254.169.253 또는 VPC 기본 IPv4 CIDR의 base+2 주소)
```

- `dnsPolicy`를 지정하지 않으면 `ClusterFirst`다. 이름이 `Default`인 정책은 기본값이 아니며 node의 이름 해석 설정을 그대로 물려받는다. hostNetwork Pod가 cluster DNS를 쓰려면 `ClusterFirstWithHostNet`을 명시한다.
- 기본 Corefile은 `forward . /etc/resolv.conf`와 `cache 30`을 둔다. `cache`의 숫자는 캐시 기간의 상한(초)이고 응답 TTL을 늘리지 않는다. CoreDNS Service 이름이 `kube-dns`인 것은 이전 kube-dns Service 이름에 기대던 workload와의 호환 때문이다.
- 특정 domain만 다른 nameserver로 보내는 stub domain은 Corefile에 별도 블록으로 둔다. 서비스와 저장소 주소를 IP 대신 이름으로 두면 환경별 DNS 설정만 바꿔 같은 코드와 설정 파일로 staging과 production을 운영할 수 있다(설계 제안).

```text
consul.local:53 {
    errors
    cache 30
    forward . 10.150.0.1
}
```

### search 확장과 ndots

- resolver는 점이 `ndots`보다 적은 이름에 search 목록의 접미사를 차례로 붙여 시도한다. resolv.conf(5)의 기본값은 1이지만 Kubernetes Pod는 `ndots:5`를 받는다. 같은 namespace의 짧은 Service 이름 `data`는 첫 search 항목을 붙인 `data.<namespace>.svc.cluster.local`로 바로 해석된다.
- 외부 이름 `api.example.com`(점 2개)은 `<namespace>.svc.cluster.local`, `svc.cluster.local`, `cluster.local`과 EKS node의 `<region>.compute.internal`을 붙인 이름을 먼저 질의한 뒤 원래 이름을 묻는다. 이 중 cluster domain 밖의 질의는 CoreDNS가 upstream으로 보낸다(위 Corefile 동작에서 도출).
- 외부 이름은 끝에 점을 붙인 FQDN(`api.example.com.`)으로 쓰거나 Pod `dnsConfig.options`의 `ndots`를 낮춰 불필요한 질의를 줄인다. EKS 모범 사례는 외부 서비스에 연결하는 workload에 `ndots` 2를 권하면서, 너무 낮추거나 이름이 충분히 구체적이지 않으면 조회가 실패할 수 있으니 시험하라고 한다. `dnsConfig.options`는 dnsPolicy가 만든 옵션과 병합되므로 적용 결과는 Pod 안의 `/etc/resolv.conf`로 확인한다.

### upstream 한도: AWS link-local 1024 PPS

- Amazon DNS server(Route 53 Resolver)를 포함한 link-local 주소 서비스에는 초당 1024 패킷 한도가 있다. Resolver DNS 질의, IMDS, Amazon Time Sync NTP와 Windows 라이선스 요청이 합산되고 이 quota는 늘릴 수 없으며, 한도에 닿으면 Resolver가 트래픽을 거부한다.
- EKS 모범 사례는 이 DNS throttling이 ENI 단위로 걸린다고 설명한다. CoreDNS replica가 적거나 한 node에 몰리면 cluster의 외부 이름 질의가 소수 ENI에 집중된다. EKS의 CoreDNS Deployment는 replica를 서로 다른 worker node에 배치하려는 anti-affinity를 둔다.
- 증상은 간헐적인 이름 해석 실패(예: Java의 `UnknownHostException`)다. throttling으로 버려진 질의는 Resolver query log에 나타나지 않고 VPC Flow Logs는 Amazon DNS server와의 트래픽을 기록하지 않으므로 node의 ENA 지표 `linklocal_allowance_exceeded`로 확인한다([[EC2-Network-Access|EC2 네트워크와 접근]]).
- 대응은 질의 수를 줄이는 방법(FQDN과 `ndots` 조정)과 응답 지점을 늘리는 방법으로 나뉜다.
  - cluster proportional autoscaler나 EKS CoreDNS add-on의 autoscaling은 node 수와 CPU core 수로 replica를 정한다. EKS 설명 기준 기본 비율은 16 node 또는 256 core마다 하나이고 add-on은 두 계산 중 큰 값을 쓴다. 질의량과 직접 비례하지는 않는다.
  - NodeLocal DNSCache(Kubernetes v1.18부터 stable)는 node마다 DaemonSet caching agent를 둔다. Pod 질의가 kube-proxy DNAT와 conntrack을 거치지 않아 conntrack race와 UDP 항목 누적을 줄이고, cluster 이름의 cache miss는 CoreDNS Service로 보낸다. agent와 CoreDNS 사이 연결은 TCP로 올릴 수 있다.
  - node-local-dns container가 memory limit 때문에 OOMKilled되면 시작 때 넣은 packet filtering 규칙이 정리되지 않는다. DaemonSet이 container를 다시 띄우지만 실패할 때마다 남은 규칙이 질의를 비정상 Pod로 보내 DNS가 잠시 끊긴다. limit은 limit 없이 측정한 peak 사용량이나 VPA recommender 권고로 정한다.
  - CoreDNS를 줄이거나 교체할 때 node의 iptables 규칙 갱신이 cluster 크기에 따라 1~10초 걸려 종료된 Pod로 질의가 갈 수 있다. EKS 모범 사례는 lameduck 30초와 readiness probe `/ready`를 권한다.

### 사례: 적은 DNS Pod와 외부 LB 이름이 겹친 장애

2019년 공개된 국내 OTT 서비스의 kops 기반 운영 발표 사례다. 초기에는 서비스 간 호출도 ELB hostname을 거쳤고, 한 node에서 외부 DNS 질의가 몰리면서 그 node의 DNS 요청이 차단돼 서비스 일부에 장애가 났다. kube-dns replica를 크게 늘려 upstream 질의를 보내는 node를 분산하고, 서비스 간 호출을 ELB 도메인 대신 cluster 도메인으로 바꿔 외부 DNS 질의를 줄이고 응답 속도도 개선했다. 현재 AWS 문서 기준으로는 link-local 1024 PPS 한도를 넘은 질의의 거부가 이 증상과 맞는다(추론).

## 버전 skew와 cluster 업그레이드

2026-10-14 Kubernetes version skew policy와 Amazon EKS 문서 대조 기준.

- HA cluster의 kube-apiserver instance끼리는 minor version 차이가 1 이내여야 한다. kube-apiserver는 단일 instance cluster에서도 minor version을 건너뛰어 올리지 않으므로 1.28에서 1.30으로 가려면 1.29를 거친다.
- kubelet과 kube-proxy는 kube-apiserver보다 새로우면 안 되고 최대 3 minor까지 오래될 수 있다(1.25 미만은 2). kubectl은 kube-apiserver의 위아래 1 minor 안에서 지원된다.
- 그래서 제거되는 API 사용을 먼저 고치고 control plane을 올린 뒤 node를 같은 minor로 맞추며, add-on과 controller도 새 버전과 호환되는 버전으로 올린다. EKS는 control plane을 올리기 전에 managed node와 Fargate node가 control plane과 같은 minor인지 확인하라고 하며, add-on은 control plane 업그레이드 때 자동으로 오르지 않는다.

| 방식 | 장점 | 비용과 제약 |
|---|---|---|
| in-place | API endpoint, OIDC, ENI, load balancer 같은 cluster 자원과 설정이 유지되고 workload 재배포나 DNS, storage 같은 외부 자원 이전이 필요 없다 | 한 번에 minor 하나씩만 오른다. 여러 버전을 따라잡는 순차 업그레이드는 계획이 복잡하고 중단 위험이 크다 |
| blue/green cluster | 여러 버전을 한 번에 건너뛸 수 있고(예: 1.23에서 1.25) 기존 cluster로 돌아갈 수 있으며 workload를 하나씩 옮길 수 있다 | API endpoint와 OIDC가 바뀌어 kubectl, CI/CD 같은 소비자를 갱신해야 한다. 이전 기간에 cluster 두 개를 함께 운영해 비용이 들고 region 용량을 제약할 수 있다. 서로 의존하는 workload는 함께 옮기도록 조율하고, load balancer와 external DNS는 여러 cluster에 걸치기 어렵다 |

- blue/green의 트래픽 전환은 두 cluster 밖의 진입 계층에서 한다. AWS 블로그 사례는 같은 ALB target group에 새 cluster의 ingress instance를 차례로 등록하고 기존 instance를 빼며 비율을 올렸고, 아래 발표 사례는 CloudFront origin을 바꿨다. stateful workload는 데이터 백업과 새 cluster 이전을 따로 계획하고, GitOps처럼 선언적이고 자동화된 배포가 있으면 새 cluster를 같은 상태로 만들기 쉽다.
- EKS in-place 업그레이드는 시작하면 멈추거나 중단할 수 없다. 새 API server node의 health check가 실패하면 EKS가 배포를 되돌려 이전 버전을 유지한다.
- 업그레이드가 끝난 뒤 7일 안에는 EKS control plane을 직전 minor로 rollback할 수 있다. etcd data는 보존되고 add-on, managed node group과 self-managed node는 함께 되돌아가지 않는다. node가 control plane보다 새로우면 안 되므로 node부터 내리고(EKS Auto Mode는 node를 자동으로 먼저 되돌린다), Fargate node는 rollback을 지원하지 않는다. rollback 준비 insight는 시작 시점의 검사라 검사 뒤 rollback이 끝나기 전에 새 API로 만든 resource는 rollback 뒤 문제를 일으킬 수 있다. 7일이 지나면 이전 버전으로 새 cluster를 만들어 workload를 옮긴다.
- 사례: 같은 2019년 발표에서는 kops cluster를 1.8에서 1.9로 올리며 node 사양까지 바꾸는 작업이 정기 점검 시간 안에 끝나지 않고 시작 뒤 되돌릴 수 없다고 판단했다. 새 cluster에 같은 버전의 서비스를 모두 배포하고 QA를 마친 뒤 CloudFront origin을 바꿔 야간 작업 없이 주간에 전환했고, 문제가 생기면 수 분 안에 기존 cluster로 돌아갈 수 있게 했다.

## 출처

- [Kubernetes Docs, cluster architecture](https://kubernetes.io/docs/concepts/architecture/)
- [Kubernetes Docs, Kubernetes components](https://kubernetes.io/docs/concepts/overview/components/)
- [Kubernetes Docs, Kubernetes scheduler](https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/)
- [Kubernetes Docs, Virtual IPs and service proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes Docs, migrating from dockershim](https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/)
- [Kubernetes Docs, container runtimes](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)
- [Updated: Dockershim Removal FAQ — Kubernetes Blog](https://kubernetes.io/blog/2022/02/17/dockershim-faq/)
- [Amazon EKS User Guide, Amazon EKS architecture](https://docs.aws.amazon.com/eks/latest/userguide/eks-architecture.html)
- [Kubernetes Docs, DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes Docs, Customizing DNS Service](https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/)
- [Kubernetes Docs, Using NodeLocal DNSCache in Kubernetes Clusters](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/)
- [Kubernetes Docs, Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/)
- [CoreDNS, cache plugin](https://coredns.io/plugins/cache/)
- [Linux manual, resolv.conf(5)](https://man7.org/linux/man-pages/man5/resolv.conf.5.html)
- [Amazon VPC User Guide, Understanding Amazon DNS](https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html)
- [Amazon EKS Best Practices Guide, Cluster Services](https://docs.aws.amazon.com/eks/latest/best-practices/scale-cluster-services.html)
- [Amazon EKS Best Practices Guide, Monitoring EKS workloads for Network performance issues](https://docs.aws.amazon.com/eks/latest/best-practices/monitoring_eks_workloads_for_network_performance_issues.html)
- [Amazon EKS Best Practices Guide, Best Practices for Cluster Upgrades](https://docs.aws.amazon.com/eks/latest/best-practices/cluster-upgrades.html)
- [Amazon EKS User Guide, Update existing cluster to new Kubernetes version](https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html)
- [Amazon EKS User Guide, Roll back a cluster to a previous Kubernetes version](https://docs.aws.amazon.com/eks/latest/userguide/rollback-cluster.html)
- [Kubernetes cluster upgrade: the blue-green deployment strategy — AWS Containers Blog](https://aws.amazon.com/blogs/containers/kubernetes-cluster-upgrade-the-blue-green-deployment-strategy/)
- [국내 미디어 고객사의 AWS 활용 사례 - POOQ서비스 그리고 마이크로서비스 아키텍처 — Amazon Web Services Korea](https://www.youtube.com/watch?v=MSC7Zr98QdY) — 2019-05-15 업로드, 사례 절의 출처
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Kubernetes와 선언적 관리](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=409161)

## 관련 문서

- [[K8s-Core-Workloads-and-Service|Kubernetes core workload와 Service]]
- [[K8s-Configuration-Storage-and-Probes|Kubernetes configuration, storage와 probe]]
- [[K8s-NetworkPolicy|Kubernetes NetworkPolicy]] — default deny egress와 DNS 허용
- [[K8s-PDB|PodDisruptionBudget]] — node 교체 때의 가용성
- [[DNS|DNS]]
- [[EC2-Network-Access|EC2 네트워크와 접근]]
- [[Blue-Green|Blue-Green 배포]]
- [[Version-Upgrade-Difficulty|버전 업그레이드의 난이도 구조]]
- [[EKS|Amazon EKS]]
- [[Graceful-Shutdown|Graceful shutdown]]
