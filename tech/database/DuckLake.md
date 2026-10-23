---
tags: [database, ducklake, parquet, lakehouse, catalog]
status: done
verified_at: 2026-10-24
category: "데이터&저장소(Data&Storage)"
aliases: ["DuckLake", "SQL 카탈로그 레이크하우스"]
---

# DuckLake: SQL 카탈로그와 Parquet 데이터

DuckLake는 테이블의 메타데이터를 SQL 데이터베이스에, 실제 데이터를 Parquet에 보관하는 개방형 레이크하우스 형식이다. 형식의 명세와 이를 읽고 쓰는 DuckDB 확장을 구분한다.

## 저장과 메타데이터의 경계

- 데이터 파일은 객체, 블록 또는 파일 저장소에 둔다.
- 카탈로그는 SQL 테이블로 스키마, 파일 목록과 스냅샷 정보를 관리한다. 카탈로그 DB는 트랜잭션과 기본 키 제약을 지원해야 한다.
- 전용 카탈로그 서버 대신 기존 SQL DB를 활용할 수 있지만, 카탈로그의 가용성과 동시 쓰기, 인증 및 백업 책임은 남는다.
- 파일 디렉터리를 직접 읽는 쿼리와 카탈로그가 지정한 스냅샷을 읽는 쿼리는 일관성 범위가 다르다.

## DuckDB에서의 사용

DuckDB 확장을 설치하고 `ATTACH`로 DuckLake 카탈로그를 연결한 뒤 SQL로 테이블과 데이터를 관리한다. 로컬 예제와 여러 writer가 공유하는 운영 구성을 같은 배치 방식으로 취급하지 않는다. 트랜잭션, 과거 시점 조회와 스키마 변경은 해당 확장 버전의 지원 범위를 확인한다.

## 운영 점검

### 카탈로그 DB와 동시 쓰기를 함께 고른다

DuckLake의 SQL 메타데이터는 DuckDB 파일만을 뜻하지 않는다. 공식 선택 안내는 단일 로컬 클라이언트에는 DuckDB, 여러 로컬 클라이언트에는 SQLite, 원격 클라이언트를 포함한 다중 사용자 환경에는 PostgreSQL을 제시한다. 다른 구성도 있으므로 이 세 가지를 전체 지원 목록으로 해석하지 않는다.

- DuckDB 카탈로그 파일은 모든 프로세스가 `READ_ONLY`로 연결하는 경우를 제외하면 한 프로세스만 연결할 수 있다. 그 프로세스 안에서는 여러 연결을 사용할 수 있다.
- SQLite는 한 번에 writer 하나만 쓴다. 여러 프로세스의 사용 가능성과 동시 쓰기 병렬성을 같은 뜻으로 보지 않는다.
- DuckLake는 증가하는 `snapshot_id`의 기본 키 제약으로 경합을 감지한다. 중간 변경과 논리적 충돌이 없으면 데이터 파일을 다시 쓰지 않고 메타데이터 트랜잭션을 재시도하며, 논리적 충돌이 있으면 중단한다. SQL 카탈로그가 충돌이나 재시도를 없애 주는 것은 아니다.

### 파일 기반 메타데이터와 정합성을 구분한다

메타데이터를 파일에 저장한다는 사실만으로 dirty read나 부분 커밋을 추론하지 않는다. Iceberg는 기존 메타데이터 트리를 재사용하는 스냅샷을 만들고 현재 메타데이터 파일의 경로를 원자적으로 바꾼다. 독자는 일관된 스냅샷을 읽으며, writer는 낙관적 동시성 제어와 재시도 시 전제 검사를 수행한다.

Delta Lake도 지원하는 저장소에서 새 데이터 파일을 먼저 준비한 뒤 동시 변경과 충돌하는지 검사하고 새 스냅샷으로 커밋한다. 충돌하면 테이블을 부분적으로 오염시키는 대신 동시 수정 예외로 실패한다. 데이터 파일의 직접 조회와 테이블 포맷을 통한 읽기를 구분해야 한다.

다음은 선택을 위한 비교 제안이다. 메타데이터가 SQL이라는 이유만으로 더 빠르다고 단정하지 않고, 같은 데이터량과 writer 수에서 커밋 지연, 충돌과 재시도, 쿼리 계획 비용, 파일 정리와 복구 비용을 측정한다. 파일 개수와 요청 지연은 성능 문제일 수 있지만, 트랜잭션 정합성 실패의 증거는 별도로 확인한다.

### 복구와 유지보수

1. 쿼리 엔진, 카탈로그 DB와 데이터 저장소의 버전 및 권한을 함께 정한다.
2. 카탈로그와 파일을 같은 논리 상태로 복구할 수 있는지 시험한다.
3. 스냅샷 보존과 파일 정리 정책을 정한다. 과거 조회에 필요한 파일을 외부 수명주기 정책으로 먼저 지우지 않는다.
4. 같은 테이블에 여러 writer가 접근할 때 충돌 처리와 재시도를 검증한다.

## 확인 범위

2026-10-16 공식 명세와 확장 저장소에서 SQL 카탈로그, Parquet 저장 구조와 SQL 사용 흐름을 대조했다. 2026-10-24에는 공식 명세, 카탈로그 선택과 충돌 해결 문서, Iceberg와 Delta Lake의 동시성 문서를 대조해 저장 방식과 정합성의 구분을 보강했다. 실제 생성, 동시 쓰기, 복구와 성능 비교 실험은 수행하지 않았다.

## 출처

- [DuckLake, Specification Introduction](https://ducklake.select/docs/stable/specification/introduction)
- [DuckLake, Choosing a Catalog Database](https://ducklake.select/docs/stable/duckdb/usage/choosing_a_catalog_database)
- [DuckLake, Conflict Resolution](https://ducklake.select/docs/stable/duckdb/advanced_features/conflict_resolution)
- [Apache Iceberg, Reliability](https://iceberg.apache.org/docs/latest/reliability/)
- [Delta Lake, Concurrency control](https://docs.delta.io/concurrency-control/)
- [DuckLake — GitHub, DuckDB](https://github.com/duckdb/ducklake)

## 관련 문서

- [[Data-Infrastructure-Layers|데이터 인프라의 계층과 계약]]
- [[OLTP-vs-OLAP|트랜잭션 처리와 분석 처리]]
- [[SageMaker-Lakehouse|관리형 레이크하우스의 카탈로그와 권한]]
