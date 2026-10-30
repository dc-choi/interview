---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo 환경 준비와 Artifact Registry

## 연결 전 조건

2026-10-16 공식 prerequisites 기준 Spoke는 CNCF 인증 Kubernetes 배포판과 커뮤니티 지원 버전을 전제로 한다. compute node 최소 3개, control plane용 총 10vCPU/16GB 권장, x86_64 node, node 간 통신, 기본 storage class와 PV provisioning이 필요하다. 초기 설치를 위한 같은 환경의 instance에 root 접근이 필요하며 Helm 관리 control plane은 wildcard Kubernetes RBAC를 요구한다. 단순 읽기 권한 agent라고 가정하지 않는다.

Hub allowlist에는 클러스터 egress IP와 필요 시 사내 CI egress IP를 등록한다. Hub 구축은 URL, SAML/SSO provider metadata, 인증과 팀 권한을 맞추는 별도 과정이다. local kind 예시는 학습용이고 운영 배포판의 sizing이나 보안 기준을 대신하지 않는다.

환경 생성은 이름/불변 ID, 연결 방식, control-plane Module 또는 blank 환경, contact team, 초기 roles와 registry를 정한다. blank는 agent를 별도로 설치해야 관리할 수 있다. 초기 manifest로 helm-chart-operator를 설치한 뒤 control-plane 보고와 Hub 연결을 확인한다. contact team은 선택값이며 운영 책임을 켜면 제품 contact team으로, 끄면 환경 contact team으로 알림을 보낸다.

## registry 등록과 환경 할당

Artifact Registry는 Apollo catalog와 별개의 실제 OCI artifact 저장소다. URL은 registry.domain:port 형식이며 기본443, Hub 안에서 유일해야 한다. 무인증 공개 OCI, basic auth OCI와 ECR 인증을 지원한다. ECR은 IAM access key/secret과 선택 FIPS 설정을 받는다. 저장한 credential은 다시 볼 수 없고 수정 대신 교체한다. 초기 역할은 생성 후 5분 안에 지정한다.

registry를 등록한 것과 환경에 할당한 것은 다르다. 할당 CR이 승인되고 agent install Plan이 성공해 연결이 Pending에서 Connected로 바뀌어야 그 환경이 사용할 수 있다. Assigner 권한과 환경 관련 권한을 대조한다. 갱신은 revision을 만들므로 Hub registry revision과 환경에서 반영한 revision을 비교한다. Disconnected에서는 credential과 네트워크를 확인한다.

할당을 점검할 때는 다음 순서로 승인 상태와 환경 반영 상태를 구분한다.

1. 환경의 Settings > Artifact Registry에서 현재 할당 목록을 확인한다. Add Artifact Registry에서 여러 registry의 추가와 제거를 준비하고 Submit하면 변경을 함께 제출한다.
2. 생성된 CR은 Assigner RBAC 역할을 가진 팀의 사용자가 승인한다. 제출만으로 환경 연결이 완료된 것은 아니다.
3. 환경의 Activity에서 registry의 install, change version과 uninstall Plan을 확인한다. Install Plan 완료 뒤 환경 개요 또는 Hub 설정의 Artifact Registries에서 Pending이 Connected로 바뀌었는지 확인한다.
4. Disconnected이면 할당이 성공하지 않은 상태다. 공식 안내는 자격 증명 문제를 유력 원인으로 들며 다시 입력해 해결되는지 확인하도록 한다. 다른 원인이 없다고 단정하지 않는다.

이 순서는 2026-10-30 할당 공식 문서의 UI와 상태 전이를 대조한 것이다. 실제 연결을 실행하지 않았고 다른 환경 구성의 재검증은 아니므로 frontmatter의 검증일은 유지한다.

mirror는 manifest가 가리키는 원 registry 대신 지정 registry에서 pull하도록 해석을 바꾼다. 같은 원 registry를 여러 Artifact Registry가 동시에 mirror하면 하나를 고르는 동작이 정의되지 않으므로 겹치지 않게 한다.

helm-chart-operator의 선택 admission webhook은 namespace의 apollo.palantir.com/env-id label 범위에서 일반 Pod와 hook/dynamic Pod에도 registry replacement와 imagePullSecret 주입을 적용한다. API server가 webhook TCP9111에 도달해야 한다. Pod별 skip-registry-mutation label로 제외할 수 있다.

## namespace와 배포 전 준비

namespace 관리 UI는 k8s-namespace-agent가 보고한 뒤 보이며 먼저 operator/auth-broker 보고가 필요하다. 이름은 RFC1123 DNS label이어야 한다. 기본 삭제 보호를 CR/Plan으로 먼저 해제하고, 설치된 엔티티를 제거한 뒤 삭제 표시를 승인한다. 보호 해제 제안과 실제 반영은 다르다.

엔티티를 만든 뒤 namespace는 바꿀 수 없다. 같은 제품을 여러 namespace에 설치하려면 이름이 다른 엔티티를 만든다. 새 환경은 namespace, registry, instance group, ingress/egress를 먼저 준비하고 환경마다 달라지는 registry/namespace/CA/region은 Module variable 또는 secret으로 전달한다.

## 출처

- [Palantir, set-up-your-apollo-hub](https://www.palantir.com/docs/apollo/apollo-getting-started/set-up-your-apollo-hub) — Hub URL, egress allowlist와 SAML provider 설정.
- [Palantir, connect-spoke](https://www.palantir.com/docs/apollo/core/connect-spoke) — 기존 클라우드 클러스터와 테스트용 로컬 선택.
- [Palantir, set-up-local-kubernetes-cluster](https://www.palantir.com/docs/apollo/core/set-up-local-kubernetes-cluster) — local kind multi-node는 개발용.
- [Palantir, spoke-control-plane](https://www.palantir.com/docs/apollo/core/spoke-control-plane) — control-plane 역할과 선택 Pod mutation webhook.
- [Palantir, assign-artifact-registry](https://www.palantir.com/docs/apollo/managing-artifact-registries/assign-artifact-registry) — registry assign 승인, 일괄 제출과 Activity의 Plan/Connected 확인. 2026-10-30 추가 대조.
- [Palantir, create-artifact-registry](https://www.palantir.com/docs/apollo/managing-artifact-registries/create-artifact-registry) — URL 유일성, credential 교체와 revision.
- [Palantir, mirrored-artifact-registries](https://www.palantir.com/docs/apollo/managing-artifact-registries/mirrored-artifact-registries) — mirror 중복은 동작 정의 없음.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-artifact-registries/overview) — 외부 OCI, basic/no-auth와 ECR 통합.
- [Palantir, best-practices](https://www.palantir.com/docs/apollo/managing-environments/best-practices) — Module 활용과 one-time 환경 준비.
- [Palantir, connect-new-environment](https://www.palantir.com/docs/apollo/managing-environments/connect-new-environment) — 환경 생성, control-plane Module과 manifest 연결.
- [Palantir, editing-environment-management-settings](https://www.palantir.com/docs/apollo/managing-environments/editing-environment-management-settings) — 불변 환경 ID와 운영 책임 라우팅.
- [Palantir, spoke-environment-prerequisites](https://www.palantir.com/docs/apollo/managing-environments/spoke-environment-prerequisites) — node/CPU/memory/architecture/network/RBAC 전제.
- [Palantir, create-delete-k8s-namespace](https://www.palantir.com/docs/apollo/managing-k8s-namespaces/create-delete-k8s-namespace) — namespace agent 보고, 보호 해제와 제거 순서.
- [Palantir, install-entity-in-k8s-namespace](https://www.palantir.com/docs/apollo/managing-k8s-namespaces/install-entity-in-k8s-namespace) — 엔티티 namespace는 생성 후 변경 불가.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-k8s-namespaces/overview) — namespace lifecycle 기능.
- [Palantir, managing-artifact-registries](https://www.palantir.com/docs/apollo/managing-artifact-registries) — registry 부모 문서의 통합 범위.
- [Palantir, managing-k8s-namespaces](https://www.palantir.com/docs/apollo/managing-k8s-namespaces) — namespace 부모 문서의 lifecycle 범위.

## 관련 문서

- [[Apollo-Hub-Spoke-and-Environment-State]]
- [[Apollo-Entity-Configuration-and-Lifecycle]]
