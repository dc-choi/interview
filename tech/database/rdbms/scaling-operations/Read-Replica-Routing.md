---
tags: [database, replication, read-replica, performance, routing]
status: done
category: "Data & Storage - RDB"
aliases: ["Read Replica Routing", "읽기 복제본 라우팅"]
verified_at: 2026-10-14
---

# Read Replica 라우팅

DB에 읽기 복제본이 있으면 **어떤 쿼리를 어디로 보낼지**를 앱이 결정해야 한다. 쓰기와 primary의 최신 상태를 전제로 한 transaction은 primary가 기본이고, stale read를 허용하는 read-only workload는 replica를 사용할 수 있다. **복제 지연(replication lag)** 때문에 read-after-write와 snapshot 시점을 명시해야 한다.

## 전제: Replication 자체와 다름

**[[Replication|Replication]]**: DB 간 데이터 복제 (물리/논리 복제, sync/async) — DB 레이어
**Read Replica Routing**: 복제된 환경에서 앱이 쿼리를 어디로 보낼지 — 앱, 드라이버, 프록시 레이어

이 문서는 후자. Replication이 이미 구성돼 있다는 전제.

## 라우팅의 3계층

라우팅을 할 수 있는 위치가 셋. 어디서 하느냐가 **책임, 유연성, 성능**을 가름.

| 계층 | 예 | 장점 | 단점 |
|---|---|---|---|
| **DB endpoint** | Aurora writer, reader endpoint | 연결 대상 선택을 단순화 | SQL별 읽기/쓰기 자동 분기는 아님 |
| **프록시** | RDS Proxy, ProxySQL, HAProxy | 앱 무관, 공통 규칙 중앙화 | 추가 인프라, 단일 장애점 가능 |
| **애플리케이션 / 드라이버** | Prisma, TypeORM, Sequelize 확장 | 세밀한 제어, 쿼리 의도 반영 | 각 서비스마다 구현 필요 |

Aurora reader endpoint는 쿼리가 아닌 연결을 분산한다. 연결 풀의 한 연결은 같은 인스턴스를 사용하므로, 읽기/쓰기 의도에 맞는 endpoint 선택은 앱에 남는다.

## 표준 라우팅 규칙

### 자동 분기 정책 예시 (도구와 설정 확인)
- **stale 허용 read queries** → 복제본. SELECT라도 locking read와 최신 상태가 필요한 조회는 별도 분기한다.
- **Write queries (INSERT/UPDATE/DELETE)** → primary
- **Transactions** → primary (한 트랜잭션 안 모든 쿼리)
- **Raw queries** → primary (안전 기본값 — SELECT인지 판별 어려움)

### 명시적 오버라이드

복제 지원 ORM은 다음과 같은 명시적 선택 수단을 제공한다:
- **primary 강제**: commit 완료 뒤 새 snapshot으로 읽어 자신의 쓰기를 확인할 때
- **replica 강제**: 무거운 분석 쿼리가 primary에 영향 안 주게. 단, Aurora처럼 공유 스토리지면 Reader의 장기 조회도 Writer의 undo purge를 지연시킬 수 있다 → [[MySQL-Undo-Purge-HLL|Undo Purge와 HLL]]

구체 이름은 도구마다 다름:
| 도구 | primary 강제 | replica 강제 |
|---|---|---|
| Prisma (`extension-read-replicas`) | `$primary()` | `$replica()` |
| TypeORM | `createQueryRunner("master")`, `defaultMode: "master"` | `createQueryRunner("slave")`, 기본 읽기 분기 |
| Sequelize | `{ useMaster: true }` 옵션 | 기본 (`findAll` 등) |
| Spring (Spring Data JPA) | `AbstractRoutingDataSource` 등 별도 라우터 구현 | `readOnly`는 힌트이며, annotation만으로 replica를 선택하지 않음 |
| Django | `.using()`으로 primary alias 지정(router보다 우선) | router의 `db_for_read`가 replica alias 반환 |

Django는 `DATABASES`에 `default` 항목을 요구하고, 다른 DB를 고르지 않은 경로는 `default`를 쓴다. primary를 `default`로 두면 router를 거치지 않는 경로도 primary로 간다. 공식 문서의 primary/replica router 예시는 복제 지연과 transaction 상호작용을 다루지 않는다고 밝히므로, 아래의 read-after-write 대응과 transaction 고정은 router에서 따로 구현한다.

## Replication Lag와 Read-After-Write

비동기 복제는 primary의 commit 시점에 replica 적용 완료를 보장하지 않는다. 지연은 부하와 장애에 따라 늘어날 수 있으며 고정 상한으로 가정하지 않는다.

```
1. 사용자가 글 수정 → primary에 UPDATE 완료
2. 직후 목록 조회 → replica로 감 → 아직 복제 안 됨
3. 사용자: "내가 방금 바꾼 게 안 보이네?"
```

### 4가지 대응 전략

**1. Primary 강제 (가장 단순)**
방금 쓴 사용자의 바로 다음 읽기만 primary로 강제. ORM의 `$primary()` 같은 API 사용. 작은 범위에 가장 실용적.

**2. Session Affinity (방금 쓴 사용자 N초 동안)**
세션이나 쿠키에 쓰기 시점을 기록하고 N초 동안 primary로 보낸다.
- 인스턴스가 바뀌어도 같은 쓰기 표식을 읽을 수 있어야 한다. 프로세스 로컬 기록만으로는 서버 간 요청을 연결하지 못한다.
- N초가 지나도 복제가 끝나지 않을 수 있다. 시간 창은 완화책이며 일관성 보장이 아니다.

**3. 필요한 쓰기의 적용 위치 확인**
MySQL 8.4는 해당 commit을 포함한 GTID 집합을 전달해 `WAIT_FOR_EXECUTED_GTID_SET(gtid_set, timeout)`으로 적용을 기다릴 수 있다. 반환값 0은 성공, 1은 시간 초과이며 `timeout=0`은 무기한 대기다.
- 행 존재만으로 특정 갱신의 반영을 판단하지 않는다. 대기한 replica에서 조회하고, 적용 전부터 유지한 오래된 snapshot도 재사용하지 않는다.
- 제한 시간 초과나 오류 시 primary 조회 또는 명시적 실패로 처리한다. 성공으로 간주하지 않는다.

**4. Eventual Consistency 수용 (도메인이 허용하면)**
피드와 집계처럼 지연을 허용하는 조회는 허용 범위와 초과 시 동작을 정하고 replica를 사용한다.

쓰기 직후 primary 조회부터 검토하고, primary 부하와 신선도 요구 때문에 필요한 경우에만 2~3을 추가한다. PostgreSQL 18의 `synchronous_commit=remote_apply`는 설정된 동기 standby의 적용을 기다린다. `synchronous_standby_names`가 비었으면 원격 적용을 기다리지 않으며, 비동기 replica 전체의 최신성도 보장하지 않는다. commit 지연 증가와 실제 읽기 대상, snapshot을 함께 검토한다.

## 트랜잭션과 읽기 복제본

쓰기, locking read와 방금 쓴 값의 read-your-writes가 필요한 transaction은 한 primary connection에 고정한다. primary와 replica를 한 논리 transaction 안에서 섞으면 atomicity와 동일 snapshot을 제공하지 못한다.

다만 replica도 지원하는 isolation level에 따라 **read-only snapshot transaction**을 실행할 수 있다. MySQL InnoDB의 `REPEATABLE READ`는 첫 consistent read의 snapshot을 유지하지만, `READ COMMITTED`는 읽기마다 새 snapshot을 만든다. 여러 query를 한 시점으로 맞추려면 transaction 사용 여부뿐 아니라 isolation level도 확인한다. replica의 snapshot은 primary 최신 상태보다 뒤처질 수 있다.

ORM 확장이 transaction을 primary에 고정하는 것은 일반적인 쓰기 transaction의 안전한 기본값이다. stale 허용 read-only transaction을 replica로 보내려면 별도 client, read-only 표시와 freshness 요구를 명시한다.

## 구현 예 1: Prisma (`extension-read-replicas`)

```
import { PrismaClient } from './generated/prisma/client' // prisma-client generator의 output 경로
import { readReplicas } from '@prisma/extension-read-replicas'

const primary = new PrismaClient({ adapter: primaryAdapter })
const replica1 = new PrismaClient({ adapter: replicaAdapter1 })

const prisma = primary.$extends(
  readReplicas({ replicas: [replica1] })
)

// 자동: findMany → replica
await prisma.user.findMany()

// 명시: Read-Your-Own-Writes
await prisma.user.update({...})
await prisma.$primary().user.findUnique({...})
```

주의점:
- 현재 확장은 Prisma 7.0+와 **Driver Adapter 또는 Accelerate URL**을 요구한다. Prisma 6.x는 확장 0.4.1을 사용한다.
- 여러 replica면 랜덤 선택 → 부하 분산
- 다른 확장과 체인 시 **마지막에 적용**
- Raw 쿼리(`$queryRaw`)는 기본 primary — 복제본 쓰려면 `$replica()` 명시

## 구현 예 2: TypeORM

DataSource 설정에서 master, slaves 배열을 선언.

```
new DataSource({
  type: 'mysql',
  replication: {
    master: { host: 'primary.db' },
    slaves: [
      { host: 'replica1.db' },
      { host: 'replica2.db' },
    ],
  },
})
```

TypeORM의 기본 find와 SelectQueryBuilder는 slave를 사용하고, write와 raw query는 master를 사용한다. `defaultMode: "master"`로 읽기 기본값을 바꿀 수 있다. QueryRunner로 목적지를 고정하고 사용 후 `finally`에서 해제한다.

## 구현 예 3: 드라이버 직접 (Node.js pg, mysql2)

ORM 없이 드라이버 두 개를 수동 관리:

```
const primary = createPool({ host: 'primary.db', ... })
const replica = createPool({ host: 'replica.db', ... })

async function getUser(id) {
  return replica.query('SELECT ... WHERE id = ?', [id])
}
async function updateUser(id, data) {
  return primary.query('UPDATE ... WHERE id = ?', [id])
}
```

가장 유연하지만 **라우팅 로직 수동 관리**. 트랜잭션, Raw, Read-Your-Own-Writes 전부 개발자 책임.

## 흔한 함정

### Primary 과부하 해결 안 됨
ORM이 transaction을 primary에 고정하면 그 안의 읽기는 replica로 분산되지 않는다. 여러 읽기의 동일 snapshot이 필요하면 transaction을 없애지 말고 replica의 read-only transaction 지원과 라우팅을 확인한다.

### Raw 쿼리로 SELECT 하면 primary로 감
Prisma read-replicas 확장과 TypeORM은 raw query를 기본 primary로 보낸다. SQL이 SELECT여도 replica로 자동 분기된다고 가정하지 말고 명시적 API를 사용한다.

### Replication Lag 미측정
Lag가 실제로 얼마나 되는지 **모니터링 안 하고** 앱 설계 → 예상보다 큰 지연에서 read-after-write 빈발. 대시보드 필수.

### 커넥션 풀 합산 관리 실패
풀 구성은 도구마다 다르다. Sequelize v6는 read/write 풀 두 개를 유지하며, 별도 client를 만드는 구성은 client별 풀도 확인한다. 앱 인스턴스 수까지 포함해 각 DB로 열리는 연결의 상한을 계산한다.

### 장애 시 fallback 없음
Replica 장애 시 primary fallback, 제한된 stale 결과, 명시적 실패 중 정책을 정한다. primary 여유 용량 없이 모든 읽기를 우회하면 쓰기까지 영향을 받을 수 있다.

## 면접 체크포인트

- 라우팅 3계층(DB, 프록시, 앱) 구분
- 자동 라우팅 규칙 (read → replica, write, transaction → primary)
- Replication Lag로 생기는 Read-After-Write 문제와 4가지 대응
- 쓰기, locking read와 read-your-writes transaction을 primary에 고정하는 이유
- stale 허용 read-only snapshot transaction을 replica에서 실행할 때의 snapshot 시점
- Raw 쿼리가 기본 primary인 이유 (안전 기본값)
- 시간 기반 sticky routing이 보장이 아닌 이유와, GTID 대기 뒤 읽을 replica 및 snapshot 선택

## 출처
- [MySQL 8.4 Reference Manual — GTID Functions](https://dev.mysql.com/doc/refman/8.4/en/gtid-functions.html)
- [PostgreSQL 18 Documentation — Write Ahead Log](https://www.postgresql.org/docs/18/runtime-config-wal.html)
- [Amazon Aurora User Guide — Reader endpoints](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Reader.html)
- [TypeORM Documentation — Multiple data sources, databases, schemas and replication setup](https://typeorm.io/docs/data-source/multiple-data-sources/)
- [Sequelize v6 Documentation — Read Replication](https://sequelize.org/docs/v6/other-topics/read-replication/)
- [Prisma Docs — Read Replicas](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/read-replicas)
- [GitHub — prisma/extension-read-replicas](https://github.com/prisma/extension-read-replicas)
- [MySQL 8.4 Reference Manual — Consistent Nonlocking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [Spring Framework Reference, Using `@Transactional`](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
- [Django 6.1 Documentation — Multiple databases](https://docs.djangoproject.com/en/6.1/topics/db/multi-db/)
- [Amazon Web Services Korea (YouTube) — 높은 가용성과 성능 향상을 위한 Amazon Aurora 및 ElastiCache 활용 팁](https://www.youtube.com/watch?v=bDDfVQkOcQM)

## 관련 문서
- [[Replication|Replication (sync / async)]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[Isolation-Level|Isolation Level]]
- [[ORM|ORM]]
- [[RDS-Aurora-Endpoints|Aurora Endpoint 운영 (Writer와 Reader 읽기 분산 비율)]]
- [[RDS-Operational-Pitfalls|RDS 운영 함정 (복제 지연 read-after-write 버그)]]
- [[RDS-Zero-Downtime-Migration|무중단 마이그레이션 (Read Replica 승격 컷오버)]]
