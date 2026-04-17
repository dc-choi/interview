---
tags: [database, mysql, oracle, metadata]
status: seminar
category: "데이터&저장소(Data&Storage)"
aliases: ["데이터 딕셔너리"]
---

# 데이터딕셔너리(DataDictionary)

데이터 딕셔너리는 DB의 메타데이터(테이블, 컬럼, 인덱스, 권한 등)를 조회할 수 있는 시스템 테이블/뷰이다.

## Oracle vs MySQL 구조차이

| 구분 | Oracle | MySQL |
|------|--------|-------|
| 메타데이터 저장소 | Data Dictionary (USER_/ALL_/DBA_ 접두사) | `information_schema`, `mysql` 시스템 DB |
| 성능 모니터링 | V$ 동적 성능 뷰 | `performance_schema` |
| 편의 뷰 | 없음 | `sys` 스키마 (performance_schema를 읽기 쉽게 래핑) |

- Oracle은 `USER_*`(본인 소유), `ALL_*`(접근 가능 전체), `DBA_*`(관리자 전용)로 범위를 구분함
- MySQL은 `information_schema`에서 권한에 따라 보이는 범위가 자동으로 필터링됨
- MySQL 8.0부터 데이터 딕셔너리가 InnoDB 트랜잭셔널 테이블로 저장되어, DDL이 원자적(atomic)으로 처리됨

## Oracle딕셔너리→MySQL매핑

### 오브젝트&테이블

| Oracle | MySQL | 비고 |
|--------|-------|------|
| USER_OBJECTS | 단일 대응 없음 | MySQL은 TABLES, VIEWS, ROUTINES, TRIGGERS 등으로 분산 |
| USER_TABLES(TABS) | `information_schema.TABLES` | 엔진, 행 수, 데이터 크기 등 추가 정보 제공 |
| USER_TAB_COLUMNS(COLS) | `information_schema.COLUMNS` | 컬럼 타입, 기본값, nullable 등 |
| USER_VIEWS | `information_schema.VIEWS` | 뷰 정의(SQL), 보안 타입 등 |

### 제약조건&인덱스

| Oracle | MySQL | 비고 |
|--------|-------|------|
| USER_CONSTRAINTS | `information_schema.TABLE_CONSTRAINTS` | PK, FK, UNIQUE, CHECK 등 |
| USER_CONS_COLUMNS | `information_schema.KEY_COLUMN_USAGE` | 제약조건에 포함된 컬럼 정보 |
| USER_INDEXES(IND) | `information_schema.STATISTICS` | 인덱스명, cardinality, 유니크 여부 등 |
| USER_IND_COLUMNS | `information_schema.STATISTICS` | 인덱스 컬럼 정보가 같은 테이블에 포함됨 |

### 프로시저&트리거

| Oracle | MySQL | 비고 |
|--------|-------|------|
| USER_TRIGGERS | `information_schema.TRIGGERS` | 트리거 이벤트, 타이밍, 본문 등 |
| USER_SOURCE | `information_schema.ROUTINES` | 프로시저, 함수의 정의 및 파라미터 |
| USER_ERRORS | 직접 대응 없음 | MySQL은 컴파일 시점에 즉시 에러를 반환함 |

### 주석(Comment)

| Oracle | MySQL | 비고 |
|--------|-------|------|
| USER_TAB_COMMENTS | `information_schema.TABLES.TABLE_COMMENT` | 별도 테이블이 아닌 TABLES의 컬럼으로 제공 |
| USER_COL_COMMENTS | `information_schema.COLUMNS.COLUMN_COMMENT` | COLUMNS의 컬럼으로 제공 |

### 권한

| Oracle | MySQL | 비고 |
|--------|-------|------|
| USER_TAB_PRIVS | `information_schema.TABLE_PRIVILEGES` | 테이블 단위 권한 |
| USER_COL_PRIVS | `information_schema.COLUMN_PRIVILEGES` | 컬럼 단위 권한 |
| USER_SYS_PRIVS | `information_schema.USER_PRIVILEGES` | 시스템 레벨 권한 |
| USER_USERS | `mysql.user` | 사용자 계정, 인증 플러그인, 권한 등 |

### MySQL에없는Oracle기능

| Oracle | MySQL 대안 | 비고 |
|--------|-----------|------|
| USER_SYNONYMS(SYN) | 지원하지 않음 | MySQL에 동의어(synonym) 개념 없음. VIEW로 유사하게 구현 가능 |
| USER_SEQUENCES(SEQ) | `AUTO_INCREMENT` | MySQL은 시퀀스 객체가 없고 AUTO_INCREMENT로 대체 |
| USER_CLUSTERS(CLU) | 지원하지 않음 | InnoDB는 PK 기준 클러스터드 인덱스를 자동으로 사용 |
| USER_DB_LINKS | `FEDERATED` 엔진 또는 Replication | MySQL은 DB Link 대신 다른 방식으로 원격 접근 |
| USER_TABLESPACES | `information_schema.INNODB_TABLESPACES` | InnoDB 전용, Oracle만큼 세밀한 제어는 불가 |

## 자주사용하는MySQL메타데이터조회

```sql
-- 테이블 목록 및 크기
SELECT TABLE_NAME, ENGINE, TABLE_ROWS, DATA_LENGTH
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'your_db';

-- 특정 테이블의 컬럼 정보
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'your_db' AND TABLE_NAME = 'your_table';

-- 인덱스 정보
SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'your_db' AND TABLE_NAME = 'your_table';

-- 제약조건 확인
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'your_db' AND TABLE_NAME = 'your_table';
```
