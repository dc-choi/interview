---
tags: [database, rdbms, mysql, sql, query]
status: index
category: "Database - RDBMS"
aliases: ["MySQL Query", "MySQL 조회와 SQL 기능"]
---

# MySQL 조회와 SQL 기능

SELECT 결과의 의미를 정확히 읽고 MySQL 방언의 조회 기능을 활용하는 문서를 모은다.

- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]: SELECT, NULL, 집계, COUNT 비용과 COUNT(column) 함정, 집합 연산과 UNION DISTINCT 비용, FULLTEXT, TypeORM 동적 조회
- [[MySQL-Query-Fundamentals-Subqueries|MySQL 서브쿼리 실행과 재작성]]: semijoin과 antijoin 변환 조건, 반복되는 상관 스칼라 서브쿼리, JOIN 재작성, IN과 EXISTS 경험칙의 범위, 컬럼 해석 규칙과 ANY, ALL, SOME
- [[MySQL-Query-Fundamentals-Functions|MySQL 내장 함수와 암묵 변환]]: 문자열과 숫자 비교가 인덱스를 잃는 방향, 반올림과 절사, 문자열 위치와 NULL 전파, 월말 보정과 날짜 차이
- [[MySQL-Lateral-Derived-Tables|MySQL LATERAL 파생 테이블]]: 선행 테이블 참조, Top-N, 실행 계획과 제약
- [[MySQL-Stored-Functions|MySQL 저장 함수]]: 결정성 선언, 실행 계획, 복제와 보안 컨텍스트, DELIMITER와 변수 범위, 행마다 실행되는 쿼리, 난수 ID 충돌
- [[MySQL-Stored-Procedures|MySQL 저장 프로시저]]: 파라미터 모드, 결과 집합, CALL과 트랜잭션 경계, 암묵 commit, DROP 후 CREATE 배포, 저장 함수와의 차이

## 함께 볼 문서

- [[MySQL-Fundamentals|MySQL 기본기]]
- [[SQL|SQL 기초]]
