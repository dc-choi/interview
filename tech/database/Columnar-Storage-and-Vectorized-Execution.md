---
tags: [database, olap, duckdb, columnar-storage, vectorized-execution, embedded-database, quack]
status: done
verified_at: 2026-11-16
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

DuckDB의 기본 배치는 별도 프로세스 없이 애플리케이션 프로세스 안에 라이브러리로 들어가는 임베디드다. 2.0은 Quack 프로토콜로 서버와 클라이언트 구성도 제공하며, 이 구성은 아래 [[#Quack 서버 구성|Quack 서버 구성]]에서 다룬다. 임베디드에서는 소켓 왕복과 결과 직렬화가 없고, Python에서는 보이는 범위의 pandas DataFrame을 변수 이름으로 바로 조회할 수 있다(replacement scan, `SET python_enable_replacements = false;`로 끌 수 있다). 라이선스는 MIT다.

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

## Quack 서버 구성

DuckDB 2.0 문서 기준, 네이티브 파일에 여러 프로세스가 쓰는 경로는 Quack 원격 프로토콜이다. `quack` 확장이 한 DuckDB 인스턴스를 서버로 바꾸고, 다른 DuckDB 인스턴스가 클라이언트로 HTTP 접속해 읽기와 쓰기를 보낸다. 2026-05-12 발표된 뒤 1.5.3(2026-05-20)부터 코어 확장으로 들어가 처음 쓸 때 자동으로 설치되고 로드되며, 2.0.0은 성능과 안정성을 다듬은 버전을 함께 배포한다. 클라이언트는 파일을 직접 열지 않고 서버 프로세스에 SQL을 보낸다. 여러 클라이언트의 트랜잭션이 같은 행을 고칠 때의 충돌 동작은 확인한 문서에 나오지 않는다.

2026-11-16 확인한 Quack FAQ 기준 Quack은 베타이며 아직 production-ready가 아니다. 2.0의 다듬은 버전도 프로토콜은 안정화되지 않았고 breaking change가 예고되어 있으므로, FAQ가 말하는 프로토타이핑 용도에서 먼저 쓰고 버전을 고정하는 편이 안전하다.

```sql
-- 서버 쪽 DuckDB (기본 포트 9494, 기본 바인딩 localhost)
CALL quack_serve('quack:localhost', token = 'my_token');

-- 클라이언트 쪽 DuckDB
ATTACH 'quack:localhost' AS qk (TOKEN 'my_token');
CONNECT qk;  -- DISCONNECT로 로컬 DB에 돌아온다
```

CLI는 `duckdb -serve`와 `duckdb -connect`를 쓰고, 상태 없이 한 번만 질의할 때는 `quack_query(uri, query)`를 쓴다. `ATTACH`는 원격 테이블 정의를 클라이언트에서 모두 바인딩하므로 정의 하나가 바인딩되지 않으면 연결 전체가 실패한다. 공식 문서의 예는 테이블을 늦게 해석하는 Iceberg 카탈로그다.

| 항목 | 2.0 문서 기준 동작 | 운영 판단 |
|---|---|---|
| 노출 범위 | 서버 세션이 볼 수 있는 모든 테이블의 읽기와 쓰기를 포함한 SQL 전체를 노출한다. 기본 인가(`quack_nop_authorization`)는 모두 허용한다 | 기본 설정에서 토큰을 가진 클라이언트는 서버 세션이 볼 수 있는 모든 테이블을 읽고 쓸 수 있다. 읽기 전용 같은 제한은 `quack_authorization_function`에 SQL 매크로나 확장 UDF로 직접 건다(Python UDF는 쓸 수 없다) |
| 인증 | 토큰이 필수이고, 주지 않으면 시작할 때 무작위 토큰을 만든다 | 토큰을 비밀 값으로 관리하고 클라이언트는 `CREATE SECRET (TYPE quack, ...)`로 넘길 수 있다 |
| 바인딩과 TLS | localhost만 바인딩하며 다른 호스트는 `allow_other_hostname = true`가 필요하다. 로컬 URI는 TLS를 쓰지 않고, 로컬이 아닌 URI는 기본으로 자체 서명 인증서의 HTTPS를 쓴다 | 2.0 발표문은 `allow_other_hostname`을 시험용으로 두고, 보안 문서는 인터넷에 직접 노출하지 말고 TLS를 종료하는 리버스 프록시(nginx, Caddy) 뒤에 두기를 권한다 |

보안 문서는 `SELECT`, `WITH` 같은 읽기용 첫 단어만 정규식으로 허용하는 읽기 전용 예시가 견고하지 않다고 경고한다. `WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x`는 허용된 `WITH`로 시작하지만 데이터를 바꾸므로, 문자열 검사로 권한 경계를 만들지 않는다. 같은 문서는 운영에서 읽기 전용을 강제하려면 데이터베이스를 읽기 전용 모드로 attach하거나, 원문 텍스트가 아니라 파싱한 문장 유형을 검사하는 인가 함수를 쓰라고 권한다. 사용자별 토큰과 접근 목록도 인증 함수와 인가 함수를 교체해 운영자가 직접 만드는 방식이다. 2026-11-16 확인한 Quack 보안 문서와 FAQ에는 서버형 DB의 역할이나 GRANT 같은 내장 권한 모델이 나오지 않는다.

2026-05-12 Quack 발표문의 벤치마크(발표 시점의 초기 구현이며 발표문은 DuckDB 버전을 밝히지 않는다, 같은 가용 영역의 AWS m8g.2xlarge 두 대, 5회 중앙값)는 다음과 같다. 2.0에서 다시 잰 수치가 아니므로 자기 환경에서 재현한다.

- 대량 전송: TPC-H `lineitem` 6천만 행을 Quack 4.94초, Arrow Flight 17.40초, PostgreSQL 프로토콜 158.37초에 옮겼다. 표준 PostgreSQL 클라이언트는 읽기를 병렬화하지 않는다는 조건이 붙는다.
- 작은 쓰기: 행마다 `INSERT` 트랜잭션 하나를 보낸 시험에서 8스레드 기준 Quack 5,434 tx/s, PostgreSQL 4,320 tx/s였다. 8스레드를 넘으면 같은 테이블의 동시 삽입이라는 DuckDB 자체 한계에 걸린다.

FAQ는 OLTP 용도에 대해 8 CPU, 32GB RAM 서버에서 초당 수천 건의 쓰기를 처리할 수 있다고 답한다. 이 문서의 판단은 그 수치와 베타 상태를 함께 본 해석이다. Quack은 소수의 내부 서비스나 대시보드가 한 분석 파일을 함께 읽고 쓰는 프로토타입에서 먼저 검토할 만하고, 초당 수천 건을 넘는 트랜잭션 쓰기나 세밀한 사용자 권한이 핵심인 서비스 DB를 대신하기는 어렵다. 5월 발표문이 이후 계획으로 적은 항목 중 확장 자동 설치는 1.5.3에 들어갔다. Quack을 DuckLake 카탈로그 DB로 쓰는 구성은 1.5.3 발표문이 지원을 알렸고, 2026-11-16 확인한 FAQ는 이를 실험적 지원으로 적는다. 읽기 복제본용 복제 프로토콜은 2026-11-16 확인한 문서에 아직 없다.

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

2026-10-30 공개된 34분 강의 영상의 음성 인식 전사문을 전부 읽고, 행 저장과 컬럼 저장, 압축, 블록 건너뛰기, 벡터화 실행, 임베디드 구조와 도입 판단을 학습했다. 기본값, 압축 목록, 동시성, 설정과 2.0 LTS 내용은 아래 DuckDB 공식 문서로 대조했고, 문서에서 확인하지 못한 화면의 코드와 도표는 쓰지 않았다. DuckDB를 실행해 성능을 측정하지 않았다. Quack 서버 구성은 2026-11-06 공개된 짧은 소개 영상을 계기로 2026-11-16 Quack 공식 문서, 보안 문서와 발표문으로 대조했고 서버를 직접 띄워 보지 않았다.

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
- [DuckDB, Quack Remote Protocol](https://duckdb.org/docs/2.0/quack/overview.html) — 서버 시작, 클라이언트 연결, 기본 포트
- [DuckDB, Quack Security](https://duckdb.org/docs/2.0/quack/security.html) — 토큰, 바인딩, TLS, 인가 함수
- [DuckDB, Quack Extension](https://duckdb.org/docs/2.0/core_extensions/quack) — 자동 설치와 로드
- [DuckDB, Quack FAQ](https://duckdb.org/quack/faq) — 베타 상태, DuckLake 카탈로그 실험 지원
- [Quack: The DuckDB Client-Server Protocol — DuckDB](https://duckdb.org/2026/05/12/quack-remote-protocol.html) — 초기 구현 벤치마크와 이후 계획
- [DuckDB 1.5.3: Not an Ordinary Patch Release — DuckDB](https://duckdb.org/2026/05/20/announcing-duckdb-153) — Quack 코어 확장, DuckLake 카탈로그
- [DuckDB 2.0 Now Comes With a Server — Better Stack](https://www.youtube.com/watch?v=NLdS5fHANHs) — 2026-11-06 공개
- [DuckDB, Release Calendar](https://duckdb.org/release_calendar)
- [Announcing DuckDB 2.0.0 LTS — DuckDB](https://duckdb.org/2026/10/21/announcing-duckdb-200.html)
- [Lightweight Compression in DuckDB — DuckDB](https://duckdb.org/2022/10/28/lightweight-compression.html) — 세그먼트별 알고리즘 선택

## 관련 문서

- [[OLTP-vs-OLAP|OLTP vs OLAP]]
- [[Query-Engine-Execution|쿼리 엔진]]
- [[DuckLake|DuckLake]]
- [[ClickHouse|ClickHouse]]
