---
tags: [palantir, consumer-mode, security, release-management]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Consumer 격리와 배포"]
---

# Consumer 격리와 배포

Consumer 격리는 전용 organization, 최소 role, resource 권한과 platform application 접근 제어를 함께 구성한다. Home page redirect와 branding만 적용해서는 내부 플랫폼 접근을 막을 수 없다.

## Organization과 visibility를 분리해 설정한다

전용 consumer organization을 만들고 internal organization의 role 발견에 필요한 collaboration만 허용한다. Cross-organization user/group discovery와 같은 organization의 member discovery는 따로 제어한다. B2B 댓글/협업처럼 상대 발견이 필요한 경우 요구에 맞춰 일부를 열 수 있다.

설정 가이드는 consumer organization의 private space를 No로 선택하고 member discovery를 비활성화한다. 다른 안내의 private organizations라는 권고를 개인 private space 생성으로 해석하지 않는다. 실제 visibility toggle과 허용 협업을 확인한다.

IDP의 SAML/OIDC 설정 후 organization assignment와 group assignment 규칙을 맞춘다. Advanced rule 미일치 시 default organization fallback을 확인한다. Organization마다 rule-based consumer group을 두고 Builder/Administrator group을 따로 관리한다. Enrollment Administrator의 초기 설정 권한을 소비자 역할에 넘기지 않는다.

## Consumer role과 resource 접근은 모두 필요하다

Internal organization에 consumer role set을 두고 Includes 없이 필요한 operation만 추가한다. 기본 후보는 application view, read-data, object/type/action metadata, function execution/contract read, object set read, Slate query 등이다. 기본 operation 목록은 특정 워크플로에 충분한지 검증하며 Editor/Owner 전체를 부여하는 대체재로 사용하지 않는다.

Consumer space에 internal/consumer organization의 access requirement를 설정하고 Project template에서 기본 Consumer, Builder Editor, Administrator Owner를 배정한다. 새 Project에서 실제 assignment를 확인한다. Platform access에서 Foundry Platform과 불필요한 application을 제한하고 조직 home page, language/domain/default IDP를 구성한다.

Workshop/Slate/Carbon app 외에도 object backing dataset/Project 접근이 필요할 수 있다. Consumer space의 Project로 backing data를 배치하고 row-level 분리가 필요하면 restricted view와 object datasource 연결을 확인한다. Action submission criteria에 consumer group을 반영한다. 함수를 action으로 감싸는 것은 권한 모델을 명확하게 하는 패턴이며 action의 실제 수행 권한 검증을 생략하는 방법이 아니다.

## 릴리스와 검증

개발/테스트/운영을 나누고 Marketplace release management를 사용하는 경로가 권장된다. Consumer space에서 직접 편집하는 간단한 경로와 release isolation을 제공하는 경로를 구분한다.

실제 test consumer 계정으로 IDP assignment, 자동 redirect와 기능을 확인한다. Check Access에서 소비자 Project의 필요한 접근뿐 아니라 internal Project/dataset 접근이 없는지도 확인한다. 정상 화면 하나가 보이는 것으로 role 경계 전체 검증을 끝내지 않는다. 이 문서는 공식 설정 계약을 학습한 지식이며 실제 enrollment 설정 또는 배포를 검증한 기록은 아니다.

## 출처

- [Palantir, Configure Foundry for consumer mode](https://www.palantir.com/docs/foundry/consumer-mode/foundry-consumer-setup)
- [Palantir, In-platform consumer applications](https://www.palantir.com/docs/foundry/consumer-mode/workspace-application-setup)
- [Palantir, Consumer mode overview](https://www.palantir.com/docs/foundry/consumer-mode/overview)

## 관련 문서

- [[Palantir-Consumer-Identity-and-Application-Models|인증 모델 선택]]
- [[Palantir-Carbon-Workspace-and-Access|Carbon workspace 접근]]
- [[Palantir-Identity-Assignment-and-Intake|IDP assignment]]
