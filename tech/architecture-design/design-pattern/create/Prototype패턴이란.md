---
tags: [architecture, design-pattern, creational, prototype]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Prototype Pattern", "프로토타입 패턴"]
---

# Prototype 패턴이란?

GoF Prototype은 원형 객체에게 자신의 복제본 생성을 위임하는 생성 패턴이다. 클라이언트는 구체 클래스를 몰라도 복제 계약을 통해 새 객체를 만들 수 있다.

```typescript
interface Prototype<T> {
  clone(): T
}

class Campaign implements Prototype<Campaign> {
  constructor(
    readonly name: string,
    readonly rules: readonly Rule[],
  ) {}

  clone(): Campaign {
    return new Campaign(this.name, this.rules.map((rule) => rule.clone()))
  }
}
```

## 복제 의미를 계약으로 정한다

- 얕은 복사는 중첩 객체 참조를 공유한다.
- 깊은 복사는 필요한 객체 그래프를 새로 만들지만 비용과 식별성 문제가 생긴다.
- DB Entity, 열린 연결, 스트림과 Lock처럼 복제하면 안 되는 자원도 있다.
- 복제 후 ID, 생성 시각과 도메인 이벤트를 유지할지 새로 만들지 정한다.

복제가 생성자보다 싸다고 가정하지 않는다. 실제 비용과 객체 의미를 측정한다. 복잡한 도메인 객체는 범용 복사보다 명시적인 `clone()`이나 새 객체 생성 Factory가 안전하다.

## 조합한 구조도 원형이 된다

Composite로 조립한 객체도 원형이 될 수 있다. 선 네 개를 담은 그룹을 한 번 조립해 두고 복제하면 사각형 전용 클래스 없이 같은 구조의 도형을 계속 만든다. 새 종류의 객체를 서브클래스 대신 값과 구조의 조합으로 정의할 수 있다는 점이 Prototype의 효과이고, Composite와 Decorator를 많이 쓰는 설계가 Prototype의 도움을 받기 쉬운 이유다.

- 복합 객체의 `clone()`이 자식까지 깊게 복제해야 원형으로 쓸 수 있다. 자식 참조만 복사하면 복제본을 옮길 때 원본의 자식도 함께 움직인다.
- 자식 복제를 생성자나 `add()`에 두면 일반 조립에서도 매번 깊은 복사가 일어나고, 호출자가 넘긴 객체를 나중에 바꿔도 그룹에 반영되지 않는다. 조립할 때 참조를 공유해야 하면 복제는 `clone()` 안에서만 한다.
- 자식이 부모를 참조하는 트리는 `clone()`을 자식 방향으로만 재귀하고 부모 참조는 복제본의 `add()`에서 새 부모로 다시 연결하면 `Map` 없이도 끝난다. `clone()`이 부모 참조까지 따라가며 복제하면 순환을 따라 재귀가 반복되다 호출 스택이 넘쳐 실패한다(V8 기반인 Node.js와 Chrome에서는 `RangeError`, Firefox에서는 `InternalError`). 임의의 순환이나 공유 참조가 있는 그래프는 이미 복제한 객체를 `Map`에 기록해 재사용한다.

## TypeScript에서 clone 반환 타입

TypeScript 클래스의 `this` 타입은 현재 클래스의 타입을 동적으로 가리킨다. 수신 객체 자신을 돌려주는 체이닝 메서드에는 맞지만, 새 인스턴스를 만드는 복제 메서드의 반환 타입으로 쓰면 구현이 막힌다. `clone(): this`를 선언하고 `new Point(...)`를 반환하면 `this`가 `Point`의 하위 클래스로 인스턴스화될 수 있어 컴파일 오류가 난다. `as this` 단언으로 오류를 없애면 복제 메서드를 재정의하지 않은 하위 클래스에서 타입과 실제 값이 어긋난다.

```typescript
class Point {
  constructor(readonly x: number, readonly y: number) {}

  clone(): this {
    // new Point()는 this에 할당할 수 없어 단언이 필요하다
    return new Point(this.x, this.y) as this
  }
}

class LabeledPoint extends Point {
  constructor(x: number, y: number, readonly label: string) {
    super(x, y)
  }
}

const copied = new LabeledPoint(1, 2, 'A').clone()
console.log(copied.label) // undefined, 타입은 LabeledPoint지만 실제 값은 Point다
```

첫 예시처럼 `Prototype<T>`의 `clone(): T`에 구체 타입을 넘기고 하위 클래스마다 `clone()`을 재정의한다. 재정의를 빠뜨리면 반환 타입이 상위 클래스로 남아 하위 클래스에만 있는 멤버 접근은 컴파일 단계에서 걸리지만, 상위 클래스 멤버만 쓰는 코드는 상위 클래스 복제본을 받고도 컴파일된다. 하위 클래스에 `implements Prototype<하위 클래스>`를 선언하면 상위 클래스 타입이 하위 클래스 타입에 할당되지 않을 때, 예를 들어 필수 멤버를 더했거나 프로퍼티 타입이나 메서드 반환 타입을 좁혔거나 재정의한 메서드의 매개변수 수를 줄였을 때 재정의 누락이 컴파일 오류가 된다. TypeScript는 클래스를 구조적으로 비교하고 메서드 매개변수는 양방향으로 비교하므로 선택 멤버만 더했거나 메서드를 같은 시그니처로 재정의하거나 메서드 매개변수 타입만 바꾼 하위 클래스는 이 선언으로도 잡히지 않는다. 모든 구체 원형이 복제 연산을 직접 구현해야 한다는 부담은 GoF가 꼽은 Prototype의 주된 비용이고, `this` 반환 타입과 단언은 이 부담을 없애지 못하고 가릴 뿐이다.

## JavaScript 프로토타입과 구분

JavaScript의 prototype chain은 객체가 다른 객체에 프로퍼티 탐색을 위임하는 언어 메커니즘이다. 객체를 복제해 생성하는 GoF Prototype과 이름은 같지만 같은 개념이 아니다.

`structuredClone()`은 HTML 표준의 구조화 복제 알고리즘을 사용하며 지원되는 값의 그래프를 복제한다. 모든 클래스의 도메인 의미, 메서드와 자원까지 보존하는 범용 `clone()`은 아니다. 전개 구문 `{ ...value }`는 한 단계의 enumerable own property만 복사한다.

## 출처

- 얄팍한 코딩사전, [Prototype 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=245402)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 18. Prototype](https://www.youtube.com/watch?v=tLf6Yh_y3LM)
- [WHATWG HTML 표준, Structured cloning](https://html.spec.whatwg.org/multipage/structured-data.html#structured-cloning)
- [TypeScript 공식 문서, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript 공식 문서, strictFunctionTypes](https://www.typescriptlang.org/tsconfig/strictFunctionTypes.html)
- [MDN, InternalError: too much recursion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion)

## 관련 문서

- [[Prototype-Mechanism|JavaScript 프로토타입 동작 원리]]
- [[JS-Value-vs-Reference|원시 값과 참조 값]]
- [[Memento패턴이란|Memento 패턴]]
- [[Composite패턴이란|Composite 패턴]]
