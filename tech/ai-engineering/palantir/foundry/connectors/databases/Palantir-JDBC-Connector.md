---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# JDBC 커넥터와 테이블 증분 처리

JDBC source는 driver JAR/class, JDBC URL, 원본 계정과 source별 속성을 조합한다. Foundry worker에서는 unsigned driver 업로드를 지원하지만 legacy agent worker는 Palantir 서명 JAR이 필요하다. agent에서 한 driver class에 여러 버전을 두거나 unsigned JAR을 넣으면 시작이 실패할 수 있다.

## 읽기와 증분 경계

쿼리는 단일 SQL 문이며 stored procedure 실행을 일반 table sync 쿼리로 대체하지 않는다. pre-query 배열은 본 쿼리 전에 실행하며 source 기본값을 sync에서 덮어쓸 수 있다. fetch size 권장은 500이지만 실제 driver의 지원과 메모리/왕복 비용을 대조한다.

Incremental은 단조 증가 열의 이전 최댓값보다 큰 `>` 조건, 최초 시작값과 `?` placeholder를 사용한다. APPEND로 저장하며 갱신된 과거 행을 자동으로 되찾는 방식은 아니다. timezone 없는 시간은 UTC 해석을 확인한다. OR 조건을 섞으면 괄호로 감싸 병렬 필터와의 우선순위를 보존한다.

강제 병렬화에서 SIZE=4는 null 분할을 포함해 5개 쿼리를 만들 수 있다. 병렬 쿼리 사이에 원본이 바뀌면 읽는 시점이 달라질 수 있으므로 단일 시점 snapshot으로 간주하지 않는다.

## 출력과 export

출력은 Parquet 기본, Avro 선택이며 SNAPPY/ZSTD를 사용할 수 있다. 파일 최대 크기는 정확한 경계가 아닌 근삿값이다. `maxBytesPerFile`은 writer buffer의 두 배 이상이어야 하며 기본 buffer는 Parquet 128MB, Avro 64KB다. precision 38 초과 decimal 제한 옵션은 기본 비활성이다.

현행 table export의 batch insert는 기본 비활성이며 지원 driver에서 batch 크기 2~5,000을 설정한다. Redshift의 별도 batch 계약이나 legacy Snowflake export task 값을 이 한도에 섞지 않는다.

## legacy export task

신규 사용에는 현행 export를 우선한다. legacy incremental은 이전 transaction이 남아 있어야 이어 쓰고 없으면 snapshot으로 돌아갈 수 있다. `writeDirectly=false`는 staging과 rename/drop 절차, `AppendIfPossible`은 처음 overwrite 후 append라는 차이가 있다.

트랜잭션 수동 제어, isolation, `preSql`, `stagingSql`, `afterSql`은 외부 변경의 순서를 결정한다. PostgreSQL directCopy 전용 옵션, 최대 8개 병렬화와 legacy Snowflake 약 50,000 batch 등은 해당 구현에만 적용한다.

Teradata는 첫 열 partition, MULTISET, DDL autocommit와 ASCII/Latin1 제약을 확인한다. Oracle VARCHAR 기본 길이 255는 byte 기준이다. agent healthcheck의 60분 주기 `SELECT 1`은 실제 동기화 쿼리 권한/성능을 검증하지 않는다.

## 출처

- [Palantir, custom-jdbc-sources](https://www.palantir.com/docs/foundry/available-connectors/custom-jdbc-sources)
- [Palantir, aws-redshift](https://www.palantir.com/docs/foundry/available-connectors/aws-redshift)
- [Palantir, db2](https://www.palantir.com/docs/foundry/available-connectors/db2)

## 관련 문서

- [[Palantir-Connector-Contracts]]
