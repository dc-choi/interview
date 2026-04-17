---
tags: [database, replication, read-replica, performance, routing]
status: done
category: "Data & Storage - RDB"
aliases: ["Read Replica Routing", "읽기 복제본 라우팅"]
---

# Read Replica 라우팅

DB에 읽기 복제본이 있으면 **"어떤 쿼리를 어디로 보낼지"** 를 앱이 결정해야 한다. 읽기는 복제본, 쓰기·트랜잭션은 primary가 기본. 그런데 **복제 지연(replication lag)**이 있어서 단순 규칙만으론 read-after-write 문제가 생기고, 트랜잭션 경계와 일관성 요구에 따라 세밀한 제어가 필요.

## 전제: Replication 자체와 다름

**[[Replication|Replication]]**: DB 간 데이터 복제 (물리/논리 복제, sync/async) — DB 레이어
**Read Replica Routing**: 복제된 환경에서 앱이 쿼리를 어디로 보낼지 — 앱·드라이버·프록시 레이어

이 문서는 후자. Replication이 이미 구성돼 있다는 전제.

## 라우팅의 3계층

라우팅을 할 수 있는 위치가 셋. 어디서 하느냐가 **책임·유연성·성능**을 가름.

| 계층 | 예 | 장점 | 단점 |
|---|---|---|---|
| **DB 레이어** | Aurora 자동 endpoint (writer·reader) | 앱 무지 | 라우팅 로직이 제한적 |
| **프록시** | RDS Proxy, ProxySQL, HAProxy | 앱 무관, 공통 규칙 중앙화 | 추가 인프라, 단일 장애점 가능 |
| **애플리케이션 / 드라이버** | Prisma·TypeORM·Sequelize 확장 | 세밀한 제어, 쿼리 의도 반영 | 각 서비스마다 구현 필요 |

보통 **DB endpoint + 앱 라우팅** 조합. 프록시는 대규모 공용 인프라일 때.

## 표준 라우팅 규칙

### 자동 분기
- **Read queries (SELECT)** → 복제본
- **Write queries (INSERT/UPDATE/DELETE)** → primary
- **Transactions** → primary (한 트랜잭션 안 모든 쿼리)
- **Raw queries** → primary (안전 기본값 — SELECT인지 판별 어려움)

### 명시적 오버라이드

대부분의 ORM이 두 가지 API를 제공:
- **primary 강제**: 쓰고 바로 읽을 때 (Read-Your-Own-Writes 보장)
- **replica 강제**: 무거운 분석 쿼리가 primary에 영향 안 주게

구체 이름은 도구마다 다름:
| 도구 | primary 강제 | replica 강제 |
|---|---|---|
| Prisma (`extension-read-replicas`) | `$primary()` | `$replica()` |
| TypeORM | QueryRunner·DataSource replication 설정 | 기본 읽기 동작 |
| Sequelize | `{ useMaster: true }` 옵션 | 기본 (`findAll` 등) |
| Hibernate | `@Transactional(readOnly = false)` + 라우터 | `readOnly = true` |

## Replication Lag와 Read-After-Write

비동기 복제는 primary → replica 동기화에 **ms~수 초** 지연. 이로 인한 전형적 버그:

```
1. 사용자가 글 수정 → primary에 UPDATE 완료
2. 직후 목록 조회 → replica로 감 → 아직 복제 안 됨
3. 사용자: "내가 방금 바꾼 게 안 보이네?"
```

### 4가지 대응 전략

**1. Primary 강제 (가장 단순)**
방금 쓴 사용자의 바로 다음 읽기만 primary로 강제. ORM의 `$primary()` 같은 API 사용. 작은 범위에 가장 실용적.

**2. Session Affinity (방금 쓴 사용자 N초 동안)**
세션·쿠키에 "last-write-at" 기록. N초 내 같은 사용자의 읽기는 전부 primary.
- 장점: 사용자 경험 일관
- 단점: 세션 상태 관리 복잡

**3. 복제 완료 확인 (Replication Lag 모니터)**
primary에서 쓴 후 replica에서 해당 row(또는 GTID)가 보일 때까지 poll → 보이면 읽기.
- 장점: 정확
- 단점: 추가 쿼리·지연

**4. Eventual Consistency 수용 (도메인이 허용하면)**
"몇 초 늦어도 OK"인 도메인(피드·집계)은 그냥 replica 사용. UX상 약간의 지연 수용.

대부분의 실무는 **1번(primary 강제)** 이 간결하고 충분. 복잡한 경우만 2~3.

## 트랜잭션과 읽기 복제본

**트랜잭션 안의 모든 쿼리는 primary로** 가야 한다. 이유:

- 트랜잭션은 **원자적 일관성**이 핵심 — replica 쓰면 "중간에 본 값이 트랜잭션 종료 후엔 다를 수 있음"
- 복제본은 **트랜잭션 격리 수준을 보장 못 함** — snapshot 시점이 primary와 다를 수 있음

ORM 확장들이 자동으로 **트랜잭션 내부는 primary 고정**하는 이유.

예외: 긴 읽기 전용 리포트를 replica에서 명시적 트랜잭션 없이 실행. 트랜잭션 없으면 primary 격리 보장도 필요 없음.

## 구현 예 1: Prisma (`extension-read-replicas`)

```
import { PrismaClient } from '@prisma/client'
import { readReplicas } from '@prisma/extension-read-replicas'

const primary = new PrismaClient({ adapter: primaryAdapter })
const replica1 = new PrismaClient({ adapter: replicaAdapter1 })

const prisma = primary.$extends(
  readReplicas({ replicas: [replica1, replica2] })
)

// 자동: findMany → replica
await prisma.user.findMany()

// 명시: Read-Your-Own-Writes
await prisma.user.update({...})
await prisma.$primary().user.findUnique({...})
```

주의점:
- Prisma 7.0+ + **Driver Adapter 또는 Accelerate** 필수
- 여러 replica면 랜덤 선택 → 부하 분산
- 다른 확장과 체인 시 **마지막에 적용**
- Raw 쿼리(`$queryRaw`)는 기본 primary — 복제본 쓰려면 `$replica()` 명시

## 구현 예 2: TypeORM

DataSource 설정에서 master·slaves 배열을 선언.

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

Repository는 기본 slaves에서 읽고, write는 master로. QueryRunner로 세밀 제어.

## 구현 예 3: 드라이버 직접 (Node.js pg·mysql2)

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

가장 유연하지만 **라우팅 로직 수동 관리**. 트랜잭션·Raw·Read-Your-Own-Writes 전부 개발자 책임.

## 흔한 함정

### Primary 과부하 해결 안 됨
트랜잭션 안에 읽기를 많이 넣으면 → 전부 primary → 복제본 활용 효과 0. **읽기 전용 쿼리는 트랜잭션 밖**으로 빼야 의미 있음.

### Raw 쿼리로 SELECT 하면 primary로 감
대부분 라이브러리가 Raw 쿼리 안의 SELECT 자동 감지 못 함 → primary 기본값. 명시적 API(`$replica()`)로 우회 필요.

### Replication Lag 미측정
Lag가 실제로 얼마나 되는지 **모니터링 안 하고** 앱 설계 → 예상보다 큰 지연에서 read-after-write 빈발. 대시보드 필수.

### 커넥션 풀 합산 관리 실패
primary + replica N대 각각 풀 생성 → 커넥션 총합이 예상보다 많음 → DB 커넥션 한도 초과.

### 장애 시 fallback 없음
Replica 죽으면 읽기 실패. **Replica 헬스체크 + primary fallback** 전략 필수 (ORM이 지원하면 활용, 아니면 직접 구현).

## 면접 체크포인트

- 라우팅 3계층(DB·프록시·앱) 구분
- 자동 라우팅 규칙 (read → replica, write·transaction → primary)
- Replication Lag로 생기는 Read-After-Write 문제와 4가지 대응
- 트랜잭션이 항상 primary로 가야 하는 이유
- Raw 쿼리가 기본 primary인 이유 (안전 기본값)
- 읽기 전용 쿼리를 트랜잭션 밖으로 빼야 하는 이유

## 출처
- [Prisma Docs — Read Replicas](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/read-replicas)
- [GitHub — prisma/extension-read-replicas](https://github.com/prisma/extension-read-replicas)

## 관련 문서
- [[Replication|Replication (sync / async)]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[Isolation-Level|Isolation Level]]
- [[ORM|ORM]]
