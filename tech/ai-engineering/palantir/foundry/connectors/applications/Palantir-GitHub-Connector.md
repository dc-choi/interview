---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# GitHub 데이터 읽기와 앱 기반 외부 코드

driver의 relational table 읽기와 GitHub REST write를 구별한다. source 하나를 외부 코드에서 재사용할 수 있으나 `get_https_connection`을 통한 범용 client를 가정하지 않고 Python Requests/TypeScript source fetch의 문서 경로를 따른다.

## credential 선택

OAuth는 CData app/client ID/secret과 interactive authorization, refresh를 구성한다. GitHub App은 설치 repository와 fine-grained permission을 줄 수 있다. OAuth App credential을 GitHub App의 installation-token 흐름에 대입하지 않는다.

GitHub App code는 공개 app ID/client ID와 secret private key를 나눈다. RS256 JWT는 iat를 약 60초 앞당기고 exp를 약 540초 뒤로 두는 예제를 제공한다. repository의 installation을 찾은 뒤 약 한 시간 유효한 installation token을 발급한다. 긴 작업은 만료와 갱신을 처리한다.

## 실행과 write

live preview에서는 source binding이 되지 않아 실패할 수 있다. 배포된 함수/serverless Workshop 경로에서 시험해야 실제 실행 근거가 된다.

예제의 issue read는 `per_page=100`인 한 page다. 전체 pagination이 구현됐다고 간주하지 않는다. issue body PATCH는 전체 body를 교체하므로 stale read 뒤 다른 변경을 덮어쓸 수 있다. 필요한 원본 permission, 오류 응답과 write 결과를 확인한다.

## 출처

- [Palantir, github](https://www.palantir.com/docs/foundry/available-connectors/github)

## 관련 문서

- [[Palantir-Connector-Contracts]]
