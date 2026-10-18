---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 23: raisers-edge-nxt부터 rss까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Raisers Edge NXT

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

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

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Reckon

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Password | 필수 | — |
| URL | 필수 | http://localhost:8166 |
| User | 필수 | — |
| ApplicationName | 권장 | CData Reckon Connector |
| CompanyFile | 권장 | — |
| SSLServerCert | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property - Address and Port of the host machine running the CData QuickBooks Gateway |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/BAK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Reckon Accounts Hosted

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Password | 필수 | — |
| SubscriptionKey | 필수 | — |
| User | 필수 | — |
| CompanyFile | 권장 | — |
| CountryVersion | 권장 | 2021.R2.AU |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.reckon.com | 해당 source에서 필수 |
| identity.reckon.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KHK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Redis

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Password |
| Server | 필수 | {serverAddress} |
| UseSSL | 필수 | TRUE |
| EnableCluster | 권장 | FALSE |
| LogicalDatabase | 권장 | 0 |
| Password | 권장 | — |
| Port | 권장 | 6379 |
| ReplicaSet | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | Server and Port connection properties; default Port=6379 |
| \<SSHServer>:\<SSHPort> | If UseSSH=TRUE, default SSHPort=22 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/EIK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## RSS

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| URI | 필수 | https://myservice/myfeed/ |
| AuthScheme | 권장 | None |
| AuthToken | 권장 | — |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/RRK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## 출처

- [Palantir, Raisers Edge NXT](https://www.palantir.com/docs/foundry/available-connectors/raisers-edge-nxt)
- [Palantir, Reckon](https://www.palantir.com/docs/foundry/available-connectors/reckon)
- [Palantir, Reckon Accounts Hosted](https://www.palantir.com/docs/foundry/available-connectors/reckon-accounts-hosted)
- [Palantir, Redis](https://www.palantir.com/docs/foundry/available-connectors/redis)
- [Palantir, RSS](https://www.palantir.com/docs/foundry/available-connectors/rss)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
