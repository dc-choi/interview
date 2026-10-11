---
tags: [database, oltp, olap, architecture, data-warehouse]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["OLTP vs OLAP", "트랜잭션 처리 vs 분석 처리"]
verified_at: 2026-10-11
---

# OLTP vs OLAP

OLTP(Online Transaction Processing)와 OLAP(Online Analytical Processing)는 제품 이름이 아니라 **워크로드 성격을 구분하는 축**이다. 전형적인 최적화 방향은 다르지만 한 제품이 두 workload를 일부 지원할 수 있고, 분리 배포와 HTAP 중 무엇이 맞는지는 규모, 격리와 freshness 요구로 결정한다.

## 핵심 비교

| 구분 | OLTP | OLAP |
|---|---|---|
| 대표 제품 경향 | MySQL, PostgreSQL, Oracle | ClickHouse, BigQuery, Snowflake, Redshift |
| 주요 작업 | 단건 조회/INSERT/UPDATE/DELETE, 트랜잭션 | 대량 집계, 통계, 분석 |
| 워크로드 단위 | 한 행 / 한 트랜잭션 | 수억 행 스캔, 집계 |
| 저장 단위 경향 | 행 중심이 흔함 | 열 중심이 흔함 |
| 보장 모델 | 짧은 read/write transaction과 제약을 강하게 활용 | 제품별 transaction, snapshot과 consistency 보장이 다름 |
| 동시성 경향 | 많은 짧은 transaction | 상대적으로 적지만 무거운 scan, aggregation |
| 데이터 신선도 | 낮은 지연을 요구하는 경우가 많음 | batch 지연 허용부터 실시간 분석까지 다양 |
| 설계 초점 | 짧은 point access와 write latency | scan 처리량, 병렬화와 압축 |

## 워크로드가 다른 이유

### OLTP의 전제
- 사용자 요청 하나가 곧 한 트랜잭션 (주문, 결제, 로그인)
- 응답 지연이 사용자에게 직접 보임 → 100ms 단위 최적화
- 데이터 한 건의 정합성과 불변식이 비즈니스 결과를 결정 → transaction과 제약 활용
- 동시 트랜잭션 수천 개 → Lock, Isolation Level이 핵심 관심사

### OLAP의 전제
- 분석가/대시보드가 시점, 기간을 잘라 집계
- 응답 지연은 초~분 단위까지 허용 (사용자가 즉시 결과를 기다리지 않음)
- 한 쿼리가 수억~수조 행을 스캔 → 처리량, 압축, 병렬이 핵심
- 어떤 snapshot과 갱신 시점을 읽는지 명시해야 분석 결과를 재현할 수 있음

## 저장 구조가 갈라지는 지점

행 저장은 한 record의 여러 column을 함께 읽고 쓸 때 유리하고, 열 저장은 필요한 column만 대량 scan하고 압축, vectorized execution을 할 때 유리하다. 이는 상충하는 최적화지만 물리적으로 양립 불가능한 것은 아니다. column index, 별도 replica나 row store와 column store를 함께 둔 HTAP 시스템처럼 한 제품이 두 layout과 execution path를 조합할 수 있다.

## 함께 쓰는 흔한 분리 구조

운영 DB와 분석 DB를 분리하고 데이터 파이프라인으로 연결하는 방식은 workload 간 자원 격리가 중요한 경우의 흔한 선택이다.

```
[OLTP: MySQL/PostgreSQL]
        │
        ├─ 트랜잭션 처리 (주문, 결제, 로그인)
        │
        └─ CDC (Debezium) ─→ Kafka ─→ [OLAP: ClickHouse/BigQuery]
                                              │
                                              └─ 집계, 대시보드, KPI
```

- 운영 트래픽이 분석 쿼리에 간섭받지 않음 (DB 레벨 격리)
- 분석 DB에서는 [[SCD-Type2|SCD Type 2]] 같은 이력 모델로 시점 일관성 확보
- 운영 DB는 가벼운 스키마를 유지, 분석 DB는 정렬 키, Materialized View로 별도 최적화

## 분석 데이터 통합과 레이크하우스

OLTP와 OLAP는 처리할 업무의 성격을, 데이터 웨어하우스와 데이터 레이크, 레이크하우스는 데이터를 저장하고 관리하는 방식을 설명한다. 두 분류를 같은 축으로 보지 않는다.

- **데이터 웨어하우스**는 정제된 데이터를 SQL과 BI 분석에 제공하는 데 초점을 둔다.
- **데이터 레이크**는 다양한 형태의 원본 데이터를 저장하고 분석과 ML에 활용하는 기반이다. 파일이 존재한다는 사실만으로 품질과 사용 권한이 정해지지는 않는다.
- **레이크하우스**는 레이크의 데이터에 테이블 관리와 분석 기능을 결합해 BI와 ML이 공통 데이터 기반을 활용하도록 하는 아키텍처다. 레이크와 웨어하우스 사이의 중복 복사와 별도 관리 부담을 줄이려는 접근이다.

2026-10-09 Databricks 공식 문서 대조 기준, 해당 구현은 Delta Lake의 ACID 트랜잭션과 스키마 검증, Unity Catalog의 접근 통제와 계보 관리, 저장소와 분리된 Spark 연산을 조합한다. 이는 한 구현의 구성이지 모든 레이크하우스가 같은 제품을 사용해야 한다는 뜻은 아니다.

설계 판단에서는 ACID 지원과 OLTP 적합성을 구분한다. 주문, 결제 DB를 대체할지는 단건 처리 지연, 동시 쓰기, 제약 조건과 장애 복구 요구로 따로 평가한다. 분석팀과 ML팀이 같은 저장소를 읽더라도 서로 다른 정제 단계나 갱신 시점을 선택할 수 있으므로 지표 정의, 읽는 테이블과 데이터 시점을 맞춘다.

이 절은 분석 데이터 통합 방식의 구분을 보강한다. 기존 제품별 트랜잭션 지원 범위를 다시 검증한 것은 아니다.

### 레이크하우스의 제어, 연산과 저장 경계

분석 데이터를 통합해도 서비스 제어와 실제 연산, 저장 위치는 별개다. 2026-10-09 Databricks on AWS 공식 문서 기준, control plane은 웹 애플리케이션과 관리형 백엔드를 제공하고 compute plane은 데이터를 처리한다. Classic compute는 고객의 AWS 계정에서 실행되고 serverless compute는 Databricks가 관리하는 compute plane에서 실행된다. 이 구분을 모든 레이크하우스 제품의 공통 배포 구조로 일반화하지 않는다.

Unity Catalog의 external location은 저장소 경로와 storage credential을 연결한다. 기존 파일을 external table로 등록하는 것은 그 파일을 가리키는 메타데이터와 접근 경계를 만드는 작업이며, 원본 전체를 control plane으로 이전하는 작업과 다르다. 반면 쿼리 결과, 캐시와 작업 로그 같은 파생 데이터는 별도로 저장될 수 있다. 원본 위치만 확인해 모든 데이터가 같은 곳에 남는다고 판단하지 않는다.

운영 점검에서는 연산이 실행되는 계정, 원본과 파생 데이터의 저장 위치, Unity Catalog 권한과 저장소 직접 접근 권한을 따로 확인한다. 특히 managed table의 저장소에 별도 주체가 직접 접근하면 Unity Catalog의 접근 통제와 감사 경로를 우회할 수 있다. Plane 분리는 최소 권한 설정이나 실제 접근 검증을 대신하지 않는다.

이 절은 AWS 배포와 저장소 연결 문서의 부분 대조이며 실제 워크스페이스의 보안이나 제품별 OLTP 적합성을 시험한 결과는 아니다.

### 레이크하우스의 거버넌스 계층

레이크하우스에서 분석 데이터를 한곳에 모으는 것과 누가 어떤 자산을 쓸 수 있는지 관리하는 것은 별개의 문제다. 2026-10-11 Databricks on AWS 공식 문서 대조 기준, Unity Catalog는 Databricks에 내장된 데이터와 AI 거버넌스 계층이며 관리할 자산을 권한 부여 대상인 securable object로 다룬다. 테이블과 볼륨의 파일은 클라우드 객체 저장소에 있고, managed 테이블과 볼륨은 Unity Catalog가 거버넌스와 함께 저장 위치와 파일 수명주기까지 맡으며 external 테이블과 볼륨은 거버넌스만 맡는다. Apache 2.0 라이선스의 오픈소스 구현도 있지만 이 절은 Databricks 문서 기준이며 두 구현의 기능 범위가 같다고 가정하지 않는다.

- **메타스토어와 이름 체계**: 메타스토어는 최상위 securable object이고 한 클라우드 리전 범위다. 조직이 운영하는 리전마다 메타스토어를 두고 같은 리전의 여러 워크스페이스에 연결한다. 테이블, 뷰, 테이블 형식이 아닌 파일(정형, 반정형, 비정형)을 다루는 볼륨, 함수와 모델은 `catalog.schema.object` 3단계 이름을 쓴다. 예를 들어 `sales.gold.orders`는 sales 카탈로그의 gold 스키마에 있는 orders 테이블이다. storage credential, external location, connection 등은 메타스토어 바로 아래에 둔다.
- **외부 데이터 연결**: Lakehouse Federation은 외부 데이터베이스나 카탈로그를 Unity Catalog의 foreign catalog로 등록해 데이터를 옮기지 않고 테이블 단위 권한 아래에서 조회하게 한다. JDBC로 외부 데이터베이스에 쿼리를 내려보내는 query federation과, 외부 카탈로그의 테이블을 객체 저장소에서 Databricks 연산으로 직접 읽는 catalog federation이 있다. 쿼리는 기본적으로 읽기 전용이며, 워크스페이스의 legacy Hive metastore를 catalog federation으로 연결한 foreign table만 예외로 쓰기를 지원한다.
- **권한**: 객체 소유자가 아닌 사용자나 그룹은 작업에 필요한 권한을 명시적으로 받아야 한다. 카탈로그나 스키마에 준 권한은 현재와 이후에 생길 하위 객체에 상속되지만, 테이블을 읽으려면 `SELECT`와 함께 상위 카탈로그의 `USE CATALOG`와 스키마의 `USE SCHEMA`가 모두 필요하다. 메타스토어에 준 권한은 `READ METADATA`를 빼면 하위로 상속되지 않고, 소유권도 하위로 상속되지 않는다. 상위 객체 소유자는 하위 객체를 관리할 수 있지만 하위 객체의 데이터를 쓰려면 권한을 따로 받아야 한다. 권한 외에 행과 열 필터, 속성 기반 정책도 접근 통제에 쓴다.
- **계보**: 테이블이 메타스토어에 등록되어 있고 쿼리가 Spark DataFrame이나 Databricks SQL 인터페이스를 쓸 때 계보를 수집하며, 컬럼 수준은 가능한 범위에서만 남는다. 경로로 참조한 원본이나 대상은 컬럼 계보가 남지 않고 UDF는 테이블 수준 계보만 남는다. RDD와 global temp view는 수집되지 않으며 이름을 바꾼 객체의 계보는 보존되지 않는다. Databricks 밖 시스템의 자산은 external metadata 객체로 추가하고 관계를 설정해야 계보에 나타난다.
- **감사**: 데이터 접근과 시스템 활동은 감사 로그 시스템 테이블 `system.access.audit`(Public Preview)에 기록된다. Unity Catalog 이벤트는 계정 수준으로 남아 `workspace_id`가 0으로 기록되고 요청한 워크스페이스는 `request_params.workspace_id`에 남으며, 테이블용 임시 자격 증명 발급 이벤트(`generateTemporaryTableCredential`)로 누가 언제 무엇을 조회했는지, `updatePermissions`로 securable object의 권한 변경을 확인한다.
- **발견**: 자산은 Catalog Explorer, SQL, CLI와 REST API로 다룬다. 워크스페이스 검색은 테이블과 컬럼의 이름과 설명(comment), 테이블과 뷰의 태그 키로 자산을 찾으며, Unity Catalog에 등록된 테이블 중 볼 권한이 있는 객체만 결과에 나온다.

이 기능들이 클라우드 저장소의 파일을 자동으로 모두 관리하지는 않는다. 검색과 계보는 등록된 테이블을 기준으로 한다. managed 자산의 저장소에 직접 접근하면 위 절에서 본 접근 통제와 감사 우회에 더해 계보에도 남지 않고, external 테이블도 외부 시스템이 파일에 직접 접근하면 Unity Catalog 권한이 적용되지 않는다. 따라서 어떤 경로를 테이블, 볼륨이나 external location으로 등록할지, 그룹별 권한과 저장소 직접 접근 차단은 관리자가 설계하고 점검해야 한다. AWS에서는 Glue Data Catalog가 메타데이터를 담고 [[Lake-Formation|AWS Lake Formation]]이 S3 데이터 레이크와 그 메타데이터에 대한 세밀한 접근 권한을 맡아 이 계층의 역할을 나눠 맡으며, 권한 모델과 지원 엔진이 Unity Catalog와 같다고 가정하지 않는다.

이 절은 Unity Catalog 문서의 부분 대조다. 공식 문서가 함께 나열하는 데이터 분류, 품질 모니터링, 데이터 공유와 AI 거버넌스는 다루지 않았고, 실제 워크스페이스에서 권한 상속과 계보 수집을 시험한 결과도 아니다.

## 부적합 시그널

### OLTP DB로 분석을 돌리고 있는 신호
- 대시보드 쿼리가 분 단위로 느려짐, 타임아웃 발생
- 인덱스를 늘려도 한계 (행 풀스캔이라 인덱스로 해결 안 됨)
- 분석 쿼리 하나가 다른 트랜잭션을 막음 (CPU/락 경합)
- 대용량 적재 중 운영 트래픽 영향

### OLAP DB로 OLTP를 흉내내는 신호
- 단건 조회가 오히려 느림 (행 재조합 비용)
- 단건 INSERT 반복으로 파트 폭증 / 머지 폭주
- UPDATE/DELETE가 빈번해서 분석 결과가 신뢰 불가
- 트랜잭션, 외래키 제약이 필요한데 흉내내려 함

이런 시그널이 나오면 query, schema와 자원 격리를 먼저 측정하고 read replica, 별도 분석계, column index나 HTAP 도입을 비교한다. 항상 DB를 추가해야 하는 것은 아니다.

## 면접 체크포인트

- OLTP와 OLAP의 워크로드 차이와 설계 철학 차이
- 저장 구조(행 vs 열)가 워크로드 차이에서 자연스럽게 도출되는 이유
- 한 DB로 둘 다 처리하려고 할 때 발생하는 구체적 문제
- OLTP + OLAP를 분리하고 연결하는 표준 구조(CDC → Kafka → OLAP)
- 분석용 시점 일관성을 위한 SCD Type 2의 역할
- 분석 제품별 transaction, snapshot과 consistency 보장 차이
- 분리형 CDC 구조와 HTAP의 격리, freshness, 운영 복잡도 tradeoff
- 레이크하우스 거버넌스 계층(예: Unity Catalog)의 권한 상속과 USE 권한, 등록하지 않은 경로와 저장소 직접 접근이 통제 밖에 남는 이유

## 출처
- [Databricks — High-level architecture](https://docs.databricks.com/aws/en/getting-started/high-level-architecture)
- [Databricks — Connect to cloud object storage using Unity Catalog](https://docs.databricks.com/aws/en/connect/unity-catalog/cloud-storage/)
- [Databricks — What is a data lakehouse?](https://docs.databricks.com/aws/en/lakehouse/)
- [Databricks — What is Unity Catalog?](https://docs.databricks.com/aws/en/data-governance/unity-catalog/)
- [Databricks — Unity Catalog securable objects reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/securable-objects)
- [Databricks — Create a Unity Catalog metastore](https://docs.databricks.com/aws/en/data-governance/unity-catalog/create-metastore)
- [Databricks — Managed versus external assets in Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/managed-versus-external)
- [Databricks — Unity Catalog permissions model concepts](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control/permissions-concepts)
- [Databricks — Connect to external databases and catalogs](https://docs.databricks.com/aws/en/query-federation/)
- [Databricks — What is query federation?](https://docs.databricks.com/aws/en/query-federation/database-federation)
- [Databricks — What are Unity Catalog volumes?](https://docs.databricks.com/aws/en/volumes/)
- [Databricks — Lineage in Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/data-lineage)
- [Databricks — Audit log system table reference](https://docs.databricks.com/aws/en/admin/system-tables/audit-logs)
- [Databricks — Audit log reference](https://docs.databricks.com/aws/en/admin/account-settings/audit-logs)
- [Databricks — Search for workspace objects](https://docs.databricks.com/aws/en/search/)
- [Databricks — Work with external tables](https://docs.databricks.com/aws/en/tables/external)
- [Unity Catalog](https://www.unitycatalog.io/)
- [NHN Cloud Meetup — MySQL 3분 vs ClickHouse 0.3초, 같은 쿼리입니다](https://meetup.nhncloud.com/posts/414)
- [ClickHouse — Transactional support](https://clickhouse.com/docs/guides/developer/transactional)
- [VLDB — TiDB: A Raft-based HTAP Database](https://www.vldb.org/pvldb/vol13/p3072-huang.pdf)
- [YouTube, 현수IT HyunsooIT, 처음부터 이해하는 Databricks Ep3. Unity Catalog와 데이터 관리](https://www.youtube.com/watch?v=fUyMzEUXO3g)

## 관련 문서
- [[ClickHouse|ClickHouse]]
- [[CDC-Debezium|CDC, Debezium]]
- [[SCD-Type2|SCD Type 2]]
- [[RDBMS|RDBMS (OLTP)]]
- [[MQ-Kafka|Kafka]]
- [[Lake-Formation|AWS Lake Formation]]
- [[SageMaker-Catalog-Discovery|SageMaker Catalog의 메타데이터와 데이터 탐색]]
