---
tags: [orm, mikroorm, serialization, dto, api-security]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM 직렬화", "MikroORM Serialization"]
---

# MikroORM 직렬화와 DTO 경계

## 엔티티를 API 계약으로 착각하지 않는다

엔티티는 Unit of Work와 관계 wrapper를 포함하는 내부 객체다. API 응답은 클라이언트가 의존할 공개 계약이다. 둘의 field와 관계 모양이 우연히 같은 경우라도, 노출 필드와 populate 범위를 결정하지 않으면 새 property 하나가 응답에 섞이거나 관계가 ID만으로 나오는 회귀가 생긴다.

MikroORM은 discovery 중 엔티티 prototype에 toJSON을 제공한다. 따라서 JSON.stringify와 wrap(entity).toObject는 Reference, Collection 같은 ORM wrapper를 POJO로 바꾼다. 편리하지만 이 암묵 경로도 populate hint와 partial field hint를 따른다.

## 먼저 query shape, 다음 response shape

안전한 순서는 다음과 같다.

1. endpoint가 필요한 관계와 field를 query의 populate, fields에 선언한다.
2. entity를 외부로 보낼 때 wrap(entity).serialize 또는 DTO mapping을 고른다.
3. serialize의 fields를 allowlist로 써서 응답 계약을 고정한다.
4. hidden property와 테스트로 민감 정보의 누출을 막는다.

~~~ts
const user = await em.findOneOrFail(User, userId, {
  populate: ['profile'],
  fields: ['id', 'displayName', 'profile.bio'],
});

const dto = wrap(user).serialize({
  populate: ['profile'],
  fields: ['id', 'displayName', 'profile.bio'],
});
~~~

query fields는 DB에서 읽고 암묵 직렬화할 field 범위에 영향을 준다. serialize fields는 명시적 응답 allowlist다. 같은 이름이지만 서로 다른 경계에서 작동하므로, endpoint마다 둘을 함께 검토한다.

## 암묵 직렬화의 규칙

toObject와 toJSON은 populate hint를 바탕으로 관계를 확장한다. query에서 populate하지 않은 to-one은 보통 FK 값으로, load된 Collection은 FK 배열로 표현된다. nested relation 중 query의 populate path에 있던 것만 객체로 확장된다.

~~~ts
const article = await em.findOneOrFail(Article, articleId, {
  populate: ['author'],
});

const dto = wrap(article).toObject();
// dto.author는 객체, populate하지 않은 relation은 primary key 형태가 될 수 있다.
~~~

partial loading도 암묵 직렬화에 반영된다. primary key는 자동 선택되지만 relation 연결에 필요한 FK는 query의 fields에 명시해야 한다. 그래도 partial hint 밖 property는 DTO에서 빠질 수 있다. 그러므로 암묵 직렬화는 작은 내부 응답에는 편리하지만 public API의 장기 계약에는 explicit serialization 또는 별도 DTO가 더 검토하기 쉽다.

## explicit serialization을 기본 경계로 둔다

serialize는 populate, fields, exclude, groups, forceObject 같은 options로 결과를 정한다. fields는 denylist가 아니라 whitelist이므로, 새 entity property가 추가돼도 응답에 자동으로 나오지 않는다. exclude는 fields와 충돌하면 우선한다.

~~~ts
const dto = wrap(author).serialize({
  populate: ['articles.editor'],
  fields: ['id', 'name', 'articles.title', 'articles.editor.displayName'],
  exclude: ['articles.editor.email'],
  forceObject: true,
  skipNull: true,
});
~~~

명시적 fields를 쓸 때 primary key도 포함하려면 fields 목록에 넣는다. populate는 관계를 중첩 객체로 펼칠지, FK로 둘지를 정하고, fields는 그 property를 보낼지를 정한다. 두 옵션을 하나로 생각하면 응답 누락이나 과노출을 만든다.

## 관계의 응답 형태를 고정한다

unpopulated relation의 기본 표현은 FK 값이다. API가 언제나 object 모양을 약속해야 한다면 forceObject를 쓴다. 이 경우 populate하지 않은 관계도 id만 담은 object가 된다.

| 요구 | 선택 | 예 |
| --- | --- | --- |
| relation ID만 필요 | 기본 직렬화 | author: 17 |
| 항상 object shape | forceObject | author: { id: 17 } |
| relation의 공개 field 필요 | populate + fields | author: { id: 17, displayName: ... } |
| relation마다 공개 권한이 다름 | DTO mapper 또는 groups | viewer role에 맞는 allowlist |

GraphQL, REST, message event는 각각 다른 consumer와 versioning 규칙을 갖는다. 같은 entity의 직렬화 결과를 세 경계에 재사용하지 말고, consumer별 DTO 또는 serializer options를 명시한다.

## hidden property와 property serializer

password hash, refresh token, 내부 심사 상태처럼 외부로 나가면 안 되는 property는 mapping에 hidden을 둔다. 타입 수준에도 HiddenProps를 선언하면 DTO type에서 그 field가 보이지 않는다.

~~~ts
import { HiddenProps } from '@mikro-orm/core';
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/es';

@Entity()
export class User {
  [HiddenProps]?: 'passwordHash';

  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  displayName!: string;

  @Property({ type: 'string', hidden: true })
  passwordHash!: string;
}
~~~

관계나 value를 다른 이름 또는 값으로 노출해야 하면 property serializer를 사용할 수 있다. 예를 들어 관계 전체 대신 authorName만 제공할 수 있다. 다만 serializer가 authorization을 대체하지는 않는다. viewer별 권한 판단이 필요하면 service에서 DTO를 만들고, serializer에는 순수한 표현 변환만 둔다.

~~~ts
@ManyToOne(() => Author, {
  serializer: author => author.displayName,
  serializedName: 'authorName',
})
author!: Author;
~~~

## groups와 권한

property는 serialization group을 가질 수 있고 explicit serialize에 groups를 전달해 포함 범위를 고를 수 있다. groups가 없는 property는 group filter를 써도 포함된다. 따라서 민감 property는 group을 생략한 채 두지 말고 hidden, 명시적 fields, viewer별 DTO 중 하나로 방어한다.

권한 검사는 데이터가 serializer에 도달하기 전에 수행한다. 예를 들어 private profile을 볼 수 있는지 판정한 뒤, 통과한 field만 select하거나 serialize한다. hidden은 accidental output을 막는 방어층이지 row-level authorization이 아니다.

## controller와 job 경계

HTTP controller가 관리 엔티티를 그대로 return한다면, 어느 serializer가 최종 JSON을 만드는지 integration test로 확인한다. MikroORM wrapper, Nest interceptor, GraphQL resolver의 처리 순서가 다르면 같은 엔티티도 결과가 달라질 수 있다.

queue payload와 outbox event도 같은 원칙을 쓴다. entity instance를 직렬화해 나중에 재사용하지 말고, event schema에 필요한 scalar와 version을 명시한다. 관계는 consumer가 다시 조회할 ID인지, event 안에 snapshot으로 보낼 공개 data인지 결정한다.

## 검증 시나리오

- populate하지 않은 relation이 ID, object, null 중 어떤 모양으로 나오는지 endpoint test로 고정한다.
- fields allowlist에 새 entity property가 자동으로 들어오지 않는지 확인한다.
- passwordHash, token, 내부 권한 field가 JSON.stringify와 explicit serialize 어느 경로에서도 빠지는지 확인한다.
- partial entity의 누락 field를 domain command가 참조하지 않는지 확인한다.
- serializer option과 client API schema가 같은 관계 path와 이름을 쓰는지 확인한다.

## 실무 함정

- entity에 새로운 property를 추가하고 기존 toJSON 응답을 재검토하지 않으면 과노출이 생길 수 있다.
- populate만 하고 fields를 생략하면 응답 크기와 공개 field가 예상보다 커질 수 있다.
- fields만 설정하고 populate를 빼면 relation은 객체가 아니라 FK로 남을 수 있다.
- includeHidden은 운영 API에서 기본값으로 쓰지 않는다.
- DTO mapping을 중복이란 이유로 없애면 authorization과 versioning이 entity에 섞인다.

## 확인 질문

- 이 응답의 공개 계약은 어느 client가 소비하는가?
- field와 relation을 allowlist로 고정했는가?
- unpopulated relation의 모양이 client type과 일치하는가?
- hidden은 보조 방어로 쓰고 authorization은 별도로 하는가?
- JSON.stringify, controller return, event serialization의 결과를 모두 확인했는가?

## 관련 문서

- [[MikroORM-Modeling|모델링 학습 지도]]
- [[MikroORM-Entity-Modeling|엔티티 기본값과 hidden field]]
- [[MikroORM-Loading-Relations|populate와 partial fields]]
- [[MikroORM-Relationships|관계의 응답 경계]]

## 출처

- [Serializing - MikroORM](https://mikro-orm.io/docs/serializing)
- [Type-Safe Relations - MikroORM](https://mikro-orm.io/docs/type-safe-relations)
- [MikroORM documentation versions - MikroORM](https://mikro-orm.io/versions)
