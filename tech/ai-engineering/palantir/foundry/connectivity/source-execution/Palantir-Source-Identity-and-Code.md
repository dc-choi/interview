---
tags: [palantir, oidc, credentials, python]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Source의 신뢰 관계와 코드 접근

OIDC는 Foundry에 장기 원천 비밀을 복제하는 대신 원천 시스템과 신뢰 관계를 구성하는 방식이다. Foundry가 발급한 identity token을 원천이 검증하고, 원천의 권한 체계가 실제 접근 범위를 결정한다.

## Token과 권한 경계

Foundry token의 `iss`는 발급자, `sub`는 Source RID, `aud`는 대상 시스템이다. Source RID 조건을 포함해 신뢰할 Source를 제한한다. 발급자만 신뢰하고 모든 Source를 허용하면 의도하지 않은 Source에도 권한이 열릴 수 있다.

문서상 Foundry OIDC token은 한 시간 후 만료된다. 장기 작업은 시작 시 받은 token을 계속 재사용하지 않고 Source에서 새 세션 자격 증명을 요청해야 한다. 원천이 발급하는 후속 credential의 수명까지 모두 한 시간이라는 뜻은 아니다.

OIDC 개요의 지원 목록에는 OneLake/ADLS Gen2, BigQuery, Databricks, Google Cloud Storage, S3와 Snowflake가 있다. Python의 `get_session_credentials()` 지원 목록은 S3 Cloud Identity/OIDC, BigQuery OIDC, Databricks OIDC와 Snowflake OIDC다. Connector의 OIDC 지원과 Python 세션 갱신 API 지원은 같은 목록으로 취급하지 않는다.

`get_session_credentials()`가 반환한 `Refreshable`에서 `.get()`으로 현재 credential을 얻는다. S3는 `AwsCredentials`, OIDC 예시는 `OauthCredentials`를 사용한다. Snowflake는 token을 OAuth token으로 직접 쓰지만 Databricks는 원천 token으로 교환해야 한다. Client를 한 번 생성했다고 이후 만료와 갱신이 자동 해결되는지는 별도 확인해야 한다.

## Python client와 네트워크

REST Source의 사전 구성 client는 Python `requests.Session` 기반이며 정확히 하나의 HTTP connection을 요구한다. 연결이 없거나 여러 개면 `Only single connection sources are supported.` 오류가 발생한다. 실행 중 `os.chdir()`로 작업 디렉터리를 바꾸면 보안 연결에 필요한 환경 참조가 깨질 수 있다.

`get_secret()`은 코드에서 비밀 값에 접근한다. Source를 가져온 저장소의 편집자에게는 이 능력도 생기므로 UI에서 값이 가려진다는 사실을 비밀 접근 차단으로 간주하지 않는다.

현재 Sources in Python 문서는 agent proxy 연결에 `create_socket(host, port)`와 `get_https_proxy_uri()`를 제공한다. 비 HTTPS client나 HTTPX를 사용하는 경로도 명시한다. 과거 sunset proxy runtime의 내장 client 필수 조건을 현재 agent proxy policy 전체에 확대하지 않는다.

## 문서 간 지원 차이

External transforms의 일부 설명은 HTTPS client가 없는 Source의 비밀 이외 속성 접근이 불가능하다고 한다. 현재 Sources in Python 문서는 Foundry API가 지원하는 Source에 `source_configuration` 접근을 제공한다. 따라서 모든 속성을 읽을 수 있다는 가정과 모두 불가능하다는 가정을 모두 피하고 Source 종류와 API 지원을 확인한다.

Core concepts의 일부 코드 지원 제한보다 OIDC 및 Sources in Python의 구체적 지원 목록이 넓다. 세션 API가 명시된 Source를 우선 확인하되, 실제 enrollment와 library에서 사용 가능한지는 별도 실행 검증한다.

## 출처

- [Palantir, OpenID Connect authentication](https://www.palantir.com/docs/foundry/data-connection/oidc)
- [Palantir, Sources in Python environments](https://www.palantir.com/docs/foundry/data-connection/sources-in-python)
- [Palantir, External transforms](https://www.palantir.com/docs/foundry/data-connection/external-transforms)

## 관련 문서

- [[Palantir-External-Transforms-Governance|외부 연산과 export 통제]]
- [[Palantir-Data-Connection-Permissions|Source와 저장소의 권한]]
- [[Palantir-Data-Connectivity|데이터 연결]]

문서 계약을 비교했으며 token 발급, 교환과 갱신은 실행하지 않았다.
