---
tags: [cs, javascript, array, mutation, iteration, sorting]
status: done
verified_at: 2026-08-04
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

- array index는 특정 범위의 canonical numeric string property이고 `length`는 가장 큰 index보다 하나 큰 값과 연동된다.
- `length`는 element 개수와 항상 같지 않다. sparse array에는 중간 slot이 없을 수 있다.
- `length`를 줄이면 범위 밖 element가 삭제되고 늘리면 empty slot이 생긴다.
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

`forEach(async value => ...)`는 callback Promise를 기다리지 않는다. 순차 처리는 `for...of`와 `await`, 전체 병렬은 `Promise.all(map(...))`, 제한 병렬은 concurrency controller를 사용한다.

## 백엔드 적용

- 입력 배열의 최대 길이, element schema와 duplicate/order 의미를 먼저 검증한다.
- entity collection을 in-place sort/splice하면 ORM dirty tracking이나 공유 reference에 영향을 줄 수 있다. mutation boundary를 명시한다.
- comparator에 DB collation과 다른 locale 규칙을 넣으면 pagination/order가 흔들릴 수 있다. 정렬 책임을 DB/API 중 한곳에 둔다.
- 대량 결과를 Array로 전부 materialize하기보다 iterator/stream과 backpressure가 필요한지 확인한다.

## 출처

- [ECMAScript Language Specification, Array objects](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array-objects)
- ES3 배열: [개요/차원](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24671), [method 목록](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24672), [생성/length](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24673), [delete/hole](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24674), [추가/연결](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24675), [slice](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24676), [문자열 변환](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24677), [삭제](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24678), [sort/Unicode](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24679), [comparator/reverse](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24680)
- ES5 배열: [isArray/method](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24682), [indexOf/lastIndexOf](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24683), [forEach](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24684), [for와 forEach](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24685), [every/some](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24686), [filter/map](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24687), [reduce/reduceRight](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24688)

## 관련 문서

- [[JavaScript-Object-and-Array-Operations|Object와 Array 변환]]
- [[JavaScript-Iterator-and-Generator-Protocol|Iterator와 Generator]]
- [[JavaScript-Iterable-Functional-Pipelines|함수형 iterable pipeline]]
- [[Promise-Async|Promise와 async]]
