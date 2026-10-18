---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 21: outreach부터 pipedrive까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Outreach

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| APIVersion | 필수 | v2 |
| IncludeCustomFields | 권장 | TRUE |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.outreach.io | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KRK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Paylocity

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| CompanyId | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| IV | 권장 | — |
| Key | 권장 | — |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| RSAPublicKey | 권장 | — |
| UsePayEntryAPI | 권장 | FALSE |
| UseSandbox | 권장 | FALSE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.paylocity.com | If UseSandbox=FALSE (default) |
| apisandbox.paylocity.com | If UseSandbox=TRUE |
| dc1prodgwext.paylocity.com | If UsePayEntryAPI=TRUE AND UseSandbox=FALSE (default) |
| dc1demogwext.paylocity.com | If UsePayEntryAPI=TRUE AND UseSandbox=TRUE |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KPK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## PayPal

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Schema | 필수 | SOAP |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| Signature | 권장 | — |
| User | 권장 | — |
| UseSandbox | 권장 | FALSE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api-3t.paypal.com | If Schema=SOAP (default) AND UseSandbox=FALSE (default) |
| api.paypal.com | If Schema=REST AND UseSandbox=FALSE (default) |
| paypal.com | If Schema=REST AND UseSandbox=FALSE (default) |
| api-3t.sandbox.paypal.com | If Schema=SOAP (default) AND UseSandbox=TRUE |
| api.sandbox.paypal.com | If Schema=REST AND UseSandbox=TRUE |
| sandbox.paypal.com | If Schema=REST AND UseSandbox=TRUE |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/BPK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Pinterest

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AdAccountId | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| pinterest.com | 해당 source에서 필수 |
| api.pinterest.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UPK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Pipedrive

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| CompanyDomain | 필수 | https://myCompanyDomain.pipedrive.com |
| Schema | 필수 | V1 |
| APIToken | 권장 | — |
| AuthScheme | 권장 | Basic |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<CompanyDomain> | 해당 source에서 필수. CompanyDomain connection property |
| oauth.pipedrive.com | If AuthScheme=OAuth |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KDK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Outreach](https://www.palantir.com/docs/foundry/available-connectors/outreach)
- [Palantir, Paylocity](https://www.palantir.com/docs/foundry/available-connectors/paylocity)
- [Palantir, PayPal](https://www.palantir.com/docs/foundry/available-connectors/paypal)
- [Palantir, Pinterest](https://www.palantir.com/docs/foundry/available-connectors/pinterest)
- [Palantir, Pipedrive](https://www.palantir.com/docs/foundry/available-connectors/pipedrive)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
