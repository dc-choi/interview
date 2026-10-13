---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["Aurora 공유 스토리지", "Aurora 클러스터와 엔드포인트", "Aurora PostgreSQL Limitless Database"]
verified_at: 2026-10-13
---

# Aurora — RDS와 무엇이 다른가

Amazon이 **MySQL, PostgreSQL 호환**으로 재설계한 클라우드 네이티브 DB. 기존 RDS와 **스토리지 아키텍처**가 근본적으로 다르다.

## 엔진과 스토리지의 분리

일반 MySQL은 **MySQL 엔진**(커넥션 처리, SQL 파싱, 옵티마이저, 쿼리 실행)과 **스토리지 엔진**(데이터를 디스크에 읽고 쓰기, 주로 InnoDB)으로 나뉜다. Aurora는 이 구조를 유지하되 **InnoDB 스토리지 계층을 AWS 분산 스토리지에 맞게 커스터마이징**했다. SQL 엔진은 익숙하게 두고 스토리지만 클라우드식으로 바꾼 것이 핵심이다.

## 공유 스토리지 아키텍처

- 기존 RDS: 각 인스턴스(primary/replica)가 **독립 스토리지**에 복제
- Aurora: primary, replica 모두 **같은 분산 스토리지**를 참조
  - 데이터를 **10 GB 단위 보호 그룹(protection group)** 으로 쪼개 분산 저장
  - **6-way 복제(3 AZ × 2 복사본)** — 스토리지 레이어에서 처리
  - 쿼럼: **쓰기는 6개 중 4개 성공, 읽기는 6개 중 3개** 기준 — 한 AZ가 통째로 죽어도 읽기와 쓰기를 계속
  - 장애 난 스토리지 노드는 **자동 복구** — 사용자가 디스크 복구를 직접 하지 않음
  - 스토리지는 엔진과 버전별 최대치까지 자동 확장하며 일부 최신 Aurora 버전은 256 TiB를 지원. 대상 release의 quota 확인
  - 오류를 스스로 감지, 복구하는 **Self-healing** 내장
  - Replica가 같은 클러스터 볼륨을 사용하므로 별도 데이터 사본을 유지하는 전통적 복제와 경로가 다르다. replica lag과 비용은 부하, 인스턴스, I/O와 요금 조건에 따라 측정
  - 공유 볼륨이라 Reader의 장기 조회가 만든 오래된 read view가 Writer의 undo purge를 막아 Writer의 History List Length로 나타날 수 있다. 무거운 조회를 Reader로 옮기는 것만으로는 purge 부담이 분리되지 않는다. 완화(ARRRC)와 진단은 [[MySQL-Undo-Purge-HLL|Undo Purge와 HLL]] 참고

## Redo Log 중심 쓰기

일반 MySQL은 메모리에서 데이터를 바꾸고 트랜잭션 로그와 binlog를 기록한 뒤, 체크포인트로 데이터 페이지를 디스크에 반영한다. Aurora는 Writer 노드가 변경 내용을 **redo log 형태로 분산 스토리지에 전달**하고, **스토리지 계층이 그 로그로 실제 데이터 페이지를 구성**한다.

- 컴퓨트 노드의 **체크포인트 부담이 줄고 쓰기 경로가 단순**해진다. 컴퓨트는 데이터 페이지를 직접 정리하기보다 변경 명세를 빠르게 넘기는 역할에 가깝다.
- Writer와 Reader가 **같은 클러스터 스토리지 볼륨을 공유**하므로, 클러스터 내부 Reader를 늘려도 일반적인 **binlog 복제 오버헤드가 없다**. 읽기 확장과 장애 조치에 유리하다.
- 단, 외부 MySQL로 복제하거나 특수 목적으로 **binlog를 켜면** 쓰기 비용과 지연이 늘 수 있다. binlog I/O cache는 Aurora MySQL v2.10부터 도입됐지만 v2는 표준 지원이 끝났으므로 현재 지원되는 v3 이상 또는 조건에 맞는 Extended Support release에서 검증한다.

## 컴퓨트 노드 AZ 배치

스토리지는 자동으로 3개 AZ에 분산되지만, **Writer와 Reader 같은 컴퓨트 노드 배치는 사용자 책임**이다. 한 AZ에 노드를 몰아두면 그 AZ 장애 시 서비스가 중단된다.

- 최소 권장: **2개 AZ**에 노드 분산
- 권장: **3개 AZ에 각각 최소 1개 이상**

## Aurora DB Cluster, Endpoints

- **클러스터** = 기본(writer) DB 인스턴스 + 읽기 복제본(reader) 인스턴스 묶음
- 프로비저닝된 Aurora Replica는 일반적으로 클러스터당 최대 15개이며 Serverless와 엔진별 quota를 확인한다. 백업과 스냅샷은 관리형 shared storage 경로를 사용하지만 워크로드 영향이 절대 0이라고 보장하지 말고 지표로 확인
- **Writer Endpoint** — 현재 writer 인스턴스를 가리킴 (쓰기 트래픽 진입점. failover 시 새 writer로 자동 전환)
- **Reader Endpoint** — DNS를 통해 connection 요청을 Aurora Replica들에 분산한다. query 단위 부하 분산기가 아니며 기존 connection은 같은 인스턴스에 유지된다. replica가 없을 때 writer로 연결될 수 있으므로 read-only 보장으로 해석하지 않는다
- 마스터 장애 시 복제본으로 **자동 Failover**

## Aurora Auto Scaling

- 클러스터에 프로비저닝된 **Read Replica 수를 동적 조정**
- MySQL, PostgreSQL 모두 지원
- 사용자가 target metric, 최소와 최대 replica 수를 구성하면 Application Auto Scaling이 그 범위에서 replica 수를 조정한다. 즉시성, connection 재분산과 애플리케이션 준비는 별도 설계

## 주요 특장점

| 항목 | 설명 |
|---|---|
| **Replica 승격** | 공유 스토리지를 사용해 전체 데이터 복사 없이 replica를 승격할 수 있다. 실제 failover 시간은 topology, priority tier, cache와 애플리케이션 재연결에 따라 측정 |
| **Replica Lag** | 전통적인 binlog 복제와 다른 shared-storage 경로를 사용하지만 lag이 0이라고 보장되지 않으므로 `AuroraReplicaLag`와 읽기 일관성 요구를 확인 |
| **Aurora Global Database** | 1개 primary Region + **최대 10개 secondary Region**. secondary는 기본적으로 read-only이고 전용 인프라로 storage-level 변경을 복제한다. 지원 엔진, 버전과 설정에서 global write forwarding을 켜면 secondary가 받은 write SQL을 primary로 전달하며, 데이터 변경의 source of truth는 여전히 primary다. AWS는 일반적으로 1초 미만 지연을 설명하지만 실제 RPO/RTO는 관측된 lag, switchover/failover 절차와 애플리케이션 전환에 좌우됨 |
| **Aurora Serverless v2** | 설정한 최소, 최대 ACU 범위에서 세밀하게 용량을 조정. 0 ACU auto-pause와 지원 범위는 엔진 버전과 설정별로 확인 |
| **Backtrack** (MySQL) | 지원되는 Aurora MySQL 버전과 Region에서 구성한 window 안의 시점으로 되돌리는 기능. 최대 72시간이지만 제약, 비용과 변경 중단 영향을 확인 |
| **Database Cloning** | 운영 DB의 특정 시점을 빠르게 복제 DB로. 전체 물리 복사 대신 **스토리지 페이지 공유(copy-on-write)** 라 빠르고 저렴 |
| **Aurora PostgreSQL Limitless Database** | router와 shard로 구성된 DB shard group에서 sharded table을 수평 확장. AWS가 제시하는 petabyte, 대규모 write 처리 목표와 별개로 지원 SQL, shard key, isolation level, Region과 용량 제한을 검증 |

## Global Database의 대기 구성과 전환 준비

2026-10-07 공식 DR 및 연결 문서로 대조한 범위다. 스토리지가 복제되고 있다는 사실과 애플리케이션이 새 리전에서 요청을 처리할 준비가 됐다는 사실은 구분한다.

| 대기 구성 | 전환 전에 필요한 작업 | 선택의 비용 |
|---|---|---|
| Headless secondary | DB 인스턴스를 추가한 뒤 switchover 또는 failover 수행 | 대기 컴퓨트 비용을 줄이지만 인스턴스 준비 시간이 복구 경로에 추가됨 |
| DB 인스턴스가 있는 secondary | 승격할 인스턴스와 애플리케이션의 처리 용량 확인 | 대기 비용이 들지만 장애 때 새 DB 인스턴스를 만드는 단계를 줄임 |

계획된 **switchover**는 정상인 클러스터를 동기화한 뒤 역할을 바꾸므로 RPO 0을 제공한다. 비계획 **failover**는 미복제 트랜잭션을 잃을 수 있다. 관리형 전환의 엔진 버전 호환성, 대상 리전의 parameter group, 모니터링과 외부 서비스 연동을 미리 확인한다. 발표나 데모의 복구 시간을 서비스 전체 RTO의 보장값으로 사용하지 않는다.

**Global writer endpoint**는 관리형 switchover 또는 failover 뒤 새 primary의 writer를 가리키도록 갱신된다. 애플리케이션의 연결 주소 변경을 줄이는 기능이며 DNS 전파, 새 primary까지의 네트워크 경로와 실제 쓰기 성공은 별도로 확인한다. RDS Proxy를 쓰는 경로는 새 primary에 연결된 proxy의 read/write endpoint로 전환하는 절차가 필요하다.

관리형 failover의 이전 primary 쓰기 차단(write fencing)은 최선 노력 방식이다. 이전 리전이 일시적으로 쓰기를 계속 받는 split-brain 가능성은 global writer endpoint를 써도 남는다. 전환 절차에는 애플리케이션 쓰기를 멈추고, DNS 변경 반영과 새 primary의 쓰기 성공을 확인한 뒤 재개하는 단계를 포함한다.

다음은 복구 훈련의 완료 기준 예다. DB 승격 완료 후 새 연결의 쓰기와 읽기를 확인하고, 누락된 트랜잭션 및 외부 처리 결과를 대사한다. 정상화된 이전 리전의 복제 상태까지 확인해야 다음 장애에 대비한 구성이 복구됐다고 판단할 수 있다.

## Limitless Database의 테이블 배치와 운영 제약

2026-10-13 Aurora 사용자 가이드로 대조한 범위다. Limitless Database 클러스터에는 writer와 reader 인스턴스 대신 **DB shard group**이 있다. **router**는 클라이언트의 SQL 연결을 받아 데이터 위치 메타데이터에 따라 명령을 shard로 보내고, 결과를 모아 반환하며 분산 트랜잭션의 일관성을 관리한다. **shard**는 데이터의 일부를 저장하는 Aurora PostgreSQL DB 인스턴스이고 클라이언트가 직접 연결할 수 없다. 개별 router와 shard는 계정에 보이지 않으며 클러스터 엔드포인트로 접속한다. shard key 선택의 일반 기준은 [[Sharding]]을 따른다.

| 테이블 유형 | 배치 | 맞는 대상 |
|---|---|---|
| Sharded | shard key 해시로 모든 shard에 분산하고 같은 key 값은 같은 shard에 둔다. range나 list 분할이 아니다 | 독립된 데이터 부분집합 단위로 다루는 테이블, 매우 큰 테이블이나 다른 테이블보다 빠르게 커질 수 있는 테이블 |
| Sharded(collocated) | 같은 shard key를 쓰고 함께 배치하도록 명시한 sharded table. join에 필요한 데이터가 같은 shard에 있어 shard 간 이동 없이 join할 수 있다 | 고객의 주문과 주문 상세처럼 같은 key로 함께 읽는 테이블 |
| Reference | 모든 shard에 전체 사본을 둔다 | 쓰기가 적지만 자주 join하는 작은 테이블(날짜, 주, 도시와 우편번호 같은 지리 데이터) |
| Standard | 기본 유형. 모든 standard table이 시스템이 고른 한 shard에 모이고 shard 최대 용량 128 TiB에 묶이며, 그 shard에 다른 유형의 데이터도 있어 실효 한도는 더 낮다 | 분산하지 않을 테이블. 나중에 sharded나 reference로 전환할 수 있다 |

질의의 모든 관계가 같은 shard를 가리키는 shard key 조건의 sharded table이거나 reference table이면, router는 planning을 건너뛰고 질의 전체를 shard로 내려보낸다. 이 single-shard 최적화는 `INSERT`, `SELECT`, `UPDATE`, `DELETE`에 적용되며 상수 조건으로 partition을 제거하는 방식이라 statement의 모든 sharded table에 shard key의 filter 또는 join 조건이 있어야 한다. 같은 고객의 데이터가 한 shard에 있어도 한 테이블의 shard key 조건이 빠지면 분산 질의가 된다. `EXPLAIN`의 `Single Shard Optimized` 표시로 확인하며, 등록하지 않은 mutable 함수, `security_barrier` view, PL/pgSQL 변수, `plan_cache_mode`가 `force_generic_plan`인 prepared statement와 여러 사용자 권한이 필요한 객체 등이 이 최적화를 막는다.

도입 전에 확인할 제약은 다음과 같다.

- shard key 값은 `UPDATE`할 수 없다. 행을 `DELETE`한 뒤 새 key로 `INSERT`한다.
- isolation level은 read uncommitted, read committed, repeatable read를 지원하며 serializable로는 설정할 수 없다.
- shard group 최대 용량은 16~6144 ACU이고 그 이상은 AWS에 문의한다. 생성 때 정한 최대 용량이 초기 router와 shard 수를 정하며, 이후 최대 용량을 바꿔도 노드 수는 그대로다. shard 분할과 router 추가는 SQL 함수로 하고, shard 병합과 개별 노드 삭제는 지원하지 않는다.
- compute redundancy를 0보다 크게 두면 shard 수가 두 배나 세 배로 늘어 비용이 증가하고, 2로 두면 DB subnet group에 AZ가 3개 이상 필요하다. 서브넷에는 router마다 IP 1개, shard마다 최대 3개가 필요하다. us-east-1에서는 `us-east-1e` AZ를 DB subnet group에 넣지 않는다.
- 클러스터 엔드포인트로 접속하면 Route 53이 router로 연결하는데, 부하 분산 능력이 제한돼 router 간 부하가 고르지 않을 수 있다. AWS JDBC Driver의 Limitless Connection Plugin은 부하를 고려한 클라이언트 측 분산을 제공한다.
- I/O-Optimized 스토리지 구성과 `16.X-limitless` 엔진 버전만 쓴다. Enhanced Monitoring, 보존 기간 31일 이상의 Performance Insights와 PostgreSQL 로그의 CloudWatch Logs 전송이 필수이며 추가 요금이 든다. 제공 리전은 아시아 태평양(타이베이)을 제외한 AWS 리전이다.
- Global Database, Blue/Green Deployments, RDS Proxy, read replica, cloning, AWS Backup, zero-ETL 통합, Secrets Manager 등은 지원하지 않으며 복제 소스가 될 수 없다. 위 절의 Global Database, cloning과 Auto Scaling 설명은 일반 Aurora 클러스터 기준이다.

주요 트랜잭션과 조회가 고객이나 테넌트 같은 한 shard key 값 안에서 끝나는지 먼저 확인한다. 여러 key를 가로지르는 join과 집계가 주 경로라면 router의 분산 실행 비중이 커지므로 대표 질의의 `EXPLAIN`과 부하 시험으로 이점을 판단한다. 기존 DR, 배포와 자격 증명 운영 절차를 위 미지원 목록과 대조해 대체 수단이 없는 항목은 도입 차단 조건으로 둔다(설계 제안).

## 언제 RDS 대신 Aurora를 고르나

- 읽기 트래픽이 많고 Lag에 민감한 서비스
- Multi-AZ + 다수 Read Replica 구성이 필요한 프로덕션
- 초단위 오토스케일이 필요한 SaaS(Aurora Serverless)
- 비용: 인스턴스, I/O-Optimized 여부, 스토리지, replica와 cross-Region 데이터 전송을 포함한 총비용을 RDS 대안과 계산

## 출처

- [Amazon Aurora User Guide, Using switchover or failover in Amazon Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html)
- [Amazon Aurora User Guide, Connecting to Amazon Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-connecting.html)
- [Aurora Reader Endpoint](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Reader.html)
- [Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)
- [Aurora Global Database write forwarding](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-write-forwarding.html)
- [Aurora Auto Scaling](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Integrating.AutoScaling.html)
- [Aurora PostgreSQL Limitless Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless.html)
- [Amazon Aurora User Guide, Aurora MySQL isolation levels](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.IsolationLevels.html)
- [Aurora PostgreSQL Limitless Database architecture](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-architecture.html)
- [Aurora PostgreSQL Limitless Database requirements and considerations](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-reqs-limits.html)
- [Creating a DB cluster that uses Aurora PostgreSQL Limitless Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-cluster.html)
- [Working with DB shard groups](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-shard.html)
- [Querying Aurora PostgreSQL Limitless Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-query.html)
- [Single-shard queries in Aurora PostgreSQL Limitless Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-query.single-shard.html)
- [DML limitations and other information for Aurora PostgreSQL Limitless Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-reference.DML-limitations.html)
- [AWS Builder를 위한 2024년 AWS가 선보이는 혁신적인 클라우드 서비스 — Amazon Web Services Korea](https://www.youtube.com/watch?v=UlLKTq0fxI0) — re:Invent 2023에서 소개된 서비스를 다룬 2024-08 공개 발표. 본문의 계약은 위 공식 문서로 다시 대조했다
