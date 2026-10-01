---
tags: [querydsl, jpa, projection, dto]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Querydsl Projection", "Querydsl DTO Projection"]
---

# Querydsl projection과 DTO

Projection은 `SELECT` 결과의 모양을 정한다. Entity graph가 필요한 command model인지, 목록에 필요한 scalar와 DTO만 읽는 query model인지 먼저 결정하고 그 경계를 code에 드러낸다.

## 반환 모양

| 선택 항목 | 일반 결과 | 권장 경계 |
|---|---|---|
| 하나의 scalar expression | `String`, `Long` 같은 expression type | 값 자체의 의미가 분명할 때 |
| 여러 expression | `Tuple` | Repository 내부의 임시 조합 |
| Entity path | Managed entity | 변경 추적과 association 탐색이 필요할 때 |
| DTO expression | Application DTO | 목록, 통계와 API read model |

```java
List<Tuple> rows = queryFactory
    .select(member.username, member.age)
    .from(member)
    .fetch();

for (Tuple row : rows) {
    String username = row.get(member.username);
    Integer age = row.get(member.age);
}
```

`Tuple` lookup은 선택에 사용한 expression과 결합되어 있다. Querydsl type을 service나 controller 계약으로 흘리지 말고 repository 안에서 DTO로 바꾼다.

## DTO projection 방식

```java
// bean과 fields 예시는 기본 constructor가 있는 mutable DTO를 가정한다.
// 아래 @QueryProjection의 불변 MemberView에는 constructor 방식만 맞는다.
List<MemberView> byBean = queryFactory
    .select(Projections.bean(
        MemberView.class,
        member.username,
        member.age
    ))
    .from(member)
    .fetch();

List<MemberView> byFields = queryFactory
    .select(Projections.fields(
        MemberView.class,
        member.username.as("name"),
        member.age
    ))
    .from(member)
    .fetch();

List<MemberView> byConstructor = queryFactory
    .select(Projections.constructor(
        MemberView.class,
        member.username,
        member.age
    ))
    .from(member)
    .fetch();
```

| 방식 | Binding 기준 | 주요 trade-off |
|---|---|---|
| `bean` | JavaBeans property와 setter | 기본 constructor와 setter가 필요하며 이름 mismatch에 민감 |
| `fields` | Field 이름 | Getter와 setter 없이 private field에도 주입하지만 `bean`처럼 기본 constructor가 필요하고 이름 mismatch를 확인 |
| `constructor` | Argument 순서와 type | DTO 이름은 자유롭지만 순서 오류가 compile 단계에 잡히지 않을 수 있음 |

### 이름 binding과 생성자 binding에서 alias의 역할

`bean`과 `fields`는 이름으로 binding한다. DTO field가 `name`이고 entity property가 `username`이면 `member.username.as("name")`처럼 alias를 준다. Subquery는 결과에 이름이 없고 `JPAExpressions.select(...)`가 돌려주는 `JPQLSubQuery`에는 `as()`가 없으므로 `ExpressionUtils.as(JPAExpressions.select(memberSub.age.max()).from(memberSub), "age")`처럼 감싼다. Path나 단순 식에는 `.as()`, 이름 없는 식에는 `ExpressionUtils.as`를 쓴다.

OpenFeign Querydsl 7.7의 `QBean` source와 실행으로 확인한 실패 양상은 다음과 같다.

- `bean`과 `fields` 모두 기본 constructor로 instance를 먼저 만들므로, 없으면 실행 시점에 `ExpressionException`이 난다.
- 이름이 맞지 않는 property는 `propertyNotFound`가 아무것도 하지 않아 예외 없이 건너뛰고 DTO 값이 null로 남는다. 조용한 null이 projection test를 두는 직접적인 이유다.
- Type이 맞지 않으면 `IllegalArgumentException`이다.

`Projections.constructor`와 `@QueryProjection`은 이름이 아니라 생성자 parameter의 type과 순서로 매칭하므로 alias가 binding에 영향을 주지 않는다. `Projections.constructor`에 `member.username.as("whatever")`를 넘겨도 값이 그대로 들어갔다. 생성자 방식에는 의미 없는 alias를 붙이지 말고 순서와 type을 test로 검증한다. Alias 문자열도 refactoring 대상이므로 projection test를 둔다. Null을 primitive constructor parameter에 넣는 경우도 함께 검증한다.

## `@QueryProjection`

```java
public final class MemberView {
    private final String username;
    private final int age;

    @QueryProjection
    public MemberView(String username, int age) {
        this.username = username;
        this.age = age;
    }
}
```

```java
List<MemberView> result = queryFactory
    .select(new QMemberView(member.username, member.age))
    .from(member)
    .fetch();
```

Generated constructor expression이 argument type과 순서를 compile 단계에서 검사한다. 대신 DTO source가 Querydsl annotation과 generated Q DTO에 의존한다. 다음 기준으로 선택한다.

- Query layer 전용 DTO이고 compile-time 검증이 중요하면 `@QueryProjection`이 유리하다.
- Domain/application DTO가 persistence library로부터 독립적이어야 하면 `Projections.constructor`나 명시적 mapper를 검토한다.
- 외부 API DTO와 database query DTO의 변경 주기가 다르면 두 type을 분리한다.

## Entity 조회와 DTO 조회

DTO projection은 필요한 column만 가져오고 lazy association 직렬화를 막는 데 유리하다. 반면 entity 변경, domain method 실행과 persistence context identity가 필요하면 entity 조회가 자연스럽다. DTO projection도 join row 증가, count 비용, function과 index 문제를 자동 해결하지 않는다.

Read model을 선택할 때 다음을 함께 검증한다.

- SQL select list와 join 수
- Null과 outer join mapping
- Duplicate row와 grouping
- Constructor 또는 alias mismatch
- API field와 persistence field의 결합 정도

## 출처

- [OpenFeign Querydsl JPA tutorial](https://openfeign.github.io/querydsl/tutorials/jpa/)
- [OpenFeign Querydsl 7.5, Projections source](https://github.com/OpenFeign/querydsl/blob/7.5/querydsl-libraries/querydsl-core/src/main/java/com/querydsl/core/types/Projections.java)
- [OpenFeign Querydsl 7.7, QBean source](https://github.com/OpenFeign/querydsl/blob/7.7/querydsl-libraries/querydsl-core/src/main/java/com/querydsl/core/types/QBean.java)
- [OpenFeign Querydsl 7.7, JPQLSubQuery source](https://github.com/OpenFeign/querydsl/blob/7.7/querydsl-libraries/querydsl-jpa/src/main/java/com/querydsl/jpa/JPQLSubQuery.java)
- [기본 projection과 result](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30136)
- [DTO projection](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30137)
- [`@QueryProjection`](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30138)
- [동적 query와 성능 최적화 조회, Builder 사용](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30145)
- [강의 자료](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30112)

## 관련 문서

- [[JPA-API-DTO-Boundary|JPA API DTO 경계]]
- [[Spring-Data-JPA-Projections-and-Native-Queries|Spring Data JPA projection]]
- [[Querydsl-Repository-and-Paging|Query repository 구성]]
