---
tags: [aws, rds, mysql, storage, operations]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["RDS MySQL Storage Reclamation", "RDS MySQL 디스크 공간 회수"]
---

# RDS for MySQL 공간 사용 진단과 회수

행을 지운 결과, 테이블 파일의 축소, RDS 할당 스토리지의 축소는 서로 다르다. 여유 공간 부족을 발견하면 사용량의 원인부터 나눈다.

## 원인별 확인

| 대상 | 확인할 근거 | 다음 판단 |
|---|---|---|
| 인스턴스 전체 | CloudWatch `FreeStorageSpace`의 추세 | 증가 속도와 남은 대응 시간을 확인 |
| 테이블과 인덱스 | `information_schema.tables`의 `data_length`, `index_length`, `data_free` | 논리 데이터 크기와 테이블스페이스 내부 여유 공간을 구분 |
| 바이너리 로그 | `BinLogDiskUsage`, 복제 지연과 보존 설정 | 복제나 외부 소비자가 아직 필요로 하는 로그인지 확인 |
| general/slow 로그 | 로그 출력 대상과 수집 설정 | 일시적인 진단 설정인지, 필요한 보존 기간은 얼마인지 확인 |

`data_free`를 곧바로 OS에 반환 가능한 바이트 수로 해석하지 않는다. 테이블이 어느 테이블스페이스에 있는지와 실제 회수 방법을 함께 확인한다.

## OPTIMIZE TABLE의 범위

MySQL 8.4 기준으로 InnoDB의 `OPTIMIZE TABLE`은 테이블을 재구축한다. file-per-table 테이블스페이스에서는 사용하지 않는 공간을 운영체제에 돌려줄 수 있다. 공유 테이블스페이스 내부 공간의 재사용과 파일 자체 축소를 같은 결과로 보지 않는다.

- InnoDB에서 재생성과 통계 분석으로 처리한다는 메시지는 그 자체로 실패를 뜻하지 않는다. 최종 상태를 확인한다.
- 일반적인 InnoDB online DDL도 준비와 완료 단계에서 배타 잠금을 사용한다. `FULLTEXT` 인덱스 등의 조건에서는 table copy 방식으로 바뀔 수 있다.
- 운영 적용 전 복구 수단, 재구축 여유 공간, 잠금 대기와 부하를 점검한다. 공간이 거의 소진된 DB에서 일괄 재구축부터 실행하지 않는다.

## 로그와 용량 조정

RDS의 binlog 보존은 `mysql.rds_set_configuration`으로 설정한다. 복제나 CDC 소비자의 복구에 필요한 기간을 확인한 뒤 조정한다. 로그가 크다는 이유만으로 보존 기간을 줄이지 않는다.

로그를 TABLE로 보내는 경우 RDS의 `mysql.rds_rotate_general_log`, `mysql.rds_rotate_slow_log`를 사용한다. FILE 출력의 로그 관리와 혼동하지 않는다. 진단용 로그 중단 여부도 운영 요구를 기준으로 판단한다.

공간 회수 후 같은 관찰 구간에서 `FreeStorageSpace`와 로그 증가를 다시 본다. 회수는 할당 스토리지 요금 감소를 뜻하지 않는다. 할당 용량을 낮추려는 목적은 [[RDS-Migration-Scenarios|지원되는 축소와 마이그레이션 경로]]로 별도 검토한다.

## 출처

- [MySQL 8.4 Reference Manual, OPTIMIZE TABLE Statement](https://dev.mysql.com/doc/refman/8.4/en/optimize-table.html)
- [MySQL 8.4 Reference Manual, File-Per-Table Tablespaces](https://dev.mysql.com/doc/refman/8.4/en/innodb-file-per-table-tablespaces.html)
- [Amazon RDS, Accessing MySQL binary logs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.Binarylog.html)
- [Amazon RDS, Sending MySQL log output to tables](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.CommonDBATasks.Logs.html)
- [How do I optimize disk storage when my RDS for MySQL instance uses more space than expected? — Amazon Web Services](https://www.youtube.com/watch?v=LcfRQTUTiVY)

## 관련 문서

- [[RDS-Monitoring|RDS 모니터링]]
- [[RDS-Operational-Pitfalls-Rare|로그와 장기 트랜잭션의 운영 함정]]
- [[RDS-Storage-Shrink-Runbook|RDS 스토리지 축소 런북]]
