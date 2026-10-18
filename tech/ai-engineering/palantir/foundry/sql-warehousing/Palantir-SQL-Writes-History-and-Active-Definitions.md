---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SQL 쓰기와 rebuild 정의의 수명"]
---

# SQL 쓰기와 rebuild 정의의 수명

## 형식과 원자 실행

CREATE의 기본 형식은 Iceberg이며 USING parquet/avro 등으로 다르게 만들 수 있다. INSERT/UPDATE/DELETE와 ALTER metadata/schema/partition/order/property/tag/branch는 Iceberg 조건을 따른다. 프로젝트에 Iceberg가 활성화되지 않으면 default CREATE도 실패할 수 있다.

BEGIN/COMMIT은 여러 statement를 단일 atomic job으로 묶으며 중첩 불가, 최소 한 write 필요, 짝이 없으면 parse 오류다. 이 문서의 원자 job 계약을 외부 시스템 부작용까지 확장하지 않는다. Write ordering은 출력 파일 배치이며 SELECT 결과 순서의 보장이 아니다. Identifier field 지정도 유일성 강제의 근거로 추가 추정하지 않는다.

## 시점과 변경분

VERSION AS OF는 Iceberg snapshot ID 또는 Foundry dataset transaction RID를 쓴다. Dataset의 VERSION BETWEEN은 시작 transaction 이후부터 끝 transaction까지 추가된 행이며 시작 exclusive/끝 inclusive다. Iceberg에는 BETWEEN을 지원하지 않는다. 변경 전후 전체 상태나 삭제 event까지 모두 반환하는 CDC라고 가정하지 않는다.

Iceberg branch suffix, dataset branch 예제와 SQL Studio의 branch prefix 예제가 함께 존재한다. 조회 대상 resource와 branch syntax를 확인하며 global branch/코드 branch와 같은 개념으로 합치지 않는다.

## 다음 rebuild에서 무엇을 실행하는가

Furnace output은 여러 SQL definition을 보존하고 하나를 active로 둔다. Active는 scheduled/on-demand rebuild에 실행할 SQL이다. Set as active만으로 즉시 실행되지는 않는다.

첫 write는 첫 active definition을 만든다. 후속 write는 기존 정의를 보존하며 새 정의를 active로 바꾸는 것이 기본이다. adhoc hint는 지금 한 번 쓰고 정의를 추가하되 active를 유지한다. 단 CREATE OR REPLACE TABLE은 기존 정의를 대체하는 별도 계약이므로 adhoc 예제만 보고 정의 이력이 보존된다고 단정하지 않는다.

Backfill INSERT는 중복 방지를 자동 보장하지 않는다. Compression property 변경은 이후 파일에 적용되며 기존 파일이 즉시 재압축되지는 않는다. Data Lineage는 inactive/adhoc를 포함한 보존 정의 전체의 input을 표시하므로 graph edge가 현재 active SQL의 입력이라는 뜻은 아니다.

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
