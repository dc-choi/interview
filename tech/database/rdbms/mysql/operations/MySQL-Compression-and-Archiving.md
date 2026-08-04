---
tags: [database, mysql, innodb, compression, archive, retention]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Compression and Archiving", "MySQL 압축과 아카이빙"]
---

# MySQL 압축과 아카이빙

압축은 저장 공간을 줄이는 대신 CPU, page 재구성, buffer pool과 쓰기 비용을 바꾼다. 아카이빙은 오래된 행을 다른 곳으로 옮기는 복사 작업이 아니라 보존, 검색, 복구와 원본 삭제를 끝까지 증명하는 생명주기다.

## InnoDB 압축 방식을 구분한다

`ROW_FORMAT=COMPRESSED` table compression은 table과 모든 index page를 압축한다. `KEY_BLOCK_SIZE`는 압축 page 크기를 지정하며 file-per-table 또는 조건을 만족하는 general tablespace가 필요하다. page compression은 filesystem의 sparse file과 hole punching을 이용하는 별도 기능이다. 이름이 비슷해도 저장 형식, 지원 조건과 관찰 지표가 다르다.

```sql
CREATE TABLE cold_events (
  id BIGINT NOT NULL,
  occurred_at DATETIME(6) NOT NULL,
  payload JSON NOT NULL,
  PRIMARY KEY (id, occurred_at)
) ENGINE=InnoDB
  ROW_FORMAT=COMPRESSED
  KEY_BLOCK_SIZE=8;
```

## 압축은 대표 workload로 판정한다

1. table과 index의 현재 크기, 압축 가능한 값의 중복도와 read/write 비율을 기록한다.
2. production과 같은 row 폭, index, buffer pool과 storage에서 후보 형식을 만든다.
3. disk bytes만 보지 말고 CPU, read/write latency, buffer pool miss, compression failure와 page reorganization을 비교한다.
4. backup, restore, replica와 schema change 시간을 함께 측정한다.
5. cold, read-heavy table부터 canary로 적용하고 rollback 공간을 확보한다.

압축률이나 CPU 비용에 보편적인 수치는 없다. 텍스트가 많아도 이미 압축된 binary payload는 효과가 작을 수 있고, I/O-bound workload는 이득을 보지만 CPU-bound OLTP는 악화될 수 있다.

## 아카이빙 계약

| 항목 | 결정할 질문 |
|---|---|
| 보존 | 업무, 감사, 개인정보 삭제와 legal hold 기간은 각각 얼마인가? |
| 경계 | 어떤 immutable key 또는 시각으로 hot과 cold를 나누는가? |
| 형식 | schema, charset, time zone과 암호화 metadata를 어떻게 보존하는가? |
| 검증 | row count, key range, checksum과 표본 query로 완전성을 어떻게 증명하는가? |
| 접근 | 누가 어떤 SLA로 archive를 조회하고 재적재할 수 있는가? |
| 삭제 | 원본 삭제, replica 반영과 backup 만료를 어떻게 추적하는가? |

안전한 흐름은 `cutoff 고정 -> 일관된 snapshot export -> checksum과 catalog 등록 -> restore drill -> 원본 제거 -> 재검증` 순서다. export와 delete 사이에 새 변경이 가능한 row라면 상태 전이, watermark 또는 별도 archive 대상 table로 집합을 고정한다.

## 원본 제거 전략

- keyset batch delete는 짧은 transaction, durable checkpoint와 replica lag 기반 throttling을 둔다.
- 보존 경계가 partition 경계와 정확히 맞으면 `DROP PARTITION`이 row별 delete보다 효율적일 수 있다.
- partition drop은 DDL이다. metadata lock, backup, replica와 잘못된 경계의 대량 삭제 위험을 검증한다.
- `INFORMATION_SCHEMA.PARTITIONS.TABLE_ROWS`는 InnoDB에서 추정치일 수 있으므로 archive 검증의 유일한 count로 쓰지 않는다.
- 성공한 export가 있다는 이유만으로 복구 가능하다고 보지 않는다. 정기 restore drill과 schema 호환성 검증이 필요하다.

## 출처

- [MySQL 8.4 Reference Manual, InnoDB Table and Page Compression](https://dev.mysql.com/doc/refman/8.4/en/innodb-compression.html)
- [MySQL 8.4 Reference Manual, Creating Compressed Tables](https://dev.mysql.com/doc/refman/8.4/en/innodb-compression-usage.html)
- [MySQL 8.4 Reference Manual, RANGE and LIST Partition Management](https://dev.mysql.com/doc/refman/8.4/en/partitioning-management-range-list.html)
- [인프런, Hong, 압축과 아카이빙](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338559)

## 관련 문서

- [[MySQL-InnoDB-Tuning|InnoDB 튜닝]]
- [[MySQL-Partitioning|MySQL Partitioning]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]
- [[Soft-Delete-and-Data-Lifecycle|Soft delete와 데이터 생명주기]]
- [[MySQL-Backup|MySQL 백업과 복구]]
