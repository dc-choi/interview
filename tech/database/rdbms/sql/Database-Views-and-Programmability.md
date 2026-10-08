---
tags: [database, mysql, oracle, view, stored-procedure, function, trigger]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["Database Views and Programmability", "DB View Procedure Trigger", "뷰와 저장 프로그램"]
---

# View와 데이터베이스 저장 프로그램

View, stored procedure/function과 trigger는 SQL을 DB server에 이름 붙여 저장하고 재사용하는 기능이다. 편의, 권한과 무결성에 유용할 수 있지만 실행 경로, 배포와 부하가 application code보다 덜 보일 수 있으므로 **소유권과 운영 계약**을 명시한다.

## View

일반 view는 query 정의를 저장하고 table처럼 참조하게 한다.

```sql
CREATE VIEW order_summary AS
SELECT o.id,
       o.customer_id,
       SUM(oi.quantity * oi.unit_price) AS total_amount
FROM orders o
JOIN order_item oi ON oi.order_id = o.id
GROUP BY o.id, o.customer_id;
```

MySQL의 일반 view가 결과를 영구 저장하는 것은 아니지만, 실행 중 optimizer가 temporary table materialization을 선택할 수 있다. materialized view와 같은 refreshable snapshot이 필요하면 summary table/ETL을 별도로 설계한다.

### 장점

- 반복 query와 column projection에 안정적인 이름을 준다.
- consumer에게 base table 일부만 노출하는 권한 경계를 만들 수 있다.
- schema 변경 때 호환 view로 migration 기간을 완충할 수 있다.
- report와 분석 용어를 한곳에 정의할 수 있다.

### 경계와 비용

- nested view가 늘면 실제 join/filter와 비용을 추적하기 어렵다.
- view predicate가 항상 base index까지 pushdown된다고 가정하지 않는다.
- base schema 변경은 view invalidation/의미 변경을 만들 수 있다.
- view가 row-level authorization을 자동 제공하지 않는다. `SQL SECURITY`, definer/invoker 권한과 predicate를 검토한다.
- 모든 view가 updateable하지 않다. aggregate, `DISTINCT`, `GROUP BY`, set operation 등 정의에 따라 제한된다.

수정 가능한 view를 API처럼 쓴다면 `WITH CHECK OPTION`으로 수정 뒤 row가 view predicate를 벗어나는 것을 막을지 결정한다. 일반적으로 복잡한 view는 read contract로 사용하고 write는 명시적 command path에 둔다.

### 갱신 가능성과 삽입 가능성은 다르다

다음 조건은 MySQL 8.4 공식 문서로 2026-10-08 확인했다.

- `INFORMATION_SCHEMA.VIEWS.IS_UPDATABLE = 'YES'`만으로 `INSERT` 가능 여부를 판단하지 않는다. 삽입에는 중복 없는 view column 이름, 단순 column 참조, 기본값이 없는 base table column의 포함 같은 추가 조건이 필요하다.
- 예를 들어 base table의 필수 column을 view에서 생략했다면 기존 행의 다른 column을 `UPDATE`할 수 있어도 새 행을 `INSERT`하지 못할 수 있다. 필수 column을 view에 포함하거나 업무상 타당한 기본값을 정의할지 검토한다.
- 단일 base table을 읽는 수정 가능한 view의 `WHERE`는 조회 범위를 정한다. `WITH CHECK OPTION`이 없으면 그 범위를 벗어난 행을 삽입해도 성공하고, 같은 view로 다시 조회하면 보이지 않을 수 있다.
- `WITH CHECK OPTION`은 view 조건을 만족하지 않는 삽입과, 보이던 행을 보이지 않게 만드는 갱신을 막는다. 다른 view 위에 만든 view는 `LOCAL`과 `CASCADED`의 검사 범위도 확인한다. 생략 시 기본값은 `CASCADED`다.

## Stored procedure와 function

Procedure는 `CALL`로 실행하는 statement 묶음이고 IN/OUT parameter를 사용할 수 있다. Stored function은 expression 안에서 scalar 값을 반환한다.

### 적합할 수 있는 경우

- 여러 언어/client가 같은 DB 작업을 공유하며 table 직접 권한을 제한한다.
- DB에 가까운 대량 set operation이 network 왕복을 크게 줄인다.
- vendor 기능을 활용하는 관리/ETL 작업이고 이식성이 요구되지 않는다.
- application 배포와 독립된, 명확히 소유되는 database API가 필요하다.

### 주의점

- application과 DB 양쪽에 business rule이 분산될 수 있다.
- DB CPU/connection은 application server보다 scale-out하기 어렵다.
- IDE, unit test, tracing과 code review 경험이 application code보다 약할 수 있다.
- vendor 문법, privilege, binary logging/replication과 failover 동작을 확인해야 한다.
- `DETERMINISTIC` 선언만으로 MySQL이 함수의 결정성을 검증해 주지는 않는다.

저장 프로그램은 낡아서 무조건 금지하거나 network가 줄어 항상 빠른 기능이 아니다. data locality, 원자성, 변경 주체, DB 병목과 이식성으로 선택한다.

MySQL의 파라미터 모드, 트랜잭션 경계와 프로시저와 함수의 차이는 [[MySQL-Stored-Procedures|MySQL 저장 프로시저]], 함수의 결정성과 정의 규칙은 [[MySQL-Stored-Functions|MySQL 저장 함수]]에 둔다. Oracle의 cursor, exception, package specification/body, definer/invoker rights와 trigger transaction 경계는 [[PL-SQL-Cursors-Routines-and-Triggers|PL/SQL 커서와 저장 프로그램]]에서 분리해 다룬다.

### 변경 배포와 공유의 비용

프로시저에 업무 로직을 두면 애플리케이션 배포 없이 본문만 바꿀 수 있고, 여러 서비스가 같은 로직을 언어별로 다시 구현하지 않아도 된다. 이 두 장점은 운영에서 반대 방향의 비용이 된다.

- 본문 변경은 모든 호출에 즉시 적용된다. 애플리케이션은 rolling 배포나 [[Canary|canary]]로 새 버전을 일부 인스턴스에만 올려 결함의 영향을 일부 트래픽으로 제한하지만, 프로시저 교체는 되돌릴 때까지 전체 트래픽이 영향을 받는다. MySQL은 본문을 바꾸려면 DROP 뒤 CREATE를 해야 해 그 사이의 호출이 실패할 수도 있다([[MySQL-Stored-Procedures#변경과 배포|변경과 배포]]).
- 이름이나 파라미터를 바꾸는 변경은 호출부에 투명하지 않다. 새 이름으로 만들고, 호출부를 배포해 옮기고, 옛 프로시저를 지우는 expand-contract 순서가 필요하다([[Backward-Compatibility|하위 호환]]).
- 여러 서비스가 같은 DB의 프로시저를 직접 호출하면 한 서비스의 과도한 호출이 DB CPU를 소진시켜 모두 함께 느려진다. 공유 로직은 데이터를 소유한 서비스의 API 뒤에 두면 호출자별 [[Rate-Limiting|rate limit]]과 장애 격리를 적용할 수 있다.
- 왕복 감소가 목적이라면 애플리케이션에서도 줄일 수 있다. 서로 의존하지 않고 한 트랜잭션으로 묶을 필요도 없는 쿼리는 별도 연결로 동시에 보내고(한 연결은 한 번에 한 문장만 실행한다), 반복 조회는 TTL 캐시로 DB 부하까지 줄인다([[Cache-Strategies|Cache 전략]]).
- table 권한 대신 프로시저 실행 권한만 주는 경계는 프로시저가 반환하는 데이터만큼만 보호한다. 정의를 바꿀 수 있는 사람은 경계를 넘을 수 있으므로 최소 권한, 민감 컬럼 암호화와 접근 감사를 함께 둔다.
- DB는 데이터를 가진 상태 계층이라 부하가 몰릴 때 애플리케이션 서버처럼 인스턴스를 바로 늘리기 어렵다. 새 replica는 데이터 복제가 끝나야 쓸 수 있으므로 계산이 많은 로직을 프로시저로 옮기면 가장 늘리기 어려운 계층에 부하가 모인다([[Business-Logic-App-vs-DB|비즈니스 로직 위치]]).

## Event scheduler

MySQL Event Scheduler는 server 안에서 정해진 시각이나 주기로 SQL을 실행한다. 작은 maintenance와 summary 작업에는 단순하지만 외부 workflow engine을 자동으로 대체하지 않는다.

- Event definition도 migration과 source control로 관리한다.
- 실행 account, `DEFINER`, time zone과 `event_scheduler` 상태를 확인한다.
- Failover, replica와 여러 writable instance에서 중복 또는 누락되지 않는지 검증한다.
- Job은 idempotent하게 만들고 logical window, last success와 affected rows를 기록한다.
- 외부 API, 긴 loop와 복잡한 retry는 application worker나 scheduler로 분리한다.

## Trigger

Trigger는 table의 INSERT/UPDATE/DELETE에 결합된 암시적 write path다. DB를 직접 수정하는 여러 client에도 적용된다는 강점이 있지만 호출한 SQL만 보고 side effect를 알기 어렵다. 시점과 OLD/NEW, MySQL과 PostgreSQL의 기능 차이, 트리거가 실행되지 않는 변경 경로, 집계 트리거의 동시성 함정과 운영 원칙은 [[Database-Views-and-Programmability-Triggers|데이터베이스 트리거]]로 분리했다.

## 배포와 관측

1. View/routine/trigger 정의를 versioned migration과 source control에 둔다.
2. `DEFINER`, `SQL SECURITY`, 실행 권한과 runtime account를 환경별로 검증한다.
3. dependency graph와 drop/replace 순서를 migration에 명시한다.
4. 실제 호출량, latency, error와 DB CPU/lock을 관측한다.
5. representative dataset으로 execution plan과 result contract를 regression test한다.
6. 제거 전 application, batch, BI와 외부 client 참조를 모두 검색한다.

## NestJS와 TypeORM 경계

- View는 migration으로 만들고 read-only DTO/ViewEntity mapping을 명시한다.
- 핵심 business policy는 test 가능한 domain/application service에 두되 DB constraint와 set operation을 약화시키지 않는다.
- Stored procedure 호출은 parameter binding, transaction 소유자와 result schema를 repository adapter에 캡슐화한다.
- Trigger가 만든 column/event를 ORM entity가 덮어쓰지 않는지 `insert/update` option과 reload 동작을 확인한다.
- DB object 변경도 application API처럼 호환성, rollout과 rollback을 review한다.

## 결정 질문

1. 이 로직의 source of truth와 변경 담당자는 누구인가?
2. 모든 writer에게 강제해야 하는 DB 무결성인가, 한 application의 policy인가?
3. DB에서 실행할 때 줄어드는 data 이동과 늘어나는 DB 부하는 얼마인가?
4. 권한, transaction, retry와 failure visibility가 명확한가?
5. 다른 DBMS/서비스로 이동할 가능성과 vendor lock-in 비용은 허용되는가?

## SELECT 별표의 생성 시점

MySQL view의 `SELECT *`는 생성 시점 column 목록으로 고정된다. base table에 column을 추가해도 자동으로 view에 나타나지 않으며 참조 column 삭제는 view 사용 오류를 낼 수 있다. contract column을 명시하고 schema migration에서 view 재생성/소비자 호환성을 검토한다.

## 출처

- [MySQL 8.4, Updatable and Insertable Views](https://dev.mysql.com/doc/refman/8.4/en/view-updatability.html)
- [MySQL 8.4, The View WITH CHECK OPTION Clause](https://dev.mysql.com/doc/refman/8.4/en/view-check-option.html)
- [MySQL 8.4, Using Views](https://dev.mysql.com/doc/refman/8.4/en/views.html)
- [MySQL 8.4, Using Stored Routines](https://dev.mysql.com/doc/refman/8.4/en/stored-routines.html)
- [MySQL 8.4, Stored Objects](https://dev.mysql.com/doc/refman/8.4/en/stored-objects.html)
- [MySQL 8.4, Using the Event Scheduler](https://dev.mysql.com/doc/refman/8.4/en/event-scheduler.html)
- [Oracle AI Database 26ai, CREATE VIEW](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/CREATE-VIEW.html)
- [인프런, Hong, DB 설계 패턴](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338545)
- [Oracle 11g 강의, View의 개념과 활용](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4667)
- View: [소개](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328781), [DDL](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328782), [장단점](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328783), [문제](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328784), [정리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328785)
- 저장 프로그램: [소개](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328821), [실습](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328822), [함정과 대안](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328823), [정리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328824)
- [MySQL 8.4 Reference Manual, create view](https://dev.mysql.com/doc/refman/8.4/en/create-view.html)
- [인프런, SQL 안티 패턴 - 3 : View에서 SELECT ALL 사용의 문제와 해결](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367632)
- [MySQL 8.4 Reference Manual, ALTER PROCEDURE Statement](https://dev.mysql.com/doc/refman/8.4/en/alter-procedure.html)
- [YouTube, 쉬운코드, stored procedure를 실무에서 쓰기 조심스러운 이유](https://www.youtube.com/watch?v=SOLm-GXFzG8)


## 관련 문서

- [[Database-Views-and-Programmability-Triggers|데이터베이스 트리거]]
- [[MySQL-Stored-Procedures|MySQL 저장 프로시저]]
- [[Business-Logic-App-vs-DB|비즈니스 로직 위치]]
- [[Operational-Data-History-and-Audit|운영 데이터 이력과 감사]]
- [[SQL-Query-Composition|SQL Query 조합]]
- [[Schema-Migration-Large-Table|Schema migration]]
- [[Aggregate-Summary-Table-Patterns|집계 summary table]]
- [[PL-SQL-Cursors-Routines-and-Triggers|PL/SQL 커서와 저장 프로그램]]
