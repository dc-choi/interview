---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 16: microsoft-dynamics-gp부터 microsoft-exchange까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Microsoft Dynamics GP

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| CompanyId | 필수 | — |
| URL | 필수 | https://{servername}:{port}/Dynamics/GPService |
| AuthScheme | 권장 | WSS |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property. Pattern: http://{server}:{port}/Dynamics/GPService |
| schemas.microsoft.com | 해당 source에서 필수 |
| schemas.datacontract.org | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/DPK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Microsoft Dynamics NAV

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| ServerInstance | 필수 | DynamicsNAV71 |
| URL | 필수 | https://{serverName}:{port} |
| AuthScheme | 권장 | Negotiate |
| Company | 권장 | CRONUS Canada, Inc. |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property. Pattern: http://{server}:{port} |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/CNK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Microsoft Excel

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| ConnectionType | 필수 | Azure Blob Storage |
| SSLMode | 필수 | IMPLICIT |
| URI | 필수 | — |
| AuthScheme | 권장 | AzureAD |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/RXK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Microsoft Excel Online

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | AzureServicePrincipal |
| AzureTenant | 권장 | — |
| Drive | 권장 | — |
| IncludeSharePointSites | 권장 | FALSE |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| ShowSharedDocuments | 권장 | FALSE |
| Workbook | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| graph.microsoft.com | If AzureEnvironment=GLOBAL (default) |
| login.microsoftonline.com | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL |
| microsoftgraph.chinacloudapi.cn | If AzureEnvironment=CHINA |
| login.chinacloudapi.cn | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| graph.microsoft.us | If AzureEnvironment=USGOVT |
| login.microsoftonline.us | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |
| dod-graph.microsoft.us | If AzureEnvironment=USGOVTDOD |
| \<SharepointURL> | If setting the SharepointURL property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FXK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Microsoft Exchange

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| DefaultGroups | 필수 | AllGroups |
| DefaultUser | 필수 | CurrentUser |
| Server | 필수 | https://outlook.office365.com/EWS/Exchange.asmx |
| AuthScheme | 권장 | AzureServicePrincipal |
| AzureTenant | 권장 | — |
| GroupId | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Office365Environment | 권장 | NONE |
| Platform | 권장 | Exchange_Online |
| Schema | 권장 | EWS |
| UserId | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server> | 해당 source에서 필수. For Exchange Online, use Server=' https://outlook.office365.com/EWS/Exchange.asmx' |
| outlook.office365.com | If Platform=Exchange_Online AND Schema=EWS |
| graph.microsoft.com | If Platform=Exchange_Online AND Schema=MSGraph |
| login.microsoftonline.com | If Platform=Exchange_Online (default) AND AuthScheme=AzureAD, AzureServicePrincipal, or AzureServicePrincipalCert |
| \<KerberosKDC>:88 | If AuthScheme=Negotiate |
| \<KerberosServiceKDC>:88 | If AuthScheme=Negotiate AND Kerberos topology uses multiple realms |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/CEM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Microsoft Dynamics GP](https://www.palantir.com/docs/foundry/available-connectors/microsoft-dynamics-gp)
- [Palantir, Microsoft Dynamics NAV](https://www.palantir.com/docs/foundry/available-connectors/microsoft-dynamics-nav)
- [Palantir, Microsoft Excel](https://www.palantir.com/docs/foundry/available-connectors/microsoft-excel)
- [Palantir, Microsoft Excel Online](https://www.palantir.com/docs/foundry/available-connectors/microsoft-excel-online)
- [Palantir, Microsoft Exchange](https://www.palantir.com/docs/foundry/available-connectors/microsoft-exchange)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
