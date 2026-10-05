---
tags: [database, rdbms, mysql, innodb, index, btree]
status: done
category: "Data & Storage - RDB"
aliases: ["B-Tree Index Depth", "B-Tree 인덱스 깊이", "InnoDB 페이지 깊이"]
verified_at: 2026-10-05
---

# B-Tree 인덱스 깊이

InnoDB의 B+Tree 인덱스 깊이를 페이지 구조로 추정하는 방법을 설명한다. 깊이는 페이지 크기, 키와 row 폭, 레코드 포맷, fill 상태에 따라 달라지므로 행 수만으로 고정할 수 없다. 대개 fan-out이 커 깊이는 낮지만 실제 인덱스는 측정해야 한다.

## 페이지 구조의 기본

- InnoDB 페이지 크기 기본값은 **16KiB**다. 인스턴스 초기화 시 `innodb_page_size`를 4, 8, 16, 32, 64KiB 중 지원 범위에서 선택할 수 있으며 이후 변경할 수 없다.
- B+Tree는 **루트, 필요하면 여러 단계의 브랜치, 리프**로 구성된다. 항상 3단인 것은 아니다.
- `tree_level`: 리프 = 0, 그 위로 +1씩 증가 (즉, 깊이 = `tree_level + 1`)
- 리프 페이지는 **이중 링크**로 연결돼 있어 범위 스캔이 효율적 (`page_prev`, `page_next`)

## 깊이 증가가 일어나는 시점

- **리프 페이지가 가득 차면** → 페이지 분할 발생, 같은 레벨에 페이지가 늘어남
- **리프가 아닌 브랜치 페이지가 가득 차면** → 같은 레벨에서 분할되고 부모에 자식 포인터가 추가되므로 깊이는 그대로
- **루트 페이지가 가득 차면** → 루트를 한 단계 올려 새 레벨을 만들며 이때만 **깊이 +1**
- 전체 수용량은 대략 `리프당 레코드 수 × 내부 노드 fan-out^(리프 위 레벨 수)`로 생각할 수 있다. 실제 페이지 오버헤드와 채움률 때문에 이론 최대치와 운영값은 다르다.

## 깊이를 좌우하는 두 값

- **내부 노드 fan-out**: separator key, child page number, 레코드와 페이지 오버헤드에 좌우된다. PK가 길면 보통 fan-out이 낮아진다.
- **리프 밀도**: clustered index 리프는 PK만 저장하는 것이 아니라 **전체 row**를 저장한다. 따라서 row 폭, 가변 길이 컬럼, off-page 저장, 레코드 포맷, 페이지 채움률이 리프당 행 수를 좌우한다.

예를 들어 내부 fan-out을 1,000, 리프당 행 수를 50으로 **가정**하면 리프 위 내부 레벨이 두 개인 트리는 이론상 약 `50 × 1,000²`행을 가리킨다. 이는 원리를 설명하는 계산일 뿐 InnoDB의 보장값이 아니다. INT 또는 BIGINT PK 크기만으로 최대 행 수나 테이블 크기를 확정해서는 안 된다.

## B-Tree에서 B+Tree로: 비교 횟수보다 페이지 I/O

성능을 정하는 것은 키 비교 횟수가 아니라 읽는 페이지 수다. 메모리 안 키 비교를 약 1ns, NVMe SSD의 페이지 읽기를 약 50µs로 가정하면 한 페이지에서 키 약 500개를 비교하는 CPU 비용도 I/O 한 번의 1%에 못 미친다. 값싼 비교를 늘려 비싼 I/O를 줄이는 구조가 유리하다.

| 구조 | 노드에 담는 것 | 높이 예 |
|---|---|---|
| 이진 탐색 트리 | 노드당 키 1개, 자식 2개 | 500만 건에 약 23단. 16KiB 페이지를 읽어도 키 하나만 씀 |
| 순수 B-Tree | 모든 노드에 키와 실제 행 | 행이 1KiB면 페이지당 16행이고 분기도 약 16이라 1,600만 건에 약 6단 |
| B+Tree | 루트와 브랜치는 키와 자식 페이지 번호, 행은 리프에만 | 같은 조건의 1,600만 건이 3단 |

순수 B-Tree는 행 크기가 곧 분기 수를 깎는다. B+Tree는 항상 리프까지 내려가야 하지만 브랜치 엔트리가 작아 분기 수가 크다. InnoDB 소스 기준 COMPACT 계열 레코드 헤더는 5바이트, node pointer의 자식 페이지 번호는 4바이트라 `BIGINT` PK의 브랜치 엔트리는 약 17바이트이고, 16KiB 페이지에 이론상 1,000개 가까이 들어간다.

storage는 byte가 아니라 page나 block 단위로 읽으므로 키 하나가 필요해도 그 page 전체를 읽는다. 이진 트리 노드를 page마다 하나씩 두면 읽은 page 대부분을 버리고 경로도 길다. 균형 BST의 노드를 page 단위로 묶어 저장하려는 최적화는 결국 노드 하나에 키 여러 개를 두는 B-Tree와 비슷한 구조가 되므로, 처음부터 B-Tree 계열을 쓰는 편이 낫다. 차수와 분할, 병합 규칙과 높이별 수용량 범위(101차, 높이 3이면 키 약 26만에서 1억 개)는 [[B-Tree|B-Tree]]에 있다.

## 이론 fan-out과 실측

실제 fan-out은 레코드 헤더, 페이지 헤더와 디렉터리, 분할 뒤 남는 빈 공간 때문에 이론값보다 작다. 강의의 설명과 실측 모두 수백(약 400~500) 수준이었다. fan-out 500, 리프당 200행을 가정하면 높이 2는 약 10만 건, 높이 3은 약 5,000만 건, 높이 4는 약 250억 건을 담는다. 대부분의 테이블이 3~4단에서 끝나는 이유다.

- 리프당 행 수는 16KiB를 `information_schema.TABLES`의 `AVG_ROW_LENGTH`로 나눠 어림한다. 이 값도 통계 기반 추정이다.
- 페이지 구성은 `mysql.innodb_index_stats`의 `size`(인덱스 총 페이지)와 `n_leaf_pages`(리프 페이지)로 본다.

```sql
SELECT index_name, stat_name, stat_value
FROM mysql.innodb_index_stats
WHERE database_name = 'shop' AND table_name = 'product'
  AND stat_name IN ('size', 'n_leaf_pages');
```

`size − n_leaf_pages`를 비리프 페이지 수로, `n_leaf_pages ÷ 비리프 수`를 평균 fan-out으로 어림한다. 강의 실측의 product PK는 총 24,960, 리프 24,900페이지라 비리프가 60 이하였고 평균 fan-out은 약 400 이상, 높이는 루트, 브랜치, 리프의 3단이었다. 다만 소스(`btr_get_size`)에서 `size`는 두 세그먼트가 예약한 페이지 수이고 `n_leaf_pages`는 리프 세그먼트에서 실제로 쓰는 페이지 수다. 예약만 된 빈 페이지가 섞이므로 비리프 수는 상한, fan-out은 하한으로 읽는다. 두 값은 `ANALYZE TABLE`과 자동 재계산 때 갱신되는 persistent statistics다.

## 왜 깊이가 성능에 결정적이지 않은가

- 깊이 4라면 논리적으로 루트부터 리프까지 네 페이지 레벨을 지난다.
- 루트와 상위 페이지가 buffer pool에 있을 가능성은 높지만, 실제 물리 I/O 횟수는 workload와 cache 상태에 따라 달라진다.
- 깊이가 한 단계 줄어도 지연이 같은 비율로 줄지는 않는다. 보조 인덱스에서는 리프 접근 뒤 clustered PK lookup이 추가될 수 있고, 범위 크기와 cache hit가 더 큰 비용 요인이 될 수 있다.

## 페이지 분할과 병합

### 분할

가득 찬 페이지 중간에 레코드를 넣어야 하면 페이지를 둘로 나눈다. 새 페이지 할당, 레코드 이동, 부모의 포인터와 키 범위 수정, 이 변경들의 redo 기록이 함께 일어나는 무거운 작업이다. 가운데에서 나누면 두 페이지가 절반 가까이 비고 리프의 물리 순서가 키 순서와 어긋날 수 있다.

InnoDB는 삽입 위치가 같은 페이지의 직전 삽입 바로 뒤이면 순차 삽입으로 보고 가운데가 아니라 새 레코드 위치에서 나눈다(소스의 split 지점 결정 로직). 기존 페이지는 거의 찬 채로 남고 새 레코드는 옆 페이지로 이어지며, 증가 키의 삽입은 트리 오른쪽 끝 경로만 건드려 그 페이지들이 buffer pool에 머물기 쉽다. 공식 문서 기준으로 clustered index에 삽입할 때 InnoDB는 페이지의 1/16을 이후 삽입과 갱신용으로 비워 두려 하고, 순차 삽입(오름차순 또는 내림차순)이면 페이지가 약 15/16, 무작위 순서면 1/2에서 15/16 사이로 찬다. 분할 비율을 9:1 같은 고정 숫자로 외우기보다 이 채움률 차이로 이해한다.

`innodb_fill_factor`는 `CREATE INDEX`나 재구성 같은 sorted index build에서 페이지를 채우는 비율일 뿐이다. 기본 100은 clustered index 페이지에 1/16을 남긴다. 일반 DML 삽입의 채움 규칙이나 PostgreSQL 테이블의 `fillfactor`와 혼동하지 않는다.

### 병합

DELETE나 값을 줄이는 UPDATE로 페이지 채움률이 `MERGE_THRESHOLD` 아래로 떨어지면 InnoDB는 인접 페이지와 병합을 시도한다. 기본 50%, 설정 범위 1~50이며 B-tree와 R-tree 인덱스에 적용된다.

```sql
ALTER TABLE t1 COMMENT='MERGE_THRESHOLD=45';                -- 테이블 단위
CREATE INDEX id_index ON t1 (id) COMMENT 'MERGE_THRESHOLD=40'; -- 인덱스 단위, 테이블 값보다 우선
```

두 페이지가 모두 50% 근처면 병합 직후 다시 분할되는 반복이 생기고, 잦으면 성능을 해친다. 값을 낮추면 병합이 덜 일어나 반복이 줄지만 너무 낮추면 빈 공간이 많은 페이지가 남아 데이터 파일이 커진다.

- `INFORMATION_SCHEMA.INNODB_METRICS`의 `index_page_splits`, `index_page_merge_attempts`, `index_page_merge_successful`로 관찰한다. 기본은 꺼져 있어 `SET GLOBAL innodb_monitor_enable = 'module_index';`처럼 켜고, counter마다 런타임 비용이 있으므로 운영에서는 필요한 동안만 켠다.
- 값을 낮춘 뒤의 목표는 병합 시도와 성공 횟수가 줄거나, 비슷한 횟수에서 성능이 나아지는 것이다. 큐 테이블이나 대량 purge처럼 삭제가 잦은 테이블은 기본값을 바꾸기 전에 분할과 병합 지표부터 모은다.
- 이름, 이메일처럼 값이 무작위로 들어오는 보조 인덱스는 순차 삽입 최적화를 받지 못해 분할과 병합이 상시 일어난다. 엔트리가 키와 PK뿐이라 페이지당 엔트리가 많아 clustered index보다는 영향이 작다.

## PK 설계가 중요한 다른 이유

깊이 자체는 4를 넘기 어렵지만, **PK 선택은 여전히 중요하다.** 다른 비용 채널이 있기 때문이다.

- **UUID v4 (16B 랜덤)**: 페이지 분할 위치가 랜덤 → 페이지 분할 빈발 → 디스크 단편화 → 캐시 적중률 저하 (채움률 차이는 [[#페이지 분할과 병합|페이지 분할과 병합]])
- **컴파운드 PK (예: VARCHAR(64) + BIGINT)**: 보조 인덱스가 PK 전체를 함께 저장 → **모든 보조 인덱스가 비대해짐** (InnoDB는 보조 인덱스 리프에 PK 값을 저장)
- **순차성 부족한 PK**: 클러스터드 인덱스라서 INSERT가 임의 위치에 들어감 → 페이지 분할 + I/O 증가
- 결론: 깊이 절감보다 **(a) 단조 증가 (b) 짧은 사이즈 (c) 변하지 않음** 3요건을 만족하는 PK가 더 큰 효과를 낸다 → 보통 BIGINT AUTO_INCREMENT 또는 ULID/Snowflake 같은 시간 정렬 ID

## 보조 인덱스의 깊이는 다르다

본문은 클러스터드 인덱스(PK) 기준 깊이만 다루지만, 면접에서는 보조 인덱스도 같은 논리가 적용됨을 알아야 한다.
- 보조 인덱스의 리프 = **(인덱싱한 컬럼 값, PK 값)** 쌍을 저장
- 따라서 보조 인덱스 노드 1개에 들어가는 엔트리 수는 **(인덱스 컬럼 크기 + PK 크기)**에 반비례
- PK가 길수록 보조 인덱스도 깊어지고 비대해짐 → **PK 짧게 유지**가 보조 인덱스 효율로 직결

## Hash 인덱스와 비교

hash 인덱스는 키의 hash로 위치를 바로 찾아 등호 조회가 평균 O(1)이지만, 키 순서를 버려 다음 키를 찾지 못한다. MySQL 8.4 문서 기준 hash 인덱스는 `=`와 `<=>` 비교에만 쓰이고 범위 비교, `ORDER BY` 최적화와 키의 leftmost prefix 탐색에는 쓰이지 않으며, 두 값 사이의 행 수를 추정하지 못해 range optimizer의 인덱스 선택에도 불리하다. PostgreSQL 18의 hash 인덱스도 32-bit hash code만 저장해 `=` 비교만 처리하는 반면, B-tree는 `<`, `<=`, `>=`, `>`와 `BETWEEN` 같은 범위 조건과 정렬된 출력까지 같은 구조로 처리한다. 그래서 등호 조회만 있다고 확신할 수 있는 key-value 성격의 데이터가 아니면 B-tree 계열이 기본이다. MySQL storage engine별로 지정할 수 있는 index type과 InnoDB에 `USING HASH`를 적었을 때의 동작은 [[MySQL-Data-and-Access-Safety#인덱스와 스토리지 엔진|MySQL 인덱스와 스토리지 엔진]], PostgreSQL access method별 용도는 [[PostgreSQL-Production-Operations#Access method의 역할|PostgreSQL access method]]에 있다.

## 면접 체크포인트

- 왜 RDB가 **레드블랙트리가 아니라 B+Tree**를 쓰는가 (디스크 I/O 단위, 한 노드당 자식 수)
- InnoDB 페이지 크기의 기본값과 설정 가능 범위, B+Tree **깊이 추정식**
- 행 수만으로 깊이를 확정할 수 없는 이유를 설명할 수 있는가
- **PK 사이즈와 보조 인덱스 비대화**의 관계를 설명할 수 있는가
- UUID PK가 왜 안 좋은가 (페이지 분할, 단편화, 보조 인덱스 비대)
- B-Tree 대신 B+Tree가 fan-out을 키우는 이유와 `innodb_index_stats`로 실제 fan-out을 어림하는 방법
- 순차 삽입과 무작위 삽입의 페이지 채움률 차이, `MERGE_THRESHOLD`와 병합 후 재분할 반복
- hash 인덱스가 등호 조회에만 쓰이는 이유와 B-tree 계열이 기본값인 이유

## 출처
- [mysqlinternal.com — B-Tree 인덱스의 깊이에 대해서](https://mysqlinternal.com/2024/10/31/b-tree-%ec%9d%b8%eb%8d%b1%ec%8a%a4%ec%9d%98-%ea%b9%8a%ec%9d%b4%ec%97%90-%eb%8c%80%ed%95%b4%ec%84%9c/)
- [velog 480 — B-Tree 알고리즘 : DB 인덱스의 내부 알고리즘](https://velog.io/@480/B-Tree-%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98-DB-%EC%9D%B8%EB%8D%B1%EC%8A%A4%EC%9D%98-%EB%82%B4%EB%B6%80-%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98)
- [MySQL 8.4 — `innodb_page_size`](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_page_size)
- [MySQL 8.4 — Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)
- [MySQL source, `btr_root_raise_and_insert`](https://dev.mysql.com/doc/dev/mysql-server/latest/btr0btr_8cc.html)
- [MySQL 8.4 — The Physical Structure of an InnoDB Index](https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html)
- [MySQL 8.4 — Configuring the Merge Threshold for Index Pages](https://dev.mysql.com/doc/refman/8.4/en/index-page-merge-threshold.html)
- [MySQL 8.4 — InnoDB INFORMATION_SCHEMA Metrics Table](https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-metrics-table.html)
- [MySQL 8.4 — Configuring Persistent Optimizer Statistics Parameters](https://dev.mysql.com/doc/refman/8.4/en/innodb-persistent-stats.html)
- [MySQL 8.4 — InnoDB Row Formats](https://dev.mysql.com/doc/refman/8.4/en/innodb-row-format.html)
- [MySQL 8.4 — Comparison of B-Tree and Hash Indexes](https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html)
- [PostgreSQL 18 — Index Types](https://www.postgresql.org/docs/18/indexes-types.html)
- [btr_get_size, btr_page_get_split_rec_to_right, storage/innobase/btr/btr0btr.cc — MySQL Server 8.4 GitHub](https://github.com/mysql/mysql-server/blob/8.4/storage/innobase/btr/btr0btr.cc)
- [REC_N_NEW_EXTRA_BYTES, REC_NODE_PTR_SIZE, storage/innobase/rem/rec.h — MySQL Server 8.4 GitHub](https://github.com/mysql/mysql-server/blob/8.4/storage/innobase/rem/rec.h)
- [인프런, Hong, MySQL B-Tree Index (Clustered, Secandary, Page, Format)](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=373903)
- [인프런, 김영한, 트리 자료 구조 - 기본편 복습](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471960)
- [인프런, 김영한, B-Tree 내부 구조](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471881)
- [인프런, 김영한, B+Tree 내부 구조 1](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471882)
- [인프런, 김영한, B+Tree 내부 구조 2](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471883)
- [인프런, 김영한, B+Tree 내부 구조 3](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471884)
- [인프런, 김영한, 정리 (인덱스 내부 구조 1 - B+Tree 섹션)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471885)
- [인프런, 김영한, 클러스터드 인덱스 2 - 순차 PK vs 랜덤 PK](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471888)
- [YouTube, 쉬운코드, B tree가 DB 인덱스로 사용되는 이유](https://www.youtube.com/watch?v=liPSnc6Wzfk)

## 관련 문서
- [[Index|Index 기본 (B-Tree, 커버링, 카디널리티)]]
- [[B-Tree|B-Tree 자료구조 (차수, 분할과 병합, 높이별 수용량)]]
- [[Execution-Plan|실행 계획 분석]]
- [[Primary-Key-Strategy|Primary Key 전략]]
- [[Index-Write-Cost-and-Cleanup|인덱스의 쓰기 비용과 정리]]
- [[Sharding|샤딩]]
- [[Schema-Design|스키마 설계]]
- [[Latency-Optimization|레이턴시 최적화 개관]]
