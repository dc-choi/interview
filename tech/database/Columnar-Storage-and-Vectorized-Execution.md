---
tags: [database, olap, duckdb, columnar-storage, vectorized-execution, embedded-database]
status: done
verified_at: 2026-11-13
category: "데이터&저장소(Data&Storage)"
aliases: ["Columnar Storage and Vectorized Execution", "컬럼 저장과 벡터화 실행", "임베디드 OLAP"]
---

# 컬럼 저장과 벡터화 실행

분석 쿼리의 속도는 SQL 문법보다 데이터를 어떻게 저장하고 어떤 단위로 계산하는지에서 갈린다. 저장 쪽의 답이 컬럼 저장이고 실행 쪽의 답이 벡터화 실행이다. 아래 수치와 동작은 DuckDB 2.0 문서를 기준으로 하며, 원리 자체는 다른 컬럼형 분석 엔진에도 적용된다. 워크로드 구분은 [[OLTP-vs-OLAP|OLTP vs OLAP]], 엔진 선택 지도는 [[Query-Engine-Execution|쿼리 엔진]]에서 다룬다.

## 왜 운영 DB의 집계가 느린가

행 저장 엔진은 한 행의 모든 열을 페이지에 붙여 둔다. 주문 한 건을 읽고 쓰는 일에는 최적이지만, 30개 열 중 날짜와 금액 두 열만 쓰는 월별 매출 집계도 나머지 열이 담긴 페이지를 함께 읽는다. 전통적인 반복자(Volcano) 실행은 연산자가 아래 연산자에게 한 행씩 요청하므로, 행마다 함수 호출과 분기가 붙어 실제 덧셈보다 제어 비용이 커진다. 이 부하가 주문 트랜잭션과 같은 버퍼와 CPU를 두고 경쟁하면 집계 하나가 서비스 지연으로 번진다.

읽기 복제본은 부하를 분리할 뿐 저장 구조를 바꾸지 않는다. 복제본도 행 저장이면 집계는 여전히 불필요한 열을 읽는다.

## 저장: 필요한 열만, 작게 읽기

| 기법 | 줄이는 것 | 효과가 커지는 조건 |
|---|---|---|
| 열 단위 저장과 열 가지치기 | 읽을 열의 수 | 열이 많고 쿼리는 몇 개만 쓰는 이벤트, 로그, 피처 테이블 |
| 경량 압축 | 읽을 바이트 | 같은 열의 값은 타입과 분포가 비슷하다 |
| min/max 통계로 블록 건너뛰기 | 읽을 블록 수 | 필터 열 기준으로 정렬되거나 시간순으로 적재된 데이터 |

DuckDB는 테이블을 행 묶음(row group)으로 자르고, 그 안에서 열별로 저장한다. 기본 row group 크기는 122,880행이다. Row group은 스레드가 나눠 맡는 병렬 스캔 단위가 된다.

DuckDB 2.0 문서가 나열하는 압축 알고리즘은 Constant, RLE, Bit Packing, Frame of Reference, Dictionary, FSST(문자열), ALP, Chimp, Patas(부동소수점)와 Zstd다. 2022년 압축 설계 글 기준으로는 열의 세그먼트마다 데이터를 훑어 가장 맞는 알고리즘을 자동으로 고른다. 2.0 문서 기준으로는 기본적으로 파일에 저장하는 데이터베이스에만 압축을 적용하고 인메모리 인스턴스에는 적용하지 않는다. 쓸 수 있는 알고리즘은 저장 형식 버전에 따라 다르다. 2022년 압축 설계 글은 해제가 빠른 경량 압축을 자동으로 써서 디스크 입출력을 줄이면서 CPU 부담을 키우지 않는 방향을 설명했는데, 2.0 목록에는 범용 코덱인 Zstd도 들어 있으므로 모든 열이 경량 압축만 쓴다고 보지 않는다.

Min/max 건너뛰기는 블록마다 열의 최솟값과 최댓값을 두고 필터 범위와 겹치지 않는 블록을 읽지 않는 방식이다. 값이 블록마다 뒤섞여 있으면 모든 블록의 범위가 넓어져 건너뛸 블록이 거의 없다. 그래서 적재 순서와 정렬 설계가 곧 필터 성능이 된다. DuckDB 2.0 문서 기준, 일반 데이터 타입의 열에는 zonemap(min-max index)이 자동으로 만들어지고, 필터 값이 min-max 범위에 들지 않는 row group을 건너뛴다. 문서도 열 안의 데이터가 정렬되어 있을수록 zonemap의 가치가 커진다고 적는다. Parquet를 읽을 때의 같은 동작은 [[Query-Engine-Execution#DuckDB의 부분 읽기|DuckDB의 부분 읽기]]에 있다.

## 실행: 한 행이 아니라 한 묶음

DuckDB는 열 단위 벡터화 실행 엔진이며, 데이터 묶음(DataChunk)을 연산자 트리로 밀어 넣는 push 방식을 쓴다. 기본 벡터 크기(`STANDARD_VECTOR_SIZE`)는 2048개 값이고 읽기 전용 설정이다.

DuckDB 문서가 직접 밝히는 이점은 값을 묶음으로 처리해 행 단위 해석의 오버헤드를 크게 줄인다는 데까지다. 아래는 벡터화 실행의 일반 원리이며, DuckDB가 2048을 고른 설계 근거로 인용하지 않는다.

- 호출 한 번에 묶음 전체를 처리하므로 함수 호출과 분기 비용이 그만큼 나뉜다.
- 한 열의 값이 연속 배열로 놓여 CPU 캐시와 prefetch가 잘 맞는다.
- 타입이 고정된 단순 루프가 되어 컴파일러가 SIMD 명령을 적용하기 쉽다.
- 묶음이 너무 작으면 호출 비용이 남고 너무 크면 캐시를 넘을 수 있으므로 크기는 둘 사이의 절충이다.

Why DuckDB 페이지는 병렬화가 morsel 기반이라고 적는다. 입력을 작은 조각으로 나눠 스레드가 가져가 처리하고, 집계는 스레드별 부분 결과를 만든 뒤 합친다는 세부 흐름은 강의 설명이며 공식 문서로 대조하지 않았다. 정렬이나 해시 테이블 구축처럼 입력이 모두 끝나야 다음 단계로 갈 수 있는 지점에서는 대기가 생긴다.

## 임베디드 구조의 이득과 대가

DuckDB의 기본 배치는 별도 프로세스 없이 애플리케이션 프로세스 안에 라이브러리로 들어가는 임베디드다. 2.0은 Quack 프로토콜로 서버와 클라이언트 구성도 제공하지만, 이 절은 임베디드 배치만 다루며 Quack 구성의 운영 특성은 검증하지 않았다. 임베디드에서는 소켓 왕복과 결과 직렬화가 없고, Python에서는 보이는 범위의 pandas DataFrame을 변수 이름으로 바로 조회할 수 있다(replacement scan, `SET python_enable_replacements = false;`로 끌 수 있다). 라이선스는 MIT다.

```python
import duckdb
import pandas as pd

orders = pd.DataFrame({"region": ["KR", "KR", "JP"], "amount": [100, 250, 80]})
duckdb.sql("SELECT region, sum(amount) FROM orders GROUP BY region").df()
```

임베디드로 쓰면 서버가 하던 일도 없다.

| 항목 | DuckDB 2.0 문서 기준 동작 | 운영 판단 |
|---|---|---|
| 동시성 | 읽기와 쓰기는 한 프로세스만 열 수 있고, 여러 프로세스는 읽기 전용으로만 연다. 한 프로세스 안의 여러 스레드는 MVCC와 낙관적 동시성 제어로 함께 쓸 수 있으며, 두 스레드가 같은 행을 동시에 고치면 충돌한다 | 여러 서비스가 한 파일에 동시에 쓰는 구조에는 맞지 않는다. 문서는 다중 프로세스 쓰기 경로로 Quack 프로토콜이나 PostgreSQL 카탈로그를 쓰는 [[DuckLake|DuckLake]]를 안내한다 |
| 자원 경쟁 | `memory_limit` 기본값은 RAM의 80%, `threads` 기본값은 CPU 코어 수다 | 애플리케이션과 같은 프로세스의 자원을 나눠 쓰므로 두 값을 의도적으로 정한다 |
| 장애 격리 | 엔진이 프로세스 안에 있다 | 프로세스가 죽으면 엔진도 함께 멈춘다 |

## 맞는 자리와 맞지 않는 자리

맞는 자리의 공통 조건은 읽기 중심 집계, 한 프로세스나 소수 작업자, 한 머신에 들어오는 데이터다.

- 노트북이나 단일 서버의 로컬 분석
- Parquet와 CSV를 직접 읽어 변환하고 다시 쓰는 파일 기반 ETL
- 애플리케이션 안에 넣는 집계 화면과 리포트
- 파이프라인 중간의 검증 단계

조건이 깨지면 선택도 바뀐다. 한 건씩 수시로 읽고 쓰는 주문과 결제는 행 저장 엔진이 맞고, 여러 사용자의 동시 쓰기와 권한, 세션 관리가 필요하면 서버형 DB가 맞으며, 한 머신을 크게 넘는 데이터는 분산 웨어하우스나 Spark 계열을 검토한다. `SELECT *`로 모든 열을 읽거나 한 행씩 `INSERT`를 반복하는 습관은 컬럼 저장과 벡터화의 이점을 스스로 지운다.

## 2.0 LTS로 올리기 전 확인

DuckDB 2.0.0은 2026-10-21 LTS로 나왔고, 발표문은 최소 2027년 10월까지의 지원을, 릴리스 일정표는 지원 종료일을 2027-10-22로 적는다. 일정표 기준 LTS의 커뮤니티 지원 기간은 현재 출시 후 1년이다. LTS는 수정과 패치를 이어 가겠다는 지원 정책이지, 모든 워크로드의 안전을 보증하지 않는다.

- **저장 형식**: 발표문은 2.0이 기존 데이터베이스 파일을 그대로 읽고 쓰며, 그 파일은 이전 버전에서도 읽힌다고 한다. 그러나 2.0이 새로 만드는 파일은 기본으로 v2.0.0 저장 형식이고, 이 형식의 파일은 2.0 이전 버전이 읽지 못한다. 2.0 프로세스가 파일을 새로 만드는 순간 이전 버전으로의 롤백과 공유 경로가 닫히므로, 이전 버전과 파일을 나눠 써야 하면 저장 형식 버전을 명시하는 방법을 Storage 문서에서 확인한다.
- **같은 파일을 여는 도구**: CLI, Python 같은 각 바인딩은 자기 엔진을 포함한다. 같은 파일을 여는 모든 도구와 바인딩이 2.0과 그 저장 형식을 지원하는지 확인한다. 발표문도 여러 DuckDB 프로세스를 쓰는 복잡한 배치는 더 주의하라고 적는다.
- **변경점**: 함수 동작, 기본 설정과 확장 호환성의 변화가 기존 SQL의 결과를 조용히 바꿀 수 있다.
- **리허설**: 발표문은 shadow 시스템에서 2.0.0을 먼저 시험하고, 중요한 워크로드는 11월로 예고된 첫 패치 릴리스를 기다리는 선택지를 권한다(2026-10-21 발표 기준). 2026-11-13 확인한 일정표는 2.0.1을 2026-11-18로 잠정 표기한다. 사본 파일로 업그레이드해 쿼리 결과의 행 수와 집계값을 대조한다. 커뮤니티 논의는 쟁점을 찾는 단서로만 쓰고, 결론은 공식 문서와 자기 데이터로 확인한다.

## 학습 범위

2026-10-30 공개된 34분 강의 영상의 음성 인식 전사문을 전부 읽고, 행 저장과 컬럼 저장, 압축, 블록 건너뛰기, 벡터화 실행, 임베디드 구조와 도입 판단을 학습했다. 기본값, 압축 목록, 동시성, 설정과 2.0 LTS 내용은 아래 DuckDB 공식 문서로 대조했고, 문서에서 확인하지 못한 화면의 코드와 도표는 쓰지 않았다. DuckDB를 실행해 성능을 측정하지 않았다.

## 출처

- [컬럼 저장과 벡터화를 모르면 DuckDB 2.0도 느려진다 — 길리랩](https://www.youtube.com/watch?v=rqbiXkPTjz0) — 2026-10-30 공개, 2026-11-13 전사문 전체 확인
- [DuckDB, Storage](https://duckdb.org/docs/2.0/internals/storage.html) — 압축 알고리즘, 저장 형식 호환성
- [DuckDB, Vector](https://duckdb.org/docs/2.0/internals/vector.html)
- [DuckDB, Indexing](https://duckdb.org/docs/2.0/guides/performance/indexing.html) — zonemap(min-max index)
- [DuckDB, Overview of DuckDB Internals](https://duckdb.org/docs/2.0/internals/overview.html)
- [DuckDB, Concurrency](https://duckdb.org/docs/2.0/connect/concurrency.html)
- [DuckDB, Configuration](https://duckdb.org/docs/2.0/configuration/overview.html) — `memory_limit`, `threads`, `standard_vector_size`
- [DuckDB, Tuning Workloads](https://duckdb.org/docs/2.0/guides/performance/how_to_tune_workloads.html) — row group 122,880행
- [DuckDB, Data Ingestion (Python)](https://duckdb.org/docs/2.0/clients/python/data_ingestion.html) — DataFrame 이름 조회
- [DuckDB, Why DuckDB](https://duckdb.org/why_duckdb)
- [DuckDB, Release Calendar](https://duckdb.org/release_calendar)
- [Announcing DuckDB 2.0.0 LTS — DuckDB](https://duckdb.org/2026/10/21/announcing-duckdb-200.html)
- [Lightweight Compression in DuckDB — DuckDB](https://duckdb.org/2022/10/28/lightweight-compression.html) — 세그먼트별 알고리즘 선택

## 관련 문서

- [[OLTP-vs-OLAP|OLTP vs OLAP]]
- [[Query-Engine-Execution|쿼리 엔진]]
- [[DuckLake|DuckLake]]
- [[ClickHouse|ClickHouse]]
