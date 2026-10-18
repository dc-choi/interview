---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 4: authorize-net부터 azure-data-catalog까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Authorize.Net

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| LoginID | 필수 | — |
| TransactionKey | 필수 | — |
| UseSandbox | 권장 | FALSE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.authorize.net | If UseSandbox=FALSE |
| apitest.authorize.net | If UseSandbox=TRUE |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/CWK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Avalara

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| rest.avatax.com | If UseSandbox=FALSE |
| sandbox-rest.avatax.com | If UseSandbox=TRUE |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/GEK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Azure Active Directory

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| DefaultGroups | 필수 | AllGroups |
| DefaultUser | 필수 | AllUsers |
| AuthScheme | 권장 | AzureServicePrincipal |
| AzureTenant | 권장 | — |
| GroupId | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| UserId | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수. Server and Port connection properties |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/CJM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Azure Cosmos DB

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AccountEndpoint | 필수 | https://<URL> |
| AuthScheme | 필수 | AccountKey |
| AccountKey | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Schema | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<AccountEndpoint> | 해당 source에서 필수. AccountEndpoint connection property (may be in the format https://\<Server>:\<Port> or may be a full URL) |
| login.microsoftonline.com | If AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/EHK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Azure Data Catalog

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | AzureServicePrincipal |
| AzureTenant | 권장 | — |
| CatalogName | 권장 | defaultcatalog |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.azuredatacatalog.com | 해당 source에서 필수 |
| datacatalog.azure.com | 해당 source에서 필수 |
| login.microsoftonline.com | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/GNK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## 출처

- [Palantir, Authorize.Net](https://www.palantir.com/docs/foundry/available-connectors/authorize-net)
- [Palantir, Avalara](https://www.palantir.com/docs/foundry/available-connectors/avalara)
- [Palantir, Azure Active Directory](https://www.palantir.com/docs/foundry/available-connectors/azure-active-directory)
- [Palantir, Azure Cosmos DB](https://www.palantir.com/docs/foundry/available-connectors/azure-cosmos-db)
- [Palantir, Azure Data Catalog](https://www.palantir.com/docs/foundry/available-connectors/azure-data-catalog)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
