---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# GCS와 Lakehouse Iceberg catalog

GCS 파일 읽기는 Storage Object Viewer, 생성 export는 Creator, 삭제/덮어쓰기까지 필요하면 Admin 등 해당 작업의 권한을 확인한다. 키 파일은 JSON/PKCS8, OIDC와 instance identity를 구분하며 instance 인증은 적절한 GCP agent 조건을 따른다.

네트워크에는 storage.googleapis.com 외에 선택한 auth의 oauth2, STS와 iamcredentials endpoint가 필요할 수 있다. Lakehouse catalog는 biglake/www 경로도 확인한다. 원본의 inbound/서비스 정책과 Foundry egress가 함께 허용돼야 한다.

## virtual table

GCS virtual table은 Foundry worker의 JSON/PKCS8/OIDC 인증 조건을 따른다. agent instance 인증을 그대로 쓸 수 있다고 가정하지 않는다. Iceberg object storage catalog는 warehousePath를 사용한다.

Lakehouse Iceberg REST catalog의 catalog ID는 bucket이고 table 식별자는 namespace.table_id, 형식은 Iceberg다. catalog ID는 읽기 전용이며 virtual table마다 다른 catalog로 덮어쓸 수 없다.

Lakehouse source와 BYOB source는 분리해야 한다. BYOB의 JSON/PKCS8 credential 지원을 Lakehouse/OIDC 지원과 혼합하지 않는다. 외부 저장소의 삭제 권한과 virtual table 등록 권한은 별개다.

## 출처

- [Palantir, google-cloud-storage](https://www.palantir.com/docs/foundry/available-connectors/google-cloud-storage)
- [Palantir, lakehouse-iceberg-rest-catalog](https://www.palantir.com/docs/foundry/available-connectors/lakehouse-iceberg-rest-catalog)

## 관련 문서

- [[Palantir-Connector-Contracts]]
