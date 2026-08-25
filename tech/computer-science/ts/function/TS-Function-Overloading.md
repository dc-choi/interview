---
tags: [cs, typescript, function, overloading]
status: done
category: "CS - TypeScript"
aliases: ["Function Overloading", "함수 오버로딩", "오버로드 시그니처"]
verified_at: 2026-08-04
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
| 제네릭 + 조건부 타입 | 제네릭 입력과 출력의 규칙적 관계를 보존할 때 | 구현 타입과 오류 메시지가 복잡해질 수 있음 |

조건부 타입이 오버로드보다 항상 낫지는 않다. 관계가 규칙적이고 호출자의 구체 타입을 보존해야 할 때 사용하고, 단순한 동일 반환 계약은 유니온 매개변수로 표현한다.

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
- yongsoocho, [function type](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137142)

## 관련 문서

- [[TS-Type-Narrowing|Type Narrowing (typeof, in, 사용자 정의 가드)]]
- [[TypeScript-Type-Level-Programming|타입 레벨 프로그래밍 (제네릭 조건부 타입)]]
- [[TS-Pattern-Matching|패턴 매칭 (Discriminated Union)]]
- [[TS-Type-vs-Interface|type vs interface]]
