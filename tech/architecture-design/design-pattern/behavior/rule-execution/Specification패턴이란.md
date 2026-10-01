---
tags: [architecture, design-pattern, behavioral, specification, ddd]
status: done
category: "Architecture & Design"
aliases: ["Specification Pattern", "명세 패턴"]
---

# Specification 패턴이란?

Specification은 후보 객체가 비즈니스 조건을 만족하는지 판단하는 규칙을 별도 객체로 표현하는 패턴이다. 선택, 검증과 조건에 맞는 객체 구성 요구를 도메인 객체의 다른 책임에서 분리한다.

## 합성 가능한 규칙

```typescript
interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean
}

class AndSpecification<T> implements Specification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>,
  ) {}

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate)
      && this.right.isSatisfiedBy(candidate)
  }
}
```

AND, OR, NOT을 Composite로 조합하면 정책의 이름과 구조를 코드에 드러낼 수 있다. 단순한 한 줄 조건까지 클래스로 만들 필요는 없다. 규칙이 여러 사용 사례에서 재사용되고 독립적으로 조합, 설명 또는 테스트될 때 가치가 커진다.

## 인메모리 규칙과 DB 질의

`isSatisfiedBy(entity)`는 이미 로드된 객체를 평가한다. 이를 그대로 TypeORM SQL로 번역할 수 있다고 가정하면 안 된다. 대량 데이터를 모두 메모리에 불러와 필터링하지 않도록 다음을 구분한다.

- 도메인 Specification: 객체의 행동과 불변식을 평가한다.
- Query Specification: 저장소가 이해하는 조건식이나 QueryBuilder 조각을 만든다.

두 표현을 하나로 통합하면 재사용성이 좋아질 수 있지만 ORM 표현력, 조인, NULL 의미와 DB 함수에 강하게 결합한다. 번역 가능 범위를 테스트하고, 도메인 규칙과 조회 최적화의 책임을 명확히 한다.

## 조합 연산의 확장과 빈 값

AND, OR, NOT은 기존 조건을 바꾸지 않고 조합하는 별도 객체나 함수로 만들 수 있다. TypeScript interface에는 구현을 넣을 수 없으므로 편의를 위해 모든 조건에 상속 기반 fluent API를 강제할 필요는 없다. 독립 조합 함수는 기본 클래스가 구체 조합 클래스를 다시 import하는 순환도 피한다.

부정 조건을 반대 비교식으로 무조건 바꾸면 안 된다. JavaScript에서 `!(price <= 100)`은 `price`가 `undefined`나 `NaN`일 때 참이지만 `price > 100`은 거짓이다. SQL의 NULL 비교는 UNKNOWN이 되어 WHERE에서 제외된다. 조건 조합 이전에 유효한 값인지 검사하고, 값이 없을 때 불충족인지 오류인지 계약으로 정한다.

## 출처

- 얄팍한 코딩사전, [Specification 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=247243)
- [Eric Evans, Martin Fowler, Specifications](https://martinfowler.com/apsupp/spec.pdf)

## 관련 문서

- [[Composite패턴이란|Composite 패턴]]
- [[Condition-Tree|조건 트리 (규칙을 데이터로 저장하고 런타임에 평가)]]
- [[Strategy패턴이란|Strategy 패턴]]
- [[DDD|Domain-Driven Design]]
