---
tags: [data-infrastructure, data-warehouse, data-lake, object-storage, lakehouse, catalog, analytics, governance]
status: done
verified_at: 2026-10-27
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Data Infrastructure Layers", "데이터 인프라 지도", "데이터 인프라의 계층", "Data Warehouse vs Data Lake", "데이터 웨어하우스와 데이터 레이크"]
---

# 데이터 인프라의 계층과 계약

데이터 인프라는 여러 시스템에서 생긴 데이터를 연결해 분석과 운영에 쓰도록 만드는 기반이다. 같은 주문 데이터도 대시보드, 추천과 AI 질의에서는 다른 지연, 품질과 접근 계약을 요구한다.

## 역할별로 읽는 지도

| 계층 | 책임 | 구분할 것 |
| --- | --- | --- |
| 원천과 수집 | 업무 DB, 결제와 행동 이벤트를 가져온다 | 변경 반영, 중복과 누락 |
| 변환과 오케스트레이션 | 데이터 정리와 실행 의존성을 관리한다 | 계산 규칙과 실행 순서 |
| 저장 | 파일이나 데이터베이스에 보존한다 | 보관과 계산의 책임 |
| 테이블 형식 | 파일 묶음의 논리 상태를 정의한다 | 파일 포맷과 snapshot 메타데이터 |
| 카탈로그 | 이름으로 테이블과 메타데이터를 찾는다 | 제품별 관리 및 권한 범위 |
| 쿼리와 계산 | 조건, 조인과 집계를 실행한다 | 처리 규모와 동시성 |
| 활용 | BI, 서비스 기능, ML과 LLM에 연결한다 | 각 소비자의 의미와 권한 |

하나의 제품이 여러 역할을 제공할 수 있다. 제품 개수와 계층 개수가 같을 필요는 없다.

## 웨어하우스: 분석용 테이블과 행의 상세 수준

주문 한 건을 찾아 결제 상태와 재고를 바꾸는 트랜잭션 처리와, 한 달 치 주문을 읽어 취소와 환불을 반영하고 상품별로 더하는 분석 처리는 데이터에 접근하는 방식이 다르다. 데이터가 작고 질문이 단순하면 서비스 DB의 SQL로 충분할 수 있다. 분석이 늘면 무거운 집계가 주문 처리와 자원을 다투고, 광고 시스템 같은 다른 원천과의 결합과 주문 당시 고객 지역 같은 과거 상태의 보존이 필요해져 분석용 데이터를 따로 관리한다. 워크로드 차이는 [[OLTP-vs-OLAP|OLTP와 OLAP]], 과거 상태 보존은 [[SCD-Type2|SCD Type 2]]를 따른다.

데이터 웨어하우스는 여러 시스템의 데이터를 모아 분석용 테이블로 관리하고 SQL로 읽고 계산하게 하는 기반이다. 주문, 결제, 환불과 광고비를 주문 번호나 날짜 같은 키로 연결하면 상품별 매출과 광고비를 비교하고, 첫 구매 고객이 다음 달에 다시 샀는지 볼 수 있다.

적재했다고 데이터가 저절로 정리되지는 않는다. 먼저 한 행이 무엇을 뜻하는지, 즉 행의 상세 수준(grain)을 정한다. 주문 한 건을 한 행으로 볼지 주문 안의 상품 하나를 한 행으로 볼지에 따라 집계가 달라진다. 상품 세 개가 담긴 주문을 상품 단위 행으로 펼친 뒤 주문 금액을 행마다 더하면 매출이 세 배로 부풀려진다. 금액은 그 금액이 속한 상세 수준의 행에서 한 번만 더하고, 상세 수준이 다른 테이블을 조인한 뒤에는 행 수가 늘었는지 확인한다.

주문이나 판매 같은 사실을 담는 사실 테이블에 상품과 고객을 설명하는 차원 테이블을 연결한 스타 스키마는 대표적인 분석 모델의 하나이며, 모든 웨어하우스가 따라야 하는 형태는 아니다. 분석 테이블에는 주문이나 상품 수준의 상세 데이터도, 날짜별 매출 같은 사전 집계도 둘 수 있다. 웨어하우스가 합계만 저장하는 곳은 아니다.

분석 저장소는 컬럼 기반 저장을 많이 쓴다. 고객에게 주문 한 건을 보여 줄 때는 그 주문의 여러 항목을 함께 읽지만, 날짜별 매출은 날짜와 금액 컬럼만 많은 행에 걸쳐 읽으면 된다. 같은 컬럼의 값을 모아 두면 필요한 컬럼만 읽을 수 있고 같은 종류의 값끼리 압축하기도 쉽다. 다만 읽는 데이터의 양, 데이터를 나눠 둔 방식과 계산의 종류도 성능을 좌우하므로 컬럼 기반 저장만으로 모든 쿼리가 빨라지지는 않는다. 행 저장과의 비교는 [[OLTP-vs-OLAP#저장 구조가 갈라지는 지점|저장 구조가 갈라지는 지점]]을 따른다.

## 대표 웨어하우스 제품을 비교하는 기준

Snowflake, BigQuery와 Amazon Redshift는 모두 데이터를 모아 SQL로 분석하는 웨어하우스다. 2026-10-27 각 제품의 공식 문서로 확인한 구조의 차이는 다음과 같으며, 각 항목의 예는 쇼핑몰 사례로 든 활용 방식이다.

- Snowflake: 테이블에 적재한 데이터를 내부 최적화된 압축 컬럼 형식으로 재구성해 클라우드 저장소에 두고, 구성, 파일 크기, 압축, 메타데이터와 통계를 Snowflake가 관리한다. 연산은 다른 warehouse와 연산 자원을 공유하지 않는 독립 compute cluster인 virtual warehouse가 맡는다. Warehouse는 실행 중에도 크기를 바꿀 수 있고, standard warehouse는 자동 중지와 자동 재개가 기본으로 켜져 있다. 인프라와 소프트웨어 갱신은 Snowflake가 관리하며, 계정마다 AWS, Google Cloud, Azure 중 호스팅 클라우드를 고른다. 예: 데이터 가공과 대시보드에 서로 다른 warehouse를 붙여 무거운 가공 작업과 대시보드 조회가 같은 연산 자원을 두고 다투지 않게 한다. 크기 조정의 효과와 warehouse 유형별 최소 과금 조건은 [[OLTP-vs-OLAP#분석 연산의 격리와 확장|분석 연산의 격리와 확장]]을 따른다.
- BigQuery: Google Cloud의 관리형 서버리스 분석 플랫폼이다. 데이터를 받아 저장하는 저장 계층과 분석을 수행하는 연산 계층이 서로 독립적으로 동작하며 데이터는 컬럼 형식으로 저장한다. 주문형(on-demand) 과금은 별도 용량 설정 없이 쿼리가 처리한 바이트 수로 과금한다. 3개 edition으로 제공되는 용량 기반 과금은 slot을 reservation 단위로 할당하고 기준(baseline) slot이나 autoscaling slot을 정한다.
  - 예: GA4 속성의 원본 이벤트를 BigQuery로 내보내 주문 데이터와 결합하면 유입 경로별 구매나 장바구니 이탈을 SQL로 분석할 수 있다. 2026-10-28 GA4 도움말 기준, 일일 내보내기는 전날 원본 이벤트를 하루 한 번 보내고 표준 속성은 하루 100만 이벤트까지이며 필터로 한도 아래를 유지하도록 안내한다. 지속적으로 한도를 초과하면 일일 내보내기가 일시 중지되고 이전 일자의 내보내기는 재처리되지 않는다. 크게 초과하면 즉시 중지될 수 있으므로, 알림을 확인하고 내보낼 데이터 스트림과 이벤트를 조정한다. 스트리밍 내보내기는 당일 데이터를 실시간으로 보내고 도움말 표에 용량 한도가 없다고 표시되지만, GB당 0.05달러의 BigQuery 비용이 추가되고 완전성 목표 없이 운영되는 best-effort 방식이라 누락이 생길 수 있다. 이벤트 설계와 개발자 트래픽 제외는 [[App-Analytics-Event-Tracking|앱 분석과 이벤트 설계]]를 따른다.
- Redshift: AWS의 데이터 웨어하우스로 컬럼 기반 저장을 쓴다. compute node가 2개 이상인 provisioned cluster에서는 별도 leader node가 실행 계획을 컴파일해 compute node에 나눠 주고 compute node가 병렬로 처리한다. RG와 RA3 노드는 데이터를 Redshift Managed Storage에 두어 연산과 저장을 따로 확장하고 과금하며, Serverless도 이 관리형 저장소를 쓴다. DC2 노드는 데이터를 노드의 로컬 SSD에 두므로 저장 용량을 늘리려면 노드를 추가한다. 직접 구성하는 provisioned cluster와, 클러스터를 관리하지 않고 용량이 자동으로 조정되는 Serverless 중에서 고르며, Spectrum으로 S3 파일을 적재 없이 외부 테이블로 조회해 내부 테이블과 조인할 수 있다. 예: 자주 분석하는 주문 데이터는 Redshift 테이블에 두고 S3에 쌓인 방문 기록은 Spectrum으로 함께 조회한다. 노드 유형과 Spectrum의 실행 위치는 [[Redshift#노드 타입|Amazon Redshift의 노드 타입]]을 따른다.

제품을 고를 때는 데이터가 이미 어느 클라우드에 있는지, 업무별 연산 자원을 어떻게 나눌지, 비용과 운영 부담을 어떻게 관리할지를 함께 본다. 제품 소개의 성능 설명을 우리 워크로드의 결과로 가정하지 않고 대표 쿼리로 비교한다.

## 레이크와 객체 저장소

데이터 레이크는 표 형태의 주문 데이터뿐 아니라 상품 조회 기록, 서버 로그와 상담 문서처럼 모양과 용도가 다른 데이터를 파일로 넓게 모아 두고 필요한 작업이 읽어 쓰는 구조다. 상품 조회 이벤트를 날짜별 파일로 모으고 분석에 필요한 주문 내역의 사본을 내보내 함께 둘 수 있다. 주문을 받는 시스템 자체를 파일로 바꾸는 것은 아니다.

상세 기록을 남기면 나중에 생긴 질문에도 다시 답할 수 있다. 처음에는 날짜별 방문 수만 계산하더라도 원본 이벤트가 있으면 조회에서 구매까지의 과정을 분석하거나 추천 모델을 학습할 수 있다. 합계만 남겼다면 원래 어떤 행동이 있었는지 다시 볼 수 없다([[Druid#Rollup은 원본과 교환하는 저장 효율이다|rollup의 원본 손실]]). 그렇다고 모든 데이터를 기한 없이 모으지는 않는다. 보관 목적과 기간, 개인정보 처리 방식을 먼저 정한다. 레이크에 원본만 두는 것도 아니어서, 처음 받은 데이터와 오류를 정리한 데이터, 분석용으로 가공한 데이터를 구분해 둘 수 있다([[Athena#원본 보관과 분석용 데이터의 역할을 나눈다|원본 보관과 분석용 데이터의 역할]]).

객체 저장소는 레이크를 구성하는 저장 기반의 하나다. 2026-10-27 공식 문서 기준, Amazon S3의 범용(general purpose) bucket은 데이터를 객체로 저장한다. 객체는 파일과 그 파일을 설명하는 메타데이터이고, key가 bucket 안에서 객체를 식별한다. 범용 bucket의 prefix는 key 앞부분의 문자열로 데이터를 디렉터리처럼 정리하는 수단이지 실제 디렉터리는 아니다. 날짜와 데이터 종류를 prefix에 넣어 두면 특정 날짜의 방문 기록 파일을 골라 읽을 수 있다. Google Cloud Storage도 데이터를 bucket 안의 객체로 저장하고, Azure Blob Storage는 Microsoft의 클라우드 객체 저장소다. S3의 객체 모델은 [[S3-Storage-Performance|S3의 bucket, object와 key]], 표 형식 데이터를 Apache Iceberg 형식으로 담는 table bucket은 [[S3-Tables-Maintenance|S3 Tables와 Iceberg 유지보수]]를 따른다.

파일을 올렸다고 분석 시스템이 완성되지는 않는다. 어떤 파일에 어떤 데이터가 있는지 알려 주는 카탈로그, 파일을 읽어 계산하는 엔진, 접근 권한 관리와 새 데이터가 제대로 들어왔는지의 확인이 함께 필요하다. 객체 저장소는 데이터를 담는 기반이고 데이터 레이크는 그 위에서 데이터를 모으고 관리해 활용하는 구조다. 같은 저장소도 거기서 데이터를 가져와 처리하면 원천이 되고 처리 결과를 다시 저장하면 목적지가 된다. S3 경로의 스키마 등록은 [[Log-Pipeline#객체 저장소 경로에서 적재와 카탈로그를 구분한다|적재와 카탈로그의 구분]], 레이크의 세밀한 권한은 [[Lake-Formation|Lake Formation]]을 따른다.

## 웨어하우스와 레이크를 역할로 나눈다

웨어하우스는 정리된 표, 레이크는 원본 파일이라고 딱 자르기는 어렵다. 웨어하우스에도 처음 가져온 데이터를 먼저 적재하고 안에서 변환하는 [[ELT-Platform|ELT]] 구성이 있다. 2026-10-27 공식 문서 기준, Snowflake는 VARIANT, OBJECT와 ARRAY, BigQuery는 JSON, Redshift는 SUPER 타입으로 JSON 같은 반정형 데이터를 담는다. 반대로 레이크에도 정리된 표 데이터를 Parquet 같은 분석용 형식으로 두고 여러 파일을 하나의 테이블로 관리할 수 있다. 레이크의 파일을 읽는 쿼리 엔진을 붙이면 SQL 분석도 가능하므로, 레이크는 저장만 하고 웨어하우스는 계산도 한다는 구분도 정확하지 않다.

그래서 데이터를 담는 곳, 데이터의 구조를 관리하는 방식, 읽고 계산하는 엔진으로 나눠 본다. 위 지도의 저장, 테이블 형식과 카탈로그, 쿼리와 계산 계층이다. 실제 제품은 이 역할을 묶어 제공하기도 하고 바깥 저장소의 데이터를 읽기도 한다. 이 경계가 가까워지면서 나온 구조가 레이크하우스이며, 정의와 거버넌스는 [[OLTP-vs-OLAP#분석 데이터 통합과 레이크하우스|분석 데이터 통합과 레이크하우스]]를 따른다.

쇼핑몰이라면 주문은 서비스 DB가 처리하고 상품 조회는 이벤트로 수집한다. 이벤트의 상세 기록과 분석용으로 내보낸 주문 내역은 레이크에 보관하고, 주문, 결제와 광고 데이터는 웨어하우스의 분석 테이블로 가져온다. 매일 보는 매출 대시보드는 웨어하우스 테이블을 읽고, 새로운 고객 행동 분석은 레이크의 상세 기록을 읽은 뒤 그 결과를 웨어하우스 분석에 다시 연결할 수 있다. 레이크를 거쳐 웨어하우스로 가는 순서가 필수는 아니다. 주문 DB에서 웨어하우스로 바로 가져올 수도 있고, Redshift Spectrum이나 BigQuery의 외부 테이블처럼 파일을 옮기지 않고 바깥 저장소를 읽는 경로도 있다.

## 파일이 있다고 테이블 상태가 정해지지는 않는다

Parquet는 분석용 컬럼 지향 데이터 파일 형식이다. Iceberg 같은 테이블 형식은 어느 파일들이 어떤 스냅샷에 속하는지 관리한다. 카탈로그는 테이블을 찾고 그 정보를 연결하는 계층이다. DuckLake는 SQL 카탈로그와 Parquet 저장을 결합하는 또 다른 설계다.

환불을 반영하는 작업과 매출 조회가 동시에 실행될 때 어느 상태를 읽을지 정해야 한다. 파일을 직접 덮어쓰는 방식과 메타데이터로 새 스냅샷을 게시하는 방식을 같은 계약으로 보지 않는다.

### Parquet가 읽는 양과 크기를 줄이는 방식

2026-10-27 Apache Parquet 명세 기준, 파일은 행을 row group으로 나누고 row group 안에 컬럼별 column chunk를, column chunk 안에 page를 둔다. 각 column chunk의 시작 위치를 담은 파일 메타데이터(footer)는 한 번에 쓸 수 있도록 데이터 뒤에 기록하고, 읽는 쪽은 footer부터 읽어 필요한 column chunk만 찾는다. Dictionary encoding은 column chunk마다 값 목록을 dictionary page에 두고 data page에는 각 값의 번호만 남기며, 번호는 RLE와 bit-packing을 섞은 방식으로 줄인다. Dictionary가 너무 커지면 plain encoding으로 돌아간다. 이렇게 인코딩한 page는 column chunk마다 정한 codec으로 추가 압축할 수 있다(Snappy, Zstandard 등, 압축하지 않는 UNCOMPRESSED도 허용). column chunk와 page에 남긴 min, max 통계로 조건에 맞지 않는 구간을 건너뛸 수 있고, page index를 쓰면 정렬된 컬럼에서 필요한 page를 이진 탐색으로 찾을 수 있다.

예: 뉴욕 택시 운행 약 1,000만 건으로 한 영상 자체 실험에서 Parquet 파일은 1GB에 가까운 CSV의 약 6분의 1 크기였고, 평균 요금을 구하는 같은 함수는 CSV 대신 Parquet를 읽자 27배 빨라졌다. 픽업 시각으로 정렬한 파일은 섞은 파일보다 작았고(144MB와 213MB) 하루치를 고를 때 10개 row group 중 1개만 읽었지만, 섞은 파일은 10개를 모두 읽었다. 잘못 기록된 과거 시각 몇 건이 row group의 min, max 범위를 넓혀 건너뛰기를 막기도 했다. 이 수치는 그 데이터와 도구 기본값에서 나온 결과이므로, 자주 거르는 컬럼의 정렬과 값 정리의 효과는 각자 데이터로 측정한다.

## 객체 메타데이터와 업무 테이블을 구분한다

2026-10-22 AWS 공식 문서 기준, S3 Metadata는 general purpose bucket의 객체 메타데이터를 읽기 전용 관리형 Iceberg 테이블로 제공한다. 객체 크기, 저장 클래스와 변경 이력을 조회하는 용도이며, 원본 파일 안의 주문이나 결제 행을 자동으로 업무 테이블로 변환하는 기능과 구분한다.

Journal table은 설정을 만든 뒤 발생한 객체 변경을 기록하며 원본 버킷과 최종적 일관성을 가진다. Iceberg 형식으로 제공된다는 이유만으로 원본 객체와 동시에 갱신되거나 과거 변경 이력이 모두 포함된다고 가정하지 않는다. 업무 테이블의 스냅샷 관리와 객체 목록의 변경 관측은 서로 다른 계약이다.

## 작은 데이터에서 시작하기

노트북 한 대에서 처리할 데이터라면 분산 시스템부터 만들 필요는 없다. DuckDB 같은 내장형 SQL 엔진을 시작점으로 검토하고, 데이터 규모, 동시 사용자와 지연 요구가 커질 때 운영 구성을 바꾼다. 저장과 계산의 역할 구분은 작은 구성에서도 유효하다.

2026-10-27 DuckDB 2.0 문서 기준, DuckDB는 별도 DBMS 서버 없이 호스트 프로세스 안에서 실행되는 분석용 엔진이다. `SELECT * FROM 'orders.parquet'`처럼 CSV와 Parquet 파일을 SQL로 바로 조회하며, Parquet에서는 쿼리에 필요한 컬럼만 읽고 필터 조건으로 파일 일부를 건너뛸 수 있다.

웨어하우스와 레이크도 처음부터 둘 다 만들 필요는 없다. 먼저 답하려는 질문을 정한다.

- 매일 보는 주문 수와 매출처럼 데이터가 작고 분석이 단순하면 기존 DB나 별도의 읽기 전용 환경에서 시작할 수 있다. 파일 몇 개를 노트북에서 분석하는 것으로 충분한 경우도 있다.
- 여러 사람이 같은 데이터를 반복해서 분석하고 대시보드를 운영해야 하면 관리형 웨어하우스가 편할 수 있다.
- 다양한 상세 기록을 오래 보관하고 여러 처리 방식에 다시 써야 하면 레이크를 함께 검토한다.

레이크는 싸고 웨어하우스는 비싸다고 단정하지 않는다. 파일 보관 비용 외에 읽고 계산하는 비용과 운영하는 사람의 시간이 들고, 데이터가 들어와야 하는 속도, 읽는 빈도와 사용자도 비용을 바꾼다. 지금 필요한 문제를 푸는 범위에서 시작하고 역할을 나눌 필요가 생길 때 구조를 넓힌다.

## 지표와 AI의 데이터 계약

매출은 환불 차감, 세금 포함 여부와 결제일 또는 배송일 기준을 정해야 한다. 대시보드나 SQL 생성이 성공해도 지표 의미가 맞는지는 별도다.

AI 역시 데이터 소비자다. 테이블 선택 외에 지표 정의, 집계 완료 시점, 문서 최신성과 질문자의 권한을 알아야 한다. 전통적인 BI, ML 학습과 문서 검색형 LLM이 요구하는 데이터 준비를 구분한다.

## 지속 복제와 조회 결과의 최신성

업무 DB의 변경을 별도 분석 저장소나 조회 모델에 전달하면 계산 부하를 분리할 수 있지만, 수집 완료와 사용자에게 보이는 결과의 갱신 시점은 다르다. 2026-10-22 AWS DMS 공식 문서는 초기 적재 뒤에도 CDC를 계속 수행할 수 있으며, 복제 지연은 소스 부하, 네트워크, 복제 자원과 대상 수용량에 따라 달라지고 지연 SLA는 없다고 명시한다.

설계 점검에서는 소스 커밋, 변경 수집, 변환 및 집계, 캐시 갱신과 화면 조회 시점을 나누어 측정한다. 랭킹이나 분석 화면에 허용할 지연을 정하고 갱신 지연과 처리 실패를 구분한다. 특정 서비스의 갱신 주기나 발표 성과를 CDC의 보장값으로 사용하지 않는다. CDC 도구의 전달 조건은 [[DMS|DMS의 대상별 계약]]에서 확인한다.

## 학습 범위와 후속 확인

2026-10-15 공개된 GeekCast 시즌2 EP01의 10분 24초 영상에서 사람이 단 한국어 자막 228구간을 확보해 전체를 읽었다. 저장과 계산, 파일과 테이블, 소규모 구성, 결과 활용과 AI 연결을 학습했다. 화면 전용 도표와 코드는 별도 대조하지 않았다. 영상의 시즌1 링크 7개와 다음 편 예고는 추가 학습 후보이며 시청 완료로 표시하지 않는다.

2026-10-22 공개된 GeekCast 시즌2 EP02의 15분 25초 영상에서 사람이 단 한국어 자막 339구간을 2026-10-27 확보해 전체를 읽었다. 운영 DB와 분석 저장소의 분리, 웨어하우스 행의 상세 수준(grain), 대표 웨어하우스 비교, 컬럼 기반 저장, 레이크와 객체 저장소의 구분, 함께 쓰는 구성과 소규모 시작 기준을 학습했다. 화면에만 나온 S3 객체 이름 예시와 도표는 대조하지 않았다. 제품 항목의 예는 영상의 쇼핑몰 사례에서 가져왔다. 제품 설명은 공식 문서로 확인한 구조만 반영했고, Snowflake의 통합 데이터 플랫폼 확장이나 제품별 성능 강점 같은 소개성 설명은 넣지 않았다. 다음 편 예고인 Parquet와 Iceberg, 카탈로그, 레이크하우스와 쿼리 엔진은 추가 학습 후보다.

2026-10-05 공개된 Python In Production의 13분 4초 Parquet 영상(GeekNews 2026-10-23 소개)에서 사람이 단 영어 자막 506구간을 2026-10-27 확보해 전체를 읽었다. 파일 구조, 인코딩과 압축, row group 통계와 정렬을 반영했고 실험 수치는 영상 자체 실험으로만 적었다. GeekNews 본문은 브라우저 확인 페이지로 열리지 않아 날짜별 목록의 제목과 주소만 확인했다. 시리즈 다음 편인 Iceberg 영상은 추가 학습 후보다.

Iceberg와 DuckDB의 세부 호환성이나 실제 구현은 이 개요의 확인 범위에 포함하지 않는다.

2026-10-22에는 객체 메타데이터와 업무 테이블의 구분, 지속 복제와 최종 조회 지연을 추가 대조했다. 공식 문서의 해당 계약만 확인했으며 기존 개요 전체의 최신성 검증이나 실제 파이프라인 실행 기록은 아니다.

2026-10-27에는 새로 추가한 웨어하우스 제품의 저장과 과금 구조, 객체 저장소, 반정형 타입과 Parquet 파일 구조의 설명, 기존 Iceberg, DuckLake와 DuckDB 설명을 공식 문서와 대조했다. 2026-10-22에 확인한 S3 Metadata와 DMS 절은 다시 대조하지 않았으며, 실제 계정에서 쿼리, 내보내기나 비용을 실행해 본 기록은 아니다.

2026-10-28에는 EP02 소개 원문과 DuckDB 2.0 릴리스, CSV와 Parquet 문서의 접근 및 위 설명의 근거를 확인했다. GA4의 한도 초과 시 일일 내보내기 중지와 이전 일자 재처리 불가 조건을 공식 설정 도움말로 보완했다. 나머지 절과 실제 내보내기 실행은 재검증하지 않았다.

## 출처

- [AWS, Discovering your data with S3 Metadata tables](https://docs.aws.amazon.com/AmazonS3/latest/userguide/metadata-tables-overview.html)
- [AWS, S3 Metadata journal tables schema](https://docs.aws.amazon.com/AmazonS3/latest/userguide/metadata-tables-schema.html)
- [AWS, Creating tasks for ongoing replication using AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html)
- [GeekCast, 5년 만에 다시 보는 데이터 인프라 지도, 최신 데이터 인프라 이해하기 시즌2 EP01](https://www.youtube.com/watch?v=alnTsLjhEtQ)
- [5년 만에 다시 보는 데이터 인프라 지도 — GeekCast](https://news.hada.io/geekcast/data-infra-s2-ep01)
- [GeekCast, 데이터 웨어하우스와 데이터 레이크: Snowflake, BigQuery, Redshift 이해하기, 최신 데이터 인프라 이해하기 시즌2 EP02](https://www.youtube.com/watch?v=KhKB85W50e4)
- [데이터 웨어하우스와 데이터 레이크: Snowflake, BigQuery, Redshift 이해하기 — GeekCast](https://news.hada.io/geekcast/data-infra-s2-ep02)
- [Python In Production, why .parquet dominates modern data engineering, Data Engineering for ML and AI Chapter 1](https://www.youtube.com/watch?v=6Qkzfwk0W58)
- [Parquet가 현대 데이터 엔지니어링을 지배하는 이유 — GeekNews](https://news.hada.io/topic?id=35843)
- [Apache Iceberg, Table Specification](https://iceberg.apache.org/spec/) — 테이블 스냅샷과 메타데이터 개념
- [Apache Parquet, Overview](https://parquet.apache.org/docs/overview/)
- [Apache Parquet, File Format](https://parquet.apache.org/docs/file-format/)
- [Apache Parquet, Encodings](https://parquet.apache.org/docs/file-format/data-pages/encodings/)
- [Apache Parquet, Compression](https://parquet.apache.org/docs/file-format/data-pages/compression/)
- [Apache Parquet, Page Index](https://parquet.apache.org/docs/file-format/pageindex/)
- [DuckLake, Specification Introduction](https://ducklake.select/docs/stable/specification/introduction)
- [DuckDB, Why DuckDB](https://duckdb.org/why_duckdb)
- [DuckDB, Reading and Writing Parquet Files](https://duckdb.org/docs/2.0/data/parquet/overview.html)
- [DuckDB, CSV Import](https://duckdb.org/docs/2.0/data/csv/overview)
- [DuckDB v2.0.0 — GitHub, duckdb/duckdb](https://github.com/duckdb/duckdb/releases/tag/v2.0.0)
- [Snowflake, Snowflake key concepts and architecture](https://docs.snowflake.com/en/user-guide/intro-key-concepts)
- [Snowflake, Overview of warehouses](https://docs.snowflake.com/en/user-guide/warehouses-overview)
- [Snowflake, Supported cloud platforms](https://docs.snowflake.com/en/user-guide/intro-cloud-platforms)
- [Snowflake, Semi-structured data types](https://docs.snowflake.com/en/sql-reference/data-types-semistructured)
- [Google Cloud, BigQuery overview](https://docs.cloud.google.com/bigquery/docs/introduction)
- [Google Cloud, Work with JSON data in GoogleSQL](https://docs.cloud.google.com/bigquery/docs/json-data)
- [Google Cloud, Introduction to workload management](https://docs.cloud.google.com/bigquery/docs/reservations-intro)
- [Google Cloud, Introduction to external data sources](https://docs.cloud.google.com/bigquery/docs/external-data-sources)
- [Google Analytics Help, BigQuery Export](https://support.google.com/analytics/answer/9358801)
- [Google Analytics Help, Set up BigQuery Export](https://support.google.com/analytics/answer/9823238) — 일일 내보내기 한도 초과와 재처리 조건, 2026-10-28 대조
- [AWS, Columnar storage](https://docs.aws.amazon.com/redshift/latest/dg/c_columnar_storage_disk_mem_mgmnt.html)
- [AWS, Data warehouse system architecture](https://docs.aws.amazon.com/redshift/latest/dg/c_high_level_system_architecture.html)
- [AWS, Amazon Redshift provisioned clusters](https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html)
- [AWS, Amazon Redshift Spectrum overview](https://docs.aws.amazon.com/redshift/latest/dg/c-spectrum-overview.html)
- [AWS, What is Amazon Redshift Serverless?](https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-whatis.html)
- [AWS, SUPER type](https://docs.aws.amazon.com/redshift/latest/dg/r_SUPER_type.html)
- [AWS, What is Amazon S3?](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [AWS, Organizing objects using prefixes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-prefixes.html)
- [Google Cloud, Cloud Storage overview](https://docs.cloud.google.com/storage/docs/introduction)
- [Microsoft Learn, Introduction to Blob (object) Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction)

## 관련 문서

- [[DuckLake|SQL 카탈로그와 Parquet]]
- [[OLTP-vs-OLAP|OLTP와 OLAP]]
- [[Redshift|Amazon Redshift]]
- [[Athena|Athena의 S3 직접 조회]]
- [[S3-Storage-Performance|S3의 bucket, object와 key]]
- [[Lake-Formation|Lake Formation의 레이크 권한]]
- [[SCD-Type2|SCD Type 2]]
- [[App-Analytics-Event-Tracking|앱 분석과 이벤트 설계]]
- [[Stream-and-Batch-Processing|스트림과 배치]]
- [[ELT-Platform|ELT 플랫폼]]
- [[Transactional-Outbox|변경 전파와 Outbox]]
