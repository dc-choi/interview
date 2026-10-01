---
tags: [cs, javascript, functional, iterable, iterator, generator]
status: done
verified_at: 2026-09-28
category: "CS - JavaScript"
aliases: ["JavaScript Iterable Pipelines", "이터러블 함수형 파이프라인"]
---

# JavaScript 이터러블 함수형 파이프라인

이터러블 프로그래밍은 반복문의 의도를 `filter`, `map`, `take`, `reduce` 같은 작은 연산으로 분해하는 방식이다. 함수 이름이 아니라 서로 다른 자료형을 같은 순회 계약으로 연결하고 평가 시점과 효과의 경계를 드러내는 방식이 중요하다.

## 이터러블과 이터레이터 계약

- iterable은 `[Symbol.iterator]()`가 iterator를 반환하는 값이다.
- iterator의 `next()`는 `{ value, done }` 형태의 결과를 반환한다.
- generator 함수는 호출할 때 generator object를 만들며, 이를 통해 복잡한 제어 흐름도 iterator 계약으로 노출할 수 있다.
- Array, String, Map, Set과 여러 DOM collection은 iterable이지만, 일반 object는 그대로는 iterable이 아니다.

```ts
function* values<T>(record: Record<string, T>): IterableIterator<T> {
  for (const key of Object.keys(record)) yield record[key];
}

for (const value of values({ a: 1, b: 2 })) {
  console.log(value);
}
```

사용자 정의 collection은 `[Symbol.iterator]()`를 구현해 표준 소비자인 `for...of`, spread, `Array.from`과 여러 라이브러리 파이프라인에 참여할 수 있다. 한 번만 소비되는 iterator인지 매번 새 iterator를 만드는 reusable iterable인지도 API 계약에 밝혀야 한다.

## 반복문을 연산의 의도로 분해한다

| 명령형 역할 | 파이프라인 역할 | 의미 |
|---|---|---|
| 조건문으로 건너뛰기 | `filter` | 선택 |
| 임시 변수에 변환값 할당 | `map` | 변환 |
| 일정 개수 뒤 `break` | `take` 계열 | 조기 종료 |
| 누적 변수 갱신 | `reduce` | 하나의 결과로 접기 |
| 반복 횟수 제어 | `range` 계열 | 작업 후보 생성 |
| 출력, 저장, DOM 변경 | `forEach`/`each` | 효과 실행 |

`range`, lazy `map`, `take`는 ECMAScript의 모든 버전에 공통인 기본 API가 아니라 라이브러리 또는 최신 iterator helper 지원 여부에 따라 달라진다. 배열 메서드는 보통 eager하고 generator 기반 연산은 필요할 때 값을 만든다.

```ts
const total = numbers
  .filter((n) => Math.abs(n % 2) === 1) // -3 % 2는 -1이라 부호를 떼고 비교해야 음수 홀수가 남는다
  .map((n) => n * n)
  .slice(0, limit)
  .reduce((sum, n) => sum + n, 0);
```

이 구조의 장점은 각 단계가 선택, 변환, 제한, 축약 중 무엇을 하는지 보인다는 점이다. 짧다는 사실보다 변경 지점이 분리된다는 사실이 중요하다.

## reduce를 만능 반복문으로 쓰지 않는다

`reduce`는 이전 상태와 현재 값을 결합하는 fold에 적합하다. 하지만 선택, 변환, 객체 조립과 예외 처리를 하나의 accumulator callback에 몰아넣으면 내부가 다시 명령형 반복문이 된다.

- 출력 형식을 먼저 `map`으로 통일한다.
- 제외 조건은 `filter`로 드러낸다.
- 마지막 축약만 `reduce` 또는 `join`에 맡긴다.
- accumulator mutation이 필요하면 함수 계약과 초기값을 명시한다.

query string은 수동 `split('&')`보다 `URLSearchParams`를 우선 검토한다. 표준 parser가 percent encoding, `+`, 빈 값과 중복 key를 정의하기 때문이다. 반대로 임의 형식의 serializer를 만드는 일이라면 정렬, 중복 key와 encoding 정책을 별도로 정한다.

## 지연 평가는 선택적 실행 전략이다

generator 기반 파이프라인은 `take(3)`이 요구한 값까지만 앞 단계를 당겨올 수 있다. 무한 sequence나 비싼 원천에서는 유용하지만 항상 빠르다는 뜻은 아니다.

- 작은 배열은 generator와 함수 호출 overhead가 더 클 수 있다.
- 이미 만들어진 Promise를 iterator에 넣는다고 비동기 작업이 지연 시작되지는 않는다.
- DB cursor, file handle처럼 resource를 가진 iterator는 조기 종료 때 `return()`과 정리 경로가 필요하다.
- 성능 판단은 중간 allocation, 처리량, 지연과 메모리를 실제 workload로 측정한다.

## 객체를 entry stream으로 바꾼다

`Object.entries()`는 enumerable own string-keyed property를 `[key, value]` 배열로 만든다. symbol key는 포함하지 않는다. `Object.fromEntries()`는 iterable의 pair를 object로 되돌리며 같은 key가 반복되면 뒤의 값이 앞의 값을 대체한다.

```ts
const mapObject = <T, R>(
  source: Record<string, T>,
  f: (value: T, key: string) => R,
): Record<string, R> =>
  Object.fromEntries(Object.entries(source).map(([k, v]) => [k, f(v, k)]));
```

- `pick`은 존재하지 않는 key를 생략할지 `undefined`로 보존할지 정한다.
- `indexBy`는 duplicate key를 reject할지, 첫 값을 유지할지, 마지막 값으로 덮을지 정한다.
- `Map`은 임의 타입 key와 삽입 순회 순서가 필요할 때 object보다 명시적이다.
- entry 변환은 편리하지만 descriptor, prototype과 symbol metadata를 자동 보존하지 않는다.

## flatten과 pipeline 재작성의 조건

`flatMap`은 각 값을 여러 값으로 바꾼 뒤 한 단계 평탄화하지만 무엇을 펼치는지는 API마다 다르다. ES2025의 `Iterator.prototype.flatMap`은 callback이 반환한 iterator나 iterable을 펼치고 문자열을 포함한 원시값은 `TypeError`로 거부한다. `Array.prototype.flatMap`은 반환값이 배열일 때만 펼치고 `Set`이나 문자열 같은 다른 iterable과 배열이 아닌 값은 요소 하나로 넣는다. generator로 직접 만든 `flatMap`은 구현에 따라 문자열까지 펼치거나, iterable이 아닌 값을 그대로 내보내거나 `TypeError`로 거부하므로 펼칠 대상을 계약으로 정한다(Node.js 26.7 확인). 재귀적인 deep flatten은 별도 연산이며 문자열 같은 iterable까지 펼칠지, 순환 구조와 최대 깊이를 어떻게 처리할지 계약이 필요하다.

generator의 `yield* iterable`은 값 위임뿐 아니라 대상 iterator의 `next`, `throw`, `return` protocol과 연결된다. 단순 값 순회에서는 `for...of`와 비슷해 보여도 완전히 같은 문법적 치환으로 설명하면 예외/종료 전달을 놓친다.

eager와 lazy pipeline의 결과가 같아지려면 callback이 순수하고 종료하며, 평가 횟수/순서와 예외 시점 차이가 관찰되지 않아야 한다. I/O, mutation, random/time, `take`와 async callback이 섞이면 map/filter의 순서를 바꾸거나 fusion해도 같은 프로그램이라고 단정할 수 없다.

## 안전한 합성은 실패 타입을 드러내는 일이다

배열의 `map`은 0개, 1개, 여러 값에 같은 변환을 적용하지만 이것만으로 모나드 합성이 완성되는 것은 아니다. `map`은 functor 연산이고, 중첩 context를 평탄화하는 `flatMap`과 법칙까지 구분해야 한다.

`find` 자체가 위험한 것도 아니다. 결과가 `T | undefined`인데 호출자가 이를 무시하는 것이 문제다.

```ts
const found = users.find((user) => user.id === id);
if (!found) return { ok: false, reason: "NOT_FOUND" } as const;
return { ok: true, value: normalize(found) } as const;
```

빈 배열로 0 또는 1개 결과를 표현할 수도 있지만, 도메인 실패 이유가 필요하면 `Result`/`Option` 같은 명시적 타입이 더 잘 맞는다.

## 효과의 경계를 이름과 타입으로 보인다

`each`라는 이름은 로그, 저장, DOM 변경 같은 terminal effect를 모으는 관례가 될 수 있다. 그러나 함수가 입력을 그대로 반환한다는 사실만으로 실제 effect가 있다는 것을 증명하지는 못한다.

- 변환 함수는 가능하면 입력과 출력만 가진다.
- effect 함수는 실패, 재시도와 순서 요구를 타입 또는 이름으로 노출한다.
- lazy pipeline 안에 숨은 effect는 일부 값만 소비될 때 실행되지 않을 수 있다.
- pure core가 실행 계획을 만들고 imperative shell이 외부 I/O를 수행하게 나누면 테스트가 쉬워진다.

## 항등원, materialization과 조회 비용

원소를 숫자나 문자열로 먼저 map하면 마지막 fold는 같은 type 두 값을 합치는 작은 연산이 된다. 빈 원천을 허용하면 덧셈 0, 문자열 연결 '', 객체 병합 {} 같은 항등원을 초기값으로 둔다. native reduce는 callback에 accumulator, value 외에도 index와 원본 배열을 넘긴다. Object.assign처럼 가변 인자를 받는 함수를 그대로 callback으로 전달하면 의도하지 않은 값까지 병합하므로 wrapper로 두 인자를 명시한다.

문자열 조각은 join(separator)이 원소 사이에만 구분자를 넣어 앞뒤 구분자 분기를 없앤다. query에는 URLSearchParams를 쓰되 undefined/null을 생략할지는 pair를 만들기 전에 정한다. 표준 serializer도 이 값을 문자열로 바꿀 수 있다.

Object.entries는 먼저 모든 pair 배열을 만들고, Object.keys를 쓰는 generator도 key 배열은 만든다. lazy로 아끼는 것은 뒤쪽 value 읽기, pair 생성과 callback 실행이지 모든 원천 allocation이 아니다. getter나 순회 중 mutation이 있으면 eager와 lazy의 관찰 시점도 달라진다.

pick은 요청한 k개 key를 기준으로 순회하면 k번 조회다. 값이 undefined인 own key와 부재를 구분해야 하면 Object.hasOwn을 쓴다. n개 목록을 m번 find하는 대신 index를 한 번 만들면 평균 조회 비용을 줄이지만 O(n) 저장과 갱신 비용이 추가된다. 조회 한 번이면 index가 더 비쌀 수 있다. indexBy의 중복 key 정책과 prototype pollution도 입력 경계에서 정한다.

class method 내부에 pipeline을 쓰거나 class가 Symbol.iterator를 제공하는 것은 객체지향 불변식과 공존한다. 내부 배열 iterator를 그대로 반환하면 원소 참조가 외부로 노출되므로 container와 원소 mutation 정책을 따로 정한다.

## 소비자에서 시작하는 평가

lazy range -> map(+10) -> 홀수 filter -> take(2)는 소비자가 값을 요청할 때 원천으로 거슬러 올라가고, 값은 다시 map/filter를 지나 내려온다. 0부터 9까지 원천에서 결과 [11,13]을 얻으면 0부터 3까지만 읽어 map/filter 각 4회다. eager 배열은 원천 10개를 먼저 만들고 map/filter도 10회 수행한다. 순수하고 종료하는 callback에서만 이 재작성의 결과 동등성을 가정한다.

lazy 연산에 terminal 수집을 붙여 eager 버전을 만들 수 있다. 하지만 take가 배열을 돌려주는 library와 iterator를 돌려주는 표준 Iterator.take는 평가 경계가 다르므로 이름보다 반환 계약을 본다. deep flatten이 모든 iterable을 재귀 전개하면 한 글자 문자열도 자신을 다시 내놓아 끝나지 않는다. 문자열은 먼저 원자값으로 분기하고 깊이/순환 정책을 둔다. flatMap의 필요를 JavaScript 전체가 eager하기 때문이라고 단정하지 않는다.

## 출처

- 인프런 보충 강의: [이미지 목록 그리기](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20519)
- 인프런 보충 강의: [지연 평가 + Promise - L.map, map, take](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16625)

- [ECMAScript Language Specification, common iteration interfaces](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-common-iteration-interfaces)
- [ECMAScript Language Specification, generator function definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-generator-function-definitions)
- [ECMAScript Language Specification, Object.entries](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.entries)
- [ECMAScript Language Specification, Object.fromEntries](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.fromentries)
- [ECMAScript Language Specification, yield star](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-generator-function-definitions-runtime-semantics-evaluation)
- [ECMAScript Language Specification, Number::remainder](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-remainder)
- [ECMAScript Language Specification, Array.prototype.flatMap](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.flatmap)
- [ECMAScript 2025 Language Specification, Iterator.prototype.flatMap](https://tc39.es/ecma262/2025/#sec-iterator.prototype.flatmap)
- 이터러블 전환: [도입](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19648), [명령형 예제](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19650), [filter](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19651), [map](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19652), [take](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19653), [reduce](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19654), [range](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19655), [each](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19656), [별 그리기](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19657), [구구단](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19658)
- reduce 경계: [map 후 reduce](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19660), [map/filter/reduce](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19661), [query 1/2](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19662), [query 3/4](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19666), [queryToObject](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19667)
- 안전한 합성: [map 합성](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19664), [find와 lazy filter](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19665)
- 객체: [도입](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19669), [values](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19670), [entries](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19671), [keys](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19672), [generator 확장](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19673), [object](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19674), [mapObject](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19675), [pick](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19676), [indexBy](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19677), [indexed filter](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19678)
- 사용자 정의 iterable: [Map/Set/NodeList](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19680), [Model/Collection](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19681), [Product/Products](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19682)
- 기본 iterable: [for...of](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16568), [Array/Set/Map](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16569), [사용자 정의 iterable](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16570), [spread](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16571), [generator](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16573), [무한 sequence](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16574), [구조 분해](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16575)
- map/filter/reduce: [map](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16577), [iterable map 1](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16578), [iterable map 2](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16579), [filter](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16580), [reduce 1](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16581), [reduce 2](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16582), [중첩 pipeline](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16583)
- 지연성 1: [range](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16594), [측정](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16595), [take](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16596), [generator lazy](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16597), [lazy map](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16598), [lazy filter](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16599), [pipeline 비교](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16600), [평가 순서](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16601), [효율성](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16602), [재작성 법칙](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16603), [표준 protocol 조합](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16604)
- 지연성 2: [terminal operator](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16606), [query string](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16607), [iterable join](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16608), [find](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16609), [eager wrapper](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16610), [flatten](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16611), [yield/deep flatten](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16612), [flatMap](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16613), [2차원 배열](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16614), [실무 pipeline](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16615)

## 관련 문서

- [[JavaScript-Iterator-and-Generator-Protocol|JavaScript Iterator와 Generator protocol]]
- [[JavaScript-Async-Iterable-Pipelines|JavaScript 비동기 이터러블 파이프라인]]
- [[JavaScript-Function-Composition-and-Currying|JavaScript 함수 합성과 커링]]
- [[Declarative-Programming|선언형 프로그래밍]]
- [[Monads-In-TypeScript|TypeScript 모나드]]
- [[Controllability-Functional-Core|제어 가능성과 Functional Core]]
