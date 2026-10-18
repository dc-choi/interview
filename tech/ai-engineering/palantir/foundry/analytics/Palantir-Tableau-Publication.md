---
tags: [palantir, tableau, oauth, identity]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry Tableau 연결과 게시"]
---

# Tableau 연결과 게시의 identity

Tableau는 live connection과 extract, viewer OAuth와 embedded credential을 각각 선택한다. 최신 데이터 조회와 사용자별 Foundry 권한을 유지하려는 요구는 이 두 선택에 함께 영향을 받는다.

## 설치와 실행 환경

Tableau Desktop/Server 2019.4 이후 버전의 connector를 사용한다. Tableau Online은 custom connector 경로가 지원되지 않아 Tableau Bridge를 검토한다. 확인일 최신 connector는 2.6.0이며 오래된 1.2.0은 token-only와 dataset RID/path 지정 경로로, search/OAuth를 제공하지 않는다.

Desktop에는 JDBC jar와 `.taco` connector가 각각 필요하다. Driver는 Windows의 `Program Files/Tableau/Drivers`, macOS의 `/Library/Tableau/Drivers`에 둔다. Connector는 실제 My Tableau Repository의 `FileRepositoryLocation`을 확인해 설치한다. 다른 위치에 같은 이름의 폴더를 만드는 것으로 설정이 바뀌지 않는다.

Server는 vizql의 connector 경로나 `native_api.connect_plugins_path` 설정을 사용하고 `.taco` 변경 후 재시작한다. Desktop만 설치한 상태로 Server의 refresh까지 지원되는 것은 아니다.

Live는 현재 backend query, extract는 Tableau 복사본을 사용한다. 이전 Direct Read 경로의 대규모 extract 호환성은 legacy architecture 조건과 함께 읽으며 현재 모든 query의 규칙으로 확대하지 않는다.

## Viewer별 OAuth와 공용 identity

Viewer별 권한을 적용하려면 Server OAuth를 구성하고 게시할 때 Prompt user 경로를 선택한다. Confidential authorization-code application의 redirect는 `https://<tableau-server>/auth/add_oauth_token`이고 Server의 `oauth.config.clients` 구성과 재시작이 필요하다. Application의 project/marking 제한은 사용자 권한을 대신하지 않고 추가 제한으로 작동한다.

반면 saved credential을 embed하면 그 credential의 identity로 접근한다. Server My Account의 Saved Credentials와 게시 옵션을 함께 확인한다. Viewer가 각각 로그인하는 방식과 데이터 접근 주체가 다르다.

Connector 2.6.0의 client credentials는 confidential application과 service user를 사용한다. OSDK는 필요하지 않으며 client secret을 Token field에 넣는 설정을 사용한다. 이 방식으로 공유하면 모든 viewer가 service user의 접근 범위를 사용한다. 개인 token도 선택할 수 있지만 소유자, 만료와 교체의 영향을 받는다.

게시된 Server 화면에서는 authentication method를 직접 바꾸지 못하므로 Desktop에서 설정을 바꿔 다시 publish한다. 연결 시험에는 작성자 화면뿐 아니라 실제 viewer, service identity와 scheduled refresh를 포함한다.

## 출처

- [Palantir, Tableau overview](https://www.palantir.com/docs/foundry/analytics-connectivity/tableau-overview)
- [Palantir, Tableau setup](https://www.palantir.com/docs/foundry/analytics-connectivity/tableau-setup)
- [Palantir, Tableau Server setup](https://www.palantir.com/docs/foundry/analytics-connectivity/tableau-server-setup)
- [Palantir, Tableau OAuth setup](https://www.palantir.com/docs/foundry/analytics-connectivity/tableau-oauth-setup)
- [Palantir, Tableau getting started](https://www.palantir.com/docs/foundry/analytics-connectivity/tableau-getting-started)

## 관련 문서

- [[Palantir-SQL-Drivers-and-BI-Connectivity|SQL driver]]
- [[Palantir-Power-BI-Publication|Power BI의 gateway identity]]
