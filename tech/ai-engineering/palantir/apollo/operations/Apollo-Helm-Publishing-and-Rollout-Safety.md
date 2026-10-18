---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo Helm 게시와 Rollout 안전성

## 이미지와 배포 정의를 함께 버전 관리한다

Apollo는 registry에 불변 버전 Helm chart를 게시하는 모델을 요구한다. 같은 image tag만 같고 환경별 branch/folder의 chart가 다르면 배포 정의가 달라져 동일 release의 의미가 흐려진다. 환경 차이는 values/config로 표현하고 chart 자체는 고정해 recall과 fleet 비교가 가능한 단위를 만든다.

CI 흐름은 image build/push, chart package/push, Apollo metadata init/create 순이다. Hub에서 CLI를 받거나 CI image에 포함할 수 있다. 인증은 token 또는 service client 자격 증명 중 하나를 CI secret으로 전달한다. 공식 CI 예제의 오래된 Docker/Helm image나 shell 문법을 그대로 현재 권장 버전으로 간주하지 않는다.

Apollo Product version과 Helm chart version은 다를 수 있지만 일치시키는 편이 추적하기 쉽다. Helm의 일반 SemVer보다 Apollo orderable 형식이 좁으므로 tag 전략을 확인한다. 최신 변경 이력은 CLI0.871.0부터 Helm pull에 OCI scheme을 요구한다. 구형 실습의 https Helm repository 예제와 CLI 동작을 혼용하지 않는다. UI 게시 workflow가 나열한 HTTPS 선택과 CLI의 OCI-only 조건은 구분한다.

CLI0.814.0 이상은 `.config.tgz` 안의 values.yaml과 선택 schema를 함께 읽는다. split 파일이면 default-config와 config-schema로 명시한다. 게시 성공은 registry에 chart/image가 존재하거나 Spoke가 접근 가능함을 증명하지 않는다.

## 두 rollout 전략

manageRollout은 Kubernetes 변경을 적용하고 모든 자원이 ready가 되기를 기다린다. apply 실패나 readiness timeout이면 변경을 rollback하고 Plan을 실패로 보고한다. applyChangesNoWait는 apply 성공 직후 Plan을 성공으로 처리하므로 나중에 Pod가 ready가 되지 않아도 그 사유로 Plan을 실패시키지 않는다. apply 자체 실패는 이 전략에서도 rollback한다.

Helm install/upgrade와 hook에는 별도5분 timeout이 있다. resource-readiness-timeout은 apply 후 ready 대기만 조정하며 hook 시간을 늘리지 않는다. operator의 install/upgrade별 기본 timeout을 제품 manifest가 재지정할 수 있다. applyChangesNoWait에는 이 ready timeout을 같이 쓰지 않는다.

image pre-pull은 Pod 시작 때 느린 pull로 가용성이 떨어지는 것을 줄인다. 기본 활성화와15분 timeout이며 operator 전체 또는 제품별1~90분 timeout으로 조정한다. preload 성공, Helm apply 성공, resource readiness와 서비스 custom health는 서로 다른 신호다.

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
- [Palantir, publishing-helm-charts](https://www.palantir.com/docs/apollo/managing-products/publishing-helm-charts) — values/schema TGZ, CLI0.814와 orderable/registry 조건.

## 관련 문서

- [[Apollo-CLI-Releases-and-Modules]]
- [[Apollo-Orchestration-and-Constraints]]
- [[Apollo-Environment-Setup-and-Registries]]
