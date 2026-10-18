---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 7: cloudant부터 docusign까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Cloudant

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | OAuth |
| URL | 필수 | https://{instance id}-bluemix.cloudantnosqldb.appdomain.cloud |
| InitiateOAuth | 권장 | REFRESH |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | If AuthScheme=OAuth OR using local instance (local instance in the format \<Server>:\<Port>) |
| \<User>.cloudant.com | If AuthScheme=Basic |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/EWK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## CockroachDB

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Database | 필수 | — |
| Password | 필수 | — |
| Port | 필수 | 26257 |
| Server | 필수 | localhost |
| User | 필수 | — |
| UseSSL | 필수 | TRUE |
| Cluster | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수. Server and Port connection properties (default: localhost:26257) |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HJK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Confluence

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| Timezone | 필수 | America/New_York |
| URL | 필수 | https://yoursitename.atlassian.net |
| APIToken | 권장 | — |
| CloudId | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |
| api.atlassian.com | If AuthScheme=OAuth |
| \<SSOLoginURL> | If AuthScheme=Okta or Crowd |
| \<SSOExchangeURL> | If AuthScheme=Okta or Crowd |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UGK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Couchbase

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| ConnectionMode | 필수 | Cloud |
| CouchbaseService | 필수 | Analytics |
| DNSServer | 필수 | 8.8.8.8 |
| Server | 필수 | https://couchbase.server |
| UseSSL | 필수 | TRUE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server> | If ConnectionMode=Direct (Default); Server connection property. Can be an IP address or HTTP/S URL. Can accept multiple URLs |
| \<DNSServer> | If ConnectionMode=Cloud, DNS Server is used to look up server addresses (default port 53, port can be passed with \<Server>:\<Port>, but is not required) |
| \<N1QLPort> | If ConnectionMode=Direct and CouchbaseServer=N1QL, Port defaults to 18093 for SSL and 8093 when not SSL |
| \<AnalyticsPort> | If ConnectionMode=Direct and CouchbaseServer=Analytics, Port defaults to 18095 w/ SSL and 8095 w/o SSL |
| \<WebConsolePort> | If ConnectionMode=Direct, Port defaults to 18091 w/ SSL and 8091 w/o SSL |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/CKK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## DocuSign

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | OAuthJWT |
| CallbackURL | 권장 | http://localhost:33333 |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OAuthJWTCert | 권장 | — |
| OAuthJWTCertType | 권장 | PEMKEY_BLOB |
| OAuthJWTIssuer | 권장 | — |
| OAuthJWTSubject | 권장 | <YourUserID> |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| account.docusign.com | If UseSandbox=FALSE (default) |
| account-d.docusign.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UCK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Cloudant](https://www.palantir.com/docs/foundry/available-connectors/cloudant)
- [Palantir, CockroachDB](https://www.palantir.com/docs/foundry/available-connectors/cockroachdb)
- [Palantir, Confluence](https://www.palantir.com/docs/foundry/available-connectors/confluence)
- [Palantir, Couchbase](https://www.palantir.com/docs/foundry/available-connectors/couchbase)
- [Palantir, DocuSign](https://www.palantir.com/docs/foundry/available-connectors/docusign)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
