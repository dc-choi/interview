---
tags: [palantir, developer-console, permissions, migration]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Developer application 권한 migration"]
---

# Developer application 권한 migration

Compass-managed application은 parent Project/folder의 role/Marking/Organization을 상속한다. 2026-10-16 기준 beta/환경별 지원이므로 standalone legacy 권한 모델과 구분한다. 기본 Viewer는 config/site/SDK 사용, Editor는 수정/SDK 생성, Owner는 공유를 수행하지만 role operation은 사용자 정의할 수 있다.

## 앱 관리와 OAuth client 관리는 별도다

목록에 보이려면 View application configuration operation이 필요하다. 생성은 folder의 Create application과 owning organization의 Create third-party applications workflow가 필요하다. Broad Manage OAuth clients 권한 없이 특정 앱을 관리하도록 custom role과 app-level sharing을 조합할 수 있다.

Linked OAuth client의 authentication/secret 설정은 organization workflow 또는 OAuth2 client role context에서 따로 관리한다. 특정 client secret 회전만 허용하는 역할도 가능하다. 미래에 permission을 통합할 계획을 현재 동작으로 취급하지 않는다.

Hosted website만 읽게 하려면 View application website operation을 가진 custom Project role을 만들 수 있다. Config Viewer와 website Viewer를 항상 같은 대상에 줄 필요는 없다. Deploy website는 별도 operation, domain approval은 ISO 역할이다. LMS-backed action을 쓰는 OSDK frontend는 app Viewer가 없으면 can:attribute/PERMISSION_DENIED가 날 수 있으며 같은 action이 Workshop/Object Explorer에서 된다고 이 경계가 사라지지 않는다.

## Compass migration은 기존 역할을 대체한다

Legacy app은 creator Owner와 app별 sharing을 사용하고 삭제하면 복구할 수 없다. Project migration은 기존 role 구조를 그대로 이관하지 않고 destination Project 상속으로 대체한다. Preview에서 늘거나 줄어드는 website audience를 확인하고 website-only role이 필요하면 migration 전에 Project/folder에 배정한다.

Migrate legacy application to Compass operation을 가진 사용자가 위치와 permission 변화를 검토한 뒤 수행한다. Source product의 app을 migration해도 이전 Marketplace 설치본은 자동 migration되지 않는다. 설치마다 별도로 migration하고 잠긴 installation은 이동을 위해 unlock이 필요할 수 있다. Source와 old installation의 상태 차이는 warning이며 바로 사용 차단되는 것은 아니다.

## 다른 organization의 service user

Legacy confidential app은 선택 organization의 guest로 service user를 만들 수 있다. 다른 organization에서 보려면 app을 공유한 뒤 그 organization에 enable하는 절차가 필요하다. Compass-managed 모델에서는 상속/공유 방식이 다르므로 이 과거 절차를 그대로 적용하지 않는다.

Organization selector는 선택 위치에 marked된 organization만 보여주므로 admin인 조직도 위치 조건 때문에 안 보일 수 있다. CBAC 환경에서 service user는 app maximum classification을 자동 상속하지 않는다. 필요한 group/classification과 client/service user Marking 또는 membership mismatch warning을 확인한다.

## 출처

- [Palantir, Permissions](https://www.palantir.com/docs/foundry/developer-console/permissions)
- [Palantir, Create application using a different Organization](https://www.palantir.com/docs/foundry/developer-console/how-to-create-backend-service-app-different-org)
- [Palantir, Standalone OAuth clients](https://www.palantir.com/docs/foundry/developer-console/oauth-clients)

## 관련 문서

- [[Palantir-Application-Restrictions-and-Identity|실행 token 상한]]
- [[Palantir-OSDK-Marketplace-Configuration|설치별 configuration]]
