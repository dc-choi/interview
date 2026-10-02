---
tags: [runtime, nodejs, v8, array]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["Elements Kinds", "Packed Array", "Holey Array", "Fast Elements", "Dictionary Elements"]
---

# V8 배열 내부 구현

JavaScript `Array`는 인덱스 프로퍼티와 `length`의 관계에 특별한 규칙을 둔 객체다. 명세가 연결 리스트나 해시 테이블을 요구하지는 않는다. V8은 원소의 표현과 밀집도에 맞춰 저장 방식과 접근 코드를 고른다. 구현이 빠른 경로를 제공하는 조건과 프로그램의 관찰 가능한 의미를 구분한다.

## 이름 프로퍼티와 인덱스 원소

객체는 이름 프로퍼티의 properties store와 정수 인덱스의 elements store를 구분한다. 배열에 `items.label`을 붙이는 것은 `items[0]`을 넣는 것과 다른 저장 경로다. 다만 elements kind도 Map에 담기는 정보여서 원소 표현의 전환이 [[V8-Hidden-Class|Map]]에 영향을 줄 수 있다.

| 저장 경로 | 용도와 비용 |
|---|---|
| Fast elements | 비교적 밀집된 인덱스를 backing store에 저장, 타입과 경계 검사를 줄일 기회가 있음 |
| Dictionary elements | 큰 간격의 인덱스나 일부 복잡한 descriptor를 사전 구조에 저장, 빈 구간 전체를 할당하지 않음 |

`a[1_000_000] = 1`처럼 희소한 배열을 만드는 경우 dictionary가 메모리를 아낄 수 있다. 전환 임계값과 내부 자료구조는 버전마다 바뀐다. Dictionary는 잘못된 배열이라는 뜻이 아니며, 모든 dictionary 연산이 JIT에서 제외된다는 뜻도 아니다.

## Elements kinds

주요 fast elements 종류는 두 축으로 이해한다.

| 축 | 종류 | 의미 |
|---|---|---|
| 값 표현 | Smi | 작은 정수 값을 tagged 표현 안에 담음, 범위는 빌드에 따라 다름 |
| 값 표현 | Double | 배정밀도 숫자용 저장 공간 |
| 값 표현 | Tagged elements | 객체 참조 등 일반 JS 값을 담음 |
| 밀집도 | Packed | 논리적 원소 구간에 hole이 없음 |
| 밀집도 | Holey | 논리적 구간 안에 없는 인덱스가 있음 |

```js
const values = [1, 2, 3]; // 보통 PACKED_SMI_ELEMENTS
values.push(4.5);         // 보통 PACKED_DOUBLE_ELEMENTS
values.push({ id: 5 });   // 보통 PACKED_ELEMENTS
values[10] = 6;           // hole을 만들어 HOLEY_ELEMENTS
```

일반적인 전이는 Smi에서 Double, 더 일반적인 tagged 표현으로, Packed에서 Holey로 향한다. `-0`, `NaN`, `Infinity`도 Smi 표현을 벗어나게 할 수 있다. 더 일반적인 표현이 된 뒤 값 몇 개를 바꾼다고 자동으로 원래 표현을 회복하는 것은 아니다.

다만 전이가 영구히 한 방향이라는 규칙은 아니다. V8의 elements kinds 글은 **2025-02-28부터 `Array.prototype.fill`에 예외**가 생겼다고 명시한다. 이 예외까지 포함한 내부 표현을 애플리케이션의 정확성 조건으로 삼지 않는다.

## Hole과 undefined는 다르다

```js
const absent = [, 2];
const present = [undefined, 2];
console.log(0 in absent);  // false, 프로토타입에 0이 없다는 조건
console.log(0 in present); // true
```

Hole은 값이 `undefined`인 원소가 아니라 인덱스 프로퍼티의 부재다. 읽기에서 프로토타입 체인도 확인해야 하므로 holey 경로에는 검사가 더 필요할 수 있다. 프로토타입에 같은 인덱스가 있으면 그 값을 읽을 수 있다.

- `delete a[i]`는 hole을 만들고 `length`를 줄이지 않는다.
- `new Array(n)`은 n개의 `undefined` 값을 넣은 배열이 아니라 빈 슬롯 n개를 만든다.
- 기본 배열 iterator를 쓰는 spread와 `for...of`는 빈 슬롯에서 얻은 값을 처리한다. 보통 `undefined`지만 프로토타입의 인덱스 값이 있으면 달라진다.
- `slice()`는 부재한 슬롯을 결과에서도 보존한다. Spread로 복사하는 것과 같은 의미라고 바꾸지 않는다.
- 사용자 정의 `Symbol.iterator`나 iterator의 `next`는 spread의 의미를 바꾼다. V8은 기본 iterator라는 가정을 확인할 수 있을 때만 특화된 복사 경로를 쓴다.

## 최적화와 역최적화

최적화 코드는 관찰한 elements kind, 인덱스 범위, 프로토타입 조건 등에 특화될 수 있다. 새 값으로 표현이 일반화되면 기존 가정이 깨져 [[V8-Ignition-TurboFan#Deoptimization (역최적화)|역최적화]]될 수 있다. 모든 타입 혼합 대입이 역최적화를 발생시키는 것은 아니며, 코드가 아직 최적화되지 않았거나 이미 일반 경로를 쓰면 상황이 다르다.

실제 데이터의 의미를 먼저 정하고 반복되는 병목만 다듬는다.

- 수치 연산 hot path에서 숫자와 객체를 같은 배열에 섞을 필요가 없다면 분리한다.
- 값이 순차적으로 생기면 `push()`로 채운다. 크기 선할당과 `fill()`이 유리한지는 대상 버전과 작업으로 측정한다.
- `delete`와 `splice`는 의미가 다르다. `splice`는 뒤 인덱스를 이동시키므로 hole을 없애려고 대체할 때 비용과 의미를 함께 본다.
- 배열 끝에서 넣고 빼는 작업은 중간 원소 이동을 줄인다. 자료구조 선택이 내부 kind 조정보다 큰 차이를 만들 수 있다.

출처의 배수 향상이나 한 버전의 임계값을 모든 프로그램의 성능으로 옮기지 않는다. 입력 분포, 최초 컴파일과 충분히 실행된 상태, GC 시간을 함께 비교한다.

## 정렬과 관찰 가능한 의미

`Array.prototype.sort`는 사용자 comparator, getter, setter와 프로토타입 접근을 실행할 수 있다. 따라서 엔진은 단순한 숫자 버퍼 정렬보다 많은 조건을 확인한다. 사용자 코드가 정렬 중 배열을 바꿀 수도 있어 빠른 경로의 가정을 재검사해야 한다.

V8은 **2018년 V8 7.0에서 안정 정렬을 위해 Timsort로 전환**했다. 이는 구현 역사이며 ECMAScript가 Timsort를 요구하는 것은 아니다. 비교되는 값, 뒤로 모이는 `undefined`, 마지막에 남는 부재 슬롯을 구분한 처리도 배열의 의미를 보존하기 위한 것이다. 특이한 accessor와 상충하는 comparator의 결과까지 엔진 간 동일하다고 가정하지 않는다.

## TypedArray와 ArrayBuffer

`TypedArray`는 `ArrayBuffer`의 바이트를 특정 원소 타입으로 해석하는 뷰다. JS 일반 배열의 kind 추적과 달리 원소 타입이 뷰에 고정되고 대입 시 해당 표현으로 변환된다. `DataView`는 임의 오프셋과 엔디언을 직접 다루는 뷰다.

| 축 | 일반 Array | TypedArray |
|---|---|---|
| 원소 | JS 값 혼합 가능 | 뷰의 수치 타입으로 변환 |
| Hole | 가능 | 유효한 뷰 구간에 배열의 hole 개념이 없음 |
| 길이 | 인덱스와 `length` 규칙에 따라 변경 | 고정 길이 또는 resizable buffer를 따르는 길이 추적 뷰 |
| 저장 | fast/dictionary 등 엔진 선택 | buffer의 연속 바이트를 해석 |
| 주 용도 | 범용 컬렉션 | 바이너리, 수치 계산, I/O |

TypedArray도 bounds 검사, buffer 분리(detach), resize에 따른 뷰 범위 변화와 최적화 가정을 고려해야 한다. 고정 타입이 모든 역최적화를 없애는 것은 아니다. `SharedArrayBuffer`를 공유할 때는 데이터 경쟁과 `Atomics` 동기화가 별도 문제다. Node.js `Buffer`는 `Uint8Array`의 하위 클래스다.

## 출처

- [Diving deep into JavaScript array - evolution & performance — Paul Shan (evan-moon 번역)](https://evan-moon.github.io/2019/06/15/diving-into-js-array/)
- [Elements kinds in V8 — V8 공식 블로그](https://v8.dev/blog/elements-kinds)
- [Fast properties in V8 — V8 공식 블로그](https://v8.dev/blog/fast-properties)
- [Spread elements — V8 공식 블로그](https://v8.dev/blog/spread-elements)
- [Getting things sorted in V8 — V8 공식 블로그](https://v8.dev/blog/array-sort)
- [ECMAScript, Array.prototype.slice](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.slice)
- [Fixed-length and Resizable ArrayBuffer Objects — ECMAScript](https://tc39.es/ecma262/multipage/structured-data.html#sec-fixed-length-and-resizable-arraybuffer-objects)

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Hidden-Class|히든 클래스]]
- [[V8-Ignition-TurboFan|컴파일 파이프라인, Deoptimization]]
- [[V8-Inline-Cache|인라인 캐시]]
- [[Buffer-Memory|Node.js Buffer, 메모리 관리]]
- [[자료구조(DataStructure)|자료구조]]
