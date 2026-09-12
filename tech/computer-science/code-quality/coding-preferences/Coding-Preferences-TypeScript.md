---
tags: [coding-style, user-preference, typescript, function, enum]
status: done
category: "CS - 코드 품질"
aliases: ["코딩 선호: TypeScript 문법과 타입"]
---

# 코딩 선호: TypeScript 문법과 타입

2026-09-12 대화에서 사용자가 직접 확인한 코딩 선호와 적용 맥락을 기록한다. 사용자 선호의 정본은 [tech/AGENTS.md의 개인 코딩 선호](../../../AGENTS.md#개인-코딩-선호)이며, 이 문서는 조회를 위한 확인 사례와 관련 지식의 연결을 제공한다.

자료 역할은 사용자 선호의 확인 기록이다. 연결된 학습 문서 전체를 사용자 규칙이나 모든 프로젝트의 채택 결정으로 해석하지 않는다. 현재 요구사항과 대상 프로젝트의 규칙을 확인해 적용한다.

## 화살표 함수와 반환 타입의 길이

- 확인 상황: 활성 사용자의 이름을 배열로 반환하는 함수에서 `string[]`를 추론에 맡긴 예시를 보고, 반환 타입 명시에 대한 선호를 물었다.
- 사용자 답변: 반환 타입을 명시하는 것은 상관없지만 코드가 너무 길어지면 읽기 힘들다고 답했다. 일반 함수는 가능한 한 화살표 함수로 쓰는 것을 선호한다고 덧붙였다.
- 예외 확정: 클래스의 화살표 함수 필드도 가능하다는 설명을 들은 뒤, 사용자는 `this`를 자주 사용할 것을 이유로 클래스 메서드는 일반적인 메서드 문법으로 통일하도록 명시했다. 클래스 메서드를 화살표 함수 필드로 정의하지 않는다.
- 적용: 일반 함수에는 화살표 함수를 기본으로 사용하고, 반환 타입 명시 여부는 코드 길이와 가독성을 함께 고려한다. 반환 타입 명시를 모든 함수의 의무로 만들지 않는다.
- 후속 확인: 여러 줄 체이닝을 암시적으로 반환한 예시는 읽기 어렵다고 답했고, 같은 함수에 중괄호와 `return`을 명시한 아래 형태에는 동의했다. 이 선호를 짧은 콜백까지 포함한 모든 암시적 반환의 금지로 확대하지 않는다.
- 미확인: 복잡한 반환 타입의 별칭 분리, 구체적인 줄 길이 제한, 체이닝 이외의 본문에서 블록을 선택할 기준은 결정하지 않았다.

```ts
interface User {
  name: string;
  isActive: boolean;
}

const getActiveUserNames = (users: readonly User[]): string[] => {
  return users
    .filter(user => user.isActive)
    .map(user => user.name);
};
```

## 최대 3개 인자, 객체 전달과 구조 분해

- 확인 상황: 상품 검색 함수가 검색어, 카테고리, 페이지와 페이지 크기를 네 개의 위치 인자로 받았다.
- 사용자 제안: 인자가 너무 늘어나는 것은 좋지 않으므로 객체로 주고받는 방식을 제안했다.
- 적용: 이처럼 같은 작업에 필요한 여러 입력은 이름 있는 프로퍼티를 가진 객체로 묶어 전달한다.
- 후속 확정: 함수가 받는 최상위 인자는 최대 3개로 제한한다. 각 인자는 객체일 수 있고 최대 3개의 객체를 각각 받을 수 있다. 객체 내부 프로퍼티 수의 제한은 아니다.
- 예외 확정: 의존성 4개를 받는 NestJS 생성자 예시에서 사용자는 개수 제한을 유연하게 적용하도록 했다. DI 생성자에는 3개 제한을 기계적으로 적용하지 않는다.
- 구조 분해 선호: 반환 객체를 `const { items, total } = ...`로 받는 형태에 동의했고, JavaScript의 구조 분해 할당을 매우 선호한다고 명시했다.
- 미확인: 단일 값 반환까지 객체로 감쌀지, 복잡하거나 깊게 중첩된 입력의 구조 분해를 어디까지 사용할지는 결정하지 않았다.

```ts
const { items, total } = await searchProducts({
  query: "키보드",
  categoryId: "electronics",
  page: 1,
  pageSize: 20,
});
```

위 예시는 프로퍼티가 네 개인 객체 하나를 인자로 받으므로 제한에 맞는다. 다음처럼 역할별 객체 세 개를 받는 형태도 허용한다. 세 인자를 채워야 한다는 뜻은 아니다.

```ts
const { items, total } = await searchProducts(
  { query: "키보드", categoryId: "electronics" },
  { page: 1, pageSize: 20 },
  { sortBy: "price", direction: "asc" },
);
```

## 입력 객체의 readonly

- 확인 상황: `ProductSearchInput` 인터페이스의 `query`, `page` 속성에 각각 `readonly`를 붙이고, 함수 입력 객체에 이를 기본으로 사용할지 물었다.
- 사용자 답변: 원본 보존의 의도를 타입에 표현하는 방식에 동의했다.
- 적용: 함수 입력 객체의 속성에는 `readonly`를 기본으로 붙인다. 아래 객체 타입 선언 예시에도 이 후속 선호를 반영했다.
- 미확인: 중첩 객체의 속성까지 읽기 전용으로 표현할 범위는 아직 결정하지 않았다.

```ts
interface ProductSearchInput {
  readonly query: string;
  readonly page: number;
}
```

## 배열 입력의 readonly

- 확인 상황: 가격 배열을 `readonly number[]`로 받고, 복사본을 만들어 정렬하는 함수를 제시했다.
- 사용자 답변: 배열 입력에도 `readonly`를 기본으로 사용하기로 동의했다.
- 적용: 배열 입력은 `readonly T[]`처럼 읽기 전용 타입으로 받고, 변경이 필요한 가공은 새 배열에 적용한다. 앞선 사용자 이름 조회 예시의 배열 입력에도 이 후속 선호를 반영했다.
- 범위: 배열 안 객체의 속성까지 읽기 전용으로 선언하는 규칙은 아직 확정하지 않았다.

```ts
const getSortedPrices = (prices: readonly number[]): number[] => {
  return [...prices].sort((left, right) => left - right);
};
```

## TypeScript 객체 타입 선언

- 확인 과정: 처음에는 객체 타입 선언 방식에 특별한 선호가 없다고 답했지만, `type`과 `interface`의 선택을 묻는 질문임을 이해한 뒤 선호를 정정했다.
- 확정 선호: 객체 구조는 `interface`로 정의한다. 복잡한 타입을 다뤄야 할 때는 `type`을 사용한다.
- 합성 선호: 여러 인터페이스를 합성하는 경우에는 `type Combined = A & B`처럼 교차 타입으로 표현하는 것을 선호한다.
- 적용 예시: 검색 조건 같은 객체는 `interface`, 상태 값의 유니언 같은 타입 표현은 `type`으로 작성한다.

```ts
interface SearchParams {
  readonly query: string;
  readonly categoryId?: string;
}

interface Pagination {
  readonly page: number;
  readonly pageSize: number;
}

type ProductSearchInput = SearchParams & Pagination;

type SearchStatus = "idle" | "loading" | "success" | "error";
```

## enum과 as const 객체의 선택

- 확인 과정: 상태별 표시 문구를 객체로 매핑한 예시에서 사용자는 enum과 `as const` 객체의 트레이드오프를 비교해 선택하자고 요청했다. 상황별 선택 기준을 설명한 뒤 그 기준을 채택했다.
- 기본 선택: 새 프로젝트에서 런타임 상수가 필요한 단순 선택값, 공유할 문자열 코드와 표시 정보는 `as const` 객체를 기본으로 사용하고 필요한 값 타입을 도출한다.
- enum 선택: 계정 상태와 구독 상태처럼 서로 다른 도메인의 값을 타입으로 구분해야 하거나, 기존 프로젝트가 enum 계약과 규칙으로 통일되어 있으면 문자열 `enum`을 사용한다.
- 후속 확정: 사용자는 enum을 쓸 때 반드시 문자열 enum을 사용한다고 명시했다. 모든 멤버가 문자열 값을 가져야 하며, 숫자 enum과 문자열, 숫자를 섞은 혼합 enum은 사용하지 않는다.
- 타입 구분의 판단 기준: 서로 다른 개념이 같은 문자열을 사용하는지, 그 값들이 같은 호출 흐름에서 혼용될 가능성이 있는지, 잘못 바꿔 전달하면 업무 결과가 달라지는지를 함께 확인한다. 사용자는 이 구체적인 기준의 기록을 요청했다.
- 확인 예시: 계정 상태와 구독 상태가 모두 `active`/`inactive`를 쓸 때 `isAccountActive(subscription.status)` 같은 잘못된 전달을 막으려면 별도 문자열 enum으로 구분한다. 여러 목록에서 같은 정렬 방향을 뜻하는 `asc`/`desc`처럼 의미가 같고 호환되는 것이 자연스러운 값은 `as const`를 사용한다.
- 리치 도메인과의 연결: 상태를 객체 내부에 두고 `account.isActive()` 같은 메서드를 사용하면 상태값을 직접 잘못 전달할 지점이 줄어든다. 이미 객체가 상태를 감싸고 있는지도 확인하고, 추가 enum 구분이 필요한지는 실제 호출부를 보고 판단한다.
- 판단 범위: 사용자는 성능과 편의성 사이에서 고민했다고 밝혔다. 채택한 기준은 타입 구분, 문자열 호환성과 기존 계약의 일관성에 관한 것이며, 어느 방식이 더 빠르거나 번들이 더 작다는 측정 결과는 아니다. 타입만 필요한 기존 문자열 유니언을 모두 런타임 객체로 바꾸는 규칙도 아니다.
- 관련 지식: [[TS-Enum-Antipattern|TypeScript enum과 대안 선택]].

## 일반 함수와 메서드 문법을 선택할 기술 조건

화살표 함수 선호에 적용할 언어와 API 계약, 실행 확인과 공식 출처는 [[Coding-Preferences-Function-Forms|함수 문법 선택의 기술 조건]]에 둔다.

## 주석의 사용

- 확인 상황: `MAX_CONCURRENT_REQUESTS = 3`에 외부 API의 동시 요청 제한에 맞춘 값이라는 주석을 붙였다.
- 사용자 답변: 예시에 동의했고, 주석을 남기는 것을 좋게 본다고 답했다.
- 적용: 주석 사용을 긍정적으로 보며, 코드의 이유나 외부 제약을 설명하는 주석도 선호한다.
- 후속 확정: 함수 설명과 `@param`, `@returns`를 포함한 JSDoc 예시에서 처음에는 인자와 반환값 설명의 필요성을 의문시했지만, 이후 JSDoc에도 남기기로 정정했다. TypeScript에서도 JSDoc에 함수 설명과 인자, 반환값 설명을 남긴다.
- 경계 확인: `const isEmpty = (value: string): boolean => value.length === 0;`처럼 짧고 동작이 자명한 내부 함수에까지 JSDoc을 붙이는 것은 과하다고 답했다. 이런 함수에는 JSDoc을 생략한다.

## 출처

- 2026-09-12 사용자와의 코딩 취향 확인 대화. 사례별 답변, 도메인 책임 원칙에 대한 동의, 화살표 함수와 반환 타입에 대한 후속 답변을 근거로 기록했다.
- [사용자 선호 정본](../../../AGENTS.md#개인-코딩-선호).

## 관련 문서

- [[코드품질(CodeQuality)|코드 품질]]
- [[Coding-Preferences-Function-Forms|함수 문법 선택의 기술 조건]]
- [[Responsibility-Driven-Design|책임 주도 설계와 GRASP]]
- [[Object-Design-Principles|객체 설계 원칙과 리팩터링]]
- [[Strategy패턴이란|전략 패턴]]
- [[OOP-vs-Procedural-In-Practice|리치 도메인과 절차지향의 적용 조건]]
- [[DDD|도메인 서비스와 Aggregate]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[JavaScript-this-and-Function-Invocation|this와 호출 방식]]
- [[JavaScript-Class-Semantics|클래스 메서드와 인스턴스 필드]]
- [[Coding-Preferences|개인 코딩 선호 목차]]
