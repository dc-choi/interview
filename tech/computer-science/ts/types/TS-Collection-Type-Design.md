---
tags: [cs, typescript, array, tuple, mapped-type]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript 컬렉션 타입", "인덱스 시그니처와 readonly"]
verified_at: 2026-10-01
---

# TypeScript 컬렉션 타입 설계

인덱스 시그니처, 배열, 튜플과 `ArrayLike`는 모두 숫자나 키로 값을 찾는 형태지만 보장 범위가 다르다. 필요한 연산과 키 집합을 가장 좁게 표현해야 누락과 잘못된 접근을 발견할 수 있다.

## 인덱스 시그니처

키 이름을 미리 모르지만 값의 형태는 아는 사전에 사용한다.

```typescript
interface Environment {
  [name: string]: string | undefined;
}
```

문자열 인덱스 시그니처가 있으면 이름이 알려진 모든 속성도 그 값 타입과 호환되어야 한다. JavaScript가 숫자 객체 키를 문자열로 바꾸므로 문자열과 숫자 인덱스를 함께 선언할 때 숫자 쪽 반환 타입은 문자열 쪽의 하위 타입이어야 한다.

인덱스 시그니처는 키가 실제로 존재한다는 보장이 아니다. `noUncheckedIndexedAccess`를 켜면 선언되지 않은 키 접근에 `undefined`가 추가되어 존재 확인을 요구한다.

## 일반 속성과 중첩 사전 분리

알려진 속성과 임의의 하위 키를 같은 문자열 인덱스에 섞으면 오타도 정상 키로 받아들인다. 스타일 속성과 selector 같은 서로 다른 역할은 구조를 분리한다.

```typescript
interface Style {
  color?: string;
  children?: { [selector: string]: Style };
}

const style: Style = {
  color: "red",
  children: { ".active": { color: "blue" } },
};
// { colour: "red" }는 알려지지 않은 속성이라 오류
```

기존 JavaScript 값이 고정 속성과 열린 사전을 한 객체에 섞었다면 intersection으로 소비 측 타입을 표현할 수 있다. 다만 `{ isValid: boolean } & { [key: string]: FieldState }`는 `isValid`도 `FieldState`여야 한다는 충돌이 생겨 일반 객체 리터럴로 생성하기 어렵다. 새 API를 설계할 때는 이 우회보다 `fields: Record<string, FieldState>` 같은 중첩 구조를 사용한다.

## 키 집합을 알면 `Record`나 mapped type

가능한 키가 유한하면 열린 문자열 인덱스보다 닫힌 키 유니온을 사용한다.

```typescript
type Form = {
  name: string;
  age: number;
};

type Validators<T> = {
  [K in keyof T]: (value: T[K]) => boolean;
};

const validators: Validators<Form> = {
  name: value => value.length > 0,
  age: value => value >= 0,
};
```

`Form`에 속성을 추가하면 검증기 누락이 오류가 된다. 원본과 파생 객체를 수동으로 따로 유지하지 않고 `keyof`, indexed access와 mapped type으로 동기화한 것이다. 값 타입이 모두 같다면 `Record<keyof Form, Handler>`로 더 단순하게 쓸 수 있다.

## `Array`, 튜플과 `ArrayLike`

| 타입 | 보장 |
|---|---|
| `T[]` | 가변 길이, 배열 메서드와 변경 가능성 |
| `readonly T[]` | 배열 읽기, 타입 검사에서 변경 금지 |
| `[A, B]` | 대입 시 길이와 각 위치 타입. 변경 메서드로 바뀐 길이는 추적하지 않음 |
| `readonly [A, B]` | 고정 위치 타입과 변경 금지 |
| `ArrayLike<T>` | readonly `length`와 숫자 인덱스 접근 |

`ArrayLike<T>`는 배열 메서드나 이터러블임을 보장하지 않는다. DOM 컬렉션처럼 길이와 숫자 접근만 필요한 API 경계에 맞고, `map`이나 `for...of`가 필요하면 `Array.from`으로 배열을 만들거나 더 정확한 입력 타입을 요구한다.

배열을 흉내 내려고 직접 `{ [index: number]: T }`를 선언하면 길이, 메서드, 위치별 타입 같은 계약이 빠진다. 일반 배열은 `T[]`, 고정된 위치는 튜플, 최소 배열 모양만 필요하면 `ArrayLike<T>`를 쓴다.

### 튜플 길이 보장의 한계

튜플은 별도 자료형이 아니라 컴파일 후 일반 배열이다. 타입으로도 위치별 속성과 리터럴 `length`를 가진 `Array<A | B>`와 같아서, `push`와 `pop` 같은 변경 메서드는 요소 타입의 유니온만 검사하고 길이 변화는 반영하지 않는다.

```typescript
const pair: [number, string] = [1, "a"];
const bad: [number, string] = [1, "a", 2]; // 오류: 길이 2를 넘는 대입

pair.push(3);                  // 통과: 인수는 number | string으로만 검사
pair.pop(); pair.pop(); pair.pop();
const first: number = pair[0]; // 타입은 number, 실제 값은 undefined
```

타입 검사가 보장하는 범위는 대입 시점의 길이와 위치별 타입, 범위 밖 리터럴 인덱스 접근 오류(TS2493)까지다. 값을 바꿀 필요가 없는 튜플은 `readonly [A, B]`로 선언해 변경 메서드를 타입에서 없앤다.

## `readonly`가 보장하는 범위

`readonly`는 TypeScript가 해당 참조를 통해 대입하지 못하게 하는 얕은 검사다. 런타임 `Object.freeze`가 아니고, 다른 가변 별칭을 통한 변경까지 막지 않는다.

```typescript
function total(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

const mutable = [1, 2, 3];
total(mutable); // 읽기만 하므로 전달 가능
```

읽기만 하는 함수의 매개변수를 `readonly T[]`로 선언하면 가변 배열과 readonly 배열을 모두 받을 수 있고, 구현이 입력을 바꾸지 않는다는 계약도 드러난다. 반대로 readonly 배열을 가변 배열 위치에 대입할 수는 없다.

객체의 readonly 속성은 구조적 호환성에서 완전한 불변 경계를 만들지 않는다. 깊은 불변성이 필요하면 중첩 타입과 런타임 정책을 함께 설계한다.

## 선택 기준

1. 키를 전부 알면 객체 타입, `Record` 또는 mapped type을 쓴다.
2. 키가 실제로 열려 있을 때만 인덱스 시그니처를 쓴다.
3. 함수가 변경하지 않으면 입력 컬렉션을 readonly로 받는다.
4. 위치마다 의미가 다르면 튜플, 이름이 더 중요하면 객체를 쓴다.
5. 외부의 유사 배열에는 `ArrayLike`, 배열 연산에는 `Array`를 요구한다.

## 관련 문서

- [[타입특징|타입 특징]]
- [[TypeScript-Type-Level-Programming-Advanced|Mapped Types]]
- [[TS-Type-Assertions|as const]]
- [[option|컴파일러 옵션]]

## 출처

- [TypeScript Deep Dive, Index Signatures — Basarat](https://basarat.gitbook.io/typescript/type-system/index-signatures)
- [TypeScript Handbook, Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [TypeScript Handbook, Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript TSConfig, noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)
- [TypeScript 5.9 lib.es5.d.ts, ArrayLike](https://github.com/microsoft/TypeScript/blob/release-5.9/src/lib/es5.d.ts)
- yongsoocho, [배열과 tuple](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138449)
- [이펙티브 타입스크립트 스터디 3-3회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91632)
- [이펙티브 타입스크립트 스터디 4-1회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91633)
- [배열과 튜플, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=154366)
