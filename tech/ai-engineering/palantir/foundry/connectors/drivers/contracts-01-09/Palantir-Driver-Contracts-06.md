---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 6: blackbaud-raisers-edge-nxt부터 certinia까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Blackbaud Raisers Edge NXT

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| SubscriptionKey | 필수 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.sky.blackbaud.com | 해당 source에서 필수 |
| oauth2.sky.blackbaud.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JZK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Bugzilla

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| APIKey | 필수 | — |
| URL | 필수 | https://<BugzillaURL> |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/SBK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Bullhorn CRM

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| DataCenterCode | 필수 | — |
| IncludeCustomFields | 권장 | TRUE |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| RestURL | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| Data-center-specific API URLs | 해당 source에서 필수. Determined by the DataCenterCode set |
| \<URL> | Required if the OAuth flow is executed manually |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HAK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Cassandra

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| Database | 필수 | — |
| Password | 필수 | — |
| Port | 필수 | 9042 |
| Server | 필수 | — |
| User | 필수 | — |
| UseSSL | 필수 | TRUE |
| ConsistencyLevel | 권장 | ONE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | If UseSSH=FALSE (default), Server and Port connection properties (default: localhost:9042) |
| \<LDAPServer>:\<LDAPPort> | If AuthScheme=LDAP (default Port=389) |
| \<SSHServer>:\<SSHPort> | If UseSSH=TRUE (default Port=22) |
| \<KerberosKDC>:88 | If AuthScheme=Kerberos |
| \<KerberosServiceKDC>:88 | If AuthScheme=Kerberos and Kerberos topology uses multiple realms |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/RCK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Certinia

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | OAuth |
| APIVersion | 권장 | 62.0 |
| InitiateOAuth | 권장 | REFRESH |
| LoginURL | 권장 | https://login.salesforce.com/services/Soap/c/58.0 |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| SecurityToken | 권장 | — |
| User | 권장 | — |
| UseSandbox | 권장 | FALSE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| test.salesforce.com | If UseSandbox=TRUE |
| \<Site>.my.salesforce.com | Returned by Salesforce when authenticating |
| login.salesforce.com | Default LoginURL, overridden by LoginURL property. LoginURL used when AuthScheme=Basic, OAuth, OAuthPassword, OAuthJWT, OAuthPKCE |
| \<LoginURL> | Used in place of login.salesforce.com |
| \<SSOLoginURL> | If AuthScheme=Okta, PingFederate, ADFS |
| \<Subdomain>.onelogin.com | If AuthScheme=OneLogin. \<Subdomain> is set in SSOProperties |
| \<SSOExchangeURL> | If AuthScheme=Okta, PingFederate, ADFS, OneLogin, AzureAD |
| \<Resource> | If AuthScheme=AzureAD. \<Resource> is set in SSOProperties |
| \<RelyingParty> | If AuthScheme=ADFS. \<RelyingParty> set in SSOProperties |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HFK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Blackbaud Raisers Edge NXT](https://www.palantir.com/docs/foundry/available-connectors/blackbaud-raisers-edge-nxt)
- [Palantir, Bugzilla](https://www.palantir.com/docs/foundry/available-connectors/bugzilla)
- [Palantir, Bullhorn CRM](https://www.palantir.com/docs/foundry/available-connectors/bullhorn-crm)
- [Palantir, Cassandra](https://www.palantir.com/docs/foundry/available-connectors/cassandra)
- [Palantir, Certinia](https://www.palantir.com/docs/foundry/available-connectors/certinia)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
