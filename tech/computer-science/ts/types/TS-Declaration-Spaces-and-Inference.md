---
tags: [cs, typescript, type-system, inference]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript 타입 공간과 값 공간", "TypeScript 추론 설계"]
verified_at: 2026-08-04
---

# TypeScript 타입 공간, 값 공간과 추론

TypeScript 소스에는 타입 검사에만 쓰이는 이름과 JavaScript 런타임에 남는 이름이 함께 있다. 이름이 어느 공간에 있는지 구분하면 `typeof`, 클래스 생성자, type-only import와 타입 소거를 일관되게 이해할 수 있다.

## 타입 공간과 값 공간

| 선언 | 타입 이름 | 런타임 값 |
|---|---|---|
| `type`, `interface` | 생성 | 생성하지 않음 |
| `const`, `let`, `function` | 직접 생성하지 않음 | 생성 |
| `class`, `enum` | 생성 | 생성 |

클래스 이름은 타입 위치에서 인스턴스 타입, 값 위치에서 생성자 함수를 가리킨다.

```typescript
class User {
  constructor(readonly id: number) {}
}

const user: User = new User(1);
type UserConstructor = typeof User;
```

타입으로만 쓰는 import는 `import type`으로 의도를 드러낼 수 있다. 이 문법은 런타임 의존성을 만들지 않으며, 값으로 사용하려 하면 오류가 난다.

## 두 가지 `typeof`

값 식의 `typeof value`는 런타임 문자열을 반환한다. 타입 위치의 `typeof name`은 이미 존재하는 변수나 속성의 정적 타입을 가져온다.

```typescript
const settings = { mode: "strict", retry: 3 } as const;

console.log(typeof settings); // 런타임: "object"
type Settings = typeof settings;
type Mode = Settings["mode"]; // "strict"
```

타입 위치의 `typeof`는 식을 실행하지 않는다. 식별자와 속성 접근에 제한되므로 함수 결과 타입은 `ReturnType<typeof fn>`처럼 표현한다.

## 원시 타입과 래퍼 타입

타입에는 소문자 `string`, `number`, `boolean`, `symbol`을 사용한다. 대문자 `String`, `Number`, `Boolean`, `Symbol`은 박싱된 객체 타입을 가리켜 일반 데이터 모델에 거의 맞지 않는다.

| 의도 | 타입 |
|---|---|
| 어떤 값이든 받되 사용 전에 검사 | `unknown` |
| 원시 값이 아닌 값 | `object` |
| 문자열 키의 동적 레코드 | `Record<string, unknown>` |
| 문자열 값 | `string` |

전역 `Object`와 빈 객체 타입 `{}`는 `any`가 아니다. 많은 non-nullish 값을 허용하면서 사용할 수 있는 정보는 적다. 비원시 값이 필요하면 `object`, 모든 값이면 `unknown`, 키-값 사전이면 구체적인 `Record`를 선택한다.

## 추론을 활용할 위치

초기값이 분명한 지역 변수에 타입을 반복해서 적을 필요는 없다. 반면 공개 함수 반환값, 모듈 경계, 오래 유지되는 상태에는 명시적 타입이 구현의 우발적 변경을 잡아준다.

```typescript
type Comparator<T> = (left: T, right: T) => number;

const byId: Comparator<User> = (left, right) => left.id - right.id;
```

함수 표현식 전체에 타입을 적용하면 매개변수와 반환값이 문맥적으로 검사된다. 각 매개변수에 같은 타입을 반복하는 것보다 입력과 출력의 관계를 한 계약으로 재사용하기 쉽다.

객체도 가능한 한 완성된 리터럴로 만든다.

```typescript
interface Profile {
  id: number;
  name: string;
}

const profile: Profile = { id, name };
```

`{} as Profile` 뒤에 속성을 하나씩 붙이면 초기화 누락을 단언으로 숨긴다. 단계적 조립이 필수라면 `Partial<Profile>`로 중간 상태를 명시하고, 완성 경계에서 검증한다.

## 넓힘, 문맥과 별칭

- 재할당 가능한 `let`의 리터럴은 보통 원시 타입으로 넓어진다.
- `as const`는 리터럴성과 readonly 추론을 보존하지만 런타임 객체를 동결하지 않는다.
- `satisfies`는 대상 타입과의 호환성을 검사하면서 식 자체의 구체적인 추론을 보존한다.
- 같은 값을 여러 경로로 참조하면 변경 가능성 때문에 좁힘이 무효화될 수 있다. 가드 뒤의 값을 `const` 별칭으로 고정하면 의도와 수명을 분명히 할 수 있다.
- TypeScript 5.4부터 마지막 대입 뒤 생성된 비호이스팅 클로저에서는 좁힘을 더 잘 보존한다. 중첩 함수 어디서든 다시 대입하면 보존되지 않는다.

`async` 함수의 반환값은 항상 `Promise`로 감싸진다. 공개 비동기 함수는 `Promise<Result>`처럼 완료 값의 계약을 적고, 거부 사유는 `Promise<T>`의 타입 매개변수에 포함되지 않는다는 점을 별도로 설계한다.

## 관련 문서

- [[타입특징|타입 특징]]
- [[TS-Type-Assertions|타입 단언과 satisfies]]
- [[TS-Class-Type-System|클래스 타입 시스템]]
- [[TS-Type-Narrowing|타입 좁히기]]
- [[TS-Generics|제네릭과 Promise]]

## 출처

- [TypeScript Handbook, Declaration File Deep Dive](https://www.typescriptlang.org/docs/handbook/declaration-files/deep-dive.html)
- [TypeScript Handbook, typeof Type Operator](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)
- [TypeScript Handbook, Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript Handbook, More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [TypeScript 5.4, Preserved Narrowing in Closures](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#preserved-narrowing-in-closures-following-last-assignments)
- yongsoocho, [타입 주석과 타입 추론](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137145)
- [이펙티브 타입스크립트 스터디 1-1회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91625)
- [이펙티브 타입스크립트 스터디 2-1회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91628)
- [이펙티브 타입스크립트 스터디 2-2회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91629)
- [이펙티브 타입스크립트 스터디 4-2회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91635)
- [이펙티브 타입스크립트 스터디 5-2회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91637)
