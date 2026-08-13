---
tags: [database, orm, mikroorm, unit-of-work, identity-map, flush]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM Unit of Work", "MikroORM Identity Map", "MikroORM flush"]
---

# MikroORM Unit of Work와 Identity Map

범위는 2026-08-13에 확인한 MikroORM stable `7.1.11`과 v7.1 공식 문서다.

## 한 문장 mental model

`EntityManager`는 요청 안의 작업 공간이고, Identity Map은 PK별 객체 하나를 보관하며, Unit of Work는 그 객체의 원본 snapshot과 현재 값을 비교해 `flush()` 때 필요한 SQL을 만든다.

따라서 MikroORM에서는 `entity.name = '새 이름'`이 즉시 UPDATE를 보내지 않는다. 그 entity가 현재 `EntityManager`에서 managed라면, `flush()`가 변화량을 모아 transaction 안에서 반영한다.

## 객체 상태와 경계

| 상태 | 뜻 | 다음 행동 |
| --- | --- | --- |
| New | `em.create()` 또는 constructor로 만든 새 객체 | `persist()` 예약 뒤 `flush()`에서 INSERT한다. `em.create()`는 v7 기본값으로 예약까지 한다. |
| Managed | DB에서 읽었거나 현재 EM에 등록된 객체 | 속성을 바꾸고 `flush()`하면 change set을 계산한다. |
| Detached | `clear()`했거나 다른 EM fork에 속한 객체 | 현재 EM에서 계속 수정하려면 `merge()` 또는 재조회가 필요한지 판단한다. |
| Removed | `em.remove()`로 삭제 예약된 객체 | `flush()`에서 DELETE한다. |

Entity reference는 lifecycle 상태와 별개다. `em.getReference(User, id)`는 PK만 가진 초기화되지 않은 객체를 만들 수 있으며, 관계 설정, 삭제 예약, Unit of Work 기반 갱신에 사용할 수 있다.

## flush까지의 실제 흐름

```text
em.create / em.persist / em.find
  → EntityManager가 객체를 managed로 등록
  → Unit of Work가 identity map과 원본 데이터 snapshot을 보유
  → em.flush()
  → change set 계산, FK 의존 순서 결정, 가능한 작업 batch화
  → DB transaction 안에서 INSERT/UPDATE/DELETE
  → 성공한 snapshot을 새 기준으로 갱신
```

`flush()` 하나가 모든 business rule을 검증하지는 않는다. unique constraint, FK, check constraint와 concurrent update의 최종 판정은 DB가 한다. flush 실패를 domain validation 성공으로 해석하지 않는다.

## 기본 쓰기 패턴

```ts
// em.create()는 기본값 persistOnCreate: true로 future persistence에 등록한다.
const order = em.create(Order, {
  customer,
  status: 'pending',
});

await em.flush();

const saved = await em.findOneOrFail(Order, order.id);
saved.status = 'paid'; // saved는 managed다.
await em.flush();      // persist(saved)를 다시 부를 필요는 없다.
```

constructor로 직접 만든 객체는 `em.persist()`가 필요하다. 새 객체가 이미 managed graph의 cascade 대상인 경우는 예외가 될 수 있지만, service 경계에서는 `em.create()` 또는 명시적 `persist()`로 의도를 드러내는 편이 안전하다.

```ts
const coupon = new Coupon('WELCOME');
em.persist(coupon);
await em.flush();
```

여러 같은 종류의 entity를 persist한 뒤 한 번만 flush하면 MikroORM은 가능한 경우 operation과 entity type별로 batch SQL을 만든다. 개별 생성마다 `flush()`하면 batch와 transaction 경계를 잘게 쪼갠다.

## Identity Map은 요청 cache가 아니다

```ts
const a = await em.findOneOrFail(User, 1);
const b = await em.findOneOrFail(User, 1);

console.log(a === b); // true, PK 1의 같은 객체
```

PK 조회는 첫 조회 뒤 DB round trip을 생략할 수 있다. 하지만 다른 조건은 DB를 다시 조회한다. 아래도 결과 객체 identity는 같을 수 있지만, query 자체가 cache hit라는 뜻은 아니다.

```ts
const a = await em.findOneOrFail(User, 1);
const b = await em.findOneOrFail(User, { email: 'a@example.com' });

console.log(a === b); // PK가 같다면 true일 수 있다.
```

그래서 Identity Map을 cross-request result cache처럼 쓰면 안 된다. 요청이 끝나면 EM context를 버리고, cache가 필요하면 별도 result cache 전략과 invalidation을 설계한다.

## FlushMode와 v7 자동 flush 함정

| 모드 | 의미 | 사용 판단 |
| --- | --- | --- |
| `AUTO` | 기본값, query 결과와 겹칠 수 있는 예약 작업을 검사해 필요할 때 flush | 일반 요청에서 적합하지만 읽기 직전 반영을 설계 근거로 삼지 않는다. |
| `COMMIT` | transaction commit까지 flush를 미룬다 | 긴 workflow에서 query가 미반영 상태를 읽어도 되는지 확인한다. |
| `ALWAYS` | 모든 query 전에 flush | 예측은 쉽지만 불필요한 write와 latency를 낳을 수 있다. |

v7에서는 managed scalar property 변경만으로 AUTO의 change detection이 자동 활성화되지 않는다. 다음 query 전 자동 flush가 필요하다면 명시적으로 `em.persist(book)`를 호출한다. 반면 `await em.flush()`를 직접 호출하면 managed entity의 변경은 persist 재호출 없이 반영된다.

```ts
const book = await em.findOneOrFail(Book, 1);
book.price = 1000;

em.persist(book); // 다음 Book query 전에 AUTO flush가 필요한 경우
await em.find(Book, { price: { $gt: 500 } });
```

이 구분은 v6에서 v7로 올릴 때 특히 중요하다. 의도를 가장 분명하게 만드는 기본 패턴은 수정 후 명시적 `flush()`다.

## UoW를 우회하는 API

`nativeUpdate()`와 `nativeDelete()`는 즉시 SQL을 실행하고 identity map에 side effect를 만들지 않는다. 빠른 bulk 처리에는 적합하지만 lifecycle hook, loaded graph 동기화와 Unit of Work change set을 기대하면 안 된다.

```ts
const user = await em.findOneOrFail(User, 1);
await em.nativeUpdate(User, { id: 1 }, { status: 'inactive' });

// user.status는 메모리에서 이전 값일 수 있다.
await em.refresh(user); // local 변경도 잃으므로 필요한 경우에만 사용
```

PK만 아는 update라면 reference를 바꾸고 flush하는 방법도 있다. 이 경로는 Unit of Work와 event hook을 탄다.

```ts
const ref = em.getReference(User, 1);
ref.status = 'inactive';
await em.flush();
```

## 실무 함정과 검증

- `persist()`는 기본적으로 INSERT나 UPDATE를 즉시 보낸다는 뜻이 아니다. `flush()` 또는 transaction commit을 찾는다.
- 한 EM을 요청, queue job, 병렬 task 사이에 공유하면 identity map과 snapshot이 섞인다. fork 또는 RequestContext를 사용한다.
- `refresh()`는 local 변경을 버리고 DB 값으로 덮는다. conflict 해결의 기본 동작으로 무심코 호출하지 않는다.
- flush 예외와 rollback 뒤에는 managed 또는 removed 객체가 detached되고 메모리 값은 DB와 어긋날 수 있다. 같은 객체를 재시도하지 말고 새 EM에서 재조회하거나 명시적으로 merge 전략을 검토한다.
- 테스트에서는 INSERT와 UPDATE가 각각 flush 전에는 DB에 없거나 이전 값임을 확인하고, flush 뒤 query log와 row 값을 함께 확인한다.

## 체크리스트

- [ ] 새 객체를 `em.create()` 또는 `persist()`로 등록하고 flush 경계를 정했는가
- [ ] managed 변경에는 명시적 `flush()`를 두었는가
- [ ] bulk SQL 뒤 기존 identity map 객체를 `refresh()`, `clear()` 또는 새 fork로 처리했는가
- [ ] PK lookup 최적화를 result cache로 오해하지 않았는가
- [ ] 병렬 작업과 요청마다 EM context를 분리했는가

## 출처

- [Unit of Work and Transactions](https://mikro-orm.io/docs/unit-of-work)
- [EntityManager, persist, flush, reference와 native update](https://mikro-orm.io/docs/entity-manager)
- [Architecture Overview, entity lifecycle와 flush](https://mikro-orm.io/docs/architecture)
- [v6에서 v7 업그레이드, auto flush change detection](https://mikro-orm.io/docs/upgrading-v6-to-v7)
- [MikroORM 7.1.11 release](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
