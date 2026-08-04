---
tags: [database, oracle, user, privilege, role, profile, security]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Oracle Users Privileges and Roles", "Oracle 사용자 권한과 롤"]
---

# Oracle 사용자, privilege와 role

Oracle account 관리는 인증, schema ownership, 권한과 공간 제한을 함께 설계하는 일이다. 관리자 계정으로 실습 명령을 실행하는 11g 흐름을 운영 권한 모델로 복사하지 않는다.

## User, schema와 container

Oracle에서 user를 만들면 같은 이름의 schema가 연결된다. User가 session을 만들 수 있는지, 어떤 object를 소유하고 사용할 수 있는지, 어느 tablespace를 쓸 수 있는지는 별도의 privilege와 quota로 결정한다.

현재 multitenant database에서는 범위를 먼저 구분한다.

- CDB common user는 root와 여러 PDB에 공통 identity가 있으며 기본 prefix는 `C##`다.
- Application common user는 application root와 그 application container 범위에 공통이다.
- Local user는 특정 PDB에만 존재한다. 일반 application account는 대상 PDB의 local user로 두는 경우가 많다.
- Common grant와 local grant는 효력이 미치는 container가 다르다. 현재 container와 `CONTAINER` 범위를 확인한다.

`SYS`와 `SYSTEM`은 Oracle 제공 관리 account다. Application 연결, schema owner와 일상 운영 account로 사용하지 않는다.

## Account 생성과 lifecycle

User 생성에는 인증 방식, default/temporary tablespace, quota, profile과 초기 account 상태가 포함된다.

```sql
CREATE USER app_owner
  IDENTIFIED BY "<secure-password>"
  DEFAULT TABLESPACE app_data
  TEMPORARY TABLESPACE temp
  QUOTA 2G ON app_data;

GRANT CREATE SESSION TO app_owner;
```

예제 문자열을 실제 password로 재사용하지 않는다. 가능하면 secret manager, external authentication과 조직의 password policy를 사용한다.

- `CREATE SESSION` 없이는 login할 수 없다.
- Default tablespace 지정만으로 공간이 생기지 않는다. Quota 또는 매우 넓은 `UNLIMITED TABLESPACE`가 필요하며 후자는 application account에 피한다.
- `ALTER USER`로 password, tablespace, quota, profile과 lock/expire 상태를 변경한다.
- `DROP USER ... CASCADE`는 schema object까지 제거하는 파괴적 DDL이다. Dependency와 backup을 확인한다.
- `ALTER SYSTEM KILL SESSION`은 특정 session을 종료할 뿐 account를 영구 차단하지 않는다. 필요하면 account lock과 credential 회전을 별도로 수행한다.

## Profile과 password 정책

Profile은 password parameter와 database resource limit를 묶는다. 대표 password parameter는 다음과 같다.

- `FAILED_LOGIN_ATTEMPTS`, `PASSWORD_LOCK_TIME`
- `PASSWORD_LIFE_TIME`, `PASSWORD_GRACE_TIME`
- `PASSWORD_REUSE_TIME`, `PASSWORD_REUSE_MAX`
- `PASSWORD_VERIFY_FUNCTION`

Password history의 두 reuse parameter는 단순한 양자택일 옵션이 아니다.

- 둘 다 숫자면 경과 기간과 변경 횟수 조건을 모두 충족해야 재사용할 수 있다.
- 둘 중 하나만 `UNLIMITED`면 password를 다시 사용할 수 없다.
- 둘 다 `UNLIMITED`면 두 제한을 무시해 재사용할 수 있다.

주기적 만료만으로 보안이 완성되지 않는다. 인증 방식, verifier function, lockout에 의한 denial-of-service 위험, credential 유출 탐지와 긴급 회전 절차를 함께 설계한다.

## Privilege의 층위

| 종류 | 예 | 의미 |
|---|---|---|
| System privilege | `CREATE SESSION`, `CREATE TABLE` | database 작업 종류를 허용 |
| Schema privilege | schema 단위 권한 | 지원되는 작업을 특정 schema 범위에 허용 |
| Object privilege | table의 `SELECT`, package의 `EXECUTE` | 특정 object와 작업을 허용 |
| Role | 여러 privilege와 role의 묶음 | 직무 단위 부여와 회수 |

Role에는 system/object privilege와 다른 role을 담을 수 있다. 일반 role은 default role로 login 때 활성화하거나 session에서 `SET ROLE`로 enable/disable한다. Role grant/revoke가 기존 session에 반영되는 시점도 새 session 또는 role 재활성화 여부를 확인한다.

Password-authenticated role은 shared password 전달과 보관 문제가 생긴다. Oracle은 application 조건으로 활성화해야 하는 권한에는 authorized PL/SQL package가 enable하는 secure application role을 대안으로 제시한다.

`ANY`가 붙은 system privilege와 `PUBLIC` grant는 영향 범위가 매우 넓다. Application에는 필요한 object privilege를 role에 모아 최소 범위로 부여하고 schema owner와 runtime user를 분리한다.

## 권한 위임과 회수

- System privilege나 role의 `WITH ADMIN OPTION`은 받은 주체가 다시 grant/revoke할 수 있게 한다. 원 grant를 회수해도 그 주체가 다른 사용자에게 이미 한 grant가 자동으로 연쇄 회수되지는 않는다.
- Object privilege의 `WITH GRANT OPTION`은 받은 사용자가 같은 privilege를 다른 사용자에게 줄 수 있게 한다. 원 grant를 회수하면 그 사용자가 만든 종속 grant도 연쇄 회수될 수 있다.
- `ADMIN OPTION`과 `GRANT OPTION`은 운영 편의 기능이 아니라 권한 graph를 확장하는 기능이다. 예외적으로만 허용하고 grant path를 감사한다.

Role을 받았다고 모든 PL/SQL unit에서 같은 방식으로 권한 검사가 통과하는 것은 아니다. Definer-rights named PL/SQL에서는 role이 비활성화되므로 object owner에게 필요한 직접 grant를 배포에서 검증한다.

## 점검 view

| 대상 | 대표 view |
|---|---|
| Account/profile/container | `DBA_USERS`, `CDB_USERS`, `USER_USERS` |
| Tablespace quota | `DBA_TS_QUOTAS`, `USER_TS_QUOTAS` |
| System privilege | `DBA_SYS_PRIVS`, `SESSION_PRIVS` |
| Object privilege | `DBA_TAB_PRIVS`, `USER_TAB_PRIVS` |
| Role grant/활성 role | `DBA_ROLE_PRIVS`, `SESSION_ROLES` |
| 현재 session | 필요한 권한으로 제한한 `V$SESSION` 조회 |

Dictionary snapshot만으로 실제 최소 권한을 증명할 수 없다. Runtime account로 허용해야 할 작업과 거부해야 할 작업을 모두 test하고 audit 결과를 검토한다.

## 출처

- [Oracle AI Database 26ai, Managing Security for Database Users](https://docs.oracle.com/en/database/oracle/oracle-database/26/dbseg/managing-security-for-oracle-database-users.html)
- [Oracle AI Database 26ai, Configuring Password Protection](https://docs.oracle.com/en/database/oracle/oracle-database/26/dbseg/configuring-authentication.html)
- [Oracle AI Database 26ai, Configuring Privilege and Role Authorization](https://docs.oracle.com/en/database/oracle/oracle-database/26/dbseg/configuring-privilege-and-role-authorization.html)
- 강의: [User 관리](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5062), [Password 관리](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5063), [System privilege](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5064), [Object privilege](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5065), [Role](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5066)

## 관련 문서

- [[Oracle-Tablespaces|Oracle tablespace와 공간 관리]]
- [[PL-SQL-Cursors-Routines-and-Triggers|PL/SQL 커서와 저장 프로그램]]
- [[Access-Control-Models|접근 제어 모델]]
