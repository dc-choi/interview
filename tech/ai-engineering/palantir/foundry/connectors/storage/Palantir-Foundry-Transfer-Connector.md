---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Foundry 간 pull과 보안 경계

Foundry connector는 destination에서 source Foundry로 pull한다. source enrollment는 destination의 ingress IP를 허용하고 destination은 source로 HTTPS 443 egress를 구성한다. legacy agent 경로는 Java 21 이상 조건을 확인한다.

## 인증과 데이터

운영 연결에는 client credentials와 service user의 원본 resource read 권한을 맞춘다. 범위 scope가 resource 권한을 대신하지 않는다. source bearer token의 유효 수명이 36시간을 넘으면 runtime이 거부하는 제한을 확인한다.

materialized dataset을 읽는 계약이며 view/restricted view까지 지원한다고 확대하지 않는다. streaming은 원본 streaming dataset RID, branch와 schema를 맞추고 기존 history와 새 메시지의 시작 범위를 구별한다.

## marking은 별도

원본의 Marking은 destination으로 이전되지 않는다. 원본에서 읽을 수 있다는 사실이 목적지의 모든 사용자에게 공개해도 된다는 뜻은 아니다. destination에 필요한 control/Marking을 다시 적용하는 경계를 설계한다.

virtual table은 원본이 관리하는 Iceberg 조건이며 임의의 dataset을 가상화하지 않는다. backing object storage에 대한 네트워크 경로도 필요하다.

## 외부 코드

source의 token endpoint는 `/multipass/api/oauth2/token`이며 enrollment hostname과 OAuth credential을 맞춘다. token을 얻고 API를 호출하는 예제의 첫 page만으로 전체 resource를 읽었다고 간주하지 않는다. scope, resource permission, pagination과 token refresh를 각각 검증한다.

## 출처

- [Palantir, foundry](https://www.palantir.com/docs/foundry/available-connectors/foundry)

## 관련 문서

- [[Palantir-Connector-Contracts]]
