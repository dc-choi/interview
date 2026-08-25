---
tags: [database, oracle, sql, plsql]
status: index
category: "Data & Storage - RDB"
aliases: ["Oracle", "Oracle Database"]
---

# Oracle Database

공통 SQL과 Oracle 전용 방언을 분리한다. Oracle 11g 강의의 개념은 현재 문서로 재검증했고, 당시 설치 절차는 역사 자료로 격리했다.

## 하위 문서

- [[Oracle-11g-Historical-Setup|Oracle 11g 학습 환경, 역사 자료와 현재 대안]]
- [[Oracle-SQL-and-PL-SQL|Oracle SQL과 PL/SQL (방언, sequence와 계층형 query, PL/SQL 프로그래밍)]]
- [[Oracle-Tablespaces|Oracle tablespace와 공간 관리]]
- [[Oracle-Users-Privileges-and-Roles|Oracle user, privilege, role과 profile]]
- [[Oracle-Index-Features|Oracle index 기능과 운영]]
- [[Data-Dictionary|데이터 딕셔너리 (Oracle vs MySQL 메타데이터 매핑)]]

## 공통 개념

- [[SQL-Fundamentals|SQL 기본기]]
- [[SQL-Query-Composition|SQL 쿼리 조합]]
- [[SQL-Window-Functions|SQL window function]]
- [[Data-Integrity-Constraints|데이터 무결성과 제약 조건]]
- [[Database-Views-and-Programmability|View와 데이터베이스 저장 프로그램]]
- [[Hierarchical-Data-Modeling|계층형 데이터 모델링]]

## 학습 원칙

1. 새 query는 이식 가능한 SQL 표현을 먼저 검토한다.
2. Oracle 전용 기능을 쓰면 성능이나 표현력의 이점과 이식 비용을 함께 기록한다.
3. DB version, `COMPATIBLE`, `MAX_STRING_SIZE`, NLS와 client 설정을 실행 환경의 일부로 관리한다.
4. 예제 계정과 개발 도구의 옛 설치 절차를 운영 보안 지침으로 재사용하지 않는다.

## 공식 문서

- [Oracle AI Database 26ai Documentation](https://docs.oracle.com/en/database/oracle/oracle-database/)
- [Oracle AI Database 26ai SQL Language Reference](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/)
- [Oracle AI Database 26ai PL/SQL Language Reference](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/)
