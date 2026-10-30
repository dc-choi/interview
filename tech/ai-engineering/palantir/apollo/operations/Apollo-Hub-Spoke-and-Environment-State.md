---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo Hub, Spoke와 환경 상태

## 배포 단위와 실행 주체

Apollo는 제품팀의 릴리스 계약, 운영자의 채널 구독과 제약, agent가 보고한 실제 상태를 결합해 배포를 조정한다. Product는 배포 가능한 소프트웨어, Release는 불변 버전, Entity는 한 Environment의 설치다. Entity는 한 환경에만 속한다. Hub도 환경이며 스스로 또는 다른 Hub의 관리를 받을 수 있어 Hub/Spoke 계층 구성이 가능하다.

Hub의 Orchestration Engine은 catalog, settings와 Reported State를 읽어 Plan을 제안한다. Spoke agent는 Hub를 polling해 실행하고 결과/상태를 보고한다. 단일 고정 버전을 계속 강제하는 모델 대신 채널과 제약이 허용하는 가장 최신 후보를 찾는다.

- helm-chart-operator는 Helm 엔티티와 다른 control-plane 서비스를 관리하고 먼저 설치된다.
- apollo-auth-broker는 Hub, Spoke와 registry 사이의 인증 재료를 중개한다.
- expected-state-k8s는 Kubernetes 자원 모델을 Apollo 상태로 바꾸고 health를 보고한다.
- agent는 암호화된 outbound 요청으로 Hub와 선언 registry에 연결한다. 등록 시 환경별 keypair와 Hub 서명 certificate를 사용한다. HTTP proxy 환경은 HTTPS_PROXY/NO_PROXY를 설정한다.

## 선언 상태와 관측 상태

Entity settings는 관리할 제품, 구독 채널과 운영 조건을 담고 Reported State는 버전, 구성과 건강 등 실제 관측값이다. 둘 다 있는 엔티티는 managed이며 관측값만 있는 엔티티는 보이지만 Plan을 발행하지 않는 unmanaged다. 관리하지 않는 소프트웨어를 CLI로 수동 보고했던 과거 workflow는 자동 최신화가 아니었다. 그 가이드의 add-unmanaged-service 명령은 2026-04-30 변경 이력에서 CLI 0.752.0 제거 대상으로 확인되므로 현재 대안으로 제시하지 않는다.

## 연결 방식과 편집 원본은 별도 축이다

| 연결 설정 | 직접 agent / Plan | 상태 표시와 승격 |
|---|---|---|
| Connected agents | 허용 / 발행 | 실시간 보고, 보고 공백은 장애, 승격 가능 |
| Intermittent agents | 허용 / 발행 | 마지막 연결 상태, 예정된 공백 허용, 승격 가능 |
| No connection expected | 불허 / 미발행 | 해당 Hub에 health를 기대하지 않으며 승격에 참여하지 않음 |
| Relayed from another Hub | 불허 / 미발행 | bundle로 가져온 마지막 상태를 표시하고 승격에는 참여 가능 |

Unknown은 운영 전 결정해야 하며 다시 돌아갈 수 없는 초기 상태다. 직접 연결 상태에서 직접 연결 불가 상태로 전환하면 기존 agent를 끊고 active Plan을 취소한다. Connected/Intermittent는 bundle Reported State import를 허용하지 않는다.

편집 원본은 Edit on this Hub, Edit on another Hub, Copy of another Hub로 구분한다. 신규 환경은 이 Hub가 정본이라 덮어쓰는 bundle을 거부한다. another Hub는 upstream 설정을 import하며 허용된 개별 config나 break-glass만 로컬 수정할 수 있다. Copy는 이런 config 수정도 막는 읽기 전용이며 장애 시 연결/편집 원본을 이 Hub로 바꿀 수 있다.

Overview의 마지막 보고 시각, agent 연결, registry 연결, 채널과 Plan 상태를 함께 읽는다. 녹색 Pod나 오래된 imported health만으로 현재 제어 가능 상태라고 판단하지 않는다. 환경 삭제는 Apollo settings/Entity 기록을 없애지만 실제 설치를 지우지 않아 인프라 정리는 별도다.

## Overview의 기본값과 엔티티별 예외

2026-10-30 공식 Overview 본문을 대조한 화면 해석 기준이다. 다른 연결 설정의 검증 날짜는 갱신하지 않는다.

- Entities 집계는 최신 상태, grace period와 blocked를 구분한다. 집계를 선택해 해당 엔티티 목록으로 이동하고 개별 상태를 확인한다.
- Environment의 마지막 보고 시각과 각 agent의 마지막 보고 시각은 별도 정보다. Plan의 시작 시각과 상태, 설치된 Module 버전, 할당된 registry의 연결 상태도 함께 본다.
- Overview의 Release Channel은 환경 기본값이다. 일부 엔티티는 다른 채널을 구독할 수 있으므로 화면의 채널 하나로 모든 설치의 구독을 단정하지 않는다.
- 표시된 환경 maintenance window도 모든 엔티티의 최종 일정은 아니다. Product 설정에 따라 엔티티의 유지보수 시간이 달라질 수 있으며, 계산 기준은 [[Apollo-Orchestration-and-Constraints#시간과 가용성 제약|resolved window]]에서 확인한다.

운영 적용 제안: 배포가 멈췄다면 환경 집계에서 대상 엔티티를 좁히고, 그 엔티티의 채널과 최종 유지보수 시간, 최근 Plan 및 보고 시각을 대조한다.

## 출처

- [Palantir, getting-started-with-apollo](https://www.palantir.com/docs/apollo/apollo-getting-started/getting-started-with-apollo) — 연결→제품→설치→운영 제약→recall→보안의 기본 순서.
- [Palantir, glossary](https://www.palantir.com/docs/apollo/apollo-getting-started/glossary) — Product, Entity, Plan, recall과 상태 용어.
- [Palantir, introduction-environments](https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-environments) — 클러스터마다 control plane 연결.
- [Palantir, introduction-next-steps](https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-next-steps) — scan/telemetry/IdP 연동 확장 방향.
- [Palantir, introduction-welcome](https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-welcome) — SaaS 실습의 전제와 air-gap 구성의 구분.
- [Palantir, agents](https://www.palantir.com/docs/apollo/core/agents) — 암호화 outbound 연결, 환경 keypair와 proxy.
- [Palantir, connect-spoke](https://www.palantir.com/docs/apollo/core/connect-spoke) — CNCF 배포판과 local cluster의 역할.
- [Palantir, entities](https://www.palantir.com/docs/apollo/core/entities) — managed와 unmanaged는 선언/관측 상태로 구분.
- [Palantir, environments](https://www.palantir.com/docs/apollo/core/environments) — Hub 계층과 연결이 끊기는 환경.
- [Palantir, how-apollo-works](https://www.palantir.com/docs/apollo/core/how-apollo-works) — 고정 target 대신 제약을 만족하는 Plan 평가.
- [Palantir, introduction](https://www.palantir.com/docs/apollo/core/introduction) — 제품팀 승격과 운영팀 구독을 분리한 pull 모델.
- [Palantir, overview](https://www.palantir.com/docs/apollo/core/overview) — catalog, settings, observability가 orchestration 입력.
- [Palantir, report-entities](https://www.palantir.com/docs/apollo/managing-entities/report-entities) — 과거 수동 unmanaged 보고는 자동 갱신이 아님.
- [Palantir, delete-environment](https://www.palantir.com/docs/apollo/managing-environments/delete-environment) — 환경 기록 삭제와 실제 자원 삭제는 별개.
- [Palantir, environment-connection-settings](https://www.palantir.com/docs/apollo/managing-environments/environment-connection-settings) — 연결 방식 네 종류와 상태/승격 차이.
- [Palantir, environment-edit-source](https://www.palantir.com/docs/apollo/managing-environments/environment-edit-source) — 편집 정본, upstream과 copy의 권한 경계.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-environments/overview) — Overview의 관측 시각, agent, Plan과 registry.
- [Palantir, apollo-getting-started](https://www.palantir.com/docs/apollo/apollo-getting-started) — 시작 절차의 부모 경로도 동일 개념 제공.
- [Palantir, core](https://www.palantir.com/docs/apollo/core) — core 부모 경로의 architecture 소개.
- [Palantir, managing-environments](https://www.palantir.com/docs/apollo/managing-environments) — 환경 부모 경로의 운영 화면 구성.

## 관련 문서

- [[Apollo-Orchestration-and-Constraints]]
- [[Apollo-Environment-Setup-and-Registries]]
