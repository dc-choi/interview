---
tags: [cs, javascript, scope, arrow-function, destructuring, spread]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Modern Syntax", "JavaScript 렉시컬 스코프와 모던 문법"]
---

# JavaScript 렉시컬 스코프와 모던 문법

`let`/`const`, arrow function, spread/rest와 destructuring은 단순 축약 문법이 아니다. binding 범위, `this`, 순회 protocol과 property 복사 규칙을 바꾸므로 실행 의미를 기준으로 선택한다. ES6+는 ES2015 이후 기능을 묶어 부르는 관용 표현이며 현재 ECMAScript는 매년 갱신되는 living specification으로 확인한다.

## 실행 환경과 strict mode

ECMAScript는 언어를 정의하고 browser/Node.js 같은 host가 global object, module loading, timer와 I/O를 제공한다. 같은 문법도 classic script, ESM과 CommonJS wrapper에서 top-level binding이 다르다.

- ESM과 class body는 자동으로 strict mode다.
- 일반 classic script가 ES2015 문법을 쓴다고 자동으로 strict mode가 되지는 않는다.
- classic browser script의 top-level `var`는 global object property가 될 수 있지만 top-level `let`/`const`는 global lexical binding이다.
- 여러 classic script는 global environment를 공유한다. 격리가 필요하면 ESM을 사용한다.
- Node.js CommonJS의 top level은 module wrapper 안이고 ESM은 별도 module scope다.

`object`, `instance`, `property`, `function`, `method`를 혼용하지 않는다. 특히 callable value가 property에 들어 있다는 사실과 method definition 문법/내부 의미가 항상 같지는 않다.

## let, const와 TDZ

`let`과 `const`는 block-scoped lexical declaration이다. `if`, loop, `switch`, `try/catch`의 block마다 같은 이름을 별도 binding으로 가질 수 있다.

```ts
for (let index = 0; index < 3; index++) {
  queueMicrotask(() => console.log(index));
}
```

lexical declaration도 scope 시작부터 binding은 존재하지만 선언 평가 전까지 초기화되지 않은 TDZ에 있다. 따라서 호이스팅되지 않는다고 외우기보다 선언 전 접근이 `ReferenceError`라는 의미를 기억한다.

`const`는 binding 재할당을 막을 뿐 object 내부를 freeze하지 않는다. 기본은 `const`, 의도적인 재할당만 `let`을 사용하고 immutable value가 필요하면 별도 data design을 적용한다.

## arrow function의 lexical binding

arrow function은 자체 `this`, `arguments`, `super`, `new.target` binding을 만들지 않고 바깥 lexical environment에서 해석한다.

```ts
class Counter {
  value = 0;
  incrementLater() {
    queueMicrotask(() => this.value++);
  }
}
```

- `call`, `apply`, `bind`로 arrow function의 `this`를 바꿀 수 없다.
- constructor가 아니므로 `new`와 함께 쓸 수 없고 ordinary function처럼 `prototype` property를 갖지 않는다.
- 자체 `arguments`는 없지만 enclosing non-arrow function의 `arguments`가 있으면 lexical lookup으로 읽을 수 있다. 항상 `ReferenceError`라고 단정하지 않는다.
- 인자 목록이 필요하면 실제 Array인 rest parameter를 사용한다.
- concise body에서 object literal을 반환할 때는 `() => ({ id: 1 })`처럼 괄호로 감싼다.

object method처럼 dynamic receiver가 필요한 곳에는 method syntax를, callback에서 바깥 context를 유지할 때는 arrow function을 우선한다.

## spread와 rest

같은 `...`라도 문맥별 protocol이 다르다.

| 문맥 | 입력/결과 |
|---|---|
| array/call spread | iterable을 개별 값으로 소비 |
| object spread | enumerable own string/symbol property를 얕게 복사 |
| rest parameter | 남은 argument를 새 Array로 수집 |
| destructuring rest | 남은 element/property를 새 container로 수집 |

array-like는 `length`와 index property를 가진 구조이고 iterable은 `[Symbol.iterator]`를 제공하는 구조다. 둘은 겹칠 수 있지만 동의어가 아니다. object spread는 iterator를 쓰지 않으며 descriptor와 prototype을 보존하지 않는다.

## destructuring과 default

```ts
function connect({ host, port = 5432 }: Options) {
  // ...
}
```

- default initializer는 값이 `undefined`일 때만 실행된다. `null`, `0`, `false`는 보존된다.
- computed key, rename과 nested pattern은 가능하지만 실패 위치가 숨으면 단계별 validation이 낫다.
- parameter destructuring 전에 외부 입력 schema를 검증한다.
- object shorthand/computed property는 key 생성 문법이며 duplicate key는 뒤 정의가 앞 값을 덮을 수 있다.

## for...of와 for...in

`for...of`는 iterable의 값을 소비하고 조기 종료 때 iterator cleanup을 수행할 수 있다. `for...in`은 object의 enumerable string property name을 inherited property까지 대상으로 삼는다. 일반 record의 own key가 필요하면 `Object.keys`, `values`, `entries` 또는 `Reflect.ownKeys` 중 key/descriptor 요구에 맞게 고른다.

trailing comma는 diff를 안정화하지만 rest element 뒤에는 둘 수 없다. exponentiation은 우결합이고 unary expression을 왼쪽 피연산자로 바로 두는 문법 제약이 있다. optional catch binding은 error를 정말 사용하지 않을 때만 생략한다.

## getter와 setter

accessor는 property 문법으로 계산과 validation을 연결한다. I/O나 큰 계산을 getter에 숨기면 caller가 비용/실패를 알기 어렵다. setter만으로 domain invariant를 흩뜨리기보다 명시적 command method나 immutable update가 더 적합한지 비교한다.

## TypeScript/NestJS 적용

- DTO destructuring 전에 pipe/schema validation을 통과시킨다.
- provider method를 callback으로 넘길 때 `this`를 잃는지 확인한다.
- object spread로 entity를 복제하면 prototype, private state와 descriptor가 사라질 수 있으므로 mapper를 둔다.
- `const`를 domain immutability와 동일시하지 말고 readonly type, constructor invariant와 persistence update 정책을 함께 쓴다.

## 출처

- [ECMAScript Language Specification, declarations and variables](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html)
- [ECMAScript Language Specification, arrow function definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-arrow-function-definitions)
- [ECMAScript Language Specification, destructuring assignment](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-destructuring-assignment)
- 과정/용어: [범위](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30717), [ECMAScript spec](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30718), [용어](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=35015)
- lexical declaration: [global/strict](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30720), [block 종류](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30722), [let scope](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30721), [let/var](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30723), [global this](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30724), [여러 script](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30725), [TDZ](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30726), [const](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30727)
- arrow function: [문법](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30729), [arguments/constructor](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30730), [lexical this](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30731), [instance/bind](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30732)
- modern syntax: [spread](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30738), [rest](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30739), [array destructuring](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30741), [object/parameter destructuring](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30742), [computed property](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30743), [default](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30745), [for...of](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30747), [기타 문법](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30749), [getter/setter](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30751)

## 관련 문서

- [[Variable-Declarations|var, let, const]]
- [[Hoisting|호이스팅과 TDZ]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[JavaScript-ES-Modules|ES Modules]]
- [[Object-Property-Descriptor|property descriptor]]
