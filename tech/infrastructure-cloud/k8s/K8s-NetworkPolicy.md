---
tags: [kubernetes, networkpolicy, network-security, cni, dns]
status: done
verified_at: 2026-10-06
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["NetworkPolicy", "Kubernetes NetworkPolicy", "K8s NetworkPolicy", "netpol", "네트워크 정책"]
---

# Kubernetes NetworkPolicy

NetworkPolicy는 Pod가 주고받는 연결을 IP 주소와 port 수준(OSI L3, L4)에서 허용 목록으로 제한하는 namespaced API object다. deny 규칙과 우선순위가 없고, 정책이 Pod를 선택하면 그 방향이 격리된 뒤 적용되는 정책들이 허용한 연결의 합집합만 통과한다. object를 만드는 것만으로는 효과가 없고 NetworkPolicy를 구현하는 network plugin(CNI)이 실제 차단을 맡는다. 이 문서는 2026-10-06에 확인한 Kubernetes v1.37 공식 문서 기준이다.

## 격리 모델

- Pod는 기본적으로 ingress와 egress 모두 비격리라 모든 연결이 허용된다. namespace에 정책이 하나도 없으면 그 namespace Pod로 들어오고 나가는 연결이 모두 허용되고, 어떤 정책도 선택하지 않은 Pod끼리는 namespace가 달라도 서로 연결된다.
- `policyTypes`에 `Ingress`를 가진 정책이 Pod를 선택하면 그 Pod는 ingress가 격리되고, `Egress`를 가진 정책이 선택하면 egress가 격리된다. 두 방향의 격리는 서로 독립적으로 정해진다.
- 격리된 방향에서는 그 Pod에 적용되는 정책들의 규칙이 허용한 연결만 통과한다. 정책은 충돌하지 않고 합집합으로 더해지므로 평가 순서가 결과를 바꾸지 않고, 명시적 deny 규칙이 없어 같은 Pod의 같은 방향에서 한 정책이 허용한 연결을 다른 정책으로 막을 수 없다. 허용된 연결의 응답 traffic은 암묵적으로 허용된다.
- Pod 사이 연결은 출발 Pod의 egress와 도착 Pod의 ingress가 모두 허용해야 성립한다. NetworkPolicy는 적어도 한쪽 끝이 Pod인 연결에만 관여한다.
- 예외가 있다. Pod는 자기 자신으로의 접근을 막을 수 없고, 공식 문서는 Pod가 실행 중인 node와 주고받는 traffic이 IP와 무관하게 항상 허용된다고 명시한다. localhost 접근도 막을 수 없다.

| 상황 | 결과 |
|---|---|
| 어떤 정책도 Pod를 선택하지 않음 | 들어오고 나가는 연결 모두 허용 |
| `Ingress` 정책이 선택했고 ingress 규칙이 없음 | 자기 node에서 오는 연결 말고는 들어오는 연결 차단 |
| 정책 A는 frontend, 정책 B는 batch의 접근을 허용 | 둘 다 허용(합집합) |
| 출발 Pod의 egress는 허용, 도착 Pod의 ingress는 미허용 | 연결 실패 |

## 한 Pod만 격리하는 manifest

공식 문서의 default deny 예시에 `metadata.namespace`를 넣고 `podSelector`를 label로 바꾸면 namespace 전체가 아니라 특정 label의 Pod만 양방향으로 격리할 수 있다.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-api
  namespace: lab-a        # 이 namespace의 Pod에만 적용된다
spec:
  podSelector:
    matchLabels:
      role: api           # {}로 비우면 namespace의 모든 Pod
  policyTypes:
  - Ingress
  - Egress                # 규칙 목록이 없어 두 방향 모두 차단된다
```

- NetworkPolicy는 namespaced resource라서 다른 namespace에 같은 label의 Pod가 있어도 적용되지 않는다. `kubectl api-resources --api-group=networking.k8s.io`로 확인할 수 있고, kubectl 레퍼런스 표(Kubernetes 1.25.0 기준 출력)에는 short name `netpol`, NAMESPACED `true`로 나온다.
- `podSelector: {}`로 두면 namespace 전체의 default deny가 된다. 공식 문서는 ingress만, egress만, 둘 다 막는 세 가지 default deny 예시를 제공한다.
- `policyTypes`를 생략하면 `Ingress`는 항상 설정되고 `Egress`는 egress 규칙이 있을 때만 설정된다. 그래서 egress 전부 차단은 `Egress`를 명시해야 하고, egress 규칙만 적은 정책도 이 필드를 생략하면 ingress 격리가 함께 걸린다.
- 규칙 하나는 `from`(egress는 `to`)과 `ports`를 모두 만족하는 traffic을 허용한다. 규칙 목록이 비면 격리 선언만 남고, `- {}` 규칙 하나는 그 방향을 전부 허용한다.
- port 범위는 `endPort`(v1.25부터 stable)로 쓴다. plugin이 `endPort`를 지원하지 않으면 시작 `port` 하나에만 적용된다.

## from과 to: 한 원소는 AND, 여러 원소는 OR

```yaml
ingress:
- from:
  - namespaceSelector:        # 한 원소 안의 두 selector: lab-b의 role=client Pod만(AND)
      matchLabels:
        kubernetes.io/metadata.name: lab-b
    podSelector:
      matchLabels:
        role: client
```

- 위에서 `podSelector` 앞에 `-`를 붙여 원소 둘로 나누면 lab-b의 모든 Pod 또는 정책 namespace의 `role=client` Pod를 허용하는 OR이 된다. 이 작은 차이로 허용 범위가 크게 달라지므로 적용 뒤 `kubectl describe networkpolicy`로 Kubernetes가 해석한 결과를 확인한다.
- `podSelector`만 쓰면 정책과 같은 namespace의 Pod만 고른다. 다른 namespace의 Pod를 허용하려면 `namespaceSelector`가 필요하고, 빈 `namespaceSelector: {}`는 모든 namespace를 고른다.
- namespace 이름을 직접 쓰는 필드는 없다. control plane이 모든 namespace에 붙이는 변경 불가 label `kubernetes.io/metadata.name`(값은 namespace 이름)을 `namespaceSelector`에 쓴다.
- `ipBlock`은 cluster 외부 IP 대역용이다. Pod IP는 일시적이고 예측할 수 없기 때문이다. cluster 진입과 진출 경로가 source나 destination IP를 다시 쓰면 그 변환이 정책 처리 전후 어디서 일어나는지 정의되어 있지 않다. 그래서 ingress 정책이 보는 source IP가 원래 client가 아니라 LoadBalancer나 node IP일 수 있고, 결과는 plugin, cloud provider와 Service 구현 조합마다 다를 수 있다.

## egress를 막으면 DNS도 막힌다

공식 문서는 default deny egress가 DNS traffic까지 막으므로 이름 해석이 필요한 workload에는 cluster DNS로 가는 egress를 허용하는 별도 정책이 필요하다고 경고한다. `dnsPolicy`를 지정하지 않은 Pod는 `ClusterFirst`를 쓰고, kubelet이 Pod마다 구성한 `/etc/resolv.conf`의 nameserver로 질의한다.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: lab-a
spec:
  podSelector: {}
  policyTypes:
  - Egress                # 생략하면 Ingress도 설정돼 들어오는 연결까지 막힌다
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

- NetworkPolicy는 Service를 이름으로 지정할 수 없어 DNS Pod의 label을 고른다. 공식 DNS 디버깅 문서는 CoreDNS Pod를 `kube-system`에서 `k8s-app=kube-dns` label로 조회한다. 원래 kube-dns와의 호환을 위해 CoreDNS도 이 label 값과 `kube-dns` Service 이름을 쓰며, 예시 출력의 port는 `53/UDP,53/TCP`다.
- 위 selector는 그 upstream 구성을 가정한 최소 예시다. 적용 전에 `kubectl get pods -n kube-system --show-labels`로 자기 cluster의 DNS Pod label과 namespace를 확인해 맞춘다.
- DNS Pod 쪽에도 ingress를 격리하는 정책이 있으면 그쪽 허용도 필요하다. 연결은 양쪽이 모두 허용해야 성립한다.

## 적용 시점과 기존 연결

- plugin이 새 정책을 처리하는 데 시간이 걸릴 수 있다. 처리 전에 만들어진 Pod는 보호 없이 시작될 수 있고, 처리가 끝나면 격리가 적용된다.
- 처리 이후 새로 만든 Pod는 시작 전에 격리되며 init container, sidecar와 일반 container에 같이 적용된다. 허용 규칙은 격리보다 늦게(또는 같은 시점에) 적용될 수 있어 새 Pod가 처음에는 연결이 전혀 없을 수 있다.
- 적용 완료 시점은 Kubernetes API로 알 수 없다. application은 시작 직후의 연결 실패를 견디게 만들고, 시작 전에 목적지 도달이 필요하면 init container로 기다린다.
- plugin이 분산 방식으로 구현되면 새 Pod가 Node 1의 Pod A에는 바로 닿고 Node 2의 Pod B에는 몇 초 뒤에 닿을 수 있다.
- 정책이나 label 변경이 이미 열린 연결에 적용되는지는 구현이 정한다. 공식 문서는 기존 연결에 영향을 줄 수 있는 방식으로 정책, Pod, namespace를 바꾸지 말라고 권한다.

## NetworkPolicy로 할 수 없는 것

Kubernetes 1.37 문서 기준으로 다음 기능은 NetworkPolicy API에 없다. OS component, Ingress controller나 service mesh 같은 L7 기술, admission controller로 우회할 수 있는 경우가 있다.

- cluster 내부 traffic을 공통 gateway로 강제하기
- TLS 관련 기능(service mesh나 ingress controller가 맡는다)
- node를 Kubernetes identity로 지정하는 정책(CIDR로만 표현한다)
- Service를 이름으로 지정하기(Pod나 namespace label로 우회한다)
- 제3자가 처리하는 정책 요청의 생성과 관리
- 모든 namespace나 Pod에 적용되는 기본 정책(일부 제3자 배포판과 프로젝트가 제공한다)
- 고급 정책 조회와 도달성 분석 도구
- 차단이나 허용 같은 network 보안 이벤트 로깅
- 명시적 deny 규칙
- loopback과 자기 node에서 들어오는 traffic 차단

## 검증 절차

API object가 있다는 사실은 차단이 동작한다는 증거가 아니다. 구현하는 plugin이 없어도 정책은 만들어지므로 적용 전후의 실제 연결로 판정한다. 공식 task 문서는 NetworkPolicy를 지원하는 provider 예로 Antrea, Calico, Cilium, Kube-router를 든다.

```bash
# 가정: lab-a에 api(role=api)와 client(role=client), lab-b에 api(role=api) Pod가 있다
kubectl get pod -n lab-a -o wide --show-labels                # Pod IP와 label 기록
kubectl exec -n lab-a client -- curl -sS -m 2 http://API_IP   # 기준선: 응답이 와야 한다
kubectl apply -f isolate-api.yaml
kubectl describe networkpolicy isolate-api -n lab-a
kubectl exec -n lab-a client -- curl -sS -m 2 http://API_IP   # ingress 차단 확인
kubectl exec -n lab-a api -- curl -sS -m 2 http://CLIENT_IP   # egress 차단 확인
kubectl exec -n lab-b api -- curl -sS -m 2 http://CLIENT_IP   # 다른 namespace의 같은 label은 그대로
kubectl delete networkpolicy isolate-api -n lab-a             # 다시 호출해 복구 확인
```

```text
Spec:
  PodSelector:     role=api
  Allowing ingress traffic:
    <none> (Selected pods are isolated for ingress connectivity)
  Allowing egress traffic:
    <none> (Selected pods are isolated for egress connectivity)
```

- 기준선을 먼저 잡는다. 적용 전에 같은 호출이 성공해야 적용 뒤 실패를 정책 효과로 해석할 수 있다. 들어오는 호출과 나가는 호출은 다른 방향의 정책이므로 따로 시험한다.
- `kubectl exec`에서 `--` 뒤가 container 안에서 실행할 명령이다. 명령이 kubectl과 겹치는 flag를 쓰면 `--`로 구분해야 하고, image에 curl 같은 client가 있어야 한다.
- describe 출력(위는 Spec 부분 발췌)에서 `PodSelector`가 의도한 label인지, 격리만 선언한 방향이 `<none> (Selected pods are isolated for ... connectivity)`로 나오는지 본다. 그 방향을 다루지 않는 정책은 `Not affecting ingress traffic`처럼 표시된다. 빈 `podSelector`는 `<none> (Allowing the specific traffic to all pods in this namespace)`로 나오므로 `<none>`을 대상 없음으로 읽지 않는다.
- client timeout을 짧게 둔다. 공식 task 예시는 Service 이름으로 호출한 `wget --spider --timeout=1`이 `download timed out`으로 끝나는 것으로 차단을 확인하며, Service를 거쳐도 도착 Pod의 ingress 정책이 적용된다는 점도 같은 예시에서 보인다.
- deny all이 보장하는 범위는 TCP, UDP, SCTP 연결이다. ICMP와 ARP는 동작이 정의되지 않아 plugin마다 다르므로 `ping` 결과로 정책을 판정하지 않는다.
- `hostNetwork` Pod에 대한 동작은 정의되지 않았고, 공식 문서가 가장 흔하다고 한 구현은 이런 Pod를 selector 매칭에서 빼고 node IP traffic으로 다룬다. 그래서 node shell이나 `hostNetwork` Pod에서 시험하면 node traffic 예외 때문에 정책 효과를 보기 어렵다(추론).
- 정책을 지운 뒤 연결이 돌아오면 차단 원인이 그 정책이었다고 볼 수 있다. 기존 연결 처리는 구현마다 다르므로 매번 새 연결로 시험한다.

## 설계 판단과 체크포인트

- namespace 단위 default deny와 명시 허용은 노출 범위를 줄이지만, DNS와 다른 namespace의 ingress controller나 metric 수집기처럼 필요한 경로를 빠짐없이 열어야 한다. 빠진 경로는 연결 실패로 드러난다.
- 전역 기본 정책이 API에 없으므로 namespace마다 기본 정책을 만들어야 한다. 새 namespace를 만드는 절차나 GitOps template에 기본 정책을 포함하면 이 공백을 줄일 수 있다(제안).
- 허용 목록은 L3, L4에 머문다. mTLS, L7 인가와 차단 로그가 필요하면 [[Istio-Ambient-Mode|service mesh]] 같은 다른 계층을 함께 검토한다.
- 정책을 만들었는데 아무것도 막히지 않으면 plugin 구현 여부, `podSelector`가 실제 Pod를 고르는지(`kubectl get pod -l role=api -n lab-a`), `metadata.namespace`, `policyTypes` 생략, 반영 지연과 기존 연결 순으로 본다. 반대로 deny-all egress 직후 이름 해석이 실패하면 DNS egress 허용이 빠졌는지 먼저 본다.
- Namespace를 나누는 것만으로는 traffic이 격리되지 않는다. 정책이 없으면 namespace 사이 연결도 허용되며, 격리는 NetworkPolicy와 이를 구현하는 plugin이 만든다([[K8s-Core-Workloads-and-Service#Namespace의 실제 경계|Namespace의 실제 경계]]).

## 출처

- [Kubernetes Docs, Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes Docs, Declare Network Policy](https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/)
- [Kubernetes Docs, NetworkPolicy v1](https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/)
- [Kubernetes Docs, DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes Docs, Debugging DNS Resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes Docs, kubectl exec](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes Docs, kubectl api-resources](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/)
- [Kubernetes Docs, Command line tool (kubectl)](https://kubernetes.io/docs/reference/kubectl/)
- [Kubernetes v1.37.0 kubectl describe 구현 — GitHub](https://github.com/kubernetes/kubernetes/blob/v1.37.0/staging/src/k8s.io/kubectl/pkg/describe/describe.go)
- [YouTube, NeoKloud, CKS 29 Cluster Hardening 08 Network Policy — Part 5 demo one](https://www.youtube.com/watch?v=4sN5KhFxbkE)

## 관련 문서

- [[K8s-Core-Workloads-and-Service|Kubernetes core workload와 Service]]
- [[K8s-Core-Workloads-and-Service-Architecture|Kubernetes control plane과 node component]]
- [[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes traffic entry, Helm과 GitOps]]
- [[Istio-Ambient-Mode|Istio Ambient Mode]]
- [[DNS|DNS]]
- [[Network-Separation|망분리]]
