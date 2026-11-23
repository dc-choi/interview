---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
---

# GitHub 데이터 읽기와 앱 기반 외부 코드

driver의 relational table 읽기와 GitHub REST write를 구별한다. source 하나를 외부 코드에서 재사용할 수 있으나 `get_https_connection`을 통한 범용 client를 가정하지 않고 Python Requests/TypeScript source fetch의 문서 경로를 따른다.

## credential 선택

GitHub에 등록한 app의 Client ID와 secret을 driver 속성 `OAuthClientId`, `OAuthClientSecret`에 넣고 `InitiateOAuth=REFRESH`로 두면 첫 sync에서 web application flow로 인가하고 token을 갱신한다. GitHub App은 설치 repository와 fine-grained permission을 줄 수 있다. OAuth App credential을 GitHub App의 installation-token 흐름에 대입하지 않는다.

GitHub App code는 공개 app ID/client ID와 secret private key를 나눈다. RS256 JWT는 iat를 약 60초 앞당기고 exp를 약 540초 뒤로 두는 예제를 제공한다. repository의 installation을 찾은 뒤 약 한 시간 유효한 installation token을 발급한다. 긴 작업은 만료와 갱신을 처리한다.

GitHub App private key는 source의 Connection details에서 새 encrypted property로 추가하고 이름을 `Other`로 두면 코드에서 `get_secret("Other")`로 읽는다. Python 예제는 공개 값인 app ID 또는 client ID를 코드 상수로, TypeScript 예제는 source의 `OAuthClientId`로 읽는다. 이 외부 코드 흐름은 OAuth App에서는 지원되지 않으며 OAuth App은 personal access token이 필요하다고 문서가 밝힌다.

2026-11-24 확인한 문서의 Python pipeline 예제는 `@external_systems`, `@transform.using`과 `LightweightOutput`을 쓰고 결과를 polars DataFrame의 `write_table`로 쓴다. 2026-10 수집본은 같은 위치에서 pandas DataFrame을 넘겼다. `LightweightOutput.write_table`은 pandas, Arrow, polars 등을 받으므로 기존 pandas 코드를 반드시 바꿔야 하는 것은 아니며, 예제를 옮길 때 polars를 run dependency에 선언했는지 확인한다.

## 실행과 write

function live preview는 source를 binding하지 못해 이 예제들이 preview에서 항상 실패한다고 문서가 밝힌다. 함수는 배포한 뒤 Workshop application이나 serverless 실행으로 시험하고, Python pipeline 예제는 transform build로 확인한다.

예제의 issue read는 `per_page=100`인 한 page다. 전체 pagination이 구현됐다고 간주하지 않는다. issue body PATCH는 전체 body를 교체하므로 stale read 뒤 다른 변경을 덮어쓸 수 있다. 문서의 설정 예시는 Contents와 Issues 읽기 권한만 주므로 issue PATCH에는 GitHub App의 Issues write 권한을 따로 준다. 오류 응답과 write 결과도 확인한다.

## 출처

- [Palantir, github](https://www.palantir.com/docs/foundry/available-connectors/github)
- [Palantir, api-lightweightoutput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightoutput)
- [GitHub Docs, Permissions required for GitHub Apps](https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps)

## 관련 문서

- [[Palantir-Connector-Contracts]]
