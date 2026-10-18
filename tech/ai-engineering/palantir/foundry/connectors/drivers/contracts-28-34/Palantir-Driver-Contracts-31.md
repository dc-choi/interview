---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 31: taxjar부터 twitter-ads까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## TaxJar

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| APIKey | 필수 | — |
| UseSandbox | 권장 | FALSE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.taxjar.com | If UseSandbox=FALSE (default) |
| api.sandbox.taxjar.com | If UseSandbox=TRUE |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JTK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Trello

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | OAuth |
| APIKey | 권장 | — |
| BoardId | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Token | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.trello.com | 해당 source에서 필수 |
| trello.com | If AuthScheme=OAuth |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UTK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## TSheets

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| CallbackURL | 권장 | — |
| IncludeCustomFields | 권장 | TRUE |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| rest.tsheets.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HCK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Twilio

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AccountSID | 필수 | — |
| AuthScheme | 필수 | AuthToken |
| AuthToken | 필수 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.twilio.com | 해당 source에서 필수 |
| sync.twilio.com | For ServiceLists and Services tables |
| insights.twilio.com | For CallSummary, CallEvents, and CallMetrics views |
| conversations.twilio.com | For Conversation view |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/BTK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Twitter Ads

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| OAuthClientId | 필수 | — |
| OAuthClientSecret | 필수 | — |
| AccountId | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| UseAppOnlyAuthentication | 권장 | TRUE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.twitter.com | 해당 source에서 필수 |
| ads-api.twitter.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HMK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, TaxJar](https://www.palantir.com/docs/foundry/available-connectors/taxjar)
- [Palantir, Trello](https://www.palantir.com/docs/foundry/available-connectors/trello)
- [Palantir, TSheets](https://www.palantir.com/docs/foundry/available-connectors/tsheets)
- [Palantir, Twilio](https://www.palantir.com/docs/foundry/available-connectors/twilio)
- [Palantir, Twitter Ads](https://www.palantir.com/docs/foundry/available-connectors/twitter-ads)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
