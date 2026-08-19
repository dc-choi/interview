---
tags: [database, orm, mikroorm, performance, logging, cache, replicas]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM Performance", "MikroORM Troubleshooting", "MikroORM 성능 진단"]
---

# MikroORM 성능과 장애 진단

성능 문제를 ORM 설정 하나로 고치려 하지 않는다. 요청 단위의 query 수, 생성 SQL, parameter, 반환 row 수, DB execution plan, connection 대기와 payload 크기를 차례로 좁힌다. ORM log는 가설을 찾는 신호이고 production DB plan과 실제 workload는 별도 증거다.

## 먼저 수집할 최소 증거

| 범위 | 질문 | 관찰 수단 |
|---|---|---|
| 요청 | 느린 endpoint가 무엇이고 어느 path가 반복되는가 | trace, route metric, application log |
| ORM | query 수, SQL shape, 소요 시간은 무엇인가 | `debug`, `slowQueryThreshold`, custom logger |
| DB | 실제로 어떤 index와 join을 선택했는가 | parameter를 넣은 `EXPLAIN`, DB slow log |
| 연결 | pool 대기나 replica lag가 있는가 | driver/pool metric, DB metric |
| 결과 | 과다 hydrate, serialize, cache stale이 있는가 | result size, payload, 재현 fixture |

한 요청에서 SQL이 여러 번 나온다고 바로 N+1이라고 결론 내리지 않는다. v7의 `balanced` 전략은 to-one을 join하고 to-many를 별도 query로 가져온다. 예상된 select-in과 반복 loop로 생긴 query를 SQL shape, parent 수와 호출 stack으로 구분한다.

## 안전한 logging 설정

```ts
import { defineConfig } from '@mikro-orm/postgresql';

export default defineConfig({
  debug: process.env.NODE_ENV === 'development'
    ? ['query', 'query-params', 'discovery']
    : false,
  slowQueryThreshold: 200,
});
```

- namespace는 `query`, `query-params`, `schema`, `discovery`, `info`, `deprecated`, `slow-query`다.
- `query-params`는 `query`도 켜야 동작한다. 비밀번호, token, 이메일 등 민감 값이 parameter에 들어갈 수 있으므로 production 기본값으로 두지 않는다.
- `slowQueryThreshold`를 넘으면 debug 여부와 무관하게 `slow-query` warning이 난다. `0`은 모든 query를 slow로 기록하므로 장애 재현 외에는 쓰지 않는다.
- `slow-query`의 `[took ...]` 값만으로 DB CPU, lock wait, network, hydration 비용의 원인을 확정하지 않는다. 같은 parameter로 DB plan과 wait event를 확인한다.
- custom logger는 query text와 parameter를 그대로 외부 관측 시스템에 보내기 전에 redaction 정책을 적용한다.

## 증상별 첫 진단

| 증상 | 가능한 경계 | 먼저 확인할 것 | 흔한 잘못된 대응 |
|---|---|---|---|
| 목록 endpoint가 parent 수에 비례해 느려짐 | lazy loading loop, to-many populate | 요청당 query 수, 반복 SQL과 parent 수 | 무조건 joined 전략으로 전환 |
| query는 적은데 응답이 큼 | join fan-out, 과도한 populate, serialization | row 수, duplicate parent, payload size | index만 추가 |
| cold start가 느림 | metadata discovery, source/layout, cache | discovery log, image의 TS source와 cache | 모든 cache를 영구 보존 |
| write 직후 old value | read replica lag, result cache | read connection type, cache key와 TTL | consistency 문제를 retry만으로 숨김 |
| connection 부족 또는 timeout | 긴 transaction, pool 대기, leaked work | transaction duration, DB connection state | pool만 크게 늘림 |
| migration 뒤 query가 느림 | index 누락, column type 또는 planner 변화 | pre/post plan, cardinality, migration SQL | ORM load strategy만 조정 |
| cache가 갱신되지 않음 | key 설계, 무효화 owner, shared adapter | write event와 remove 시점 | Identity Map을 cache로 오해 |
| production에서만 entity 발견 실패 | compiled artifact, ESM import, metadata cache | image에서 boot와 discovery | local TS glob만 수정 |

## Relation loading을 측정하며 고른다

v7 기본 `balanced`는 to-one을 join하고 to-many를 select-in으로 가져온다. 이는 출발점일 뿐 모든 query의 최적값은 아니다.

| 전략 | 유리한 경우 | 위험 신호 |
|---|---|---|
| `joined` | 작은 to-one graph, DB에서 한 번에 제한할 때 | to-many가 섞여 row가 곱해짐 |
| `select-in` | collection과 pagination, join fan-out 회피 | relation depth가 깊어 query 수가 커짐 |
| `balanced` | 일반적인 to-one과 to-many 혼합 | 실제 relation graph와 다를 수 있음 |

진단 순서는 다음과 같다.

1. 같은 fixture에서 `populate`, `fields`, order와 page size를 고정한다.
2. query log로 SQL 개수와 SQL shape를 비교한다.
3. 결과의 parent 수, child 수, duplicate 여부와 payload 크기를 확인한다.
4. representative cardinality에서 `EXPLAIN`을 보고 scan, sort, join을 검토한다.
5. 한 가지 loading 또는 index 변경만 적용하고 p50/p95, DB load, error rate를 같은 관찰 창에서 비교한다.

`fields`로 부분 loading할 때 relation을 이어 줄 FK와 primary key가 필요한지 확인한다. QueryBuilder의 raw 결과는 managed entity hydration과 Identity Map을 거치지 않으므로, 같은 endpoint 안에서 API 선택을 바꿨다면 serialization과 write 흐름도 함께 검증한다.

## Result cache는 일관성 계약이다

MikroORM result cache는 `find`, `findOne`, `count`와 QueryBuilder result method에 사용할 수 있다. 기본 adapter는 ORM instance 전체에서 공유되는 in-memory cache이며 기본 만료는 1초다. request마다 달라지는 Identity Map과는 다른 계층이다.

```ts
const users = await em.find(User, { isActive: true }, {
  cache: ['active-users', 5_000],
});
```

- key를 명시하면 write가 어떤 read를 무효화해야 하는지 추적할 수 있다.
- 명시 key 자체가 cache identity다. 서로 다른 query나 tenant가 같은 key를 공유하면 첫 결과가 재사용될 수 있으므로 namespace와 parameter 범위를 key 설계에 포함한다.
- write path는 관련 key에 `em.clearCache(key)`를 호출하거나 stale read를 허용할 TTL을 명시한다.
- 여러 instance나 여러 pod에 공유할 cache가 필요하면 adapter의 저장소, TTL, eviction과 장애 시 행동을 별도로 설계한다. 기본 in-memory cache만으로 cluster 일관성을 얻지 못한다.
- cache miss, hit, stale read 허용 시간, invalidation failure를 관측한다.
- domain write를 ORM이 모든 관련 query key에 대해 자동 무효화한다고 가정하지 않는다. write path별 무효화 owner를 정한다.

cache가 빨라졌다는 주장은 query 수 감소뿐 아니라 stale read 허용 범위, DB 부하, error fallback과 invalidation 실패율을 함께 본 뒤에 한다.

## Replica와 read-after-write

`replicas`를 설정하면 transaction 밖의 SELECT와 COUNT는 기본적으로 무작위 read replica를 고를 수 있다. 쓰기 직후 반드시 최신 값을 보여야 하는 path는 write connection을 명시하거나 일관된 transaction 경계를 사용한다.

```ts
const user = await em.findOneOrFail(User, userId, {
  connectionType: 'write',
});
```

모든 read를 write connection으로 보내면 replica lag는 피하지만 scale-out 이점도 줄어든다. `preferReadReplicas: false`는 기본을 write로 바꾸고 필요한 읽기만 replica로 선택할 때 사용한다. 어떤 선택이 맞는지는 API의 freshness 계약과 replica lag 관측값으로 정한다.

## 운영 장애 대응 순서

1. 영향을 받는 release, route, DB cluster, driver와 config version을 고정한다.
2. 오류율, latency, connection 수, slow query와 migration 상태를 기준선과 비교한다.
3. query log와 trace에서 대표 request 하나를 골라 SQL, parameter shape와 호출 경로를 확인한다. 민감 값은 마스킹한다.
4. 동일 query를 representative data에서 plan으로 확인한다. production에 임의의 `EXPLAIN ANALYZE`를 실행하기 전 DB 운영 절차를 따른다.
5. 가설 하나만 고른다. 예를 들어 missing index, join fan-out, replica lag, long transaction 중 하나다.
6. rollback, feature flag 또는 connection type 고정 같은 가장 작은 안전 조치를 적용하고 같은 지표로 재측정한다.
7. 원인, 증거, 임시 조치와 영구 개선을 분리해 기록한다.

## Query cancellation의 경계

v7.1은 EntityManager, QueryBuilder와 fork에 `AbortSignal`을 받을 수 있다. 그러나 기본 `inflightQueryAbortStrategy: 'ignore query'`는 application의 대기만 중단하고 DB query는 끝날 때까지 실행한다. server-side 취소가 필요하면 driver가 지원하는 `cancel query` 또는 `kill session`을 명시하고 실제 DB에서 검증한다.

취소된 write가 자동으로 원자적 rollback된다고 가정하지 않는다. DB engine은 statement 도중 부분 효과를 남길 수 있으므로 원자성이 필요한 여러 write는 transaction에 두고, abort error 뒤 새 EM에서 결과를 확인한다. stream은 server-side cancel strategy를 지원하지 않는 별도 경계다.

## 운영 체크리스트

- [ ] production logger에 parameter redaction과 sampling 정책이 있다.
- [ ] slow query threshold와 alert 기준이 endpoint latency, DB 지표와 연결된다.
- [ ] 핵심 endpoint는 query 수, 반환 row 수와 payload 크기를 관찰한다.
- [ ] read-after-write path의 replica 또는 write-connection 정책이 명시돼 있다.
- [ ] cache마다 TTL, key owner, 무효화 owner, stale window가 있다.
- [ ] 성능 변경은 target DB engine과 representative cardinality에서 plan과 결과를 비교했다.
- [ ] metadata discovery와 entity loading은 source tree가 아니라 실제 image에서 점검했다.

## 관련 문서

- [[MikroORM-Loading-Relations|Relation loading]]
- [[MikroORM-Querying|Querying]]
- [[MikroORM-Deployment|배포와 산출물]]
- [[MikroORM-Testing|테스트 전략]]

## 출처

- [Logging — MikroORM v7.1](https://mikro-orm.io/docs/logging)
- [Result cache — MikroORM v7.1](https://mikro-orm.io/docs/caching)
- [Read Replica Connections — MikroORM v7.1](https://mikro-orm.io/docs/read-connections)
- [Loading Strategies — MikroORM v7.1](https://mikro-orm.io/docs/loading-strategies)
- [Query cancellation — MikroORM v7.1](https://mikro-orm.io/docs/query-cancellation)
