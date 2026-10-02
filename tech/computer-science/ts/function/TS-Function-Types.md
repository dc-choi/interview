---
tags: [cs, typescript, function, type-system]
status: done
category: "CS - TypeScript"
aliases: ["TS Function Types", "함수 타입 표현식", "호출 시그니처", "하이브리드 타입"]
verified_at: 2026-10-01
---

# 함수 타입 정의

함수 타입은 매개변수 타입과 반환 타입으로 설명한다. 반환 타입은 `return` 문으로 추론되므로 생략할 수 있지만, 공개 함수는 구현이 계약을 바꾸지 않도록 명시하는 편이 안전하다.

```typescript
function add(a: number, b: number): number {
  return a + b;
}
const sub = (a: number, b: number): number => a - b;
```

## 매개변수 규칙

- 기본값 매개변수는 기본값의 타입으로 추론된다. `function introduce(name = "kim")`의 `name`은 `string`이라 다른 타입의 인수나 기본값과 맞지 않는 타입 주석은 오류다.
- 선택적 매개변수 `tall?: number`는 `number | undefined`로 추론되므로 바로 연산하면 오류다. `typeof tall === "number"`로 좁힌 뒤 쓴다.
- 선택적 매개변수는 필수 매개변수 뒤에만 둘 수 있다. 앞에 두면 TS1016(A required parameter cannot follow an optional parameter)이다.
- rest 매개변수 `...rest: number[]`는 가변 개수 인수를 배열로 받는다. 개수를 고정하려면 `...rest: [number, number, number]`처럼 튜플로 선언한다.

같은 타입의 인수가 여러 개라 순서를 바꾸어도 컴파일되는 API는 객체 입력을 고려한다. `createRange(start: number, end: number)`보다 `createRange({ start, end })`는 이름이 호출부에 남는다. 타입만으로 순서 실수와 값의 범위를 모두 막을 수는 없으므로 `start <= end` 같은 도메인 조건은 별도 검증한다.

## 콜백의 `this` 계약

일반 함수의 `this`는 호출 방식에 따라 정해진다. TypeScript의 첫 `this` 매개변수는 이를 검사하는 타입 문법이며 실제 인수와 emit 결과에는 포함되지 않는다.

```typescript
function show(this: { name: string }): string {
  return this.name;
}
const user = { name: "Lee", show };
user.show();
```

메서드를 `const callback = user.show`로 떼어 넘기면 원래 객체가 자동으로 보존되지 않는다. 콜백이 원래 인스턴스를 읽어야 한다면 `bind`나 lexical `this`를 가진 arrow를 사용하고, 콜백 계약이 객체 자신의 `this`를 제공한다면 일반 함수를 쓴다. arrow로 바꾸는 것만으로 모든 `this` 문제가 해결되지는 않는다([[JavaScript-Class-Semantics|클래스의 arrow field]]).

## 함수 타입 표현식과 호출 시그니처

같은 모양의 함수가 여러 개면 함수 타입 표현식(Function Type Expression)으로 타입을 한 번만 정의해 매개변수와 반환 타입의 중복을 없앤다. 화살표 함수와 비슷한 문법이고 매개변수 이름은 생략할 수 없다.

```typescript
type Operation = (a: number, b: number) => number;

const add: Operation = (a, b) => a + b;
const divide: Operation = (a, b) => a / b;
```

매개변수를 적게 받는 함수는 대입할 수 있지만 더 많이 요구하는 함수는 오류다([[TypeScript-Type-Compatibility|함수 타입 호환성]]). 이 형태를 호출 시그니처라고 부르는 자료도 있지만 공식 명칭은 함수 타입 표현식이다.

호출 시그니처(Call Signature)는 객체 타입 안에 호출 형태를 적는다. 함수도 객체이므로 중괄호를 쓰고, 반환 타입 앞에 `=>` 대신 `:`를 쓴다. 호출 형태가 하나면 함수 타입 표현식과 서로 대입할 수 있다.

```typescript
type Operation2 = { (a: number, b: number): number };
```

## 하이브리드 타입

호출 시그니처 옆에 속성을 함께 선언하면 함수처럼 호출하면서 객체처럼 속성에 접근하는 값을 표현한다. 값은 함수를 만든 뒤 같은 스코프에서 속성을 대입하거나 `Object.assign`으로 합친다. TypeScript 3.1부터 함수 선언과 `const`로 선언한 함수에 대입한 속성을 그 함수의 속성으로 인식한다.

```typescript
type Counter = { (): number; count: number };

const createCounter = (): Counter => {
  const counter = () => ++counter.count;
  counter.count = 0;
  return counter;
};

const fixed: Counter = Object.assign(() => 1, { count: 0 });
```

## 이벤트 이름과 인수 연결

이벤트별 인수 튜플을 정의하면 이벤트 이름과 listener, emit 인수의 관계를 공개 API에서 표현할 수 있다.

```typescript
type Events = { saved: [id: string]; failed: [error: Error] };
type EventCall = { [K in keyof Events]: [event: K, ...args: Events[K]] }[keyof Events];

declare function emit(...call: EventCall): void;
emit("saved", "item-1");
emit("failed", new Error("storage unavailable"));
// emit("saved", new Error())는 인수 조합 오류
```

호출 전체를 튜플 유니온으로 만들면 이름과 값의 잘못된 조합을 막을 수 있다. listener API는 `on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void)`처럼 관계를 연결한다. 타입은 실행 시 listener 저장, 해제와 예외 정책을 구현하지 않는다. 기존 emitter가 있으면 먼저 그 선언 계약을 확인하고, 이 타입 예제 때문에 새 emitter 구현을 만들지 않는다.

## 선택 기준

- 호출 형태가 하나면 함수 타입 표현식이 간결하다.
- 여러 호출 형태(오버로드)나 속성을 함께 가진 함수 값에는 호출 시그니처가 필요하다([[TS-Function-Overloading|함수 오버로딩]]).
- `new`로 호출하는 대상은 호출 시그니처 앞에 `new`를 붙인 construct signature로 표현한다([[TS-Class-Type-System|클래스 타입 시스템]]).

## 출처

- [TypeScript Deep Dive, Functions — Basarat](https://basarat.gitbook.io/typescript/type-system/functions)
- [TypeScript Deep Dive, Arrow Functions — Basarat](https://basarat.gitbook.io/typescript/future-javascript/arrow-functions)
- [TypeScript Deep Dive, Typesafe Event Emitter — Basarat](https://basarat.gitbook.io/typescript/main-1/typed-event)
- [TypeScript Handbook, More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [TypeScript Handbook, Type Compatibility, Comparing two functions](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#comparing-two-functions)
- [TypeScript 3.1, Properties declarations on functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-1.html#properties-declarations-on-functions)
- [인프런, 이정환 Winterlood, 함수 타입](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=156765)
- [인프런, 이정환 Winterlood, 함수 타입 표현식과 호출 시그니쳐](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=156766)

## 관련 문서

- [[TS-Function-Overloading|함수 오버로딩]]
- [[TypeScript-Type-Compatibility|타입 호환성 (함수 타입의 변성)]]
- [[TS-Declaration-Spaces-and-Inference|타입 공간과 추론 (문맥적 타입)]]
