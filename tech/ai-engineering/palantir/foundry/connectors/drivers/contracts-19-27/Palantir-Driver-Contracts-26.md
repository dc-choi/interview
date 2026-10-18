---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 26: sap-bydesign부터 sap-hana-xsa까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## SAP ByDesign

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| Password | 필수 | — |
| ServiceType | 필수 | AnalyticsService |
| URL | 필수 | https://mySite.sapbydesign.com |
| User | 필수 | — |
| ServiceName | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UYK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## SAP Cloud for Customer

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| Tenant | 권장 | tenantname.crm.ondemand.com |
| URL | 권장 | https://tenantname.crm.ondemand.com/sap/byd/odata/v1/c4codata/ |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/OHK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## SAP Concur

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Region | 필수 | US |
| AuthScheme | 권장 | OAuthPassword |
| ConcurInstanceURL | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| LoginId | 권장 | — |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| UserId | 권장 | — |
| Username | 권장 | — |
| UseSandbox | 권장 | FALSE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| developer.concur.com | 해당 source에서 필수 |
| us2.api.concursolutions.com | If UseSandbox=FALSE (default) AND Region=US (default) |
| www-us2.api.concursolutions.com | If UseSandbox=FALSE (default) AND Region=US (default) - OAuth Authorization URL |
| eu2.api.concursolutions.com | If UseSandbox=FALSE (default) AND Region=EU |
| www-eu2.api.concursolutions.com | If UseSandbox=FALSE (default) AND Region=EU - OAuth Authorization URL |
| cn.api.concurcdc.cn | If UseSandbox=FALSE (default) AND Region=CN |
| www-cn.api.concurcdc.cn | If UseSandbox=FALSE (default) AND Region=CN - OAuth Authorization URL |
| us-impl.api.concursolutions.com | If UseSandbox=TRUE AND Region=US (default) |
| www-us-impl.api.concursolutions.com | If UseSandbox=TRUE AND Region=US (default) - OAuth Authorization URL |
| emea-impl.api.concursolutions.com | If UseSandbox=TRUE AND Region=EU |
| www-emea-impl.api.concursolutions.com | If UseSandbox=TRUE AND Region=EU - OAuth Authorization URL |
| \<GeoLocation> | If UseNewOAuthVersion=FALSE - GeoLocation property (retrieved automatically unless OAuthAccessToken set) |
| \<ConcurInstanceURL> | Used with older API versions (API v1-3) |
| concursolutions.com | If UseNewOAuthVersion=FALSE AND GeoLocation empty AND ConcurInstanceURL empty |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FNK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## SAP Fieldglass

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| APIKey | 필수 | — |
| ConnectorDataFormat | 필수 | CSV |
| EnvironmentURL | 필수 | https://myInstance.com |
| OAuthClientId | 필수 | — |
| OAuthClientSecret | 필수 | — |
| InitiateOAuth | 권장 | REFRESH |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<EnvironmentURL> | 해당 source에서 필수. EnvironmentURL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UFK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## SAP HANA XSA

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| URL | 필수 | https://{host}:{port}/{odataService} |
| AuthScheme | 권장 | OAuthPassword |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OAuthGrantType | 권장 | PASSWORD |
| Password | 권장 | — |
| User | 권장 | — |
| XSUAAURL | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. OData Service Endpoint - URL connection property (i.e., URL='http://hxehost.com/euro.xsodata') |
| \<XSUAAURL> | If AuthScheme=OAuth,OAuthPassword - URL to retrieve Access Token from |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HHK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, SAP ByDesign](https://www.palantir.com/docs/foundry/available-connectors/sap-bydesign)
- [Palantir, SAP Cloud for Customer](https://www.palantir.com/docs/foundry/available-connectors/sap-cloud-for-customer)
- [Palantir, SAP Concur](https://www.palantir.com/docs/foundry/available-connectors/sap-concur)
- [Palantir, SAP Fieldglass](https://www.palantir.com/docs/foundry/available-connectors/sap-fieldglass)
- [Palantir, SAP HANA XSA](https://www.palantir.com/docs/foundry/available-connectors/sap-hana-xsa)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
