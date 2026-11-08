---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-11-09
category: AI Engineering
aliases: []
---

# Apollo Helm 게시와 Rollout 안전성

## 이미지와 배포 정의를 함께 버전 관리한다

Apollo는 registry에 불변 버전 Helm chart를 게시하는 모델을 요구한다. 같은 image tag만 같고 환경별 branch/folder의 chart가 다르면 배포 정의가 달라져 동일 release의 의미가 흐려진다. 환경 차이는 values/config로 표현하고 chart 자체는 고정해 recall과 fleet 비교가 가능한 단위를 만든다.

CI 흐름은 image build/push, chart package/push, Apollo metadata init/create 순이다. Hub에서 CLI를 받거나 CI image에 포함할 수 있다. 인증은 token 또는 service client 자격 증명 중 하나를 CI secret으로 전달한다. 공식 CI 예제의 오래된 Docker/Helm image나 shell 문법을 그대로 현재 권장 버전으로 간주하지 않는다.

Apollo Product version과 Helm chart version은 다를 수 있지만 일치시키는 편이 추적하기 쉽다. Helm의 일반 SemVer보다 Apollo orderable 형식이 좁으므로 tag 전략을 확인한다. 최신 변경 이력은 CLI0.871.0부터 Helm pull에 OCI scheme을 요구한다. 구형 실습의 https Helm repository 예제와 CLI 동작을 혼용하지 않는다. UI 게시 workflow가 나열한 HTTPS 선택과 CLI의 OCI-only 조건은 구분한다.

CLI0.814.0 이상은 `.config.tgz` 안의 values.yaml과 선택 schema를 함께 읽는다. split 파일이면 default-config와 config-schema로 명시한다. 게시 성공은 registry에 chart/image가 존재하거나 Spoke가 접근 가능함을 증명하지 않는다.

### 게시되는 것은 metadata와 기본 설정이다

Helm chart Product Release 게시는 Apollo에 manifest와 함께 묶은 values.yaml, values.schema.json을 올리고, chart와 image 바이너리는 올리지 않는다. image는 조직의 image repository에 있어야 하고 각 Spoke가 그 repository에서 pull할 수 있어야 한다. chart도 manifest가 가리키는 repository에 계속 남아 있어야 Apollo가 배포할 수 있다. 문서가 직접 쓰지는 않았지만, 게시 뒤 그 chart 버전을 지우거나 옮기면 그 버전을 다시 pull해야 하는 이후의 install, upgrade와 rollback Plan이 실패할 수 있다고 추론할 수 있다.

UI 게시는 Products 화면에서 기존 Helm chart Product를 골라 새 Release를 만든다. Group ID와 Artifact ID는 Product metadata에서 채워진다. UI 문서는 Release version을 `1.2.3`이나 `1.2.3-rc1` 같은 SemVer 형식이라고 설명하지만, Apollo가 받는 것은 그보다 좁은 orderable version(release, rc와 각 snapshot 형태)이다. 두 예시는 모두 orderable이고, 버전 명세는 그 밖의 문자열을 Apollo가 지원하지 않는다고 적으므로 `1.2.3-alpha.1`이나 build metadata를 붙인 SemVer는 쓰지 않는다. 게시 유형은 OCI repository와 Helm repository 중 하나이며 URL은 각각 `oci://`, `https://`로 시작해야 한다. 선택 항목인 OCI artifacts에는 이 Release와 연결할 OCI artifact URI를 더한다. Product가 아직 없으면 Release보다 Product 생성이 먼저다.

공식 예시는 chart와 image repository 인증 정보를 Kubernetes Secret으로 두고 `apollo.palantir.com/artifact-store` label 값에 repository host(예시는 `docker.io`와 `charts.bitnami.com`)를 적는다. `charts.bitnami.com` 예시는 HTTPS 방식 chart repository라서 CLI의 OCI-only 조건과 함께 본다. 인증은 username과 password를 함께 주거나 cert와 key를 함께 주는 방식이며, 예시에는 cert 인증 쪽에 선택 항목 ca가 함께 나온다. Secret의 namespace는 chart를 설치할 namespace와 같아야 한다.

manifest의 `extensions.product-dependencies`는 의존 제품을 나열한다. 게시 문서의 YAML 예시 주석은 `product-group`, `product-name`, `minimum-version`, `maximum-version`을 required로 표시하고, `recommended-version`을 생략하면 하한과 같으며 `optional`의 기본값은 false라고 적는다. 하한은 orderable version, 상한은 `1.x.x` 같은 version matcher이며 둘 다 포함 범위다. 반면 의존성 명세 본문은 최소, 최대 버전을 optional 제약으로 설명하므로 필수 여부를 한쪽으로 단정하지 않는다. 이 차이와 범위 비교의 세부는 [[Apollo-Product-Release-Contract]]에 둔다. Hub에서 취약점 스캔을 켰다면 chart가 쓰는 container image를 `artifacts` manifest extension으로 알려야 한다. primary organization 밖의 enrollment에 Release를 만들 때는 CLI에 `--space-id`를 더한다.

## 두 rollout 전략

manageRollout은 Kubernetes 변경을 적용하고 모든 자원이 ready가 되기를 기다린다. apply 실패나 readiness timeout이면 변경을 rollback하고 Plan을 실패로 보고한다. applyChangesNoWait는 apply 성공 직후 Plan을 성공으로 처리하므로 나중에 Pod가 ready가 되지 않아도 그 사유로 Plan을 실패시키지 않는다. apply 자체 실패는 이 전략에서도 rollback한다.

Helm install/upgrade에는 hook 실행을 포함한 별도의 5분 timeout이 있다. `resource-readiness-timeout`은 managed rollout에서 apply 후 ready 대기만 조정하며 Helm 작업이나 hook 시간을 늘리지 않는다. `applyChangesNoWait`는 이 readiness 대기 단계를 생략하지만 Helm 작업의 timeout은 남는다.

image pre-pull은 Pod 시작 때 느린 pull로 가용성이 떨어지는 것을 줄인다. 기본 활성화와 15분 timeout이며 operator 설정 또는 제품 manifest에서 조정한다. 1~90분 제한은 문서가 명시한 제품별 timeout의 범위다. preload 성공, Helm apply 성공, resource readiness와 서비스 custom health는 서로 다른 신호다.

### 설정 위치와 우선순위

2026-10-30 공식 rollout 문서로 아래 설정을 부분 대조했다. 게시 CLI와 registry 조건의 검증 날짜는 갱신하지 않았다.

| 대상 | operator 설정 | 제품별 설정과 적용 범위 |
|---|---|---|
| rollout 전략 | `capabilities.defaultRolloutStrategy` | manifest extension의 `rollout-strategy`, 초기화 CLI의 `--rollout-strategy` |
| install readiness | `capabilities.scopedResourceReadinessTimeouts.install` | manifest extension의 `resource-readiness-timeout`이 operator 기본값보다 우선 |
| version/config 변경 readiness | `capabilities.scopedResourceReadinessTimeouts.upgrade` | 같은 제품별 readiness 값으로 재지정, 초기화 CLI는 `--resource-readiness-timeout` |
| image pre-pull | `capabilities.imagePrePullEnsurer.enabled`, `capabilities.imagePrePullEnsurer.timeout` | manifest extension의 `image-pre-pull-config.timeout`, 제품별 1~90분 |

`manageRollout`이 기본 전략이며 운영 환경에 권장된다. 초기 디버깅에서 `applyChangesNoWait`를 쓰면 apply 뒤 준비되지 않은 자원도 남겨 원인을 볼 수 있지만, Plan 성공을 서비스 정상화로 해석하면 안 된다. timeout을 늘리기 전에 pre-pull, Helm apply와 hook, readiness 중 실패한 단계를 확인한다.

## 운영 확인 순서

1. CI에서 registry artifact와 metadata를 각각 게시했는지 확인한다.
2. 환경에 registry가 할당되어 실제 revision이 반영되었는지 본다.
3. 채널에 release가 있고 지원 override와 의존성을 충족하는지 본다.
4. Plan의 blocking constraint와 apply/ready 실패 단계를 확인한다.
5. Kubernetes Events/logs, Helm history와 custom health로 실제 서비스 결과를 확인한다.

이 문서는 공식 계약을 읽어 만든 지식이며 CI, cluster나 Hub에 게시/배포한 실험은 수행하지 않았다.

## 출처

- [Palantir, experimental-end-to-end-workflow](https://www.palantir.com/docs/apollo/apollo-references/experimental-end-to-end-workflow) — 실험적 end-to-end 순서와 자동 CR 승인 전제.
- [Palantir, ci-publish-setup](https://www.palantir.com/docs/apollo/core/ci-publish-setup) — CI image/chart/metadata 세 단계와 인증.
- [Palantir, helm-rollouts](https://www.palantir.com/docs/apollo/core/helm-rollouts) — rollout 두 전략, Helm/ready timeout과 pre-pull.
- [Palantir, publishing-versioned-helm-charts](https://www.palantir.com/docs/apollo/core/publishing-versioned-helm-charts) — 불변 chart registry와 환경별 정의 drift 방지.
- [Palantir, publishing-helm-charts](https://www.palantir.com/docs/apollo/managing-products/publishing-helm-charts) — values/schema TGZ, CLI0.814와 orderable/registry 조건, 2026-11-09 UI 게시 항목, artifact-store Secret, 의존성 필드와 metadata 게시 범위 대조.
- [Palantir, product-versions](https://www.palantir.com/docs/apollo/apollo-product-specification/product-versions) — orderable version 형태와 그 밖의 문자열 미지원, 2026-11-09 확인.
- [Palantir, product-dependencies](https://www.palantir.com/docs/apollo/apollo-product-specification/product-dependencies) — 최소, 최대 버전을 optional 제약으로 설명, 2026-11-09 확인.

## 관련 문서

- [[Apollo-CLI-Releases-and-Modules]]
- [[Apollo-Orchestration-and-Constraints]]
- [[Apollo-Environment-Setup-and-Registries]]
