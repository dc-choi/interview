---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 28: shopify부터 spark-sql까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Shopify

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| ShopURL | 필수 | https://{shopURL} |
| AccessToken | 권장 | — |
| AuthScheme | 권장 | AccessToken |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Schema | 권장 | GRAPHQL-2024-07 |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<ShopURL> | 해당 source에서 필수. ShopURL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FOK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## SingleStore

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Password |
| Server | 필수 | {serverAddress} |
| UseSSL | 필수 | TRUE |
| Database | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| Port | 권장 | 3306 |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | If UseSSH=FALSE, Server supports listing multiple addresses (i.e., Server='192.168.1.100,192.168.1.101'). Port supports listing multiple addresses (i.e., Port='3306, 3307'); default Port=3306 |
| \<SSHServer>:\<SSHPort> | If UseSSH=TRUE, default SSHPort=22 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JMK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Smartsheet

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| UseLegacyAPI | 필수 | FALSE |
| AuthScheme | 권장 | PersonalAccessToken |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| PersonalAccessToken | 권장 | — |
| Region | 권장 | GLOBAL |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.smartsheet.com | If Region=GLOBAL (default) |
| api.smartsheet.eu | If Region=EU |
| api.smartsheetgov.com | If Region=GOV |
| app.smartsheet.com | Only for Authorization URL, If Region=GLOBAL (default) |
| app.smartsheet.eu | Only for Authorization URL, If Region=EU |
| app.smartsheetgov.com | Only for Authorization URL, If Region=GOV |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/BSM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Snapchat Ads

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AccountId | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| adsapi.snapchat.com | 해당 source에서 필수 |
| accounts.snapchat.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JPK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Spark SQL

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Plain |
| Server | 필수 | {serverAddress} |
| UseSSL | 필수 | TRUE |
| Database | 권장 | — |
| Password | 권장 | — |
| Port | 권장 | 10000 |
| TransportMode | 권장 | BINARY |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수. Server and Port connection properties; default Port=10000 |
| \<KerberosKDC>:88 | If AuthScheme=Kerberos |
| \<KerberosServiceKDC>:88 | If AuthScheme=Kerberos and Kerberos topology uses multiple realms |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/ESM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Shopify](https://www.palantir.com/docs/foundry/available-connectors/shopify)
- [Palantir, SingleStore](https://www.palantir.com/docs/foundry/available-connectors/singlestore)
- [Palantir, Smartsheet](https://www.palantir.com/docs/foundry/available-connectors/smartsheet)
- [Palantir, Snapchat Ads](https://www.palantir.com/docs/foundry/available-connectors/snapchat-ads)
- [Palantir, Spark SQL](https://www.palantir.com/docs/foundry/available-connectors/spark-sql)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
