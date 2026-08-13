---
tags: [orm, mikroorm, relations, collection, aggregate]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM 관계 모델링", "MikroORM Relationships"]
---

# MikroORM 관계 모델링

## 관계를 먼저 데이터 구조가 아니라 변경 규칙으로 본다

MikroORM v7.1은 ManyToOne, OneToMany, OneToOne, ManyToMany를 제공한다. 관계를 고를 때 먼저 다음을 결정한다.

1. 어느 쪽이 FK 또는 조인 테이블을 실제로 쓰는가?
2. 한 트랜잭션에서 함께 생성, 변경, 삭제되는 aggregate 경계는 어디인가?
3. 연결을 끊는 것이 자식 삭제인가, 관계만 해제하는 것인가?
4. 목록 API에서 이 관계의 전체 집합이 정말 필요한가?

ORM annotation은 이 결정을 표현하는 문법일 뿐이다. 순환 참조를 피하려고 양방향 관계를 만들기 전에, 조회와 변경이 실제로 양쪽 탐색을 요구하는지 확인한다.

## 소유 측과 역방향 측

양방향 관계에는 소유 측이 하나 있다. 소유 측은 관계 참조가 저장되는 곳이고, 역방향 측은 mappedBy로 소유 측을 가리킨다. OneToMany와 ManyToOne의 일반적인 조합에서는 ManyToOne이 FK를 가진 소유 측이다.

~~~ts
import { Collection } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/decorators/es';

@Entity()
export class Author {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  name!: string;

  @OneToMany(() => Article, article => article.author)
  articles = new Collection<Article>(this);
}

@Entity()
export class Article {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  title!: string;

  @ManyToOne(() => Author)
  author!: Author;
}
~~~

FK를 바꾸는 코드는 소유 측을 분명히 갱신한다. 같은 요청에서 양방향 탐색을 바로 쓴다면 반대편 Collection도 함께 맞춰 메모리 그래프를 일관되게 유지한다.

~~~ts
const article = await em.findOneOrFail(Article, articleId);
const author = em.getReference(Author, authorId);

article.author = author;
author.articles.add(article);

await em.flush();
~~~

MikroORM은 양방향 관계의 한쪽을 바꾸면 초기화된 반대편에도 변경을 전파한다. 위 `add()`는 그 의도를 코드에 드러낸 표현이며, 다른 곳에서 다시 중복 추가할 필요는 없다. 직접 reference를 얻는 것은 author 전체를 읽지 않고 FK를 바꾸는 방법이다. 다만 author의 다른 필드를 읽으면 초기화되지 않은 reference일 수 있으므로, 읽기 경로는 [[MikroORM-Loading-Relations|관계 로딩]] 규칙을 따른다.

## 관계별 선택 기준

| 관계 | 데이터베이스 관점 | 적합한 도메인 예 |
| --- | --- | --- |
| ManyToOne | 현재 테이블이 FK를 가진다 | 주문의 고객, 게시글의 작성자 |
| OneToMany | 반대편 ManyToOne의 역방향 집합 | 고객의 주문 목록 |
| OneToOne | FK와 unique 제약으로 1:1을 표현한다 | 사용자와 선택적 프로필 |
| ManyToMany | SQL에서는 pivot table, Mongo에서는 소유 측 ObjectId 배열 | 단순 태그 연결 |

ManyToMany 연결에 수량, 정렬, 역할, 생성 시각 같은 속성이 생기면 단순 pivot table을 계속 쓰지 않는다. 예를 들어 주문과 상품 사이에 수량이 있으면 OrderItem을 독립 엔티티로 만들고 두 개의 ManyToOne으로 표현한다. 그러면 index, validation, lifecycle, 감사 로그를 그 연결 자체에 둘 수 있다.

## Collection은 배열이 아니다

OneToMany와 ManyToMany는 Collection wrapper다. 초기화되지 않은 Collection은 비어 있는 배열이라는 뜻이 아니다. 반복하거나 배열 인덱스로 읽는 코드가 초기화 여부를 대신 확인하지 않는다.

~~~ts
const author = await em.findOneOrFail(Author, authorId);

const count = await author.articles.loadCount();
const articles = await author.articles.loadItems();

author.articles.add(newArticle);
author.articles.remove(oldArticle);

await em.flush();
~~~

주요 규칙은 다음과 같다.

- load는 아직 초기화되지 않았을 때만 채운다.
- init은 이미 초기화됐어도 DB에서 다시 읽는다.
- loadCount는 엔티티를 전부 hydrate하지 않고 개수를 읽는다.
- add와 remove는 관계 변경을 기록한다. remove가 자식 row를 삭제한다는 뜻은 아니다.
- populate 뒤의 Collection은 LoadedCollection이 되어 dollar accessor를 통해 타입 수준에서도 초기화 사실을 전달할 수 있다.

대량 목록에서 Collection을 반복 호출하면 N+1이 된다. 목록 조회에서 필요한 관계를 populate로 선언하거나, 개수만 필요한 경우 loadCount를 선택한다.

## Ref와 LazyRef

to-one 관계는 일반 엔티티 field로도 선언할 수 있다. 그러나 TypeScript는 그것이 실제로 load됐는지 알지 못한다. v7.1에는 두 가지 안전 장치가 있다.

| 선택 | 런타임 값 | 읽기 방식 | 적합한 경우 |
| --- | --- | --- | --- |
| Ref<T> | Reference wrapper | load 후 dollar 또는 get | 명시적 비동기 load가 코드에 드러나야 할 때 |
| LazyRef<T> | 엔티티 reference | populate된 Loaded 타입에서 일반 property 접근 | wrapper 없이 컴파일 단계 안전성만 원할 때 |

Ref는 아직 로드되지 않은 상태에서 primary key는 읽을 수 있지만 일반 property를 곧바로 읽을 수 없게 한다. LazyRef도 런타임에서는 stub 엔티티지만 TypeScript가 populate 전 property 접근을 막는다. 둘 다 JavaScript의 any cast나 런타임 접근을 막는 보안 장치는 아니다.

## cascade, orphan removal, DB FK를 구분한다

MikroORM의 cascade는 애플리케이션 수준 동작이다. 관계가 populate된 그래프에서 작동하며, cascade persist는 기본값이다. primary key가 없는 새 엔티티는 cascade 설정과 관계없이 persist된다.

| 요구 | 선택 | 검토할 위험 |
| --- | --- | --- |
| 부모 저장 때 새 자식도 저장 | 기본 cascade persist | 의도치 않은 큰 그래프 persist |
| 부모 삭제 때 자식도 삭제 | cascade remove | 공유되는 ManyToOne 대상까지 삭제할 위험 |
| 부모 Collection에서 빠지면 자식 삭제 | orphanRemoval | 연결 해제와 삭제를 구분하지 못하는 모델 |
| 참조 무결성 강제 | DB foreign key | ORM cascade와 DB ON DELETE 규칙은 별개 |

orphanRemoval은 부모가 소유하는 OneToOne 또는 OneToMany에만 의미가 분명하다. 태그, 사용자, 상품처럼 공유될 수 있는 엔티티에는 보통 쓰지 않는다. FK constraint를 끄는 옵션은 레거시 DB 통합 같은 명확한 사유가 있을 때만 쓰고, 그 대신 무결성을 누가 보장하는지 문서화한다.

## 관계 mutation의 실행 흐름

1. EntityManager가 현재 요청의 identity map에서 엔티티 또는 reference를 얻는다.
2. 소유 측 property나 Collection이 바뀐다.
3. Unit of Work가 변경 집합을 계산한다.
4. flush가 FK update, join table insert/delete, 필요한 entity insert/delete를 순서에 맞게 실행한다.
5. DB constraint가 마지막으로 유효성을 판정한다.

이 흐름 때문에 service 코드에서 raw SQL로 관계만 바꾸면 이미 관리 중인 엔티티 graph와 snapshot이 어긋날 수 있다. 같은 EntityManager 안에서 ORM 밖의 변경을 했다면 새 context로 다시 읽을지 명시적으로 판단한다.

## 실무 함정

- OneToMany를 소유 측처럼 고쳐도 FK가 바뀌지 않는 상황을 먼저 의심한다.
- Collection을 초기화하지 않고 전체 자식이 없다고 판단하지 않는다.
- cascade remove를 ManyToOne, ManyToMany의 공유 대상에 적용하지 않는다.
- ManyToMany에 속성이 생겼는데도 pivot table로 감추지 않는다.
- 관계는 DB FK가 없으면 ORM만으로는 동시성 무결성을 보장하지 못한다.
- entity field initializer와 JavaScript class field 설정이 양방향 propagation에 미치는 영향을 새 코드와 기존 코드에서 테스트한다.

## 확인 질문

- 관계를 변경하는 코드가 실제 소유 측을 고치는가?
- 끊기면 삭제돼야 하는 자식이 정말 부모 전용인가?
- 다대다 링크에 앞으로 상태나 수량이 들어갈 가능성이 있는가?
- 목록 API가 Collection 전부가 아니라 count만 필요로 하는가?
- FK constraint와 cascade 설정이 같은 삭제 정책을 표현하는가?

## 관련 문서

- [[MikroORM-Modeling|모델링 학습 지도]]
- [[MikroORM-Entity-Modeling|엔티티와 embeddable]]
- [[MikroORM-Loading-Relations|populate와 Ref]]
- [[MikroORM-Serialization|관계 응답 모양]]

## 출처

- [Modeling Entity Relationships - MikroORM](https://mikro-orm.io/docs/relationships)
- [Collections - MikroORM](https://mikro-orm.io/docs/collections)
- [Type-Safe Relations - MikroORM](https://mikro-orm.io/docs/type-safe-relations)
- [Cascading persist, merge and remove - MikroORM](https://mikro-orm.io/docs/cascading)
