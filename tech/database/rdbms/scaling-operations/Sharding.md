---
tags: [database, rdbms, postgresql, citus, sharding, distributed-database]
status: done
category: "Data & Storage - RDB"
aliases: ["Sharding"]
---

# Sharding

Row 단위로 나눠서 테이블을 저장하는 방법이다. 데이터를 각자 다른 데이터베이스 서버에 저장한다.

인덱스 크기가 지나치게 커진 경우 테이블을 나누면 각 서버가 다루는 인덱스도 작아져 접근 시간이 줄어든다. 지역별로 나누면 요청이 각 지역의 데이터베이스로 분산되어 더 빠른 처리 속도를 기대할 수 있다.

다만 샤딩은 최후의 수단이다. 다른 방법을 최대한 검토하고 그것으로 해결되지 않을 때만 도입한다. 애플리케이션의 복잡도가 올라가고, 데이터를 한 곳에서 조회할 수 없게 되기 때문이다.

## 키 → 서버 매핑 방식

어느 키가 어느 서버에 있는지 정하는 규칙에 따라 확장성과 부하 분산이 갈린다.

- **모듈로 해싱** (`hash(key) % 서버수`): 단순하지만 서버 수가 바뀌면 거의 모든 키의 위치가 바뀌어 대량 재배치가 일어난다. 서버 한 대만 추가해도 캐시 미스가 폭주하므로 증설, 장애에 취약.
- **Range Sharding** (ID 범위로 분할, 예: 1~10000은 1번 서버, 10001~20000은 2번 서버): 이해와 조회가 쉽다. 단 특정 구간에 데이터, 트래픽이 몰리면(예: 이벤트 기간 가입자가 특정 ID 구간에 집중) 그 서버만 과부하되는 쏠림이 생긴다. 분포와 트래픽 패턴을 모르면 위험.
- **Consistent Hashing**: 노드 추가, 제거 시 평균 1/N만 재배치돼 증설과 장애 복구에 유리하다. 가상 노드로 분포를 균등화한다 → [[Consistent-Hashing]].
- **고정 슬롯**: Redis Cluster의 16384 슬롯처럼 슬롯을 노드에 명시 할당해 운영자가 분배를 제어 → [[Redis-Cluster-Sharding]].

## Citus의 PostgreSQL 샤딩 모델

Citus는 PostgreSQL extension으로 coordinator가 metadata를 보고 쿼리를 worker의 shard로 전달하거나 여러 worker에 병렬화한다. 단순히 테이블을 여러 조각으로 만드는 것보다 distribution column을 실제 query boundary와 일치시키는 일이 핵심이다.

```sql
SELECT create_distributed_table('orders', 'tenant_id');
SELECT create_distributed_table(
  'order_items',
  'tenant_id',
  colocate_with => 'orders'
);
SELECT create_reference_table('currencies');
```

### Distribution column 선택

- 대부분의 큰 테이블에 존재하고 `WHERE`, `JOIN`, `GROUP BY`에 자주 쓰이는 키를 후보로 삼는다.
- 값의 cardinality와 분포가 충분히 고른지 확인한다. 한 tenant가 대부분의 데이터를 차지하면 worker hotspot이 생긴다.
- 관련 테이블을 같은 키와 colocation group으로 배치하면 같은 키의 행을 같은 worker에서 조인해 network shuffle을 줄일 수 있다.
- hash 분산에서 timestamp 자체를 키로 고르면 최근 시간 범위가 한 shard에 모이는 것이 아니라 여러 shard로 흩어진다. 시간 보존과 pruning은 PostgreSQL range partitioning을 함께 검토한다.

### 제약과 reference table

worker 하나가 로컬에서 유일성을 판정할 수 있도록 분산 테이블의 `PRIMARY KEY`와 `UNIQUE`는 distribution column을 포함해야 한다. 예를 들어 `tenant_id`로 분산했다면 전역 `order_id`만의 유일성보다 `(tenant_id, order_id)` 제약이 자연스럽다.

작고 모든 worker의 query에서 필요한 차원 데이터는 reference table로 복제할 수 있다. 로컬 조인이 쉬워지는 대신 모든 worker에 사본을 유지하므로 큰 테이블이나 write-heavy 테이블에는 적합하지 않다.

### 판단 기준

행 수만으로 Citus 도입을 결정하지 않는다. 단일 PostgreSQL에서 schema, query, index, partitioning과 hardware를 조정한 뒤에도 저장 용량이나 CPU 처리량의 수평 확장이 필요한지 확인한다. cross-shard transaction, global uniqueness, rebalance, backup/restore와 장애 운영의 복잡성이 얻는 처리량보다 큰지도 검증한다.

주기적 분산 rollup은 worker가 partial aggregate를 계산하고 coordinator가 합치는 방식으로 효율화할 수 있다. 하지만 event-time 처리나 낮은 지연의 streaming semantics가 필요하다면 별도 stream 처리 계층과 비교한다. DB 내부 스케줄링은 [[PostgreSQL-Extensions|PostgreSQL 확장 생태계]]를 참고한다.

## Postgres 수평 확장 — 앞단 계층 패턴 (라우터, 풀러, 제어 영역)

Citus가 extension으로 DB 안에서 분산을 처리한다면, MySQL의 Vitess에서 굳어진 앞단 계층 패턴은 Postgres를 고치거나 호환 엔진을 새로 쓰지 않고 실제 Postgres 인스턴스 앞에 계층을 쌓아 수평 확장을 푼다. 애플리케이션은 표준 와이어 프로토콜, 기존 드라이버와 ORM으로 단일 접속점에 연결하고, 뒤에서는 세 계층이 분업한다.

| 계층 | 역할 | Vitess 대응 |
|---|---|---|
| 라우터(게이트웨이) | 와이어 프로토콜 종단, 쿼리 파싱과 분산 플래닝, 샤드로 분배한 뒤 결과를 한 스트림으로 병합 | vtgate |
| 풀러(인스턴스 사이드카) | 각 Postgres 인스턴스 옆에서 연결 풀링과 세션 관리. 그 인스턴스가 실제로 감당하는 크기로 풀을 잡는다 | vttablet |
| 제어 영역(오케스트레이터) | 복제 모니터링, 계획과 비계획 장애 전환, 백업과 복원, 리샤딩, 스키마 변경과 버전 업그레이드 조율 | vtctld |

- 실제 Postgres를 뒤에 두므로 확장 기능, 플래너 동작, 버전 호환성 부채를 피한다. 대신 라우터가 프로토콜과 쿼리 파싱을 직접 구현해야 하는 부채를 진다.
- 계층마다 장애 도메인과 스케일 축이 다르다. 라우터는 독립적으로 수평 확장하고, 풀러는 인스턴스와 함께 움직이며, 제어 영역은 소수로 둔다.
- 샤딩은 마지막에 얹는다. 이 패턴의 오픈소스 구현이 알파 단계에서 풀링, 자동 장애 전환, 백업 오케스트레이션이라는 단일 샤드 운영 기반을 먼저 내놓고 샤딩을 뒤로 미룬 순서가 이를 보여 준다. 라우터 계층은 샤딩 없이도 풀링과 라우팅만으로 가치를 낸다.
- 단일 프라이머리 비샤딩 모드로 시작해 나중에 리샤딩할 수 있으면 샤딩 도입 시점을 데이터가 커진 뒤로 미룰 수 있다. 그러나 샤드 키 선택은 여전히 되돌리기 비싼 결정이고, 라우팅 계층이 크로스 샤드 조인, 분산 트랜잭션, 전역 유일성의 비용을 없애 주지는 않는다. 위의 distribution column 원칙이 그대로 적용된다.

2026년 9월 기준 이 패턴의 구현으로 오픈소스 Multigres(Vitess 공동 제작자가 이끄는 Vitess 아키텍처의 Postgres 적응, 2026년 6월 v0.1 alpha, 샤딩 미포함 단일 샤드 HA와 풀링)와 관리형 Neki(PlanetScale, 대규모 샤딩 MySQL 운영 경험을 근거로 내놓은 Platform Preview, 샤드 그룹 단위로 워크로드별 샤딩 설정 분리)가 있다. Neki는 프리뷰 기간에 프로덕션 워크로드를 올리지 말라고 명시하고, Multigres는 v0.1 alpha로 아직 실험과 피드백 단계다. 관리형은 제어 영역 운영, 리샤딩 워크플로와 장애 전환 검증을 벤더가 지는 대신 락인과 비용이 따르고, 오픈소스는 그 반대로 운영 인력을 요구한다.

## 출처
- [Citus 13.0 Documentation, Concepts](https://docs.citusdata.com/en/stable/get_started/concepts.html)
- [Citus 13.0 Documentation, Query Performance Tuning](https://docs.citusdata.com/en/stable/performance/performance_tuning.html)
- [Citus 13.0 Documentation, Creating and Modifying Distributed Objects](https://docs.citusdata.com/en/stable/develop/reference_ddl.html)
- [분산 처리와 스케줄링 환경 — 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440745)
- [Citus 분산 테이블과 분산 쿼리 — 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440746)
- [스케줄러와 분산 집계 — 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=440748)
- [인프런, Hong, Partitioning과 Sharding](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338558)
- [우아한테크세미나 191121 우아한레디스 — 우아한테크](https://www.youtube.com/watch?v=mPB2CZiAkKM)
- [Multigres - Postgres의 수평 확장을 위한 오픈소스 — GeekNews](https://news.hada.io/topic?id=33505)
- [Multigres v0.1 Alpha: an operating system for Postgres — Supabase](https://supabase.com/blog/multigres-v0-1-alpha)
- [Neki - Postgres를 여러 서버로 확장하는 PlanetScale의 새 서비스 — GeekNews](https://news.hada.io/topic?id=33501)
- [Introducing Neki — PlanetScale](https://planetscale.com/blog/introducing-neki)

## 관련 문서
- [[Clustering|Cluster]]
- [[Replication]]
- [[Normalization|정규화]]
- [[Consistent-Hashing|Consistent Hashing]]
- [[Redis-Cluster-Sharding|Redis Cluster, Hash Slot]]
- [[PostgreSQL-Extensions|PostgreSQL 확장 생태계]]
