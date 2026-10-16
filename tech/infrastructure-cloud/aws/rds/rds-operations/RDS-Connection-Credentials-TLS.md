---
tags: [infrastructure, aws, rds, database, security, tls]
status: done
verified_at: 2026-10-14
category: "Infrastructure - AWS"
aliases: ["RDS TLS Enforcement", "RDS SSL 강제", "RDS 연결 암호화 확인", "require_secure_transport", "rds.force_ssl"]
---

# RDS 연결 암호화: 서버 강제와 세션 확인

> 상위 문서: [[RDS-Connection-Credentials|RDS 앱 연결과 자격증명]]

클라이언트 쪽 TLS 설정(CA 번들, 인증서 검증 모드, 터널 연결)은 상위 문서에 있다. 이 문서는 DB가 암호화하지 않은 연결을 거부하게 하는 엔진별 설정과 실제 세션의 암호화 여부를 확인하는 방법을 다룬다.

## 서버 인증서와 두 겹의 보호

RDS는 DB 인스턴스를 만들 때 CA가 서명한 서버 인증서를 설치하고, 위장 서버를 막기 위해 인증서의 CN(Common Name)에 DB 엔드포인트를 넣는다. 보호는 두 겹이다.

- **클라이언트 검증**: 클라이언트가 RDS CA로 인증서를 검증하고 엔드포인트 이름까지 대조해야 중간자와 위장 서버를 막는다.
- **서버 강제**: DB가 암호화하지 않은 연결을 거부한다. 잘못 설정한 클라이언트의 평문 연결은 막지만, 클라이언트가 붙은 서버가 진짜인지는 확인하지 않는다.

둘은 서로를 대신하지 않는다. 클라이언트 기본값에도 기대지 않는다. MySQL 클라이언트의 기본 `PREFERRED`와 libpq, JDBC의 기본 `prefer`는 암호화를 먼저 시도하고 실패하면 암호화 없이 연결한다. MySQL은 `VERIFY_IDENTITY`, PostgreSQL은 `verify-full`처럼 서버 신원까지 확인하는 모드를 명시한다.

## 엔진별 강제 설정

2026-10-14 RDS 엔진별 SSL/TLS 문서 기준이다. 기본값은 엔진 버전에 따라 달라질 수 있으므로(MariaDB는 11.8부터 `ON`) 대상 parameter group의 실제 값을 확인한다. 값을 바꾸려면 custom parameter group이 필요하다. 기본 group을 쓰던 인스턴스에 새 group을 연결하면 엔진과 관계없이 재부팅 뒤에 그 group의 값이 적용된다. 여러 인스턴스가 공유하는 그룹을 고치면 그 그룹을 쓰는 모든 인스턴스에 적용된다.

| 엔진 | 파라미터와 기본값 | 적용 | 강제 시 동작 |
|---|---|---|---|
| RDS for MySQL | `require_secure_transport`, `OFF` | 이미 연결한 custom group에서 값을 바꾸면 재부팅 불필요 | 암호화하지 못한 연결은 `Error 3159 (HY000)`로 거부 |
| RDS for MariaDB 10.5 이상 | `require_secure_transport`, 11.4 이하 `OFF`, 11.8 이상 `ON` | 이미 연결한 custom group에서 값을 바꾸면 재부팅 불필요 | 암호화하지 못한 연결은 10.11 이하에서 `ERROR 1045 (28000): Access denied`, 11.4 이상에서 `Connections using insecure transport are prohibited ...`로 거부 |
| RDS for PostgreSQL | `rds.force_ssl`, 15 이상 `1`, 14 이하 `0` | 실행 중인 인스턴스에 새 custom group을 붙이면 재부팅 필요 | SSL 없는 연결은 `no pg_hba.conf entry ..., no encryption`으로 거부(AWS 예시의 `SSL off`는 PostgreSQL 13 이하의 문구) |
| RDS for SQL Server | `rds.force_ssl`, `0` | static이라 재부팅 필요 | 클라이언트 작업 없이 연결을 암호화(SSMS 19.3, 20.0, 20.2는 인증서 설정 확인 필요) |

- 인증 실패와 같은 `ERROR 1045 Access denied`가 TLS 요구 위반일 수 있다. RDS for MariaDB 10.11 이하의 서버 강제 위반과, MySQL과 MariaDB에서 `REQUIRE SSL` 계정이 TLS 없이 붙은 연결이 그렇다. 비밀번호와 권한을 고치기 전에 클라이언트의 TLS 설정과 `SHOW CREATE USER`의 `REQUIRE` 조건부터 확인한다. MariaDB는 11.2.1부터 서버 강제 위반을 전용 오류로 알리므로(MDEV-30178), 1045만 보여 주는 AWS 예시는 11.4 이상과 다르다. timeout과 인증 오류를 나누는 기준은 [[RDS-Connection-Credentials#네트워크 접근과 연결 실패 디버깅|연결 실패 디버깅]]에 있다.
- 인스턴스 전체가 아니라 계정 단위로 강제하려면 MySQL과 MariaDB에서 `ALTER USER 'app_user'@'%' REQUIRE SSL;`을 쓴다.

## 클라이언트 쪽 준비

- 클라이언트 종류에 따라 옵션 이름이 다르다. AWS 예시는 MySQL 클라이언트에 `--ssl-ca`와 `--ssl-mode=VERIFY_IDENTITY`를, MariaDB 클라이언트에 `--ssl-ca`와 `--ssl` 또는 `--ssl-verify-server-cert`를 쓴다. 많은 리눅스 배포판의 `mysql` 명령은 MariaDB 클라이언트이므로 `mysql --version`으로 먼저 확인한다.
- 신뢰 저장소에는 루트 CA만 등록하는 것이 기본이다. 중간 CA를 등록하면 RDS가 서버 인증서를 자동 교체할 때 연결이 실패할 수 있다. 인증서 체인을 받지 않는 애플리케이션에 한해 리전의 중간 인증서를 쓰고 서버 인증서 교체 일정을 함께 관리한다. AWS GovCloud (US) 리전에 SSL/TLS로 연결할 때는 중간 인증서가 필요하다.
- Windows의 SSMS 같은 클라이언트에는 PEM 번들보다 루트와 중간 CA를 함께 가져오는 PKCS #7(`.p7b`) 번들이 권장된다.

## 실제 세션의 암호화 확인

강제를 켜기 전에 지금 붙어 있는 세션 중 암호화하지 않은 클라이언트를 찾아 먼저 고친다. 강제는 연결을 맺을 때 검사하므로(MySQL과 MariaDB는 연결 인증 단계, PostgreSQL은 연결 시도마다 `pg_hba.conf` 대조) 이미 맺어진 비암호화 세션은 남아 있을 수 있다. 강제를 켠 뒤 연결 풀을 다시 만들고 같은 쿼리로 확인한다. MariaDB 10.5 이상도 Performance Schema가 켜져 있으면 `threads`의 `CONNECTION_TYPE`으로 확인한다.

```sql
-- MySQL (Performance Schema 필요): SSL/TLS면 암호화, TCP/IP면 비암호화
SELECT PROCESSLIST_ID, PROCESSLIST_USER, PROCESSLIST_HOST, CONNECTION_TYPE
FROM performance_schema.threads
WHERE PROCESSLIST_ID IS NOT NULL;

-- MySQL 현재 세션: 값이 비어 있으면 비암호화
SHOW SESSION STATUS LIKE 'Ssl_cipher';

-- PostgreSQL: ssl이 f인 클라이언트 세션을 찾는다
SELECT a.usename, a.client_addr, a.application_name, s.ssl
FROM pg_stat_ssl s
JOIN pg_stat_activity a ON s.pid = a.pid
WHERE a.backend_type = 'client backend';

-- SQL Server 현재 세션: TRUE면 암호화
SELECT encrypt_option FROM sys.dm_exec_connections WHERE session_id = @@SPID;
```

## 면접 체크포인트

- 클라이언트의 인증서 검증과 서버의 TLS 강제가 각각 막는 위협
- `PREFERRED`, `prefer` 같은 클라이언트 기본값이 평문 연결로 떨어질 수 있는 이유
- MySQL의 `require_secure_transport`, PostgreSQL과 SQL Server의 `rds.force_ssl`의 기본값과 재부팅 필요 여부
- MariaDB 10.11 이하의 서버 강제 위반과 계정의 `REQUIRE SSL` 위반이 `Access denied`로 보여 인증 문제로 오진하기 쉬운 점

## 출처

- [Amazon RDS User Guide, Using SSL/TLS to encrypt a connection to a DB instance or cluster](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)
- [Amazon RDS User Guide, Associating a DB parameter group with a DB instance in Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.Associating.html)
- [Amazon RDS User Guide, SSL/TLS support for MySQL DB instances](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.SSLSupport.html)
- [Amazon RDS User Guide, Requiring SSL/TLS for all connections to a MySQL DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-ssl-connections.require-ssl.html)
- [Amazon RDS User Guide, Requiring SSL/TLS for specific user accounts to a MySQL DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-ssl-connections.require-ssl-users.html)
- [Amazon RDS User Guide, Connecting to your MySQL DB instance with SSL/TLS from the MySQL command-line client](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToInstanceSSL.CLI.html)
- [Amazon RDS User Guide, Requiring SSL/TLS for all connections to a MariaDB DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mariadb-ssl-connections.require-ssl.html)
- [Amazon RDS User Guide, Using SSL with a PostgreSQL DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html)
- [Amazon RDS User Guide, Using SSL with a Microsoft SQL Server DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Concepts.General.SSL.Using.html)
- [MySQL 8.4 Reference Manual, Configuring MySQL to Use Encrypted Connections](https://dev.mysql.com/doc/refman/8.4/en/using-encrypted-connections.html)
- [MySQL 8.4 Reference Manual, The threads Table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-threads-table.html)
- [PostgreSQL 18 Documentation, The pg_hba.conf File](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html)
- [acl_authenticate, acl_check_ssl, sql/auth/sql_authentication.cc — MySQL Server 8.4 GitHub](https://github.com/mysql/mysql-server/blob/8.4/sql/auth/sql_authentication.cc)
- [acl_authenticate, acl_check_ssl, sql/sql_acl.cc — MariaDB Server 11.4 GitHub](https://github.com/MariaDB/server/blob/11.4/sql/sql_acl.cc)
- [mysql-test/main/require_secure_transport.result — MariaDB Server 10.11 GitHub](https://github.com/MariaDB/server/blob/10.11/mysql-test/main/require_secure_transport.result)
- [mysql-test/main/require_secure_transport.result — MariaDB Server 11.4 GitHub](https://github.com/MariaDB/server/blob/11.4/mysql-test/main/require_secure_transport.result)
- [MDEV-30178, Error message when require_secure_transport is enabled should be more explict — MariaDB Jira](https://jira.mariadb.org/browse/MDEV-30178)
- [ClientAuthentication, src/backend/libpq/auth.c — PostgreSQL REL_14_STABLE GitHub](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/libpq/auth.c)
- [ClientAuthentication, src/backend/libpq/auth.c — PostgreSQL REL_13_STABLE GitHub](https://github.com/postgres/postgres/blob/REL_13_STABLE/src/backend/libpq/auth.c)
- [How do I use an SSL connection to successfully connect to my Amazon RDS instance? — AWS re:Post Knowledge Center](https://repost.aws/knowledge-center/rds-connect-ssl-connection)
- [How do I successfully connect to my Amazon RDS instance using an SSL connection? — Amazon Web Services](https://www.youtube.com/watch?v=qSt7XZUIFHE)

## 관련 문서

- [[RDS-Connection-Credentials|RDS 앱 연결과 자격증명]]
- [[RDS-Operational-Pitfalls|RDS 운영 함정]] — parameter group 수정과 재부팅
- [[RDS-Operational-Pitfalls-Rare|RDS 운영 함정 (저빈도)]] — CA 인증서 만료
- [[HTTPS-TLS|HTTPS와 TLS 핸드셰이크]]
