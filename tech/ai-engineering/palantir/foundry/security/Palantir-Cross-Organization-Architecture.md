---
tags: [palantir, security, collaboration]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 조직 간 협업과 고객 격리 설계

## Organization, space와 Project

사용자는 하나의 Organization에 속하고 다른 조직에는 guest가 될 수 있다. Organization은 space나 Ontology 없이 만들 수 있지만 space는 같은 이름의 Ontology를 가진다. Space에 허용된 조직이 Ontology에도 반영된다. Functions는 이 의미의 Ontology resource로 분류하지 않는다.

Space는 project를 담고, project에 허용된 조직 집합은 space의 허용 집합의 부분집합이어야 한다. 조직에 space 접근을 허용해도 모든 project나 그 안의 자원에 역할을 자동 부여하지 않는다. 조직을 space에서 제거하려면 내부 project에 남은 접근부터 제거한다.

Resource import는 project/space를 넘어 입력을 재사용하는 방법이다. 실제 접근은 import 권한, target 역할과 markings를 함께 충족해야 한다. Guest membership만으로 서로 공유되지 않은 private space 사이의 데이터를 가져올 수는 없다. 구형 filesystem 분리 환경에서는 space 간 이동 제약이 추가될 수 있다.

## 고객 구조 선택

| 요구 | 구조와 주의점 |
|---|---|
| 고객별 독립 운영 | 고객별 Organization과 private space/Ontology, guest 지원 경로 |
| 고객 간 공동 workflow | shared space/Ontology, project별 조직 범위와 restricted view |
| 공통 앱과 고객별 custom 운영 | shared space와 private space 병행, 중복 배포/변경 관리 |
| 매우 많은 소규모 고객 | 외부 사용자용 단일 Organization, 사용자/그룹 발견 차단과 행 정책 |

Private/shared는 별도의 기술적 space 유형이 아니라 허용 조직 수의 설계 구분이다. B2B라도 고객 수, 사용자 수, 데이터 공유, 개별 사용량 귀속과 custom UI 필요에 따라 구조가 달라진다. 문서의 대규모 onboarding 가능성을 무제한 quota로 해석하지 않는다.

## Marking 합성과 행 정책

저장 위치의 Organization markings는 OR로 적용된다. 반면 여러 입력을 결합하면 각 입력의 요구가 AND로 결합된다. 예를 들어 (A OR B)인 입력과 (A OR C)인 입력의 결과는 (A OR B) AND (A OR C)를 요구한다. Shared project에 저장했다는 사실만으로 이 상속 요구가 사라지지 않는다.

일반 UI에서 붙이는 비조직 marking은 AND 요구다. 결과의 접근 범위를 넓히려면 허가된 unmarking/stop_propagating/stop_requiring 또는 restricted view 처리가 필요하다. Marking 제거와 이후 행 정책을 별도 변경으로 검토한다. 행 정책을 넣었다는 사실만으로 잘못 넓힌 상위 접근이 안전해졌다고 가정하지 않는다.

B2C에서는 사용자 discoverability 차단만으로 데이터 격리가 완성되지 않는다. Restricted view에 현재 user ID와 row의 owner ID를 비교하는 정책을 두고, 생성 Action이 owner ID를 현재 사용자로 채우게 하는 식으로 데이터 경계를 설계한다. Project 권한과 조직 간 visibility도 함께 검증한다.

## 인증 구조

고객별 IdP를 직접 연동하면 대형 고객이 자체 그룹과 lifecycle을 관리하기 쉽지만 고객별 SAML 설정 수집/구성은 수동 작업이 남는다. 제공자가 federation passthrough IdP를 운영하면 대량 onboarding을 자동화하기 쉽다. 이 경우 사용자 Organization 속성을 Foundry 배정 규칙까지 전달해야 한다.

조직 속성이 빠졌을 때는 No organization 그룹으로 보내는 기본 규칙을 둬 의도하지 않은 데이터 접근을 막는다. 제공자가 직접 계정을 만드는 중앙 IdP는 B2C에 적합할 수 있으며 고객 규모별로 방법을 혼합할 수 있다.

## 중앙 개발과 다중 배포

제품화할 자원은 전용 개발 Organization의 project에서 만들고 packaging 담당자에게 해당 조직 Expand 권한을 부여한다. 배포용 store는 대상 조직이 접근 가능한 space/project에 둔다. Organization이 store project를 허용하는 것과 개별 최종 사용자가 store를 열 수 있는 것은 다른 설정이다.

Self-service 설치에는 store project의 marketplace:install-from-local-marketplace와 target space/Ontology의 marketplace:install-in 권한을 확인한다. 보통 Viewer/Editor/Owner role에 포함되지만 role을 수정한 환경에서는 실제 operation을 확인한다. Input과 linked product 접근도 별도로 필요하다.

통제된 설치는 내부 관리자만 store에 접근시키고 고객 대신 설치한다. 이를 위해 공통 입력이 있는 shared space를 쓰거나 고객 Organization에 guest로 참여한 개발자에게 target 설치와 입력 접근 권한을 준다. Packaging 때의 조직 확장 검사를 정상 통과했다는 사실이 모든 input/installation 권한을 보장하는 것은 아니다.

## 출처

- [Palantir Foundry, Manage B2B and B2C collaboration](https://www.palantir.com/docs/foundry/guides-and-workflows/b2b-b2c-collaboration/)
- [Palantir Foundry, End-to-end guides and workflows](https://www.palantir.com/docs/foundry/guides-and-workflows/overview/)

## 관련 문서

- [[Palantir-Foundry-Security]]
- [[Palantir-Security-and-Governance]]
