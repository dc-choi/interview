---
tags: [cs, typescript, generics, type-system]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript Generics", "TS 제네릭"]
verified_at: 2026-08-04
---

# TypeScript 제네릭

제네릭은 호출 시점까지 구체 타입을 미루면서 입력과 출력, 여러 멤버 사이의 타입 관계를 보존한다. `any`처럼 정보를 버리지 않고 재사용 가능한 계약을 만든다.

```typescript
function first<T>(values: readonly T[]): T | undefined {
  return values[0];
}

const value = first([1, 2, 3]); // number | undefined
```

타입 매개변수는 두 위치 이상의 관계를 표현할 때 가장 유용하다. 시그니처에서 한 번만 등장하고 결과와 연결되지 않는 타입 매개변수라면 구체 타입이나 `unknown`이 더 정확한지 검토한다.

## 추론과 명시적 타입 인수

컴파일러는 함수 인수에서 `T`를 추론하므로 보통 `first<number>(...)`처럼 직접 적지 않는다. 추론할 정보가 없거나 의도한 유니온보다 지나치게 좁게 추론될 때만 명시한다.

제네릭 본문에서는 아직 정해지지 않은 `T`의 속성을 임의로 사용할 수 없다. 필요한 능력을 constraint로 선언한다.

```typescript
function get<T, K extends keyof T>(object: T, key: K): T[K] {
  return object[key];
}

const user = { id: 1, name: "Lee" };
const name = get(user, "name"); // string
```

`K extends keyof T`는 key가 실제 속성 이름이어야 한다는 관계를 만들고 `T[K]`는 그 속성의 값 타입을 보존한다.

## 타입 매개변수를 둘 위치

호출할 때마다 타입이 달라지면 call signature에 둔다.

```typescript
interface Mapper {
  <T, U>(value: T, map: (value: T) => U): U;
}
```

인스턴스 전체가 하나의 타입을 공유하면 interface, type alias, class에 둔다.

```typescript
interface Store<T> {
  get(): T;
  set(value: T): void;
}
```

## `Promise<T>`가 표현하는 것

`Promise<T>`의 `T`는 fulfilled 상태에서 얻는 값의 타입이다. `Promise<void>`는 완료 신호만 필요하다는 뜻이고, `Promise<never>`는 정상 완료하지 않는 비동기 계약을 표현할 수 있다.

```typescript
async function loadUser(id: number): Promise<User> {
  return fetchUser(id);
}
```

표준 `Promise<T>`는 reject reason의 타입을 별도 매개변수로 표현하지 않는다. 실패 형태가 업무 계약의 일부라면 discriminated union 결과나 별도 error model을 사용한다.

## 주의할 점

- 타입 매개변수는 emit에서 지워지므로 런타임에 `T` 자체를 검사할 수 없다.
- `T extends object`는 필요한 속성을 알려 주지 않는다. 실제로 쓰는 최소 구조를 constraint로 표현한다.
- 기본값 `T = SomeType`은 추론할 수 없을 때의 기본이지 constraint가 아니다.
- 무관한 타입 매개변수를 늘리면 호출자는 더 복잡한 시그니처만 보게 된다.

## 관련 문서

- [[TypeScript-Type-Level-Programming-Basics|타입 레벨 프로그래밍 기초]]
- [[TypeScript-Type-Compatibility|타입 호환성]]
- [[TS-Class-Type-System|클래스 타입 시스템]]

## 출처

- [TypeScript Handbook, Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Handbook, More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- yongsoocho, [generic 기초](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138448)
- yongsoocho, [generic constraint와 extends](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137152)
- [제네릭 소개, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157966)
- [타입 변수 응용하기, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157967)
- [map, forEach 메서드 타입 정의하기, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157968)
- [제네릭 인터페이스와 타입 별칭, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157969)
- [제네릭 클래스, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157970)
- [프로미스와 제네릭, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157971)
