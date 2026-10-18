---
tags: [palantir, foundry, api, connectivity, virtual-table]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 외부 Table을 Foundry의 Virtual Table로 등록한다

Virtual Table은 외부 시스템의 table을 Foundry에서 query/관리할 수 있게 등록한 리소스다. 외부 row를 목적지 Dataset으로 batch import하는 [[Palantir-Import-API]]와 구별한다.

`POST /api/v2/connectivity/connections/{connectionRid}/virtualTables`는 parentRid, name과 config가 필수이고 Marking ID 목록은 optional이다. scope는 `api:connectivity-virtual-table-write`다. 예제에 config가 빠져 있어도 schema의 필수 조건을 따라야 한다.

## 공급자별 Table Pointer

| config type | 식별 입력 |
|---|---|
| snowflake | database, schema, table |
| unity | catalog, schema, table |
| glue | database, table |
| delta | object storage의 table path |
| iceberg | tableIdentifier와 optional warehousePath |
| files | AVRO/CSV/PARQUET format과 storage path |
| bigquery | project, dataset, table |

Iceberg의 warehousePath는 path에 의존하지 않는 catalog를 연결에 설정했다면 생략할 수 있다. files path는 scheme을 빼며 file 또는 folder를 지정한다. partitioned table은 partition별 여러 location이 가능하다는 설명이 있지만 이 요청 필드는 단일 path다. 별도 locations 배열을 임의로 추가하지 않는다.

생성한 Virtual Table은 지정 parent folder에 생기며 Foundry data access API로 query할 수 있다. 응답은 등록 RID, name, parentRid, config와 markings다. 별도 비동기 실행 ID나 데이터 전체 복사 완료를 반환하는 계약이 아니다.

동일 parent의 이름 충돌은 VirtualTableAlreadyExists, 잘못되었거나 접근 불가한 Connection은 InvalidVirtualTableConnection이다. Connection을 virtual registration에 사용할 권한과 create endpoint 권한도 별도로 실패할 수 있다.

이 문서는 공개 계약 확인이며 실제 등록, 외부 데이터 접근, query 성능이나 supplier별 모든 지원 조건을 실행 검증하지 않았다.

## 출처

- [Palantir, Virtual Table basics](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/virtual-tables/virtual-table-basics)
- [Palantir, Create Virtual Table](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/virtual-tables/create-virtual-table)
