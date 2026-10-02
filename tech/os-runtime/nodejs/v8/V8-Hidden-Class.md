---
tags: [runtime, nodejs, v8]
status: done
category: "OS & Runtime"
aliases: ["Hidden Class", "V8 Maps", "JSC Structures", "SpiderMonkey Shapes", "Transition Chain"]
verified_at: 2026-10-01
---

# V8 히든 클래스 (Hidden Class)

동일한 구조를 가진 객체가 같은 내부 타입 정보(offset 테이블)를 공유하도록 V8이 런타임에 생성하는 구조. JS는 동적 언어라 프로퍼티 오프셋을 컴파일 시점에 확정할 수 없는데, 이 단점을 극복하기 위한 장치다.

엔진별 명칭:
- **V8**: Maps (내부 용어, 자료구조 Map과 무관)
- **JSC**: Structures
- **SpiderMonkey**: Shapes

## 왜 필요한가

ECMAScript는 프로퍼티의 관찰 가능한 의미와 descriptor를 정의하지만, 객체가 메모리에서 사전 형태로 저장돼야 한다고 규정하지 않는다. 데이터 프로퍼티 descriptor에는 다음 속성이 있다:

- `[[Value]]`: 연결된 값
- `[[Writable]]`: 값 변경 가능 여부
- `[[Enumerable]]`: `for...in` 열거 가능 여부
- `[[Configurable]]`: 삭제, 속성 변경 가능 여부

실제 저장 방식은 엔진 구현 세부사항이다. V8은 객체 모양이 안정적일 때 Map과 DescriptorArray, in-object 또는 properties backing store를 이용하는 fast properties를 쓰고, 프로퍼티가 많이 추가, 삭제되는 등 특정 상황에서는 dictionary properties로 전환할 수 있다.

### 동적 언어의 비용

- 소스만 보고 모든 객체의 최종 모양과 값 위치를 정적으로 확정하기 어려움
- 객체마다 구조 메타데이터를 따로 보관하면 접근 최적화와 메모리 공유가 어려움

Map은 **구조가 같은 객체들이 모양 정보를 공유**하게 하고, inline cache와 최적화된 코드가 확인된 모양에 대해 오프셋 기반 접근을 사용할 수 있게 한다. 안정된 모양을 확인하지 못한 모든 접근이 반드시 같은 비용의 사전 탐색을 하는 것은 아니다.

## 기본 구조

```
[ Object Memory ]              [ Hidden Class (C0) ]           [ Property Information ]
+---------------+              +--------------------+          +---------------------------+
| Pointer to HC | -----------> | Transition Table   |          | [ Property: name ]        |
+---------------+              | (name, height, ...)|          | - Offset: 0               |
| 'Alex'        | (Offset 0)   +--------------------+          | - [[Writable]]: true      |
+---------------+              | Property List      | -------> | - [[Enumerable]]: true    |
| 174           | (Offset 1)   | - name             |          | - [[Configurable]]: true  |
+---------------+              | - height           |          +---------------------------+
| 70            | (Offset 2)   | - width            |          | [ Property: height ]      |
+---------------+              +--------------------+          | - Offset: 1               |
                                        |                      +---------------------------+
                                        |                      | [ Property: width ]       |
                                        +--------------------> | - Offset: 2               |
                                                               +---------------------------+
```

- 객체는 Map을 가리키고, 프로퍼티 값은 in-object 또는 별도 properties store에 저장될 수 있다
- Map과 descriptor 정보가 프로퍼티 위치와 속성을 설명한다
- 같은 모양의 객체는 구조 메타데이터를 공유할 수 있다

## Transition Chain (동적 프로퍼티 추가)

빈 객체에 프로퍼티를 순차 할당하면 히든 클래스가 체인으로 이어진다.

```
  (Start)          (Add 'name')        (Add 'height')       (Add 'width')
+----------+      +----------+        +----------+        +----------+
|    C0    | ---> |    C1    | -----> |    C2    | -----> |    C3    |
| (empty)  |      |  [name]  |        | [height] |        | [width]  |
+----------+      +----------+        +----------+        +----------+
                       |                   |                   |
                       v                   v                   v
                [ Prop Info 0 ]     [ Prop Info 1 ]     [ Prop Info 2 ]
                - Offset: 0         - Offset: 1         - Offset: 2
                - Writable: T       - Writable: T       - Writable: T
                - Enum: T           - Enum: T           - Enum: T
                - Config: T         - Config: T         - Config: T
```

- 각 히든 클래스는 **Transition 정보** (다음 클래스로 가는 매핑)를 갖는다
- **back pointer**로 이전 히든 클래스도 참조 → 체인 형태
- 전이는 새 모양의 Map으로 이어지며 descriptor 정보는 엔진이 공유하거나 복사할 수 있다. 일반 프로퍼티 접근 때마다 transition chain을 거슬러 올라가 값을 찾는 구조는 아니다.

**같은 생성 경로와 prototype, descriptor와 값 표현 조건**에서 같은 순서로 프로퍼티를 추가하면 다른 객체도 transition 경로를 재사용하기 쉽다 → [[V8-Inline-Cache|Inline Cache]]의 특화에 도움이 된다.

반대로 **순서가 다르면** 체인 경로가 갈려 다른 히든 클래스로 분기된다.

## 히든 클래스 공유 조건

Map은 ECMAScript 계약이 아니라 V8 내부 구현이다. 아래는 객체 모양이 안정적인지 판단하는 실용적 기준이지, 모든 V8 버전에서 `%HaveSameMap` 결과를 보장하는 표가 아니다. 값의 표현이나 생성 위치 같은 내부 정보로 Map이 일반화되거나 달라질 수도 있다. 한 버전에서 직접 확인한 결과는 아래 [[#내부 동작을 실험할 때|실험]]에 있다.

| 사례 | 일반적인 결과 | 이유 |
|---|---|---|
| 같은 생성 경로, 같은 이름을 같은 순서로 추가 | 같은 Map을 공유하기 쉬움 | 같은 transition 경로를 재사용 |
| 이름과 순서는 같지만 한쪽은 리터럴로 한 번에, 다른 쪽은 빈 객체에 하나씩 추가 | 최종 모양이 같아도 다른 Map이기 쉬움 | 초기 크기에 따라 in-object 슬롯 수가 정해져 시작 Map과 transition 경로가 다름 |
| 프로퍼티를 다른 순서로 추가 | 다른 Map으로 갈라지기 쉬움 | transition tree의 분기가 달라짐 |
| `class` 인스턴스와 object literal | 다른 초기 Map을 쓰기 쉬움 | 생성자 함수마다 initial map이 따로 붙는다. 같은 생성자로 만든 인스턴스끼리는 공유하기 쉬움 |
| 같은 모양이지만 값 타입만 변경 | 대개 같은 Map을 유지하지만 정수(Smi)에서 소수(Double)로 바뀌면 갈라질 수 있음 | Map은 이름과 배치뿐 아니라 field representation도 가진다. Smi에서 Double로 가는 변경은 새 Map을 만들고 이전 Map을 deprecated로 표시한다 |
| 생성 후 프로퍼티 추가, 삭제 반복 | Map 전환 또는 dictionary properties 가능 | 변경이 잦으면 공유 descriptor와 IC 이점을 잃기 쉬움 |

## Metadata 공유와 slack tracking

Transition의 앞부분을 공유하는 Map들은 DescriptorArray도 공유할 수 있다. Map이 자신에게 유효한 descriptor 개수를 갖기 때문에 뒤에 추가된 속성 정보까지 같은 array에 있어도 자기 객체의 속성으로 읽지 않는다. 메타데이터 공유와 객체 값 공유는 다르다.

필드에 붙는 내부 `const` 정보는 엔진이 관찰한 값의 안정성이다. JS `const` binding이나 `writable: false`와 같은 공개 의미가 아니다. 나중에 값을 바꾸면 가정이 일반화되거나 최적화 코드가 무효화될 수 있다.

Slack tracking은 생성자가 실제로 사용하는 in-object 슬롯을 관찰해 여분 공간을 줄이는 설계다. 같은 생성자 계열의 Map/객체 배치와 연결되므로 객체 몇 개를 만들기 전후의 크기가 달라질 수 있다. 공개 글의 관찰 횟수를 영구적인 임계값으로 사용하지 않는다.

## 최적화 팁

동적 추가와 `delete`는 금지 규칙이 아니라 비용을 알고 고르는 트레이드오프다. 한두 번의 모양 변경이 성능 문제를 만들지는 않고, 반복 접근되는 hot path 객체나 대량으로 만드는 객체에서 비용이 커진다. 적용 여부는 프로파일링으로 판단한다.

### 1. 가능한 한 히든 클래스 공유

- **생성자에서 모든 속성 선언** (객체 생성 시점에 모양 확정)
- **항상 같은 순서로 초기화**
- 같은 종류의 객체는 한 가지 생성 경로(리터럴, 같은 생성자나 팩토리)로 만든다. 리터럴과 빈 객체 후 동적 추가를 섞으면 최종 모양이 같아도 Map이 갈린다
- hot path 객체는 정적 언어의 클래스처럼 모양을 고정해 쓰는 편이 유리하다. 동적 구조의 유연성이 더 중요한 곳에서는 그 이점을 우선할 수 있다

### 2. 객체 초기화 후 히든 클래스 전환 지양

- 생성 뒤 프로퍼티를 추가하면 새 Map으로 전이한다. 추가 순서나 생성 경로가 다른 객체와 Map이 갈라져 같은 호출 지점의 inline cache가 polymorphic, megamorphic으로 밀리기 쉽다. `{ x, y }`에 `w`를 나중에 붙인 객체는 fast properties를 유지했지만 `{ x, y, w }` 리터럴과 다른 Map이었다(Node.js 26.7, V8 14.6 확인).
- `delete`는 객체를 dictionary(slow) properties로 보낼 수 있다. V8 블로그(2017)는 프로퍼티가 많이 추가되고 삭제되면 descriptor array와 Map 유지 비용 때문에 dictionary 모드로 바꾸며, 이 모드는 추가와 삭제가 효율적인 대신 접근이 느리고 inline cache가 동작하지 않는다고 설명한다. 같은 환경에서 리터럴 `{ x, y, z }`의 마지막 속성 하나만 `delete`해도 dictionary 모드가 됐다(엔진 버전에 따라 다를 수 있음).
- hot path에서 값만 비우려면 `undefined`나 `null`을 대입해 모양을 유지하는 방법이 있다. 키가 남으므로 `in`과 `Object.keys()` 결과가 `delete`와 다르다. 키 집합 자체가 자주 추가되고 삭제되는 데이터는 MDN이 그런 용도에 최적화됐다고 설명하는 `Map`을 검토한다.

### 3. 함수 호출 시 같은 객체 유형 사용

- 함수 인자로 다양한 히든 클래스의 객체를 넘기면 [[V8-Inline-Cache|Inline Cache]]가 polymorphic, megamorphic으로 전락

## 내부 동작을 실험할 때

V8 intrinsic인 `%HaveSameMap(a, b)`를 쓰면 두 객체가 현재 같은 Map을 가리키는지 실험할 수 있다. Node.js에서는 `node --allow-natives-syntax file.js`처럼 V8 native syntax를 명시적으로 허용해야 하고, 플래그 없이 실행하면 `SyntaxError: Unexpected token '%'`가 난다. intrinsic 목록은 V8 소스 `src/runtime/runtime.h`에 있다. V8을 빌드해 개발자 셸 d8로 돌릴 수도 있지만 Node.js가 간편하다. 이 intrinsic과 플래그는 표준 JavaScript API가 아니며 이름, 결과, 지원 여부가 바뀔 수 있으므로 학습과 진단에만 쓰고 애플리케이션 로직이나 테스트 계약으로 삼지 않는다.

```js
const desk = { height: 1, width: 2 };
const chair = {};
chair.height = 3;
chair.width = 4;
console.log(%HaveSameMap(desk, chair)); // false
```

Node.js 26.7.0(V8 14.6.202.34)에서 확인한 결과:

| 비교 | 결과 |
|---|---|
| 같은 속성을 같은 순서로 선언한 두 리터럴 | `true` |
| 한 번에 초기화한 리터럴과 빈 객체에 같은 순서로 추가한 객체 | `false` |
| 같은 속성을 다른 순서로 선언한 두 리터럴 | `false` |
| 둘 다 빈 객체에 같은 순서로 추가 | `true` |
| `class` 인스턴스와 리터럴, 같은 `class`의 두 인스턴스 | `false`, `true` |
| 정수 값과 문자열, `null`, `undefined`, 객체, 배열, Symbol 값 (새 프로세스에서 한 쌍씩) | 모두 `true` |
| 정수 `{ width: 100 }`과 소수 `{ width: 1.5 }` | `false` |

마지막 결과는 실행 순서에 따라 바뀌었다. 소수 객체를 만든 뒤 새로 만든 `{ width: 7 }`은 소수 쪽과 `true`였고, 처음 정수 객체도 속성에 한 번 접근하자 `true`가 됐다. V8 블로그가 설명하는 Smi에서 Double로의 표현 변경과 같다. 새 Map을 만들고 이전 Map을 deprecated로 표시한 뒤, 이전 Map의 객체는 다음 속성 접근이나 대입 때 새 Map으로 옮긴다. 같은 프로세스에서 문자열 비교를 먼저 하면 필드가 이미 일반화돼 소수도 `true`였다. 따라서 값 타입은 Map에 영향을 주지 않는다는 일반 규칙으로 옮기지 않는다.

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Inline-Cache|V8 인라인 캐시]]
- [[V8-Ignition-TurboFan|V8 컴파일 파이프라인]]
- [[V8-Array-Internals|V8 배열 내부 구현 (배열판 모양 최적화)]]

## 출처

- [V8 — Fast properties in V8](https://v8.dev/blog/fast-properties)
- [V8 — Maps (Hidden Classes) in V8](https://v8.dev/docs/hidden-classes)
- [V8 — Slack tracking in V8](https://v8.dev/blog/slack-tracking)
- [ECMAScript 2024 — Property Descriptor Specification Type](https://tc39.es/ecma262/2024/multipage/ecmascript-data-types-and-values.html#sec-property-descriptor-specification-type)
- [MDN — Map, Objects vs. Maps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#objects_vs._maps)
- [V8 — The story of a V8 performance cliff in React](https://v8.dev/blog/react-cliff)
- [V8 — Using d8](https://v8.dev/docs/d8)
- [V8 — Runtime intrinsic list source (14.6.202.34)](https://raw.githubusercontent.com/v8/v8/14.6.202.34/src/runtime/runtime.h)
- [하정훈 강사 — JavaScript 객체모델과 속성접근 방식](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196069)
- [하정훈 강사 — 히든 클래스(Hidden Class) 기본구조](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196070)
- [하정훈 강사 — 히든 클래스 비교 (OX 퀴즈)](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196075)
- [하정훈 강사 — Node.js 설치](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196076)
- [하정훈 강사 — Transition Chains](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196071)
- [하정훈 강사 — V8 엔진 내장함수로 비교하기](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196077)
- [하정훈 강사 — 왜 알아야 할까? (feat. 개인적인 의견)](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196056)
- [하정훈 강사 — 정리](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196074)
- [하정훈 강사 — 최적화 팁 & 마무리](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196066)
