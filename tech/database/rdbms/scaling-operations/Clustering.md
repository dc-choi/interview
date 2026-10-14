---
tags: [database, rdbms]
status: done
verified_at: 2026-08-12
category: "Data & Storage - RDB"
aliases: ["Cluster", "Clustering"]
---

# Cluster

DB 서버를 여러 대 두는 방법이다.

## 특징

1. 클러스터라는 이름만으로 복제 구성보다 강한 일관성을 보장하지 않는다. 구현과 설정에 따라 stale read가 남는다. 공유 스토리지형(Aurora)도 reader에는 replica lag가 있고, certification 기반(MySQL Group Replication)은 기본값 `group_replication_consistency=BEFORE_ON_PRIMARY_FAILOVER`(MySQL 8.4 기준, 8.0.14에서 EVENTUAL 기본값으로 도입 후 8.4.0에서 변경)가 primary failover 직후에만 대기를 강제하고 평상시 읽기는 앞선 transaction 적용을 기다리지 않는다. 강한 읽기가 필요하면 consistency level이나 sync wait 옵션을 명시한다.
2. 로드밸런싱을 통해 각 서버에서 트래픽을 나눠 처리할 수 있다.
3. HA(High Availability)는 노드 장애의 영향을 줄이는 구성 목표다. 장애 범위, 남은 노드와 스토리지의 상태, 전환 절차에 따라 서비스 중단이 생길 수 있다.
4. 스토리지 구조는 클러스터 방식에 따라 다르다. shared-disk형(Oracle RAC)은 모든 인스턴스가 클러스터 인식 공유 디스크로 같은 데이터 파일에 접근하므로 공유 스토리지와 그 접근 경로가 병목이나 단일 장애 지점이 될 수 있다. shared-nothing형(MySQL NDB Cluster, Galera)은 각 노드가 자체 메모리와 디스크를 갖고 NDB는 SAN이나 네트워크 파일시스템 같은 공유 스토리지를 권장하지 않으므로, 병목은 스토리지 공유가 아니라 노드 간 동기화와 certification 트래픽에서 생긴다. Aurora는 인스턴스가 한 클러스터 볼륨을 공유하지만 저장 계층이 여러 AZ에 분산된 쿼럼 구조라 단일 스토리지 병목과는 성격이 다르다.

## RAC 전환은 쓰기 구조와 복구 요구를 나누어 비교한다

부분 검증(2026-10-14): Oracle RAC 19c와 Aurora DB cluster 공식 문서를 대조했다. 공유 데이터에 여러 인스턴스가 접근한다는 공통점만으로 두 구성이 같은 쓰기 모델이라고 판단하지 않는다.

- **Oracle RAC:** 여러 인스턴스가 하나의 데이터베이스에 접근하며 일반적인 read/write 인스턴스들이 트랜잭션을 처리한다. 읽기 전용 reader node도 있으므로 모든 RAC 인스턴스가 반드시 쓰기를 받는다고 일반화하지 않는다.
- **Aurora DB cluster:** 여기서 비교하는 일반 DB cluster는 writer 하나가 데이터 변경을 맡고 reader는 읽기를 분담한다. Reader 증설은 쓰기를 여러 writer로 분산하는 방법이 아니다. Writer 장애 시 replica 승격을 통한 가용성과 평상시 쓰기 확장을 구분한다. Aurora Limitless 같은 별도 분산 구성을 같은 대상으로 취급하지 않는다.
- **전환 점검 제안:** RAC에서 여러 인스턴스에 나누던 쓰기 부하를 대상 writer가 감당하는지, 읽기를 분리해도 업무의 최신성 요구가 충족되는지 확인한다. SQL과 저장 프로시저의 호환성, 장애 후 재접속과 재시도, 실제 복구 시간도 별도 검증 항목이다. 고가용성 기능이 있다는 이유만으로 애플리케이션 변경 없이 전환할 수 있다고 결론 내리지 않는다.

이 절은 구조 비교이며 실제 마이그레이션이나 부하 시험 결과가 아니다. 기존 MySQL 세부 설정 전체는 재검증하지 않아 frontmatter의 검증일은 유지한다.

## 출처

- [MySQL 8.4 Reference Manual — Group Replication System Variables (group_replication_consistency 기본값)](https://dev.mysql.com/doc/refman/8.4/en/group-replication-system-variables.html#sysvar_group_replication_consistency)
- [MySQL 8.4.0 Release Notes (group_replication_consistency 기본값 변경)](https://dev.mysql.com/doc/relnotes/mysql/8.4/en/news-8-4-0.html)
- [MySQL 8.4 Reference Manual — NDB Cluster Overview](https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-overview.html)
- [Amazon Aurora DB clusters — Replication](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html)
- [Oracle Database 19c — Introduction to Oracle RAC](https://docs.oracle.com/en/database/oracle/oracle-database/19/racad/introduction-to-oracle-rac.html)
- [Amazon Aurora DB clusters — Overview](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.html)

## 관련 문서
- [[Replication]]
- [[Sharding]]
