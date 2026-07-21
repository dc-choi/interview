---
tags: [database, rdbms]
status: done
category: "Data & Storage - RDB"
aliases: ["Index"]
verified_at: 2026-07-21
---

# Index

데이터베이스의 테이블의 동작 속도를 높여주는 자료구조이다.

책의 찾아보기처럼 검색 키를 정렬된 구조에 유지해 필요한 row를 찾는 범위를 줄인다. 구현은 DBMS와 인덱스 종류에 따라 B+Tree, hash 등으로 달라지며 단순한 SortedList라고 보면 안 된다.

인덱스는 특정 조회와 정렬의 탐색 범위를 줄이는 대신 저장 공간과 쓰기 유지 비용을 추가한다. 모든 조회가 빨라지는 것은 아니므로 실행 계획과 실제 측정으로 판단한다.

## 순차 I/O VS 랜덤 I/O

- **순차 I/O**: 물리적으로 인접한 페이지를 차례대로 읽는 순차 접근 방식. 원하는 데이터를 찾기 위해 풀 스캔 방식을 사용하며, 풀 테이블 스캔에 활용된다.
- **랜덤 I/O**: 물리적으로 떨어진 페이지들에 임의로 접근하는 방식. 인덱스 레인지 스캔에 사용된다.

## Primary Key VS Secondary Key
- PK는 우리가 흔히 알고 있는 식별자를 의미한다. 테이블에서 PK를 생성하면 Index에 PK에 관한 인덱스가 생긴 것을 볼 수 있다. 즉 PK는 레코드를 대표하는 컬럼의 값으로 만들어진 인덱스를 의미한다. PK를 제외한 나머지 인덱스들을 SK라고 한다.

## Unique VS Non-Unique
- 데이터의 중복 허용 여부로 구분하면 유니크 인덱스와 유니크 하지 않은 인덱스로 나눌 수 있다. 인덱스가 유니크한지 아닌지는 DBMS의 쿼리를 실행해야 하는 옵티마이저한테 중요하다 값이 유니크하면 유니크 인덱스에 대해 동등 조건으로 검색한다는 것을 옵티마이저에게 알려줄 수 있다.
- **고유 인덱스**: 인덱스 열들의 값이 유일. UNIQUE 제약을 만들면 자동으로 유니크 인덱스가 생성되고, 역도 성립.
- **비고유 인덱스**: 중복 허용. INSERT 시 중복 체크 없이 단순 정렬 작업만 → 고유 인덱스보다 약간 가벼움.

### PK vs 유니크 인덱스 차이
둘 다 데이터의 유일성을 보장하지만 결정적 차이 둘:
- **PK는 NULL 불가**, 유니크 인덱스는 **NULL 허용** (여러 행에 NULL 가능)
- **PK는 테이블당 1개**, 유니크 인덱스는 **여러 개 가능**

이 때문에 "주민번호처럼 NULL일 수 있는 자연키"는 유니크 인덱스로 두고, 자체 인조키(`AUTO_INCREMENT` 등)를 PK로 두는 패턴이 흔하다.

## B-Tree

- 데이터 접근 퍼포먼스가 데이터 증가량에 따라 선형적으로 증가하지 않는다.
- 컬럼의 값을 변경하지 않고 원래의 값을 이용해 인덱싱하는 알고리즘.
- **Root, Branch, Leaf Node**로 구성된다.
- 각 노드는 페이지를 의미하며, InnoDB에서 페이지는 디스크에 데이터를 저장하는 기본 단위다. 블록이라고도 불리며 디스크의 모든 읽기, 쓰기 작업의 최소 단위가 된다.
- 인덱스도 페이지 단위로 관리된다. InnoDB 기본 페이지 크기는 16KiB지만 인스턴스 초기화 시 지원되는 다른 크기로 설정할 수 있다.
- **루트와 브랜치 노드**는 separator key와 자식 페이지 참조를 가진다. **clustered index 리프**는 전체 row를 저장하고, **secondary index 리프**는 secondary key와 clustered primary key를 저장한다.

## MySQL에서 B+Tree 계열 인덱스를 사용하는 이유
- 레드 블랙 트리와 B+Tree 모두 탐색 높이는 로그 규모지만, 디스크와 버퍼 풀은 페이지 단위로 접근한다.
- B+Tree는 한 페이지에 많은 key와 자식 포인터를 담아 fan-out을 높이고 트리 높이와 페이지 접근 횟수를 줄인다.
- 정렬된 리프 페이지를 연결해 범위 스캔에도 유리하다. MySQL 문서는 이 계열을 통칭해 B-tree 인덱스라고 부른다.

## 인덱스 레인지 스캔

- 인덱스 풀 스캔보다 빠르며, 검색해야 할 인덱스의 범위가 결정됐을 때 사용하는 방식.
- 리프 노드에서 시작 지점을 찾으면 그 다음부터는 리프 노드의 레코드만 순서대로 읽는다. 리프 노드 끝까지 읽으면 리프 노드 간의 링크를 통해 다음 리프 노드를 찾아 스캔한다.
- 스캔 종료 지점을 찾으면 지금까지 읽은 레코드를 사용자에게 반환하고 쿼리를 종료한다.
- 인덱스와 table scan의 손익분기점은 row 폭, clustering, cache, 랜덤 I/O 비용, covering 여부와 통계에 따라 달라진다. **20~25% 같은 고정 임계값은 보편 규칙이 아니며** 실행 계획과 실제 측정으로 판단한다.
- secondary index로 찾은 행을 clustered index에서 다시 읽을 때 페이지가 흩어져 있으면 랜덤 페이지 접근 비용이 커질 수 있다. 버퍼 풀 적중률, covering 여부와 Multi-Range Read 같은 최적화에 따라 실제 비용은 달라진다.
- MySQL 실행 계획에서 `range`로 표시된다. const, ref, range 접근 방식을 묶어 통칭 "인덱스 레인지 스캔"으로 부르기도 한다.
- `<`, `>`, `IS NULL`, `BETWEEN`, `IN`, prefix `LIKE` 등이 인덱스 선행 컬럼에 적용될 때 후보가 된다. 실제 접근 방식은 타입 변환, collation, 통계와 복합 조건에 따라 달라진다.

## 인덱스 풀 스캔

- 인덱스의 처음부터 끝까지 스캔하는 방식.
- 리프 노드의 시작 혹은 끝으로 이동한 뒤, 리프 노드를 연결하는 LinkedList를 따라 처음부터 끝까지 탐색한다.
- secondary index가 clustered row보다 좁고 필요한 컬럼을 덮으면 table scan보다 유리할 수 있다. clustered index 전체를 읽는 경우는 사실상 InnoDB 테이블 전체 스캔이며, 항상 더 빠르다고 볼 수 없다.

## 루스 인덱스 스캔 (Loose Index Scan)

- 인덱스를 **듬성듬성** 건너뛰며 필요한 부분만 읽는 방식.
- **GROUP BY, MIN, MAX** 쿼리 최적화에 자주 사용된다. 각 그룹의 첫 값만 꺼내면 되므로 중간 레코드를 건너뛸 수 있다.
- MySQL 실행 계획 Extra에 `Using index for group-by`로 표시된다.
- 조건: GROUP BY 컬럼이 인덱스 선행 컬럼과 일치, 집계 함수가 MIN/MAX 수준이면 적중률이 높다.

## 클러스터링 인덱스

- PK 값이 비슷한 레코드끼리 묶어서 저장하는 방식.
- InnoDB는 PK가 있으면 이를 clustered index로 사용한다. PK가 없으면 모든 컬럼이 `NOT NULL`인 첫 번째 `UNIQUE` 인덱스를 사용하고, 그것도 없으면 숨은 clustered index를 생성한다.
- **테이블당 하나만 생성 가능**하다. PK에 의해 레코드의 저장 위치가 결정되며, PK가 변경되면 저장 위치도 변경된다.
- InnoDB row는 항상 clustered index 리프에 저장된다. 정렬 기준은 위 규칙으로 선택된 clustered key다.
- 공간 지역성이 좋아 PK 기반 범위 검색이 빠르다.
- PK의 변경이 느리다. PK가 자주 변경되는 값으로 설정되면 매번 저장 위치가 조정되면서 성능 이슈가 발생한다. 따라서 자주 변경되는 값은 유니크 키로 잡고, PK는 `AUTO_INCREMENT` 같은 인조키를 사용한다.

## 논 클러스터링 인덱스

- secondary index는 조건과 covering 여부에 따라 조회를 크게 줄일 수 있지만, 리프에 clustered key를 저장하므로 non-covering 조회에는 추가 clustered lookup이 생길 수 있다. 인덱스가 하나 늘 때마다 쓰기 유지 비용도 추가된다.
- InnoDB secondary index 리프는 물리 row 주소가 아니라 secondary key와 clustered primary key를 저장한다. 찾은 PK로 clustered index를 다시 조회할 수 있다.
- clustered key로 선택되지 않은 일반 인덱스와 유니크 인덱스가 secondary index에 해당한다.
- 비유: 클러스터 인덱스는 페이지를 바로 펴는 것이고, 논 클러스터 인덱스는 책 뒤의 찾아보기에서 원하는 내용과 페이지를 찾아 이동하는 것이다. 테이블 풀 스캔은 책을 처음부터 한 장 한 장 넘기면서 찾는 것에 해당한다.

## 복합 인덱스 (Composite Index)
- 두 개 이상의 컬럼을 조합하여 만든 인덱스이다.
- 컬럼 순서가 중요하다. `(A, B, C)`의 정렬 순서를 그대로 활용하는 기본 범위는 `A`, `A,B`, `A,B,C` 같은 최좌선 접두사다. 다만 MySQL의 skip scan, index full scan, covering과 조건 pushdown 때문에 `B`나 `C`만 있는 쿼리도 해당 인덱스를 사용할 수 있으므로 `절대 사용하지 않는다`고 단정하면 안 된다.
- 컬럼 순서는 실제 쿼리의 equality, range, 정렬, 그룹화와 covering 요구를 우선해 결정한다. 높은 카디널리티를 앞에 두라는 규칙만으로 정할 수 없다.
- 커버링 인덱스를 만들기 위한 수단으로 자주 활용된다. SELECT에 필요한 컬럼까지 복합 인덱스에 포함시키면 테이블 접근 없이 결과를 반환할 수 있다.
- 주의: 컬럼을 과도하게 추가하면 인덱스 크기 증가 + CUD 성능 저하로 이어지므로 쿼리 패턴에 맞게 설계해야 한다.

## 카디널리티 (Cardinality)
- 컬럼의 고유 값(distinct value) 수를 의미한다.
- 카디널리티가 높을수록(=고유 값이 많을수록) 인덱스 효율이 좋다. 예: 주민번호(높음) vs 성별(낮음)
- 복합 인덱스 순서는 카디널리티만으로 정하지 않는다. 자주 쓰는 equality와 range 조건, 정렬과 그룹화, skip scan 가능성, covering 요구를 함께 본다.

## 선택도 (Selectivity)
- 여기서는 predicate가 반환하는 행의 비율로 정의한다. `선택도 = 조건에 일치하는 행 수 / 전체 레코드 수`
- 선택도가 낮을수록(=적은 행을 반환할수록) 인덱스 효과가 크다.
- 성별, boolean의 흔한 값처럼 많은 행이 일치하는 조건은 선택도가 높아 단독 인덱스 이점이 작을 수 있다. unique equality처럼 한 행만 일치하는 조건은 선택도가 낮다.

## 커버링 인덱스 (Covering Index)
- 쿼리에 필요한 모든 컬럼이 인덱스에 포함되어 추가 clustered row lookup 없이 인덱스만으로 결과를 반환하는 것을 말한다. 인덱스 페이지 자체를 읽는 I/O까지 없다는 뜻은 아니다.
- EXPLAIN에서 Extra 컬럼에 `Using index`가 표시되면 커버링 인덱스가 적용된 것이다.
- 랜덤 I/O를 줄여 성능 향상 효과가 크지만, 인덱스에 컬럼을 과도하게 추가하면 CUD 성능이 저하되므로 균형이 필요하다.

## 인덱스 추가의 운영 리스크

인덱스는 Read 성능을 올리지만 **CUD 성능, 운영 안정성에 부채**를 남긴다. 특히 **운영 중인 테이블에 인덱스를 추가** 하는 것은 조회만큼 위험한 작업.

### Command/Query 비용 비대칭성

- **Query 비용은 선형 감소** (인덱스 타면 빠름)
- **Command 비용은 인덱스 수에 비례 증가** — INSERT/UPDATE/DELETE마다 인덱스 각각 유지 필요
- 쓰기 트래픽이 많은 테이블에 인덱스를 늘리면 **쓰기 TPS 절벽**
- 이미 충분한 인덱스가 있으면 추가 효과가 미미한데 부담은 그대로

### 운영 중 추가의 함정

- PostgreSQL/MySQL에서 인덱스 생성 방식과 버전에 따라 **긴 잠금이나 metadata lock 대기**가 생기고 쓰기를 막을 수 있음
- 운영 중 추가 시 트랜잭션이 대기 → 전체 서비스 지연 → 장애
- PostgreSQL의 `CREATE INDEX CONCURRENTLY`, MySQL의 지원 가능한 `ALGORITHM`과 `LOCK` 조합 같은 **Online DDL**의 정확한 제약을 버전과 인덱스 유형별로 확인
- 복제 환경이면 DDL 적용과 추가 I/O로 **replica lag**가 증가할 수 있음

### 사전 확인 체크리스트

1. **해당 테이블의 쓰기 트래픽** — 평균 TPS, 피크 TPS
2. **기존 인덱스 목록** — 정말 새 인덱스가 필요한지 (기존으로 커버 가능한지)
3. **예상 Query 개선 효과** — `EXPLAIN`으로 인덱스 사용 여부, 비용 추정
4. **Online DDL 지원 여부** — 락 종류와 소요 시간
5. **Replica 영향** — 복제 지연 예상
6. **롤백 계획** — 인덱스 생성 중 중단, 제거가 안전하게 가능한가
7. **피크 시간 회피** — 트래픽 낮은 시간대 진행

### 장애 발생 시 긴급 조치

운영 DB에서 인덱스 추가 후 장애 발생 시:

```sql
-- PostgreSQL 예
SELECT pid, query, state, wait_event
FROM pg_stat_activity
WHERE state != 'idle';

-- 원인 프로세스 종료
SELECT pg_cancel_backend(<pid>);   -- soft
SELECT pg_terminate_backend(<pid>); -- hard

-- 인덱스 롤백
DROP INDEX CONCURRENTLY idx_name;
```

**원칙**: 운영 DB에서 **되돌릴 수 있는 작업** 먼저, 구조 변경은 사전 검토, 소통 필수.

### 운영 DB 조작 사전 합의 프로세스

장애 재발 방지를 위해 팀 차원의 내규:

- **운영 DB DDL/대량 DML**은 반드시 팀 사전 리뷰
- **실행자와 리뷰어 2인 이상** 확인
- **피크 시간 회피**와 **롤백 스크립트** 준비
- **변경 로그** 를 공유 저장소에 기록 (Notion, Confluence, Slack 채널)
- **사고 후 포스트모템**으로 재발 방지 항목 도출

## 관련 문서
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이 분석]] — 페이지 구조와 PK 사이즈로 본 깊이 산정
- [[Transactions|트랜잭션]]
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[Execution-Plan|실행계획]]

## 출처

- [MySQL 8.4 — Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)
- [MySQL 8.4 — `innodb_page_size`](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_page_size)
- [MySQL 8.4 — Skip Scan Range Access Method](https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html#range-access-skip-scan)
