---
tags: [database, rdbms, mysql, schema, security, typeorm]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Data and Access Safety", "MySQL 데이터와 접근 안전성"]
---

# MySQL 데이터와 접근 안전성

테이블 생성과 CRUD 문법을 아는 것만으로 안전한 애플리케이션이 되지는 않는다. 자료형과 제약으로 잘못된 상태를 막고, 변경 범위와 트랜잭션을 통제하며, 애플리케이션 계정에는 필요한 권한만 준다.

## 스키마는 마이그레이션으로 관리한다

Workbench 같은 GUI는 탐색에 유용하지만 운영 스키마의 정본이 될 수 없다. `CREATE`, `ALTER`, `DROP` 변경은 TypeORM migration으로 버전 관리하고 리뷰, 적용, 복구 절차를 함께 둔다. NestJS 운영 설정에서 `synchronize: true`를 사용하지 않는다.

```sql
CREATE TABLE ratings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT UNSIGNED NOT NULL,
  score DECIMAL(2, 1) NOT NULL,
  comment VARCHAR(500) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT chk_ratings_score CHECK (score BETWEEN 0 AND 5),
  CONSTRAINT fk_ratings_business
    FOREIGN KEY (business_id) REFERENCES businesses(id)
);
```

- PK는 행의 식별 기준이며 테이블마다 하나의 PK 제약을 둔다. 여러 컬럼으로 구성할 수 있다.
- UNIQUE 제약은 후보 키를 표현한다. MySQL에서는 nullable UNIQUE 컬럼에 NULL이 여러 번 들어갈 수 있으므로 활성 행 유일성 같은 규칙은 별도로 설계한다.
- FK는 참조 존재성과 referential action을 강제한다. 자세한 조건은 [[Foreign-Key-Integrity|외래 키와 참조 무결성]]에 둔다.
- `DEFAULT`는 컬럼을 생략했을 때 적용된다. 명시적 NULL을 자동으로 기본값으로 바꿔 주는 규칙이 아니다.
- `AUTO_INCREMENT` 값에는 gap이 생길 수 있으므로 연속 번호나 업무 순서를 뜻하게 하지 않는다.

## 자료형은 도메인 의미로 고른다

| 요구 | 기본 후보 | 확인할 점 |
|---|---|---|
| 식별자와 개수 | `INT`, `BIGINT` | 최대 범위, signed 여부, 외래 키 타입 일치 |
| 금액과 정확한 비율 | `DECIMAL(p, s)` | 전체 자릿수와 소수 자릿수 |
| 측정값과 근사 계산 | `FLOAT`, `DOUBLE` | 등가 비교와 반올림 오차 |
| 제한 길이 문자열 | `VARCHAR(n)` | 문자셋, 최대 길이, 인덱스 폭 |
| 고정 의미 코드 | `CHAR(n)` 또는 제약 있는 `VARCHAR` | 저장 의미와 padding 규칙 |
| 긴 본문 | `TEXT` 계열 | 조회 빈도, 인덱싱, 행 크기 |
| 달력 날짜와 현지 시각 | `DATE`, `DATETIME` | time zone 변환을 하지 않음 |
| 절대 시점 | `TIMESTAMP` 또는 UTC `DATETIME` | 세션 time zone, 표현 범위, 직렬화 정책 |

`DECIMAL`은 exact-value 타입이고 `FLOAT`, `DOUBLE`은 approximate-value 타입이다. `CHAR`가 `VARCHAR`보다 항상 빠르다는 규칙은 없으며 실제 행 폭, collation, 인덱스와 쿼리로 판단한다. `TIMESTAMP`는 저장과 조회에서 UTC와 세션 time zone 사이 변환이 일어나지만 `DATETIME`은 입력한 필드 값을 time zone 변환 없이 저장한다.

INSERT에서 생략한 컬럼은 명시적 기본값, NULL 허용 여부와 SQL mode에 따라 기본값, NULL 또는 오류가 된다. 타입이 다르면 언제나 오류가 나는 것도 아니다. 암묵 변환과 값 손실을 줄이기 위해 strict SQL mode를 유지하고 애플리케이션 입력을 검증한다.

## UPDATE와 DELETE 안전 절차

대량 변경은 다음 순서로 범위를 증명한다.

1. 같은 조건의 `SELECT`와 `COUNT(*)`로 대상 PK를 확인한다.
2. 예상 행 수, lock 범위와 실행 계획을 검토한다.
3. 트랜잭션 가능한 DML은 `START TRANSACTION` 안에서 실행한다.
4. affected rows와 표본을 다시 확인한 뒤 `COMMIT`한다.
5. 예상과 다르면 `ROLLBACK`하고 조건을 수정한다.

`WHERE` 없는 UPDATE와 DELETE가 문법 오류인 것은 아니지만 전체 행 변경이라는 의도가 검증된 작업에만 사용한다. Workbench safe updates는 해제해야 하는 방해물이 아니라 실수 범위를 줄이는 보조 방어선이다.

`TRUNCATE TABLE`은 모든 행을 지우는 DML의 단축형이 아니다. MySQL에서는 implicit commit을 일으켜 rollback할 수 없고, `AUTO_INCREMENT`를 시작값으로 되돌리며, 다른 테이블의 FK가 참조하면 실패할 수 있다. DDL도 implicit commit과 metadata lock을 일으킬 수 있으므로 일반 DML과 같은 복구 기대를 두지 않는다.

## 인덱스와 스토리지 엔진

인덱스는 특정 조건, 정렬과 조인의 탐색 비용을 줄이는 대신 쓰기와 저장 비용을 추가한다. 높은 cardinality, 큰 테이블, 자주 쓰는 컬럼 중 하나만으로 생성하지 않고 실제 쿼리와 [[Execution-Plan|실행 계획]]으로 결정한다. 복합 인덱스의 컬럼 순서는 equality, range, 정렬과 covering 요구를 함께 본다.

InnoDB는 MySQL의 범용 기본 스토리지 엔진이며 트랜잭션, crash recovery와 row-level locking을 제공한다. 읽기가 많다는 이유만으로 MyISAM을 선택하는 규칙은 현재 운영 기준이 아니다. 내부 Adaptive Hash Index는 사용자가 만드는 일반 hash index와 구분한다.

## 뷰는 저장된 쿼리다

일반 MySQL view는 결과를 복사해 저장하는 테이블이 아니라 호출 시 결과를 만드는 저장된 SELECT 정의다. 복잡한 조회를 캡슐화하고 base table 대신 일부 컬럼과 행만 노출하는 권한 경계로 쓸 수 있다.

- updatable 여부는 집계 함수 유무만으로 판단하지 않는다. view 행과 base table 행의 일대일 대응, 처리 알고리즘과 전체 제한을 확인한다.
- `SQL SECURITY DEFINER`와 `INVOKER` 중 누구의 권한으로 base object를 검사할지 명시한다.
- view에 SELECT를 주면서 base table 권한을 그대로 남겨 두면 정보 제한 효과가 없다.
- 스키마 변경으로 view가 무효화될 수 있으므로 migration과 배포 검증에 포함한다.

## 계정과 권한

애플리케이션은 root 계정으로 접속하지 않는다. 환경과 서비스별 계정을 분리하고 필요한 schema, table과 동작에만 `GRANT`한다. 읽기 전용 작업과 쓰기 작업을 분리할 수 있으면 계정이나 role도 분리한다.

- `'user'@'host'`의 host를 명시한다. 넓은 `%` 허용은 공격 표면을 키우며 MySQL 8.4에서 host wildcard 동작도 deprecated 상태다.
- 원격 연결에는 TLS를 요구하고 네트워크 방화벽에서도 접근 대상을 제한한다.
- 비밀번호는 코드와 migration에 넣지 않고 secret store에서 주입한다.
- `GRANT ALL`은 개발 편의의 기본값이 아니다. 주기적으로 실제 권한과 사용량을 감사하고 불필요한 권한은 `REVOKE`한다.
- runtime read/write, migration, backup과 monitoring 계정을 나누면 침해와 실수의 blast radius를 줄일 수 있다.
- `CREATE USER`, `GRANT`, `REVOKE` 같은 account management statement는 즉시 반영되므로 뒤에 `FLUSH PRIVILEGES`를 붙일 필요가 없다. grant table을 직접 수정하는 방식은 피한다.
- `SHOW GRANTS FOR 'user'@'host'` 결과와 실제 접근 경로를 정기적으로 대조하고 퇴사, 서비스 종료와 secret rotation 시점을 계정 생명주기에 포함한다.

## NestJS와 TypeORM 애플리케이션 경계

현재 구현 기준은 `@nestjs/typeorm`, TypeORM과 `mysql2`다. DataSource가 관리하는 pool을 재사용하고, 요청마다 새 연결을 만들지 않는다. 여러 DML이 하나의 불변식을 이루면 [[NestJS-Database#트랜잭션|QueryRunner 또는 transaction callback]]의 같은 manager로 묶는다.

좋아요 수처럼 동시 요청이 덮어쓰면 안 되는 값은 읽고 계산한 뒤 저장하지 말고 DB 안에서 원자적으로 증가시킨다.

```typescript
const result = await menuRepository
  .createQueryBuilder()
  .update(Menu)
  .set({ likes: () => 'likes + 1' })
  .where('id = :id', { id: menuId })
  .execute();

if (result.affected !== 1) {
  throw new NotFoundException();
}
```

필터 값은 바인딩하고 동적 정렬 컬럼은 허용 목록으로 제한한다. HTTP에서는 GET을 조회, POST를 생성, PUT이나 PATCH를 변경, DELETE를 삭제에 사용한다. `router.push`는 HTTP method가 아니다. 서버 렌더링과 클라이언트 렌더링은 요구사항에 따른 선택이며 어느 한쪽이 과거 방식이라는 이유로 배제하지 않는다.

배포 단계에는 migration 적용 순서, DB secret, TLS, pool 상한, health check, backup과 복구 연습을 포함한다. 특정 PaaS의 과거 무료 플랜이나 add-on 절차를 영속적인 설계로 취급하지 않는다.

## 관련 문서

- [[Primary-Key-Strategy|PK 생성 전략]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[Index|인덱스]]
- [[Transactions|트랜잭션]]
- [[Schema-Migration-Large-Table|대용량 스키마 변경]]
- [[NestJS-Database|NestJS와 TypeORM 데이터베이스 통합]]

## 출처

- [MySQL 8.4 Reference Manual, Data Types](https://dev.mysql.com/doc/refman/8.4/en/data-types.html)
- [MySQL 8.4 Reference Manual, CREATE TABLE](https://dev.mysql.com/doc/refman/8.4/en/create-table.html)
- [MySQL 8.4 Reference Manual, DATE, DATETIME and TIMESTAMP](https://dev.mysql.com/doc/refman/8.4/en/datetime.html)
- [MySQL 8.4 Reference Manual, Floating-Point Types](https://dev.mysql.com/doc/refman/8.4/en/floating-point-types.html)
- [MySQL 8.4 Reference Manual, Data Type Default Values](https://dev.mysql.com/doc/refman/8.4/en/data-type-defaults.html)
- [MySQL 8.4 Reference Manual, INSERT Statement](https://dev.mysql.com/doc/refman/8.4/en/insert.html)
- [MySQL 8.4 Reference Manual, TRUNCATE TABLE](https://dev.mysql.com/doc/refman/8.4/en/truncate-table.html)
- [MySQL 8.4 Reference Manual, Using Views](https://dev.mysql.com/doc/refman/8.4/en/views.html)
- [MySQL 8.4 Reference Manual, CREATE VIEW](https://dev.mysql.com/doc/refman/8.4/en/create-view.html)
- [MySQL 8.4 Reference Manual, CREATE USER](https://dev.mysql.com/doc/refman/8.4/en/create-user.html)
- [MySQL 8.4 Reference Manual, Specifying Account Names](https://dev.mysql.com/doc/refman/8.4/en/account-names.html)
- [MySQL 8.4 Reference Manual, When Privilege Changes Take Effect](https://dev.mysql.com/doc/refman/8.4/en/privilege-changes.html)
- [MySQL 8.4 Reference Manual, Storage Engines](https://dev.mysql.com/doc/refman/8.4/en/storage-engines.html)
- [MySQL 8.4 Reference Manual, Introduction to InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-introduction.html)
- [MySQL 8.4 Reference Manual, Statements That Cause an Implicit Commit](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)
- [NestJS, Database](https://docs.nestjs.com/techniques/database)
- [TypeORM, Select using Query Builder](https://typeorm.io/docs/query-builder/select-query-builder/)
- [Heroku, Free Resources Are No Longer Available](https://devcenter.heroku.com/changelog-items/2502)
- [인프런, 얄팍한 코딩사전, MySQL 설치와 Workbench](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86854)
- [인프런, 얄팍한 코딩사전, 테이블 생성과 INSERT](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86855)
- [인프런, 얄팍한 코딩사전, MySQL 자료형](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86856)
- [인프런, 얄팍한 코딩사전, UPDATE와 DELETE](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86857)
- [인프런, 얄팍한 코딩사전, 기본키, 고유키와 외래키](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86860)
- [인프런, 얄팍한 코딩사전, 뷰](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86861)
- [인프런, 얄팍한 코딩사전, 인덱스](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86862)
- [인프런, 얄팍한 코딩사전, 트랜잭션](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86863)
- [인프런, 얄팍한 코딩사전, 사용자와 권한](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86864)
- [인프런, 얄팍한 코딩사전, Node.js와 MySQL 연결](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86865)
- [인프런, 얄팍한 코딩사전, 필터와 정렬](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86866)
- [인프런, 얄팍한 코딩사전, 좋아요와 댓글](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86867)
- [인프런, 얄팍한 코딩사전, Heroku 배포](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86868)
- [인프런, Hong, 접근관리](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338541)
