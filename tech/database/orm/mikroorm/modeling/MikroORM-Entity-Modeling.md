---
tags: [orm, mikroorm, entity, modeling, typescript]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM 엔티티 모델링", "MikroORM Entity Modeling"]
---

# MikroORM 엔티티 모델링

## 목표

엔티티는 독립 식별자를 갖고 Unit of Work가 추적하는 도메인 객체다. MikroORM은 일반 JavaScript 객체와 클래스를 엔티티로 쓸 수 있지만, 모든 엔티티에는 primary key가 필요하다. 관계, 기본값, nullable, 인덱스 같은 영속성 규칙은 메타데이터로 선언한다.

핵심 경계는 다음과 같다.

- 엔티티는 식별자와 생명주기를 가진다.
- embeddable은 엔티티에 포함되는 값 객체다.
- DTO는 외부 입출력 모양이며 엔티티와 같을 이유가 없다.
- 데이터베이스 제약은 최후의 무결성 방어선이고, 도메인 메서드는 상태 전이를 표현한다.

## 정의 방식 선택

v7.1에서 새 코드는 defineEntity와 클래스를 우선 검토한다. 타입 추론이 완전하고 decorator 설정이나 런타임 reflection 의존성이 없다. 기존 NestJS 코드가 decorator 중심이면 해당 규약을 유지해도 된다.

| 방식 | 적합한 경우 | 주의점 |
| --- | --- | --- |
| defineEntity + class | 새 코드, 번들러 호환성과 타입 추론을 우선할 때 | decorator 문법에 익숙한 팀은 처음에 낯설 수 있다. |
| legacy decorator | 기존 experimentalDecorators 코드 | reflect-metadata 사용 시 관계 대상, nullable 등 옵션을 더 명시한다. |
| ES decorator | TypeScript 5 이상과 현대 번들러 | metadata reflection을 쓸 수 없고 관계 대상을 명시한다. |
| TsMorphMetadataProvider | decorator 정의를 간결히 하고 타입을 소스에서 읽을 때 | discovery가 무거워지고 배포 시 declaration, cache 전략을 확인한다. |

v7에서는 decorator가 core에서 분리됐다. legacy는 @mikro-orm/decorators/legacy, ES 표준 decorator는 @mikro-orm/decorators/es에서 가져온다. 기존 v6 import를 그대로 두면 마이그레이션 오류가 난다.

## defineEntity와 클래스

다음 예시는 식별자, 필수 값, 생성 시각, 갱신 시각을 한 클래스에 둔다. domain method는 클래스에, 영속성 정의는 schema에 둔다.

~~~ts
import { defineEntity, p } from '@mikro-orm/core';

const MemberSchema = defineEntity({
  name: 'Member',
  properties: {
    id: p.integer().primary(),
    email: p.string(),
    displayName: p.string(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class Member extends MemberSchema.class {
  rename(displayName: string) {
    if (displayName.trim().length === 0) {
      throw new Error('displayName is required');
    }

    this.displayName = displayName;
  }
}

MemberSchema.setClass(Member);
~~~

이 구조에서 schema는 ORM metadata를 만들고, Member는 행위와 불변식을 담는다. persistence service가 직접 필드를 제각각 바꾸기보다 rename 같은 메서드를 호출하면 변경 규칙의 위치가 한 곳으로 모인다.

## 생성자와 hydrate의 차이

MikroORM은 DB에서 관리 엔티티를 hydrate할 때 엔티티 생성자를 실행하지 않는다. 따라서 생성자에만 기본값을 넣거나 반드시 실행되어야 하는 검증을 두면 DB에서 읽은 객체에는 적용되지 않는다.

새 객체에서 즉시 보여야 하는 기본값은 클래스 field initializer를 쓴다. DB 함수가 필요한 기본값은 property의 default 또는 defaultRaw를 선택하고, flush 뒤에 DB가 넣은 값을 확인한다. 유효성 검증은 생성 경로뿐 아니라 상태 변경 메서드와 DB constraint에도 둔다.

~~~ts
export class Account extends AccountSchema.class {
  enabled = true;

  disable() {
    if (!this.enabled) {
      return;
    }

    this.enabled = false;
  }
}
~~~

## nullable, 기본값, 타입

TypeScript의 optional은 곧바로 DB nullable과 같지 않다. metadata provider마다 추론 범위가 다르므로, 저장소 제약이 중요하면 nullable과 column type을 명시한다. 특히 reflect-metadata는 optional property와 배열 원소 타입, enum, Ref wrapper를 충분히 추론하지 못할 수 있다.

결정 기준은 다음과 같다.

- 요청 입력에서 생략 가능하지만 저장 뒤에는 항상 있어야 하면 앱 기본값이나 onCreate를 쓴다.
- DB도 null을 허용해야 하면 nullable을 선언한다.
- DB function을 기본값으로 쓸 때는 데이터베이스 방언과 migration SQL을 함께 검토한다.
- money, timezone, JSON, enum은 driver 변환과 비교 방식이 일관된 custom type 또는 명시적 column mapping을 쓴다.

## 키와 유니크 제약

모든 엔티티에는 primary key가 필요하다. 일반적인 업무 엔티티는 단일 surrogate key가 참조와 migration을 단순하게 한다. 복합키는 자연스러운 식별자일 때만 쓴다. 복합키를 쓰면 persist 전에 모든 key 부분을 제공해야 하고, 관계와 DTO, route parameter도 복합 식별자를 이해해야 한다.

email처럼 업무상 중복되면 안 되는 값은 애플리케이션의 사전 조회만 믿지 말고 DB unique constraint를 둔다. 사전 조회는 더 좋은 오류 메시지를 위한 보조 수단이며, 동시 요청의 최종 판정은 DB가 한다.

## embeddable과 상속

값 객체는 주소, 기간, 좌표처럼 독립 식별자가 없고 부모와 함께 바뀌는 값을 묶는다. MikroORM embeddable은 엔티티가 아니지만 query할 수 있고, 일반적으로 inline column 또는 object/JSON 형태로 저장한다. embeddable도 discovery 대상이므로 ORM 초기화 목록에 포함한다.

~~~ts
const AddressSchema = defineEntity({
  name: 'Address',
  embeddable: true,
  properties: {
    city: p.string(),
    postalCode: p.string(),
  },
});

export class Address extends AddressSchema.class {}

AddressSchema.setClass(Address);

const CustomerSchema = defineEntity({
  name: 'Customer',
  properties: {
    id: p.integer().primary(),
    address: () => p.embedded(Address),
  },
});
~~~

상속은 공통 audit column처럼 단순한 mapped superclass에 유용하다. 하지만 mapped superclass는 직접 query할 수 없고, 관계 제약이 있다. subtype별 필드와 query가 복잡하면 Single Table Inheritance와 Table Per Type의 읽기, 쓰기, index 비용을 먼저 비교한다. 단순 재사용을 위해 상속을 택하기보다 embeddable이나 조합을 우선 검토한다.

## 실무 함정

- hydrate된 엔티티 생성자는 실행되지 않는다. 생성자에만 불변식을 두지 않는다.
- ORM type과 TypeScript type이 다르면 schema generator가 의도와 다른 column을 만들 수 있다.
- JSON column은 유연하지만 부분 update, index, 유니크 제약이 필요한 필드에는 불리하다.
- value object가 다른 aggregate에서 독립 참조되기 시작하면 embeddable로 유지하지 말고 엔티티 승격을 검토한다.
- schema generator 결과를 운영 변경 수단으로 바로 쓰지 않는다. migration diff와 실제 DB 제약을 검토한다.

## 확인 질문

- 이 모델에 독립 primary key와 삭제, 변경 생명주기가 필요한가?
- 새 객체의 기본값과 DB에서 읽은 객체의 상태가 같은 규칙을 만족하는가?
- optional TypeScript property가 실제 nullable column인가?
- unique와 FK를 애플리케이션 코드만으로 보장하고 있지 않은가?
- 이 값 객체를 다른 aggregate가 ID로 참조해야 하는 요구가 생겼는가?

## 관련 문서

- [[MikroORM-Modeling|모델링 학습 지도]]
- [[MikroORM-Relationships|관계와 Collection]]
- [[MikroORM-Serialization|엔티티와 DTO 직렬화]]

## 출처

- [Defining Entities — MikroORM](https://mikro-orm.io/docs/defining-entities)
- [Using Decorators — MikroORM](https://mikro-orm.io/docs/using-decorators)
- [Separating Concerns using Embeddables — MikroORM](https://mikro-orm.io/docs/embeddables)
- [Inheritance Mapping — MikroORM](https://mikro-orm.io/docs/inheritance-mapping)
