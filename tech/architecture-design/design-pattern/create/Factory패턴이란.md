---
tags: [architecture, design-pattern, creational, factory-method]
status: done
verified_at: 2026-08-04
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
- [NestJS 공식 문서, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)

## 관련 문서

- [[AbstractFactory패턴이란|Abstract Factory 패턴]]
- [[Builder패턴이란|Builder 패턴]]
- [[TemplateMethod패턴이란|Template Method 패턴]]
