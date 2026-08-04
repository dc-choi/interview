---
tags: [database, rdbms, inheritance, supertype, subtype, orm]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Relational Inheritance Mapping", "Supertype Subtype", "관계형 상속 매핑"]
---

# 관계형 supertype/subtype 매핑

객체의 상속을 table에 그대로 옮기는 유일한 방식은 없다. 공통 identity, subtype별 제약, 전체 조회와 쓰기 진화 비용을 기준으로 **concrete table, single table, joined table**을 비교한다. 상속보다 composition이 domain에 맞는지도 먼저 확인한다.

## 예시 요구

모든 상품은 `id`, `name`, `price`를 공유하지만 배송 상품은 `weight`, digital 상품은 `download_url`을 가진다고 하자.

확인할 질문은 다음과 같다.

- 모든 subtype을 한 목록과 하나의 FK target으로 다루는가
- subtype이 서로 배타적인가, 한 entity가 여러 특성을 가질 수 있는가
- 공통/전용 field의 `NOT NULL`, FK와 unique를 DB가 강제해야 하는가
- subtype 추가/삭제와 field 변경이 얼마나 자주 일어나는가
- 전체 조회와 subtype 조회 중 어느 쪽이 지배적인가

배송 가능하면서 digital entitlement도 있는 상품처럼 특성이 조합될 수 있다면 subtype 상속보다 1:0..1 capability table 조합이 자연스럽다.

## Table per concrete type

```text
physical_product(id, name, price, weight)
digital_product(id, name, price, download_url)
```

### 강점

- subtype 단독 query와 constraint가 단순하다.
- 불필요한 NULL과 join이 없다.
- subtype별 lifecycle과 storage를 독립적으로 운영할 수 있다.

### 비용

- 공통 field와 migration이 table마다 중복된다.
- 전체 상품은 `UNION ALL`이 필요하다.
- ID namespace가 겹칠 수 있어 공통 FK가 한 table을 참조하기 어렵다.
- 공통 속성 update/정책을 여러 write path에서 맞춰야 한다.

subtype끼리 실제로 독립 aggregate이고 전체 identity/query가 드물 때 적합하다. 단순해 보인다는 이유만으로 공통 상품 identity가 필요한 domain에 쓰면 참조가 복잡해진다.

## Single table inheritance

```text
product(
  id, dtype, name, price,
  weight NULL,
  download_url NULL
)
```

### 강점

- 전체/subtype query와 공통 FK가 단순하다.
- insert 한 번으로 row가 완성된다.
- subtype 수와 전용 field가 적을 때 읽기 경로가 짧다.

### 비용

- subtype field의 NULL이 많아지고 row가 넓어진다.
- 일반 `NOT NULL`만으로 subtype별 필수 field를 표현하기 어렵다.
- subtype 추가가 central table DDL과 모든 consumer에 영향을 준다.
- `dtype`과 field 조합이 어긋난 invalid row를 막아야 한다.

가능하면 `CHECK`로 discriminator별 field 조합을 강제한다. subtype이 많거나 큰 field가 계속 추가되면 row/index와 migration 비용을 다시 측정한다. join이 없다는 이유만으로 항상 빠른 것은 아니다.

## Joined table inheritance

```text
product(id, dtype, name, price)
physical_product(product_id PK/FK, weight)
digital_product(product_id PK/FK, download_url)
```

부모와 자식이 PK를 공유하는 1:0..1 관계다.

### 강점

- 공통 identity와 subtype별 강한 constraint를 함께 유지한다.
- 공통 field 중복이 없고 subtype table이 좁다.
- 다른 table은 `product.id` 하나를 안정적으로 참조한다.

### 비용

- 완전한 subtype row를 읽고 쓸 때 join과 여러 statement가 필요하다.
- 모든 subtype 세부정보를 한 번에 읽으면 여러 outer join/union이 생긴다.
- parent만 있고 subtype row가 없거나 discriminator와 다른 child가 생기는 것을 transaction으로 막아야 한다.

공통 identity와 subtype 제약이 모두 중요하고 전체 목록은 공통 field 중심일 때 유용하다.

## 선택표

| 조건 | concrete | single | joined |
|---|---:|---:|---:|
| 공통 FK/ID 필요 | 약함 | 강함 | 강함 |
| subtype constraint | 강함 | CHECK 필요 | 강함 |
| 전체 목록 query | UNION | 단순 | parent만 또는 join |
| subtype 추가 | 새 table | central DDL | child table |
| 공통 field 변경 | 반복 DDL | 한 table | parent 한 table |
| sparse subtype field | 유리 | 불리 | 유리 |

전략 이름만으로 결정하지 않고 대표 query, row 수, subtype 수와 예상 schema evolution을 prototype/실행 계획으로 비교한다.

## 무결성 보강

- discriminator는 허용된 값으로 제한한다.
- joined model은 parent/child insert를 한 transaction에서 처리한다.
- child PK를 parent FK로 사용해 1:1을 강제한다.
- subtype 전환이 허용되는지, 기존 child data를 어떻게 migrate하는지 명시한다.
- soft delete를 parent에만 둘지 child에도 둘지 일관된 visibility rule을 둔다.
- subtype별 unique가 전체 subtype을 가로질러야 하는지 확인한다.

## TypeORM 경계

TypeScript class inheritance는 code column을 재사용하는 기능이고, DB inheritance 전략 선택과 동일하지 않다. TypeORM의 base entity column inheritance와 single-table inheritance를 사용할 수 있지만 생성 schema와 query를 확인한다.

- decorator 편의보다 DB constraint와 migration을 먼저 설계한다.
- joined table이 필요한데 ORM이 원하는 형태를 직접 지원하지 않으면 명시적 1:1 entity 조합이 더 투명하다.
- relation eager loading이 subtype 전체 join을 만들지 확인한다.
- API에는 persistence class hierarchy를 그대로 노출하지 않고 tagged DTO/union으로 계약을 만든다.

## 교정해야 할 단정

- concrete table 전략이 실무에서 언제나 사용할 수 없는 것은 아니다.
- single table은 join이 없다는 이유만으로 모든 workload에서 가장 빠르지 않다.
- joined table은 정규화됐다는 이유만으로 항상 무결성을 자동 완성하지 않는다.
- ORM의 inheritance decorator가 domain의 is-a 관계를 증명하지 않는다.

## 출처

- [TypeORM, Entity inheritance](https://typeorm.io/docs/entity/entities/#entity-inheritance)
- [김영한 강사, 상속 관계 문제](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402001)
- [김영한 강사, concrete table 전략](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402002)
- [김영한 강사, concrete table 장단점](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402003)
- [김영한 강사, single table 전략](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402004)
- [김영한 강사, single table 장단점](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402005)
- [김영한 강사, joined table 전략](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402006)
- [김영한 강사, joined table 장단점](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402007)
- [김영한 강사, 관계형 상속 mapping 정리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402008)

## 관련 문서

- [[Normalization|정규화와 반정규화]]
- [[Flexible-Attribute-Modeling|가변 속성 모델링]]
- [[ORM-Impedance-Mismatch|ORM과 impedance mismatch]]
