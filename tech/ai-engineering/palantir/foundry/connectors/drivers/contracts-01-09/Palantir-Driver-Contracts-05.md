---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 5: azure-devops부터 bigcommerce까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Azure DevOps

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AzureDevOpsEdition | 필수 | AzureDevOps Online |
| Organization | 필수 | — |
| AuthScheme | 권장 | Basic |
| Catalog | 권장 | — |
| IncludeCustomFields | 권장 | TRUE |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| PersonalAccessToken | 권장 | — |
| Schema | 권장 | REST |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| dev.azure.com | If Schema=REST (default) AND AzureDevOpsEdition='AzureDevOps Online' (default) |
| analytics.dev.azure.com | If Schema=Analytics AND AzureDevOpsEdition='AzureDevOps Online' (default) |
| \<URL> | If AzureDevOpsEdition='AzureDevOps OnPremise' |
| login.microsoftonline.com | If AuthScheme=AzureAD (default) AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If AuthScheme=AzureAD (default) AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If AuthScheme=AzureAD (default) AND AzureEnvironment=USGOVT or USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HNK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Azure Synapse

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Password |
| Database | 필수 | — |
| Encrypt | 필수 | TRUE |
| Server | 필수 | {serverAddress} |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| Port | 권장 | 1433 |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수. Server and Port connection properties |
| \<StorageAccountLocation> | Used for staging data in COPY mode |
| login.microsoftonline.com | If AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert, AzurePassword AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert, AzurePassword AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert, AzurePassword AND AzureEnvironment=USGOVT or USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HEK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Azure Table Storage

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Account | 필수 | — |
| UseSSL | 필수 | TRUE |
| AccessKey | 권장 | — |
| AuthScheme | 권장 | AccessKey |
| Backend | 권장 | Storage |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Tables | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Account>.table.core.windows.net | If Backend=Storage (default) |
| \<Account>.table.cosmosdb.azure.com | If Backend=CosmosDB |
| \<Account> | If Backend=AzureStack or Emulator, specify the full URL in Account |
| login.microsoftonline.com | If AuthScheme=AzureAD AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If AuthScheme=AzureAD AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If AuthScheme=AzureAD AND AzureEnvironment=USGOVT or USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/CAK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Basecamp

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AccountId | 필수 | — |
| Schema | 필수 | V2 |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| ProjectId | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| launchpad.37signals.com | Required for OAuth flows - not used for basic auth |
| 3.basecampapi.com | Required if connecting to basecamp V3 instance |
| basecamp.com | Required if connecting to basecamp V1/V2 instance |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/BCK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## BigCommerce

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| StoreId | 필수 | — |
| AuthScheme | 권장 | PersonalAccessToken |
| IncludeCustomFields | 권장 | TRUE |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| login.bigcommerce.com | 해당 source에서 필수. Auth and token endpoints |
| api.bigcommerce.com | 해당 source에서 필수 |
| store-{STORE\_ID}.mybigcommerce.com | 해당 source에서 필수. Looks like it is used in some cases where you are inserting/updating data |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UBK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Azure DevOps](https://www.palantir.com/docs/foundry/available-connectors/azure-devops)
- [Palantir, Azure Synapse](https://www.palantir.com/docs/foundry/available-connectors/azure-synapse)
- [Palantir, Azure Table Storage](https://www.palantir.com/docs/foundry/available-connectors/azure-table-storage)
- [Palantir, Basecamp](https://www.palantir.com/docs/foundry/available-connectors/basecamp)
- [Palantir, BigCommerce](https://www.palantir.com/docs/foundry/available-connectors/bigcommerce)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
