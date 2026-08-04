---
tags: [cs, typescript, class, type-system]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript Class", "TS 클래스 타입 시스템"]
verified_at: 2026-08-04
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

`private` 또는 `protected` 멤버가 있으면 호환성 규칙이 더 엄격하다. 대상의 비공개 멤버와 같은 클래스 선언에서 유래한 멤버가 소스에도 있어야 한다. 이를 의도적인 명목 타입 경계로 활용할 수 있지만, 런타임 검증을 제공하는 것은 아니다.

## 접근 제어자의 실행 시점

| 문법 | 보호 시점 | 특징 |
|---|---|---|
| `private`, `protected` | TypeScript 타입 검사 | 일반적인 emit 뒤에는 JavaScript 런타임의 강제 경계가 아님 |
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
- [TypeScript TSConfig, erasableSyntaxOnly](https://www.typescriptlang.org/tsconfig/erasableSyntaxOnly.html)
- yongsoocho, [class 기초](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138413)
- [타입스크립트의 클래스, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157525)
- [접근 제어자, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157526)
- [인터페이스와 클래스, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157527)
