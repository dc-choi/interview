---
tags: [database, sqlite, sql, type-affinity, index, transaction]
status: done
verified_at: 2026-11-18
category: "Database - RDBMS"
aliases: ["SQLite Fundamentals", "SQLite 기본기", "SQLite 타입 친화성", "SQLite Type Affinity", "sqlite3 CLI", "EXPLAIN QUERY PLAN"]
---

# SQLite 기본기: 파일 하나에 담긴 관계형 DB

SQLite는 별도 서버 프로세스 없이 애플리케이션이 함수 호출로 데이터베이스 파일을 직접 읽고 쓰는 임베디드 관계형 DB다. 공식 문서는 SQLite가 클라이언트/서버 DB가 아니라 `fopen()`과 경쟁한다고 설명하고, 동시에 쓰는 클라이언트가 많은 서비스에는 클라이언트/서버 DB가 나을 수 있다고 적는다. SQL 문법은 대부분 같지만 타입, 제약의 기본값과 동시 쓰기 모델이 MySQL이나 PostgreSQL과 달라 그대로 옮기면 오류 없이 틀린 결과가 나온다.

아래 동작은 SQLite 공식 문서와 대조하고, SQLite 3.53.4 CLI(Homebrew 빌드)와 Python 3.14.8 `sqlite3` 모듈(SQLite 라이브러리 3.53.4)로 2026-11-18 실행해 확인했다. 공통 SQL은 [[SQL-Fundamentals|SQL 기본기]], 복제와 분산 구성은 [[Distributed-SQLite|분산 SQLite]]에 있다.

## CSV에서 SQL로

CSV 같은 플랫 파일은 값을 구분자로만 나눈 텍스트다. 모든 값이 문자열이고, 열을 위치로 읽는 코드는 열 순서가 바뀌면 깨지며, 개수 세기와 정렬마다 반복문을 써야 한다. 관계형 DB는 타입과 제약을 스키마에 선언하고 집계와 정렬을 SQL로 선언하며, 인덱스로 탐색 비용을 줄인다. 같은 사실이 여러 행에 반복되는 표는 테이블을 나누고 키로 잇는다([[Normalization|정규화]], [[Relational-Relationship-Modeling|관계 모델링]]).

```text
$ sqlite3 favorites.db
sqlite> .import --csv favorites.csv favorites
sqlite> .schema favorites
sqlite> SELECT language, COUNT(*) AS n FROM favorites GROUP BY language ORDER BY n DESC;
sqlite> .quit
```

- `.`으로 시작하는 줄은 SQL이 아니라 `sqlite3` CLI가 해석하는 dot-command다. 줄 맨 앞에서 시작해 한 줄 안에 끝나야 하고, 라이브러리 API(`sqlite3_prepare()`)나 Python 드라이버에 넘기면 동작하지 않는다.
- `.schema`는 저장된 `CREATE` 문을, `.timer on`은 문장마다 실행 시간을, `.eqp on`은 실행 전 쿼리 계획을 보여 준다.
- `.import`는 대상 테이블이 없으면 첫 행을 컬럼 이름으로 테이블을 만들고, 있으면 첫 행도 데이터로 넣는다(헤더를 건너뛰려면 `--skip 1`). `--csv`나 `.mode csv` 없이 들여오면 쉼표를 열 구분자로 보지 않아 한 줄 전체가 한 컬럼이 되었다(3.51.0, 3.53.4 실측).

### 들여온 숫자는 문자열이다

`.import`가 만든 컬럼의 선언 타입은 공식 문서에 정해져 있지 않다. 실측에서 3.51.0 CLI(macOS 기본 빌드)는 모든 컬럼을 `TEXT`로, 3.53.4 CLI는 타입 없는 컬럼으로 만들었다. 어느 쪽이든 CSV의 숫자는 TEXT 값으로 저장되고 비교가 어긋난다(아래 친화성 규칙).

| 값 10.0, 7.5, 5.0인 `rating` | 3.51.0 (`TEXT` 컬럼) | 3.53.4 (타입 없는 컬럼) |
|---|---|---|
| `WHERE rating >= 6.0` | 7.5만. 리터럴이 TEXT로 바뀌어 `'10.0' < '6.0'`인 문자열 비교 | 세 행 모두. 바꾸지 않고 비교하며 숫자는 모든 TEXT보다 작다 |
| `ORDER BY rating DESC` | 7.5, 5.0, 10.0 | 7.5, 5.0, 10.0 |

타입을 선언한 테이블을 먼저 만들고 헤더를 건너뛰어 들여오면 REAL로 저장되어 10.0과 7.5가 나온다. 이미 들여온 데이터는 `CAST(rating AS REAL)`로 비교한다.

```sql
-- sqlite3 CLI 입력. .import는 dot-command다
CREATE TABLE ratings (title TEXT NOT NULL, rating REAL);
.import --csv --skip 1 ratings.csv ratings
SELECT title FROM ratings WHERE rating >= 6.0;
```

## 타입 친화성: 선언 타입은 권고다

값의 저장 클래스는 NULL, INTEGER, REAL, TEXT, BLOB 다섯이다. 컬럼의 선언 타입은 저장을 권하는 타입인 친화성(affinity)을 정할 뿐이라, `INTEGER PRIMARY KEY`를 뺀 일반 테이블의 컬럼은 어떤 저장 클래스의 값도 받는다.

| 선언 타입에 든 문자열 (위 규칙 우선) | 친화성 |
|---|---|
| `INT` | INTEGER |
| `CHAR`, `CLOB`, `TEXT` (`VARCHAR` 포함) | TEXT |
| `BLOB` 또는 타입 없음 | BLOB (저장 클래스를 바꾸지 않음) |
| `REAL`, `FLOA`, `DOUB` | REAL |
| 그 밖 (`NUMERIC`, `DECIMAL`, `BOOLEAN`, `DATE` 등) | NUMERIC |

- INTEGER 친화성 컬럼에 `'123'`을 넣으면 정수로 바꿔 저장하지만 `'abc'`는 오류 없이 TEXT로 저장한다. 실제 저장 클래스는 `typeof(컬럼)`으로 확인한다.
- `VARCHAR(255)`의 길이는 무시한다. BOOLEAN과 DATETIME 타입도 따로 없어 참과 거짓은 정수 1과 0, 날짜는 ISO-8601 문자열이나 Unix 시간 정수 등으로 저장한다.
- 비교 전에 친화성을 적용한다. 한쪽이 INTEGER, REAL, NUMERIC 친화성이면 다른 쪽에 NUMERIC을, 한쪽이 TEXT이고 다른 쪽(리터럴 등)에 친화성이 없으면 TEXT를 적용하고, 그 밖에는 그대로 비교한다. 저장 클래스가 다르면 NULL이 가장 작고 INTEGER와 REAL, TEXT, BLOB 순으로 커진다.
- 3.37.0부터 `CREATE TABLE ... STRICT`는 컬럼 타입을 `INT`, `INTEGER`, `REAL`, `TEXT`, `BLOB`, `ANY`로 제한하고, 손실 없이 바꿀 수 없는 값을 거부한다(`cannot store TEXT value in INTEGER column`). STRICT 테이블이 있는 파일은 3.37.0 이전 버전이 정상적으로 읽지 못한다.

## 문자열과 대소문자

- 문자열 리터럴은 작은따옴표로 쓰고 안의 작은따옴표는 두 번 쓴다(`'Hello, It''s Me'`). 백슬래시 escape는 없다. 큰따옴표는 식별자용이다.
- 라이브러리는 식별자로 풀리지 않는 큰따옴표 문자열을 문자열 리터럴로 받아들이는 호환 동작이 있어, 오타 난 컬럼 이름이 오류 없이 문자열이 될 수 있다. 3.41.0부터 공식 CLI는 이 동작을 기본으로 끄지만 배포판 빌드는 다를 수 있다. 실측에서 `SELECT "no_such_col" FROM favorites`는 3.53.4 CLI(Homebrew, `DQS=0`)에서 `no such column` 오류였고, macOS 기본 3.51.0 CLI(`DQS=3`)와 Python `sqlite3`에서는 문자열 `'no_such_col'`을 돌려주었다. `PRAGMA compile_options`의 `DQS` 값은 그 바이너리의 컴파일 기본값이고 연결마다 바꿀 수 있다. CLI는 `.dbconfig`로, Python 3.12 이상은 `con.setconfig(sqlite3.SQLITE_DBCONFIG_DQS_DML, False)`로 끈다(끈 뒤 같은 쿼리가 `no such column` 오류가 됨을 실측). 공식 문서는 애플리케이션도 `-DSQLITE_DQS=0`으로 빌드해 끄기를 권한다.
- `=` 비교는 기본 collation인 BINARY로 바이트를 비교해 대소문자를 구분한다. `LIKE`는 기본으로 ASCII 범위만 대소문자를 무시해 `'a' LIKE 'A'`는 참이고 `'æ' LIKE 'Æ'`는 거짓이다. `upper()`, `lower()`와 NOCASE collation도 ASCII만 접는다.
- 주석은 `--`부터 줄 끝까지와 `/* */`다. 이어 붙인 문자열에서 이 주석이 뒤 조건을 지우는 공격은 [[SQL-Injection|SQL Injection]]에 있다.

## 키와 제약의 기본값

- 일반 테이블의 행은 64비트 정수 `rowid`로 식별된다. 선언 타입이 정확히 `INTEGER`인 단일 컬럼 기본 키는 rowid의 별칭이 되어, NULL을 넣거나 값을 생략하면 자동으로 번호가 붙는다. `INT PRIMARY KEY`나 `BIGINT PRIMARY KEY`는 별칭이 아니라 고유 인덱스가 있는 일반 컬럼이다. 컬럼 정의에 `INTEGER PRIMARY KEY DESC`라고 쓴 경우도 초기 버전의 버그를 호환성 때문에 남긴 예외라 별칭이 되지 않는다.
- 역사적 이유로 rowid 별칭이 아닌 `PRIMARY KEY` 컬럼은 NULL을 받는다. 막으려면 `NOT NULL`을 함께 쓴다. STRICT와 WITHOUT ROWID 테이블은 NULL을 거부한다.
- 외래 키 검사는 하위 호환을 위해 기본으로 꺼져 있다. 연결마다 `PRAGMA foreign_keys = ON;`을 실행해야 하고, 트랜잭션 안에서 실행하면 오류 없이 무시된다. 꺼진 연결에서는 없는 부모를 가리키는 행이 그대로 들어간다(실측). 참조 무결성 설계는 [[Foreign-Key-Integrity|외래 키와 참조 무결성]]에 있다.
- 서버 계정과 `GRANT`, `REVOKE`가 없다. 접근 통제는 DB 파일에 대한 운영체제 권한이 전부다.

## 인덱스와 EXPLAIN QUERY PLAN

`EXPLAIN QUERY PLAN`은 테이블마다 전체를 훑는 `SCAN`인지 일부 행만 찾는 `SEARCH`인지 보여 준다. 출력 형식은 대화형 디버깅용이라 릴리스마다 바뀔 수 있으므로 애플리케이션이 파싱하지 않는다.

```sql
-- shows(id INTEGER PRIMARY KEY, title TEXT NOT NULL, year NUMERIC)
EXPLAIN QUERY PLAN SELECT * FROM shows WHERE title = 'The Office';
-- `--SCAN shows
CREATE INDEX title_index ON shows (title);
EXPLAIN QUERY PLAN SELECT * FROM shows WHERE title = 'The Office';
-- `--SEARCH shows USING INDEX title_index (title=?)
```

- SQLite는 rowid 테이블마다 64비트 정수 key의 table B-tree에 행을 저장하고, 인덱스마다 행 데이터 없이 key만 담은 index B-tree를 따로 둔다. 인덱스는 행을 바꿀 때마다 함께 갱신되므로 쓰기 비용과 공간을 더 쓴다([[Index|인덱스]], [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]). 실측에서 20만 행의 같은 조회가 약 5.4ms에서 0.015ms로 줄었다(`.timer on`, 1회 측정). `SELECT id, title`처럼 필요한 컬럼이 모두 인덱스에 있으면 `USING COVERING INDEX`로 바뀌어 테이블 B-tree를 읽지 않는다([[Covering-Index|커버링 인덱스]]).
- 기본 `LIKE`는 대소문자를 무시하므로 BINARY collation의 일반 인덱스로는 `title LIKE 'The Off%'`도 `SCAN`이다. `CREATE INDEX title_nocase ON shows (title COLLATE NOCASE)`를 두면 `SEARCH ... (title>? AND title<?)` 범위 탐색이 된다. 패턴이 와일드카드로 시작하면 인덱스를 쓰지 못한다. 전체 조건은 공식 문서의 LIKE optimization 항목에 있다.
- 외래 키 컬럼의 인덱스는 필수가 아니지만 공식 문서는 거의 언제나 이득이라고 한다. `shows`, `stars`, `people` 세 테이블 조인에서 인덱스가 없을 때는 `stars` 60만 행을 `SCAN`하며 0.79초가 걸렸고, `stars(person_id)`와 `people(name)`에 인덱스를 만든 뒤 모든 단계가 `SEARCH`가 되어 0.04ms였다(합성 데이터, 1회 측정). 같은 조회를 `IN` 서브쿼리로 써도 같은 인덱스를 쓴다.

## 트랜잭션과 한 명의 writer

- 명시적 `BEGIN`이 없으면 문장마다 트랜잭션이 자동으로 열리고 그 문장이 끝나면 커밋된다. 그래서 `SELECT`로 읽고 `UPDATE`로 쓰는 두 문장 사이에 다른 연결이 끼어든다. 좋아요 100을 두 연결이 읽고 각자 101을 쓰면 증가 하나가 사라진다(실측 101, [[Lock#동시성 제어가 없을 때: Lost Update|Lost Update]]).
- SQLite는 쓰기를 실제로 직렬화해 serializable 격리를 만든다. 읽기 트랜잭션은 여럿 동시에 열 수 있지만 쓰기 트랜잭션은 한 번에 하나다. 같은 연결 안의 작업 사이에는 격리가 없다.
- 기본 `BEGIN`(DEFERRED)은 첫 읽기에서 읽기 트랜잭션으로 시작해 첫 쓰기에서 쓰기로 올린다. 다른 연결이 이미 쓰는 중이면 올리지 못하고 `SQLITE_BUSY`(`database is locked`)로 실패한다. 두 연결이 `BEGIN` 뒤 읽고 쓰면 늦은 쪽 `UPDATE`가 실패했고, rollback journal 모드에서는 먼저 쓴 쪽의 `COMMIT`도 상대가 롤백할 때까지 실패했다(대기 시간 0으로 실측). 갱신이 조용히 사라지지는 않지만 실패한 트랜잭션은 롤백하고 처음부터 다시 실행해야 한다.
- 읽은 값으로 쓸 트랜잭션은 `BEGIN IMMEDIATE`로 시작해 쓰기 잠금을 먼저 잡는다. 다른 writer가 있으면 시작 단계에서 기다리다가 대기 시간 안에 잠금을 얻지 못하면 `SQLITE_BUSY`로 실패하고, 앞 트랜잭션이 끝난 뒤 다시 시작하면 101을 읽어 102를 쓴다(실측). 증가처럼 한 문장으로 표현되면 `UPDATE posts SET likes = likes + 1 WHERE id = ?`가 가장 단순하다.
- WAL 모드(`PRAGMA journal_mode = WAL`, 파일에 계속 남는 설정)에서는 writer가 쓰는 동안에도 reader가 읽기 시작 시점의 스냅샷을 읽는다. writer가 하나라는 제약은 같다. 잠금이 풀리길 기다리는 시간은 `PRAGMA busy_timeout`으로 정하고, Python `sqlite3.connect()`의 `timeout` 기본값은 5초다.

## Python에서 값 바인딩

```python
import sqlite3

con = sqlite3.connect("favorites.db")
problem = "Hello, It's Me' --"  # 따옴표와 주석 기호가 든 입력
count = con.execute(
    "SELECT COUNT(*) FROM favorites WHERE problem = ?", (problem,)
).fetchone()[0]
con.close()
```

- `?`(qmark)나 `:name`(named) 자리 표시자로 값을 따로 넘긴다. 위 입력은 SQL 문법이 아니라 한 값으로 비교되어 0행을 센다. 문자열 포맷팅으로 쿼리를 조립하지 않는다.
- `execute()`는 한 문장만 실행하고, 둘 이상이면 `ProgrammingError: You can only execute one statement at a time.`를 낸다. 여러 문장은 바인딩이 없는 `executescript()`로 실행한다. 이 제한은 `; DROP TABLE` 같은 문장 추가를 막을 뿐 조건 변조는 막지 못하므로 바인딩이 기본 방어다([[SQL-Injection|SQL Injection]]).
- 기본 설정(legacy transaction control, 3.15 문서 기준)은 `INSERT`, `UPDATE`, `DELETE`, `REPLACE` 앞에서 트랜잭션을 암묵적으로 열어 `commit()` 전까지 저장하지 않는다. 이 기본값은 이후 Python 버전에서 `autocommit=False`로 바뀔 예정이다. 웹 요청마다 연결을 다루는 방법은 [[Python-Flask-Web#폼 처리: 서버 검증, 저장, PRG|Flask 폼 처리]]에 있다.

## 이해 점검

1. CSV를 `.import`로 들여온 `rating`에서 `WHERE rating >= 6.0`이 틀린 결과를 내는 이유와 고치는 두 방법은?
2. `PRAGMA foreign_keys`를 켜지 않은 연결에서 고아 행이 생기는 과정과, 연결 풀에서 이 설정을 보장할 위치는?
3. 두 연결이 같은 행을 읽고 고칠 때 autocommit, `BEGIN`, `BEGIN IMMEDIATE`에서 각각 무엇이 일어나는가?

## 출처

- [SQLite, Appropriate Uses For SQLite](https://www.sqlite.org/whentouse.html)
- [SQLite, Quirks, Caveats, and Gotchas In SQLite](https://www.sqlite.org/quirks.html)
- [SQLite, Datatypes In SQLite](https://www.sqlite.org/datatype3.html)
- [SQLite, STRICT Tables](https://www.sqlite.org/stricttables.html)
- [SQLite, Command Line Shell For SQLite](https://www.sqlite.org/cli.html)
- [SQLite, SQL Language Expressions](https://www.sqlite.org/lang_expr.html)
- [SQLite, SQL Comment Syntax](https://www.sqlite.org/lang_comment.html)
- [SQLite, CREATE TABLE](https://www.sqlite.org/lang_createtable.html) — rowid와 INTEGER PRIMARY KEY
- [SQLite, Foreign Key Support](https://www.sqlite.org/foreignkeys.html)
- [SQLite, SQL Features That SQLite Does Not Implement](https://www.sqlite.org/omitted.html)
- [SQLite, EXPLAIN QUERY PLAN](https://www.sqlite.org/eqp.html)
- [SQLite, Database File Format](https://www.sqlite.org/fileformat2.html) — table B-tree와 index B-tree
- [SQLite, The SQLite Query Optimizer Overview](https://www.sqlite.org/optoverview.html) — LIKE optimization
- [SQLite, Transaction](https://www.sqlite.org/lang_transaction.html)
- [SQLite, Isolation In SQLite](https://www.sqlite.org/isolation.html)
- [SQLite, PRAGMA Statements](https://www.sqlite.org/pragma.html)
- [Python Documentation, sqlite3](https://docs.python.org/3/library/sqlite3.html)
- [YouTube, Harvard CS50 (2026), Lecture 7: SQL](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=56926s)

## 관련 문서

- [[SQL-Fundamentals|SQL 기본기]]
- [[Distributed-SQLite|분산 SQLite]]
- [[Lock|Lock]]
- [[Transactions|트랜잭션]]
- [[Index|인덱스]]
- [[SQL-Injection|SQL Injection]]
- [[Python-Modules-and-File-IO|Python 모듈, 명령행과 파일 입출력]]
- [[RDBMS|RDBMS]]
