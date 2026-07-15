---
tags: [database, rdbms, mysql, ddl, migration]
status: done
verified_at: 2026-07-15
category: "Data & Storage - RDB"
aliases: ["대용량 스키마 변경", "Schema Migration", "Online DDL"]
---

# 대용량 테이블 스키마 변경

수천만~수억 건 테이블의 `ALTER TABLE`은 변경 종류와 MySQL 버전, 선택된 알고리즘에 따라 메타데이터 변경만으로 끝날 수도 있고 테이블 전체를 재구성할 수도 있다. 큰 테이블에서 `COPY`나 재구성이 선택되거나 메타데이터 락 대기가 길어지면 서비스 지연으로 이어질 수 있으므로 실행 알고리즘을 먼저 고정하고 검증해야 한다.

## 일반 ALTER가 위험한 이유

전통적 ALTER는 다음을 수행한다:
1. 새 임시 테이블 생성 (변경된 스키마)
2. 원본 데이터를 모두 임시 테이블로 복사
3. 원본과 임시 테이블을 교체
4. 원본 삭제

`ALGORITHM=COPY`는 복사 동안 동시 DML을 허용하지 않는다. `INPLACE`가 동시 DML을 허용하더라도 시작과 종료 시 메타데이터 락(MDL)이 필요하고, 장기 트랜잭션이 MDL을 쥐고 있으면 DDL과 뒤따르는 쿼리가 대기할 수 있다.

## 전략 1: MySQL Online DDL (8.0+)

MySQL 8.0의 일부 ALTER는 테이블 복사 없이 실행되거나 작업 중 동시 DML을 허용한다. 다만 모든 DDL은 테이블 정의를 바꾸기 위한 MDL 구간이 있으므로 완전한 무락 작업은 아니다.

```sql
ALTER TABLE orders
  ADD COLUMN memo VARCHAR(255),
  ALGORITHM=INSTANT;
```

| 알고리즘 | 동작 | 락 |
|---|---|---|
| `INSTANT` | 메타데이터만 변경 (컬럼 추가 등) | 데이터 복사 없음, 다만 실행 순간 짧은 메타데이터 락(MDL) 구간은 존재 |
| `INPLACE` | server layer의 테이블 복사 없이 실행, 작업에 따라 내부 재구성 여부가 다름 | 지원되는 작업은 동시 DML 가능, 시작과 종료 시 배타적 MDL + 작업 중 부하 |
| `COPY` | 전통적 방식 (테이블 풀 카피) | 긴 테이블 락 |

INSTANT는 데이터를 복사하지 않을 뿐, 진행 중인 트랜잭션이 있으면 그것이 끝날 때까지 MDL 획득을 기다리며 뒤따르는 쿼리가 잠시 막힐 수 있다. 완전 무락이 아니라 락 구간이 매우 짧은 것이다.

### INSTANT 가능 작업 (MySQL 8.0 계열, 마이너 버전에 따라 확대)
- 컬럼 추가: 8.0.12부터 마지막 위치, 8.0.29부터 조건을 만족하면 임의 위치
- 컬럼 삭제: 8.0.29부터 조건부 지원
- 컬럼 기본값 설정과 제거
- 기존 저장 크기가 바뀌지 않는 ENUM, SET 정의 변경

INSTANT 지원 범위는 마이너 버전마다 다르므로 실제 대상 버전 문서로 확인한다. 한 테이블에 INSTANT 변경을 반복하면 누적 한도에 걸려 이후 변경이 테이블 재빌드로 떨어질 수 있다.

### INPLACE만 가능
- 인덱스 추가/삭제
- 컬럼 이름 변경 (조건부)
- 외래키 추가

### 테이블 재구성이 필요한 대표 작업
- 컬럼 타입 변경 (예: VARCHAR → TEXT)
- 기존 컬럼 순서 변경
- PK 변경
- 문자셋 변경

실행 전 대상 버전의 지원 표를 확인하고 `ALGORITHM=INSTANT` 또는 `ALGORITHM=INPLACE, LOCK=NONE`을 명시해 더 무거운 알고리즘으로 조용히 fallback하지 않게 한다. 재구성 작업의 진행률은 사전에 stage instrument를 켠 뒤 `performance_schema.events_stages_current`의 `WORK_COMPLETED`, `WORK_ESTIMATED`로 확인한다.

## 전략 2: pt-online-schema-change (Percona)

테이블을 직접 변경하지 않고 **트리거로 동기화**하면서 새 테이블에 데이터 복사.

작동 순서:
1. 빈 새 테이블 생성 (`_orders_new`)
2. 새 스키마로 ALTER
3. 원본 → 새 테이블 백그라운드 청크 복사
4. **트리거**로 원본의 INSERT/UPDATE/DELETE를 새 테이블에 동기화
5. 복사 완료 → RENAME으로 swap
6. 원본 백업 또는 삭제

장점: MySQL 5.5/5.6 같은 구 버전에서도 Online DDL처럼 동작.
단점: 트리거 부하, 복제 지연 가능, FK 제약 처리 까다로움.

## 전략 3: gh-ost (GitHub)

pt-osc와 비슷하지만 **트리거 대신 binlog**를 읽어 동기화. 트리거 부하 없음.

장점:
- 원본 테이블에 추가 부하 없음 (트리거 미사용)
- 진행 상황 모니터링, 일시정지, 취소 가능
- 부하에 따라 자동 throttle

단점:
- ROW 기반 복제(binlog_format=ROW) 필요
- 별도 binlog 읽기 인스턴스 권장

## 전략 4: 수동 복사 + Swap (정기점검)

서비스 중단이 허용되는 환경에서.

```
1. FK 제약 해제 (SET FOREIGN_KEY_CHECKS=0)
2. 새 스키마의 빈 테이블 생성 (orders_new)
3. INSERT INTO orders_new SELECT ... FROM orders;
4. RENAME TABLE orders TO orders_old, orders_new TO orders;
5. orders_old 백업 또는 삭제
```

1억 4천만 행 기준 **40~50분** 소요 (디스크, CPU에 따라). 정기점검 시간에만.

## 전략 비교

| 전략 | 락 시간 | 부하 | 복잡도 | 적용 시점 |
|---|---|---|---|---|
| 일반 ALTER | 수 시간 | 큼 | 단순 | 작은 테이블 |
| Online DDL (INSTANT) | 매우 짧음(MDL) | 없음 | 단순 | 컬럼 추가 |
| Online DDL (INPLACE) | 짧음(시작, 종료 MDL) | 중간 | 단순 | 인덱스 추가 |
| pt-osc | 거의 없음 | 트리거 부하 | 중간 | 구 버전 MySQL |
| gh-ost | 거의 없음 | 작음 | 중간 | 운영 트래픽 큰 환경 |
| 수동 복사 | 전체 다운 | 큼 | 단순 | 정기점검 |

## 사전 체크리스트

1. **테이블 크기, 트래픽** — 행 수, peak QPS
2. **변경 종류** — INSTANT 가능한가, COPY가 강제되는가
3. **기존 인덱스/FK** — FK는 별도 처리 필요
4. **복제 환경** — ROW vs STATEMENT, replica lag 영향
5. **롤백 계획** — 중간 실패 시 원상복구
6. **모니터링** — 진행률, 락 대기, 디스크 사용량
7. **시간대** — 트래픽 낮은 시간대

## 흔한 함정

- "INSTANT 될 줄 알았는데 더 무거운 알고리즘으로 실행" — 8.0.29 미만에서 중간 위치 컬럼을 추가하거나, 지원하지 않는 변경을 함께 묶으면 INSTANT가 불가능하다. `ALGORITHM=INSTANT`를 명시해 지원하지 않을 때 즉시 실패하게 한다
- 디스크 공간 부족 — 새 테이블 만들 공간이 원본 크기만큼 필요 (실제로는 1.5~2배 권장)
- replica lag 폭증 — 마스터에서 ALTER 동안 replica가 따라잡지 못함
- FK 제약 처리 — pt-osc는 FK 자식 테이블 처리 옵션 필요
- 트리거 충돌 — 이미 트리거가 있는 테이블에 pt-osc 적용 시 충돌

## 면접 체크포인트

- 전통 ALTER가 운영 환경에서 위험한 이유
- `ALGORITHM=INSTANT`로 가능한 작업과 불가능한 작업
- pt-osc와 gh-ost의 차이 (트리거 vs binlog)
- 컬럼 타입 변경처럼 INSTANT가 불가능할 때 대안
- 대용량 테이블에 인덱스 추가하는 안전한 절차

## 출처
- [MySQL 8.0 Reference Manual — Online DDL Operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)
- [MySQL 8.0 Reference Manual — Online DDL Limitations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-limitations.html)
- [MySQL 8.0 Reference Manual — Monitoring ALTER TABLE Progress](https://dev.mysql.com/doc/refman/8.0/en/monitor-alter-table-performance-schema.html)
- [jojoldu — MySQL 대용량 테이블 스키마 변경](https://jojoldu.tistory.com/244)

## 관련 문서
- [[Index|Index 추가의 운영 리스크]]
- [[Replication|Replication]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL — Online DDL 차이]]
- [[MySQL-Charset-Migration|utf8mb4 마이그레이션 (CONVERT는 COPY 강제 → OSC 도구)]]
