---
tags: [database, oracle, oracle-11g, sql-developer, legacy]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Oracle 11g Historical Setup", "Oracle 11g 설치 역사 자료"]
---

# Oracle 11g 학습 환경, 역사 자료와 현재 대안

> 역사 자료: 이 문서는 Oracle Database 11g Release 2와 SQL Developer 4.x를 사용한 옛 강의 환경을 해석하기 위한 것이다. 신규 학습 환경의 설치 지침으로 사용하지 않는다.

## 강의 환경의 맥락

강의는 다음 환경을 전제로 한다.

- Windows에 Oracle Database 11g Release 2를 직접 설치한다.
- 전역 database name과 SID를 `ORCL`로 두고 listener의 기본 port를 사용한다.
- `SYS`, `SYSTEM`으로 관리한 뒤 `HR`, `SCOTT` sample account를 잠금 해제한다.
- SQL Developer 4.x를 압축 해제하고 별도 JDK 경로를 지정한다.
- SQL*Plus와 SQL Developer worksheet에서 sample schema query를 실행한다.

이 흐름은 당시 제품을 이해하는 데는 유효하지만 다운로드 위치, 지원 OS, JDK 조합, database 구조와 기본 service name은 현재 제품과 다르다.

## 2026년 학습 환경으로 옮기기

| 11g 강의 표현 | 현재 확인할 대상 |
|---|---|
| Oracle 11g R2 설치 파일 | Oracle AI Database 26ai Free의 OS별 공식 설치 안내 |
| SID `ORCL` 중심 연결 | Free edition의 CDB `FREE`, 기본 PDB service `FREEPDB1` |
| Database Control URL | 현재 배포 방식의 관리 도구와 service 상태 |
| SQL Developer 4.x | 현재 SQL Developer release와 설치 안내 |
| 옛 JDK 조합 | SQL Developer 26.2 문서 기준 JDK 17 또는 JDK 포함 배포본 |
| `HR`, `SCOTT` 잠금 해제 | 별도 최소 권한 학습 schema와 재현 가능한 seed script |

현재 Oracle AI Database Free는 Windows와 Linux 설치 안내를 별도로 제공한다. Linux RPM 설치와 Windows installer의 경로, 계정, service 구성이 다르므로 자신의 OS용 공식 문서를 따른다.

## 연결 개념

현재 Free edition의 기본 구조에서는 root container와 pluggable database를 구분한다.

- `FREE` service는 root container `CDB$ROOT`에 연결한다.
- `FREEPDB1` service는 일반 학습 객체를 만들 기본 PDB에 연결한다.
- application과 실습 object는 관리자 계정이 아니라 별도 schema owner에 둔다.
- host, port, service name을 함께 기록하고 SID와 service name을 같은 말로 취급하지 않는다.

SQL Developer는 database server와 별도 client다. 설치가 성공했다는 사실과 database/listener 접속이 성공했다는 사실을 각각 검증한다.

## 보안 경계

- `SYS`와 `SYSTEM`은 application account로 사용하지 않는다.
- sample account의 알려진 password를 그대로 쓰지 않는다.
- listener를 외부에 열기 전에 bind address, firewall과 최소 권한을 확인한다.
- 접속 정보와 password를 Git, screenshot, 강의 메모에 남기지 않는다.
- 실습 schema를 seed script와 migration으로 재생성 가능하게 만든다.

## 지금도 유효한 부분

- 관계형 table, row, column, key와 schema의 기본 개념
- 선언적 SQL과 procedure 언어의 역할 구분
- client에서 connection을 만들고 query 결과를 검증하는 흐름
- sample data로 constraint, join, transaction을 반복 실습하는 방식

설치 화면의 클릭 순서보다 현재 공식 guide, 지원 platform, release note와 보안 정책을 먼저 확인한다.

## 강의자료 접근 기록

- `courseId=36175`, `unitId=5051`, 제목 `강의자료`: `not_found`, `No content found for courseId=36175, unitId=5051`. [강의자료 단원](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5051)

## 출처

- [Oracle AI Database 26ai Free Installation Guide for Microsoft Windows](https://docs.oracle.com/en/database/oracle/oracle-database/26/xeinw/index.html)
- [Oracle AI Database 26ai Free, Connecting](https://docs.oracle.com/en/database/oracle/oracle-database/26/xeinl/connecting-oracle-database-free.html)
- [Oracle SQL Developer 26.2, Installing and Starting](https://docs.oracle.com/en/database/oracle/sql-developer/26.2/rptig/installing-and-starting-sql-developer.html)
- 역사 강의: [데이터베이스 기본 개념](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4650), [Oracle 11g Release 2 설치](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4653), [SQL Developer 4.0 설치](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4654)
- [강의자료 단원](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4651)

## 관련 문서

- [[oracle|Oracle Database]]
- [[SQL-Fundamentals|SQL 기본기]]
