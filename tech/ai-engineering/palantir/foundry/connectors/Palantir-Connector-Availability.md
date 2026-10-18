---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 커넥터 목록, 과거 연동과 번역 자료의 범위

커넥터 목록에 있는 제품 이름과 전용 connector의 현재 실행 가능성은 다르다. NoSQL Stores와 Other source types 페이지는 Cassandra, MongoDB 등 과거 연동 예시와 범용 연결 가능성을 설명한다. 목록만으로 모든 제품에 동일한 전용 UI, export나 CDC가 있다고 판단하지 않는다.

원본이 JDBC/REST/file 방식 중 어느 경로인지 먼저 확인한다. custom JDBC의 driver, Generic/REST의 외부 코드, 파일 전송 source는 credential과 데이터 모델이 다르다. source가 보이지 않으면 enrollment availability나 Palantir 지원 경로를 확인한다.

## 문서 안의 불일치

자동 생성 driver 문서의 default와 설명이 충돌하면 추정으로 하나를 고르지 않는다. Azure Table Storage의 AuthScheme 설명/SAS와 기본값 표, Couchbase의 Cloud/Direct 표현 등은 실제 UI, 선택한 auth mode와 해당 driver 매뉴얼을 대조한다.

Airtable의 PAT/metadata API/BaseID 조건, Smartsheet의 고정 JDBC URL과 properties, WordPress Basic credential 전달은 제품 이름만으로 추론할 수 없다. driver별 reference 표와 공식 source를 함께 사용한다.

## Authorize.Net 번역 alias

확인일의 영어 `authorizenet` 주소는 본문을 확보하지 못했고 공개 중국어 번역 alias에서 652자 본문을 확인했다. 이 페이지는 AIP 기계번역이며 번역 정확성이 검증되지 않았다는 경고를 포함한다. 현재 영어 계약을 직접 확인한 자료와 구분한다.

그 번역은 Palantir-provided JDBC driver 및 CData CWJ 매뉴얼을 안내하며 직접 연결 egress를 `UseSandbox=FALSE`이면 api.authorize.net, TRUE이면 apitest.authorize.net으로 나눈다. agent 연결은 agent의 대상 도달과 원본의 inbound 허용이 필요하다고 설명한다. 이 한정된 내용으로 auth 필수 속성, export나 현재 영어 기능을 추가 추론하지 않는다.

## 출처

- [Palantir, nosql-stores](https://www.palantir.com/docs/foundry/available-connectors/nosql-stores)
- [Palantir, other-source-types](https://www.palantir.com/docs/foundry/available-connectors/other-source-types)

- [Palantir, Authorize.Net (중국어 기계번역)](https://palantir.com/docs/zh/foundry/available-connectors/authorizenet/)

## 관련 문서

- [[Palantir-Connector-Contracts]]
