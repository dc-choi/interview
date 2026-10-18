---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 34: zoho-creator부터 zuora까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Zoho Creator

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Region | 필수 | US |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| ReportFormRelations | 권장 | — |
| Schema | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<APIDomain> - default: creatorapp.zoho.\<Region> | 해당 source에서 필수. Region connection property maps to TLD (default Region=US --> .com); APIDomain can be used when manually setting OAuthAccessToken |
| \<AccountsServer> - default: accounts.zoho.\<Region> | 해당 source에서 필수. Retrieved automatically with OAuth flow; set in AccountsServer connection property when manually providing OAuthAccessToken |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KCK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Zoho CRM

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Schema | 필수 | v4 |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Region | 권장 | US |
| UseCOQL | 권장 | TRUE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<APIDomain> - default: zohoapis.\<Region> | 해당 source에서 필수. If UseSandbox=FALSE (default), Region connection property maps to TLD (default Region=US --> .com); APIDomain can be used when manually setting OAuthAccessToken |
| sandbox.zohoapis.\<Region> | If UseSandbox=TRUE |
| \<AccountsServer> - default: accounts.zoho.\<Region> | 해당 source에서 필수. Retrieved automatically with OAuth flow; set in AccountsServer connection property when manually providing OAuthAccessToken |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/CZK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Zoho Inventory

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| IncludeCustomFields | 권장 | TRUE |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OrganizationId | 권장 | — |
| Region | 권장 | US |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| inventory.zoho.\<Region> | 해당 source에서 필수. Region connection property maps to TLD (default Region=US --> .com) |
| \<AccountsServer> - default: accounts.zoho.\<Region> | 해당 source에서 필수. Retrieved automatically with OAuth flow; set in AccountsServer connection property when manually providing OAuthAccessToken |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KZK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Zoho Projects

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| PortalId | 권장 | — |
| ProjectId | 권장 | — |
| Region | 권장 | US |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| projectsapi.zoho.\<Region> | 해당 source에서 필수. Region connection property maps to TLD (default Region=US --> .com) |
| \<APIDomain> - default: zohoapis.\<Region> | 해당 source에서 필수. Retrieved automatically with OAuth flow; set in APIDomain connection property when manually providing OAuthAccessToken |
| \<AccountsServer> - default: accounts.zoho.\<Region> | 해당 source에서 필수. Retrieved automatically with OAuth flow; set in AccountsServer connection property when manually providing OAuthAccessToken |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/PZK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Zuora

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| OAuthClientId | 필수 | — |
| OAuthClientSecret | 필수 | — |
| InitiateOAuth | 권장 | REFRESH |
| Tenant | 권장 | USProduction |
| ZuoraService | 권장 | AQuADataExport |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| rest.zuora.com | If Tenant=USProduction (default) |
| rest.apisandbox.zuora.com | If Tenant=USAPISandbox |
| rest.pt1.zuora.com | If Tenant=USPerformanceTest |
| rest.eu.zuora.com | If Tenant=EUProduction |
| rest.sandbox.eu.zuora.com | If Tenant=EUSandbox |
| rest.na.zuora.com | If Tenant=USCloudProduction |
| rest.sandbox.na.zuora.com | If Tenant=USCloudAPISandbox |
| rest.test.zuora.com | If Tenant=USCentralSandbox |
| rest.test.eu.zuora.com | If Tenant=EUCentralSandbox |
| \<URL> | URL connection property for US Production copy environment |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HZK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## 출처

- [Palantir, Zoho Creator](https://www.palantir.com/docs/foundry/available-connectors/zoho-creator)
- [Palantir, Zoho CRM](https://www.palantir.com/docs/foundry/available-connectors/zoho-crm)
- [Palantir, Zoho Inventory](https://www.palantir.com/docs/foundry/available-connectors/zoho-inventory)
- [Palantir, Zoho Projects](https://www.palantir.com/docs/foundry/available-connectors/zoho-projects)
- [Palantir, Zuora](https://www.palantir.com/docs/foundry/available-connectors/zuora)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
