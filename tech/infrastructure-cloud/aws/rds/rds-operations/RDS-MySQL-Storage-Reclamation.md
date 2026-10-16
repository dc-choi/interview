---
tags: [aws, rds, mysql, storage, operations]
status: done
verified_at: 2026-10-14
category: "Infrastructure - AWS"
aliases: ["RDS MySQL Storage Reclamation", "RDS MySQL 디스크 공간 회수", "RDS MySQL Storage Full", "RDS MySQL 스토리지 부족 진단"]
---

# RDS for MySQL 공간 사용 진단과 회수

행을 지운 결과, 테이블 파일의 축소, RDS 할당 스토리지의 축소는 서로 다르다. 여유 공간 부족을 발견하면 사용량의 원인부터 나눈다.

## 원인별 확인

| 대상 | 확인할 근거 | 다음 판단 |
|---|---|---|
| 인스턴스 전체 | CloudWatch `FreeStorageSpace`의 추세 | 증가 속도와 남은 대응 시간을 확인 |
| 테이블과 인덱스 | `information_schema.tables`의 `data_length`, `index_length`, `data_free` | 논리 데이터 크기와 테이블스페이스 내부 여유 공간을 구분 |
| 임시 테이블스페이스 | `INFORMATION_SCHEMA.FILES`의 `innodb_temporary`, `INNODB_SESSION_TEMP_TABLESPACES` | 활성 세션이 쥔 공간인지, 재시작해야 줄어드는 `ibtmp1`인지 구분 |
| 시스템 테이블스페이스 | `INFORMATION_SCHEMA.FILES`의 `innodb_system`(`ibdata1`) | 줄일 수 없으므로 새 인스턴스로 옮길지 판단 |
| 바이너리 로그 | `BinLogDiskUsage`, `SHOW BINARY LOGS`, 복제 지연과 보존 설정 | 복제나 외부 소비자가 아직 필요로 하는 로그인지 확인 |
| 복제본의 relay log | `SHOW REPLICA STATUS`의 `Relay_Log_Space` | 복제본에 relay log가 쌓였는지 확인 |
| general/slow 로그 | 로그 출력 대상과 수집 설정 | 일시적인 진단 설정인지, 필요한 보존 기간은 얼마인지 확인 |

`data_free`를 곧바로 OS에 반환 가능한 바이트 수로 해석하지 않는다. 테이블이 어느 테이블스페이스에 있는지와 실제 회수 방법을 함께 확인한다. InnoDB의 `data_length`와 `index_length`는 페이지 수로 계산한 근사치이고, `information_schema.tables`의 크기 값은 캐시된 통계라 기본 24시간 동안 갱신되지 않을 수 있다. 파일 기준 크기는 `INFORMATION_SCHEMA.FILES`의 `TOTAL_EXTENTS * EXTENT_SIZE`로 근사한다. 파일 끝의 부분 extent는 세지 않는다. file-per-table 테이블스페이스의 이름은 `스키마/테이블` 형식이라 스키마별 합계를 낼 수 있다.

여유 공간이 갑자기 줄면 `SHOW FULL PROCESSLIST`와 `INFORMATION_SCHEMA.INNODB_TRX`로 실행 중인 쿼리와 오래 열린 트랜잭션부터 확인한다. 장기 트랜잭션이 공간을 키우는 원리는 [[RDS-Operational-Pitfalls-Rare|저빈도 운영 함정]]에 있다.

## 임시와 시스템 테이블스페이스

MySQL 8.4 문서 기준으로 InnoDB 임시 테이블스페이스는 두 종류다.

- **세션 임시 테이블스페이스**: 사용자가 만든 임시 테이블과 디스크에 만든 InnoDB 내부 임시 테이블이 들어간다. 세션이 끊기면 그 세션의 테이블스페이스가 truncate되어 풀로 돌아간다. `INNODB_SESSION_TEMP_TABLESPACES`의 `ID`는 세션 ID라서 공간을 크게 쥔 세션을 찾을 수 있다.
- **전역 임시 테이블스페이스(`ibtmp1`)**: 사용자 임시 테이블 변경의 롤백 세그먼트를 담는다. 정상 종료 때 지워지고 시작할 때 다시 만들어지므로 이 파일의 공간은 재시작해야 회수된다. RDS에서는 재부팅이 필요하다.

재부팅은 중단을 동반한다. 먼저 공간이 활성 세션의 임시 테이블스페이스에 있는지 확인한다. 세션 임시 테이블스페이스는 세션이 끊길 때 truncate되므로, 쿼리만 끝내고 연결은 남기는 `mysql.rds_kill_query`로는 파일 크기가 그대로 남을 수 있다. 그 세션을 `mysql.rds_kill`로 끝내거나 연결 풀의 해당 연결을 다시 만든 뒤 확인한다. 임시 테이블 데이터가 모두 `ibtmp1`에 있다고 가정하지 않는다.

인스턴스 스토어가 있는 클래스(db.m5d, db.m6gd 등)에서는 RDS Optimized Reads가 기본으로 켜져 내부 임시 파일, 디스크에 만든 내부 임시 테이블, 메모리 맵 파일과 binlog 캐시 파일을 인스턴스 스토어에 둔다. 이 공간은 `FreeLocalStorage`로 보며, 인스턴스 스토어가 가득 차면 트랜잭션이 실패할 수 있다.

시스템 테이블스페이스(`ibdata1`)는 줄일 수 없다. 더 작은 시스템 테이블스페이스가 필요하면 데이터를 새 인스턴스로 옮긴다([[RDS-Storage-Shrink-Runbook|새 인스턴스로 옮기는 런북]]). file-per-table이 기본 테이블스페이스 유형이며 file-per-table 테이블은 `TRUNCATE`나 `DROP` 때 공간을 OS에 돌려준다.

```sql
-- ibtmp1과 ibdata1의 파일 크기 (파일 끝의 부분 extent 제외)
SELECT FILE_NAME, TABLESPACE_NAME, TOTAL_EXTENTS * EXTENT_SIZE AS total_bytes
FROM INFORMATION_SCHEMA.FILES
WHERE TABLESPACE_NAME IN ('innodb_temporary', 'innodb_system');

-- 세션 임시 테이블스페이스를 큰 순서로
SELECT ID, SIZE, STATE, PURPOSE
FROM INFORMATION_SCHEMA.INNODB_SESSION_TEMP_TABLESPACES
ORDER BY SIZE DESC;
```

## OPTIMIZE TABLE의 범위

MySQL 8.4 기준으로 InnoDB의 `OPTIMIZE TABLE`은 테이블을 재구축한다. file-per-table 테이블스페이스에서는 사용하지 않는 공간을 운영체제에 돌려줄 수 있다. 공유 테이블스페이스 내부 공간의 재사용과 파일 자체 축소를 같은 결과로 보지 않는다.

- InnoDB에서 재생성과 통계 분석으로 처리한다는 메시지는 그 자체로 실패를 뜻하지 않는다. 최종 상태를 확인한다.
- 일반 InnoDB 테이블의 재구축은 in-place online DDL로 진행되지만 준비와 완료 단계에서 짧게 배타 잠금을 사용한다. `FULLTEXT` 인덱스가 있거나 `old_alter_table`이 켜져 있으면 table copy 방식을 쓴다.
- 어느 방식이든 새 테이블 파일을 만든다. online DDL의 중간 테이블 파일(`#sql-ib` 접두사)은 원본과 같은 디렉터리에 생기고 원본 테이블 크기만큼 필요할 수 있다. `innodb_tmpdir`은 이 파일에 적용되지 않는다. 재구축 중 인덱스를 만들 때는 MySQL 임시 디렉터리(`tmpdir`)에 정렬 임시 파일도 쓰며, 테이블 데이터와 인덱스를 합친 만큼의 임시 공간이 필요할 수 있다.
- 운영 적용 전 복구 수단, 재구축 여유 공간, 잠금 대기와 부하를 점검한다. 공간이 거의 소진된 DB에서 일괄 재구축부터 실행하지 않는다.

## 로그와 용량 조정

RDS의 binlog 보존은 `mysql.rds_set_configuration`으로 설정하고 `mysql.rds_show_configuration`으로 확인한다. 기본값 `NULL`은 보존하지 않는다는 뜻이라 RDS가 binlog를 가능한 한 빨리 지운다. RDS for MySQL의 최댓값은 168시간이고 0은 쓸 수 없다. 복제나 CDC 소비자의 복구에 필요한 기간을 확인한 뒤 조정한다. 로그가 크다는 이유만으로 보존 기간을 줄이지 않는다.

보존 설정과 달리 binlog가 쌓이면 `SHOW BINARY LOGS`로 파일 수와 크기를 보고 복제 상태를 함께 확인한다. 로그 정리나 복제에 문제가 있으면 binlog가 계속 쌓일 수 있다. 복제본에서는 `SHOW REPLICA STATUS`의 `Relay_Log_Space`로 남아 있는 relay log 파일의 합계를 본다.

로그를 TABLE로 보내는 경우 RDS의 `mysql.rds_rotate_general_log`, `mysql.rds_rotate_slow_log`를 사용한다. RDS에서는 로그 테이블을 `TRUNCATE`할 수 없고, rotate는 내용을 백업 테이블로 옮긴 뒤 빈 로그 테이블을 만든다. 옛 데이터를 완전히 지워 공간을 회수하려면 같은 프로시저를 연속해서 두 번 호출한다. FILE 출력의 로그 관리와 혼동하지 않는다. 진단용 로그 중단 여부도 운영 요구를 기준으로 판단한다.

공간 회수 후 같은 관찰 구간에서 `FreeStorageSpace`와 로그 증가를 다시 본다. 회수는 할당 스토리지 요금 감소를 뜻하지 않는다. 할당 용량을 낮추려는 목적은 [[RDS-Migration-Scenarios|지원되는 축소와 마이그레이션 경로]]로 별도 검토한다. 재발 방지는 `FreeStorageSpace` 알람과 storage autoscaling으로 한다. autoscaling의 시작 조건과 한계는 [[RDS-Operational-Pitfalls#자동 확장을 켰는데도 공간이 부족한 경우|운영 함정의 자동 확장 절]]에 있다.

## 출처

- [MySQL 8.4 Reference Manual, OPTIMIZE TABLE Statement](https://dev.mysql.com/doc/refman/8.4/en/optimize-table.html)
- [MySQL 8.4 Reference Manual, File-Per-Table Tablespaces](https://dev.mysql.com/doc/refman/8.4/en/innodb-file-per-table-tablespaces.html)
- [MySQL 8.4 Reference Manual, Temporary Tablespaces](https://dev.mysql.com/doc/refman/8.4/en/innodb-temporary-tablespace.html)
- [MySQL 8.4 Reference Manual, The System Tablespace](https://dev.mysql.com/doc/refman/8.4/en/innodb-system-tablespace.html)
- [MySQL 8.4 Reference Manual, Online DDL Space Requirements](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-space-requirements.html)
- [MySQL 8.4 Reference Manual, The INFORMATION_SCHEMA TABLES Table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-tables-table.html)
- [MySQL 8.4 Reference Manual, Optimizing INFORMATION_SCHEMA Queries](https://dev.mysql.com/doc/refman/8.4/en/information-schema-optimization.html)
- [MySQL 8.4 Reference Manual, The INFORMATION_SCHEMA FILES Table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-files-table.html)
- [MySQL 8.4 Reference Manual, The INFORMATION_SCHEMA INNODB_SESSION_TEMP_TABLESPACES Table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-innodb-session-temp-tablespaces-table.html)
- [MySQL 8.4 Reference Manual, SHOW REPLICA STATUS Statement](https://dev.mysql.com/doc/refman/8.4/en/show-replica-status.html)
- [Amazon RDS, Accessing MySQL binary logs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.Binarylog.html)
- [Amazon RDS, Setting and showing binary log configuration](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-stored-proc-configuring.html)
- [Amazon RDS, Sending MySQL log output to tables](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.CommonDBATasks.Logs.html)
- [Amazon RDS, Amazon CloudWatch metrics for Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html)
- [Amazon RDS, Ending a session or query](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-stored-proc-ending.html)
- [Amazon RDS, Improving query performance for RDS for MySQL with Amazon RDS Optimized Reads](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-optimized-reads.html)
- [How do I troubleshoot an Amazon RDS for MySQL or MariaDB instance that shows storage full? — AWS re:Post Knowledge Center](https://repost.aws/knowledge-center/view-storage-rds-mysql-mariadb)
- [How do I optimize disk storage when my RDS for MySQL instance uses more space than expected? — Amazon Web Services](https://www.youtube.com/watch?v=LcfRQTUTiVY)
- [How do I troubleshoot an RDS for MySQL or MariaDB instance that shows storage full? — Amazon Web Services](https://www.youtube.com/watch?v=qNg98ljKYe0)

## 관련 문서

- [[RDS-Monitoring|RDS 모니터링]]
- [[RDS-Operational-Pitfalls|RDS 운영 함정]]
- [[RDS-Operational-Pitfalls-Rare|로그와 장기 트랜잭션의 운영 함정]]
- [[RDS-Storage-Shrink-Runbook|RDS 스토리지 축소 런북]]
