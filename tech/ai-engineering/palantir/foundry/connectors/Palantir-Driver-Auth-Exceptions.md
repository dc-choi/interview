---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 속성과 인증 방식의 해석

driver의 Mandatory 목록은 auth mode별 credential을 한 표에 나란히 둘 수 있다. username/password, app/service principal, OAuth/JWT, account key/SAS를 모두 동시에 채워야 한다는 뜻으로 해석하지 않는다. 선택한 mode에 맞는 property 설명과 source permission을 확인한다.

## storage와 metadata

Airtable은 PAT와 OAuth를 구별한다. metadata API 사용 여부에 따라 BaseID가 필요한 조건이 달라지고 base name 기반 탐색도 metadata 권한과 연결된다.

Azure Table Storage는 AuthScheme 설명의 기본 SAS와 표의 AccessKey 기본이 일치하지 않으므로 source UI/해당 driver 매뉴얼로 결정한다. Couchbase 역시 Cloud/Direct의 기본 표현 충돌을 확인하고 endpoint/port를 실제 배포에 맞춘다.

Excel은 read 중 Recalculate 부작용을, Drive는 FileData/DownloadFile 및 Readonly 조건을 확인한다. 단순 table read를 object download나 side-effect-free 동작과 동일시하지 않는다.

## OAuth와 tenant

Microsoft cloud 제품은 tenant, scope, service-principal/delegated permission과 admin consent를 구별한다. 인증 성공 후 특정 table이 없으면 metadata/제품 권한도 확인한다. Google driver는 OAuthJWT에서 JSON file 내용과 file path credential 형식이 다르다.

OAuth client ID/secret이 필요하다는 표만으로 client-credentials grant 지원을 추론하지 않는다. authorize callback과 refresh를 요구하는 사용자 위임 흐름이 있을 수 있다.

## URL과 transport

Smartsheet는 문서가 안내하는 고정 `jdbc:smartsheet:` URL과 별도 property를 사용한다. 다른 SaaS의 server URL template으로 바꾸지 않는다.

WordPress Basic 방식의 credential query 전달 설명은 header bearer와 다르다. HTTPS와 실제 driver 전송, URL logging에 대한 노출 여부를 확인한다. 이 검토는 제품 적용 판단이며 해당 제품의 현재 보안 설정을 실행 검증한 결과는 아니다.

## 출처

- [Palantir, airtable](https://www.palantir.com/docs/foundry/available-connectors/airtable)
- [Palantir, azure-table-storage](https://www.palantir.com/docs/foundry/available-connectors/azure-table-storage)
- [Palantir, couchbase](https://www.palantir.com/docs/foundry/available-connectors/couchbase)
- [Palantir, smartsheet](https://www.palantir.com/docs/foundry/available-connectors/smartsheet)
- [Palantir, wordpress](https://www.palantir.com/docs/foundry/available-connectors/wordpress)

## 관련 문서

- [[Palantir-Driver-Reference]]
- [[Palantir-Connector-Contracts]]
