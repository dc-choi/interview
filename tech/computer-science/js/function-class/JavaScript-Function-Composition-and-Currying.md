---
tags: [cs, javascript, functional, composition, higher-order-function, currying]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Function Composition", "JavaScript 함수 합성과 커링"]
---

# JavaScript 함수 합성과 커링

JavaScript에서 함수는 변수에 저장하고, 인자로 전달하고, 결과로 반환할 수 있는 일급 값이다. 이 성질을 이용하면 반복되는 제어 구조를 고차 함수로 추출하고 작은 변환을 pipeline으로 조합할 수 있다.

## 평가, 일급 함수와 고차 함수

- 평가는 expression과 statement가 실행되어 값이나 effect를 만드는 과정이다.
- 일급 함수는 함수가 다른 값과 같은 방식으로 저장, 전달, 반환될 수 있다는 언어 능력이다.
- 고차 함수는 함수를 인자로 받거나 함수를 반환한다.
- 반환된 함수가 lexical environment를 참조하면 closure를 통해 그 binding을 계속 사용할 수 있다.

```ts
const multiplyBy = (factor: number) => (value: number) => factor * value;
const double = multiplyBy(2);
```

모든 고차 함수가 좋은 abstraction인 것은 아니다. callback의 호출 횟수, 순서, 동기/비동기 여부, 오류 전파와 effect를 계약으로 설명할 수 있어야 한다.

## 즉시 실행과 함수 합성을 구분한다

라이브러리에서 흔히 `go`라고 부르는 helper는 초기값에 함수를 즉시 연속 적용한다. `pipe`/`flow`는 함수 목록을 받아 나중에 호출할 새 함수를 만든다. 두 이름 모두 ECMAScript 표준 API는 아니다.

```ts
const pipe = <A>(...steps: Array<(value: A) => A>) =>
  (initial: A): A => steps.reduce((value, step) => step(value), initial);

const normalize = pipe(trim, lower, slugify);
```

실무에서는 각 단계의 입력과 출력 타입이 맞는지, 어떤 단계가 외부 I/O를 하는지, 오류가 throw/rejection/Result 중 무엇으로 흐르는지가 더 중요하다. type-safe composition이 필요하면 overload나 variadic tuple 기반 helper, 검증된 library를 사용한다.

## currying과 partial application

currying은 여러 인자를 받는 함수를 인자 하나씩 받는 함수의 연쇄로 바꾼다.

```ts
const add = (a: number) => (b: number) => a + b;
```

partial application은 일부 인자를 미리 고정해 더 적은 인자를 받는 함수를 만든다.

```ts
const addTax = (rate: number, amount: number) => amount * (1 + rate);
const addVat = (amount: number) => addTax(0.1, amount);
```

JavaScript library의 `curry`가 두 번째 호출에 나머지 인자 여러 개를 받는다면 엄밀한 currying보다 편의형 partial application에 가깝다. 자동 currying은 함수의 `length`, optional/rest parameter와 default parameter에서 예상과 다르게 작동할 수 있어 팀 API에서는 명시적 closure가 더 읽기 쉬울 수 있다.

## iterable을 받는 함수와 Array method

`Array.prototype.map`은 Array와 array-like receiver의 index/length를 기준으로 동작한다. 임의 iterable 전체를 직접 받는 함수는 아니다. library의 독립 `map(f, iterable)`이나 현재 runtime의 iterator helper는 Map, Set, generator 같은 iterable에 동일한 pipeline vocabulary를 제공할 수 있다.

- 표준 Array method와 library helper의 입력 범위를 구분한다.
- eager Array 결과와 lazy iterator 결과를 타입에 드러낸다.
- callback이 async이면 Array `map`의 결과는 `Promise[]`이며 별도 대기와 concurrency policy가 필요하다.
- operator 이름이 같아도 error/skip/order semantics가 같은지 확인한다.

## pipeline의 읽기 비용을 관리한다

함수 합성은 오른쪽에서 왼쪽으로 겹친 호출을 왼쪽에서 오른쪽 data flow로 바꿀 수 있다. 반대로 지나친 point-free style은 어떤 data와 domain rule을 처리하는지 숨긴다.

- domain 의미가 있는 중간값에는 이름을 붙인다.
- pipeline 안에서 mutation과 I/O가 시작되는 지점을 분리한다.
- 한 단계가 여러 정책을 처리하면 함수보다 정책 object나 application service가 낫다.
- debugger와 stack trace에서 단계를 식별할 수 있게 named function을 활용한다.
- 단순한 세 단계라면 helper 없이 지역 변수와 직접 호출이 더 명확할 수 있다.

## 장바구니 예제에서 지켜야 할 경계

`filter -> map -> reduce`는 선택 상품의 수량/가격 합계를 표현하기 좋다. 하지만 UI 예제가 production commerce invariant를 대신하지는 않는다.

- 금액은 부동소수점이 아닌 minor unit integer 또는 통화 scale을 아는 decimal로 계산한다.
- 수량, 가격과 할인은 server에서 다시 검증한다.
- 빈 cart의 identity를 명시해 `reduce` 초기값 누락 오류를 피한다.
- template literal은 HTML escaping을 하지 않으므로 외부 값은 `textContent`나 sanitizer를 거친다.
- 표시 합계와 결제 승인 금액은 같은 server-side price snapshot에서 유도한다.

## 언제 쓰는가

함수 합성이 잘 맞는 영역은 parsing, validation, normalization, collection transform과 순수한 pricing policy다. transaction, retry, cancellation과 권한처럼 제어 흐름이 핵심인 영역은 pipeline에 숨기지 말고 명시적인 application workflow로 둔다.

## 정책을 먼저, 데이터를 나중에

부분 적용용 helper는 `map(f, iterable)`, `take(limit, iterable)`처럼 정책을 먼저 받고 data를 마지막에 두면 `map(price)`가 다음 data를 기다리는 단계가 된다. pipe의 첫 함수는 여러 인자를 받을 수 있고 이후 함수는 앞 결과 하나를 받는다. 강의의 두 번 호출하는 curry helper를 임의 arity, default/rest까지 지원하는 표준 연산으로 간주하지 않는다.

confirm/alert가 버튼 수, label와 결과값만 다르면 버튼 사양을 인자로 받고 부분 적용해 변형을 만든다. 상태, 수명이나 실패 처리가 달라지면 전략 객체와 명시적인 workflow를 비교한다. 숫자 합계는 projection과 초기값 0을, 문자열 조각은 join('')을 써 재사용 단위와 type을 명확히 한다. 배열을 template expression에 넣으면 원소 사이 쉼표가 자동 삽입된다.

Array map은 async callback의 Promise를 그대로 모아 Promise[]를 만들고 배열 자체에 await해도 원소는 풀리지 않는다. `await Promise.all(items.map(f))` 또는 bounded scheduler를 쓴다. async predicate를 filter에 주면 Promise가 truthy라 모두 남으며, async reduce도 accumulator의 Promise를 callback이 직접 처리해야 한다. callback을 async로 선언하는 것만으로 소비자가 비동기 계약을 갖지는 않는다.

## 출처

- 인프런 보충 강의: [커스텀 confirm 창과 Promise](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20522), [클래스를 대신 함수로 하는 추상화](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20523)
- 인프런 보충 강의: [reduce](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16581), [(QnA) Array.prototype.map이 있는데 왜 FxJS의 map 함수가 필요한지?](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16637)

- [ECMAScript Language Specification, function definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions)
- [ECMAScript Language Specification, Array.prototype.map](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.map)
- 기본기: [평가와 일급](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16564), [일급 함수](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16565), [고차 함수](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16566)
- 합성: [go](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16585), [pipe](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16586), [가독성](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16587), [curry](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16588), [함수 조합](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16589)
- 장바구니: [수량/가격 합계](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16591), [HTML 출력](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16592)

## 관련 문서

- [[Functional-Data-Structures|함수형 자료구조 (불변 리스트 조작 함수의 합성)]]
- [[JS-Function-Forms|JavaScript 함수 형태와 일급 함수]]
- [[JavaScript-Iterable-Functional-Pipelines|JavaScript 이터러블 함수형 파이프라인]]
- [[JavaScript-Async-Iterable-Pipelines|JavaScript 비동기 이터러블 파이프라인]]
- [[Function-Types-And-Currying|함수 타입과 커링]]
- [[Controllability-Functional-Core|제어 가능성과 Functional Core]]
