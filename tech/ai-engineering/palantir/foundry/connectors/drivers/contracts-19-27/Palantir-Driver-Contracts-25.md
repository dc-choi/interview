---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 25: salesforce-marketing-cloud-account-engagement부터 sap-businessobjects-bi까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Salesforce Marketing Cloud Account Engagement

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| BusinessUnitID | 필수 | — |
| Schema | 필수 | SalesforcePardotV5 |
| AuthScheme | 권장 | OAuthPassword |
| InitiateOAuth | 권장 | GETANDREFRESH |
| IsDemoAccount | 권장 | FALSE |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| pi.pardot.com | If IsDemoAccount=FALSE (default) |
| pi.demo.pardot.com | If IsDemoAccount=TRUE |
| login.salesforce.com | If UseSalesforceSandbox=FALSE (default) |
| \<Site>.my.salesforce.com | 해당 source에서 필수. URL returned by API after authentication |
| test.salesforce.com | If UseSalesforceSandbox=TRUE |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/GPK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Salesloft

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| APIKey | 권장 | — |
| AuthScheme | 권장 | APIKey |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.salesloft.com | 해당 source에서 필수 |
| accounts.salesloft.com | If AuthScheme=OAuth |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KBK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## SAP Ariba Procurement

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| API | 필수 | PurchaseOrdersBuyerAPI-V1 |
| APIKey | 필수 | — |
| AuthScheme | 필수 | OAuthClient |
| Environment | 권장 | PRODUCTION |
| MaxThreads | 권장 | 5 |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| openapi.ariba.com | If DataCenter=US (default) |
| api.ariba.com | If DataCenter=US (default) |
| eu.openapi.ariba.com | If DataCenter=EU |
| api-eu.ariba.com | If DataCenter=EU |
| ru.openapi.ariba.com | If DataCenter=RU |
| api-ru.ariba.com | If DataCenter=RU |
| mn1.openapi.ariba.com | If DataCenter=UAE |
| api.mn1.ariba.com | If DataCenter=UAE |
| mn2.openapi.ariba.com | If DataCenter=KSA |
| api.mn2.ariba.com | If DataCenter=KSA |
| openapi.sapariba.cn | If DataCenter=CN |
| api.sapariba.cn | If DataCenter=CN |
| openapi.au.cloud.ariba.com | If DataCenter=AU |
| api.au.cloud.ariba.com | If DataCenter=AU |
| openapi.jp.cloud.ariba.com | If DataCenter=JP |
| api.jp.cloud.ariba.com | If DataCenter=JP |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/PAM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## SAP Business One

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| CompanyDB | 필수 | — |
| Password | 필수 | — |
| URL | 필수 | https://{serverAddress}:{port}/b1s/v{version} |
| User | 필수 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property; default format URL='http://[server]:[port]/b1s/[version]' |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FVK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## SAP BusinessObjects BI

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| Password | 필수 | — |
| URL | 필수 | https://myserver:6405/biprws |
| User | 필수 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property; default format URL='http://{SERVER-NAME}:6405/biprws' |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/GJK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## 출처

- [Palantir, Salesforce Marketing Cloud Account Engagement](https://www.palantir.com/docs/foundry/available-connectors/salesforce-marketing-cloud-account-engagement)
- [Palantir, Salesloft](https://www.palantir.com/docs/foundry/available-connectors/salesloft)
- [Palantir, SAP Ariba Procurement](https://www.palantir.com/docs/foundry/available-connectors/sap-ariba-procurement)
- [Palantir, SAP Business One](https://www.palantir.com/docs/foundry/available-connectors/sap-business-one)
- [Palantir, SAP BusinessObjects BI](https://www.palantir.com/docs/foundry/available-connectors/sap-businessobjects-bi)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
