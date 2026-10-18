---
tags: [palantir, jdbc, cdata, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["JDBC driver 인증과 export"]
---

# JDBC driver 인증과 export

Foundry-provided JDBC source는 driver를 감싼 connector이며 URL과 required/recommended properties를 설정한다. Driver source가 목록에 있다는 사실과 특정 capability/OAuth 방식이 지원된다는 것은 별도다. Filesystem/database/warehouse/ERP/stream/NoSQL/REST 등 source category는 후보 탐색에 쓰고 실제 source 문서와 설정을 확인한다.

## 연결 성공은 metadata browsing보다 강한 증거가 필요하다

CData는 실제 query까지 연결을 미룰 수 있어 static metadata table이 보여도 credentials/egress가 검증되지 않았을 수 있다. ConnectOnOpen=true는 no-op connection test를 강제하지만 OAuth와 함께 쓸 수 없고 매우 제한된 계정은 test operation 자체가 거절될 수 있다. Test 실패를 실제 모든 읽기 권한 부재로 단정하지 않는다.

Sync마다 하나의 SQL query로 tabular output을 만든다. 일부 file-oriented CData driver는 stored procedure로 file을 Base64 column에 반환하고 downstream에서 decode한다. Query 결과가 file 자체 binary인지 encoded string인지 확인한다.

## OAuth와 certificate 설정

CData authorization-code OAuth는 해당 driver가 지원할 때 Foundry worker에서만 사용한다. Agent worker는 지원하지 않는다. CallbackUrl을 외부 OAuth app에 등록하고 client ID/secret을 source에 설정한 뒤 Authorize한다. 기본적으로 시작/renew/revoke는 Source Owner를 요구하고 Editor/Viewer는 충분하지 않다. 필요하면 source administration operation을 가진 custom role로 분리한다.

Azure service-principal certificate 예제는 AuthScheme=AzureServicePrincipalCert, OAuthJWTCertType=PFXBLOB과 base64 file content, 선택적 password를 사용한다. 이를 모든 JDBC driver에 같은 property로 적용하지 않는다. Base64는 암호화가 아니므로 certificate/private key secret을 공개 text에 남기지 않는다.

## CData table export는 append 범위다

일부 connector의 table export는 기존 external table에 row를 추가하는 non-truncate mode만 지원한다. Key 기반 update/delete/upsert와 truncate를 지원한다고 가정하지 않는다. Connector별 지원을 확인하고 non-production target의 단일 row로 schema/권한/중복 영향을 검증한다.

더 복잡한 작업은 Foundry-worker source의 connector별 validated code capability와 비교한다. Generic JDBC라는 이유로 source의 모든 write API 또는 transaction 의미를 보장하지 않는다. 공식 driver 목록의 OAuth TRUE/FALSE는 해당 authorization-code capability의 기준이며 다른 인증 방식 전체를 뜻하지 않는다.

## 출처

- [Palantir, Palantir-provided drivers for JDBC sources](https://www.palantir.com/docs/foundry/data-integration/foundry-provided-drivers)
- [Palantir, Connectors](https://www.palantir.com/docs/foundry/data-integration/source-type-overview)

## 관련 문서

- [[Palantir-External-Transform-and-Function-Boundaries|Code 기반 외부 접근]]
- [[Palantir-Dataset-Transactions-and-Build-Branches|Foundry output transaction]]
