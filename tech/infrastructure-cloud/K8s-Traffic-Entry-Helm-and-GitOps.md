---
tags: [kubernetes, ingress, gateway-api, helm, gitops, argocd]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes Ingress Helm GitOps", "K8s Gateway Argo CD"]
verified_at: 2026-08-04
---

# Kubernetes traffic entry, Helm과 GitOps

외부 traffic 진입, manifest 패키징과 desired state 배포는 서로 다른 계층이다. Ingress/Gateway가 packet과 request 경로를 정의하고, Helm이 manifest를 render하며, GitOps controller가 cluster 상태를 Git의 승인 상태에 reconcile한다.

## Ingress resource만으로는 traffic이 흐르지 않는다

Ingress는 HTTP/HTTPS host/path routing 의도를 표현한다. 실제 load balancer와 proxy는 Ingress controller가 구현한다.

```text
client -> external LB -> ingress controller -> Service -> ready Pod
```

- `IngressClass`로 어떤 controller가 처리할지 명시한다.
- TLS Secret, certificate 발급/갱신 주체와 redirect/HSTS 정책을 분리해 확인한다.
- controller annotation은 구현체 종속 API다. 다른 controller로 옮길 때 호환되지 않을 수 있다.
- Service endpoint가 비었거나 NetworkPolicy가 막으면 Ingress rule이 맞아도 502/503이 발생한다.
- Kubernetes Ingress API는 stable이지만 새 기능 추가가 동결됐다. 새 설계에서는 역할 분리와 확장성이 큰 Gateway API를 함께 평가한다.

Gateway API는 대체로 infrastructure owner의 `GatewayClass/Gateway`와 application owner의 `HTTPRoute` 같은 route를 분리한다. controller가 해당 resource와 feature를 실제 지원하는지 conformance를 확인한다.

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
