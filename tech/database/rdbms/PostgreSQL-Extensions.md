---
tags: [database, rdbms, postgresql, extension, postgis, citus, pg-cron, full-text-search]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["PostgreSQL Extension", "PostgreSQL 확장"]
---

# PostgreSQL 확장 생태계

PostgreSQL extension은 타입, 함수, 연산자, 인덱스 operator class, background worker 같은 여러 객체를 하나의 설치와 버전 관리 단위로 묶는다. 기능을 같은 DB 안에 넣어 데이터 이동을 줄일 수 있지만, 코어 기능과 같은 지원 수명이나 운영 특성을 자동으로 얻는 것은 아니다.

## 설치 가능과 설치됨을 구분하기

```sql
-- 서버 파일 시스템에서 설치 가능한 extension
SELECT name, default_version, installed_version
FROM pg_available_extensions;

-- 현재 데이터베이스에 실제 설치된 extension
SELECT extname, extversion
FROM pg_extension;

CREATE EXTENSION postgis;
ALTER EXTENSION postgis UPDATE;
```

`pg_available_extensions`에 보인다고 현재 DB에서 활성화된 것은 아니다. `CREATE EXTENSION`은 서버에 control 파일, SQL script와 필요한 shared library가 이미 있어야 성공한다. extension은 데이터베이스별 객체지만 네이티브 라이브러리와 `shared_preload_libraries` 같은 설정은 서버 배포와 재시작을 요구할 수 있다.

`pg_dump`는 extension 소속 객체를 개별 정의가 아니라 `CREATE EXTENSION`으로 기록한다. 따라서 복원 대상에도 호환되는 extension 파일과 버전이 있어야 한다. 관리형 PostgreSQL에서는 제공자가 허용한 목록, 버전, 권한과 upgrade 순서가 추가 제약이다.

## 도입 체크리스트

1. 해결할 query path와 코어 PostgreSQL만으로 부족한 이유를 적는다.
2. 대상 PostgreSQL 버전, extension 버전, 라이선스와 관리형 서비스 지원을 고정한다.
3. 설치와 update script의 권한, `search_path`, background worker와 재시작 요구를 검토한다.
4. write amplification, WAL, replica, backup/restore, failover와 rollback을 시험한다.
5. 실제 데이터 분포에서 `EXPLAIN (ANALYZE, BUFFERS)`와 운영 지표로 이득을 검증한다.

## PostGIS: 공간 타입과 질의

PostGIS는 평면 좌표계를 다루는 `geometry`와 지구의 타원체 좌표계를 다루는 `geography`를 제공한다.

| 선택 | 거리 단위와 모델 | 적합한 경우 |
|---|---|---|
| `geometry` | 선택한 SRID의 평면 단위 | 지역에 맞는 투영 좌표계를 정했고 다양한 공간 함수와 높은 처리량이 필요할 때 |
| `geography` | 기본 측정 단위가 미터인 타원체 계산 | 전 지구 위도, 경도를 직접 다루고 정확한 지표면 거리가 우선일 때 |

SRID 4326의 `geometry` 거리는 미터가 아니라 각도 단위다. 미터 기반 거리 조건이 필요하면 적합한 투영 좌표계로 변환하거나 `geography`를 사용한다. `ST_MakePoint`의 지리 좌표 입력 순서는 경도, 위도다.

```sql
CREATE INDEX places_geog_gist ON places USING gist (location);

SELECT id, ST_Distance(location, $1::geography) AS distance_m
FROM places
WHERE ST_DWithin(location, $1::geography, 3000)
ORDER BY distance_m
LIMIT 20;
```

반경 검색은 `ST_Distance(...) < radius`만 계산하기보다 공간 인덱스를 사용할 수 있는 `ST_DWithin`으로 후보를 줄인 뒤 거리를 정렬한다. `ST_Within`은 경계만 닿는 경우를 포함하지 않으므로 `ST_CoveredBy`가 업무 규칙에 더 맞는지도 확인한다.

## 데이터베이스 안의 전문 검색

PostgreSQL 기본 전문 검색은 `tsvector`, `tsquery`, GIN으로 시작할 수 있다. ParadeDB의 검색 extension은 BM25 인덱스, tokenizer와 SQL 검색을 PostgreSQL 안에 추가한다. ngram tokenizer는 부분 문자열 검색을 만들 수 있지만 인덱스 크기, 토큰 수와 phrase query 제약을 함께 평가한다.

DB 내 검색은 원본 데이터와 검색 결과의 transaction 경계를 단순화하고 별도 동기화 파이프라인을 줄인다. 반면 독립적인 확장, 장애 격리, 검색 전용 운영 기능이 중요하면 외부 검색 엔진이 더 적합할 수 있다. extension의 SQL과 tokenizer 설정은 릴리스별로 바뀔 수 있으므로 예제를 복사하기 전에 고정한 버전의 공식 문서를 확인한다.

선택 기준은 [[OpenSearch-vs-RDB-Search|OpenSearch와 RDB 검색 비교]]에 정리한다. 의미 기반 검색은 [[pgvector|pgvector]]와 [[Vector-Similarity-Search|벡터 유사도 검색]]을 참고한다.

## pg_cron: DB 내부 스케줄링

`pg_cron`은 PostgreSQL 내부에서 cron 문법 또는 초 단위 interval로 SQL과 procedure를 예약하는 background worker다. 시작 시 `shared_preload_libraries` 설정이 필요하고, 한 클러스터에서 metadata를 두는 데이터베이스는 하나다. 다른 DB의 작업은 `cron.schedule_in_database`로 예약할 수 있다.

```sql
SELECT cron.schedule(
  'refresh-daily-rollup',
  '5 0 * * *',
  $$CALL refresh_daily_rollup()$$
);

SELECT *
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

- 같은 job의 이전 실행이 끝나지 않으면 다음 실행은 병렬 중복 실행되지 않고 대기한다.
- `cron.job_run_details` 기록은 자동 정리되지 않으므로 보존 정책이 필요하다.
- job history는 로컬 실행 기록이다. 실패 알림, 장기 보존, failover 뒤 재처리와 비즈니스 결과 검증을 별도로 설계한다.
- job SQL은 생성한 사용자의 권한으로 실행된다. 광범위한 `trust` 인증을 운영 기본값으로 두지 않는다.

## Citus와 주기적 집계

Citus는 coordinator가 distribution column을 기준으로 행을 shard에 배치하고 worker에서 쿼리를 병렬 실행하도록 PostgreSQL을 확장한다. 큰 테이블의 조인과 필터가 같은 distribution column을 사용하면 colocated shard에서 처리해 network shuffle을 줄일 수 있다. 작은 공통 차원은 모든 worker에 복제하는 reference table 후보가 된다.

분산 테이블의 PK와 `UNIQUE`는 worker 사이를 전부 조회하지 않고도 강제할 수 있도록 distribution column을 포함해야 한다. 상세한 키 선택과 colocation 트레이드오프는 [[Sharding|Sharding]]을 참고한다.

`pg_cron`과 Citus를 조합한 rollup은 시간 범위가 명확하고 재실행 가능한 주기적 집계에 적합하다. 그러나 낮은 지연의 이벤트 처리, event-time watermark, 순서 보장과 복잡한 재처리가 필요하다면 stream processor나 queue를 대체한다고 보지 않는다.

## 관련 문서

- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[Sharding|Sharding]]
- [[OpenSearch-vs-RDB-Search|OpenSearch와 RDB 검색 비교]]
- [[pgvector|pgvector]]
- [[Spatial-Index-MySQL|MySQL 공간 인덱스]]

## 출처

- [PostgreSQL 18 Documentation, Packaging Related Objects into an Extension](https://www.postgresql.org/docs/18/extend-extensions.html)
- [PostgreSQL 18 Documentation, CREATE EXTENSION](https://www.postgresql.org/docs/18/sql-createextension.html)
- [PostGIS, Geometry or Geography](https://postgis.net/documentation/faq/geometry-or-geography/)
- [PostGIS, ST_DWithin](https://postgis.net/docs/ST_DWithin.html)
- [ParadeDB, Create an Index](https://docs.paradedb.com/documentation/indexing/create-index)
- [pg_cron README](https://github.com/citusdata/pg_cron)
- [Citus 13.0 Documentation, Concepts](https://docs.citusdata.com/en/stable/get_started/concepts.html)
- [PostgreSQL 확장 생태계 소개 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440538)
- [Extension 환경과 설치 확인 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440539)
- [PostGIS 공간 타입과 함수 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440540)
- [PostGIS 공간 질의와 GiST - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440541)
- [pg_search 전문 검색 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440542)
- [Citus 분산 처리 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440746)
- [pg_cron 스케줄링 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440747)
- [스케줄러와 분산 집계 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440748)
