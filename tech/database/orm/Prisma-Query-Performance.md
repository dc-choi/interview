---
tags: [database, orm, prisma, observability, tracing, performance]
status: done
verified_at: 2026-08-21
category: "Database - ORM"
aliases: ["Prisma Query Performance", "Prisma 쿼리 계측", "relationLoadStrategy"]
---

# Prisma 쿼리 계측과 relation 로딩 전략

Prisma에서 느린 API를 다룰 때 필요한 정보는 두 가지다. 하나는 쿼리 시간을 어느 경계에서 재는가이고, 다른 하나는 relation을 몇 개의 SQL로 가져오는가다. 두 축 모두 오래된 자료와 현재 client의 API가 어긋나 있어 먼저 현행 API를 확인한다.

## middleware `$use`는 제거된 API다

`prisma.$use(async (params, next) => ...)` 형태의 client middleware는 v4.16.0에서 deprecated로 표시됐고, v6.14.0 릴리스 노트가 제거를 명시한다. v7 업그레이드 가이드도 client middleware API가 제거됐다고 적고 대체로 Client Extensions를 안내한다. 강의나 블로그에 남아 있는 `$use` 계측 예제는 현재 client에서 그대로 동작하지 않는다.

같은 릴리스에서 Metrics preview 기능도 deprecated 처리됐고 v7.0.0에서 제거됐다. 공식 대체 안내는 driver adapter가 제공하는 정보를 쓰거나 Client Extensions로 필요한 지표를 직접 노출하는 방향이다.

## 현재 계측 경로 세 가지

| 경로 | 얻는 값 | 성격 |
|---|---|---|
| Client Extensions의 `query` 컴포넌트 | client 호출 1건의 wall time, model과 operation, args | 애플리케이션 코드에서 감싸는 계측 |
| log 이벤트 (`emit: 'event'`, `level: 'query'`) | 실제 발행된 query 문자열, params, duration | 발행된 개별 query 단위 |
| OpenTelemetry tracing | client부터 DB query까지 단계별 span | 분산 trace에 이어 붙는 계측 |

### Client Extensions로 실행 시간 측정

`$extends`의 `query` 컴포넌트가 middleware를 대체한다. `$allModels`와 `$allOperations`로 전 operation을 감싸면 middleware와 같은 범위를 덮으면서 `model`, `operation`, `args`가 타입으로 좁혀진다. 공식 문서의 성능 로깅 예제도 `performance.now()`로 앞뒤를 재는 형태다.

```ts
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        const result = await query(args);
        console.log({ model, operation, ms: performance.now() - start });
        return result;
      },
    },
  },
});
```

확장된 client는 표준 client를 감싼 별도 인스턴스이고 표준 client 자체는 변형되지 않는다. 계측용 client와 계측 없는 client를 분리하거나, 특정 경로에만 계측을 붙이는 구성이 가능하다.

### log 이벤트로 SQL과 duration 확인

`log: [{ emit: 'event', level: 'query' }]`로 client를 만들면 `$on('query')` 핸들러에서 발행된 query 문자열, params와 duration을 받는다. 공식 예제는 duration을 밀리초로 표시한다. 어떤 SQL이 몇 번 나갔는지 세는 목적에는 이 경로가 직접적이다.

### OpenTelemetry tracing으로 단계 분해

`@prisma/instrumentation`의 `PrismaInstrumentation`을 `registerInstrumentations()`에 등록한다. tracing은 4.2.0에서 Preview로 들어와 6.1.0에서 GA가 됐고, 4.2.0과 6.1.0 사이 version에서는 `tracing` Preview 기능을 켜야 한다. 공식 문서가 나열하는 span에는 `prisma:client:operation`, `prisma:client:connect`, `prisma:client:serialize`, `prisma:engine:connection`, `prisma:engine:db_query`, `prisma:engine:serialize`가 있다.

### 세 경로가 재는 구간이 다르다

- extension은 client 호출 경계의 wall time이라 커넥션 획득 대기와 직렬화 시간이 함께 들어간다.
- log 이벤트의 duration은 발행된 query 하나의 시간이다.
- span은 그 사이를 나눠 보여주므로 시간이 DB query에 있는지 커넥션 확보나 직렬화에 있는지 구분할 수 있다.

relation을 여러 query로 가져오는 호출에서는 extension 1건에 query 이벤트가 여러 건 대응한다. N+1 판단은 총 시간이 아니라 요청당 발행 query 수로 하고, 시간 배분은 span으로 확인한다.

## relationLoadStrategy

`include`나 `select`로 relation을 가져올 때 SQL 형태를 고르는 옵션이다. 2026-08-21 기준 공식 Preview 기능 문서에서 `relationJoins`는 5.7.0에 Preview로 들어온 뒤 여전히 Preview 상태로 표시된다. schema의 `previewFeatures`에 `relationJoins`를 넣어야 활성화된다.

지원 커넥터는 PostgreSQL, CockroachDB, MySQL이다. 값은 두 개이고 기본값은 `join`이다.

| 값 | 생성되는 SQL | 병합 위치 |
|---|---|---|
| `join` (기본) | PostgreSQL은 `LATERAL JOIN`과 JSON aggregation 조합, MySQL은 correlated subquery로 단일 query | DB 서버 |
| `query` | 테이블마다 별도 query 발행 | 애플리케이션 서버 |

공식 설명에서 `join`의 이점은 결과 집합의 중복을 줄이고 Prisma Client가 반환할 JSON 구조를 DB에서 미리 만들어 애플리케이션 쪽 연산을 아끼는 데 있다. `query`를 고르는 근거로는 DB 서버 자원을 아끼고 병합과 변환 부담을 확장하기 쉬운 애플리케이션 서버로 옮기는 선택이 제시된다. 어느 쪽이 빠른지는 데이터 형태에 따라 갈리므로 공식 문서도 프로파일링을 전제로 안내한다.

### 이름이 SQL 형태를 보장하지 않는다

같은 `join` 값이어도 PostgreSQL은 LATERAL JOIN, MySQL은 correlated subquery로 내려간다. 옵션 이름만 보고 DB-level JOIN 하나가 나갈 것이라 가정하면 실제 실행 계획과 어긋난다. 적용 판단은 옵션 이름이 아니라 생성 SQL과 `EXPLAIN` 결과, 그리고 실측 응답 시간으로 한다.

fan-out이 큰 relation에서는 두 전략의 비용 구조가 반대로 움직인다. `join`은 왕복을 하나로 줄이는 대신 DB가 JSON 조립까지 맡고, `query`는 왕복이 늘어나는 대신 각 query가 단순해지고 병합이 애플리케이션으로 넘어간다. 어느 쪽이 유리한지는 relation 건수, 반환 column 폭과 DB 서버 여유에 따라 달라지므로 대표 데이터로 재본다.

## 운영과 면접 체크포인트

- [ ] 계측 코드가 `$use`가 아니라 `$extends`의 `query` 컴포넌트를 쓰는가.
- [ ] 느린 API를 볼 때 요청당 발행 query 수를 세었는가. 시간만 보면 N+1과 단일 무거운 query를 구분하지 못한다.
- [ ] duration이 DB query에 있는지 커넥션 확보나 직렬화에 있는지 span으로 나눠 봤는가.
- [ ] `relationLoadStrategy`를 바꾸기 전후로 생성 SQL과 실행 계획을 비교했는가.
- [ ] Preview 기능을 운영에 쓴다면 version 고정과 upgrade 시 재검증 절차가 있는가.
- [ ] 계측 자체의 비용, 특히 query 로그의 양과 카디널리티를 감당할 수 있는가.

## 출처

- [Prisma — Client extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
- [Prisma — Query extension component](https://www.prisma.io/docs/orm/prisma-client/client-extensions/query)
- [Prisma — Logging](https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging)
- [Prisma — OpenTelemetry tracing](https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/opentelemetry-tracing)
- [Prisma — Relation queries와 relation load strategies](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries)
- [Prisma — Preview features](https://www.prisma.io/docs/orm/reference/preview-features/client-preview-features)
- [Prisma — Upgrade to Prisma ORM 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma ORM v6.14.0 릴리스 안내 — Prisma Blog](https://www.prisma.io/blog/prisma-orm-v6-14-0-relationships-for-sql-views-more-robust-management-api-and-more)

## 관련 문서

- [[ORM|ORM과 NestJS 영속성 선택]]
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]
- [[OpenTelemetry|OpenTelemetry와 분산 트레이싱]]
- [[Transactions|트랜잭션]]
