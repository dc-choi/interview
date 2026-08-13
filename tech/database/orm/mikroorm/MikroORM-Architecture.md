---
tags: [database, orm, mikroorm, architecture, unit-of-work, identity-map]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM 아키텍처", "MikroORM Architecture"]
---

# MikroORM 아키텍처

MikroORM은 Data Mapper 위에 요청 범위 Identity Map과 Unit of Work를 결합한다. 객체가 어느 EM에 속하는지, raw data가 entity로 hydrate되는지, 어떤 경로가 UoW를 우회하는지를 알면 대부분의 동작을 예측할 수 있다.

## 구성요소

```text
Application service
  -> EntityManager
       -> MetadataStorage
       -> EntityLoader와 Hydrator
       -> Identity Map
       -> UnitOfWork
            -> original snapshots
            -> persist/remove/orphan queues
            -> changesets
       -> Driver
            -> SQL QueryBuilder 또는 MongoDB API
            -> connection과 transaction
  -> Database
```

| 구성요소 | 책임 | 경계 |
|---|---|---|
| EntityManager | 조회와 쓰기 API의 facade, context 선택 | 요청마다 분리해야 하는 stateful 객체 |
| MetadataStorage | entity, property, relation mapping 보관 | 실제 DB schema와 같다는 보장은 migration 검증 필요 |
| Hydrator | driver result를 entity property에 반영 | raw execute 결과에는 적용되지 않을 수 있음 |
| Identity Map | 현재 EM의 type과 PK별 객체 저장 | 일반 query 결과 cache가 아님 |
| UnitOfWork | snapshot 비교, changeset과 쓰기 순서 계산 | native write와 외부 system은 추적하지 않음 |
| Driver | DB별 query, 값 변환, transaction 수행 | dialect 기능과 제약은 DB마다 다름 |
| QueryBuilder | SQL query를 조립 | MongoDB driver에는 SQL QueryBuilder가 없음 |

## hydration 흐름

`em.findOne(User, 1)`을 실행하면 대략 다음 순서로 진행된다.

1. PK lookup이고 Identity Map에 `User:1`이 있으면 그 객체를 반환할 수 있다.
2. DB query가 필요하면 driver가 row를 읽는다.
3. metadata로 column과 property, relation key를 해석한다.
4. 같은 PK 객체가 map에 있는지 다시 확인한다.
5. 없으면 entity instance를 만들고, 있으면 그 instance에 결과를 merge한다.
6. hydrator가 값을 채우고 UoW가 비교용 snapshot을 보관한다.
7. caller는 managed entity를 받는다.

DB에서 hydrate할 때 constructor는 실행되지 않는다. 생성자 검증만으로 DB data의 불변식을 보장할 수 없고, DB constraint와 load 이후 validation 경계를 별도로 설계해야 한다.

Identity Map 때문에 같은 요청 안에서 서로 다른 query 경로가 같은 row를 가리켜도 하나의 객체를 공유한다. 이 객체 graph의 일관성이 UoW 변경 감지의 기반이다.

## flush pipeline

```text
managed graph mutation
  -> computeChangeSets
  -> snapshot과 현재 값 비교
  -> INSERT, UPDATE, DELETE, collection changeset
  -> FK dependency에 맞춰 순서 계산
  -> 가능한 작업을 batch
  -> transaction 시작
  -> driver query 실행
  -> commit
  -> snapshot 갱신
```

`flush()`는 보통 pending write를 하나의 transaction으로 감싼다. 이는 UoW를 통과한 한 DB의 변경에 대한 보장이다. raw connection으로 실행한 query, 다른 DB, message publish나 외부 API까지 자동으로 묶지 않는다.

순환 FK나 DB constraint, cascade 방식에 따라 실제 query 순서는 달라진다. 내부 순서를 가정하는 대신 debug query log와 migration constraint로 확인한다.

## 생명주기와 loading 상태

```text
new object
  -> persist 또는 em.create 기본 동작
  -> flush
  -> managed
  -> remove
  -> flush
  -> removed/detached

managed
  -> em.clear 또는 다른 fork로 이동 불가
  -> detached
```

- New: 아직 DB에 반영되지 않은 객체
- Managed: 현재 EM과 UoW가 추적하는 객체
- Detached: 현재 UoW 바깥의 객체
- Removed: 삭제 예약된 객체

미초기화 `Ref`와 `Collection`은 loading 상태다. managed entity도 relation이 load되지 않을 수 있다. lifecycle과 loading을 한 축으로 섞지 않는다.

## 요청 범위 EntityManager

global `orm.em`은 context를 찾는 facade로 사용할 수 있지만, 실제 request들은 별도 fork를 가져야 한다.

```text
Process ORM
  ├── Request A -> fork A -> Identity Map A
  ├── Request B -> fork B -> Identity Map B
  └── Queue job C -> fork C -> Identity Map C
```

MikroORM의 `RequestContext`는 Node의 `AsyncLocalStorage`에 fork된 EM을 저장한다. 같은 async call chain에서 주입된 EM을 호출하면 현재 context의 fork로 해석된다.

요청을 공유하면 다음 문제가 생긴다.

- 이전 요청에서 populate한 relation이나 수정 중인 entity가 다음 요청에 보인다.
- Identity Map이 계속 자라 메모리를 점유한다.
- 동시 요청이 같은 객체 instance와 snapshot을 바꾼다.
- rollback 뒤 불일치한 in-memory 상태를 다른 작업이 재사용한다.

HTTP 밖 queue, cron, consumer도 job마다 `RequestContext` 또는 명시적 `em.fork()`가 필요하다. `allowGlobalContext`는 단발 script나 제한된 test 편의이지 production 해결책이 아니다.

## fork와 clear

`em.fork()`의 기본은 깨끗한 Identity Map이다. fork는 transaction이나 현재 context 사용 여부 등 option을 가질 수 있으므로 의도를 코드에 드러낸다.

`em.clear()`는 같은 EM의 map을 비운다. 큰 import에서 일정 batch마다 flush와 clear를 반복하면 memory를 제한할 수 있지만, clear 뒤 객체는 detached이므로 이후 수정을 기대하면 안 된다.

rollback도 JavaScript 객체의 property를 과거 값으로 되돌려 주지는 않는다. transaction 실패 뒤에는 예외를 전파하고 새 fork에서 다음 작업을 시작하는 것이 안전하다.

## managed와 raw 경계

```ts
const managed = await qb.getResult();
const rawRows = await qb.execute();
```

- `getResult()`와 `getSingleResult()`는 entity hydration과 Identity Map merge를 수행한다.
- `execute()`는 raw object를 반환한다. 그 값을 바꿔도 UoW가 entity 변경으로 추적하지 않는다.
- `nativeInsert`, `nativeUpdate`, `nativeDelete`도 entity graph를 통한 쓰기와 부작용이 다르다.
- raw write 뒤 현재 EM에 같은 row가 이미 있으면 in-memory state가 stale할 수 있다. 새 fork, refresh 또는 명시적 동기화 전략을 선택한다.

read DTO, aggregation, 대량 projection은 raw result가 더 명확할 수 있다. domain entity를 수정하고 cascade, hook, optimistic version을 기대하면 managed path를 사용한다.

## event와 UoW 경계

Lifecycle hook과 subscriber는 flush 과정에 참여하지만 아무 시점에서나 다시 `flush()`할 수 있는 것은 아니다. hook 안의 nested flush는 금지되고, collection 변화는 일반 `beforeUpdate`만으로 모두 잡히지 않는다. outbox나 audit을 붙일 때는 `beforeFlush`, `onFlush`, `afterFlush`의 정확한 계약과 transaction 범위를 확인한다.

event callback이 외부 message를 바로 발행하면 DB rollback과 message 성공이 갈릴 수 있다. 이것은 ORM event만으로 해결되지 않으며 [[Transactional-Outbox|Transactional Outbox]] 같은 별도 일관성 설계가 필요하다.

## 예측 질문

- [ ] 같은 PK를 다른 조건 query로 두 번 읽으면 SQL과 객체 동일성은 각각 어떻게 되는가?
- [ ] `qb.execute()` 결과를 수정하고 `flush()`하면 왜 UPDATE가 보장되지 않는가?
- [ ] rollback 뒤 같은 entity instance를 재사용하면 무엇이 어긋날 수 있는가?
- [ ] queue worker의 각 message가 별도 EM을 가져야 하는 이유는 무엇인가?
- [ ] flush transaction과 외부 message 원자성은 왜 다른 문제인가?

## 공식 출처

- [Architecture Overview](https://mikro-orm.io/docs/architecture)
- [Identity Map and Request Context](https://mikro-orm.io/docs/identity-map)
- [Unit of Work](https://mikro-orm.io/docs/unit-of-work)
- [Entity Manager](https://mikro-orm.io/docs/entity-manager)
- [Events and Lifecycle Hooks](https://mikro-orm.io/docs/events)
- [UnitOfWork source, v7.1.11](https://github.com/mikro-orm/mikro-orm/blob/v7.1.11/packages/core/src/unit-of-work/UnitOfWork.ts)
- [RequestContext source, v7.1.11](https://github.com/mikro-orm/mikro-orm/blob/v7.1.11/packages/core/src/utils/RequestContext.ts)
