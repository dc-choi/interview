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

1. 노드 간 동기화로 replication보다 강한 일관성을 목표로 하지만, 구현과 설정에 따라 stale read가 남는다. 공유 스토리지형(Aurora)도 reader에는 replica lag가 있고, certification 기반(MySQL Group Replication)은 기본값 `group_replication_consistency=BEFORE_ON_PRIMARY_FAILOVER`(MySQL 8.4 기준, 8.0.14에서 EVENTUAL 기본값으로 도입 후 8.4.0에서 변경)가 primary failover 직후에만 대기를 강제하고 평상시 읽기는 앞선 transaction 적용을 기다리지 않는다. 강한 읽기가 필요하면 consistency level이나 sync wait 옵션을 명시한다.
2. 로드밸런싱을 통해 각 서버에서 트래픽을 나눠 처리할 수 있다.
3. HA(High Availability)를 통해 접근이 거의 항상 가능하다.
4. 스토리지 구조는 클러스터 방식에 따라 다르다. shared-disk형(Oracle RAC)은 모든 인스턴스가 클러스터 인식 공유 디스크로 같은 데이터 파일에 접근하므로 공유 스토리지와 그 접근 경로가 병목이나 단일 장애 지점이 될 수 있다. shared-nothing형(MySQL NDB Cluster, Galera)은 각 노드가 자체 메모리와 디스크를 갖고 NDB는 SAN이나 네트워크 파일시스템 같은 공유 스토리지를 권장하지 않으므로, 병목은 스토리지 공유가 아니라 노드 간 동기화와 certification 트래픽에서 생긴다. Aurora는 인스턴스가 한 클러스터 볼륨을 공유하지만 저장 계층이 여러 AZ에 분산된 쿼럼 구조라 단일 스토리지 병목과는 성격이 다르다.

## 출처

- [MySQL 8.4 Reference Manual — Group Replication System Variables (group_replication_consistency 기본값)](https://dev.mysql.com/doc/refman/8.4/en/group-replication-system-variables.html#sysvar_group_replication_consistency)
- [MySQL 8.4.0 Release Notes (group_replication_consistency 기본값 변경)](https://dev.mysql.com/doc/relnotes/mysql/8.4/en/news-8-4-0.html)
- [MySQL 8.4 Reference Manual — NDB Cluster Overview](https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-overview.html)
- [Amazon Aurora DB clusters — Replication](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html)

## 관련 문서
- [[Replication]]
- [[Sharding]]
