---
tags: [database, rdbms, mysql, sql]
status: index
category: "Database - RDBMS"
aliases: ["MySQL Fundamentals", "MySQL 기초"]
---

# MySQL Fundamentals

MySQL을 안전하게 조회하고 변경하는 데 필요한 기본기를 모은다. 문법 암기보다 결과의 의미, 데이터 무결성, 애플리케이션 경계와 운영 안전성을 우선한다.

- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]: SELECT, NULL, 집계, 서브쿼리, 집합 연산, TypeORM 동적 조회
- [[MySQL-Data-and-Access-Safety|MySQL 데이터와 접근 안전성]]: 자료형, 제약, DML, 뷰, 권한, NestJS와 TypeORM 연결
- [[MySQL-String-Types|MySQL 문자열 타입 선택]]: CHAR, VARCHAR, TEXT의 저장, 행 크기, 인덱스와 조회 비용
- [[MySQL-Collation|MySQL Collation]]: utf8mb4, 비교 규칙, coercibility, 인덱스와 마이그레이션
- [[MySQL-Stored-Functions|MySQL 저장 함수]]: 결정성 선언, 실행 계획, 복제와 보안 컨텍스트
- [[MySQL-Lateral-Derived-Tables|MySQL LATERAL 파생 테이블]]: 선행 테이블 참조, Top-N, 실행 계획과 제약
- [[MySQL-Generated-Columns-and-Functional-Indexes|MySQL 생성 컬럼과 함수 인덱스]]: VIRTUAL, STORED, 표현식 인덱스와 제한
- [[MySQL-Error-Handling|MySQL 오류 처리]]: 오류 번호, SQLSTATE, 심볼, 메시지와 애플리케이션 매핑
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]: undo, purge lag, keyset batch와 재시작 설계

## 함께 볼 문서

- [[SQL-Joins|SQL 조인]]
- [[Index|인덱스]]
- [[Transactions|트랜잭션]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[NestJS-Database|NestJS와 TypeORM 데이터베이스 통합]]
