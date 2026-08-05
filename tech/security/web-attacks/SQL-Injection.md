---
tags: [security, web-attacks, sql-injection, owasp, typeorm]
status: done
category: "Security - 웹 공격"
aliases: ["SQL Injection", "SQLi", "SQL 인젝션"]
verified_at: 2026-08-05
---

# SQL Injection

OWASP의 정의는 짧다. 클라이언트에서 들어온 입력 데이터를 통해 **SQL 쿼리를 삽입(injection)하는 것**. 애플리케이션이 사용자 입력을 문자열로 이어붙여 SQL을 만들면, 입력에 섞인 따옴표와 키워드가 데이터 자리를 탈출해 **쿼리의 구조 자체를 바꾼다.**

영향은 기밀성에 그치지 않는다. OWASP는 네 축을 든다. 기밀성 손실, 비밀번호를 모르는 채 다른 사용자로 접속하는 인증 우회, 권한 정보 변조를 통한 인가 우회, 데이터 변경과 삭제를 통한 무결성 손상.

## 공격 원리

```ts
// 취약: 입력이 SQL 문법으로 해석된다
const sql = `SELECT * FROM users WHERE email = '${email}'`;
```

`email`에 `' OR '1'='1`이 들어오면 조건절이 항상 참이 되고, `'; DROP TABLE users; --`가 들어오면 문장이 끊긴 뒤 새 문장이 실행된다. 핵심은 **파서가 데이터와 코드를 구분할 근거가 없다**는 것이다. 문자열이 완성된 시점에는 어디까지가 사용자 값이었는지 정보가 이미 사라져 있다.

## 유형

| 유형 | 판별 방식 |
|------|----------|
| **UNION 기반** | 원 쿼리에 `UNION SELECT`를 붙여 다른 테이블의 결과를 응답 화면에 실어 보낸다. 컬럼 수와 타입을 맞추는 탐색이 선행된다 |
| **에러 기반** | DB 에러 메시지가 그대로 노출될 때, 의도적으로 타입 변환 오류 등을 일으켜 메시지에 데이터를 담아 꺼낸다 |
| **Blind** | 결과도 에러도 안 보일 때 사용. OWASP 표현으로 데이터베이스에 **참/거짓 질문을 던지고 애플리케이션의 응답으로 답을 판정**한다 |

Blind는 다시 둘로 나뉜다.

- **Boolean(내용) 기반** — `1=1`과 `1=2`를 주입해 응답 페이지 내용이 달라지는지 본다. 참 페이지와 거짓 페이지가 다르면 공격자는 쿼리 결과의 참/거짓을 구분할 수 있다.
- **시간 기반** — DB를 지정한 시간만큼 멈추게 하고 응답 지연으로 판정한다. MySQL `BENCHMARK()`, SQL Server `WAITFOR DELAY` 등을 써서 한 글자씩 열거한다.

에러 메시지를 감췄다고 안전해지지 않는다는 것이 Blind의 요점이다. 응답 내용 차이나 응답 시간만 남아도 데이터는 빠져나간다.

## Prepared Statement가 막는 원리

OWASP의 1순위 방어. 원리는 한 문장이다.

> "the database will always distinguish between code and data, regardless of what user input is supplied"

문자열을 합치는 대신 **쿼리 구조를 먼저 확정해 DB에 보내고(파싱, 계획 수립), 값은 나중에 별도 채널로 바인딩**한다. 값이 도착했을 때는 문장 구조가 이미 고정돼 있어서, 값 안에 무엇이 들어 있든 새 문법으로 해석될 자리가 없다. OWASP는 이를 두고 SQL 명령이 삽입되더라도 **공격자가 쿼리의 의도를 바꿀 수 없다**고 정리한다.

이스케이프로 막는 방식과 결정적으로 다른 지점이다. 이스케이프는 DB별 구현 차이가 크고 다른 방어에 비해 취약하다는 것이 OWASP의 평가라, 최후 수단으로만 둔다.

구문 분석 결과가 재사용되는 성능 측면은 [[Prepared-Statement-Cache|Prepared Statement Cache]]에 따로 정리돼 있다.

## TypeORM에서의 바인딩

쿼리 빌더는 `:name` 플레이스홀더와 값 객체를 쓴다. TypeORM 공식 문서가 이 문법을 **SQL 인젝션을 막기 위한 파라미터**라고 명시한다.

```ts
// 안전 — 값은 파라미터로 나간다
await repo.createQueryBuilder("user")
  .where("user.name = :name", { name })
  .getMany();

// 취약 — 문서가 명시적으로 경고하는 형태
await repo.createQueryBuilder("user")
  .where("user.name = '" + name + "'")
  .getMany();
```

문서는 한 쿼리 안에서 **같은 파라미터 이름을 다른 값에 재사용하지 말라**고도 덧붙인다. 값이 덮어써진다.

raw query도 파라미터를 받는다. 다만 플레이스홀더 표기가 드라이버마다 달라(`?`, `$1`, `:name` 등) 그대로 옮겨 쓰면 깨진다.

```ts
// 안전 — 두 번째 인자로 값을 넘긴다
await dataSource.query("SELECT * FROM users WHERE email = $1", [email]);

// 취약 — 템플릿 리터럴로 합치는 순간 ORM의 보호는 사라진다
await dataSource.query(`SELECT * FROM users WHERE email = '${email}'`);
```

**ORM을 쓴다는 사실 자체는 방어가 아니다.** 보호되는 것은 값을 파라미터로 넘기는 경로뿐이고, `query()`, `Raw()`, 문자열로 조립한 조건절은 그냥 SQL이다.

## 파라미터 바인딩으로 막히지 않는 지점

바인딩은 **값(리터럴)** 자리에만 걸린다. SQL 문법상 식별자와 키워드는 파라미터가 될 수 없다.

- **테이블명, 컬럼명** — `FROM :table`은 문법 오류다
- **`ORDER BY` 정렬 컬럼과 방향** — `ORDER BY :col :dir` 역시 성립하지 않는다
- **`LIMIT`, `OFFSET`** — 드라이버에 따라 바인딩되기도 하고 아니기도 하다

여기가 실무에서 실제로 뚫리는 자리다. 정렬 컬럼을 쿼리 파라미터로 받아 그대로 붙이는 목록 API가 전형적이다.

OWASP의 처방은 허용 목록 매핑이다. 사용자 입력을 **합법적인/기대되는 테이블명, 컬럼명으로 매핑**해 검증되지 않은 입력이 쿼리에 도달하지 않게 한다. 정렬 방향은 **불리언으로 변환한 뒤 그 불리언으로 안전한 값을 고르는** 방식이 최선이라고 명시한다.

```ts
const SORTABLE = { createdAt: "user.created_at", name: "user.name" } as const;

const column = SORTABLE[req.query.sort as keyof typeof SORTABLE] ?? SORTABLE.createdAt;
const direction = req.query.order === "asc" ? "ASC" : "DESC"; // 불리언 판정 후 상수 선택

qb.orderBy(column, direction);
```

핵심은 사용자 값이 SQL에 **직접 들어가지 않는다**는 것이다. 들어가는 것은 서버가 미리 정의한 상수뿐이고, 사용자 입력은 그 상수를 고르는 열쇠로만 쓰인다. 정규식으로 SQL 키워드를 걸러내는 접근은 거짓 양성과 우회가 둘 다 잘 일어나 보조 수단에 그친다([[Security-Headers#정적 검사 + SQL Injection은 별개|관련 메모]]).

## 함께 두는 방어층

- **최소 권한** — OWASP는 모든 DB 계정의 권한을 최소화하라고 하면서 애플리케이션 계정에 DBA나 관리자급 권한을 주지 말라고 대문자로 강조한다. 뚫렸을 때의 폭발 반경을 줄이는 층이다.
- **저장 프로시저** — 안전하게 구현된 경우에 한해 파라미터화 쿼리와 같은 효과. 다만 일부 환경에서 프로시저 실행을 위해 애플리케이션이 `db_owner`로 도는 구성이 생기면 최소 권한과 충돌한다.
- **입력 검증** — 타입, 길이, 형식 검증은 값 자리 방어를 대체하지 않지만 식별자 자리 허용 목록과 결합하면 유효하다([[Validation|NestJS Validation]]).

## 면접 포인트

Q. Prepared Statement가 SQL 인젝션을 막는 원리는?
- 쿼리 구조를 먼저 DB에 보내 확정하고 값은 별도로 바인딩한다. 값이 도착할 때 문장 구조는 이미 고정돼 있어 무엇이 들어와도 새 문법으로 해석될 자리가 없다. OWASP 표현으로 DB가 코드와 데이터를 항상 구분한다.

Q. ORM을 쓰면 SQL 인젝션은 신경 안 써도 되나?
- 아니다. 보호되는 건 값을 파라미터로 넘기는 경로뿐이다. TypeORM도 `where("name = '" + name + "'")` 같은 문자열 조립이나 템플릿 리터럴로 만든 `dataSource.query()`는 그대로 취약하다.

Q. 바인딩으로 못 막는 자리는?
- 테이블명, 컬럼명, `ORDER BY` 정렬 컬럼과 방향처럼 식별자와 키워드 자리다. 파라미터로 넣을 수 없으니 허용 목록 매핑으로 서버가 정의한 상수 중에서 고르게 한다. 정렬 방향은 불리언 판정 후 상수를 선택한다.

Q. 에러 메시지를 숨기면 되지 않나?
- Blind SQL Injection이 그 상황을 겨냥한다. 참/거짓에 따라 응답 내용이 달라지거나, 시간 지연 함수로 응답 시간이 달라지는 것만으로 데이터를 한 글자씩 꺼낼 수 있다.

## 출처

- [OWASP — SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [OWASP — Blind SQL Injection](https://owasp.org/www-community/attacks/Blind_SQL_Injection)
- [OWASP Cheat Sheet Series — SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [TypeORM — Select using Query Builder](https://typeorm.io/docs/query-builder/select-query-builder/)
- [TypeORM — DataSource API](https://typeorm.io/docs/data-source/data-source-api/)

## 관련 문서

- [[Prepared-Statement-Cache|Prepared Statement Cache]]
- [[ORM|ORM (TypeORM 기준)]]
- [[Security-Headers|Security Headers]]
- [[IDOR|IDOR / Broken Access Control]]
- [[Application-Security|애플리케이션 보안]]
