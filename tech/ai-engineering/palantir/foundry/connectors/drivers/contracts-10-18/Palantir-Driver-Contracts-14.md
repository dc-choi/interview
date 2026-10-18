---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 14: mailchimp부터 microsoft-ads까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Mailchimp

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | APIKey |
| APIKey | 권장 | — |
| Datacenter | 권장 | None |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<DataCenter>.api.mailchimp.com | 해당 source에서 필수 |
| login.mailchimp.com | If AuthScheme=OAuth |
| mandrillapp.com | If hidden property UseTransactionalAPI=True |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/CMK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Marketo

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| URL | 필수 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| UseBulkAPI | 권장 | False |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<RESTEndpoint> | If using Schema=REST |
| \<SOAPEndpoint> | If using Schema=SOAP |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/DKK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## MarkLogic

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Password | 필수 | — |
| Server | 필수 | — |
| User | 필수 | — |
| UseSSL | 필수 | TRUE |
| API | 권장 | REST |
| Database | 권장 | — |
| Port | 권장 | 8000 |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/OMK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Microsoft Access

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| ConnectionType | 필수 | Local |
| DataSource | 필수 | C:\Users\Public\Documents\MyDatabase.accdb |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/DCK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Microsoft Ads

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| CustomerId | 필수 | — |
| DeveloperToken | 필수 | — |
| AccountId | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| bingads.microsoft.com | 해당 source에서 필수 |
| api.bingads.com | 해당 source에서 필수 |
| clientcenter.api.bingads.microsoft.com | 해당 source에서 필수 |
| login.microsoftonline.com | 해당 source에서 필수 |
| campaign.api.bingads.microsoft.com | If UseSandbox=False |
| clientcenter.api.bingads.microsoft.com | If UseSandbox=False |
| adinsight.api.bingads.microsoft.com | If UseSandbox=False |
| reporting.api.bingads.microsoft.com | If UseSandbox=False |
| campaign.api.sandbox.bingads.microsoft.com | If UseSandbox=True |
| clientcenter.api.sandbox.bingads.microsoft.com | If UseSandbox=True |
| adinsight.api.sandbox.bingads.microsoft.com | If UseSandbox=True |
| reporting.api.sandbox.bingads.microsoft.com | If UseSandbox=True |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/EZK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## 출처

- [Palantir, Mailchimp](https://www.palantir.com/docs/foundry/available-connectors/mailchimp)
- [Palantir, Marketo](https://www.palantir.com/docs/foundry/available-connectors/marketo)
- [Palantir, MarkLogic](https://www.palantir.com/docs/foundry/available-connectors/marklogic)
- [Palantir, Microsoft Access](https://www.palantir.com/docs/foundry/available-connectors/microsoft-access)
- [Palantir, Microsoft Ads](https://www.palantir.com/docs/foundry/available-connectors/microsoft-ads)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
