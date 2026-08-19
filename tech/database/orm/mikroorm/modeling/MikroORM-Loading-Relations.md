---
tags: [orm, mikroorm, loading, populate, performance]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM 관계 로딩", "MikroORM Loading Relations"]
---

# MikroORM 관계 로딩

## 먼저 읽기 그래프를 선언한다

엔티티를 조회했다는 사실은 관계 전체를 읽었다는 뜻이 아니다. MikroORM에서 관계는 primary key만 든 reference 또는 초기화되지 않은 Collection일 수 있다. 유스케이스가 필요로 하는 그래프를 query의 populate에 명시하고, 그 graph에 맞는 DTO를 만든다.

~~~ts
const articles = await em.find(Article, { published: true }, {
  populate: ['author', 'comments.author'],
  orderBy: { publishedAt: 'desc' },
});
~~~

위 요청은 Article, 각 Article의 author, comments와 각 comment의 author를 필요로 한다는 계약이다. 목록 화면에서 body, 모든 comment, comment의 author까지 필요하지 않다면 이 populate path를 그대로 쓰면 안 된다.

## v7.1.11 기본 전략은 balanced

안정 버전 7.1.11 기준 기본 loading strategy는 balanced다.

- to-one 관계는 joined로 읽는다.
- to-many 관계는 select-in으로 읽는다.

공식 loading strategies 페이지에는 joined가 SQL driver 기본이고 combined가 v7 기본이 될 것이라는 오래된 표현이 남아 있다. 이 문서는 v7 migration guide의 balanced 기본값 설명과 7.1.11 stable version을 우선한다. v7.1 코드에서 combined라는 이름을 새 설정으로 도입하지 않는다.

| 전략 | 실행 모양 | 장점 | 위험 |
| --- | --- | --- | --- |
| select-in | root query 뒤 relation별 IN query | to-many의 row 곱셈을 피한다 | 깊은 graph는 query 수가 늘어난다 |
| joined | JOIN으로 한 query | 작은 to-one graph에 유리하다 | 여러 to-many join은 결과 row가 폭증할 수 있다 |
| balanced | to-one joined, to-many select-in | 일반적인 read model의 타협점 | 실제 cardinality와 index 없이 성능을 단정할 수 없다 |

전략은 global config, relation mapping, find options에서 지정할 수 있다. property-level strategy는 그 property에서 우선한다. 혼합 graph는 populateHints로 path별 strategy와 join type을 조정한다.

~~~ts
const authors = await em.find(Author, {}, {
  populate: ['articles.editor'],
  strategy: 'joined',
  populateHints: {
    'articles.editor': { strategy: 'select-in' },
  },
});
~~~

기본 전략을 바꾸기 전에 SQL log와 대표 데이터 cardinality로 query 수, returned row 수, hydration 시간, p95를 비교한다.

## DataLoader는 별도 opt-in이다

DataLoader는 기본 비활성화이며 v7에서는 `dataloader` package를 직접 설치해야 한다. 활성화하면 같은 event loop tick에 발생한 `Reference.load()`, `Collection.load()`와 `loadCount()`를 묶을 수 있다. 임의의 `find()` 호출 전체를 자동 batch하는 기능은 아니다.

~~~ts
await Promise.all(
  authors.map(author => author.books.load({ dataloader: true })),
);
~~~

GraphQL resolver처럼 field별 load가 흩어진 경우에 유용하다. REST 목록처럼 root query를 통제할 수 있다면 먼저 `populate`로 읽기 graph를 선언한다. 어떤 방식이든 query log로 실제 batch 여부를 확인한다.

## populate, reference, Collection의 차이

| 상태 | 의미 | 안전한 다음 행동 |
| --- | --- | --- |
| plain to-one reference | PK는 있지만 일반 field가 hydrate되지 않았을 수 있다 | populate로 다시 읽거나 Ref의 load를 쓴다 |
| Ref<T> | Reference wrapper가 초기화 상태를 노출한다 | load 후 dollar accessor 또는 get으로 읽는다 |
| LazyRef<T> | 런타임은 plain entity지만 타입이 populate 전 접근을 막는다 | Loaded type이 좁혀진 뒤 일반 property를 읽는다 |
| Collection<T> | to-many graph가 아직 초기화되지 않았을 수 있다 | populate, load, loadItems, loadCount 중 목적에 맞게 고른다 |

Ref를 쓴 엔티티라면 populate 전과 후의 차이가 코드에 드러난다.

~~~ts
const before = await em.findOneOrFail(Book, bookId);
await before.author.load();
const authorName = before.author.get().name;

const after = await em.findOneOrFail(Book, bookId, {
  populate: ['author'],
});
const populatedName = after.author.$.name;
~~~

primary key만 필요한 write에는 reference가 충분하다. 화면에 author name을 보여야 한다면 query 시점에 populate한다. 반복문 안에서 Ref load를 부르면 N+1 query가 되므로 목록 read에서는 특히 금지한다.

## Collection을 목적별로 읽는다

~~~ts
const author = await em.findOneOrFail(Author, authorId);

const count = await author.articles.loadCount();
const items = await author.articles.loadItems();

await author.articles.init();
~~~

- count만 필요하면 loadCount가 전체 entity hydration을 피한다.
- 목록이 필요하면 loadItems 또는 query-level populate를 쓴다.
- init은 이미 초기화돼도 새 DB 상태로 다시 읽으므로 refresh 의도가 있을 때만 쓴다.
- populate된 Collection은 LoadedCollection으로 좁혀져 dollar accessor를 타입 안전하게 쓸 수 있다.

Collection을 비어 있는 배열로 오해하는 코드는 버그를 만든다. 아직 초기화되지 않았다는 사실과 실제로 row가 없다는 사실은 다르다.

## N+1을 발견하고 고치는 흐름

1. 한 API의 root query와 반복문 안의 relation 접근을 함께 읽는다.
2. query log에서 root 1회 뒤 같은 relation query가 N회 반복되는지 확인한다.
3. 반복문 안의 load를 root query populate로 이동한다.
4. to-many join 때문에 row 수가 커지면 select-in 또는 balanced로 바꾼다.
5. root 수, 관계 cardinality, SQL 수, DB 시간, hydrate 시간을 같은 data set에서 다시 측정한다.

~~~ts
// 문제: article마다 author를 따로 읽을 수 있다.
for (const article of articles) {
  await article.author.load();
}

// 수정: 목록 query에서 필요한 author를 한 번에 선언한다.
const articles = await em.find(Article, {}, {
  populate: ['author'],
});
~~~

관계가 많다고 무조건 하나의 큰 join을 만들지 않는다. 응답 page size가 20이고 comment가 article당 100개라면 joined 결과는 network와 hydration 비용을 급격히 키울 수 있다.

## partial fields와 populate를 함께 설계한다

fields는 DB에서 가져오고 DTO로 유지할 property 범위를 좁힌다. MikroORM은 primary key를 자동 선택하지만 relation 연결에 필요한 FK는 fields에 명시해야 한다. 누락하면 populate 대상이 있어도 객체 graph가 연결되지 않을 수 있다. partial loading을 직렬화할 때는 hint 밖 field를 제거한다.

~~~ts
const articles = await em.find(Article, {}, {
  populate: ['author'],
  fields: ['id', 'title', 'author.id', 'author.displayName'],
});
~~~

partial entity를 도메인 변경용으로 재사용하지 않는다. 필요한 field가 없으면 validation, 계산, event listener가 undefined를 만날 수 있다. 목록 DTO용 read model과 명령 처리용 완전한 aggregate load를 구분한다.

## 유스케이스별 선택 기준

| 유스케이스 | 기본 선택 | 확인할 것 |
| --- | --- | --- |
| 상세 화면의 작은 to-one | populate + balanced | join 대상이 optional인지 |
| 목록과 작은 작성자 정보 | root와 author populate | page size와 author 중복 |
| 목록과 큰 child collection | select-in 또는 별도 endpoint | child cardinality와 pagination |
| count badge | loadCount 또는 count query | 전체 목록 hydration이 없는지 |
| FK만 변경 | getReference 또는 PK assignment | relation field를 읽지 않는지 |
| GraphQL resolver | resolver 반복 load를 피할 batch 전략 검토 | dataloader 설치와 query 수 측정 |

## 실무 함정

- populate: all 또는 무제한 깊이 populate는 API 계약이 아니라 accidental graph가 되기 쉽다.
- joined의 query 수가 하나여도 row 수와 hydrate 비용이 더 나쁠 수 있다.
- select-in의 query 수가 늘어도 root마다 한 번씩 읽는 N+1보다 낫다.
- partial fields로 얻은 엔티티를 수정하고 flush하면 누락 field를 전제로 한 로직이 깨질 수 있다.
- DB replica, transaction, cache가 있으면 query 수만으로 일관성과 응답 시간을 판단할 수 없다.

## 확인 질문

- 이 endpoint는 정확히 어느 관계 path를 어떤 field까지 보여 주는가?
- root마다 relation load가 일어나지 않는가?
- to-many 관계의 평균과 상위 cardinality는 측정했는가?
- Collection 전체 대신 count 또는 paged query가 더 맞는가?
- loading strategy 페이지의 오래된 combined 표현을 설정값으로 복사하지 않았는가?

## 관련 문서

- [[MikroORM-Modeling|모델링 학습 지도]]
- [[MikroORM-Relationships|소유 측과 Collection]]
- [[MikroORM-Serialization|populate와 API 응답]]

## 출처

- [MikroORM documentation versions — MikroORM](https://mikro-orm.io/versions)
- [Upgrading from v6 to v7 — MikroORM](https://mikro-orm.io/docs/upgrading-v6-to-v7)
- [Relationship Loading Strategies — MikroORM](https://mikro-orm.io/docs/loading-strategies)
- [Populating relations — MikroORM](https://mikro-orm.io/docs/populating-relations)
- [Dataloaders — MikroORM](https://mikro-orm.io/docs/dataloaders)
- [Type-Safe Relations — MikroORM](https://mikro-orm.io/docs/type-safe-relations)
- [Collections — MikroORM](https://mikro-orm.io/docs/collections)
