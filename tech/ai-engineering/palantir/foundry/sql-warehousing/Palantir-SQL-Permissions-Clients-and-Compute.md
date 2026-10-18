---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SQL 권한, 외부 클라이언트와 compute"]
---

# SQL 권한, 외부 클라이언트와 compute

## 조회와 다운로드의 범위

Tabular SQL은 preview/read 중 하나의 operation과 underlying resource의 실제 읽기/쓰기 권한이 필요하다. Worksheet read/write도 별도다. Ontology SQL은 해당 object type의 표준 Ontology 권한을 따르며 별도 SQL role은 요구하지 않는다고 명시된다.

Preview는 UI 첫 1,000행, Query는 UI 기본1,000/설정최대10,000이며 외부 API에서 완전한 결과를 허용하는 역할로 설명된다. 외부 API의 no row limit 문장을 Ontology SQL 서비스의 10,000행 상한을 없애는 것으로 해석하지 않는다. UI Download는 frontend-download operation이며 현재 표에는 표시된 행 최대1,000이라고 적혀 있어 확장 preview의 다운로드 수를 추가 추정하지 않는다.

AIP query generation은 일반 SQL role과 별개로 조직 및 대상 resource project의 AIP 활성화가 필요하다. Assistant는 editor 내용, 참조 resource schema와 dialect context를 사용한다.

## Arrow Flight SQL

Beta Flight SQL은 namespace→catalog, project→schema, dataset→table, field→column으로 매핑한다. JDBC token 인증과 confidential OAuth client-credentials 인증을 구분한다. OAuth는 client secret과 foundry-sql-server:query scope 외에 실제 resource의 SQL operation도 필요하다. Public client는 지원하지 않는다.

JDBC driver19.0.0 관련 문서는 client timezone이 UTC가 아닐 때 offset이 반대로 적용되어 두 배의 오차를 보일 수 있다고 경고한다. UTC 표시 대안을 제시하지만 실제 환경과 driver의 이후 수정 여부는 별도 확인이 필요하다. Timestamp display 문제를 저장값 변경으로 단정하지 않는다.

## Compute를 발생시키는 SQL

Direct read는 단일 resource에서 컬럼 선택/alias와 선택적 LIMIT만 수행한다. Filter/sort/join/aggregate/distinct/computed value/subquery/CTE가 있으면 이 분류에서 제외된다. 문서상 direct read의 Furnace SQL compute 무료를 전체 제품 비용 무료로 확대하지 않는다.

Furnace read는 조회 resource에, write는 출력 resource에 usage를 균등 배분한다. Ontology SQL은 saved application에, 없으면 queried resource에 배분한다. Legacy Spark/직접읽기와 같은 compute 요율이라고 합치지 않는다. 실제 JDBC 접속, 권한 거부와 요금 측정은 수행하지 않았다.

## 출처

- [Palantir sql-warehousing, sql-warehousing](https://www.palantir.com/docs/foundry/sql-warehousing)
- [Palantir sql-warehousing, arrow-flight-sql](https://www.palantir.com/docs/foundry/sql-warehousing/arrow-flight-sql)
- [Palantir sql-warehousing, compute-usage](https://www.palantir.com/docs/foundry/sql-warehousing/compute-usage)
- [Palantir sql-warehousing, furnace](https://www.palantir.com/docs/foundry/sql-warehousing/furnace)
- [Palantir sql-warehousing, ontology-sql](https://www.palantir.com/docs/foundry/sql-warehousing/ontology-sql)
- [Palantir sql-warehousing, overview](https://www.palantir.com/docs/foundry/sql-warehousing/overview)
- [Palantir sql-warehousing, sql-console](https://www.palantir.com/docs/foundry/sql-warehousing/sql-console)
- [Palantir sql-warehousing, sql-definitions](https://www.palantir.com/docs/foundry/sql-warehousing/sql-definitions)
- [Palantir sql-warehousing, sql-dialect](https://www.palantir.com/docs/foundry/sql-warehousing/sql-dialect)
- [Palantir sql-warehousing, sql-examples](https://www.palantir.com/docs/foundry/sql-warehousing/sql-examples)
- [Palantir sql-warehousing, sql-functions](https://www.palantir.com/docs/foundry/sql-warehousing/sql-functions)
- [Palantir sql-warehousing, sql-permissions](https://www.palantir.com/docs/foundry/sql-warehousing/sql-permissions)
- [Palantir sql-warehousing, sql-studio](https://www.palantir.com/docs/foundry/sql-warehousing/sql-studio)
- [Palantir sql-warehousing, worksheets](https://www.palantir.com/docs/foundry/sql-warehousing/worksheets)

## 관련 문서

- [[Palantir-SQL-Warehousing]]
