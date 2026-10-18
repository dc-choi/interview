---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo 릴리스 승격, 단계 배포와 Recall

## 채널과 자동 승격

Release Channel은 릴리스 집합이며 그 자체로 고정 계층이 없다. 하나의 릴리스가 여러 채널에 속할 수 있다. 기본 DEV/RELEASE_CANDIDATE/RELEASE는 버전 유형으로 자동 소속을 정한다. release는 셋 모두, RC는 DEV와 RELEASE_CANDIDATE, snapshot 등은 DEV에 들어간다. custom 채널을 pipeline으로 연결해 조직의 승격 순서를 만든다.

채널 label 요구사항은 **입장 시점**에 수동/자동 승격 모두 검사한다. 들어간 뒤 label이 바뀌어도 자동으로 제거하지 않는다. built-in 채널에는 label 요구사항을 지원하지 않는다. 단순 label 존재와 특정 값 요구는 다르다.

Timed stage는 source에 머문 기간과 label을 평가하고 Canary stage는 label/명시 환경 선택/제외로 모은 엔티티에서 건강, 최소 수와 soak 조건을 평가한다. Product window와 target label 조건도 필요하다. Product 기본 pipeline은 timed/canary, Module 기본은 timed만 지원한다. Hub default 변경은 기존 설정에 소급하지 않는다.

## 건강 평가의 함정

승격 이력과 현재 보안 검사 결과는 별도로 읽는다. 2023년 공식 데모의 02:25 화면에는 모든 승격 단계 통과와 보안 검사 실패가 함께 표시된다. 승격 완료는 두 달 전, 취약점 탐지는 16시간 전으로 시점도 다르다. 이 화면만으로 승격 당시 보안 조건을 우회했다고 판단할 수 없으며, 과거 승격 성공을 현재 취약점 부재의 증거로 사용할 수도 없다. [Apollo 배포 데모](https://www.youtube.com/watch?v=XmLVuZKd2L0&t=145s) (2026-10-18 전사와 해당 화면 대조)

custom health가 없는 Helm chart는 liveness와 시간으로 성공할 수 있지만 unhealthy로 판정해 자동 recall하는 평가에는 부족하다. live인 구간을 healthy로, 그 밖을 healthy도 unhealthy도 아닌 시간으로 취급하므로 승격 성공 또는 지속 평가는 가능해도 이 health 조건으로 실패하지 않는다.

healthy 구간은 모든 node가 live이고 HEALTHY/DEFERRING, unhealthy 구간은 live node 중 ERROR가 있는 기간이다. WARNING/REPAIRING/SUSPENDED/TERMINAL은 어느 쪽에도 더하지 않는다. 따라서 healthy+unhealthy가 전체 soak보다 작을 수 있다. custom health spec의 네 상태와 promotion이 이해하는 추가 내부 상태를 구분한다. 기본 healthy/unhealthy 비율은0.95/0.05이고 해당 기간 계산은 주말을 빼며 실제 Hub 설정을 확인한다.

평가는 기본 매분이지만 조정 가능하다. canary 엔티티는 평가 중 suppression으로 버전을 붙잡는다. 평가 대상이 없으면 pause할 수 있고 더 새 버전에 밀려 엔티티가 없어지면 superseded 평가도 pause한다. timeout은 soak의2배 평일 시간, canary 버전 도달 대기7일, 전체30달력일이다. source의 최신 non-recalled release라 다음 후보가 없으면 soak timeout을 끈다.

## 승격과 배포 속도를 따로 제어한다

Ramped rollout은 채널 안 업그레이드를 시간창에 나눠 실행한다. 설치, 제거, config, rollback, recall roll-off와 command에는 적용하지 않는다. 순서는 비결정적이며 canary도 우선하지 않아 마지막에 바뀔 수 있다. 각 Hub가 자기 fleet 크기로 속도를 계산하고 maintenance closure 동안 멈추므로 특정 엔티티의 실행 시각은 보장하지 않는다.

진행 중 enable/disable은 남은 엔티티에 즉시 적용되지만 duration 변경은 다음 release부터 적용된다. 수동 승격은 기존 release의 채널 복사, pipeline 특정 단계까지 fast track, 전체 또는 임의 채널을 고를 수 있다. label은 지켜야 하며 실제 Entity upgrade는 여전히 제약을 평가한다. 수동 승격은 Product maintenance window의 예외다.

## Recall 범위와 복구 전략

open-ended는 시작 버전 이상인 미래 릴리스까지 포함한다. 수정 릴리스가 나왔다면 recall을 해제하기보다 상한 미포함 closed 범위로 바꾼다. backport 수정 release를 범위에서 제외할 수 있다. single은 특정 하나다. 검색 UI의 RC/snapshot 필터는 recall 범위 자체를 바꾸지 않는다.

기본 roll-forward는 추적 채널의 non-recalled 후보 중 최소 버전 이상을 기다린다. 후보가 없으면 문제가 있는 현재 버전에 남을 수 있다. downgrade 허용은 전진 불가 시 최소선 이상의 이전 버전도 허용하되 가능한 최신 후보를 우선한다. freeze는 만료까지 버전 변경을 막고, test environments 전략은 지정 환경에만 먼저 roll-off한다.

Recall 발행은 즉시 정책을 바꾸지만 실제 복구는 다른 제약을 통과해야 한다. 긴급 command는 별도다. maintenance window는 기본 무시하지만 환경 opt-in으로 지키게 할 수 있다. recall revert는 기존 문제가 있는 버전을 다시 적격으로 만들며 모든 엔티티를 예전 버전으로 되돌리지 않는다. Module recall은 자동으로 설치를 다른 버전으로 옮기지 않는 별도 계약이다. CVE-only recall 후보로 보안 위험을 유지/낮추는 예외 upgrade는 별도 Hub 기능이다.

## 출처

- [Palantir, introduction-promotion](https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-promotion) — 채널 구독과 승격의 hands-on 흐름.
- [Palantir, introduction-recall](https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-recall) — 문제 release recall과 기본 roll-forward.
- [Palantir, release-channels](https://www.palantir.com/docs/apollo/core/release-channels) — 기본 채널, Hub default와 세 timeout.
- [Palantir, product-release-labels](https://www.palantir.com/docs/apollo/managing-labels/product-release-labels) — Release label 존재/값 요구.
- [Palantir, ramped-rollouts](https://www.palantir.com/docs/apollo/managing-products/ramped-rollouts) — ramp는 upgrade만, 비결정 순서와 진행 중 설정 변경.
- [Palantir, tracking-product-releases](https://www.palantir.com/docs/apollo/managing-products/tracking-product-releases) — 평가/pause/recall 상태와 자동 canary suppression.
- [Palantir, managing-release-channels](https://www.palantir.com/docs/apollo/managing-release-channels) — 채널 관리 부모 경로의 역할 분리.
- [Palantir, configure-promotion-pipeline](https://www.palantir.com/docs/apollo/managing-release-channels/configure-promotion-pipeline) — Timed/canary 조건, health 없는 경우와 Hub defaults.
- [Palantir, create-custom-release-channel](https://www.palantir.com/docs/apollo/managing-release-channels/create-custom-release-channel) — label은 admission-only, built-in 채널 예외.
- [Palantir, manual-promotion](https://www.palantir.com/docs/apollo/managing-release-channels/manual-promotion) — 수동 승격 전략과 영향 검토.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-release-channels/overview) — 제품 creator와 환경 editor의 역할 분리.
- [Palantir, recalling-releases](https://www.palantir.com/docs/apollo/recalling-releases) — recall 부모 경로의 rollout 차단과 복구.
- [Palantir, overview](https://www.palantir.com/docs/apollo/recalling-releases/overview) — 수동/자동 recall과 CVE 예외 안내.
- [Palantir, recall-ranges](https://www.palantir.com/docs/apollo/recalling-releases/recall-ranges) — open, closed, exclusion과 single 범위.
- [Palantir, recall-release](https://www.palantir.com/docs/apollo/recalling-releases/recall-release) — 범위 편집/해제의 효과와 maintenance 예외.
- [Palantir, roll-off-strategies](https://www.palantir.com/docs/apollo/recalling-releases/roll-off-strategies) — 전진, downgrade, freeze와 부분환경 테스트.

## 관련 문서

- [[Apollo-Orchestration-and-Constraints]]
- [[Apollo-Vulnerability-Scanning-and-Remediation]]
