---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo Label, 책임 팀과 알림

## Label은 메타데이터이자 조건 입력이다

Apollo label은 ID/value이고 ID는 선택 prefix/name을 /로 구분한다. Entity, Environment, Product Release와 Team에 적용한다. ID는 생성 후 변경할 수 없고 suggested resource type과 accepted values를 설정한다.

Entity는 개별/대량 적용하고 component 같은 의미로 필터링한다. Environment는 인프라/업무영역 등 식별에 쓰며 같은 ID에는 값 하나만 둔다. Product Release label은 scan과 승인 등 승격 조건을 표현한다. Team label도 동일한 적용/변경/제거 흐름이다. 운영 metadata에 민감 값을 넣지 않는다.

label을 쓸 수 있다는 사실만으로 정책이 생기지는 않는다. 승격, export, 자동 승인 각각에서 존재/값 요구를 명시해야 한다. label 수정 권한과 대상 자원 수정 권한도 분리한다. 채널 입장 후 값 변경은 자동 퇴장을 일으키지 않는다.

## 책임 팀과 실제 알림 경로

contact team은 소유 자원의 연락과 알림 설정을 연결한다. Email, Slack channel, PagerDuty Service를 contact로 둘 수 있지만 **Apollo notification target으로 지원하는 것은 Email/Slack/in-app이며 PagerDuty contact가 곧 notification 지원은 아니다.** PagerDuty는 현재 on-call 표시용으로 해석한다.

팀이 제품/환경의 contact team이면 해당 contact의 filter 선호에 따라 알림을 받는다. 소유하지 않은 자원도 For Team 설정으로 기존 contact를 구독시킬 수 있다. contact 신규 생성은 자원 화면이 아니라 Hub Team settings에서 한다. 사용자는 자원별 in-app/email 구독을 켜고 유형을 정하거나 미래 유형까지 opt-in할 수 있다.

변경 요청 대기/일일 요약, open-ended recall, RBAC, promotion/Plan 실패가 예시다. 유형별 지원과 실제 구독 범위를 확인한다. Slack 연결은 Palantir 설정이 필요하고 Email은 Control Panel의 domain allowlist에 등록되어야 발송된다. custom webhook은 문서 확인일 기준 미지원이다.

외부 notification은 권한과 데이터 경계를 지키려고 기본적으로 내용이 제한될 수 있다. 링크만 온다고 장애로 단정하지 않는다. 알림 설정 문서 작성은 실제 contact/구독 변경이나 메시지 발송을 수행한 결과가 아니다.

## 출처

- [Palantir, managing-labels](https://www.palantir.com/docs/apollo/managing-labels) — label 부모 경로의 key/value 구조.
- [Palantir, create-labels](https://www.palantir.com/docs/apollo/managing-labels/create-labels) — 불변 ID, accepted values와 suggested types.
- [Palantir, entity-labels](https://www.palantir.com/docs/apollo/managing-labels/entity-labels) — Entity 개별/대량 label과 필터.
- [Palantir, environment-labels](https://www.palantir.com/docs/apollo/managing-labels/environment-labels) — 환경 label은 동일 ID당 한 값.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-labels/overview) — 네 자원 타입과 prefix/name.
- [Palantir, product-release-labels](https://www.palantir.com/docs/apollo/managing-labels/product-release-labels) — 릴리스의 label 존재/값 기반 승격.
- [Palantir, team-labels](https://www.palantir.com/docs/apollo/managing-labels/team-labels) — Team label 적용/수정/제거.
- [Palantir, managing-notifications](https://www.palantir.com/docs/apollo/managing-notifications) — notification 부모 경로의 채널과 권한 경계.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-notifications/overview) — 유형, custom webhook 미지원과 제한 메시지.
- [Palantir, team-notifications](https://www.palantir.com/docs/apollo/managing-notifications/team-notifications) — Team contact, PagerDuty 알림 미지원과 Email allowlist.
- [Palantir, user-notifications](https://www.palantir.com/docs/apollo/managing-notifications/user-notifications) — 개인 구독/해제와 기존 contact 재사용.
- [Palantir, team-contacts](https://www.palantir.com/docs/apollo/managing-teams/team-contacts) — Email/Slack/PagerDuty contact와 on-call 표시.

## 관련 문서

- [[Apollo-Access-and-Debugging]]
- [[Apollo-Release-Promotion-and-Recalls]]
