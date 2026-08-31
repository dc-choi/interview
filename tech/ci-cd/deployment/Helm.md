---
tags: [cicd, kubernetes, helm, deployment, gitops]
status: done
verified_at: 2026-08-31
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Helm", "Helm Chart", "헬름"]
---

# Helm

Helm은 Kubernetes manifest를 **template으로 render**하고 그 결과를 **release**라는 이름으로 cluster에 기록하는 package manager다. 배포 순간에 한 번 apply하고 revision을 남길 뿐, 그 뒤에 발생하는 drift를 지속적으로 되돌리는 controller가 아니다. 이 경계를 먼저 잡아야 Helm과 GitOps controller의 역할 구분이 흐려지지 않는다. 이 문서의 명령과 flag는 **Helm 4.2.4 공식 문서 기준**이다.

## Chart 구조

| 경로 | 역할 | 주의점 |
|---|---|---|
| `Chart.yaml` | chart metadata (`apiVersion`, `version`, `appVersion`, `dependencies`) | `version`은 package 버전(SemVer 2), `appVersion`은 애플리케이션 안내용 metadata로 서로 무관 |
| `values.yaml` | chart 기본값 | 여기 값은 override의 최하단 |
| `values.schema.json` | values의 JSON Schema | type과 required field를 install 전에 검증 |
| `templates/` | Go template으로 render되는 manifest | `NOTES.txt`는 설치 후 안내문 |
| `templates/_helpers.tpl` | 공용 `define` 블록 (label, name 규칙) | 렌더 결과를 만들지 않는 partial |
| `charts/` | subchart 실체가 놓이는 자리 | `helm dependency update`가 채운다 |
| `crds/` | CRD 원본 YAML | template 처리되지 않고 다른 resource보다 먼저 설치 |

- `apiVersion: v2` chart부터 `dependencies` 필드와 library chart를 쓴다.
- `crds/`는 설치만 지원한다. 공식 문서는 의도치 않은 데이터 손실 위험 때문에 **CRD의 upgrade와 delete를 Helm이 지원하지 않는다**고 명시한다. CRD를 별도 chart로 분리하는 방식(Method 2)이 대안으로 제시된다.

## 값이 합쳐지는 순서

우선순위는 낮은 쪽부터 다음과 같다.

1. chart 자신의 `values.yaml`
2. subchart 값을 덮는 부모 chart의 values (`global`은 부모 것이 subchart 것보다 우선)
3. `-f`/`--values`로 준 values file — **여러 개를 주면 가장 오른쪽 파일이 우선**
4. `--set` 계열 CLI 인자

- subchart는 자기 namespace 아래 값만 보고, 부모 chart는 그 아래 값을 전부 볼 수 있다.
- 환경 override가 안 먹는 문제는 대부분 이 순서를 잘못 이해한 결과다. base 파일을 나중에 넘겨서 환경 파일을 덮어 버리는 실수가 특히 잦다.

## 렌더링 검증

- `helm lint` — chart 구조와 template 문법 검증
- `values.schema.json` — 값의 type과 필수 여부를 스키마로 강제
- `helm template` — cluster 없이 render 결과만 출력. 문법과 값 병합까지만 본다
- `--dry-run=server` — API server에 dry-run 요청을 보내 defaulting, schema validation과 admission chain을 검증한다. cluster 연결이 필요하며, side effect를 안전하게 억제하지 않는 admission webhook이 있으면 요청이 실패할 수 있다. 실제 적용의 대체는 아니다. `--dry-run=client`는 클라이언트 측 시뮬레이션만 수행
- CI에서는 완성된 render 결과를 산출물로 남기고 이전 리비전과 diff를 붙여 review한다. 값 몇 줄 변경이 어떤 manifest를 바꾸는지 사람 눈으로 확인할 수 있어야 한다

## 릴리스와 리비전

- release 정보는 기본적으로 **해당 release namespace의 Secret**에 저장된다. `HELM_DRIVER`로 `configmap`이나 `sql`(PostgreSQL) 백엔드로 바꿀 수 있다.
- 매 install과 upgrade마다 revision이 하나씩 쌓인다. `helm list`로 release 목록, `helm history`로 revision 이력, `helm get values`/`helm get manifest`로 특정 revision의 입력과 결과를 확인한다.
- `helm upgrade --install <release> <chart>` 관용구는 최초 배포와 재배포를 한 명령으로 처리한다. 공식 설명 그대로 해당 이름의 release가 없으면 install을 수행한다.

### 실패를 어떻게 다룰지 정하는 flag

| flag | 동작 |
|---|---|
| `--wait` | resource가 ready가 될 때까지 `--timeout`까지 대기. 전략은 `watcher`, `hookOnly`, `legacy` 중 선택 |
| `--timeout` | 개별 Kubernetes 작업(hook Job 포함) 대기 시간, 기본 5m0s |
| `--rollback-on-failure` | 실패 시 install은 uninstall, upgrade는 직전 성공 revision으로 rollback |
| `--cleanup-on-fail` | upgrade 전용. 실패한 upgrade가 새로 만든 resource를 삭제 |

Helm 4는 `--atomic`을 `--rollback-on-failure`로, `--force`를 `--force-replace`로 개명했다. 4.2.4에서 옛 이름은 deprecation 경고와 함께 동작하는 alias로 남아 있다. 새 스크립트는 바뀐 이름을 쓰고, Helm 3 스크립트를 옮길 때 경고와 동작을 확인한다.

## rollback이 되돌리는 것과 못 되돌리는 것

`helm rollback <release> [revision]`은 revision을 생략하면 직전 revision으로 되돌린다. 되돌아오는 것은 **Kubernetes resource의 상태**뿐이다.

- 되돌아오지 않는 것: DB 스키마 변경, 외부 시스템에 남긴 상태, 이미 소비된 메시지, 이미 발송된 알림
- CRD는 chart lifecycle에서 별도 취급이라 `crds/` 방식으로 설치한 CRD는 rollback 대상이 아니다
- rollback도 upgrade처럼 새 revision을 만든다. 이력이 사라지는 게 아니라 앞으로 쌓인다
- 따라서 스키마 변경은 Expand-Contract로 나눠 rollback 창을 스스로 만들어 둬야 한다 (자세한 내용은 [[Blue-Green#DB 스키마, 공유 상태의 난제|Expand-Contract 패턴]])

## 의존성과 umbrella chart

- `Chart.yaml`의 `dependencies`에 name, version, repository를 적고 `helm dependency update`로 `charts/`에 내려받는다. 이때 확정된 버전이 `Chart.lock`에 기록되고, `helm dependency build`는 그 lock 파일 기준으로 `charts/`를 재구성한다.
- `condition`과 `tags`로 subchart를 켜고 끄고, `alias`로 같은 chart를 두 번 넣을 수 있다.
- subchart 값은 subchart 이름 아래에 네임스페이스로 들어가고, 공통 값은 `global`로 내린다.
- 사내 표준 chart 한 벌을 만들고 서비스별로 values만 다르게 두는 구성이 흔하다. 대신 표준 chart 변경이 전 서비스에 파급되므로 chart도 semver로 관리하고 서비스별로 버전을 고정한다.

## 배포와 버전 고정

- chart는 HTTP chart repository 또는 **OCI registry**로 배포한다. `helm registry login`, `helm push mychart-0.1.0.tgz oci://<registry>/helm-charts`, `helm install ... oci://<registry>/helm-charts/mychart:<version>` 형태이며 tag 대신 `@sha256:...` digest로도 지정할 수 있다. 다만 공식 registry 문서 페이지에는 아직 Helm 4 기준으로 갱신되지 않았다는 경고가 붙어 있으므로(2026-08-31 확인) 실제 동작은 사용하는 버전에서 확인한다.
- 재현 가능한 릴리스는 **chart 버전과 컨테이너 이미지 digest를 함께 고정**해야 성립한다. chart만 고정하고 이미지는 `latest`를 쓰면 같은 chart 버전이 시점마다 다른 결과를 만든다 (이미지 태그 전략은 [[Docker-Image-Pipeline|Docker 이미지 파이프라인]])

## Hook과 실행 순서

- 이벤트: `pre-install`, `post-install`, `pre-upgrade`, `post-upgrade`, `pre-delete`, `post-delete`, `pre-rollback`, `post-rollback`, `test`
- `helm.sh/hook-weight`로 순서를 정한다. 문서 기준 정렬은 weight(기본 0), resource kind, 이름 순 오름차순이며 순차 실행이다. Job과 Pod는 완료까지 기다린다
- `helm.sh/hook-delete-policy`는 `before-hook-creation`(기본), `hook-succeeded`, `hook-failed`
- 경계: hook은 마이그레이션 Job처럼 릴리스에 종속된 작업에 쓴다. 배포 절차 전체를 hook에 밀어 넣으면 chart가 읽히지 않는 명령형 스크립트가 되고, 실패 시 어디까지 진행됐는지 추적이 어려워진다

## 환경별 values 운영

- 환경 파일에는 **차이만** 둔다. base values를 통째로 복사한 환경 파일은 곧 서로 어긋난다
- `--set` 난립을 막는다. CLI 인자는 Git에 남지 않아 review도 재현도 불가능하다. override는 버전 관리되는 values file로 표현한다
- 시크릿은 values 파일과 release history 어디에도 평문으로 두지 않는다. release는 Secret에 저장되지만 그것은 base64 인코딩일 뿐 암호화가 아니다 (주입 전략은 [[Secret-Management|시크릿 관리]])

## Helm과 GitOps의 역할 경계

Helm은 **render와 release 기록**을 담당하고, 승인된 상태로 cluster를 계속 수렴시키는 일은 GitOps controller의 몫이다. 두 계층을 섞으면 누가 desired state의 주인인지 모호해진다. GitOps 원리, auto-sync와 selfHeal, sync wave 같은 내용은 [[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes traffic entry, Helm과 GitOps]]에 정리돼 있다. CD 도구 선택 기준은 [[CICD-Tool-Selection|CI/CD 도구 선택]]을 참고한다.

## 흔한 실수

- **프로덕션을 `--set`으로 override** — 무엇이 반영됐는지 Git에서 확인할 수 없다
- **chart 버전 미고정** — 같은 명령이 시점마다 다른 chart를 가져와 재현이 깨진다
- **values에 시크릿 평문** — release history에 그대로 박혀 revision을 지우기 전까지 남는다
- **CRD를 일반 resource처럼 취급** — `crds/`는 upgrade와 delete가 지원되지 않는다
- **rollback을 만능 복구로 오해** — 데이터와 외부 시스템 상태는 되돌아오지 않는다
- **`--wait` 없이 배포하고 성공으로 간주** — Pod가 CrashLoopBackOff로 들어가도 명령은 이미 끝나 있다

## 면접 체크포인트

- chart `version`과 `appVersion`의 차이, 왜 둘을 분리하는지
- values 병합 우선순위와 `-f`를 여러 번 줬을 때의 승자
- `helm template`과 `--dry-run=server`가 각각 검증하는 범위의 차이
- `helm rollback`이 되돌리지 못하는 것과 그때 필요한 스키마 전략
- release가 어디에 어떤 형태로 저장되는지, 그것이 시크릿 취급에 주는 함의
- Helm과 GitOps controller의 역할 구분

## 출처
- [Helm, Charts](https://helm.sh/docs/topics/charts/)
- [Helm, Chart Hooks](https://helm.sh/docs/topics/charts_hooks/)
- [Helm, Custom Resource Definitions](https://helm.sh/docs/chart_best_practices/custom_resource_definitions/)
- [Helm, Storage backends](https://helm.sh/docs/topics/advanced/)
- [Helm, Use OCI-based registries](https://helm.sh/docs/topics/registries/)
- [Helm, helm upgrade](https://helm.sh/docs/helm/helm_upgrade/)
- [Helm, helm rollback](https://helm.sh/docs/helm/helm_rollback/)
- [Helm, Helm 4 Overview](https://helm.sh/docs/overview/)
- [Helm 3 End of Life — Helm](https://helm.sh/blog/helm-v3-end-of-life/)
- [Kubernetes Docs, API Concepts - Dry-run](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)

## 관련 문서
- [[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes traffic entry, Helm과 GitOps]]
- [[K8s-Core-Workloads-and-Service|K8s 워크로드와 Service]]
- [[CICD-Tool-Selection|CI/CD 도구 선택]]
- [[Docker-Image-Pipeline|Docker 이미지 파이프라인]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[Blue-Green|Blue-Green 배포]]
- [[Secret-Management|시크릿 관리]]
- [[EKS|EKS]]
- [[ArgoCD|ArgoCD (GitOps)]]
- [[Rollback|Rollback 전략]]
- [[DB-Migration|DB 마이그레이션 전략]]
