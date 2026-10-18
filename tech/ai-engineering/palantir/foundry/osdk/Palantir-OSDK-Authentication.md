---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# OSDK public/confidential client와 scope 수명

사용자 위임 client-facing 앱은 public OAuth authorization-code를 사용하며 client secret을 browser에 저장하지 않는다. backend service가 Application's permissions를 사용하면 confidential client와 service user로 실행한다. confidential이라는 client 종류와 사용자 위임/서비스 identity라는 grant 차원을 나눈다.

## backend service

service user는 Object read, Action submission criteria와 필요한 원본 resource 권한을 별도로 받아야 한다. secret은 생성 시 한 번 보이며 안전하게 보관한다. 잃어버려 rotate하면 기존 secret을 쓰는 앱이 중단될 수 있다. Marketplace는 secret을 포함하지 않으므로 설치 환경에서 새 secret을 생성한다.

Next.js 예제는 server-side client 생성/auth.signIn 후 country fetchPage를 실행한다. client ID/secret/stack URL의 server 환경변수는 공개 VITE/meta config와 다르다. 예제의 catch→[]는 네트워크/권한 실패를 데이터 없음으로 바꾸고 fetchPage도 한 page뿐이다. 운영 앱은 오류와 빈 결과, 전체 page를 구분한다.

## 다른 Organization

영어 cross-organization 문서는 legacy permissions workflow임을 명시한다. Compass-managed permission이면 parent project/folder inheritance로 달라질 수 있다. legacy 흐름은 app을 기본 조직에 share한 뒤 Control Panel third-party app을 enable하고 service user에 권한을 부여한다.

조직 dropdown은 선택 location에 Marking된 조직만 보여 admin 여부만으로 목록이 결정되지 않는다. service user는 application의 maximum classification을 자동 상속하지 않으므로 필요한 group/classification을 명시한다. client와 service user의 Marking/organization mismatch warning도 확인한다.

## resource scope 변경

permissions/navigation/oauth-clients의 영어 canonical은 확보된 한국어/중국어 미검증 번역 alias를 사용했다. 여기의 Viewer/Editor/Owner, Third-party app admin과 Manage OAuth2 client 등 명칭/UI는 과거 설명 범위이며 현재 역할 계약을 독립 확인한 것으로 단정하지 않는다.

번역은 SDK resource 추가 시 dependency가 scope에 들어가고 backing dataset 등 dependency가 바뀌면 stale-scope 경고를 검토하도록 안내한다. SDK에서 resource를 제거할 때 모든 client가 새 SDK로 옮기기 전에 OAuth scope까지 즉시 제거하면 이전 버전이 깨질 수 있으므로 단계적으로 정리한다.

SDK 사용 권한, app 수정/새 version 생성 권한, hosted website 공유는 다른 범위다. 사용자 또는 service user 권한을 UI 표시만으로 추정하지 않고 현재 Developer Console/원본 resource에서 확인한다.

## metrics 번역의 제한

application-metrics는 중국어 미검증 번역에서 Beta, 약24시간 지연과30일 history,5일 이하면 hourly/그 이상 daily granularity를 설명한다. OAuth app 흐름으로 발급된 호출을 모으며 UserTokenAuth 호출은 앱 metrics에 보이지 않을 수 있다고 안내한다. 이 값을 현재 SLA/전수 telemetry 보장으로 쓰지 않는다.

## 출처

- [Palantir, how-to-bootstrapping-server-side-typescript](https://www.palantir.com/docs/foundry/ontology-sdk/how-to-bootstrapping-server-side-typescript)
- [Palantir, how-to-create-backend-service-app-different-org](https://www.palantir.com/docs/foundry/ontology-sdk/how-to-create-backend-service-app-different-org)
- [Palantir, permissions (미검증 기계번역 alias)](https://palantir.com/docs/kr/foundry/ontology-sdk/permissions/)
- [Palantir, navigation (미검증 기계번역 alias)](https://palantir.com/docs/kr/foundry/ontology-sdk/navigation/)
- [Palantir, oauth-clients (미검증 기계번역 alias)](https://palantir.com/docs/zh/foundry/ontology-sdk/oauth-clients/)
- [Palantir, application-metrics (미검증 기계번역 alias)](https://palantir.com/docs/zh/foundry/ontology-sdk/application-metrics/)

## 관련 문서

- [[Palantir-OSDK]]
- [[Palantir-OSDK-Contracts]]
- [[Palantir-OMCP-Authentication]]
