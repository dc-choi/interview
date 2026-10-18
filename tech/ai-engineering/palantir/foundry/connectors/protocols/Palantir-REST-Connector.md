---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# REST source와 외부 코드 인증

현행 REST source는 webhook과 external transform/Function의 네트워크 및 secret 연결을 제공한다. built-in batch sync/export를 자동 제공하는 범용 extractor로 해석하지 않는다. 적어도 하나의 domain을 지정하고 기본 HTTPS 443 또는 별도 port를 맞춘다.

## 인증과 네트워크

domain별 None, Basic, Bearer, API key(header/query), OAuth client credentials를 구별한다. API key를 query에 넣으면 URL 로그에 남을 수 있으므로 원본이 허용하는 transport와 secret 취급을 확인한다.

client credentials는 form-url-encoded 요청의 client/scopes를 설정하고 token endpoint와 API host를 모두 egress에 포함한다. short-lived token을 오래 실행하는 코드에서 재사용하지 않고 refresh 흐름을 확인한다. additional secrets는 공개 configuration과 분리한다.

NetSuite JWT assertion 예시는 ES256, kid/iss/aud/scope/rest_webservices, iat와 약 59분 exp, client assertion grant를 맞춘다. 서명과 token 획득 예제가 retry/중복 write 방지까지 검증하지는 않는다.

사설 CA는 Requests가 쓰는 bundle에 합쳐 신뢰하도록 한다. TLS 검증 비활성화로 바꾸는 것과 다르다.

## Generic source

Generic connector는 Foundry worker의 코드에서 네트워크, secrets와 export markings를 묶어 쓴다. Python/TypeScript Functions, compute와 external transforms별 지원을 확인한다. code sidebar의 New connection 흐름을 Data Connection의 source 화면과 혼동하지 않는다.

REST로 변환하려면 단일 domain DNS 443 등 원문의 제한을 충족해야 한다. source에서 받은 credential 사용과 외부 API의 사용자 위임/앱 권한은 별도다.

## 코드의 성공 판단

예제가 response JSON을 반환했다고 전체 pagination, 오류 처리, retry나 외부 쓰기 완료가 보장되지 않는다. mutation은 원본 API의 idempotency/조건부 갱신을 확인하고 결과를 readback한다. read와 write 작업의 source 및 권한을 나누는 설계는 실제 제품 요구에 맞춰 판단한다.

## 출처

- [Palantir, rest-apis](https://www.palantir.com/docs/foundry/available-connectors/rest-apis)
- [Palantir, generic](https://www.palantir.com/docs/foundry/available-connectors/generic)

## 관련 문서

- [[Palantir-Connector-Contracts]]
