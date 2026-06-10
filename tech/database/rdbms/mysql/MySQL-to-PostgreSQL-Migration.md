---
tags: [database, rdbms, mysql, postgresql, migration, dms, runbook]
status: done
category: "Data & Storage - RDB"
aliases: ["MySQL to PostgreSQL", "MySQL PostgreSQL 마이그레이션", "이기종 마이그레이션", "DMS 이기종"]
---

# MySQL → PostgreSQL 이기종 마이그레이션

엔진이 다르면 네이티브 복제가 불가능해 **DMS + 스키마 변환**이 필수다. 그런데 진짜 일은 데이터 전송이 아니라 **스키마, 쿼리, 앱 코드의 차이**에서 나온다. "DB 옮기기"보다 **"앱을 PostgreSQL용으로 포팅하기"** 에 가깝다고 보고 일정을 잡는다. 컷오버 일반 기계는 [[RDS-Zero-Downtime-Migration]], DMS 메커니즘은 [[DMS]], 엔진 내부 비교는 [[MySQL-vs-PostgreSQL]].

## 0. 평가 (Assessment)

**DMS Schema Conversion**(구 AWS SCT)으로 변환 평가 리포트를 먼저 뽑는다. 무엇이 자동 변환되고 무엇이 수동인지 나온다. 앱에서 쓰는 MySQL 전용 쿼리/함수 인벤토리도 함께 정리한다.

## 1. 스키마 변환 (함정 대부분이 여기)

자동 변환되더라도 아래 타입/문법은 수동 확인이 필요하다. PostgreSQL에 대응이 없거나 동작이 다르다.

| MySQL | PostgreSQL | 주의점 |
|---|---|---|
| `TINYINT(1)` | `BOOLEAN` | 1/0 ↔ true/false |
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

변환·수정한 스키마를 **타깃 PG에 먼저 생성**해 둔다(DMS가 데이터만 적재하게).

## 2. 앱 코드 마이그레이션 (보통 제일 오래 걸림)

Prisma는 provider만 바꾸면 ORM 레벨은 상당 부분 흡수된다.

```
// schema.prisma
datasource db { provider = "postgresql"  url = env("DATABASE_URL") }
# DATABASE_URL="postgresql://user:pw@host:5432/mydb?schema=public" → prisma generate 다시
```

하지만 raw 쿼리(`$queryRaw` 등)와 MySQL 전용 함수는 직접 고친다.

- `IFNULL` → `COALESCE`
- `GROUP_CONCAT` → `string_agg`
- `DATE_FORMAT` → `to_char`
- `LAST_INSERT_ID()` → `RETURNING` 절
- `LIKE` 대소문자 — MySQL은 기본 무시, PG의 `LIKE`는 구분 → 필요하면 `ILIKE`
- 백틱 → 큰따옴표(또는 따옴표 없이 소문자)

**스테이징 PG 복사본에서 충분히 테스트한 뒤** 간다. 여기가 부실하면 컷오버 후 런타임 에러 폭탄이다.

## 3. DMS Full Load 설정

- 소스(MySQL): `binlog_format=ROW` + binlog 보존(시나리오 공통)
- 타깃(PostgreSQL): 1단계에서 스키마 선생성
- DMS 복제 인스턴스 + 소스/타깃 엔드포인트 등록
- 태스크: Migration type = "Migrate existing data and replicate ongoing changes"(full load + CDC), Target table prep = "Do nothing"(스키마 이미 있음) 또는 "Truncate"
- **로드 속도 팁**: full load 전에 타깃의 보조 인덱스/FK/트리거를 끄거나 제거하고, 로드 후 다시 생성(속도 + 제약 위반 방지)
- **LOB**: 큰 BLOB/TEXT가 있으면 LOB 모드와 최대 크기를 지정(안 맞추면 잘림)

## 4. CDC 동기화 + 검증

- DMS data validation으로 행 단위 소스/타깃 비교
- CDC lag 모니터링(CloudWatch `CDCLatencySource` / `CDCLatencyTarget`)
- 앱을 PG 스테이징에 붙여 기능 테스트 병행

## 5. 컷오버

```
1. 소스 read-only (쓰기 정지)            ← 다운타임 시작
2. CDC lag 0 도달 대기
3. DMS 검증 + 행 수 확인
4. 시퀀스 보정 ★ DMS는 시퀀스 현재값 안 옮김
5. 보조 인덱스/FK가 다 생성됐는지 확인
6. 앱을 PG 빌드로 배포 + 엔드포인트 전환
7. 쓰기 재개                              ← 다운타임 끝
```

```sql
-- 모든 시퀀스를 실제 max+1로 (안 하면 즉시 PK 충돌)
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
-- 테이블 많으면 information_schema.sequences 돌며 스크립트로 일괄 처리
```

## 6. 롤백 관점

이기종은 롤백이 매우 어렵다. PG→MySQL 역방향 CDC는 사실상 비현실적이라, 컷오버 후 문제가 생기면 보통 "MySQL로 되돌리고 그동안 PG에 쌓인 데이터는 포기" 외엔 답이 없다. 그래서 **스테이징에서 앱까지 완전히 검증**하고 컷오버 직후 빠르게 확인하는 게 유일한 안전장치다. 소스 MySQL은 한동안 살려둔다.

## 스토리지 축소와의 차이

- **스토리지 축소(동종)**: 네이티브 복제로 깔끔, 리스크 낮음, AUTO_INCREMENT 보정만 조심. 인프라 작업(→ [[RDS-Storage-Shrink-Runbook]]).
- **MySQL→PG(이기종)**: DMS + 스키마 변환 + 앱 포팅이 진짜 일. 리스크 높고 롤백 어려움. 시퀀스 보정이 컷오버의 핵심. 사실상 앱 프로젝트로 일정 잡아야 함.

둘 다 컷오버 사고는 결국 **시퀀스/AUTO_INCREMENT 보정 누락**과 **엔드포인트/커넥션 전환**에서 난다.

## 면접 체크포인트

- 이기종 마이그레이션이 "DB 옮기기"가 아니라 "앱 포팅"인 이유(타입/함수/동작 차이)
- 수동 변환이 필요한 대표 타입: TINYINT(1)→BOOLEAN, UNSIGNED→BIGINT, ENUM, 제로 날짜, ON UPDATE
- MySQL 전용 함수의 PG 대응(IFNULL→COALESCE, GROUP_CONCAT→string_agg 등)과 LIKE/ILIKE 대소문자
- DMS가 시퀀스 현재값을 안 옮겨 컷오버 때 setval 보정이 필수인 이유
- full load 전 인덱스/FK를 끄는 이유와 LOB 모드
- 이기종 롤백이 어려운 이유와 스테이징 검증의 중요성

## 관련 문서

- [[RDS-Zero-Downtime-Migration|무중단(near-zero) 마이그레이션]]
- [[DMS|AWS Database Migration Service (Full Load + CDC, SCT)]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL (엔진 내부 비교)]]
- [[RDS-Storage-Shrink-Runbook|RDS 스토리지 축소 런북 (동종)]]
- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]

## 출처

- [AWS DMS — Sources for MySQL, Targets for PostgreSQL](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html)
- [AWS DMS Schema Conversion](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_SchemaConversion.html)
