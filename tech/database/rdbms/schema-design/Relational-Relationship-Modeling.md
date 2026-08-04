---
tags: [database, rdbms, relationship, cardinality, participation, foreign-key]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Relational Relationship Modeling", "관계형 관계 모델링", "식별 비식별 관계"]
---

# 관계형 데이터베이스의 관계 모델링

관계는 단순한 ORM decorator가 아니라 두 entity 사이의 **수량, 필수 여부, 생명주기와 무결성**을 표현한다. 1:1, 1:N, M:N 표기만 정하지 말고 어떤 사실을 어느 row가 소유하는지와 결과 query의 grain까지 검증한다.

## Cardinality와 participation

```text
한 Customer는 0개 이상의 Order를 가진다.
한 Order는 정확히 한 Customer를 참조한다.
```

- Cardinality는 관계 가능한 instance 수다.
- Participation은 관계가 필수인지 선택인지다.
- N쪽 FK의 `NULL`/`NOT NULL`은 N쪽 참여를 강제할 수 있다.
- 1쪽이 최소 한 개의 child를 가져야 한다는 규칙은 FK만으로 보장되지 않는다. 생성 transaction, deferred workflow와 검증 query가 필요하다.

관계형 모델 자체에는 객체 navigation 같은 단방향/양방향 개념이 없다. FK 하나로 양쪽 방향 query가 가능하지만 성능은 각 방향의 index와 query shape에 달려 있다.

## 1:N 관계

한 child가 하나의 parent를 가리키는 일반적인 1:N은 FK를 N쪽에 둔다.

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customer(id),
  INDEX idx_orders_customer_created (customer_id, created_at)
);
```

1쪽 row에 child ID 목록을 문자열/JSON으로 저장하면 원자적 참조, FK와 개별 검색이 약해진다. 다만 배열 자체가 한 document의 값이고 개별 child relation이 아니라면 다른 모델일 수 있으므로 의미를 먼저 구분한다.

### Join fan-out

Customer를 기준으로 Order를 join하면 customer 한 건이 order 수만큼 반복된다. 이것은 오류가 아니라 결과 grain이 달라진 것이다.

- pagination 전에 1:N join을 하면 parent page 크기와 total count가 왜곡될 수 있다.
- `DISTINCT`로 증상을 지우기 전에 어떤 row 한 개가 결과 한 개여야 하는지 정한다.
- child 조건의 존재만 필요하면 `EXISTS`를 검토한다.
- 집계 전에 여러 1:N을 동시에 join하면 곱집합이 생길 수 있어 child별 사전 집계가 필요하다.

## 1:1 관계

1:1은 FK와 `UNIQUE`를 함께 사용한다. FK 위치는 주/보조라는 이름보다 optionality, 생성 순서, 소유권과 미래 cardinality로 정한다.

```sql
CREATE TABLE member_profile (
  id BIGINT PRIMARY KEY,
  member_id BIGINT NOT NULL UNIQUE,
  FOREIGN KEY (member_id) REFERENCES member(id)
);
```

보조 table에 FK를 두면 optional row를 자연스럽게 표현하고 `UNIQUE` 제거로 1:N 전환이 쉬울 수 있다. 반대로 관계 자체가 parent의 핵심 필수 값이고 한 번의 lookup이 중요하면 parent FK가 맞을 수 있다. 어느 위치도 반대편의 필수 참여를 일반 FK 하나로 완전히 강제하지는 못한다.

Child PK가 parent PK이기도 한 shared primary key는 강한 생명주기 종속과 compact key를 표현한다. 독립 identity나 다른 parent로 이동할 가능성이 있다면 별도 surrogate PK가 더 유연하다.

## M:N과 연관 entity

관계형 schema에서는 연결 table로 두 개의 1:N을 만든다.

```sql
CREATE TABLE order_item (
  id BIGINT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  UNIQUE (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES product(id)
);
```

`quantity`, 역할, 가입 시각처럼 관계에 속한 attribute가 있으면 연결 table은 독립적인 연관 entity다. 같은 상품을 여러 option/가격 line으로 허용하면 `(order_id, product_id)` unique는 더 이상 맞지 않으므로 business identity를 다시 정의한다.

### Composite PK vs surrogate PK

- 관계가 두 FK 조합으로 완전히 식별되고 다른 table이 이를 참조하지 않으면 composite PK가 간결하다.
- 관계 row가 자체 lifecycle을 갖거나 외부 참조, history와 key 확장이 예상되면 surrogate PK가 편리하다.
- surrogate PK를 추가해도 중복 관계를 막는 composite `UNIQUE`는 필요한 경우 유지한다.

## 식별 관계와 비식별 관계

식별 관계는 parent key가 child PK 일부이고, 비식별 관계는 parent key가 일반 FK다.

| 질문 | 식별 관계 후보 | 비식별 관계 후보 |
|---|---|---|
| Child identity가 parent 안에서만 의미 있는가 | 강함 | 약함 |
| Child를 다른 parent로 이동할 수 있는가 | 불편 | 상대적으로 쉬움 |
| 여러 단계로 PK가 전파되는가 | key가 길어짐 | 독립 PK 유지 |
| ORM/API에서 단일 ID가 필요한가 | mapping 추가 | 단순 |

대리 키와 비식별 관계는 변경에 유연한 좋은 기본값이지만 황금률은 아니다. `order_id + line_no`, locale별 번역, aggregate 내부 value row처럼 parent 범위가 identity 자체인 경우 식별 관계가 의미를 정확히 드러낼 수 있다. 반대로 깊은 hierarchy를 따라 composite PK가 전파되고 business rule 변경 때 모든 FK를 바꿔야 한다면 비식별 관계가 낫다.

성능은 이름으로 결정되지 않는다. 짧은 composite clustered key가 유리할 수도 있고, 넓은 PK가 모든 InnoDB secondary index에 복제되어 비용을 키울 수도 있다. 대표 query, key 폭과 변경 부하를 측정한다.

## TypeORM 적용

- 단순 M:N도 장래 attribute가 예상되면 `@ManyToMany` 자동 join table보다 명시적 entity를 고려한다.
- 1:1에는 owning side의 `@JoinColumn`과 DB `UNIQUE`가 실제로 생성되는지 migration을 확인한다.
- cascade는 객체 저장 편의이지 business delete 정책이 아니다. 범위를 명시하고 생성 SQL을 review한다.
- eager/lazy relation은 schema cardinality를 바꾸지 않는다. N+1, join fan-out과 transaction 경계는 실제 SQL로 확인한다.
- relation ID만으로 authorization이나 tenant 일치를 가정하지 않고 service policy와 composite constraint를 둔다.

## 검증 체크리스트

1. 관계를 양쪽의 최소/최대 수량을 포함한 문장으로 썼는가?
2. FK 위치와 nullable 여부가 생성/삭제 lifecycle과 맞는가?
3. 반대편 mandatory participation을 누가 강제하는가?
4. 연결 table에 숨은 attribute와 독립 lifecycle이 있는가?
5. surrogate PK 뒤에도 필요한 natural/composite unique가 남아 있는가?
6. 대표 join의 결과 grain과 fan-out을 test했는가?

## 출처

- [MySQL 8.4, FOREIGN KEY Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html)
- [TypeORM, Relations](https://typeorm.io/docs/relations/relations/)
- 관계/참여: [관계](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347634), [참여도](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347635), [1:N FK 1](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347636), [1:N FK 2](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347637), [Join fan-out](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347638), [정리](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347639)
- 1:1: [시작](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347641), [FK 위치](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347642), [관계 확장](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347643), [주 table FK](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347644)
- M:N: [관계형 한계](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347645), [연결 table](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347646), [관계 속성](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347647), [개념/논리 모델](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347648), [정리](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347649)
- 식별/비식별 관계: [개념](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347651), [1:N](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347652), [문제점](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347653), [SQL/성능](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347654), [1:1](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347655), [M:N 1](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347656), [M:N 2](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347657), [설계 경향](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347658), [정리](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347659)
- 논리 모델 실습: [시작](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347661), [ERD](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347662)

## 관련 문서

- [[Data-Modeling-Workflow|데이터 모델링 절차]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[Primary-Key-Strategy|Primary Key 전략]]
- [[Normalization|정규화]]
- [[SQL-Joins|SQL Join]]
