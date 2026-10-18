---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 18: microsoft-project부터 microsoft-teams까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Microsoft Project

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| URL | 필수 | https://contoso.com/sites/pwa/ |
| AuthScheme | 권장 | SharePointOnlineCookies |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| Schema | 권장 | ODataV2 |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수 |
| \<SSOLoginURL> | If AuthScheme=ADFS, OKTA |
| login.microsoftonline.com | If AuthScheme=AzureAD, OAuth AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If AuthScheme=AzureAD, OAuth AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If AuthScheme=AzureAD, OAuth AND AzureEnvironment=USGOVT or USGOVTDOD |
| \<Subdomain>.onelogin.com | If AuthScheme=OneLogin, set in SSOProperties |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/COK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Microsoft SharePoint

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Schema | 필수 | SOAP |
| URL | 필수 | https://teams.contoso.com |
| AuthScheme | 권장 | AzurePassword |
| AzureTenant | 권장 | — |
| Password | 권장 | — |
| SharePointEdition | 권장 | SharePoint Online |
| User | 권장 | username@domain.onmicrosoft.com |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |
| \<KerberosKDC>:88 | If SharePointEdition='SharePoint OnPremise' (default) AND AuthScheme=Negotiate |
| \<KerberosServiceKDC>:88 | If SharePointEdition='SharePoint OnPremise' (default) AND AuthScheme=Negotiate AND Kerberos topology uses multiple realms |
| \<SSOLoginURL> | If SharePointEdition='SharePoint OnPremise' (default) AND AuthScheme=ADFS |
| login.microsoftonline.com | If SharePointEdition='SharePoint Online' AND AuthScheme=AzureAD, AzurePassword, SharePointOAuth, OAuthJWT  AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If SharePointEdition='SharePoint Online' AND AuthScheme=AzureAD, AzurePassword, SharePointOAuth, OAuthJWT AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If SharePointEdition='SharePoint Online' AND AuthScheme=AzureAD, AzurePassword, SharePointOAuth, OAuthJWT AND AzureEnvironment=USGOVT or USGOVTDOD |

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Microsoft SharePoint Excel

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | NTLM |
| File | 필수 | Book1.xlsx |
| SharePointVersion | 필수 | SharePoint 2013 |
| URL | 필수 | https://myorg.sharepoint.com |
| Folder | 권장 | — |
| Library | 권장 | — |
| Password | 권장 | — |
| User | 권장 | — |
| UseRESTAPI | 권장 | TRUE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |
| \<KerberosKDC>:88 | If SharePointEdition='SharePoint OnPremise' (default) AND AuthScheme=Negotiate |
| \<KerberosServiceKDC>:88 | If SharePointEdition='SharePoint OnPremise' (default) AND AuthScheme=Negotiate AND Kerberos topology uses multiple realms |
| \<SSOLoginURL> | If SharePointEdition='SharePoint OnPremise' (default) AND AuthScheme=ADFS |
| login.microsoftonline.com | If SharePointEdition='SharePoint Online' AND AuthScheme=AzureAD, AzurePassword, SharePointOAuth, OAuthJWT  AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If SharePointEdition='SharePoint Online' AND AuthScheme=AzureAD, AzurePassword, SharePointOAuth, OAuthJWT AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If SharePointEdition='SharePoint Online' AND AuthScheme=AzureAD, AzurePassword, SharePointOAuth, OAuthJWT AND AzureEnvironment=USGOVT or USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/DTK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Microsoft SQL Server Analysis Services

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| URL | 필수 | https://{serverAddress}/olap/msmdpump.dll |
| AuthScheme | 권장 | Basic |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |
| \<KerberosKDC>:88 | If AuthScheme=Negotiate |
| \<KerberosServiceKDC>:88 | If AuthScheme=Negotiate AND Kerberos topology uses multiple realms |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FYK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Microsoft Teams

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | AzureAD |
| AzureTenant | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| graph.microsoft.com | If AzureEnvironment=GLOBAL (default) |
| login.microsoftonline.com | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL (default) |
| microsoftgraph.chinacloudapi.cn | If AzureEnvironment=CHINA |
| login.chinacloudapi.cn | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| graph.microsoft.us | If AzureEnvironment=USGOVT |
| login.microsoftonline.us | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |
| dod-graph.microsoft.us | If AzureEnvironment=USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/GSK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Microsoft Project](https://www.palantir.com/docs/foundry/available-connectors/microsoft-project)
- [Palantir, Microsoft SharePoint](https://www.palantir.com/docs/foundry/available-connectors/microsoft-sharepoint)
- [Palantir, Microsoft SharePoint Excel](https://www.palantir.com/docs/foundry/available-connectors/microsoft-sharepoint-excel)
- [Palantir, Microsoft SQL Server Analysis Services](https://www.palantir.com/docs/foundry/available-connectors/microsoft-sql-server-analysis-services)
- [Palantir, Microsoft Teams](https://www.palantir.com/docs/foundry/available-connectors/microsoft-teams)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
