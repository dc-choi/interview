---
tags: [infrastructure, aws, redshift, data-warehouse, olap, analytics, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["Redshift", "Amazon Redshift", "AWS Redshift", "데이터 웨어하우스", "Data Warehouse"]
---

# Amazon Redshift — 컬럼 기반 데이터 웨어하우스

PostgreSQL 기반의 **OLAP 전용 완전 관리형 데이터 웨어하우스**. PB 단위 데이터에 대해 표준 SQL, BI 도구로 복잡한 분석 쿼리를 빠르게 실행하도록 **MPP(Massively Parallel Processing) + 컬럼 스토리지**로 설계되었다.

## DW/ETL/BI 기본 개념

- **Data Warehouse(DW)**: 운영계 시스템에서 데이터를 추출, 변환, 통합해 분석용으로 적재한 통합 저장소. 관계형 DB가 데이터 저장은 잘하지만 분석 활용이 약한 점을 보완.
- **ETL(Extract, Transform, Load)**: 원천 데이터를 추출 → 변환 → DW에 적재하는 파이프라인.
- **BI(Business Intelligence)**: DW에 적재된 데이터를 분석, 리포팅해 숨겨진 패턴을 추출하는 도구 집합 (예: QuickSight, Tableau).
- **흐름**: 운영 DB → ETL → DW(Redshift) → BI(QuickSight) → 대시보드/리포트.

## 핵심 특징

- **PostgreSQL 호환**: JDBC/ODBC, 표준 SQL, psql 클라이언트 사용 가능. 단, OLAP 엔진이므로 트랜잭션, 단일 행 OLTP 부하에는 부적합.
- **MPP 엔진**: 쿼리를 다수 컴퓨팅 노드로 병렬 분산 실행 → 대용량 집계, 조인을 빠르게 처리.
- **컬럼(Column) 단위 저장**: 같은 컬럼의 값을 연속 저장 → 분석 쿼리(특정 컬럼만 읽기)에서 I/O 감소, 압축 효율 극대화.
- **WLM(Workload Management)**: 쿼리 큐별 우선순위, 동시성, 메모리 할당을 제어해 부하 관리.
- **Enhanced VPC Routing**: 클러스터의 COPY/UNLOAD 트래픽을 VPC 내부 경로로 강제 → 흐름 로그, SG, NACL로 모니터링, 통제.

## 클러스터 구성

- **클러스터(Cluster)**: Redshift의 운영 단위. **리더 노드 1개 + 컴퓨팅 노드 N개**.
- **리더 노드**: 클라이언트와 통신, 쿼리 파싱, 실행 계획 수립, 컴퓨팅 노드에 작업 분배, 결과 집계.
- **컴퓨팅 노드(Compute Node)**: 실제 데이터, 연산을 보유. 각 노드마다 전용 CPU, 메모리, 디스크 스토리지.
- **노드 슬라이스(Slice)**: 컴퓨팅 노드 내부에서 데이터, 메모리를 더 잘게 나눈 병렬 처리 단위.
- **Single-AZ만 지원** (Multi-AZ는 향후 제공 예정). HA가 필요하면 스냅샷 → 다른 리전, AZ에 신규 클러스터 복원.

## 노드 타입

| 타입 | 특성 | 용도 |
|---|---|---|
| **RA3** | 컴퓨팅과 스토리지 분리(RMS, Redshift Managed Storage). 노드 크기와 무관하게 S3 기반 스토리지로 확장 | 데이터 증가율이 높고 컴퓨팅과 별도로 스케일하고 싶을 때 (현행 권장) |
| **DC2** | 로컬 SSD에 데이터, 컴퓨팅 통합. 노드 늘리면 스토리지도 함께 증가 | 데이터셋이 작고(<1TB) 빠른 I/O가 필요할 때 |

## 분산 키, 정렬 키

- **DISTKEY (분산 키)**: 행을 어느 컴퓨팅 노드에 배치할지 결정.
  - `DISTSTYLE KEY`: 지정 컬럼 해시로 분산 (조인 컬럼 정렬용).
  - `DISTSTYLE ALL`: 모든 노드에 복제 (작은 차원 테이블).
  - `DISTSTYLE EVEN`: 라운드로빈 (기본값, 명확한 분산 기준 없을 때).
  - `DISTSTYLE AUTO`: Redshift가 자동 선택.
- **SORTKEY (정렬 키)**: 컴퓨팅 노드 내부에서 데이터를 어떤 컬럼 순으로 정렬해 저장할지 결정. 범위 조건(`WHERE date BETWEEN`)에서 블록 스킵으로 스캔량 감소.

## COPY, UNLOAD

- **COPY**: S3, EMR, DynamoDB, 원격 호스트(SSH) 등에서 **병렬 로드**. INSERT보다 수십~수백 배 빠름. SAA 단골 — 대량 적재는 항상 COPY.
- **UNLOAD**: Redshift 쿼리 결과를 **S3로 병렬 export**. Parquet/CSV 등 포맷 지원. 다운스트림(Spark, Athena 등)에 데이터 넘길 때 사용.

## Redshift Spectrum

- 데이터를 Redshift에 적재하지 않고 **S3에 그대로 둔 채 SQL로 직접 쿼리**.
- Glue Data Catalog의 외부 테이블 정의 사용. Parquet/ORC 같은 컬럼 포맷 권장.
- 컴퓨팅이 별도 Spectrum 노드 풀에서 실행되므로 클러스터 노드 부하와 독립.
- **활용**: Hot 데이터는 Redshift 내부 테이블, Cold/대용량 로그는 S3 + Spectrum으로 비용 최적화.

## Concurrency Scaling, Materialized View

- **Concurrency Scaling**: 동시 쿼리 폭주 시 임시 클러스터를 자동 추가해 부하 흡수. 일정 시간(매일 무료 1시간) 초과분만 과금.
- **Materialized View (MV)**: 자주 쓰이는 집계 결과를 사전 계산해 저장. `REFRESH MATERIALIZED VIEW`로 갱신. 대시보드성 반복 쿼리에서 응답 시간 대폭 단축.

## Cross-Region, Cross-Account 데이터 공유

- **Data Sharing (RA3 전용)**: 다른 클러스터, 계정, 리전과 **데이터 복사 없이** 라이브로 공유. Producer가 share 생성 → Consumer가 mount.
- ETL, 복제 없이 분석 환경 분리(예: 프로덕션 DW → 사내 분석팀 클러스터).

## 스냅샷과 백업

- **S3에 저장되는 증분 스냅샷**. 다른 클러스터로 복원 가능.
- **자동 스냅샷**: 8시간 또는 5GB 변경마다 자동 생성. 보존 1~35일.
- **수동 스냅샷**: 사용자가 직접 생성, 명시 삭제 전까지 무기한 보존.
- **Cross-Region Snapshot Copy**: 자동 복사 설정으로 DR 사이트에 즉시 클러스터 배포 가능.

## Redshift vs RDS/Aurora

| 항목 | Redshift | RDS / Aurora |
|---|---|---|
| 워크로드 | **OLAP** (분석, 보고) | **OLTP** (트랜잭션) |
| 목표 | 대용량 데이터셋 대상 복합 분석 쿼리 | 단일 행 트랜잭션, 짧은 응답 |
| 저장 방식 | 컬럼 기반 | 행(Row) 기반 |
| 스케일 | MPP(노드 추가) | 수직 + 읽기 복제본 |
| 데이터 규모 | PB급 | 수십 TB |

## Redshift vs Athena

| 항목 | Redshift | Athena |
|---|---|---|
| 운영 모델 | 클러스터(provisioned) 또는 Serverless | 완전 서버리스 |
| 데이터 위치 | 클러스터 내부 + Spectrum(S3) | S3에 직접 |
| 사용 시점 | 반복적, 복잡한 분석, BI 백엔드 | 임시 분석(ad-hoc), 로그 탐색 |
| 과금 | 노드 시간 + 스토리지 | 스캔한 데이터 양 |

## Redshift vs ClickHouse

| 항목 | Redshift | ClickHouse |
|---|---|---|
| 운영 | AWS 관리형 | OSS(자체) 또는 매니지드 |
| 엔진 | MPP + 컬럼 + PostgreSQL 호환 | MergeTree 기반 컬럼형, 자체 SQL 방언 |
| 강점 | AWS 생태계 통합, BI 친화 | 초고속 단순 집계, 실시간 대시보드 |

## 시험 체크포인트

- **OLAP, 분석 쿼리 = Redshift**, **OLTP, 트랜잭션 = RDS/Aurora**. 문제에서 "복잡한 분석 쿼리/PB급 데이터/BI" 키워드 → Redshift.
- **데이터를 S3에 그대로 두고 Redshift로 분석** → **Redshift Spectrum**.
- **다른 계정, 리전 사용자에게 데이터를 복사 없이 공유** → **Data Sharing (RA3)**.
- **S3, DynamoDB, EMR에서 대량 데이터를 빠르게 적재** → **COPY 명령**.
- **동시 쿼리 폭주 시 성능 유지** → **Concurrency Scaling**.
- **자주 쓰는 집계 쿼리 응답 시간 단축** → **Materialized View**.
- Redshift는 **Single-AZ**만 지원. HA, DR이 필요하면 **Cross-Region Snapshot Copy**.
- 노드 타입은 **RA3(컴퓨팅/스토리지 분리, 권장)**, **DC2(작은 데이터셋, 로컬 SSD)** 두 가지를 구분.

## 출처

- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[Athena]]
- [[RDS-Aurora]]
- [[S3]]
- [[OLTP-vs-OLAP]]
- [[ClickHouse]]
