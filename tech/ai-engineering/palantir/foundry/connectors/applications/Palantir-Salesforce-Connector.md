---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Salesforce 인증과 중복 가능한 증분

native Salesforce connector는 Bulk API를 기본으로 사용하고 2,000행 넘는 경우 문서가 권장한다. UseBulkAPI=false의 SOAP 경로는 별도 API limit을 따른다. Currency는 Decimal, Date는 Date, DateTime은 Long, Time은 Integer, multi-picklist는 string 변환을 확인한다.

## JWT와 사용자 인증

JWT 경로는 X509 certificate와 app consumer key를 사용하며 consumer secret을 같은 자리의 값으로 쓰지 않는다. app에 certificate를 올려 JWT를 켜는 단계와 JWT access-token format 설정은 다르다.

Spring 2026 신규 connected app 제한과 External Client App 안내는 확인일 Palantir 문서의 제품 변화 설명이다. 기존 connected app이 즉시 작동하지 않는다고 확대하지 않는다. 실제 org 정책은 Salesforce 원문과 관리자 설정으로 확인한다.

Admin-approved preauthorization뿐 아니라 사용자 profile/permission set에 app을 허용해야 한다. 새 app 반영에 약 30분이 걸릴 수 있다. 최초 browser authorization의 localhost:12345 not-found 화면이 곧 인증 실패라는 뜻은 아니다.

api scope와 browser refresh/offline scope의 조건을 구별한다. username/password flow는 full scope/self-authorization와 untrusted network의 password security-token suffix 조건을 따른다. 현재 connector가 client ID/secret을 받는다는 가정으로 기존 필드를 바꾸지 않는다.

## 증분과 migration

incremental은 이전 max 이상의 `>=` 경계를 사용해 같은 timestamp의 행을 다시 가져올 수 있다. 업무 key와 수정 시각에 맞춰 중복 제거한다. 엄격한 `>`인 JDBC 방식으로 바꾸면 경계 행이 빠질 수 있다.

legacy YAML `type: salesforce`의 새 source migration은 auth/claim 매핑을 확인한다. API version이 같을 때 schema 보존 조건을 따르고 새 dataset lineage를 remap한 뒤 이전 연결을 제거한다. Salesforce V2 이름/이동 안내는 추가 기능 계약으로 세지 않는다.

## 출처

- [Palantir, salesforce](https://www.palantir.com/docs/foundry/available-connectors/salesforce)
- [Palantir, salesforce-v2](https://www.palantir.com/docs/foundry/available-connectors/salesforce-v2)

## 관련 문서

- [[Palantir-Connector-Contracts]]
