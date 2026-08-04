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

## 출처

- 얄팍한 코딩사전, [Specification 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=247243)
- [Eric Evans, Martin Fowler, Specifications](https://martinfowler.com/apsupp/spec.pdf)

## 관련 문서

- [[Composite패턴이란|Composite 패턴]]
- [[Strategy패턴이란|Strategy 패턴]]
- [[DDD|Domain-Driven Design]]
