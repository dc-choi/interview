---
tags: [database, replication, read-replica, routing, orm, prisma, typeorm]
status: done
category: "Data & Storage - RDB"
aliases: ["Read Replica Routing Implementations", "읽기 복제본 라우팅 구현", "Prisma read replicas", "TypeORM replication"]
verified_at: 2026-11-21
---

# Read Replica 라우팅 구현 예

[[Read-Replica-Routing|Read Replica 라우팅]]의 기본 규칙(stale을 허용하는 읽기는 replica, 쓰기와 transaction과 raw query는 primary)을 ORM 확장, ORM 설정과 드라이버 직접 관리로 구현한 예다. 아래 API 동작은 2026-11-21 Prisma ORM 7 문서와 확장 README, TypeORM 문서로 대조했다. 복제 지연 대응과 transaction 고정의 원칙은 상위 문서를 따른다.

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
- 확장 0.5.0의 peer dependency는 `@prisma/client` ^7.0.0이다. 2026-11-21 Prisma 문서는 release candidate인 Prisma ORM 8을 기본으로 보여 주지만 read replica 안내는 ORM 7 문서에만 있으므로, 8로 올릴 때는 확장의 지원 여부를 다시 확인한다.
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

## 출처
- [Prisma Docs — Read Replicas](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/read-replicas) — Prisma ORM 7 문서. 2026-11-21 driver adapter 초기화, 무작위 replica 선택, `$transaction`의 primary 실행, `$primary()`와 `$replica()` 대조
- [GitHub — prisma/extension-read-replicas](https://github.com/prisma/extension-read-replicas) — 2026-11-21 README의 Prisma 7.0+ 요구, 6.x용 0.4.1, raw query의 primary 기본값과 마지막 적용 조건, 0.5.0의 peer dependency 대조
- [Prisma Docs — llms.txt](https://www.prisma.io/docs/llms.txt) — 2026-11-21 Prisma ORM 8이 release candidate이고 ORM 7 문서가 따로 유지된다는 색인 설명
- [TypeORM Documentation — Multiple data sources, databases, schemas and replication setup](https://typeorm.io/docs/data-source/multiple-data-sources/) — 2026-11-21 find와 SelectQueryBuilder의 slave 사용, write와 raw query의 master 사용, `defaultMode`, QueryRunner 해제 대조

## 관련 문서
- [[Read-Replica-Routing|Read Replica 라우팅]] — 라우팅 계층, 자동 분기 규칙, read-after-write 대응과 transaction 고정
- [[TypeORM-Transactions-and-Replication|TypeORM 트랜잭션과 복제]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[ORM|ORM]]
