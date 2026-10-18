---
tags: [database, ducklake, parquet, lakehouse, catalog]
status: done
verified_at: 2026-10-16
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

1. 쿼리 엔진, 카탈로그 DB와 데이터 저장소의 버전 및 권한을 함께 정한다.
2. 카탈로그와 파일을 같은 논리 상태로 복구할 수 있는지 시험한다.
3. 스냅샷 보존과 파일 정리 정책을 정한다. 과거 조회에 필요한 파일을 외부 수명주기 정책으로 먼저 지우지 않는다.
4. 같은 테이블에 여러 writer가 접근할 때 충돌 처리와 재시도를 검증한다.

## 확인 범위

2026-10-16 공식 명세와 확장 저장소에서 SQL 카탈로그, Parquet 저장 구조와 SQL 사용 흐름을 대조했다. 2026-10-10 GeekNews 입력을 계기로 기록했으며 실제 생성, 동시 쓰기와 복구 실험은 수행하지 않았다.

## 출처

- [DuckLake, Specification Introduction](https://ducklake.select/docs/stable/specification/introduction)
- [DuckLake — GitHub, DuckDB](https://github.com/duckdb/ducklake)

## 관련 문서

- [[Data-Infrastructure-Layers|데이터 인프라의 계층과 계약]]
- [[OLTP-vs-OLAP|트랜잭션 처리와 분석 처리]]
- [[SageMaker-Lakehouse|관리형 레이크하우스의 카탈로그와 권한]]
