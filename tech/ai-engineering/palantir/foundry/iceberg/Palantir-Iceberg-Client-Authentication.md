---
tags: [palantir, foundry, iceberg]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# REST catalog 인증, credential vending과 network 이중 경로

외부client는 https://<Foundry>/iceberg catalog와 실제storage bucket에 모두 접근해야 한다. catalog접속으로 inline table metadata/schema를 읽어도 bucket의 manifest/data read가 실패할 수 있다. network allowlist는 table권한과 별개다.

## 인증

개인 API token은 user identity와 연결된 장기token이다. production에는 OAuth2 client-credentials를 검토하고 service user의 실제 folder/table권한을 부여한다. uri,credential(clientID:secret)과 Iceberg전용 oauth2-server-uri=/iceberg/v1/oauth/tokens를 쓴다. 일반Foundry OAuth endpoint와 다르다.

optional scope api:iceberg-read/api:iceberg-write는 permission을 좁힐 뿐 원래없는권한을 주지 않는다. bearer로 기본network/권한을 먼저 구분하고 OAuth exchange/scopes/service identity를 확인하는 troubleshooting순서가 있다. secret을 notebook본문/출력에 남기지 않는다.

## 위임과 network

X-Iceberg-Access-Delegation:vended-credentials로 catalog가 table/action권한을 확인해 file범위/수명 제한 storagecredential을 준다. client는 storage를 직접읽고 만료되면 새 인증이 필요하다. 인증표는 S3 STS refresh/remote-signing지원,ABFS SAS는 refresh/remote-signing미지원으로 구분한다. GCS BYOB문서의 별도 credential조건도 확인하며 이2행표를 모든cloud의 완전한 지원표로 보지 않는다.

namespace의 dot단계는 REST path에서 %1F로 구분하고 metadata.location에서 실제bucket을 찾는다. managedbucket은 Support에 client egressIPv4/VPC endpoint를 전달하고 BYOB는 고객 network policy를 수정한다. AccessDenied는 network외 IAM/file범위/만료도 함께 확인한다.

## Notebook와 Snowflake

local PyIceberg는 namespace.project.folder.table을 Compass path로 mapping하고 create_table→append→scan으로 읽는다. in-platform workspace는 tablealias와 transforms-tables를 설치하거나 containers-sql로 조회한다. virtual table의 SQL조회는 source codeimport 없이 가능하다.

advanced localSpark는 matching Spark3.5/Scala2.12 runtime JAR/aws-bundle과 bucket networkpolicy를 설정한다. sampleIceberg1.9.1 JAR을 임의다른runtime과 섞지 않는다. path공백은 Spark backtick/PyIcebergURLencoding으로 처리한다.

Snowflake는 catalogintegration(OAuth,vendedcredentials,namespace)후 VERIFY/LIST로 확인하고 연결table을 만들어 read한다. 연결table CREATE가 Foundrytable overwrite는 아니다. optional INSERT는 실제Foundrydata를 수정한다. ACCOUNTADMIN권한과 catalog/bucket양방향network가 필요하며 CSE table읽기는 현재미지원이다. AUTO_REFRESH가 정해진지연이나 모든client호환성을 보장하지 않는다.

## 출처

- [Palantir, authentication](https://www.palantir.com/docs/foundry/iceberg/authentication)
- [Palantir, external-client-ingress](https://www.palantir.com/docs/foundry/iceberg/external-client-ingress)
- [Palantir, jupyter](https://www.palantir.com/docs/foundry/iceberg/jupyter)
- [Palantir, local-jupyter](https://www.palantir.com/docs/foundry/iceberg/local-jupyter)
- [Palantir, snowflake-iceberg-integration](https://www.palantir.com/docs/foundry/iceberg/snowflake-iceberg-integration)

## 관련 문서

- [[Palantir-Iceberg-Storage-and-BYOB]]
- [[Palantir-Iceberg-Access-and-Markings]]
