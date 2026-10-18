---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 17: microsoft-office-365부터 microsoft-power-bi-xmla까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Microsoft Office 365

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| DefaultGroups | 필수 | CurrentUser |
| DefaultUser | 필수 | CurrentUser |
| MessageContentType | 필수 | html |
| AuthScheme | 권장 | AzureServicePrincipal |
| AzureTenant | 권장 | — |
| GroupId | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| UserId | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| graph.microsoft.com | If AzureEnvironment=GLOBAL (default) |
| login.microsoftonline.com | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL |
| microsoftgraph.chinacloudapi.cn | If AzureEnvironment=CHINA |
| login.chinacloudapi.cn | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| graph.microsoft.us | If AzureEnvironment=USGOVT |
| login.microsoftonline.us | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |
| dod-graph.microsoft.us | If AzureEnvironment=USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/CXM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Microsoft OneDrive

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | AzureServicePrincipal |
| AzureTenant | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| graph.microsoft.com | If AzureEnvironment=GLOBAL (default) |
| login.microsoftonline.com | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL |
| microsoftgraph.chinacloudapi.cn | If AzureEnvironment=CHINA |
| login.chinacloudapi.cn | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| graph.microsoft.us | If AzureEnvironment=USGOVT |
| login.microsoftonline.us | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |
| dod-graph.microsoft.us | If AzureEnvironment=USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UOK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Microsoft OneNote

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | AzureServicePrincipal |
| AzureTenant | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| graph.microsoft.com | If AzureEnvironment=GLOBAL (default) |
| login.microsoftonline.com | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL |
| microsoftgraph.chinacloudapi.cn | If AzureEnvironment=CHINA |
| login.chinacloudapi.cn | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| graph.microsoft.us | If AzureEnvironment=USGOVT |
| login.microsoftonline.us | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |
| dod-graph.microsoft.us | If AzureEnvironment=USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UNK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Microsoft Planner

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | AzureServicePrincipal |
| AzureTenant | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Scope | 권장 | NoAdminConsent |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| graph.microsoft.com | If AzureEnvironment=GLOBAL (default) |
| login.microsoftonline.com | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL |
| microsoftgraph.chinacloudapi.cn | If AzureEnvironment=CHINA |
| login.chinacloudapi.cn | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| graph.microsoft.us | If AzureEnvironment=USGOVT |
| login.microsoftonline.us | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |
| dod-graph.microsoft.us | If AzureEnvironment=USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UIK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Microsoft Power BI® XMLA

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | AzureServicePrincipal |
| AzureTenant | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| PowerBIEnvironment | 권장 | NONE |
| Workspace | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.powerbi.com | IF AzureEnvironment=GLOBAL(default) |
| \*.pbidedicated.windows.net | IF AzureEnvironment=GLOBAL(default); The exact cluster used (added in the \*) is determined by calling the api.powerbi.com |
| login.microsoftonline.com | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT,USGOVTHIGH USGOVTDOD |
| api.powerbigov.us | IF AzureEnvironment=USGOVT |
| api.high.powerbigov.us | IF AzureEnvironment=USGOVTHIGH |
| api.mil.powerbigov.us | IF AzureEnvironment=USGOVTDOD |
| \*.pbidedicated.usgovcloudapi.net | IF AzureEnvironment=USGOVT,USGOVTHIGH,USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/LGM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## 출처

- [Palantir, Microsoft Office 365](https://www.palantir.com/docs/foundry/available-connectors/microsoft-office-365)
- [Palantir, Microsoft OneDrive](https://www.palantir.com/docs/foundry/available-connectors/microsoft-onedrive)
- [Palantir, Microsoft OneNote](https://www.palantir.com/docs/foundry/available-connectors/microsoft-onenote)
- [Palantir, Microsoft Planner](https://www.palantir.com/docs/foundry/available-connectors/microsoft-planner)
- [Palantir, Microsoft Power BI® XMLA](https://www.palantir.com/docs/foundry/available-connectors/microsoft-power-bi-xmla)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
