---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
---

# PostgreSQL, SQL Server와 Oracle CDC

세 source의 batch/증분과 CDC는 서로 다른 설정이다. CDC를 켜는 SQL은 원본 database의 운영 상태를 바꾸므로 아래는 공개 계약의 정리이며 실제 명령을 실행한 기록이 아니다.

## PostgreSQL

기본 TLS는 verify-full이며 사용자/password와 신뢰할 CA를 맞춘다. 공개 문서의 JDBC 42 및 서버 8.2 이상 호환 주장은 확인일 기준으로 읽고 실제 driver/server 조합을 확인한다. RDS 2019 CA 예시는 현재 권장 CA임을 뜻하지 않으므로 적용 때 갱신된 인증서를 확인한다.

Beta CDC는 logical replication slot과 publication을 source당 하나씩 사용한다. 한 source에서 여러 table을 읽을 수 있지만 다른 slot/publication이 필요하면 source를 분리한다. 자동 생성에는 CREATE/REPLICATION 등 추가 권한과 읽기 SELECT가 필요하다. exploration에는 작동 중인 runtime 조건을 확인한다.

코드에서 PostgreSQL을 다루는 공식 예제는 external transform에서 `psycopg2`로 직접 연결한다(2026-11-24 확인한 문서 기준). 두 예제 모두 `transform.using`과 `LightweightOutput.write_table`을 쓰고, password는 source secret `PASSWORD`에서 읽으며 host, port `5432`, database, user는 코드에 적는다. `psycopg2.connect`에는 `sslmode`가 없다. libpq의 기본 `sslmode`는 `prefer`라 SSL을 먼저 시도하고 실패하면 암호화 없이 연결하며 서버 인증서를 검증하지 않는다. 그래서 위 커넥터 기본값 `verify-full`과 같은 검증을 기대하지 않는다(해석). `PGSSLMODE` 같은 환경 변수가 Foundry runtime에 있는지는 확인하지 못했으므로 검증이 필요하면 `sslmode="verify-full"`과 CA 경로를 연결 인자로 직접 준다.

- 읽기: `SELECT * FROM plants;`를 `pl.read_database(query, conn, infer_schema_length=None)`로 읽는다. Polars는 DBAPI2 연결을 직접 받고, `infer_schema_length=None`은 행 단위로 읽은 data 전체를 훑어 열 타입을 추론한다는 뜻이라 큰 결과에서는 느릴 수 있다. Polars는 자기가 만들지 않은 연결을 닫지 않으며, 예제는 읽기 연결을 닫는 코드가 없다.
- 쓰기: `CREATE TABLE IF NOT EXISTS plants (name TEXT PRIMARY KEY, ...)`를 실행한 뒤 `COLUMN_MAPPING`으로 Foundry 열 이름을 PostgreSQL 열 이름으로 바꿔 행마다 `INSERT`하고, 쓴 행 수(`plants.height`)를 요약 dataset으로 출력한다. `with conn:` 블록은 예외가 없으면 commit, 예외가 나면 rollback하지만 연결은 닫지 않으므로 예제는 `finally`에서 `conn.close()`를 부른다. 다음은 예제를 읽은 해석이다. `ON CONFLICT`가 없어 이미 있는 `name`을 다시 쓰면 primary key 위반으로 그 실행의 모든 삽입이 rollback되므로, 같은 입력으로 build를 다시 돌리면 실패한다. 재실행을 허용하려면 `ON CONFLICT (name) DO UPDATE` 같은 upsert가 필요하다. 입력에 `COLUMN_MAPPING`에 없는 열이 있으면 연결 직후 `KeyError`로 멈추고, 이 오류는 `try` 밖에서 나므로 `finally`의 `conn.close()`도 실행되지 않는다. 열 매핑을 연결 전에 끝내면 이 경로가 없어진다. 행마다 왕복하는 방식이라 큰 입력에는 server 왕복을 줄이는 `psycopg2.extras.execute_values` 같은 일괄 실행을 검토한다.

## Microsoft SQL Server

사용자/password, Microsoft Entra Password, MSI와 service principal 모드를 구별한다. Entra Password를 NTLM/Kerberos로 해석하지 않는다. NTLM은 custom JDBC 경로를 검토한다.

기본 `encrypt=true`, `trustServerCertificate=false`이며 일반 port는 1433이다. Azure Redirect는 연결 후 다른 IP/11000~11999 경로를 쓸 수 있다. 넓은 allowlist를 자동 추가하기보다 Azure Proxy 모드와 네트워크 요구를 확인한다.

SQL Server connector의 exploration, batch, incremental, Iceberg sync, CDC sync와 table export는 확인일 기준 모두 GA다. batch sync의 Foundry `SNAPSHOT` transaction은 output dataset의 이전 내용을 교체한다는 뜻일 뿐 SQL Server의 snapshot isolation을 켜지 않는다. `READ_COMMITTED_SNAPSHOT`이 OFF이면(SQL Server와 Azure SQL Managed Instance의 기본, Azure SQL Database는 ON이 기본) 기본 `READ COMMITTED`는 shared lock으로 읽되 행을 읽은 뒤 lock을 놓으므로 시점 일관성을 보장하지 않는다. 행을 index 안이나 partition 사이에서 옮기는 동시 update(예: index key 변경)가 있으면 query 하나로 성공한 sync에서도 행이 중복되거나 빠질 수 있다. `READ_COMMITTED_SNAPSHOT`이 ON이면 각 statement가 자기 시작 시점의 일관된 snapshot을 읽으므로, 아래 절차는 주로 이 옵션이 OFF인 원본에서 필요하다(해석).

한 table을 읽는 batch sync에 시점 일관성이 필요하면 원본 database의 `ALLOW_SNAPSHOT_ISOLATION`이 ON인지 DBA와 확인한다(SQL Server와 Managed Instance의 user database는 OFF, Azure SQL Database는 ON이 기본). 그다음 같은 SQL Query field에서 기존 `SELECT` 앞에 `SET TRANSACTION ISOLATION LEVEL SNAPSHOT;`을 두고 preview한 뒤 저장해 실행한다. SNAPSHOT 읽기는 transaction이 처음 data에 접근한 시점에 commit된 version을 보며, database 전체의 `READ_COMMITTED_SNAPSHOT`을 켜지 않고 이 추출만 일관되게 읽는 방법이다. `ALLOW_SNAPSHOT_ISOLATION`이 OFF인 database에서는 SNAPSHOT 격리 수준 transaction을 시작할 수 없고, 여러 database를 읽으면 각 database에서 ON이어야 한다. 별도 sync와 parallel 기능으로 나뉜 query는 snapshot을 공유하지 않으므로, sync를 나눠 읽는 여러 table끼리나 parallel 기능으로 나뉜 한 table의 query끼리는 이 설정만으로 같은 시점을 본다는 보장이 없다(해석).

`ALLOW_SNAPSHOT_ISOLATION`을 켜는 것도 원본 운영 설정의 변경이다. 켜면 그 database의 모든 data 수정이 row version을 남기고(ADR이 꺼져 있으면 `tempdb`의 version store), 행마다 versioning 정보로 최대 14 byte가 붙을 수 있으며, 오래 실행되는 transaction은 오래된 version의 정리를 막는다. version store가 `tempdb`에 있을 때 공간이 모자라면 아직 row version을 만들지 않은 가장 오래 실행 중인 transaction이 희생자로 표시돼 roll back될 수 있고(메시지 3967, 3966), 축소로도 공간을 얻지 못해 가득 차면 쓰기는 version을 만들지 않은 채 계속 성공하고 만들어지지 않은 version을 읽으려는 transaction은 오류 3958로 roll back된다. 오래 걸리는 읽기 전용 SNAPSHOT 추출이 이런 희생자가 될 수 있으므로(해석) version store 공간을 DBA와 함께 검토한다.

CDC는 database와 각 table에서 켜고 CDC schema에 대한 실행/읽기 권한을 맞춘다. source 설정만으로 원본 CDC 활성화가 완료되지는 않는다.

코드에서 SQL Server를 다루는 공식 예제는 external transform에서 `pymssql`로 직접 연결한다(2026-11-24 확인한 문서 기준). 연결 값은 port 1433, `encryption: "require"`, `timeout: 30`이고 password는 source secret `MSSQL_BASIC_AUTH_PASSWORD`에서 읽는다. pymssql의 `timeout`은 query timeout(초)이며 연결과 로그인 대기는 `login_timeout`으로 따로 정한다. pymssql은 암호화 설정을 FreeTDS에 넘기는데, FreeTDS의 `require`는 암호화된 연결만 허용할 뿐이고 CA 파일을 지정하지 않으면 서버 인증서를 검증하지 않는다. 그래서 위 커넥터 기본값(`trustServerCertificate=false`)과 같은 검증을 기대하지 않는다. Foundry runtime의 FreeTDS 설정은 확인하지 못했다. 2026-11-04 수집본과 2026-11-24 수집본 사이의 개정에서 두 예제는 `@lightweight`와 `transform_pandas`의 DataFrame 반환 대신 `transform.using`과 `LightweightOutput.write_table`로 쓰도록 바뀌었고, pandas 대신 Polars를 쓴다.

- 읽기: `cursor(as_dict=True)`로 `FruitName, Inventory, PricePerKg` 열을 지정해 조회하고, 결과를 `pl.String`, `pl.Int32`, `pl.Decimal(10, 2)`의 명시 schema로 Polars DataFrame에 담는다. 원본 DDL의 `DECIMAL(10, 2)`와 같은 precision과 scale이다. schema를 고정하면 조회 결과가 0행이어도 열 이름과 타입이 정해진다(해석).
- 쓰기: 입력 dataset을 `fruits_df.polars().iter_rows(named=True)`로 한 행씩 읽어 `UPDATE`하고, `rowcount`가 0이면 `INSERT`한 뒤 마지막에 한 번 commit한다. 행마다 inserted나 updated를 적은 요약 dataset을 출력한다. 다음은 예제를 읽은 해석이다. 갱신 뒤 삽입은 한 문장이 아니어서 같은 키를 동시에 쓰는 다른 writer가 있으면 두 `INSERT`가 겹쳐 primary key 위반이 날 수 있으므로 단일 writer를 전제로 한다. 예제 주석의 입력 schema는 `PricePerKg: Double`이라 `DECIMAL(10, 2)`에 쓰는 과정에서 소수 자리 반올림이 생길 수 있다. SQL Server는 대상 scale보다 소수 자리가 많은 값을 오류 없이 반올림하고, precision을 넘는 값은 오류 8115로 거부한다. 큰 입력에는 행마다 두 번까지 왕복하는 이 방식보다 일괄 적재를 검토한다.

Lightweight 입출력 객체의 계약은 [[Palantir-Python-Dataset-IO]]에서 본다.

## Oracle Database

문서는 JDBC 21.x에 Oracle 12.1 이상을 요구한다. 더 오래된 서버는 custom driver 호환을 검토한다. 기본 TLS true, port 1521이며 SID와 service name은 대체 가능한 필드가 아니다.

Debezium CDC는 ARCHIVELOG, database/table supplemental logging과 LogMiner, catalog view 권한을 요구한다. archive/listener/alert 로그와 log history를 함께 진단한다. 로그 전환이 너무 드물면 ARCHIVE_LAG_TARGET 같은 원본 설정이 관련될 수 있지만 변경 전 원본 DBA 검토가 필요하다.

Oracle virtual table의 Foundry worker/password 조건은 CDC credential과 별도로 확인한다.

## Db2와 Redshift의 별도 조건

Db2 CDC도 Debezium과 runtime 구성을 확인한다. Db2 table export의 journaling은 IBM i/AS400에 필요하며 z/OS/LUW에도 같은 전제라고 확대하지 않는다.

Redshift는 endpoint, database, 사용자/password와 port 기본 5439를 지정한다. cloud identity assume-role에는 target IAM role 권한과 신뢰 정책이 필요하다. table export batch 기본 1,000, 최대 100,000은 Redshift 전용 계약이다.

## 출처

- [Palantir, postgresql](https://www.palantir.com/docs/foundry/available-connectors/postgresql)
- [Palantir, microsoft-sql-server](https://www.palantir.com/docs/foundry/available-connectors/microsoft-sql-server)
- [Palantir, oracle](https://www.palantir.com/docs/foundry/available-connectors/oracle)
- [Palantir, db2](https://www.palantir.com/docs/foundry/available-connectors/db2)
- [Palantir, aws-redshift](https://www.palantir.com/docs/foundry/available-connectors/aws-redshift)
- [Palantir, optimize-jdbc-syncs](https://www.palantir.com/docs/foundry/data-connection/optimize-jdbc-syncs)
- [Microsoft Learn, SET TRANSACTION ISOLATION LEVEL (Transact-SQL)](https://learn.microsoft.com/sql/t-sql/statements/set-transaction-isolation-level-transact-sql)
- [Microsoft Learn, Transaction locking and row versioning guide](https://learn.microsoft.com/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide)
- [Microsoft Learn, CAST and CONVERT (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/functions/cast-and-convert-transact-sql)
- [PostgreSQL Documentation, libpq Database Connection Control Functions](https://www.postgresql.org/docs/current/libpq-connect.html) — `sslmode`의 기본값 `prefer`와 모드별 인증서 검증
- [Psycopg 2, Basic module usage](https://www.psycopg.org/docs/usage.html) — `with connection`의 commit, rollback과 연결 유지
- [Psycopg 2, Extras](https://www.psycopg.org/docs/extras.html) — fast execution helpers와 `execute_values`
- [Polars, polars.read_database](https://docs.pola.rs/api/python/stable/reference/api/polars.read_database.html) — DBAPI2 연결, `infer_schema_length=None`, 연결을 닫지 않는 동작
- [pymssql, pymssql module reference](https://pymssql.readthedocs.io/en/latest/ref/pymssql.html)
- [FreeTDS, freetds.conf](https://www.freetds.org/userguide/freetdsconf.html)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계와 Strict Serializable]] — Snapshot Isolation의 정의와 DBMS별 차이
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]] — SQL Server row versioning의 저장 위치
