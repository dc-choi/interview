---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 8: domino부터 epicor-kinetic까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Domino

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| DatabaseScope | 필수 | — |
| TableTypes | 필수 | Forms |
| URL | 필수 | — |
| AuthScheme | 권장 | OAuthJWT |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JKK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## eBay

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | AuthNAuth |
| RuName | 필수 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| SiteID | 권장 | 0 |
| UseSandbox | 권장 | FALSE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| auth.ebay.com | If AuthScheme=OAuth |
| signin.ebay.com | If AuthScheme=AuthNAuth |
| api.ebay.com | If UseSandbox=False |
| svcs.ebay.com | If UseSandbox=False |
| auth.sandbox.ebay.com | If AuthScheme=OAuth and UseSandbox=True |
| signin.sandbox.ebay.com | If AuthScheme=AuthNAuth and UseSandbox=True |
| api.sandbox.ebay.com | If UseSandbox=True |
| svcs.sandbox.ebay.com | If UseSandbox=True |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/BEK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## eBay Analytics

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | OAuth |
| RuName | 필수 | — |
| InitiateOAuth | 권장 | REFRESH |
| MarketplaceId | 권장 | DEFAULT |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| signin.ebay.com | If UseSandbox=False |
| api.ebay.com | If UseSandbox=False |
| signin.sandbox.ebay.com | If UseSandbox=True |
| api.sandbox.ebay.com | If UseSandbox=True |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JJK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## EnterpriseDB

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Password | 필수 | — |
| Server | 필수 | localhost |
| User | 필수 | — |
| UseSSL | 필수 | TRUE |
| Database | 권장 | — |
| Port | 권장 | 5444 |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JEK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Epicor Kinetic

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| ERPInstance | 필수 | — |
| Service | 필수 | BaqSvc |
| URL | 필수 | https://myServer.EpicorSaaS.com |
| ApiVersion | 권장 | v1 |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수 |
| login.microsoftonline.com | If AuthScheme=AzureADOpenID |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UEK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Domino](https://www.palantir.com/docs/foundry/available-connectors/domino)
- [Palantir, eBay](https://www.palantir.com/docs/foundry/available-connectors/ebay)
- [Palantir, eBay Analytics](https://www.palantir.com/docs/foundry/available-connectors/ebay-analytics)
- [Palantir, EnterpriseDB](https://www.palantir.com/docs/foundry/available-connectors/enterprisedb)
- [Palantir, Epicor Kinetic](https://www.palantir.com/docs/foundry/available-connectors/epicor-kinetic)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
