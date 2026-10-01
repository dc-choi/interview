---
tags: [cs, typescript, class, type-system]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript Class", "TS 클래스 타입 시스템"]
verified_at: 2026-10-01
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

보안 또는 캡슐화가 런타임에도 반드시 유지되어야 한다면 `#private` 필드를 사용한다. 접근 제어자별 외부와 서브클래스 접근 범위는 [[JS-Access-Modifiers|JS, TS 접근 제어자]]에 정리했다.

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

interface 멤버는 공개 계약이라 클래스가 같은 멤버를 `private`이나 `protected`로 구현하면 TS2420으로 거부된다(위 예에서 `tick`을 `private`으로 선언하면 Property 'tick' is private in type 'SystemClock' but not in type 'Clock'이라는 사유가 붙는다). 내부 상태는 interface에 넣지 않고 클래스에만 선언한다. 구현이 하나뿐이고 교체 계획이 없으면 interface를 먼저 둘 필요가 없고, 여러 구현이 같은 계약을 따라야 하는 라이브러리나 교체할 어댑터 경계에서 쓸모가 크다.

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

생성자 매개변수 앞에 `public`, `private`, `protected`, `readonly`를 붙이면 같은 이름의 필드 선언과 할당을 함께 만든다. 간결하지만 외부에 공개되는 API가 매개변수 목록에 숨지 않도록 의미가 분명한 경우에만 쓴다. 필드 선언이 이미 생기므로 같은 이름 필드를 클래스 본문에 다시 선언하면 TS2300(Duplicate identifier)이 난다.

parameter property는 타입만 지워서는 유효한 JavaScript가 되지 않는 TypeScript 전용 런타임 문법이다. Node의 type stripping 같은 실행 환경을 목표로 하거나 `erasableSyntaxOnly`를 켜면 일반 필드 선언과 생성자 할당을 사용한다.

`strictPropertyInitialization`은 인스턴스 필드가 선언부 또는 생성자에서 초기화되는지 검사한다. 확정 할당 단언 `!`은 초기화하지 않고 검사만 생략하므로 외부 수명 주기로 초기화를 증명할 때만 사용한다.

## 생성자 함수로 클래스를 대신할 때

JavaScript 클래스는 prototype 위에 정의된 문법이라 interface와 생성자 함수만으로도 비슷한 런타임 구조를 만들 수 있다. TypeScript에서는 이 방식의 검사가 클래스보다 약하다(5.9.3, 6.0.3, 7.0.2에서 확인).

- `this`: 함수 본문의 `this`는 `noImplicitThis`(strict 묶음)에서 TS2683 오류가 난다. 이 옵션을 끄면 프로젝트의 모든 함수에서 `this`가 암묵적 `any`가 되므로 끄지 않고 `this` 매개변수로 타입을 준다.
- 생성: 함수 선언에는 construct signature가 없어 `new PersonFn("kim")`이 TS7009로 실패한다. 이 오류는 `noImplicitAny`에서 나므로 `noImplicitThis`를 꺼도 남는다.
- 우회 비용: 이중 단언으로 생성자 타입을 붙여야 하고, 이 단언은 생성자와 prototype 구현이 interface를 만족하는지 검증하지 않는다. `greet`을 prototype에 넣지 않아도 컴파일된다.

```typescript
interface Person {
  name: string;
  greet(): string;
}

function PersonFn(this: Person, name: string) {
  this.name = name;
}
PersonFn.prototype.greet = function (this: Person) {
  return `hi ${this.name}`;
};
const PersonCtor = PersonFn as unknown as new (name: string) => Person;

// 반환 타입이 계약을 검사하므로 greet을 빠뜨리면 오류가 난다.
const createPerson = (name: string): Person => ({
  name,
  greet() {
    return `hi ${this.name}`;
  },
});
```

클래스를 피하는 것이 목적이면 생성자 함수보다 객체를 반환하는 factory 함수가 맞다. 반환 타입을 interface로 명시해 구현 누락을 잡고, 비공개 상태는 클로저에 둔다. `instanceof`, 상속, decorator가 필요하거나 많은 인스턴스가 prototype 메서드를 공유해야 하면 class를 유지한다. prototype 공유와 인스턴스별 함수의 메모리, identity 차이는 [[JavaScript-Class-Semantics|JavaScript 클래스 의미론]]의 arrow field 설명과 같은 판단이다. React의 함수형 컴포넌트 전환 같은 클래스 지양 흐름은 컴포넌트 모델의 변화이지 생성자 함수 패턴을 권하는 것이 아니다.

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
- [TypeScript TSConfig, noImplicitThis](https://www.typescriptlang.org/tsconfig/noImplicitThis.html)
- [TypeScript Handbook, More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [Java Language Specification SE 26, 8.1.5 Superinterfaces](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.1.5)
- [NestJS, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- yongsoocho, [class 기초](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138413)
- [클래스 => 인터페이스 + 함수 ??, yongsoocho](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=162054)
- [타입스크립트의 클래스, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157525)
- [접근 제어자, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157526)
- [인터페이스와 클래스, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157527)
- [TypeScript로 보는 GoF의 디자인 패턴: 8. Decorator, GIS DEVELOPER](https://www.youtube.com/watch?v=nND1rvT-PtQ)
