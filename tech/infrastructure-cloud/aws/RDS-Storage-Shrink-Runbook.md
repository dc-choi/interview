---
tags: [infrastructure, aws, rds, mysql, migration, replication, runbook]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS Storage Shrink", "RDS 스토리지 축소", "스토리지 줄이기 런북"]
---

# RDS 스토리지 축소 런북 (MySQL → 작은 MySQL)

> 상위 문서: [[RDS-Zero-Downtime-Migration|무중단 RDS 마이그레이션]]

RDS 스토리지는 늘리기만 되고 줄일 수 없다([[RDS-Migration-Scenarios]]). Read Replica나 Blue/Green은 소스를 복사하는 구조라 스토리지가 같거나 커져 축소가 안 된다. 그래서 **작은 인스턴스를 새로 만들고 네이티브 binlog 복제로 동기화한 뒤 컷오버**한다. 동종 엔진이라 리스크가 낮은 인프라 작업이다. 컷오버 일반 기계는 [[RDS-Zero-Downtime-Migration]].

## 0. 사전 점검

실제 데이터가 줄일 용량에 들어가는지 본다. 데이터 크기에 딱 맞추지 말고 인덱스, binlog, temp, 증가분 여유를 둔다(대략 데이터 ×1.5~2 또는 최소 20~30% 여유). RDS 최소 스토리지(보통 20GB)도 확인한다. 스냅샷을 떠두고, 이왕이면 gp2→gp3 전환도 같이 고려한다.

```sql
-- DB별 실제 사용량(데이터+인덱스)
SELECT table_schema, ROUND(SUM(data_length + index_length)/1024/1024/1024, 2) AS gb
FROM information_schema.tables GROUP BY table_schema;
```

## 1. 소스 binlog 보존 + 복제 유저

```sql
CALL mysql.rds_set_configuration('binlog retention hours', 168);  -- 초기 적재 동안 binlog 보존
CREATE USER 'repl'@'%' IDENTIFIED BY '강한비번';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
```

소스 파라미터 그룹에서 `binlog_format=ROW`인지 확인한다.

## 2. 작은 새 인스턴스 생성

같은 MySQL 버전, 줄인 스토리지, gp3, 암호화/파라미터 그룹을 소스와 동일하게 맞춰 만든다.

## 3. 일관된 시점으로 논리 덤프

```bash
mysqldump -h <소스> -u admin -p --single-transaction --master-data=2 \
  --routines --triggers --events --set-gtid-purged=OFF mydb > dump.sql
grep "CHANGE MASTER" dump.sql   # 주석에서 binlog file/pos 확인 (복제 시작점)
```

`--single-transaction`이 InnoDB에서 락 없이 일관 스냅샷을 뜨고, `--master-data=2`가 binlog 파일/위치를 주석으로 기록한다. GTID를 켰으면 `--set-gtid-purged` 처리 후 auto-position 복제가 더 깔끔하지만 여기선 file+pos 방식으로 간다.

## 4. 새 인스턴스에 복원

```bash
mysql -h <새 인스턴스> -u admin -p mydb < dump.sql
```

## 5. 새 인스턴스를 소스의 복제본으로 연결

```sql
CALL mysql.rds_set_external_master('<소스 엔드포인트>', 3306, 'repl', '강한비번',
  'mysql-bin.000123', 456, 0);   -- 3단계에서 확인한 file/pos
CALL mysql.rds_start_replication;
```

## 6. 따라잡을 때까지 모니터링

```sql
SHOW REPLICA STATUS\G   -- 8.0 기준 (구버전 SHOW SLAVE STATUS)
-- Seconds_Behind_Source 가 0으로 수렴, Replica_IO_Running / Replica_SQL_Running 둘 다 Yes
```

초기 적재 동안 소스는 계속 쓰기를 받고 복제가 변경분을 따라잡는다. 이 단계까지 다운타임 0이다.

## 7. 컷오버 (다운타임 = 수 초~수십 초)

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
CALL mysql.rds_reset_external_master;
```

소스는 롤백 대비로 검증이 끝날 때까지 살려두고 나중에 정리한다.

## 소규모면 더 간단히

DB가 작아 덤프/복원이 허용 가능한 다운타임(예: 새벽 몇 분) 안에 끝나면, read-only를 걸고 dump → restore → 전환 한 방으로 가도 된다. 복제 셋업이 오히려 과할 수 있다.

## 체크리스트

binlog ROW + 보존시간↑ / 복제 유저 / 일관 덤프(`--single-transaction --master-data=2`) / lag 0 확인 / **AUTO_INCREMENT 보정** / 커넥션 charset(utf8mb4) 유지 / DDL 동결 / 소스 보존.

## 관련 문서

- [[RDS-Zero-Downtime-Migration|무중단(near-zero) 마이그레이션]]
- [[RDS-Migration-Scenarios|RDS 데이터 마이그레이션 — 언제 필요한가]]
- [[MySQL-to-PostgreSQL-Migration|MySQL → PostgreSQL 이기종 마이그레이션]]
- [[Replication|Replication (binlog)]]
- [[MySQL-Charset-Migration|utf8mb4 마이그레이션]]

## 출처

- [Amazon RDS — Configuring binary log file position based replication, rds_set_external_master](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql_rds_set_external_master.html)
