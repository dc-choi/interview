---
tags: [architecture, design-pattern, creational, builder]
status: done
category: "Architecture & Design"
aliases: ["Builder Pattern", "빌더 패턴"]
---

# Builder 패턴이란?

Builder는 복잡한 객체의 생성 과정을 단계로 분리하고, 같은 과정으로 서로 다른 표현을 만들 수 있게 하는 생성 패턴이다. 많은 생성자 인자를 읽기 좋게 만드는 Fluent API는 흔한 구현이지만 패턴의 필수 조건은 아니다.

## TypeScript 예시

```typescript
class ReportBuilder {
  private title?: string
  private sections: Section[] = []

  withTitle(title: string): this {
    this.title = title
    return this
  }

  addSection(section: Section): this {
    this.sections.push(section)
    return this
  }

  build(): Report {
    if (!this.title) throw new Error('TITLE_REQUIRED')
    return new Report(this.title, [...this.sections])
  }
}
```

`build()`가 필수 값과 조합 규칙을 검증하고 완성된 객체만 반환한다. Builder를 재사용한다면 `build()` 이후 상태 초기화 여부와 입력 배열의 방어적 복사를 정한다.

## Director와 표현 분리

GoF 구조에서는 Director가 생성 단계의 순서를 알고 Builder가 각 단계를 구현한다. 같은 Director가 HTML 보고서와 PDF 보고서처럼 서로 다른 결과 표현을 만들 수 있다. 단계 순서가 단순하면 Director 없이 클라이언트가 Builder를 직접 호출해도 된다.

## 더 단순한 대안

TypeScript에서는 이름 있는 객체 매개변수와 기본값이 텔레스코핑 생성자 문제를 자주 해결한다.

```typescript
new Report({ title, sections: [], locale: 'ko-KR' })
```

단계 순서, 중간 상태, 여러 표현이나 복잡한 검증이 없다면 Builder 클래스보다 이 방식이 명확하다. SQL Query Builder처럼 단계마다 결과 타입을 좁히거나 복잡한 조합을 누적할 때 Builder의 가치가 커진다.

## 출처

- 얄팍한 코딩사전, [Builder 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=244723)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- yongsoocho, [TypeScript로 구현하는 Builder](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=150433)
- yongsoocho, [Decorator로 구현하는 Builder](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=150434)

## 관련 문서

- [[Factory패턴이란|Factory와 Factory Method]]
- [[AbstractFactory패턴이란|Abstract Factory 패턴]]
- [[Defensive-Copy-Immutable-Practice|방어적 복사와 불변 객체]]
