---
tags: [architecture, design-pattern, creational, factory-method]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Factory Method Pattern", "팩토리 메서드 패턴", "Factory Pattern"]
---

# Factory와 Factory Method

Factory는 객체 생성의 선택과 조립을 사용 코드에서 분리하는 넓은 용어다. GoF Factory Method는 상위 Creator가 생성 메서드를 정의하고 하위 Creator가 어떤 Product를 만들지 재정의하게 하는 생성 패턴이다.

## Factory Method

```typescript
interface Report {
  render(): string
}

abstract class ReportExporter {
  export(): Buffer {
    const report = this.createReport()
    return Buffer.from(report.render())
  }

  protected abstract createReport(): Report
}

class CsvReportExporter extends ReportExporter {
  protected createReport(): Report {
    return new CsvReport()
  }
}
```

`export()`라는 안정된 생성 이후 흐름은 상위 Creator에 있고 Product 선택은 하위 Creator의 Factory Method가 담당한다. Template Method와 함께 나타날 수 있다.

상위 Creator와 사용 코드는 `Report` 인터페이스에만 의존하고, 어떤 구체 Product를 만들지는 하위 Creator만 안다. 그래서 상위 Creator와 Product 인터페이스를 구체 구현을 import하지 않는 모듈이나 패키지로 둘 수 있고, 새 Product는 기존 하위 Creator를 고치지 않고 새 하위 Creator를 추가해 확장한다. 대신 Product 하나를 바꾸기 위해서만 Creator 하위 클래스를 만들어야 할 수 있고, 그만큼 클래스와 변경 지점이 늘어난다.

### 매개변수화된 Factory Method

GoF가 소개한 변형으로, Factory Method가 제품 종류를 식별하는 인자를 받아 여러 구체 Product 중 하나를 만든다. 만들어진 객체는 모두 같은 Product 인터페이스를 따르고, 하위 Creator는 이 메서드를 재정의해 새 식별자를 추가하거나 기존 식별자에 다른 Product를 연결한다. 식별자로 분기한다는 점은 단순 팩토리와 같지만 재정의할 수 있는 Creator의 메서드라는 점이 다르다.

TypeScript에서 식별자를 문자열 리터럴 유니온으로 좁힌다면 그 유니온을 상위 Creator에 고정하지 않는다. 상위 Creator가 `'csv' | 'tsv'` 같은 구체 식별자 집합을 알면 다른 식별자를 쓰는 하위 Creator를 추가할 때마다 상위 타입을 고쳐야 한다. 식별자 타입은 제네릭 매개변수로 두고 하위 Creator가 자기 유니온을 지정한다.

```typescript
abstract class ReportExporter<TFormat extends string> {
  export(format: TFormat): Buffer {
    const report = this.createReport(format)
    return Buffer.from(report.render())
  }

  protected abstract createReport(format: TFormat): Report
}

const TABULAR_FORMATS = ['csv', 'tsv'] as const
type TabularFormat = (typeof TABULAR_FORMATS)[number]

class TabularReportExporter extends ReportExporter<TabularFormat> {
  protected createReport(format: TabularFormat): Report {
    switch (format) {
      case 'csv':
        return new CsvReport()
      case 'tsv':
        return new TsvReport()
      default: {
        const unsupported: never = format
        throw new Error(`지원하지 않는 형식: ${unsupported}`)
      }
    }
  }
}

/**
 * 쿼리스트링처럼 타입 검사를 거치지 않은 문자열을 표 형식 식별자로 좁힌다.
 * @param value 외부에서 받은 형식 문자열
 * @returns 지원하는 표 형식이면 true
 */
const isTabularFormat = (value: string): value is TabularFormat => {
  return TABULAR_FORMATS.some((format) => format === value)
}
```

`default`에서 `never`에 대입해 두면 `TABULAR_FORMATS`에 형식을 추가하고 `case`를 빠뜨렸을 때 컴파일 오류가 난다. 리터럴 유니온은 컴파일 시점 검사일 뿐 런타임 값을 제한하지 않으므로, 쿼리스트링처럼 `string`으로 들어온 값은 `as`로 단언하지 않고 `isTabularFormat`으로 좁힌 뒤 `export()`에 넘긴다. 단언으로 들어온 예상 밖의 값은 `default`의 예외가 막는다. 타입 소거와 단언의 한계는 [[TS-Type-Narrowing-Builtin-Guards|타입 소거와 빌트인 가드]]와 [[TS-Type-Assertions|타입 단언과 satisfies]]에서 다룬다.

이 구조에서는 구체 Creator가 유니온을 정하는 순간 `export()`의 매개변수도 고정된다. `TabularReportExporter`를 상속해 `createReport()`가 `'xlsx'`까지 받도록 재정의해도 `export('xlsx')`는 컴파일 오류다. 기존 구체 Creator를 상속해 식별자를 더하고 나머지는 상위 구현에 맡기려면 `TabularReportExporter<TExtra extends string = never> extends ReportExporter<TabularFormat | TExtra>`처럼 식별자 타입을 열어 두어야 하고, 그 대가로 `default`의 `never` 누락 검사를 쓸 수 없다.

## 자주 혼용되는 세 가지

### 단순 팩토리

```typescript
function createParser(format: 'json' | 'csv'): Parser {
  return format === 'json' ? new JsonParser() : new CsvParser()
}
```

조건에 따라 Product 하나를 반환하는 함수다. 유용한 관용구지만 GoF가 별도로 정의한 Factory Method 구조와는 다르다.

### Factory Method

Creator 계층의 생성 Hook을 재정의한다. 상속이 핵심 구조이므로 변화 축이 단순하다면 함수 팩토리가 더 가볍다.

### Abstract Factory

서로 호환되는 여러 Product의 제품군을 만드는 계약이다. [[AbstractFactory패턴이란|Abstract Factory]]에서 다룬다.

## NestJS에서의 선택

Custom Provider의 `useFactory`는 비동기 설정과 의존성 조립에 유용한 팩토리 함수다. 이름은 Factory지만 자동으로 GoF Factory Method가 되는 것은 아니다. 생성 분기, Product 수명과 오류 처리를 구성 루트에 모을 가치가 있는지 판단한다.

## 출처

- 얄팍한 코딩사전, [Factory Method 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=242785)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 12. Factory Method](https://www.youtube.com/watch?v=FarAPVTAgQA)
- [NestJS 공식 문서, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [TypeScript 공식 문서, Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript 공식 문서, Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript 공식 문서, The Basics](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)

## 관련 문서

- [[AbstractFactory패턴이란|Abstract Factory 패턴]]
- [[Builder패턴이란|Builder 패턴]]
- [[TemplateMethod패턴이란|Template Method 패턴]]
