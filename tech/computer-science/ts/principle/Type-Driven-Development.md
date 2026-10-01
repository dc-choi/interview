---
tags: [typescript, type-system, type-driven-development, phantom-type, discriminated-union, modeling]
status: done
verified_at: 2026-10-01
category: "CS - TypeScript"
aliases: ["Type-Driven Development", "타입 주도 개발", "Phantom Type", "팬텀 타입", "Typestate"]
---

# 타입 주도 개발

타입은 함수와 데이터가 지켜야 하는 계약이고, 타입 시스템은 그 계약을 어기지 못하게 한다. 타입 주도 개발은 구현보다 타입을 먼저 정의하고, 그 타입이 허용하는 입력과 출력에 맞춰 로직을 채우는 방법이다. 정해진 표준 절차가 있는 방법론은 아니며, 타입이라는 계약으로 책임과 역할을 먼저 정한다는 점에서 계약에 의한 설계와 닮았다. 함수 하나처럼 작은 단위에도 적용할 수 있어 TDD와 함께 쓴다.

타입의 논리적 의미(커리-하워드 대응, `never`와 완전성 검사)는 [[Types-As-Proofs]], 구조적 타이핑과 브랜드 타입은 [[TypeScript-Type-Compatibility]]에 있다. 이 문서는 그 도구들을 설계 순서로 엮는다.

## 타입은 값의 집합이다

`boolean`은 `{true, false}`, 32비트 정수는 약 -21억부터 21억까지의 정수 집합이다. 타입을 범위가 정해진 집합으로 보면 함수는 한 집합(정의역)의 값을 다른 집합(공역)으로 옮기는 변환이고, 로직은 입력 타입에서 출력 타입으로 가는 변환의 연쇄가 된다.

| 변환 | 예 | 주의 |
|---|---|---|
| 넓히기 | 정수를 더 넓은 정수로, 열거형 값을 고유 숫자 코드로 | 정보 손실이 없는 단사 변환이면 안전하다 |
| 좁히기 | 숫자 코드를 열거형으로, 넓은 정수를 좁은 정수로 | 입력 중 일부는 대응하는 출력이 없다. 모르는 코드를 기본값으로 조용히 바꾸면 잘못된 데이터가 숨는다. 실패를 결과 타입이나 예외로 드러낸다 |
| 항등 | `identity(x) = x` | 고차 함수에서 변환이 필요 없는 분기를 채우는 중립 원소로 쓴다 |

## 원시 타입에 의미를 입힌다

`age: number`, `email: string`은 아무 숫자나 문자열을 받는다. 도메인 값마다 타입을 두고, 생성 지점에서 한 번 검증해 검증된 값만 그 타입을 갖게 하면 이후 코드는 다시 검사하지 않는다. 입력을 검사만 하고 원래 타입으로 흘려보내는 대신, 검사 결과를 더 정확한 타입으로 바꿔 돌려주라는 원칙(parse, don't validate)과 같다.

```ts
type Email = string & { readonly __brand: 'Email' };

/** 형식을 확인한 뒤에만 Email 타입을 부여한다. */
const parseEmail = (raw: string): Email => {
  if (!raw.includes('@')) throw new InvalidEmailError(raw);
  return raw as Email;
};
```

TypeScript는 구조적 타이핑이라 같은 모양의 타입을 구분하지 못하므로 브랜드 필드로 명목 타입을 흉내 낸다. 런타임 입력의 검증은 스키마 라이브러리로 경계에서 처리한다. [[Runtime-Validation-Libraries]]

## 타입으로 범위와 행동을 제한하는 도구

### 제네릭

같은 구조를 여러 타입에 재사용한다. 제네릭이 없으면 `IntList`, `StringList`처럼 타입마다 복제해야 한다. [[TS-Generics]]

### 팬텀 타입

값에는 쓰이지 않고 타입 매개변수로만 존재하는 타입이다. 같은 구조의 값을 단위나 상태별로 구분할 때 쓴다. 다만 TypeScript에서는 멤버가 쓰지 않는 타입 매개변수가 호환성과 추론에 아무 영향을 주지 않는다. `interface Distance<Unit> { value: number }`라면 미터와 킬로미터가 서로 대입된다. 타입 매개변수를 선언만 된 필드에 연결해야 구분된다.

```ts
declare const unit: unique symbol;
interface Distance<U extends 'm' | 'km'> {
  readonly value: number;
  readonly [unit]: U; // 런타임 값은 없고 타입 구분에만 쓴다
}

const toKilometers = (d: Distance<'m'>): Distance<'km'> => ({ value: d.value / 1000 }) as Distance<'km'>;
// toKilometers(kilometers) 는 컴파일 오류가 된다
```

엔티티 ID도 `Id<User>`, `Id<Post>`처럼 하나의 제네릭 ID로 대상 타입을 구분하면 `UserId`, `PostId`를 따로 만들지 않고도 서로 섞이는 것을 막는다. Kotlin이나 Java처럼 명목 타입이고 제네릭이 기본적으로 무공변인 언어에서는 빈 클래스를 타입 인자로 쓰는 것만으로 구분된다. 측도의 단위를 타입으로 표현하는 설계는 [[Measure-Modeling]]과 이어진다.

### 판별 유니온

`{ type: 'loading' } | { type: 'success'; data: T } | { type: 'error'; message: string }`처럼 판별 필드로 나뉜 유니온은 현재 상태에서만 유효한 필드에 접근하게 한다. `success`가 아닌데 `data`를 읽거나 `error`가 아닌데 `message`를 읽으면 컴파일 오류가 난다. Kotlin의 `sealed interface` 같은 합 타입도 같은 역할이다. 분기가 빠지지 않게 하는 완전성 검사는 [[Types-As-Proofs]], 좁히기 문법은 [[TS-Type-Narrowing]]에 있다.

### bottom 타입

값을 하나도 갖지 않는 타입(TypeScript `never`, Kotlin `Nothing`)은 정상 반환하지 않는 함수의 반환 타입이다. 아직 구현하지 않은 함수에 `TODO(): never`를 두면 시그니처부터 확정하고 컴파일을 통과시킨 뒤 구현을 채울 수 있고, 구현 없이 배포되면 호출 즉시 실패해 드러난다. 배포 전 린트나 검색으로 남은 TODO를 막는다.

### 타입 상태 머신

상태를 팬텀 타입이나 판별 필드로 표현하고, 전이 함수의 입력과 출력 타입을 고정하면 허용되지 않은 전이를 컴파일 시점에 막는다. 초안 문서만 발행할 수 있고 발행된 문서만 수정 모드로 돌릴 수 있다면 다음처럼 표현한다.

```ts
interface Doc<S extends 'draft' | 'published'> {
  readonly content: string;
  readonly state: S;
}

const publish = (doc: Doc<'draft'>): Doc<'published'> => ({ ...doc, state: 'published' });
const reopen = (doc: Doc<'published'>): Doc<'draft'> => ({ ...doc, state: 'draft' });
// publish(publishedDoc) 는 컴파일 오류
```

런타임 값으로 상태가 저장되고 불러와지는 도메인 모델에서는 타입만으로 모든 전이를 보장할 수 없으므로 도메인 객체의 메서드에서도 상태를 검사한다.

### 의존 타입

Idris처럼 값에 의존하는 타입을 지원하는 언어는 길이가 5인 벡터 같은 조건을 타입에 담아, 보통 런타임에 하는 검증을 컴파일 시점으로 옮긴다. TypeScript를 포함한 주류 언어의 범위는 아니며, 타입 시스템이 어디까지 표현할 수 있는지 보여 주는 예다.

## 타입 주도 개발 절차

문자열 수식 `"3 + 4 - 2"`를 계산하는 기능(연산자는 +와 -, 피연산자는 자연수, 공백으로 구분, 잘못된 입력은 없다고 가정)으로 절차를 보면 다음과 같다.

1. **전체 입력과 출력을 타입으로 정한다**: `(expression: string) => number`
2. **도메인 개념에 타입을 준다**: 같은 문자열이라도 연산자와 부호는 의미가 다르다. 토큰은 숫자이거나 연산자다.

```ts
type Sign = 'PLUS' | 'MINUS';
type Token = { readonly kind: 'number'; readonly value: number } | { readonly kind: 'operator'; readonly value: Sign };
```

3. **단계별 함수를 시그니처로 먼저 쓴다**: 구현보다 먼저 파이프라인을 타입으로 설계한다.

```ts
declare const tokenize: (expression: string) => readonly Token[];
declare const toToken: (raw: string) => Token;
declare const toSign: (raw: string) => Sign; // 모르는 기호는 예외
declare const evaluate: (tokens: readonly Token[]) => number;
const calculate = (expression: string): number => evaluate(tokenize(expression));
```

4. **시그니처가 정해지면 테스트를 쓴다**: 타입은 컴파일 시점에 형태의 오류를 막고, 테스트는 타입이 잡지 못하는 값의 오류와 예외 상황을 잡는다. [[TDD-BDD]]
5. **구현을 채운다**: 각 함수는 이미 정해진 입력과 출력 사이만 채우면 된다.

같은 요구사항도 해석과 패러다임에 따라 다른 함수 분해가 나올 수 있다. 타입을 먼저 정한다는 순서가 핵심이다.

## 트레이드오프

- 타입을 지나치게 많이, 복잡하게 만들면 작성과 읽기가 모두 어려워진다. 실수 비용이 큰 값과 경계에서 섞이기 쉬운 값부터 타입으로 구분한다.
- 타입은 기본적으로 빌드 결과에서 지워지므로 외부 입력은 런타임 검증이 필요하다.
- 설계자가 타입으로 규칙을 만들면 다른 개발자가 잘못 쓰기 어려운 API가 된다. 이 규칙은 문서보다 강제력이 크다.

## 체크포인트

- 타입을 집합으로 볼 때 넓히기와 좁히기 함수의 차이와 좁히기에서 실패를 드러내는 방법
- 검증 대신 파싱으로 원시 타입에 의미를 입히는 이유
- TypeScript에서 쓰지 않는 타입 매개변수가 팬텀 타입으로 동작하지 않는 이유와 해결법
- 판별 유니온과 타입 상태 머신이 잘못된 접근과 전이를 막는 방식
- 타입 주도 개발의 순서와 TDD가 보완하는 부분

## 출처

- [Type-Driven Development — kciter.so, kciter](https://kciter.so/posts/type-driven-development/)
- [TypeScript Wiki, FAQ](https://github.com/microsoft/TypeScript/wiki/FAQ)
- [Kotlin Documentation, Generics: in, out, where](https://kotlinlang.org/docs/generics.html)
- [Parse, don't validate — lexi-lambda.github.io, Alexis King](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)

## 관련 문서

- [[Types-As-Proofs|타입은 증명이다]]
- [[TypeScript-Type-Compatibility|타입 호환성과 Brand 타입]]
- [[TS-Type-Narrowing|Type Narrowing]]
- [[TS-Generics|TS 제네릭]]
- [[Measure-Modeling|측도 모델링]]
- [[Software-Modeling|소프트웨어 모델링과 좋은 모델의 기준]]
