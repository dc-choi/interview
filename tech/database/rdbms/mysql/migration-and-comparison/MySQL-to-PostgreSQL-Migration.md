---
tags: [database, rdbms, mysql, postgresql, migration, dms, runbook]
status: done
verified_at: 2026-08-28
category: "Database - RDBMS"
aliases: ["MySQL to PostgreSQL", "MySQL PostgreSQL 마이그레이션", "이기종 마이그레이션", "DMS 이기종"]
---

# MySQL → PostgreSQL 이기종 마이그레이션

엔진이 다르면 네이티브 물리 복제를 직접 사용할 수 없다. AWS DMS와 DMS Schema Conversion은 한 선택지이며, dump/load, ETL, 애플리케이션 동기화처럼 다른 절차도 가능하다. 실제 일정은 데이터 전송보다 **스키마, 쿼리, 앱 코드의 차이**에 좌우되므로 PostgreSQL용 앱 포팅으로 보고 잡는다. 컷오버 일반 기계는 [[RDS-Zero-Downtime-Migration]], DMS 메커니즘은 [[DMS]], 엔진 내부 비교는 [[MySQL-vs-PostgreSQL]].

## 0. 평가 (Assessment)

DMS를 선택한다면 AWS SCT 엔진 기반 관리형 기능인 **DMS Schema Conversion**으로 변환 평가 리포트를 먼저 뽑는다. 다운로드형 AWS SCT와 같은 이름의 단순 개명이 아니라 별도 사용 경로이므로 현재 지원 범위를 확인한다. 어떤 경로든 앱에서 쓰는 MySQL 전용 쿼리와 함수 인벤토리를 함께 정리한다.

## 1. 스키마 변환 (함정 대부분이 여기)

자동 변환되더라도 아래 타입/문법은 수동 확인이 필요하다. PostgreSQL에 대응이 없거나 동작이 다르다.

| MySQL | PostgreSQL | 주의점 |
|---|---|---|
| `TINYINT(1)` | `BOOLEAN` 또는 `SMALLINT` | `(1)`은 표시 폭이라 저장 범위를 제한하지 않는다. `NULL`, `0`, `1`, 그 밖의 값을 조사하고 boolean으로 정규화할지 결정 |
| `INT UNSIGNED` | `BIGINT` | PG는 unsigned 없음 → 범위 초과 방지로 한 단계 키움 |
| `AUTO_INCREMENT` | `GENERATED AS IDENTITY` / `SERIAL` | 시퀀스로 바뀜, 컷오버 때 보정 필수 |
| `DATETIME` | `TIMESTAMP` | 타임존 처리 다름 |
| `TIMESTAMP` | `TIMESTAMPTZ` | TZ 인식 차이 |
| `ENUM(...)` | enum 타입 또는 `VARCHAR + CHECK` | 직접 매핑 없음 |
| `JSON` | `JSONB` | PG는 JSONB가 더 강력 |
| `'0000-00-00'` | (불가) | PG는 제로 날짜 거부 → 사전 정리 |
| `` `id` ``(백틱) | `"id"`(큰따옴표) | PG는 식별자 소문자 폴딩 |
| `ON UPDATE CURRENT_TIMESTAMP` | (불가) | 트리거로 직접 구현 |

특히 **제로 날짜(`0000-00-00`)** 는 MySQL에선 흔하지만 PG는 아예 못 받는다. 마이그레이션 전에 소스에서 정리한다.

```sql
-- 소스 MySQL: 제로 날짜를 NULL로 (예시)
UPDATE orders SET delivered_at = NULL WHERE delivered_at = '0000-00-00 00:00:00';
```

DMS full load를 쓴다면 변환, 수정한 스키마를 **타깃 PG에 먼저 생성**해 데이터 적재만 맡길 수 있다. 대상 테이블 생성 여부는 선택한 DMS target table preparation 모드에 따라 결정한다.

## 2. 앱 코드 마이그레이션 (보통 제일 오래 걸림)

이 vault의 현재 기준은 `@nestjs/typeorm`이다. 환경별 TypeORM `DataSource`, versioned migration, Entity의 타입과 식별자 매핑, `QueryRunner` 또는 transaction callback의 동작을 PostgreSQL 스테이징에서 먼저 검증한다. 기존 Prisma 서비스는 provider와 생성 client를 바꾸는 작업이 남을 수 있지만, 새 마이그레이션 절차의 기본 표현은 TypeORM으로 둔다.

QueryBuilder 또는 raw 쿼리와 MySQL 전용 함수는 직접 고친다.

- `IFNULL` → `COALESCE`
- `GROUP_CONCAT` → `string_agg`
- `DATE_FORMAT` → `to_char`
- `LAST_INSERT_ID()` → `RETURNING` 절
- `LIKE` 대소문자 — MySQL은 기본 무시, PG의 `LIKE`는 구분 → 필요하면 `ILIKE`
- 백틱 → 큰따옴표(또는 따옴표 없이 소문자)

**스테이징 PG 복사본에서 충분히 테스트한 뒤** 간다. 여기가 부실하면 컷오버 후 런타임 에러 폭탄이다.

## 3. DMS Full Load와 CDC 설정 (DMS를 선택한 경우)

- Full load만 수행하면 CDC용 binary log 설정과 replication 권한이 필요하지 않다.
- Full load + CDC면 소스 MySQL의 binary logging, `binlog_format=ROW`, `binlog_row_image=FULL`, DMS가 읽을 수 있는 보존 기간과 CDC 권한을 준비한다. MySQL 8.0 이상에서는 `binlog_expire_logs_seconds`를 사용한다.
- `binlog_format` 변경은 새 세션에만 적용되므로, 기존 DML 세션을 재시작하거나 다시 연결한 뒤 실제 binary log 형식을 확인한다.
- 타깃(PostgreSQL): 1단계에서 스키마 선생성
- DMS 복제 인스턴스 + 소스/타깃 엔드포인트 등록
- 태스크: Migration type = "Migrate existing data and replicate ongoing changes"(full load + CDC), Target table prep = "Do nothing"(스키마 이미 있음) 또는 "Truncate"
- **로드 속도 팁**: DMS는 table 순서를 보장하지 않으므로 full load 전에 타깃의 보조 인덱스, FK와 DML trigger를 끄거나 제거해 load-order 실패와 부가 비용을 피할 수 있다. 이 동안 제약 검사는 미뤄질 뿐이므로 로드 후 orphan과 duplicate를 검사하고 모든 제약과 trigger의 재생성, 활성화 성공을 확인
- **LOB**: 큰 BLOB/TEXT가 있으면 LOB 모드와 최대 크기를 지정(안 맞추면 잘림)

## 4. CDC 동기화 + 검증

- full load + CDC task는 full load와 cached change 적용 뒤 멈추도록 구성하고, CDC DML에 필요한 secondary index를 만든 뒤 재개한다. FK와 DML trigger는 CDC 적용을 방해하지 않도록 최종 쓰기 정지 후 검증, 활성화하는 별도 gate로 둔다
- DMS data validation으로 행 단위 소스/타깃 비교
- PK와 UNIQUE 중복, FK orphan을 별도 검사하고 PK, UNIQUE, CHECK, FK와 trigger의 재생성, 활성화 성공을 컷오버 gate로 기록
- CDC lag 모니터링(CloudWatch `CDCLatencySource` / `CDCLatencyTarget`)
- 앱을 PG 스테이징에 붙여 기능 테스트 병행

## 5. 컷오버

```
1. 소스 read-only (쓰기 정지)            ← 다운타임 시작
2. CDC lag 0 도달 대기
3. DMS 검증 + 행 수 + duplicate/orphan 확인
4. 시퀀스 보정 ★ DMS는 시퀀스 현재값 안 옮김
5. 보조 인덱스와 모든 constraint/trigger의 생성, 활성 상태 확인
6. 앱을 PG 빌드로 배포 + 엔드포인트 전환
7. 쓰기 재개                              ← 다운타임 끝
```

```sql
-- 모든 시퀀스를 실제 max+1로 (안 하면 즉시 PK 충돌)
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
-- 테이블 많으면 information_schema.sequences 돌며 스크립트로 일괄 처리
```

## 6. 롤백 관점

이기종은 스키마와 타입 변환 때문에 롤백이 어렵지만, PG→MySQL CDC가 원천적으로 불가능한 것은 아니다. 컷오버 전에 변환과 loopback 방지를 포함한 reverse replication을 스테이징에서 검증해 두거나, 문제 시 쓰기를 멈추고 PG 신규 데이터를 reconciliation한 뒤 MySQL로 돌아가는 절차를 선택한다. 둘 다 준비하지 않았다면 데이터를 포기하기보다 forward fix를 우선한다. 소스 MySQL은 복구 기간 동안 보존하고, 선택한 롤백 경로는 반드시 사전 리허설한다.

## 스토리지 축소와의 차이

- **스토리지 축소(동종)**: 데이터 변환 범위는 작지만 복제 토폴로지, 권한과 컷오버를 비운영 환경에서 먼저 검증해야 하는 후보 절차(→ [[RDS-Storage-Shrink-Runbook]]).
- **MySQL→PG(이기종)**: 선택한 데이터 이동 경로와 스키마 변환, 앱 포팅이 진짜 일. 리스크 높고 롤백 어려움. DMS 경로라면 시퀀스 보정이 컷오버의 핵심이다. 사실상 앱 프로젝트로 일정 잡아야 한다.

컷오버에서는 시퀀스/AUTO_INCREMENT, endpoint와 connection, data validation, constraint와 trigger 복구를 각각 독립 gate로 확인한다.

## 면접 체크포인트

- 이기종 마이그레이션이 "DB 옮기기"가 아니라 "앱 포팅"인 이유(타입/함수/동작 차이)
- 수동 변환이 필요한 대표 타입: `TINYINT(1)`은 값 분포를 확인한 뒤 BOOLEAN 또는 SMALLINT, UNSIGNED→BIGINT, ENUM, 제로 날짜, ON UPDATE
- MySQL 전용 함수의 PG 대응(IFNULL→COALESCE, GROUP_CONCAT→string_agg 등)과 LIKE/ILIKE 대소문자
- DMS가 시퀀스 현재값을 안 옮겨 컷오버 때 setval 보정이 필수인 이유
- full load 전 보조 인덱스/FK/trigger를 끄는 이유, 검증이 미뤄지는 위험과 LOB 모드
- 이기종 롤백이 어려운 이유와 스테이징 검증의 중요성

## 관련 문서

- [[RDS-Zero-Downtime-Migration|무중단(near-zero) 마이그레이션]]
- [[DMS|AWS Database Migration Service (Full Load + CDC, SCT)]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL (엔진 내부 비교)]]
- [[RDS-Storage-Shrink-Runbook|RDS 스토리지 축소 런북 (동종)]]
- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]

## 출처

- [AWS DMS — Sources for MySQL, Targets for PostgreSQL](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html)
- [AWS DMS, Using a PostgreSQL database as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html)
- [AWS DMS, Creating tasks for ongoing replication](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html)
- [AWS DMS Schema Conversion](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_SchemaConversion.html)
- [AWS Schema Conversion Tool 시작하기](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_GettingStarted.SCT.html)
- [AWS DMS, Best practices](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_BestPractices.html)
- [AWS DMS, Data validation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html)
- [MySQL 8.4 Reference Manual, Numeric Data Type Syntax](https://dev.mysql.com/doc/refman/8.4/en/numeric-type-syntax.html)
- [PostgreSQL 18 Documentation, Boolean Type](https://www.postgresql.org/docs/current/datatype-boolean.html)
- [TypeORM, Migrations](https://typeorm.io/docs/advanced-topics/migrations/)
