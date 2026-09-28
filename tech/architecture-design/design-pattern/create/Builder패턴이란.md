---
tags: [architecture, design-pattern, creational, builder]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Builder Pattern", "빌더 패턴"]
---

# Builder 패턴이란?

Builder는 복잡한 객체의 생성 과정을 단계로 분리하고, 같은 과정으로 서로 다른 표현을 만들 수 있게 하는 생성 패턴이다. 많은 생성자 인자를 읽기 좋게 만드는 Fluent API는 흔한 구현이지만 패턴의 필수 조건은 아니다.

생성자 인자가 많을 때 쓰는 Fluent 형태는 Joshua Bloch가 Effective Java에서 점층적 생성자와 JavaBeans 방식의 대안으로 제시하며 GoF Builder의 한 형태라고 소개했다. 제품에 setter를 두고 값을 하나씩 채우는 JavaBeans 방식은 생성이 여러 호출로 나뉘어 제품이 중간의 불완전한 상태로 쓰일 수 있고, 제품을 불변으로 만들 수 없다. Builder는 값을 Builder 쪽에 누적했다가 `build()`에서 제품을 한 번에 만들어 두 문제를 피한다.

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

- 위 예시처럼 필수 값을 `withTitle()`로 받고 `build()`에서 확인하는 대신 `new ReportBuilder(title)`처럼 Builder 생성자 인자로 받으면 누락이 컴파일 오류가 된다. Bloch의 Builder도 필수 매개변수는 Builder 생성자로, 선택 매개변수만 setter 형태의 메서드로 받는다.
- `build()`에서 boolean이나 number 필드를 확인할 때는 `!value` 대신 `value === undefined`로 미설정을 판별한다. falsy 검사는 명시적으로 지정한 `false`와 `0`도 미설정으로 본다.
- 검증 실패는 `null` 반환보다 어떤 조건이 깨졌는지 담은 예외로 알린다. `null`을 반환하면 실패 이유가 사라지고, `strictNullChecks`에서는 반환 타입이 `Report | null`이 되어 모든 호출부가 null 분기를 떠안는다.
- 체이닝 메서드의 반환 타입은 클래스 이름 대신 `this`로 둔다. `ReportBuilder`로 명시하면 하위 Builder에서 상속한 메서드를 호출한 뒤 하위 클래스의 메서드를 이어 호출할 수 없다. 반환 타입 없이 `return this`만 써도 TypeScript는 `this`로 추론한다.

## Director와 표현 분리

GoF 구조에서 Director는 어떤 부품을 언제 만들지 Builder에 알릴 뿐이고, 부품을 조립하고 자신이 만드는 표현을 관리하는 일은 Concrete Builder가 맡는다. 완성된 결과는 클라이언트가 Builder에서 꺼내거나, 조립이 끝난 뒤 Director가 Builder에서 받아 돌려준다. 그래서 같은 Director가 HTML 보고서와 PDF 보고서처럼 서로 다른 표현을 만들고, 반대로 입력 형식이 다른 Director가 같은 Builder를 재사용할 수 있다. 단계 순서가 단순하면 Director 없이 클라이언트가 Builder를 직접 호출해도 된다.

표현마다 결과가 크게 달라 공통 Product 상위 타입을 두지 않는 경우가 많다. TypeScript에서는 결과 타입을 Builder의 타입 매개변수로 두면 Director가 구체 Builder를 모른 채 그 Builder의 결과 타입을 그대로 돌려준다. 일부 표현에만 필요한 단계는 추상 메서드 대신 빈 기본 구현으로 두어 필요한 Builder만 재정의하게 한다.

```typescript
/** 표현마다 달라지는 조립 단계와 결과 조회를 정의한다. */
abstract class ReportFormatBuilder<Result> {
  /** 제목이 필요한 표현만 재정의한다. */
  addTitle(_title: string): void {}

  abstract addSection(body: string): void

  abstract getResult(): Result
}

class MarkdownBuilder extends ReportFormatBuilder<string> {
  private readonly blocks: string[] = []

  addTitle(title: string): void {
    this.blocks.push(`# ${title}`)
  }

  addSection(body: string): void {
    this.blocks.push(body)
  }

  getResult(): string {
    return this.blocks.join('\n\n')
  }
}

class WordCountBuilder extends ReportFormatBuilder<number> {
  private count = 0

  addSection(body: string): void {
    this.count += body.split(/\s+/).length
  }

  getResult(): number {
    return this.count
  }
}

/**
 * 정해진 순서로 Builder 단계를 호출하고 Builder가 조립한 결과를 돌려준다.
 * @param builder 결과 표현을 조립할 Builder
 * @param title 보고서 제목
 * @param sections 절 본문 목록
 * @returns Builder의 타입 매개변수로 정해지는 결과
 */
const buildReport = <Result>(
  builder: ReportFormatBuilder<Result>,
  title: string,
  sections: readonly string[],
): Result => {
  builder.addTitle(title)
  for (const section of sections) {
    builder.addSection(section)
  }
  return builder.getResult()
}

const sections = ['매출이 늘었다', '비용은 그대로다']
const markdown = buildReport(new MarkdownBuilder(), '월간 보고', sections) // string
const words = buildReport(new WordCountBuilder(), '월간 보고', sections) // number, 값은 4
```

`WordCountBuilder`는 문서를 만들지 않고 집계만 하지만 같은 Director에 그대로 끼울 수 있다. 단계 메서드가 문자열 조각을 반환하고 Director가 이어 붙이는 구현은 모든 표현이 같은 타입의 조각을 같은 방식으로 합칠 때만 성립한다. 조립 규칙이 Director로 옮겨 가므로 이런 집계용 Builder를 끼울 수 없다.

## Template Method, Strategy, Facade와 구분

- Template Method는 알고리즘 골격을 상위 클래스의 한 연산에 두고 하위 클래스가 일부 단계를 재정의하는 상속 구조다. 조립 순서를 추상 Builder의 메서드에 넣으면 이 구조가 되고, 순서가 클래스 계층에 고정된다.
- Builder는 순서를 별도 Director에 두고 교체 가능한 Builder 객체에 위임한다. 위임한다는 점은 Strategy와 같지만, Strategy는 알고리즘 전체를 바꾸고 Builder는 여러 단계 호출을 받아 결과를 누적한 뒤 마지막에 내놓는다.
- Director가 여러 단계 호출을 한 번의 호출로 감추는 점은 Facade와 닮았다. Facade는 서브시스템의 여러 인터페이스에 통합 진입점을 주는 구조 패턴이고, Director는 교체 가능한 Builder에 대한 생성 순서를 담는다.

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
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인패턴: 20. Builder (1/2)](https://www.youtube.com/watch?v=OhPgqGDZnf4)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인패턴: 20. Builder (2/2)](https://www.youtube.com/watch?v=6eQtLxeGkDg)
- [Effective Java 2판 Item 2: Consider a builder when faced with many constructor parameters — InformIT, Joshua Bloch](https://web.archive.org/web/2016id_/http://www.informit.com/articles/article.aspx?p=1216151&seqNum=2)
- [TypeScript 공식 문서, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript 공식 문서, strictNullChecks](https://www.typescriptlang.org/tsconfig/strictNullChecks.html)
- [MDN, Falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy)

## 관련 문서

- [[Factory패턴이란|Factory와 Factory Method]]
- [[AbstractFactory패턴이란|Abstract Factory 패턴]]
- [[TemplateMethod패턴이란|Template Method 패턴]]
- [[Defensive-Copy-Immutable-Practice|방어적 복사와 불변 객체]]
