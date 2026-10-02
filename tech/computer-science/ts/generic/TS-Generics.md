---
tags: [cs, typescript, generics, type-system]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript Generics", "TS 제네릭"]
verified_at: 2026-10-01
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

배열 매개변수 `T[]`는 요소 전체를 보고 `T`를 정하므로 `first([1, "hello"])`의 결과는 `string | number | undefined`다. 첫 요소의 타입만 보존하려면 튜플 매개변수로 위치를 고정한다. 이 형태는 최소 한 요소를 요구하므로 반환 타입에 `undefined`가 필요 없다. 서로 다를 수 있는 매개변수에는 `swap<T, U>(a: T, b: U): [U, T]`처럼 타입 매개변수를 따로 둔다.

```typescript
function head<T>(values: readonly [T, ...unknown[]]): T {
  return values[0];
}

const firstValue = head([1, "hello", "world"]); // number
```

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

제네릭 interface와 type alias를 변수의 타입 주석으로 쓸 때는 타입 인수를 적어야 한다. 초기값에서 추론하지 않으므로 기본 타입 인자가 없으면 TS2314(Generic type 'KeyPair<K, V>' requires 2 type argument(s))다. 반면 제네릭 클래스는 생성자 인수에서 `T`를 추론해 `new List([1, 2, 3])`이 `List<number>`가 되므로 요소 타입별 클래스를 따로 만들 필요가 없고, 추론이 의도와 다를 때만 `new List<number>([])`처럼 명시한다. 값 타입만 달라지는 사전은 `Record<string, V>`로 쓰고, 인덱스 시그니처의 보장 범위는 [[TS-Collection-Type-Design|컬렉션 타입 설계]]를 따른다.

## 제네릭 값의 특수화

TypeScript 4.7부터 instantiation expression으로 기존 제네릭 함수나 생성자 값에 타입 인수를 고정할 수 있다. 같은 구현을 재사용하려고 불필요한 wrapper나 서브클래스를 만들지 않아도 된다.

```typescript
function box<T>(value: T): { value: T } { return { value }; }
const stringBox = box<string>;
const StringMap = Map<string, string>;

stringBox("hello");
const labels = new StringMap();
```

`box<string>`은 함수 실행이 아니라 호출 가능한 값의 타입 특수화다. 구현을 복제하거나 런타임에 새 클래스를 만들지 않는다. 여러 오버로드가 있으면 주어진 타입 인수와 호환되는 시그니처만 남는다.

## 타입 인수로 받을 변형 고정하기

판별 유니온을 속성으로 가진 객체는 함수마다 같은 좁히기를 반복하기 쉽다. 변형을 타입 매개변수로 올리면 함수 시그니처가 받을 변형을 고정하고, 잘못된 변형은 호출부에서 컴파일 오류가 된다.

```typescript
interface Student { type: "student"; school: string }
interface Developer { type: "developer"; skill: string }

interface User<T> {
  name: string;
  profile: T;
}

const goToSchool = (user: User<Student>): string => user.profile.school; // 좁히기 불필요

declare const developer: User<Developer>;
goToSchool(developer); // 오류: 잘못된 변형을 호출부에서 차단
```

여러 변형이 섞인 목록을 받는 경계에서는 한 번 좁혀야 한다. 판별 필드가 `profile` 안에 중첩돼 있으면 `user.profile.type === "student"` 검사로 `user` 자체는 좁혀지지 않으므로(TS2345) 경계에 사용자 정의 타입 가드를 둔다.

```typescript
type AnyUser = User<Student> | User<Developer>;

const isStudentUser = (user: AnyUser): user is User<Student> => user.profile.type === "student";
const schools = users.filter(isStudentUser).map(goToSchool); // users: readonly AnyUser[]
```

경계에서 좁히고 내부 함수는 구체 변형을 받게 나누는 구조다. 모든 소비자가 모든 변형을 처리해야 하면 판별 유니온과 exhaustive 검사가 더 맞다([[TS-Pattern-Matching|패턴 매칭]], [[TS-Type-Narrowing-Custom-Guards|사용자 정의 타입 가드]]).

## `Promise<T>`가 표현하는 것

`Promise<T>`의 `T`는 fulfilled 상태에서 얻는 값의 타입이다. `Promise<void>`는 완료 신호만 필요하다는 뜻이고, `Promise<never>`는 정상 완료하지 않는 비동기 계약을 표현할 수 있다.

```typescript
async function loadUser(id: number): Promise<User> {
  return fetchUser(id);
}
```

표준 `Promise<T>`는 reject reason의 타입을 별도 매개변수로 표현하지 않는다. 실패 형태가 업무 계약의 일부라면 discriminated union 결과나 별도 error model을 사용한다.

`new Promise`에 타입 인수도 반환 위치의 문맥도 없으면 결과 타입을 추론할 근거가 없어 `Promise<unknown>`이 된다. `resolve(20)`을 넘겨도 `then` 콜백의 값은 `unknown`이라 바로 연산할 수 없다. `new Promise<number>(...)`처럼 타입 인수를 주거나, 함수 반환 타입을 `Promise<Post>`로 적으면 반환 위치의 문맥으로 `T`가 추론되어 `resolve`에 잘못된 값을 넘길 때도 오류가 난다. 선언부만 보고 계약을 알 수 있도록 공개 함수는 반환 타입을 적는 쪽을 권한다.

실패 사유는 lib 선언에서 `reject(reason?: any)`와 `catch`의 `(reason: any) => ...`로 `any`다. `strict`에 포함된 `useUnknownInCatchVariables`는 `try/catch`의 catch 절 변수에만 적용되고 `.catch()` 콜백의 사유는 계속 `any`이므로, 콜백 매개변수를 `(error: unknown) => ...`로 직접 선언해 좁히기를 강제한다(5.9.3, 6.0.3, 7.0.2에서 확인).

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

- [TypeScript Deep Dive, Generics — Basarat](https://basarat.gitbook.io/typescript/type-system/generics)
- [TypeScript 4.7, Instantiation Expressions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#instantiation-expressions)
- [TypeScript Handbook, Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Handbook, More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [TypeScript TSConfig, useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html)
- [es2015.promise.d.ts — microsoft/TypeScript release-6.0](https://github.com/microsoft/TypeScript/blob/release-6.0/src/lib/es2015.promise.d.ts)
- [es5.d.ts — microsoft/TypeScript release-6.0](https://github.com/microsoft/TypeScript/blob/release-6.0/src/lib/es5.d.ts)
- yongsoocho, [generic 기초](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138448)
- yongsoocho, [generic constraint와 extends](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137152)
- [제네릭 소개, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157966)
- [타입 변수 응용하기, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157967)
- [map, forEach 메서드 타입 정의하기, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157968)
- [제네릭 인터페이스와 타입 별칭, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157969)
- [제네릭 클래스, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157970)
- [프로미스와 제네릭, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157971)
