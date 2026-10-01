---
tags: [cs, typescript, function, overloading]
status: done
category: "CS - TypeScript"
aliases: ["Function Overloading", "함수 오버로딩", "오버로드 시그니처"]
verified_at: 2026-10-01
---

# 함수 오버로딩 (Function Overloading)

하나의 함수가 인자 형태에 따라 다른 호출 방식과 반환 타입을 갖도록, 여러 개의 호출 시그니처를 명시하는 기법. JavaScript 함수는 인자 개수와 타입이 유연하므로, TypeScript는 오버로딩으로 사용자에게 허용된 호출 형태를 계약으로 보여준다.

## 구조: 오버로드 시그니처 + 구현 시그니처

```typescript
function normalize(value: string): string;
function normalize(value: string[]): string[];
function normalize(value: string | string[]): string | string[] {
  return Array.isArray(value) ? value.map(item => item.trim()) : value.trim();
}
```

- **오버로드 시그니처**(위 1, 2): 외부 사용자에게 보이는 타입. 실제 호출 가능한 형태.
- **구현 시그니처**(마지막): 실제 로직. 외부에서는 보이지 않으며 직접 호출할 수 없다.

## 핵심 규칙

- **오버로드 목록이 곧 공개 계약**이다. 사용자는 선언된 시그니처로만 호출할 수 있고, 구현 시그니처는 호출 후보에서 제외된다.
- **구현 시그니처는 모든 오버로드를 수용**해야 한다. 매개변수와 반환 타입은 보통 모든 경우를 포함한다.
- **구현 시그니처가 넓어도 외부에 노출되지 않는다.** 구현부가 유니온을 받아도 사용자는 오버로드 목록에 선언된 형태로만 호출할 수 있다.
- **매칭은 위에서 아래로**. 컴파일러는 선언 순서대로 첫 일치하는 오버로드를 고른다. 따라서 **더 좁고 구체적인 시그니처를 위에** 둔다.

## 언제 오버로딩을 쓰나

인수 개수나 입력 형태에 따라 호출 계약이 실제로 달라질 때 적합하다. 입력 A면 출력 A', 입력 B면 출력 B'처럼 짝이 명확한 경우도 포함한다.

```typescript
function parse(v: string): number;
function parse(v: number): string;
function parse(v: string | number): string | number {
  return typeof v === "string" ? Number(v) : String(v);
}
```

단, 인수 개수와 반환 타입이 같고 한 매개변수의 타입만 다르다면 오버로드보다 유니온 매개변수를 우선한다. 유니온 값 자체를 전달할 수 있고 구현 계약도 한 줄로 유지되기 때문이다.

## 오버로딩 vs 유니언 반환 vs 조건부 타입

| 방식 | 적합한 경우 | 단점 |
|---|---|---|
| 함수 오버로딩 | 인수 개수나 호출 형태가 달라질 때 | 구현 시그니처를 손으로 맞춰야 함 |
| 유니온 매개변수 | 같은 방식으로 처리할 입력들이고 반환 계약도 같을 때 | 구현에서 좁히기 필요 |
| 제네릭 + 조건부 타입 | 제네릭 입력과 출력의 규칙적 관계를 보존할 때 | 구현 본문에서 조건부 반환 타입이 해석되지 않아 오버로드 분리가 필요하고, 오류 메시지가 복잡해질 수 있음 |

조건부 타입이 오버로드보다 항상 낫지는 않다. 관계가 규칙적이고 호출자의 구체 타입을 보존해야 할 때 사용하고, 단순한 동일 반환 계약은 유니온 매개변수로 표현한다.

## 제네릭 조건부 반환 타입은 오버로드 시그니처로 올린다

인수 타입에 따라 반환 타입이 달라지는 함수를 제네릭 조건부 반환 타입으로 선언하면 본문에서 막힌다. 본문의 `T`는 아직 정해지지 않은 타입 매개변수라 조건부 타입이 해석되지 않고, 구체 값을 반환하면 TS2322가 난다(5.9.3, 6.0.3, 7.0.2 모두 같다).

```typescript
function removeSpaces<T>(text: T): T extends string ? string : undefined {
  if (typeof text === "string") return text.replaceAll(" ", ""); // TS2322
  return undefined; // TS2322
}
```

`as any`로 반환하면 오류는 사라지지만 본문이 약속과 다른 값을 반환해도 잡지 못한다. 조건부 반환 타입은 오버로드 시그니처로 올리고 구현 시그니처에서는 타입 매개변수를 없앤다. 오버로드 시그니처가 하나여도 공개 계약과 구현을 분리하는 용도로 쓸 수 있다.

```typescript
function removeSpaces<T>(text: T): T extends string ? string : undefined;
function removeSpaces(text: unknown): string | undefined {
  if (typeof text === "string") return text.replaceAll(" ", "");
  return undefined;
}

const r1 = removeSpaces("hello world"); // string
const r2 = removeSpaces(undefined); // undefined
```

오버로드와 구현 시그니처의 호환성 검사는 느슨하다. 반환 타입 때문에 TS2394가 나는 것은 구현과 오버로드의 반환 타입이 어느 쪽으로도 할당되지 않을 때뿐이다(예: 구현이 `number`만 반환). 그래서 일부 분기의 엉뚱한 반환값은 위처럼 구현 시그니처에 반환 타입을 명시해야 TS2322로 잡히고, 명시하지 않으면 `return 42` 분기를 추가해도 추론된 `string | 42 | undefined`에 오버로드의 반환 타입이 할당되므로 통과한다(5.9.3, 6.0.3, 7.0.2에서 확인). 분기별 반환값이 서로 뒤바뀐 경우는 명시해도 통과하므로, 대표 입력에 대한 타입 테스트(`@ts-expect-error` 포함)를 함께 둔다.

## interface에서 오버로드 선언하기

interface의 메서드 타입은 메서드 시그니처(`sayHi(): void`)나 함수 타입 표현식 속성(`sayHi: () => void`)으로 쓴다. 오버로드는 메서드 시그니처를 같은 이름으로 여러 번 선언해 만든다. 함수 타입 표현식 속성을 같은 이름으로 반복하면 TS2300(Duplicate identifier)과 TS2717이 난다.

```typescript
interface Greeter {
  sayHi(): void;
  sayHi(a: number, b: number): void;
}

interface StrictGreeter {
  sayHi: { (): void; (a: number, b: number): void };
}
```

두 형태는 변성 검사가 다르다. 메서드 시그니처는 `strictFunctionTypes`에서도 매개변수를 양변(bivariant)으로 검사해 느슨하고, 속성 형태는 반공변으로 엄격하다([[TypeScript-Type-Compatibility|타입 호환성]]). 엄격한 검사를 유지하면서 오버로드가 필요하면 `StrictGreeter`처럼 속성 타입을 여러 호출 시그니처를 가진 객체 타입으로 쓴다. 선언 병합된 interface의 같은 이름 함수 멤버도 오버로드로 합쳐진다([[TS-Module-Augmentation|선언 병합]]).

## 함정

- **구현 시그니처를 오버로드로 착각**: 마지막 시그니처는 외부 계약이 아니다. 구현의 유니온 타입을 사용자가 그대로 호출할 수 있다고 기대하면 안 된다.
- **오버로드 순서 실수**: 넓은 시그니처를 위에 두면 좁은 케이스가 도달하지 못한다.
- **과용**: 대부분은 유니언 매개변수 하나 + [[TS-Type-Narrowing|타입 좁히기]]로 충분하다. 오버로드는 호출 형태가 정말 갈릴 때만.
- **메서드 오버로드, this 매개변수**: 클래스 메서드도 같은 규칙으로 오버로드 가능하다.

## 면접 체크포인트

- 오버로드 시그니처와 구현 시그니처의 차이, 무엇이 외부에 노출되는가
- 구현 시그니처가 넓어도 계약이 느슨해지지 않는 이유
- 오버로딩을 조건부 타입, 유니언 반환 대신 선택하는 기준
- 오버로드 매칭이 선언 순서에 의존한다는 점

## 출처

- [TypeScript Handbook, More on Functions, Function Overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads)
- [TypeScript Declaration Files, Do's and Don'ts, Use Union Types](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#use-union-types)
- [TypeScript Handbook, Declaration Merging, Merging Interfaces](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces)
- yongsoocho, [function type](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137142)
- 이정환 Winterlood, [조건부 타입 소개](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=159059)
- 이정환 Winterlood, [인터페이스](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=157313)

## 관련 문서

- [[TS-Function-Types|함수 타입 정의 (함수 타입 표현식, 호출 시그니처)]]
- [[TS-Type-Narrowing|Type Narrowing (typeof, in, 사용자 정의 가드)]]
- [[TypeScript-Type-Level-Programming|타입 레벨 프로그래밍 (제네릭 조건부 타입)]]
- [[TS-Pattern-Matching|패턴 매칭 (Discriminated Union)]]
- [[TS-Type-vs-Interface|type vs interface]]
