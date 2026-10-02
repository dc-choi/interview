---
tags: [cs, javascript, array, mutation, iteration, sorting]
status: done
verified_at: 2026-09-27
category: "CS - JavaScript"
aliases: ["JavaScript Array Mutation Iteration Sorting", "JavaScript 배열 변경 순회 정렬"]
---

# JavaScript Array 변경, 순회와 정렬

Array는 순서가 있는 indexed collection이지만 언제나 빽빽한 목록은 아니다. `length`, 빈 slot, mutation과 callback 순회 규칙을 함께 알아야 데이터 유실과 순서 오류를 피할 수 있다.

## 생성, index와 length

```ts
Array(3);       // length 3, 세 개의 empty slot
Array.of(3);    // [3]
[undefined];    // 값 undefined가 있는 한 칸
```

- array index는 숫자로 바꿨다가 다시 문자열로 바꿔도 같은 문자열이 되는 0 이상 2^32 - 2 이하 정수 key다. `length`는 모든 index보다 크며 index를 추가하면 필요할 때 그 index + 1로 늘어나지만, `length`를 직접 늘리면 가장 큰 index + 1보다 커질 수 있다. `'01'`, `'-1'`, `'1.5'`, `'foo'`와 `'4294967295'`(2^32 - 1)는 일반 property라 `length`를 바꾸지 않고 index 기반 method의 순회에서도 빠진다.
- `length`는 element 개수와 항상 같지 않다. sparse array에는 중간 slot이 없을 수 있다.
- `length`를 줄이면 범위 밖 element가 삭제되고 늘리면 empty slot이 생긴다. 0 이상 2^32 - 1 이하 정수가 아닌 길이(`new Array(1.5)`, `new Array(2 ** 32)`, `arr.length = -1`)는 `RangeError`다.
- `Array.isArray`는 `typeof value === "object"`나 `instanceof`보다 array 판별 의도를 정확히 드러낸다. `instanceof`는 Realm 경계를 넘으면 실패할 수 있다.
- 다차원 배열은 별도 행렬 타입이 아니라 array 안에 array를 넣은 구조다. shape invariant를 application이 검증한다.

## 추가, 삭제와 원본 변경

| 작업 | method | 원본 변경 | 반환 |
|---|---|---|---|
| 뒤 추가/삭제 | `push`/`pop` | O | 새 length/삭제 값 |
| 앞 추가/삭제 | `unshift`/`shift` | O | 새 length/삭제 값 |
| 구간 교체 | `splice` | O | 삭제된 배열 |
| 구간 복사 | `slice` | X | 얕은 복사 |
| 연결 | `concat` | X | 새 얕은 배열 |
| 역순/정렬 | `reverse`/`sort` | O | 같은 배열 |
| 비변경 대안 | `toReversed`/`toSorted`/`toSpliced`/`with` | X | 새 얕은 배열 |

`delete array[i]`는 property만 제거하므로 `length`를 줄이지 않고 hole을 남긴다. 목록에서 element를 제거하려면 위치 기반 `splice`, 조건 기반 `filter`, stack/queue operation처럼 의도에 맞는 API를 쓴다.

`slice`와 `concat`은 중첩 object를 복제하지 않는다. 새 배열과 원본이 같은 element object를 참조할 수 있다. `push.apply(target, source)` 같은 오래된 결합 요령보다 `push(...source)` 또는 명시적 반복을 쓰되, 매우 큰 배열의 argument count 한계도 고려한다.

`a.concat(b)`와 `[...a, ...b]`는 일반 dense Array끼리는 같은 요소를 만들지만 펼치는 규칙과 결과 타입이 다르다. `concat`은 receiver와 object인 각 인자의 `Symbol.isConcatSpreadable` 값이 `undefined`가 아니면 그 값의 truthiness로, `undefined`면 Array인지로 펼칠지 정하고(object가 아닌 인자는 이 값을 읽지 않고 원소 하나로 넣는다), 결과를 receiver의 species constructor로 만들어 Array subclass에서는 subclass를 반환한다. Set, 문자열과 primitive는 원소 하나로 들어가고 sparse array의 hole은 보존된다. spread는 모든 iterable을 순회해 펼치고 iterable이 아닌 값에는 `TypeError`를 던지며 hole은 `undefined`로 채운다. spread 결과는 array literal이라 일반 Array다. 병합 입력에 Set이나 단일 값이 섞일 수 있으면 어느 규칙을 쓸지 명시한다.

## 문자열 변환

- `join(separator)`은 각 element를 문자열로 연결한다. `undefined`, `null`, empty slot은 빈 문자열처럼 나타나 정보가 사라질 수 있다.
- array의 `toString()`은 사실상 `join()`과 비슷한 comma 연결이며 serialization contract가 아니다.
- `toLocaleString()`은 element별 locale conversion을 호출하므로 locale/options와 출력 안정성을 명시한다.
- HTML을 문자열로 조립할 때 `join` 성능보다 escaping/context가 우선이다. DOM API나 검증된 template system을 사용한다.

## 정렬 계약

`sort()`의 기본 비교는 element를 문자열로 바꾸고 UTF-16 code unit sequence를 비교한다. 숫자 정렬에는 comparator가 필요하다.

```ts
const sorted = values.toSorted((a, b) => a - b);
```

Comparator는 음수/0/양수로 순서를 표현하고 pure, reflexive, anti-symmetric, transitive한 일관된 비교를 제공해야 한다. Boolean만 반환하거나 정렬 중 외부 상태/배열을 바꾸면 결과를 신뢰하기 어렵다.

현행 ECMAScript의 Array sort는 stable이다. 같은 순위 element의 기존 상대 순서를 유지한다. 그러나 구체 알고리즘과 시간/공간 복잡도는 구현 선택이므로 특정 sort 알고리즘이라고 단정하지 않는다. `reverse()`는 비교 정렬이 아니라 현재 순서를 뒤집는다.

## 검색과 callback 순회

- `indexOf`/`lastIndexOf`는 strict equality 의미로 위치를 찾고 `NaN`을 찾지 못한다. `includes`는 SameValueZero라 `NaN`을 찾는다.
- `forEach`는 반환값을 모으지 않고 중간 `break`를 제공하지 않는다. 조기 종료가 필요하면 `some`, `every`, `find` 또는 loop를 쓴다.
- `every`는 첫 false에서, `some`은 첫 true에서 멈춘다. 빈 배열에서는 각각 true/false다.
- `filter`는 predicate가 true인 기존 element를 모으고 `map`은 callback 결과로 대응 배열을 만든다.
- `reduce`/`reduceRight`는 accumulator를 전달한다. 빈 배열에서 initial value를 생략하면 `TypeError`이므로 domain identity가 있으면 명시한다.

많은 iterative method는 시작할 때 `length`를 capture한다. 아직 방문하지 않은 element의 수정/삭제는 관찰 결과에 영향을 줄 수 있고 처음 길이 밖에 추가된 element는 방문하지 않는다. sparse array의 empty slot을 건너뛰는 method와 값처럼 읽는 method가 다르므로 hole을 일반 `undefined`와 같다고 가정하지 않는다.

- 건너뜀: `forEach`, `map`, `filter`, `flatMap`, `reduce`, `reduceRight`, `some`, `every`, `indexOf`, `lastIndexOf`는 실제로 있는 index만 방문한다.
- 보존: `concat`, `copyWithin`, `slice`, `splice`, `reverse`는 옮긴 hole을 그대로 두고 `sort`는 hole을 끝으로 모은다. `flat`은 평탄화하는 깊이 안의 hole을 제거한다.
- `undefined`로 읽음: `find`, `findIndex`, `findLast`, `findLastIndex`, `includes`, `join`, `toLocaleString`, `fill`, `keys`, `values`, `entries`와 `toReversed`, `toSorted`, `toSpliced`, `with`는 hole을 값이 `undefined`인 element처럼 다룬다. `for...of`와 spread도 `values()` iterator를 쓴다. hole을 건너뛰는 `indexOf`와 달리 `includes`는 hole을 `undefined`로 읽으므로 `Array(3).indexOf(undefined)`는 `-1`, `Array(3).includes(undefined)`는 `true`다.

`map`은 입력과 같은 길이의 결과를 만든 뒤 존재하는 index에만 callback을 호출하므로 `Array(n).map(fn)`은 callback 없이 빈 slot n개를 반환한다. 길이만 정해 값을 만들 때는 hole을 만들지 않는 `Array.from({ length: n }, fn)`을 쓰거나 `fill`로 먼저 채운다.

```ts
Array(3).map((_, i) => i);              // [ <3 empty items> ], callback 호출 없음
Array.from({ length: 3 }, (_, i) => i); // [0, 1, 2]
Array(3).fill(0).map((_, i) => i);      // [0, 1, 2]
[...Array(2)];                          // [undefined, undefined]
```

`forEach(async value => ...)`는 callback Promise를 기다리지 않는다. 순차 처리는 `for...of`와 `await`, 전체 병렬은 `Promise.all(map(...))`, 제한 병렬은 concurrency controller를 사용한다.

## 백엔드 적용

- 입력 배열의 최대 길이, element schema와 duplicate/order 의미를 먼저 검증한다.
- entity collection을 in-place sort/splice하면 ORM dirty tracking이나 공유 reference에 영향을 줄 수 있다. mutation boundary를 명시한다.
- comparator에 DB collation과 다른 locale 규칙을 넣으면 pagination/order가 흔들릴 수 있다. 정렬 책임을 DB/API 중 한곳에 둔다.
- 대량 결과를 Array로 전부 materialize하기보다 iterator/stream과 backpressure가 필요한지 확인한다.

## 초기값, 결측값과 index 경계

촘촘한 n개 배열에서 reduce 초기값이 없으면 첫 원소가 accumulator가 되고 index 1부터 n-1회 callback을 부른다. 초기값이 있으면 index 0부터 n회다. hole은 건너뛰므로 희소 배열의 호출 수는 length와 다르다. 원소가 하나면 초기값 없는 reduce는 callback 없이 그 원소를 반환하고, 원소 type과 결과 type이 다르면 초기값을 반드시 준다. reduceRight는 반대쪽의 첫 존재 원소를 시작값으로 삼는다.

sort는 undefined를 사용자 comparator에 넘기지 않고 일반 값 뒤, hole 앞에 배치한다. comparator로 undefined를 앞으로 보낼 수 없으므로 결측 위치가 중요하면 명시적 sentinel로 변환하거나 분리한다. `[101,26,7,1234].sort()`는 `[101,1234,26,7]`이고 숫자 오름차순/내림차순은 각각 `(a,b)=>a-b`, `(a,b)=>b-a`다. reverse는 현재 순서만 뒤집는다.

Array의 indexOf/includes에 음수 시작 위치를 주면 length를 더하고 0 아래는 0으로 보정한다. lastIndexOf는 보정한 위치부터 뒤로 찾으며 기본 위치는 length-1이다. String 검색의 음수 position은 0으로 보정되어 끝 기준이 아니다. Array/String slice는 음수에 length를 더하지만 시작이 끝 이상이면 빈 결과를 낸다. indexOf는 strict equality, includes는 SameValueZero라는 차이도 유지한다.

깊은 위치 기반 배열은 차원의 의미가 숨는다. 구조가 데이터 계약이라면 `{ rows: [{ name, values }] }`처럼 이름을 붙이거나 차원별 변환 함수를 분리한다. 2차원을 보편적인 한도로 강제하지 않고 domain의 shape와 가독성으로 결정한다.

## 정렬 안정성과 상대 index

Array와 TypedArray의 `sort`는 같은 비교 결과를 가진 원소의 기존 순서를 보존한다. 안정성은 특정 정렬 알고리즘을 사용한다는 보장이 아니다. Array의 기본 정렬은 문자열 비교인 반면 TypedArray의 기본 정렬은 숫자 순서다. `at(-1)`은 Array, TypedArray와 String에서 끝의 원소에 접근하지만 일반 `array[-1]`은 마지막 원소 문법이 아니라 `'-1'` property 접근이다.

## 출처

- [Stable Array.prototype.sort — V8](https://v8.dev/features/stable-sort)
- [The at method for relative indexing — V8](https://v8.dev/features/at-method)

- [ECMAScript, CompareArrayElements](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-comparearrayelements)

- [ECMAScript, reduce](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.reduce)

- [ECMAScript Language Specification, Array objects](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array-objects)
- [ECMAScript Language Specification, Object type](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-object-type), [ArraySetLength](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraysetlength), [Array exotic objects](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-array-exotic-objects), [Array.prototype.concat](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.concat), [IsConcatSpreadable](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-isconcatspreadable)
- [MDN, Array methods and empty slots](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#array_methods_and_empty_slots), [Array.from()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from), [Array.prototype.concat()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat), [Spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
- [모던 자바스크립트 딥다이브 스터디 #6-2 (CH 27 배열) — FE재남](https://www.youtube.com/watch?v=bpvmUePh7ZM)
- [모던 자바스크립트 딥다이브 스터디 #9-1 (CH 34 - 36) — FE재남](https://www.youtube.com/watch?v=JUS-7rQehMw)
- ES3 배열: [개요/차원](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24671), [method 목록](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24672), [생성/length](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24673), [delete/hole](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24674), [추가/연결](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24675), [slice](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24676), [문자열 변환](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24677), [삭제](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24678), [sort/Unicode](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24679), [comparator/reverse](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24680)
- ES5 배열: [isArray/method](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24682), [indexOf/lastIndexOf](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24683), [forEach](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24684), [for와 forEach](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24685), [every/some](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24686), [filter/map](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24687), [reduce/reduceRight](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24688)

## 관련 문서

- [[JavaScript-Object-and-Array-Operations|Object와 Array 변환]]
- [[JavaScript-Iterator-and-Generator-Protocol|Iterator와 Generator]]
- [[JavaScript-Iterable-Functional-Pipelines|함수형 iterable pipeline]]
- [[Promise-Async|Promise와 async]]
