---
tags: [database, rdbms, mysql, ddl, migration]
status: done
category: "Data & Storage - RDB"
aliases: ["대용량 스키마 변경", "Schema Migration", "Online DDL"]
---

# 대용량 테이블 스키마 변경

수천만~수억 건 테이블에 `ALTER TABLE`을 그냥 실행하면 **수 시간 락 + 서비스 중단**으로 이어진다. 운영 중 안전하게 스키마를 바꾸는 전략 정리.

## 일반 ALTER가 위험한 이유

전통적 ALTER는 다음을 수행한다:
1. 새 임시 테이블 생성 (변경된 스키마)
2. 원본 데이터를 모두 임시 테이블로 복사
3. 복사 중 들어온 변경 사항을 동기화
4. 원본 ↔ 임시 테이블 swap
5. 원본 삭제

문제: 2~4 단계에서 **테이블 전체 락** 또는 **메타데이터 락**이 걸려 INSERT/UPDATE가 차단. 1억 건 테이블이면 수 시간 락 → 서비스 다운.

## 전략 1: MySQL Online DDL (8.0+)

MySQL 8.0부터 일부 ALTER는 락 없이 동작.

```sql
ALTER TABLE orders
  ADD COLUMN memo VARCHAR(255),
  ALGORITHM=INPLACE, LOCK=NONE;
```

| 알고리즘 | 동작 | 락 |
|---|---|---|
| `INSTANT` | 메타데이터만 변경 (컬럼 추가 등) | 없음, 즉시 완료 |
| `INPLACE` | 테이블 재구성하지만 동시 DML 허용 | 메타데이터 락만 잠시 |
| `COPY` | 전통적 방식 (테이블 풀 카피) | 긴 테이블 락 |

### INSTANT 가능 작업
- 끝에 컬럼 추가
- 컬럼 기본값 변경
- 가상 컬럼 변경
- ENUM·SET 값 끝에 추가

### INPLACE만 가능
- 인덱스 추가/삭제
- 컬럼 이름 변경 (조건부)
- 외래키 추가

### COPY 강제되는 경우 (위험)
- 컬럼 타입 변경 (예: VARCHAR → TEXT)
- 컬럼을 중간 위치에 추가 (`ADD COLUMN ... AFTER`)
- PK 변경
- 문자셋 변경

실행 전 `--explain` 또는 `INFORMATION_SCHEMA.INNODB_ALTER_TABLE_PROGRESS` 확인.

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
- 진행 상황 모니터링·일시정지·취소 가능
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

1억 4천만 행 기준 **40~50분** 소요 (디스크·CPU에 따라). 정기점검 시간에만.

## 전략 비교

| 전략 | 락 시간 | 부하 | 복잡도 | 적용 시점 |
|---|---|---|---|---|
| 일반 ALTER | 수 시간 | 큼 | 단순 | 작은 테이블 |
| Online DDL (INSTANT) | 즉시 | 없음 | 단순 | 컬럼 추가 |
| Online DDL (INPLACE) | 짧음 | 중간 | 단순 | 인덱스 추가 |
| pt-osc | 거의 없음 | 트리거 부하 | 중간 | 구 버전 MySQL |
| gh-ost | 거의 없음 | 작음 | 중간 | 운영 트래픽 큰 환경 |
| 수동 복사 | 전체 다운 | 큼 | 단순 | 정기점검 |

## 사전 체크리스트

1. **테이블 크기·트래픽** — 행 수, peak QPS
2. **변경 종류** — INSTANT 가능한가, COPY가 강제되는가
3. **기존 인덱스/FK** — FK는 별도 처리 필요
4. **복제 환경** — ROW vs STATEMENT, replica lag 영향
5. **롤백 계획** — 중간 실패 시 원상복구
6. **모니터링** — 진행률, 락 대기, 디스크 사용량
7. **시간대** — 트래픽 낮은 시간대

## 흔한 함정

- "INSTANT 될 줄 알았는데 COPY로 떨어짐" — 컬럼을 중간에 추가하거나 타입을 함께 바꾸면 INSTANT 불가. 항상 EXPLAIN으로 확인
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
- [jojoldu — MySQL 대용량 테이블 스키마 변경](https://jojoldu.tistory.com/244)

## 관련 문서
- [[Index|Index 추가의 운영 리스크]]
- [[Replication|Replication]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL — Online DDL 차이]]
