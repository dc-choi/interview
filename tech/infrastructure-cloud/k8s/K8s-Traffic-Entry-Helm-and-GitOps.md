---
tags: [kubernetes, ingress, gateway-api, helm, gitops, argocd]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes Ingress Helm GitOps", "K8s Gateway Argo CD"]
verified_at: 2026-10-26
---

# Kubernetes traffic entry, Helm과 GitOps

외부 traffic 진입, manifest 패키징과 desired state 배포는 서로 다른 계층이다. Ingress/Gateway가 packet과 request 경로를 정의하고, Helm이 manifest를 render하며, GitOps controller가 cluster 상태를 Git의 승인 상태에 reconcile한다.

## Ingress resource만으로는 traffic이 흐르지 않는다

NodePort는 기본 30000-32767 범위에서 Service port별 node port를 할당한다. 이 범위는 클러스터 설정으로 바꿀 수 있다. NodePort 자체는 URL path routing이나 TLS 종료를 정의하지 않는다. HTTPS를 제공하려면 애플리케이션이나 앞단 proxy/LB 등 별도 계층이 인증서를 관리한다. 서비스마다 LoadBalancer Service를 두면 구현에 따라 외부 LB가 늘어 비용과 관리 부담이 커질 수 있다. Ingress나 Gateway는 HTTP/HTTPS 진입점을 공유하면서 host와 path로 여러 Service에 나누고 TLS를 한곳에서 관리하도록 구성할 수 있다. NodePort는 controller나 외부 LB가 node로 traffic을 넘기는 구현 기반으로 남는다.

LoadBalancer Service도 대개 NodePort 위에 구현된다. Kubernetes가 먼저 NodePort와 같은 변경을 하고 cloud-controller-manager가 외부 LB를 할당된 node port로 보내게 구성한다. Pod로 바로 보내는 LB 구현에서만 `spec.allocateLoadBalancerNodePorts: false`로 node port 할당을 끈다(기본값 `true`, Kubernetes 1.24부터 stable). 이미 할당된 node port는 false로 바꿔도 자동 회수되지 않아 각 Service port의 `nodePort`를 지워야 한다. Ingress는 임의의 port와 protocol을 노출하지 않으므로 HTTP/HTTPS 밖의 Service를 외부에 열 때는 대개 NodePort나 LoadBalancer를 쓴다(2026-10-26 Kubernetes Service, Ingress 문서 기준).

Ingress는 HTTP/HTTPS host/path routing 의도를 표현한다. 실제 load balancer와 proxy는 Ingress controller가 구현한다.

```text
client -> external LB -> ingress controller -> Service -> ready Pod
```

- `IngressClass`로 어떤 controller가 처리할지 명시한다.
- TLS Secret, certificate 발급/갱신 주체와 redirect/HSTS 정책을 분리해 확인한다.
- controller annotation은 구현체 종속 API다. 다른 controller로 옮길 때 호환되지 않을 수 있다.
- Service endpoint가 비었거나 NetworkPolicy가 막으면 Ingress rule이 맞아도 502/503이 발생한다. 정책의 격리 규칙과 검증 절차는 [[K8s-NetworkPolicy|Kubernetes NetworkPolicy]]에 정리했다.
- Kubernetes 프로젝트는 Ingress 대신 Gateway를 쓰라고 권한다. Ingress API는 GA라 제거 계획은 없지만 동결되어 더 이상 변경되지 않는다(Kubernetes 1.37 문서 기준). 새 설계는 역할 분리와 확장성이 큰 Gateway API를 기본으로 평가한다.

Gateway API는 대체로 infrastructure owner의 `GatewayClass/Gateway`와 application owner의 `HTTPRoute` 같은 route를 분리한다. controller가 해당 resource와 feature를 실제 지원하는지 conformance를 확인한다.

Route와 Gateway는 양쪽이 허용해야 붙는다(Gateway API v1.6.3 API 정의 기준, 2026-10-26 확인).

- Route는 `parentRefs`로 붙을 Gateway를 지정하고 `sectionName`으로 특정 listener를 고를 수 있다.
- Gateway listener의 `allowedRoutes`가 받을 Route의 namespace와 kind를 정한다. `namespaces.from` 기본값은 `Same`이라 Gateway와 같은 namespace의 Route만 붙는다. `All`은 모든 namespace, `Selector`는 label selector에 맞는 namespace를 허용한다. `kinds`를 비우면 listener protocol로 허용할 Route kind를 정한다.
- 공유 Gateway를 infra namespace에 두고 application namespace에 label을 붙여 `Selector`로 여는 구성이 공식 cross-namespace 예시다. 조건에 맞지 않는 Route는 `parentRefs`가 있어도 무시되며, Route status의 `Accepted` condition에서 `NotAllowedByListeners` reason으로 확인한다.
- HTTPRoute 외에 GRPCRoute(v1.1.0부터), TLSRoute(v1.5.0부터), TCPRoute와 UDPRoute(v1.6.0부터)도 Standard channel에 있다. 구현체별 지원은 위 conformance로 따로 확인한다.

Ingress와 HTTPRoute는 match 범위도 다르다(2026-10-14 Kubernetes Ingress API와 Gateway API 문서 기준). Ingress rule은 host와 path만으로 backend를 고르며 HTTP method나 Host 밖의 header로 나누는 필드가 없다. 같은 path의 GET과 POST를 다른 backend로 보내려면 Ingress 표준 밖의 controller 확장이나 별도 API gateway에 기대야 한다. HTTPRoute는 path 외에 header, query parameter와 method를 match 조건으로 둔다. method match는 Extended 지원 기능(`HTTPRouteMethodMatching`)이므로 사용할 구현체의 지원 목록을 확인한다.

### pathType과 rewrite

- 모든 path에 `pathType`이 필요하고 없으면 validation에 실패한다. `Exact`는 대소문자를 구분해 정확히 맞추고, `Prefix`는 `/`로 나눈 path element 단위로 비교하며, `ImplementationSpecific`은 IngressClass 구현이 정한다.
- `Prefix` path `/foo/bar`는 요청 `/foo/bar/baz`와 맞지만 `/foo/barbaz`와는 맞지 않는다. 끝 slash는 무시해 path `/aaa/bbb/`는 요청 `/aaa/bbb`와도 맞는다.
- 여러 path가 맞으면 가장 긴 path가 우선이고, 길이가 같으면 `Exact`가 `Prefix`보다 우선한다.
- ingress-nginx의 `rewrite-target`은 0.22.0부터 backend로 넘길 부분을 capture group으로 명시해야 한다(예: path `/something(/|$)(.*)`, `rewrite-target: /$2`, `use-regex: "true"`, `pathType: ImplementationSpecific`). capture 없이 `rewrite-target: /`와 Prefix를 쓰면 `/app1/static/a.js` 같은 하위 경로도 모두 `/`로 바뀌어 정적 자원과 하위 API가 깨질 수 있다(추론).
- ingress-nginx에서 `rewrite-target`은 같은 host의 모든 Ingress path를 regex로 취급하게 만들고, regex match는 prefix 기반이며 대소문자를 구분하지 않는다. `/`로 끝나는 `Exact` path는 끝 slash가 없는 요청을 301로 redirect한다. 모두 Ingress 표준이 아니라 구현체 동작이다.

### ingress-nginx 은퇴와 controller 선택

- Kubernetes community의 ingress-nginx(kubernetes/ingress-nginx)는 2025-11-11 발표대로 2026년 3월 은퇴했고 GitHub 저장소는 읽기 전용(archived)이 됐다. 이후 release, bugfix와 보안 취약점 수정이 없다. 기존 배포는 계속 동작하고 Helm chart와 image도 남지만, 2026-01-29 Steering과 Security Response Committee 성명은 은퇴 뒤에도 쓰면 공격에 노출되며 drop-in 대체재는 없다고 밝혔다.
- 사용 여부는 `kubectl get pods --all-namespaces --selector app.kubernetes.io/name=ingress-nginx`로 확인한다. F5가 만드는 NGINX Ingress Controller는 같은 NGINX data plane을 쓰지만 별개 프로젝트다.
- 이전 비용은 controller 전용 annotation(`rewrite-target`, `use-regex`, `ssl-redirect` 등)과 위의 비표준 동작에 몰려 있다. 사용 중인 annotation inventory를 만들고 Ingress2Gateway 1.0(2026-03-20, ingress-nginx annotation 30개 이상 번역과 미번역 경고)으로 Gateway API 초안을 만든 뒤 대상 구현체의 conformance와 실제 routing, redirect, rewrite 동작을 비교한다.
- 강의처럼 ingress-nginx를 설치하는 절차는 과거 실습으로만 보고, 신규 설계는 Gateway API 구현체나 유지보수되는 Ingress controller를 기준으로 한다. 인터넷에 노출되는 edge controller의 보안 수정 중단은 이전 일정을 운영 위험으로 추적할 이유다.

### HTTPRoute weight와 canary

HTTPRoute는 한 rule의 `backendRefs`에 기존 버전과 새 버전 Service를 함께 두고 `weight`로 요청을 나눈다(Gateway API v1.6.3 API 정의 기준, 2026-10-26 확인).

```yaml
rules:
- backendRefs:
  - name: web-v1
    port: 8080
    weight: 90
  - name: web-v2
    port: 8080
    weight: 10
```

- backend별 몫은 `weight / 같은 backendRefs 목록의 weight 합`이다. 백분율이 아니라 합이 100일 필요가 없고, 생략하면 1, 0이면 그 backend로 보내지 않아야 한다. 0이 아닌 값은 구현 정밀도에 따라 정확한 비율과 약간 어긋날 수 있다.
- HTTPRoute에서 weight 지원 수준은 Core다. Core는 portable하고 모든 구현체가 지원해 가기를 기대하는 등급이라 controller 전용 annotation보다 이식성이 높다.
- Service 사이의 요청 비율이라 Pod 수로 비율을 근사하는 [[Canary#Kubernetes 기본 오브젝트만 쓰는 replica 비율 canary|replica 비율 canary]]와 달리 replica 수와 따로 정한다.
- 새 버전 Service가 없거나 이름이 틀리면 backendRef가 invalid(`ResolvedRefs=False`, reason `BackendNotFound`)가 되고 그 몫의 요청은 500을 받아야 한다. ready endpoint가 없는 Service면 503을 권고한다. 이 명세상 오류 응답을 기존 버전으로 자동 우회한다고 가정하지 않는다.
- 공식 traffic splitting guide는 header match rule로 시험 요청만 새 Service에 보낸 뒤 90:10 weight로 일부를 옮기고, 문제가 없으면 기존 backend weight를 0으로 내리는 순서를 보인다. 되돌릴 때는 weight를 다시 바꾼다.
- ingress-nginx는 같은 host와 path의 두 번째 Ingress에 `nginx.ingress.kubernetes.io/canary: "true"`를 붙이고 `canary-by-header`, `canary-by-cookie`, `canary-weight`(합계 기본 100, `canary-weight-total`로 변경)로 나눴다. 우선순위는 header, cookie, weight 순이고 Ingress rule마다 canary Ingress는 최대 하나다. Ingress2Gateway 1.0은 `canary-weight`를 backend weight로, `canary-by-header`를 header match로 옮기지만 `canary-by-cookie`는 경고만 내고 변환하지 않는다.
- weight는 traffic을 나눌 뿐 승격과 중단을 판정하지 않는다. 지표 판정 loop는 [[Canary]]와 [[#순서와 progressive delivery]]를 따른다.

## Helm은 template/package manager다

Chart는 template, default `values.yaml`, dependency와 metadata를 묶는다. Helm이 manifest를 render해 API server에 적용하지만 지속적으로 drift를 복구하는 controller는 아니다.

- chart `version`은 package version, `appVersion`은 application 안내 metadata다.
- environment별 values에는 차이만 두고 완성된 render 결과를 CI에서 검증한다.
- `helm lint`, JSON schema, `helm template`과 server-side dry run으로 type/required field를 확인한다.
- `--set` 난립은 review하기 어렵다. versioned values file과 명확한 override 계층을 사용한다.
- Secret 값을 values나 release history에 평문으로 남기지 않는다.
- CRD install/upgrade/delete lifecycle은 일반 resource와 다르므로 chart 동작을 별도로 검증한다.
- `helm rollback`은 Kubernetes resource revision을 되돌릴 뿐 database나 외부 system을 되돌리지 않는다.

## GitOps와 Argo CD

```text
CI: source -> test -> image digest publish -> desired-state Git PR
CD: Argo CD pulls Git -> diff -> sync -> health/SLO verification
```

GitOps에서 CI가 cluster credential로 직접 push하는 경로를 줄이고 controller가 Git에서 pull한다. Git은 manifest/values의 source of truth이지 secret 평문 저장소나 runtime database의 source of truth가 아니다.

Argo CD automated sync의 옵션은 별개다.

- auto-sync는 Git 변경을 자동 반영한다.
- `prune`은 Git에서 삭제된 resource를 cluster에서도 제거한다.
- `selfHeal`은 live drift를 다시 Git 상태로 돌린다.
- `allowEmpty`는 application resource가 0개가 되는 sync를 허용할 수 있어 의도를 검토해야 한다.

모든 옵션을 켜는 것이 성숙한 GitOps는 아니다. production에는 protected branch, CODEOWNERS, policy check, sync window, project/RBAC와 delete guardrail을 둔다. rollback은 UI에서 과거 상태를 잠깐 적용하는 것보다 Git revert로 desired state 자체를 되돌려 controller와 일치시키는 편이 명확하다.

### 순서와 progressive delivery

CRD, controller, config, workload처럼 의존 순서가 있으면 sync wave/hook과 health check를 명시한다. 그러나 hook script가 비밀스러운 imperative 배포 절차가 되지 않게 한다.

- Deployment RollingUpdate는 replica 교체 전략이다.
- blue/green은 두 환경과 traffic switch를 운영한다. [[Blue-Green]]
- canary는 소량 traffic, metric analysis와 promotion/abort loop가 필요하다.
- Argo CD 자체 sync만으로 정교한 canary 판정이 생기지는 않는다. Argo Rollouts, service mesh나 gateway와 metric provider 같은 별도 controller가 필요할 수 있다.

## 운영 체크리스트

1. image tag 대신 승인 digest가 Git에 기록되는가?
2. render 결과, API schema와 policy를 PR에서 검증하는가?
3. controller가 관리할 namespace/cluster resource 권한이 최소화됐는가?
4. prune 대상과 shared resource ownership이 명확한가?
5. readiness 외 business SLO가 promotion/rollback에 연결되는가?
6. Git, registry와 cluster audit log가 같은 release identity를 공유하는가?

## 출처

- [Kubernetes Docs, Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Kubernetes Docs, Gateway API](https://kubernetes.io/docs/concepts/services-networking/gateway/)
- [Kubernetes API Reference, Ingress v1](https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/)
- [Gateway API, HTTPRoute](https://gateway-api.sigs.k8s.io/reference/api-types/httproute/)
- [Gateway API, HTTP method matching](https://gateway-api.sigs.k8s.io/guides/user-guides/http-method-matching/)
- [Gateway API, HTTP traffic splitting](https://gateway-api.sigs.k8s.io/guides/traffic-splitting/)
- [Gateway API, Cross-Namespace routing](https://gateway-api.sigs.k8s.io/guides/multiple-ns/)
- [Gateway API, API Reference](https://gateway-api.sigs.k8s.io/references/spec/)
- [Gateway API, Conformance](https://gateway-api.sigs.k8s.io/docs/concepts/conformance/)
- [Gateway API, GRPCRoute](https://gateway-api.sigs.k8s.io/reference/api-types/grpcroute/)
- [Gateway API, TLSRoute](https://gateway-api.sigs.k8s.io/reference/api-types/tlsroute/)
- [Kubernetes Docs, Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Ingress-NGINX Docs, rewrite](https://kubernetes.github.io/ingress-nginx/examples/rewrite/)
- [Ingress-NGINX Docs, canary annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary)
- [Ingress NGINX Retirement: What You Need to Know — Kubernetes Blog](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- [Ingress NGINX: Statement from the Kubernetes Steering and Security Response Committees — Kubernetes Blog](https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/)
- [Before You Migrate: Five Surprising Ingress-NGINX Behaviors You Need to Know — Kubernetes Blog](https://kubernetes.io/blog/2026/02/27/ingress-nginx-before-you-migrate/)
- [Announcing Ingress2Gateway 1.0: Your Path to Gateway API — Kubernetes Blog](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/)
- [Kubernetes Networking: NodePort, LoadBalancer, Ingress, or Gateway API? — Anton Putra](https://www.youtube.com/watch?v=LepslIb2me0) — 2026-10-19 업로드, 수치와 동작은 위 공식 문서로 확인
- [kubernetes/ingress-nginx 저장소, archived — GitHub](https://github.com/kubernetes/ingress-nginx)
- [kubernetes-sigs/gateway-api v1.6.3, apis/v1 type 정의 — GitHub](https://github.com/kubernetes-sigs/gateway-api/tree/v1.6.3/apis/v1)
- [kubernetes-sigs/gateway-api v1.6.0 release notes, TCPRoute와 UDPRoute GA — GitHub](https://github.com/kubernetes-sigs/gateway-api/releases/tag/v1.6.0)
- [kubernetes-sigs/ingress2gateway v1.0.0, ingress-nginx provider 지원 annotation — GitHub](https://github.com/kubernetes-sigs/ingress2gateway/blob/v1.0.0/pkg/i2gw/providers/ingressnginx/README.md)
- [Helm, chart best practices](https://helm.sh/docs/chart_best_practices/)
- [Argo CD, automated sync policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Ingress와 controller](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=411215)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, Helm](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=413044)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, GitOps와 Argo CD](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=413046)
- [금융 인프라를 운영하는 Toss 개발자의 Kubernetes, 배포 전략](https://www.inflearn.com/courses/lecture?courseId=340716&unitId=413047)

## 관련 문서

- [[K8s-Core-Workloads-and-Service|Kubernetes core workload와 Service]]
- [[Docker-Image-Pipeline|Docker image pipeline]]
- [[Istio-Traffic-Management-and-Resilience|Istio traffic management와 resilience]]
- [[K8s-NetworkPolicy|Kubernetes NetworkPolicy]]
- [[Canary|Canary 배포]]
