---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 15: microsoft-bing부터 microsoft-dynamics-crm까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Microsoft Bing

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| APIKey | 필수 | — |
| APIVersion | 권장 | V7 |
| Domain | 권장 | Bing |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.\<Domain>.microsoft.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/BMK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Microsoft Dataverse

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | AzureAD |
| OrganizationURL | 필수 | — |
| Schema | 필수 | Entities |
| AzureTenant | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OAuthGrantType | 권장 | CLIENT |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UVK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Microsoft Dynamics 365

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | AzureAD |
| Edition | 필수 | Sales |
| OrganizationURL | 필수 | https://myaccount.operations.dynamics.com/ |
| AzureTenant | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OAuthGrantType | 권장 | CLIENT |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<OrganizationURL> | 해당 source에서 필수. OrganizationURL connection property |
| \<ADFSServer> | If Edition=FinOpsOnPremise |
| login.microsoftonline.com | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If AuthScheme=AzureAD (default), AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/LJK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Microsoft Dynamics 365 Business Central

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | AzureAD |
| OrganizationURL | 필수 | https://businesscentral.dynamics.com/<Organization>/ |
| Company | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<OrganizationURL> | 해당 source에서 필수. OrganizationURL connection property (will contain more than just the base domain) |
| api.businesscentral.dynamics.com | This endpoint will likely be used in any cloud instance, unless on-prem is used |
| login.microsoftonline.com | If AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FBK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Microsoft Dynamics CRM

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| CRMVersion | 필수 | CRM2011+ |
| URL | 필수 | https://myOrg.crm.dynamics.com/, http://mySite/myOrganization |
| AuthScheme | 권장 | Auto |
| InitiateOAuth | 권장 | REFRESH |
| InternetFacingDeployment | 권장 | FALSE |
| LanguageCode | 권장 | 1033 |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OrganizationName | 권장 | — |
| Password | 권장 | — |
| ServerVersion | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |
| \<ADFSServer> | If CRMVersion='CRM2011+' (Default) and AuthScheme=AzureAD |
| login.microsoftonline.com | If CRMVersion=CRMOnline AND AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=GLOBAL (default) |
| login.chinacloudapi.cn | If CRMVersion=CRMOnline AND AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=CHINA |
| login.microsoftonline.us | If CRMVersion=CRMOnline AND AuthScheme=AzureAD, AzureServicePrincipal, AzureServicePrincipalCert AND AzureEnvironment=USGOVT or USGOVTDOD |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/RMK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Microsoft Bing](https://www.palantir.com/docs/foundry/available-connectors/microsoft-bing)
- [Palantir, Microsoft Dataverse](https://www.palantir.com/docs/foundry/available-connectors/microsoft-dataverse)
- [Palantir, Microsoft Dynamics 365](https://www.palantir.com/docs/foundry/available-connectors/microsoft-dynamics-365)
- [Palantir, Microsoft Dynamics 365 Business Central](https://www.palantir.com/docs/foundry/available-connectors/microsoft-dynamics-365-business-central)
- [Palantir, Microsoft Dynamics CRM](https://www.palantir.com/docs/foundry/available-connectors/microsoft-dynamics-crm)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
