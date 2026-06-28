---
tags: [runtime, nodejs, v8, array, performance]
status: done
category: "OS & Runtime"
aliases: ["V8 Array Internals", "Elements Kinds", "배열 내부 구현", "Packed Array", "Holey Array", "Typed Array", "ArrayBuffer", "SharedArrayBuffer"]
---

# V8 배열 내부 구현 (Array Internals)

JavaScript의 `Array`는 명세상 정수 키를 가진 객체일 뿐, 메모리 연속성을 보장하지 않는다. 그런데도 실무에서 배열이 빠른 이유는 V8이 조건을 만족하는 배열을 내부적으로 연속 메모리 배열로 깔아 두기 때문이다. 그 조건을 깨면 객체(해시) 표현으로 떨어져 수십 배 느려진다. 이 최적화의 규칙이 elements kinds다.

## 진짜 배열 — 연속성과 인접성

정적 언어(C 등)의 배열은 생성 시점에 정해진 크기만큼 메모리를 **연속(continuous), 인접(contiguous)** 하게 할당한다. 이 성질 덕에 임의 원소 접근이 O(1)이다. 시작 주소가 1201이고 원소 한 칸이 4바이트면 `arr[2]`의 주소는 `1201 + 2 × 4 = 1209`로 곧장 계산된다. 탐색 없이 수식 한 번이다.

연속 메모리가 아니면 이 수식이 성립하지 않는다. 옛 JS 배열처럼 연결 리스트로 깔리면 `arr[2]`를 읽으려고 앞에서부터 따라가야 해 접근이 O(n)으로 늘어난다.

## JS 배열은 객체다

ECMAScript 명세에서 배열은 키가 정수 문자열인 객체에 가깝다. 동적 크기, 임의 키, 타입 혼합(`[1, 'a', {}]`)을 모두 허용한다. 명세를 곧이곧대로 구현하면 연속 메모리를 보장할 수 없어 임의 접근의 O(1)이 깨진다. 그래서 초기 엔진의 배열은 사실상 해시 맵이었고, 이것이 JS 배열이 진짜 배열이 아니라고 불리는 이유다.

## V8의 배열 최적화 — Elements Kinds

현대 V8은 배열의 원소들을 관찰해 **두 가지 백킹 스토어** 중 하나로 관리한다.

- **Fast Elements (연속 메모리 배열)**: 원소가 단일 타입이고 빈 칸이 없으면 C 배열처럼 연속 메모리에 담아 O(1) 접근. JIT(TurboFan)는 이 배열에 정적 언어 수준의 인덱싱 코드를 생성한다.
- **Dictionary Elements (해시 모드)**: 타입이 섞이거나 배열이 희소(sparse)해지면 키-값 해시 테이블로 전락. 임의 접근이 해시 조회가 되어 느려지고 JIT 최적화 대상에서 빠진다.

Fast Elements는 다시 **두 축**으로 세분된다.

| 축 | 값 (왼쪽일수록 빠름) | 의미 |
|---|---|---|
| 타입 | SMI → Double → Tagged | SMI(작은 정수) < 부동소수 < 임의 객체 참조 |
| 밀집도 | Packed → Holey | 빈 칸 없음 → 중간에 hole 있음 |

예: 정수만 빽빽한 배열은 가장 빠른 `PACKED_SMI_ELEMENTS`, 객체가 섞이고 hole이 있으면 가장 느린 `HOLEY_ELEMENTS`다.

### 전이는 한 방향뿐

elements kind는 **더 일반적인(느린) 쪽으로만** 바뀌고 되돌아오지 않는다. 정수 배열에 실수를 넣으면 Double로, 객체를 넣으면 Tagged로 내려가며, 다시 정수만 남겨도 SMI로 복귀하지 않는다. hole도 마찬가지여서 한 번 Holey가 되면 빈 칸을 메워도 Packed로 돌아오지 않는다. 그래서 hot한 배열일수록 처음 타입과 밀집도를 흐트러뜨리지 않는 게 중요하다.

hole이 생기는 대표 동작: `delete arr[i]`, 인덱스를 건너뛴 할당(`arr[0]=1; arr[100]=1`), `arr.length`를 키워 빈 칸을 만드는 것, `new Array(n)`으로 비어 있는 슬롯을 미리 잡는 것.

## 역최적화 — 타입 혼합과 hole의 비용

단일 타입 Packed 배열에 다른 타입 원소를 하나라도 섞으면 백킹 스토어가 더 일반적인 kind(최악엔 dictionary)로 바뀌고, TurboFan이 세웠던 타입 가정이 깨져 역최적화가 일어난다. 측정상 동일 타입 삽입 루프와 객체 한 개를 섞은 삽입 루프는 같은 코드인데도 약 20배 이상 벌어진다. 역최적화 메커니즘 자체는 [[V8-Ignition-TurboFan#Deoptimization (역최적화)|컴파일 파이프라인의 Deoptimization]] 참고. 배열은 그 가정 중 하나가 elements kind라는 점이 핵심이다.

## Fast 배열을 유지하는 규칙

- 한 배열에는 **한 타입만** 담는다(정수면 정수, 객체면 객체).
- **hole을 만들지 않는다**: 인덱스를 건너뛰지 말고 0번부터 순차로 채운다. 크기를 아는 경우라도 `new Array(n)`으로 빈 슬롯을 잡기보다 push로 채우는 편이 Packed를 유지한다.
- 중간 원소를 지울 땐 `delete`(hole 생성) 대신 `splice`를 쓴다.
- 추가, 삭제는 가능하면 배열 **끝**에서 한다.

이는 [[V8-Hidden-Class|히든 클래스]]에서 객체의 모양을 일정하게 유지하라는 규칙과 같은 원리다. 객체는 프로퍼티 구조를, 배열은 원소 타입과 밀집도를 일정하게 지킬 때 엔진의 최적화를 받는다.

## Typed Array — 진짜 연속 메모리

ES2015는 일반 `Array`의 한계를 우회할 **타입이 고정된 연속 메모리**를 도입했다.

- **ArrayBuffer**: 고정 길이의 연속 raw 바이트 블록. 그 자체로는 읽고 쓸 수 없다.
- **View**: ArrayBuffer를 특정 타입으로 해석하는 창. `Int8Array`, `Uint8Array`, `Uint8ClampedArray`, `Int16Array`, `Uint16Array`, `Int32Array`, `Uint32Array`, `Float32Array`, `Float64Array` 등 타입별 뷰와, 임의 오프셋, 엔디언을 직접 다루는 `DataView`가 있다.
- **SharedArrayBuffer**: 여러 [[Worker-Threads-Core|Web Worker/워커 스레드]]가 공유하는 ArrayBuffer. 복사 없이 메모리를 공유해 병렬 처리 성능을 끌어올린다(접근 동기화는 별도 필요).

타입과 길이가 생성 시 고정되므로 타입 혼합이나 hole로 인한 역최적화 여지가 없고, 항상 연속 메모리라 인덱싱이 정적 언어 배열과 동일하다. WebGL처럼 바이너리 데이터를 대량 처리하는 영역에서 일반 배열의 성능 문제를 풀기 위해 도입됐다. Node.js의 `Buffer`도 `Uint8Array`의 서브클래스다([[Buffer-Memory|Buffer, 메모리 관리]]).

### 일반 Array vs Typed Array

| 축 | 일반 Array | Typed Array |
|---|---|---|
| 타입 | 혼합 허용 (섞이면 역최적화) | 단일 고정 |
| 크기 | 동적 | 생성 시 고정 |
| 메모리 | 조건 만족 시에만 연속 | 항상 연속 (ArrayBuffer) |
| 임의 접근 | Fast면 O(1), Dictionary면 해시 조회 | 항상 O(1) |
| 용도 | 범용 | 바이너리, 수치 연산, WebGL, 워커 공유 |

## 면접 체크포인트

- JS 배열이 명세상 객체인데도 실무에서 빠른 이유 — V8이 조건 충족 시 연속 메모리(Fast Elements)로 깔기 때문
- elements kinds 두 축(타입 SMI→Double→Tagged, 밀집도 Packed→Holey)과 전이가 일방향이라는 점
- 단일 타입 배열에 다른 타입을 섞으면 dictionary로 전락 + 역최적화(약 20배 차이) — [[V8-Ignition-TurboFan|Deopt]]의 한 사례
- Fast 배열 유지 규칙 — 단일 타입, hole 금지(delete 대신 splice), 끝에서 조작
- Typed Array가 항상 연속 메모리인 이유(타입, 길이 고정)와 ArrayBuffer/View/SharedArrayBuffer 역할
- `Buffer`가 `Uint8Array` 서브클래스라는 연결

## 출처

- [Diving deep into JavaScript array - evolution & performance — Paul Shan (evan-moon 번역)](https://evan-moon.github.io/2019/06/15/diving-into-js-array/)

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Hidden-Class|히든 클래스 (객체 모양 최적화)]]
- [[V8-Ignition-TurboFan|컴파일 파이프라인, Deoptimization]]
- [[V8-Inline-Cache|인라인 캐시]]
- [[Buffer-Memory|Node.js Buffer, 메모리 관리]]
- [[자료구조(DataStructure)|자료구조 (Array vs LinkedList)]]
