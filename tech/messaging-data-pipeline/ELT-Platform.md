---
tags: [data-pipeline, elt, airflow, platform-engineering, spark]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["ELT Platform", "셀프서비스 데이터 파이프라인 플랫폼", "셀프서비스 ELT"]
---

# ELT 플랫폼 (셀프서비스 데이터 파이프라인)

## ELT vs ETL

ELT는 추출(Extract) → 적재(Load) → 변환(Transform) 순서로, 원천 데이터를 먼저 데이터 웨어하우스(DWH)에 그대로 적재한 뒤 웨어하우스의 연산으로 변환한다. ETL은 적재 전에 변환을 끝낸다. 차이의 본질은 변환을 어디서 하느냐다.

- ETL: 파이프라인(중간 엔진)에서 변환 → 적재량은 줄지만 변환 로직이 파이프라인에 묶임
- ELT: DWH(BigQuery, Snowflake 등) 안에서 SQL로 변환 → 원본 보존, 변환을 나중에 자유롭게 재정의

클라우드 DWH가 저장과 연산을 분리하고 SQL 기반 변환 생태계를 제공하면서 ELT 선택이 쉬워졌다. 그렇다고 원천을 무조건 모두 복제하는 것이 기본은 아니다. 비용, PII와 보존 정책에 따라 앞단에서 column/row를 제한하고 변환 위치를 정한다.

## 문제: 정의와 실행의 강결합

데이터 파이프라인을 코드로만 관리하면 파이프라인 정의(어느 테이블을 어디로)와 실행 코드가 한 레포에 섞인다. 그 결과:

- 테이블 하나 추가에도 PR과 코드리뷰가 필요 → 플랫폼팀이 병목
- 수백 개 파이프라인의 현재 상태를 한눈에 볼 방법이 없음(코드를 읽어야 앎)
- 파이프라인을 쓰려는 서비스팀이 복잡한 코드베이스를 학습해야 함(진입장벽)

규모가 수십 개를 넘어가면 이 강결합이 플랫폼팀의 리뷰 큐로 모든 변경을 통과시키는 구조적 한계가 된다.

## 핵심 설계: 정의와 실행을 DSL로 분리

해법은 무엇을(정의)과 어떻게(실행)를 중간 계약(contract)으로 끊는 것이다.

웹 UI(설정) → JSON DSL(객체 스토리지) → 실행 엔진

- 사용자는 UI에서 원천 DB, 대상 테이블, 필터, 병렬도 등을 설정 → JSON DSL로 직렬화되어 S3 등에 저장
- 실행 엔진은 코드가 아니라 이 DSL을 읽어 동작
- DSL이 단일 진실 공급원(SSoT) → 상태를 코드 읽지 않고 조회/검색 가능, 서비스팀 셀프서비스 가능

이게 플랫폼 엔지니어링의 핵심 패턴이다. 반복되는 작업을 선언적 설정으로 추상화하고, 플랫폼팀은 엔진만 유지보수한다.

## 동적 DAG 생성 (Dynamic DAG Generation)

DSL 기반 실행을 Airflow로 구현할 때 쓰는 기법. DAG를 파일마다 손으로 쓰지 않고, 외부 설정(DSL 목록)을 읽어 런타임에 DAG 객체를 프로그램으로 생성한다.

- Synchronizer DAG가 주기적으로(예: 10분) 설정 저장소를 스캔 → 새 DSL을 발견하면 대응 DAG를 생성/갱신
- N개 파이프라인 = N개 `.py`가 아니라, 설정 N개 → 생성기 1개

주의: 동적 생성은 [[Airflow-DAG-Parsing|DAG 파싱 비용]]과 직결된다. 생성 로직이 top-level에서 매 파싱마다 외부 저장소를 조회하면 파싱 사이클이 폭증한다. 설정 스냅샷 캐싱과 파싱 주기 조정이 필요하다.

## DB → DWH 대량 복제 전략

원천(MySQL, PostgreSQL)에서 DWH로 데이터를 옮기는 두 축:

- 스냅샷/배치 sync: 주기적으로 테이블을 통째로(또는 증분 키 기준) 읽어 적재. 단순하고 정합성 추론이 쉬움. 주기 사이 지연(분 단위)이 존재
- CDC: 원천의 변경 로그(binlog 등)를 스트리밍해 실시간 반영. 지연은 낮지만 운영 복잡도가 높음 → [[CDC&Outbox|CDC]]

큰 table을 단일 connection으로 scan하면 완료 시간이 길 수 있어 Spark JDBC 범위 병렬화를 검토한다. `partitionColumn`은 numeric, date 또는 timestamp column이어야 하고 `lowerBound`, `upperBound`는 filter가 아니라 partition stride를 정한다. `numPartitions`는 동시 JDBC connection 상한이기도 하므로 source DB의 pool, CPU와 I/O 예산 안에서 정한다. 범위 분포가 치우치면 task skew가 생기며 병렬 query 사이 snapshot 시점도 달라질 수 있다. 자세한 안전 조건은 [[Stream-and-Batch-Processing|스트림과 배치 처리]]에서 다룬다.

## 재실행과 데이터 품질을 별도로 검증한다

복제 작업의 성공 상태만으로 분석에 쓸 데이터가 준비됐다고 판단하지 않는다. 재시도해도 같은 결과를 만드는 조건과 적재 결과의 품질 조건을 나눠 확인한다. 아래 Airflow와 AWS Glue의 동작 및 검사 유형은 2026-10-07 공식 문서 대조 기준이다.

- **입력 구간 고정**: 재시도 때마다 최신 데이터를 다시 읽지 않고 같은 논리 구간이나 파티션을 읽는다. Airflow에서는 `data_interval_start`를 파티션 기준으로 쓸 수 있다. 다만 같은 파티션의 원본이 수정되면 결과도 달라질 수 있으므로 재현이 필요할 때는 입력 버전이나 스냅샷까지 고정한다.
- **중복 적재 방지**: 재실행 시 단순 `INSERT`가 행을 중복 생성할 수 있다. 키 기반 `UPSERT` 같은 멱등 쓰기를 검토하고, 태스크 실패 후 부분 결과가 완료 데이터처럼 노출되지 않는지 확인한다. 중복 제거의 키와 원자성은 [[Idempotent-Consumer|멱등 처리]]와 함께 설계한다.
- **결과 검사**: 적재 뒤 대상 파티션 존재와 내용 검사를 후속 작업으로 둔다. AWS Glue DQDL에는 `ColumnExists`, `Completeness`, `Uniqueness`, `RowCount`, `DataFreshness`처럼 서로 다른 품질 항목을 검사하는 규칙이 있다. 하나의 검사 통과로 나머지 품질까지 보장하지 않는다.

예를 들어 일별 주문 복제에서는 동일한 입력 구간을 두 번 처리한 뒤 주문 키 중복, 필수값 누락과 기대 건수를 확인할 수 있다. 원천과 대상의 건수를 비교할 때는 필터, 삭제와 중복 제거 조건부터 맞춘다. 검사 실패 시 후속 집계를 막을지, 문제 행을 격리할지는 데이터 사용 목적에 맞춰 정할 운영 정책이다.

이 절은 재실행과 품질 확인 조건만 보강한다. 기존 플랫폼 구축 사례 전체를 재검증한 것은 아니다.

## Build vs Buy (자체 구축 vs OSS/SaaS)

Airbyte, Fivetran 같은 기성 커넥터 솔루션이 있는데 왜 자체 구축하나:

- 수십억 row 테이블의 sync 시간이 기성 도구로는 과도
- 파티션 병렬화, 리소스(Executor 수와 메모리) 세밀 조정이 막힘
- 외부 의존도와 비용을 줄이고 자사 인프라(EKS, BigQuery)에 최적화

트레이드오프: 자체 구축은 초기와 유지 비용을 떠안는 대신, 규모 한계와 튜닝 자유도를 얻는다. 작은 규모에서는 기성 도구의 connector 유지보수와 운영 기능이 자체 구축보다 유리할 가능성이 크다. 자체 구축은 측정된 제약이 있고 장기 소유 비용을 감당할 팀이 있을 때 선택한다.

## 보안: PII 컬럼 자동 제외

원천을 통째로 복제하면 개인식별정보(PII)가 DWH로 새기 쉽다. DSL 단계에서 PII 컬럼을 자동 제외(`dropColumn`)하면 복제 자체가 데이터 거버넌스 경계가 된다. 설정이 계약이므로 어떤 컬럼이 빠지는지 코드 없이 감사할 수 있다.

## 사례: 에이전트 기반 대량 마이그레이션

기존 코드 정의 수백 개를 새 DSL로 옮길 때, 자동 추출이 안 되는 정의를 코딩 에이전트 여러 개를 병렬로 돌려 짧은 기간에 전환하는 패턴. 핵심은 충돌 방지다. 공유 레지스트리(예: 테이블의 한 행)를 작업 단위로 잠가 여러 에이전트가 같은 대상을 중복 처리하지 않게 한다. 대량 반복 변환에 일반화 가능한 기법으로, 작업 큐와 멱등 처리, 워커 락의 조합이다.

## 면접 체크포인트

- 파이프라인이 늘어 플랫폼팀이 병목 → 정의와 실행을 분리하고 정의를 선언적 DSL로 빼 셀프서비스화하는 플랫폼 사고
- ELT vs ETL을 변환을 어디서 하느냐(파이프라인 vs DWH)로 설명, 클라우드 DWH 비용 하락이 ELT를 기본값으로 만든 맥락
- 대량 테이블 복제 병목 = 단일 스캔 → JDBC 파티셔닝으로 병렬화 (왜 Spark인가)
- Build vs Buy를 규모로 판단 — 기성 도구가 우리 규모에서 깨지는 지점이 자체 구축의 손익분기
- 동적 DAG 생성과 [[Airflow-DAG-Parsing|파싱 비용]]의 트레이드오프 연결

## 출처

- [당근 200개 DB를 옮기는 ELT 플랫폼(DT Platform)을 만든 이야기 — 당근 기술 블로그](https://medium.com/daangn/%EB%8B%B9%EA%B7%BC-200-%EA%B0%9C-db-%EB%A5%BC-%EC%98%AE%EA%B8%B0%EB%8A%94-elt-%ED%94%8C%EB%9E%AB%ED%8F%BC-dt-platform-%EC%9D%84-%EB%A7%8C%EB%93%A0-%EC%9D%B4%EC%95%BC%EA%B8%B0-65a499b4967a)
- [Apache Spark Documentation, JDBC Data Source](https://spark.apache.org/docs/latest/sql-data-sources-jdbc.html)
- [Apache Airflow Documentation, Best Practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)
- [AWS Documentation, DQDL rule type reference](https://docs.aws.amazon.com/glue/latest/dg/dqdl-rule-types.html)

## 관련 문서

- [[메시징&파이프라인(Messaging&Pipeline)]] — 카테고리 인덱스
- [[Airflow-DAG-Parsing]] — 동적 DAG 생성의 파싱 비용
- [[CDC&Outbox]] — 스냅샷 sync의 실시간 대안
- [[Event-Driven-Architecture]] — 파이프라인을 둘러싼 아키텍처 결정
