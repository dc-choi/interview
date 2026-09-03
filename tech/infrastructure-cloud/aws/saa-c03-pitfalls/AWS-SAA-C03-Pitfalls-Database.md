---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, database]
status: done
category: "Infrastructure - AWS"
aliases: ["데이터베이스 함정", "SAA-C03 Pitfalls Database"]
verified_at: 2026-08-28
---

# AWS SAA-C03 빈출 함정 — 데이터베이스

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

### RDS, Aurora

- **Multi-AZ**(동기 또는 준동기, 자동 페일오버) vs **Read Replica**(비동기, 읽기 확장)
  - Multi-AZ DB instance deployment의 standby는 읽기 트래픽을 받지 않지만, RDS for MySQL/PostgreSQL Multi-AZ DB cluster는 2개의 readable standby를 둔다. Aurora는 별도 클러스터 구조다
  - Read Replica는 동일 리전, 다른 리전, 다른 AZ 모두 가능
- Single-AZ DB instance를 Multi-AZ DB instance deployment로 전환할 때 standby를 snapshot에서 만들어 **다운타임을 피하지만**, write latency와 I/O 성능에는 영향을 줄 수 있다. 다른 변경이나 upgrade까지 무중단이라고 일반화하지 않는다
- **Storage Auto Scaling**(RDS): free storage가 10% 이하인 상태가 5분 이상 지속되고 이전 storage optimization과 24시간 변경 횟수 조건을 만족할 때 확장한다. 최대치는 설정한 threshold와 엔진, 인스턴스 클래스 상한을 따름
- **RDS 암호화**: 생성 시에만 활성화. 기존 미암호 → 스냅샷 → 복사 시 암호화 → 복원
- **RDS Proxy**: 연결 풀링, 페일오버 시간 단축. **Lambda 다수 연결 시나리오** 정답
- **IAM DB Authentication**: 토큰 15분 유효. 지원 리전과 버전의 MariaDB, MySQL, PostgreSQL
- **Enhanced Monitoring**: DB instance의 agent가 OS 지표를 최대 1초 granularity로 수집해 CloudWatch Logs에 전달한다. 기본 RDS CloudWatch metric은 hypervisor 계층에서 보통 60초 주기로 수집
- **RDS Custom**: Oracle/MSSQL 일부 OS 액세스 허용 (운영 SSH 가능)
- RDS DB instance deployment의 **자동 백업**은 retention 0으로 끄거나 최대 35일까지 두며, Aurora는 끄지 못하고 1~35일을 사용한다. **수동 스냅샷**은 사용자가 삭제할 때까지 보존
- **Aurora 엔드포인트 4종**
  | 엔드포인트 | 용도 |
  |---|---|
  | Cluster (Writer) | 단일 writer 자동 라우팅 |
  | Reader | 모든 reader 로드밸런싱 |
  | Custom | 특정 reader 그룹 |
  | Instance | 특정 인스턴스 |
- **Aurora Global Database**: 1개 primary Region과 최대 10개 secondary Region. AWS는 일반적으로 1초 미만의 cross-Region 복제를 설명하지만 고정 RPO 1초, RTO 1분을 보장한다고 외우지 않는다. 실제 lag, failover 방식과 애플리케이션 endpoint 전환을 함께 검증
- **Aurora Serverless v2**: 즉시 스케일링(v1과 다름). 가변 워크로드
- **Aurora Backtrack**(MySQL만): 시간 되돌리기 — 새 클러스터 안 만들고

### DynamoDB

- **온디맨드** vs **프로비저닝**: 예측 불가 트래픽 → 온디맨드, 예측 가능, 꾸준 → 프로비저닝(저렴)
- **DAX**: 키-값 캐시(마이크로초). **집계, 복잡 쿼리 결과 캐싱은 ElastiCache** — 시험에 둘이 함께 나오면 구분
- **Streams**: 24시간 보존. KCL, Lambda 소비. **Kinesis Data Streams로도 전송 가능**(긴 보존)
- **Global Table**: 멀티 리전, 멀티 활성 복제. 현재 버전의 생성, replica와 Streams 동작은 콘솔 또는 API 문서에서 확인
- **TTL**: 만료 항목을 일반적으로 수일 내 백그라운드 삭제하며 정확한 시점은 보장하지 않음. TTL 삭제 이벤트의 Streams 동작과 리전별 복제 비용 확인
- **DynamoDB는 Gateway VPC Endpoint** (S3와 함께 둘뿐)
- **파티션 키 설계**: 핫 파티션 회피 — 무작위, 세분화 키
- **트랜잭션**: 최대 100항목, 4MB. 비용 2배
- **NoSQL vs RDB** 시나리오: 정형/조인 → RDS, 무스키마, 확장 → DynamoDB

### ElastiCache, 기타 DB

- **Redis** vs **Memcached**
  | 항목 | Redis | Memcached |
  |---|---|---|
  | node-based 백업 | RDB 기반 ElastiCache snapshot | node-based Memcached는 없음. Serverless Memcached는 snapshot/restore 지원 |
  | 복제, HA | node-based Redis/Valkey는 Multi-AZ, 자동 failover 지원 | node-based Memcached는 복제, failover 없음. Serverless는 관리형 가용성 모델 |
  | 데이터 구조 | List, Set, SortedSet, Hash, Stream | 문자열만 |
  | 트랜잭션 | MULTI/EXEC | 없음 |
  | 시나리오 | 세션, 리더보드, Pub/Sub | 단순 캐시, 샤딩 |
- **Redis AUTH**: node-based Valkey/Redis OSS의 토큰 인증으로, TLS와 역할은 다르지만 AUTH를 활성화하려면 in-transit encryption이 켜져 있어야 한다. Serverless cache는 RBAC를 사용
- **Memcached Auto Discovery**: 클라이언트가 노드 목록 자동 발견
- **DocumentDB**: MongoDB API 호환 관리형 문서 DB. 분산 스토리지를 사용하지만 Aurora와 동일한 엔진이라고 단정하지 않고 지원 API와 기능 차이를 확인
- **Keyspaces**: Cassandra 호환. 서버리스
- **QLDB**: 2025-07-31 지원 종료. 신규 설계에서는 감사 요구에 맞춰 AWS가 안내하는 migration target과 별도 immutable ledger 패턴을 검토
- **Neptune**: 관리형 graph DB — SNS 친구 관계, 추천과 knowledge graph
- **Timestream**: 시계열 DB — IoT 시나리오

### Redshift

- **Redshift Spectrum**: S3 데이터 직접 쿼리. provisioned cluster 또는 Redshift Serverless compute를 사용한다는 점이 Athena와 다름
- **AQUA**(Advanced Query Accelerator): 지원되는 RA3/query에서 Redshift가 사용 여부를 자동 결정한다. 명시적 AQUA 구성 API는 retired 상태이며 적용 시 별도 AQUA 요금은 없지만 현재 node와 query 지원을 확인
- **Redshift Serverless**: 클러스터 관리 없음
- **Multi-AZ**: provisioned RG 또는 RA3 cluster를 2개 AZ에 배치하며, AZ마다 최소 2개 node가 필요해 single-node 구성은 불가
- **Concurrency Scaling**: 워크로드 폭증 시 자동 임시 클러스터
- **데이터 로드**: COPY (S3, EMR, DynamoDB, SSH). 단일 INSERT는 매우 느림

## 관련 문서

[[RDS-Aurora]], [[RDS-Security-Group]], [[RDS-Monitoring]], [[DynamoDB]], [[ElastiCache]], [[Redshift]]

## 출처

- [DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)
- [ElastiCache snapshot과 restore](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups.html)
- [ElastiCache, Valkey와 Redis OSS AUTH](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth.html)
- [AWS General Reference, Services in Full Shutdown](https://docs.aws.amazon.com/general/latest/gr/full_shutdown_services.html)
- [Amazon Neptune 소개](https://docs.aws.amazon.com/neptune/latest/userguide/intro.html)
- [Redshift Spectrum 실행 모델](https://docs.aws.amazon.com/redshift/latest/dg/c-spectrum-overview.html)
- [Amazon Redshift, Multi-AZ deployment](https://docs.aws.amazon.com/redshift/latest/mgmt/overview-multi-az.html)
- [Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)
- [Amazon RDS, Multi-AZ DB cluster deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts.html)
- [Amazon RDS, Single-AZ DB instance를 Multi-AZ로 전환](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Migrating.html)
- [Amazon RDS, Storage autoscaling](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html)
- [Amazon RDS, IAM database authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)
- [Amazon RDS, Enhanced Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html)
- [Amazon Aurora, Backing up and restoring an Aurora DB cluster](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Managing.Backups.html)
