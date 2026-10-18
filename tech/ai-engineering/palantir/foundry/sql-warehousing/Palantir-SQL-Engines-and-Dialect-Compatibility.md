---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry SQL 엔진과 문법 호환성"]
---

# Foundry SQL 엔진과 문법 호환성

## 공통 문법과 다른 backend

Furnace는 tabular dataset/Iceberg/virtual table/Restricted View를 읽는 경로이며 Calcite 기반 parse/plan과 Spark/Trino 실행을 분리한다. Ontology SQL은 object storage를 직접 읽는 별도 backend로 object type, many-to-many link와 interface를 다룬다. 같은 Spark SQL 계열 ANSI 문법이 모든 함수/타입 지원의 동일성을 뜻하지 않는다.

Object mode는 OSv2의 read-only 단일 SELECT(선택적 선두 DECLARE)다. Dataset과 object를 한 query에 섞거나 INSERT/UPDATE/DDL을 쓸 수 없다. DECLARE는 한 번에 여러 변수를 선언하고 SET은 허용하지 않는다. ObjectSet variable은 RID 타입으로 선언하고 FROM에만 쓰며 기본은 해당 타입 전체 객체다.

Property는 display name이 아니라 API name이다. One-to-many/one-to-one은 정의된 link 없이 일반 SQL join이 가능하지만 many-to-many는 Ontology의 relation과 join table이 필요하다. Foreign-key column 이름은 objectTypeApiName_relationApiName이며 이름의 object prefix와 저장된 상대 키를 혼동하지 않는다.

## 타입과 함수 경계

| 차이 | 계약 |
|---|---|
| Array index | get은 0기반, element_at은 1기반/음수 허용, array_position은 미발견 0 |
| 날짜 단위 | timestamp_seconds/millis/micros와 unix 역변환은 단위/정밀도가 다름 |
| 요일 | dayofweek는 일요일1, weekday는 월요일0 |
| Null/NaN | greatest/least는 non-null 선택, isnan(null)은 false, try_cast는 실패 시 null |
| 집계 | exact percentile과 approximate percentile, sample/population 표준편차를 구분 |
| 난수 | rand/random seed는 Spark에서 반영되지만 Trino에서는 무시된다고 명시 |
| Geometry | 직접 결과로 반환하지 않고 st_astext로 WKT로 변환 |

Ontology는 map 생성/함수, JSON 함수, geospatial 함수, 다수 날짜/배열/수학 함수와 try_cast를 지원하지 않는 표가 있다. Struct 데이터 타입 지원과 struct 생성 함수 지원도 다르다. 단일 property count distinct와 window aggregate의 제한도 일반 aggregate 지원과 구분한다. 지원 함수는 SHOW FUNCTIONS의 name/kind/signature로 확인할 수 있다.

## 원문의 상충과 실행 한계

IF는 지원 표에는 Ontology 지원으로, 뒤의 경고에는 미지원으로 나온다. CASE WHEN 대안을 기록하되 실제 지원을 추정해 확정하지 않는다. 일반 지원 설명과 endpoint/app별 더 좁은 제약도 함께 확인한다.

Ontology SQL 결과는 서비스 최대 10,000행으로 잘리며 OFFSET+LIMIT도 10,000 이하로 제한된다. UI는 더 적게 보여 줄 수 있다. OSS Spark 대기 최대 6초/실행20초와 NotEnoughSparkResources 설명은 query 자원 제약이며 고동시성 SLA가 아니다. 실제 엔진별 쿼리는 실행하지 않았다.

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
