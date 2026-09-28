---
tags: [cs, typescript, class, type-system]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript Class", "TS 클래스 타입 시스템"]
verified_at: 2026-09-27
---

# TypeScript 클래스 타입 시스템

TypeScript 클래스는 JavaScript 런타임 값인 생성자와 인스턴스 타입을 함께 선언한다. 타입 문맥에서 클래스 이름은 인스턴스 쪽을 가리키고, 생성자와 static 쪽 타입은 `typeof`로 얻는다.

```typescript
class Point {
  static origin = new Point(0, 0);

  constructor(public x: number, public y: number) {}
}

const point: Point = new Point(1, 2);
const PointConstructor: typeof Point = Point;
```

## 구조적 호환성과 예외

인스턴스의 public 멤버는 일반 객체처럼 구조적으로 비교한다. 이름이 다른 클래스라도 필요한 public 구조가 같으면 호환될 수 있다. static 멤버와 생성자 시그니처는 인스턴스 타입 비교에 포함되지 않는다.

`private`, `protected` 멤버나 JavaScript `#` 비공개 멤버(필드, 메서드, 접근자)가 있으면 호환성 규칙이 더 엄격하다. 대상의 비공개 멤버와 같은 클래스 선언에서 유래한 멤버가 소스에도 있어야 한다. 이를 의도적인 명목 타입 경계로 활용할 수 있지만 호환성 검사 자체는 런타임에 남지 않는다. `#` 멤버만 그 멤버가 없는 객체에 접근할 때 TypeError가 나고, 클래스 본문에서 `#name in obj`로 확인할 수 있다.

## 접근 제어자의 실행 시점

| 문법 | 보호 시점 | 특징 |
|---|---|---|
| `private`, `protected` | TypeScript 타입 검사 | 일반적인 emit 뒤에는 JavaScript 런타임의 강제 경계가 아니고, 타입 검사 중에도 `obj['name']` 대괄호 접근을 허용함(soft private, TypeScript 7.0 기준 `protected`도 같음) |
| JavaScript `#field` | 런타임 | 클래스 외부 접근이 실제로 실패함 |
| `readonly` | TypeScript 타입 검사 | 초기화 뒤 대입을 막지만 객체 자체를 freeze하지 않음 |

보안 또는 캡슐화가 런타임에도 반드시 유지되어야 한다면 `#private` 필드를 사용한다.

## `implements`의 역할

`implements`는 클래스 인스턴스가 인터페이스 계약을 만족하는지 검사한다. 멤버를 자동 생성하거나 메서드의 추론 타입을 바꾸지 않으며 런타임에도 남지 않는다.

```typescript
interface Clock {
  tick(now: Date): void;
}

class SystemClock implements Clock {
  tick(now: Date): void {
    console.log(now.toISOString());
  }
}
```

생성자 자체의 계약이 필요하면 `new (...args) => Instance` 형태의 별도 constructor interface를 사용한다.

## 추상 클래스

`abstract` 메서드와 필드는 구현 없이 선언만 하는 멤버이고 추상 클래스 안에만 둘 수 있다. 추상 클래스는 `new`로 직접 생성할 수 없다. 상속한 추상 멤버를 모두 구현하지 않은 파생 클래스는 자신도 `abstract`로 선언해야 하므로, 공통 필드만 채운 중간 기반 클래스는 추상으로 남기고 구현 누락은 최종 구체 클래스에서 컴파일 오류로 잡을 수 있다. 추상 클래스가 interface를 `implements`해도 멤버를 생략할 수는 없고(TypeScript 7.0에서 생략하면 TS2420), 직접 구현하지 않을 멤버는 `abstract`로 선언한다. Java 추상 클래스는 인터페이스 메서드 선언을 생략하고 구현을 구체 하위 클래스에 맡길 수 있으므로 Java 코드를 옮길 때 주의한다.

```typescript
abstract class Item {
  abstract getLineCount(): number;
  abstract getLine(index: number): string;

  /** 추상 멤버로 얻은 줄을 순서대로 이어 붙인다. */
  render(): string {
    return Array.from({ length: this.getLineCount() }, (_, index) => this.getLine(index)).join("\n");
  }
}

// 추상 멤버를 구현하지 않았으므로 abstract로 선언해야 한다.
abstract class ItemDecorator extends Item {
  protected readonly inner: Item;

  constructor(inner: Item) {
    super();
    this.inner = inner;
  }
}

class QuotedItem extends ItemDecorator {
  getLineCount(): number {
    return this.inner.getLineCount();
  }

  getLine(index: number): string {
    return `"${this.inner.getLine(index)}"`;
  }
}
```

interface와 달리 추상 클래스는 구현이 있는 메서드를 함께 가질 수 있어, 위의 `render()`처럼 추상 멤버를 호출하는 공통 알고리즘을 기반 클래스에 둘 수 있다([[TemplateMethod패턴이란|Template Method]]). `typeof Item`은 `new`로 호출할 수 없는 추상 생성자 타입이므로, 파생 클래스 생성자를 받아 인스턴스를 만드는 매개변수는 앞의 constructor 계약처럼 `new (inner: Item) => Item`으로 선언하고 파생 클래스 생성자의 매개변수까지 맞춘다. `new () => Item`에는 `inner`가 필요한 `QuotedItem`을 넘길 수 없다.

추상 멤버와 생성 금지는 타입 검사 단계의 규칙이다. emit 결과에는 `abstract` 키워드와 추상 멤버 선언이 남지 않고 일반 JavaScript 클래스만 남으므로, 타입 단언 등으로 검사를 우회하면 런타임 생성은 막히지 않는다. 반대로 클래스 값은 런타임에 남으므로 NestJS에서 추상 클래스를 주입 토큰으로 쓸 수 있다([[Clean-Architecture-NestJS-Layers|NestJS 레이어 매핑]]).

## 초기화와 parameter property

생성자 매개변수 앞에 `public`, `private`, `protected`, `readonly`를 붙이면 같은 이름의 필드 선언과 할당을 함께 만든다. 간결하지만 외부에 공개되는 API가 매개변수 목록에 숨지 않도록 의미가 분명한 경우에만 쓴다.

parameter property는 타입만 지워서는 유효한 JavaScript가 되지 않는 TypeScript 전용 런타임 문법이다. Node의 type stripping 같은 실행 환경을 목표로 하거나 `erasableSyntaxOnly`를 켜면 일반 필드 선언과 생성자 할당을 사용한다.

`strictPropertyInitialization`은 인스턴스 필드가 선언부 또는 생성자에서 초기화되는지 검사한다. 확정 할당 단언 `!`은 초기화하지 않고 검사만 생략하므로 외부 수명 주기로 초기화를 증명할 때만 사용한다.

## 관련 문서

- [[TypeScript-Type-Compatibility|타입 호환성]]
- [[TS-Type-vs-Interface|type과 interface]]
- [[TS-Type-Assertions|타입 단언]]

## 출처

- [TypeScript Handbook, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript Handbook, Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [MDN, Private elements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements)
- [TypeScript 4.5, Private Field Presence Checks — TypeScript 공식 문서](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#private-field-presence-checks)
- [TypeScript TSConfig, erasableSyntaxOnly](https://www.typescriptlang.org/tsconfig/erasableSyntaxOnly.html)
- [Java Language Specification SE 26, 8.1.5 Superinterfaces](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.1.5)
- [NestJS, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- yongsoocho, [class 기초](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138413)
- [타입스크립트의 클래스, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157525)
- [접근 제어자, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157526)
- [인터페이스와 클래스, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157527)
- [TypeScript로 보는 GoF의 디자인 패턴: 8. Decorator, GIS DEVELOPER](https://www.youtube.com/watch?v=nND1rvT-PtQ)
