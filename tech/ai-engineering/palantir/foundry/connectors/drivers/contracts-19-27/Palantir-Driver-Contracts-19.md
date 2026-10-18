---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 19: monday부터 oracle-eloqua까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Monday

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Token |
| APIToken | 권장 | — |
| Domain | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Schema | 권장 | — |
| URL | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.monday.com | 해당 source에서 필수 |
| \<Domain>.monday.com | If using Schema=AuditLog |
| auth.monday.com | If using AuthScheme=OAuth |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/MOK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## MYOB

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Instance | 필수 | Cloud |
| CompanyFileId | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| URL | 권장 | https://myMYOBInstance/accountright |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.myob.com | If Instance=Cloud (default) |
| secure.myob.com | If Instance=Cloud (default) |
| \<URL> | URL field for on-premise |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UMK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## OData

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | None |
| URL | 필수 | https://{serverAddress} |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |
| \<FeedURL> | FeedURL connection property |
| login.microsoftonline.com | If AuthScheme=AzureAD OR SharePointOnline AND SharePointUseSSO=FALSE |
| \<SharePointSSODomain> | If SharePointUseSSO=TRUE AND AuthScheme=SharePointOnline AND Domain of User is different than domain for SSO service |
| \<KerberosKDC>:88 | If AuthScheme=Negotiate |
| \<KerberosServiceKDC>:88 | If AuthScheme=Negotiate and Kerberos topology uses multiple realms |
| \<OAuthAuthorizationURL> | If AuthScheme=OAuth |
| \<OAuthAccessTokenURL> | If AuthScheme=OAuth |
| \<OAuthRefreshTokenURL> | If AuthScheme=OAuth |
| \<OAuthRequestTokenURL> | If AuthScheme=OAuth |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/RDK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Odoo

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| APIToken | 필수 | — |
| URL | 필수 | https://MyOdooSite/ |
| User | 필수 | — |
| CheckPermissions | 권장 | TRUE |
| Database | 권장 | — |
| OdooEdition | 권장 | Odoo Online |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/OEK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Oracle Eloqua

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| Schema | 필수 | OracleEloqua |
| Company | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| login.eloqua.com | 해당 source에서 필수 |
| {BaseURL} | 해당 source에서 필수. The Base and Bulk URLs are returned by the API after authenticating |
| {BulkURL} | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/DUK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Monday](https://www.palantir.com/docs/foundry/available-connectors/monday)
- [Palantir, MYOB](https://www.palantir.com/docs/foundry/available-connectors/myob)
- [Palantir, OData](https://www.palantir.com/docs/foundry/available-connectors/odata)
- [Palantir, Odoo](https://www.palantir.com/docs/foundry/available-connectors/odoo)
- [Palantir, Oracle Eloqua](https://www.palantir.com/docs/foundry/available-connectors/oracle-eloqua)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
