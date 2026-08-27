---
tags: [infrastructure, aws, rds, mysql, migration, replication, runbook]
status: note
category: "Infrastructure - AWS"
aliases: ["RDS Storage Shrink", "RDS 스토리지 축소", "스토리지 줄이기 런북"]
verified_at: 2026-08-27
---

# RDS 스토리지 축소 런북 (MySQL → 작은 MySQL)

> 상위 문서: [[RDS-Zero-Downtime-Migration|무중단 RDS 마이그레이션]]

RDS 스토리지는 늘리기만 되고 줄일 수 없다([[RDS-Migration-Scenarios]]). Read Replica나 Blue/Green은 소스를 복사하는 구조라 스토리지가 같거나 커져 축소가 안 된다. 후보 방식은 **작은 인스턴스를 새로 만들고 네이티브 binlog 복제로 동기화한 뒤 컷오버**하는 것이다. 동종 엔진이라 데이터 변환 범위는 작지만 복제 구성과 컷오버 리스크는 별도로 검증해야 한다. 컷오버 일반 기계는 [[RDS-Zero-Downtime-Migration]].

> 실행 전 gate: AWS는 RDS 사이의 일반 복제에는 Read Replica를 우선 안내하고, 이 문서의 단일 `rds_set_external_*` 프로시저는 주로 RDS 외부 MySQL 소스를 대상으로 설명한다. 작은 RDS를 대상으로 한 이 토폴로지는 현재 저장소에서 실행 검증되지 않았다. 같은 엔진 버전의 비운영 환경에서 지원 여부와 권한을 먼저 재현하고, 통과하지 않으면 AWS DMS의 CDC 또는 쓰기 중단 후 dump/restore로 전환한다.

## 0. 사전 점검

실제 데이터, 인덱스, binlog, 임시 공간과 관찰 기간의 증가량을 합쳐 필요한 용량을 산정한다. 일반 배수로 고정하지 말고 대상 engine, instance class와 storage type의 최소, 최대 용량 및 IOPS 제약을 생성 시점의 RDS console이나 API에서 확인한다. 복구용 snapshot을 만들고, 측정 결과와 지원 조건이 맞으면 storage type 변경도 함께 검토한다.

대상 RDS는 프로시저 실행 전에 `autocommit=1`인지 확인한다. 소스 RDS는 자동 백업으로 binlog가 활성화됐는지 확인하고, 대상 RDS에서 3306 포트로 연결할 수 있어야 한다. 복제 전용 사용자에는 `REPLICATION CLIENT`, `REPLICATION SLAVE` 권한을 준다. RDS MySQL 8.4에서 기본 `caching_sha2_password` 사용자를 쓰면 TLS 복제를 구성한다.

```sql
-- DB별 실제 사용량(데이터+인덱스)
SELECT table_schema, ROUND(SUM(data_length + index_length)/1024/1024/1024, 2) AS gb
FROM information_schema.tables GROUP BY table_schema;
```

## 1. 소스 binlog 보존 + 복제 유저

```sql
CALL mysql.rds_set_configuration('binlog retention hours', 168);  -- 초기 적재 동안 binlog 보존
CREATE USER 'repl'@'%' IDENTIFIED BY '강한비번';
GRANT REPLICATION CLIENT, REPLICATION SLAVE ON *.* TO 'repl'@'%';
```

소스 파라미터 그룹에서 `binlog_format=ROW`인지 확인하고, 초기 적재와 lag 추적에 충분한 binlog 보존 시간을 둔다.

## 2. 작은 새 인스턴스 생성

같은 MySQL 버전, 줄인 스토리지, gp3, 암호화/파라미터 그룹을 소스와 동일하게 맞춰 만든다.

## 3. 일관된 시점으로 논리 덤프

```bash
# MySQL 8.0.26 이상과 8.4
mysqldump -h <소스> -u admin -p --single-transaction --source-data=2 \
  --routines --triggers --events --set-gtid-purged=OFF mydb > dump.sql
grep "CHANGE REPLICATION SOURCE" dump.sql   # 주석에서 binlog file/pos 확인

# MySQL 8.0.25 이하 client
mysqldump -h <소스> -u admin -p --single-transaction --master-data=2 \
  --routines --triggers --events --set-gtid-purged=OFF mydb > dump.sql
grep -E "CHANGE (REPLICATION SOURCE|MASTER)" dump.sql
```

`--single-transaction`이 InnoDB에서 일관된 스냅샷을 만들고, `--source-data=2`가 binlog 파일과 위치를 주석으로 기록한다. 이 옵션은 시작 시점에 짧은 전역 read lock을 사용할 수 있으며 `RELOAD` 권한과 활성화된 binlog가 필요하다. GTID를 켰으면 `--set-gtid-purged` 처리 후 auto-position 복제를 검토할 수 있지만 여기서는 file+pos 방식을 쓴다.

## 4. 새 인스턴스에 복원

```bash
mysql -h <새 인스턴스> -u admin -p mydb < dump.sql
```

## 5. 새 인스턴스를 소스의 복제본으로 연결

대상 RDS MySQL 버전에 맞는 프로시저를 쓴다. 마지막 인수 `1`은 TLS 복제를 뜻한다. RDS MySQL 8.4에서 `caching_sha2_password` 사용자는 TLS가 필요하며, TLS를 쓰지 않는 소스만 `0`을 사용한다.

```sql
-- RDS MySQL 8.0 이하
CALL mysql.rds_set_external_master('<소스 엔드포인트>', 3306, 'repl', '강한비번',
  'mysql-bin.000123', 456, 1);   -- 3단계에서 확인한 file/pos

-- RDS MySQL 8.4 이상
CALL mysql.rds_set_external_source('<소스 엔드포인트>', 3306, 'repl', '강한비번',
  'mysql-bin.000123', 456, 1);   -- 3단계에서 확인한 file/pos

CALL mysql.rds_start_replication;
```

## 6. 따라잡을 때까지 모니터링

```sql
SHOW REPLICA STATUS\G   -- 8.0 기준 (구버전 SHOW SLAVE STATUS)
-- Seconds_Behind_Source 가 0으로 수렴, Replica_IO_Running / Replica_SQL_Running 둘 다 Yes
```

초기 적재 동안 소스는 계속 쓰기를 받고 복제가 변경분을 따라잡는다. 이 단계까지 다운타임 0이다.

## 7. 컷오버

```
1. 앱을 read-only로 전환 (쓰기 정지)          ← 다운타임 시작
2. Seconds_Behind_Source = 0 도달까지 대기
3. 행 수/체크섬 검증 (pt-table-checksum)
4. AUTO_INCREMENT 보정                          ← 빼먹으면 PK 충돌
5. 앱 커넥션을 새 엔드포인트로 전환
6. 쓰기 재개                                     ← 다운타임 끝
```

```sql
SHOW TABLE STATUS LIKE 'users';            -- Auto_increment 값 확인
ALTER TABLE users AUTO_INCREMENT = <max(id)+1>;
```

## 8. 복제 끊고 마무리

```sql
CALL mysql.rds_stop_replication;

-- RDS MySQL 8.0 이하
CALL mysql.rds_reset_external_master;

-- RDS MySQL 8.4 이상
CALL mysql.rds_reset_external_source;
```

소스는 롤백 대비로 검증이 끝날 때까지 살려두고 나중에 정리한다.

## 소규모면 더 간단히

DB가 작아 덤프/복원이 허용 가능한 다운타임(예: 새벽 몇 분) 안에 끝나면, read-only를 걸고 dump → restore → 전환 한 방으로 가도 된다. 복제 셋업이 오히려 과할 수 있다.

## 체크리스트

binlog ROW + 보존시간↑ / 복제 유저 / 일관 덤프(MySQL client 8.0.26 이상은 `--source-data=2`, 이하는 `--master-data=2`) / lag 0 확인 / **AUTO_INCREMENT 보정** / 커넥션 charset(utf8mb4) 유지 / DDL 동결 / 소스 보존.

## 관련 문서

- [[RDS-Zero-Downtime-Migration|무중단(near-zero) 마이그레이션]]
- [[RDS-Migration-Scenarios|RDS 데이터 마이그레이션 — 언제 필요한가]]
- [[MySQL-to-PostgreSQL-Migration|MySQL → PostgreSQL 이기종 마이그레이션]]
- [[Replication|Replication (binlog)]]
- [[MySQL-Charset-Migration|utf8mb4 마이그레이션]]

## 출처

- [AWS, Configuring binary log file position replication with an external source instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Procedural.Importing.External.Repl.html)
- [AWS, Configuring, starting, and stopping binary log replication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-stored-proc-replicating.html)
- [AWS, Configuring RDS for MySQL binary logging for instance deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.BinaryFormat.html)
- [AWS DMS, Using a MySQL compatible database as a source for homogeneous data migrations](https://docs.aws.amazon.com/dms/latest/userguide/dm-data-providers-source-mysql.html)
- [MySQL 8.4 Reference Manual, mysqldump](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)
- [MySQL 8.0 Release Notes, Changes in MySQL 8.0.26](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-26.html)
