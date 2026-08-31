---
tags: [cicd, gitops, argocd, kubernetes, deployment]
status: done
verified_at: 2026-08-31
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Argo CD", "ArgoCD GitOps"]
---

# ArgoCD — GitOps 배포 컨트롤러

Argo CD는 Git에 선언된 desired state를 클러스터의 live state와 계속 비교하고 맞춰 놓는 Kubernetes 컨트롤러다. CNCF 프로젝트 페이지 기준으로 Argo 프로젝트는 2020년 3월 26일 CNCF Incubating으로 받아들여져(TOC 승인 공지는 2020년 4월 7일) 2022년 12월 6일 Graduated가 됐다.

GitOps의 pull 대 push 원리, auto-sync와 prune, selfHeal 옵션, sync wave와 hook 순서, Git revert 롤백, Argo Rollouts를 통한 progressive delivery는 [[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes traffic entry, Helm과 GitOps]]가 정본이다. 도구 선택 비교는 [[CICD-Tool-Selection|CI/CD 툴 선택]]에 있다. 이 문서는 그 위에 컨트롤러의 내부 구조, 규모가 커질 때의 확장 수단, 권한 분리와 튜닝만 다룬다.

## 구성 요소 — 어디가 장애 지점인가

| 컴포넌트 | 역할 | 죽으면 무엇이 막히나 |
|---|---|---|
| **argocd-server** | UI, CLI, CI 시스템이 쓰는 gRPC/REST API. 인증과 외부 IdP 위임, RBAC 시행, repo와 cluster credential 관리, Git webhook 수신 | 사람이 보고 조작하는 경로가 끊긴다. 컨트롤러의 자동 sync는 계속 돈다 |
| **argocd-repo-server** | repo URL, revision, path, Helm values 같은 입력을 받아 manifest를 생성해 반환하는 내부 서비스 | manifest를 못 만들어 새 revision의 sync가 전부 멈춘다 |
| **argocd-application-controller** | live state와 target state를 비교해 `OutOfSync`를 감지하고 필요하면 교정, PreSync/Sync/PostSync hook 실행 | 실제 클러스터 쓰기가 멈춘다. drift도 교정되지 않는다 |
| **Redis** | manifest 렌더 결과와 리소스 상태 캐시 | 영속 정본은 etcd에 있어 재구축해도 상태가 사라지지는 않는다. 다만 cache miss와 재동기화 동안 UI, 비교와 reconcile이 일시적으로 느려질 수 있다 |
| **Dex 또는 외부 OIDC** | SSO 연동 주체 | 로그인이 막힌다. admin local 계정과 배포 자체는 영향이 덜하다 |

핵심은 **UI가 죽는 것과 배포가 죽는 것이 다른 사건**이라는 점이다. [[CICD-Tool-Selection|CI/CD 툴 선택]]이 요구하는 장애 시나리오 설계에서, Argo CD 전면 장애의 우회 경로는 결국 kubectl이나 Helm으로 직접 apply하는 수동 경로다. 그 경로를 열어 두려면 desired-state repo에서 렌더한 manifest가 사람 손으로도 적용 가능한 형태여야 한다.

## Application 리소스 — sync status와 health status는 다른 축

Application은 배포 단위를 정의하는 CRD다. `source`(`repoURL`, `path` 또는 `chart`, `targetRevision`), `destination`(`server`, `namespace`), `syncPolicy`로 구성된다.

- **`targetRevision`의 이동성을 의도에 맞춘다.** 브랜치 추적은 변경을 계속 reconcile하는 GitOps 흐름에서 지원되는 방식이지만 `main`이라는 문자열은 시점마다 다른 commit을 가리킨다. 특정 배포를 재현해야 하면 Application이 해석한 commit SHA를 기록하고, 불변 릴리스가 필요하면 tag나 commit SHA로 고정한다. Helm dependency와 Kustomize remote base 같은 upstream 참조도 별도로 pin한다.
- **sync status**는 live state가 target state와 같은가를 본다. Git이 말하는 것과 클러스터에 있는 것이 같은지의 diff 축이다.
- **health status**는 그 리소스가 실제로 정상 동작하는가를 본다. Deployment의 observed generation과 updated replicas, LoadBalancer Service의 `status.loadBalancer.ingress`, PVC의 `Bound` 같은 내장 판정이 있다.
- Application health는 **직속 자식 리소스 health의 최악값**(Healthy, Suspended, Progressing, Missing, Degraded, Unknown 순)이며, 리소스 health는 자식에서 상속되지 않고 그 리소스 자신의 정보만으로 계산된다.
- 따라서 내장 판정도 커스텀 판정도 없는 CRD는 health 축에 기여하지 못한다. **Synced이면서 Healthy로 보여도 CRD 컨트롤러가 실제 프로비저닝에 실패한 상태일 수 있다.** ExternalSecret, Certificate, 데이터베이스 오퍼레이터처럼 실제 상태가 중요한 CRD는 `argocd-cm`의 `resource.customizations.health.<group>_<kind>` Lua health check를 등록해야 배포 성공 판정이 진실해진다.
- 반대로 특정 자식이 Application health를 흔들지 않게 하려면 `argocd.argoproj.io/ignore-healthcheck: "true"` 어노테이션으로 제외한다.

## 규모 확장 — App of Apps와 ApplicationSet

앱이 수십 개가 되면 Application을 손으로 만들지 않는다. 두 수단의 역할이 다르다.

| 수단 | 하는 일 | 적합한 상황 |
|---|---|---|
| **App of Apps** | 부모 Application이 자식 Application manifest들만 담은 디렉터리를 관리 | 클러스터 부트스트랩, 플랫폼 공통 컴포넌트를 한 번에 세우기 |
| **ApplicationSet** | generator가 만든 파라미터 집합으로 Application을 템플릿 전개 | 같은 앱을 N개 클러스터나 N개 디렉터리로 반복 배포 |

주요 generator는 고정 key/value 목록을 쓰는 **List**, Argo CD에 등록된 클러스터 목록을 쓰는 **Cluster**, repo의 파일이나 디렉터리 구조를 쓰는 **Git**, 두 generator의 파라미터를 조합하는 **Matrix**, base generator 값을 덮어쓰며 병합하는 **Merge**다. SCM Provider, Pull Request, Cluster Decision Resource, Plugin generator도 있다.

작은 SRE 팀에 결정적인 이유는 Matrix 조합이다. Cluster generator로 클러스터 목록을, Git generator로 서비스 디렉터리 목록을 뽑아 곱하면 클러스터 x 서비스 개수만큼의 Application이 자동으로 생기고 없어진다. 클러스터를 한 대 추가하는 작업이 cluster secret 하나 등록으로 끝나며, 클러스터별 차이는 generator가 주입하는 값으로 values 파일을 분기해 흡수한다.

## 멀티테넌시와 권한 — AppProject와 RBAC

AppProject는 팀 단위 경계다. `sourceRepos`로 manifest를 가져올 수 있는 repo를, `destinations`로 배포 가능한 cluster와 namespace를, `clusterResourceWhitelist`와 `namespaceResourceBlacklist`로 다룰 수 있는 리소스 종류를 제한하고, `roles`로 프로젝트 범위 권한을 정의한다.

Argo CD RBAC은 Casbin 기반이다. `p, <subject>, <resource>, <action>, <object>, <effect>` 정책 라인과 `g, <user/group>, <role>` 그룹 라인으로 쓰고, 내장 역할은 읽기 전용 `role:readonly`와 무제한 `role:admin` 둘이다. `scopes` 설정으로 OIDC의 어떤 claim을 그룹으로 볼지 정해 IdP 그룹을 그대로 권한에 매핑한다.

주의할 함정 두 가지가 있다. 첫째, **Argo CD가 설치된 namespace에 배포 권한을 주는 프로젝트는 사실상 admin 권한**이다. Argo CD 자신의 설정을 고칠 수 있기 때문이다. 둘째, 임의 프로젝트에 Application을 만들 수 있다는 것 자체가 admin 능력이므로 공식 문서는 App of Apps를 admin 전용 도구로 규정하고 부모 repo의 push 권한을 관리자로 제한하라고 한다.

push 기반 CI 대비 이점은 여기서 나온다. CI 러너가 클러스터 credential을 아예 갖지 않고, 클러스터에 쓰는 주체는 클러스터 안의 컨트롤러 ServiceAccount 하나로 좁혀진다. 단, 이것이 review gate가 되려면 CI 토큰이 protected production branch에 직접 push하거나 승인 없이 auto-merge할 수 없어야 한다. 러너가 PR만 만들 수 있고 해당 branch가 승인된 머지를 요구할 때에만 탈취가 곧바로 클러스터 쓰기 권한으로 이어지지 않는다. 컨트롤러 ServiceAccount 권한도 필요한 리소스로 최소화한다.

## CI와 CD의 경계 — desired state를 누가 쓰는가

공식 best practices는 애플리케이션 코드 repo와 manifest repo를 분리하라고 권한다. 이유는 replica 수만 바꾸려는데 전체 CI 빌드를 돌릴 필요가 없다는 점, 배포 이력만 담긴 깨끗한 audit trail, 코드 커밋 권한과 프로덕션 배포 권한의 분리, 그리고 config 변경이 빌드를 유발하고 그 빌드가 다시 config를 바꾸는 무한 루프 방지다.

경계는 이렇게 그어진다. CI는 이미지를 빌드해 registry에 올리고 **digest를 발행하는 데서 끝난다.** desired-state repo에 그 digest를 담은 PR을 올리는 것까지가 CI의 책임이고, 클러스터에 쓰는 일은 하지 않는다. mutable tag(`latest`, `v1`, 심지어 브랜치명)를 커밋하면 같은 Git revision이 시점마다 다른 이미지를 가리켜 롤백이 무의미해진다. 태그 전략은 [[Docker-Image-Pipeline|Docker image build pipeline]]을 따른다.

Argo CD Image Updater를 붙이면 registry의 새 이미지를 자동 반영할 수 있으나 트레이드오프가 있다. 기본 `argocd` write-back 방식은 Application 리소스를 직접 고치는 pseudo-persistent 변경이라 Application을 지우고 다시 만들거나 Git 버전을 sync하면 변경이 사라진다. `git` 방식은 repo에 커밋해 영속화하지만 이번엔 **자동 커밋이 리뷰 게이트를 우회한다.** 프로덕션은 PR 리뷰를 남기고, dev 환경에만 자동 write-back을 쓰는 식으로 환경별로 다르게 정하는 편이 안전하다.

## 운영 부담과 튜닝

[[CICD-Tool-Selection|CI/CD 툴 선택]]이 메모리 사용량이 크다고만 적은 항목의 실체는 대부분 두 컴포넌트다. 아래 기본값은 Argo CD stable 문서 기준이다.

- **application-controller**: 관리 리소스가 늘면 메모리와 reconcile 지연이 먼저 문제가 된다. StatefulSet replica를 늘리고 `ARGOCD_CONTROLLER_REPLICAS`를 같은 값으로 맞춰 클러스터 단위로 샤딩한다. `--sharding-method`는 UID 기반 `legacy`, 균등 분배 `round-robin`, bounded load `consistent-hashing` 중에 고르며 뒤 둘은 문서상 experimental이다. cluster secret의 `shard` 필드로 수동 고정도 가능하다.
- **reconcile 주기**: `argocd-cm`의 `timeout.reconciliation` 기본값은 120초이고 기본 jitter 60초가 더해져 polling 간격은 최대 3분이다. 이 값을 줄이는 대신 Git webhook으로 즉시 refresh를 트리거하는 편이 부하 대비 효율이 좋다. 대량 변경이 한꺼번에 몰릴 때는 `timeout.reconciliation.jitter`와 `webhook.refresh.jitter`, `webhook.refresh.jitter.threshold`(기본 10개)로 refresh 스파이크를 흩는다.
- **repo-server**: `--parallelismlimit`으로 동시 manifest 생성 수를 제한해 OOM kill을 막는다. helm이나 kustomize를 fork해 실행하며 기본 90초 timeout이 걸리고 `ARGOCD_EXEC_TIMEOUT`으로 조정한다. 큰 chart의 렌더가 느리면 여기가 병목이다.
- **argocd-server**는 stateless라 문서 표현으로 문제를 일으킬 가능성이 가장 낮은 축이며 수평 확장이 쉽다.

## 흔한 실수

- **UI에서 수동 sync와 리소스 편집을 습관화** — Git과 클러스터가 조용히 어긋나고, 다음 자동 sync 때 되돌아가면서 원인 불명 장애처럼 보인다.
- **selfHeal 없이 drift를 방치하거나, 반대로 검토 없이 자동화 옵션을 전부 켜기** — prune과 selfHeal은 편의 기능이 아니라 파괴 권한이다. 옵션별 의미는 [[K8s-Traffic-Entry-Helm-and-GitOps|K8s traffic entry, Helm과 GitOps]] 참조.
- **Helm CLI 릴리스와 Argo CD가 같은 리소스를 이중 관리** — helm upgrade와 컨트롤러가 서로의 변경을 되돌린다. 하나로 소유권을 통일한다.
- **prune 대상에 공유 리소스가 섞임** — 팀 공통 namespace나 CRD가 한 앱의 prune에 휩쓸려 다른 팀 워크로드까지 내려간다. AppProject의 리소스 화이트리스트로 미리 자른다.
- **`targetRevision: HEAD` 문자열만 보고 롤백 대상을 정함** — sync history에는 실제 resolved commit SHA가 남으므로 그 SHA를 고정점으로 써야 한다. branch 이름만으로는 어느 시점의 manifest인지 특정할 수 없다.
- **클러스터 1개짜리 규모에 도입** — 컨트롤러와 repo-server, Redis, SSO를 운영하는 부담이 얻는 것보다 크다. Helm과 스크립트로 충분한 구간이 있다.

## 면접 체크포인트

- pull 기반이 CI 자격증명 노출을 줄이는 메커니즘과 그 대가로 커지는 컨트롤러 ServiceAccount 권한 관리 책임
- sync status(Git 대비 diff)와 health status(실제 동작)의 차이, health check 없는 CRD가 만드는 오판
- ApplicationSet의 Matrix generator가 클러스터 x 서비스 조합에서 해결하는 문제
- AppProject의 `sourceRepos`, `destinations`, 리소스 화이트리스트로 팀 권한을 자르는 방법
- mutable tag가 아니라 digest나 commit SHA를 Git에 커밋해야 롤백이 성립하는 이유
- Argo CD가 죽었을 때의 우회 배포 경로, 그리고 UI 장애와 배포 장애를 구분하는 시각

## 출처
- [Argo CD, Architecture Overview](https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/)
- [Argo CD, Core Concepts](https://argo-cd.readthedocs.io/en/stable/core_concepts/)
- [Argo CD, Declarative Setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)
- [Argo CD, Resource Health](https://argo-cd.readthedocs.io/en/stable/operator-manual/health/)
- [Argo CD, Cluster Bootstrapping](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/)
- [Argo CD, ApplicationSet Generators](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/)
- [Argo CD, RBAC Configuration](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- [Argo CD, High Availability](https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/)
- [Argo CD, Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [Argo CD Image Updater, Update methods](https://argocd-image-updater.readthedocs.io/en/stable/basics/update-methods/)
- [CNCF, Argo project page](https://www.cncf.io/projects/argo/)
- [TOC welcomes Argo into the CNCF incubator — CNCF](https://www.cncf.io/blog/2020/04/07/toc-welcomes-argo-into-the-cncf-incubator/)

## 관련 문서
- [[K8s-Traffic-Entry-Helm-and-GitOps|GitOps 원리, sync 옵션과 Helm 운영 (정본)]]
- [[CICD-Tool-Selection|CD 도구 비교와 도입 의사결정]]
- [[Helm|Helm 차트]]
- [[Docker-Image-Pipeline|이미지 태그와 digest 파이프라인]]
- [[GitHub-Actions|CI 워크플로 구현]]
- [[Secret-Management|GitOps에서의 시크릿 주입]]
- [[Blue-Green|Blue-Green 배포]]
- [[Rollback|롤백 전략]]
- [[Deploy-Observability|배포 관측과 성공 판정]]
- [[K8s-Core-Workloads-and-Service|K8s 워크로드와 Service]]
- [[EKS|EKS]]
- [[IaC|IaC와 구성 드리프트]]
