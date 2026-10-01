---
tags: [database, rdbms, mysql, postgresql, oracle, index, storage]
status: done
verified_at: 2026-09-30
category: "Database - RDBMS"
aliases: ["Heap vs Clustered Index", "Heap 테이블과 Clustered Index", "테이블 저장 구조 비교", "Index-Organized Table"]
---

# 테이블 저장 구조: Heap과 Clustered Index

[[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]의 아키텍처 비교에서 테이블 저장 구조 축을 분리한 문서다. 행을 어디에 어떤 순서로 두는지가 PK 접근, 범위 조회와 secondary index 비용을 함께 정한다.

## 배치 방식

- PostgreSQL과 Oracle의 일반 테이블은 heap이다. 행을 PK 순서와 무관하게 들어갈 수 있는 빈 공간에 쌓고, 인덱스 leaf는 행의 물리 위치(PostgreSQL CTID, Oracle ROWID)를 가리킨다.
- InnoDB는 행을 PK 순서로 정렬된 clustered index의 leaf에 저장한다. 인덱스가 곧 테이블이고 secondary index leaf는 물리 주소가 아니라 PK 값을 가진다([[Index|인덱스]]).
- I/O 단위의 이름은 block(Oracle)과 page(MySQL, PostgreSQL)로 다르지만 같은 개념이다. 차이는 그 page가 PK로 정렬된 B-tree node인지, 행이 쌓이는 공간인지다.

## InnoDB가 secondary index에 PK를 두는 이유

page split이나 테이블 재구성으로 행의 물리 위치는 바뀐다. secondary index가 물리 주소를 들고 있으면 행이 움직일 때마다 모든 인덱스를 고쳐야 한다. PK 값은 행이 움직여도 그대로이므로 PK와 그 인덱스의 key 컬럼이 바뀌지 않는 한 secondary index를 고칠 필요가 없다. 쓰기와 구조의 안정성을 얻는 대신 secondary index로 찾은 행은 PK로 clustered index를 처음부터 다시 탐색한다.

## 접근 경로별 손익

| 접근 | Heap (PostgreSQL, Oracle) | Clustered (InnoDB) |
|---|---|---|
| PK 단건 | PK 인덱스 탐색 뒤 행 위치로 한 번 더 이동 | leaf에 행이 있어 인덱스 탐색으로 끝난다 |
| PK 범위 | 인덱스는 정렬돼 있어도 행이 흩어져 있으면 행마다 다른 page를 읽는다 | 시작 위치를 찾은 뒤 인접 leaf를 순서대로 읽는다 |
| secondary 단건 | 인덱스에서 얻은 위치로 바로 이동 | PK를 얻은 뒤 clustered index를 다시 탐색 |
| secondary 범위 | 행마다 위치로 바로 이동 | 행마다 clustered index 탐색을 반복 |
| 행 위치 변화 | 인덱스가 가리키는 위치도 바뀌어야 한다 | PK가 그대로면 secondary index는 그대로 |

- heap은 어느 인덱스로 접근해도 비슷한 비용을, InnoDB는 secondary 접근의 추가 탐색을 감수하고 PK 접근, PK 범위와 PK 순서 저장의 효율을 택한 구조다.
- 표는 이론 비용이다. PostgreSQL은 UPDATE마다 새 행 버전을 만들지만 HOT update면 인덱스 항목 추가를 피하고([[Index-Write-Cost-and-Cleanup#PostgreSQL의 HOT와 Partial Index|HOT]]), visibility map이 허락하면 Index Only Scan으로 heap 접근을 줄이며, 흩어진 위치를 모아 page 순서로 읽는 Bitmap Heap Scan을 쓴다([[Execution-Plan-PostgreSQL|PostgreSQL 실행 계획]]).
- InnoDB의 추가 탐색은 covering index와 복합 인덱스로 없애거나([[Covering-Index|커버링 인덱스]]) ICP와 MRR로 줄인다([[MySQL-Advanced-Index-Access|MySQL 고급 인덱스 접근]]). PK 폭이 모든 secondary index에 복제되는 비용은 [[Primary-Key-Strategy|PK 생성 전략]]에서 따진다.

## 반대 구조를 고르는 옵션

- Oracle은 index-organized table로 PK 인덱스에 행 전체를 저장할 수 있다. 이 테이블의 secondary index는 물리 rowid 대신 PK 기반 logical rowid를 쓴다.
- SQL Server는 PK를 만들면 대응하는 unique clustered index를 기본으로 만들고, PK를 nonclustered로 지정할 수도 있다.
- PostgreSQL `CLUSTER`는 인덱스 순서로 테이블을 한 번 재배치할 뿐 이후 변경은 그 순서를 따르지 않고, 실행 중 `ACCESS EXCLUSIVE` lock으로 읽기와 쓰기를 모두 막는다. `fillfactor`를 100%보다 낮추면 갱신된 행이 같은 page에 머물러 순서가 조금 더 오래 유지된다.

## 출처

- [MySQL 8.4 Reference Manual, Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)
- [PostgreSQL 18 Documentation, CLUSTER](https://www.postgresql.org/docs/current/sql-cluster.html)
- [PostgreSQL 18 Documentation, Heap-Only Tuples (HOT)](https://www.postgresql.org/docs/current/storage-hot.html)
- [Oracle Database 23ai Concepts, Indexes and Index-Organized Tables](https://docs.oracle.com/en/database/oracle/oracle-database/23/cncpt/indexes-and-index-organized-tables.html)
- [Microsoft Learn, Create Primary Keys in SQL Server](https://learn.microsoft.com/en-us/sql/relational-databases/tables/create-primary-keys)
- [인프런, 김영한, 세컨더리 인덱스 1 - 소개](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471890)
- [인프런, 김영한, MySQL, Oracle, PostgreSQL 설계 철학](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471895)
- [인프런, 김영한, 정리 (인덱스 내부 구조 2 섹션)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471896)

## 관련 문서

- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
- [[Index|인덱스]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[Oracle-Index-Features|Oracle 인덱스 기능]]
