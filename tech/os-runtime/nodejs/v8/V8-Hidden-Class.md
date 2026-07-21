---
tags: [runtime, nodejs, v8]
status: done
category: "OS & Runtime"
aliases: ["Hidden Class", "V8 Maps", "JSC Structures", "SpiderMonkey Shapes", "Transition Chain"]
verified_at: 2026-07-21
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

**같은 순서로 프로퍼티를 추가하면** 다른 객체도 동일 체인을 재사용한다 → [[V8-Inline-Cache|Inline Cache]] 가 잘 먹힘.

반대로 **순서가 다르면** 체인 경로가 갈려 다른 히든 클래스로 분기된다.

## 히든 클래스 공유 조건

| 사례 | 공유? | 이유 |
|---|---|---|
| `class` 생성자로 만든 객체 vs object literal, 프로퍼티 이름, 순서 동일 | ❌ | 서로 다른 생성자 — class 전용 생성자 vs 일반 Object 생성자 |
| 같은 생성자, 프로퍼티 이름 같고 **값 타입만 다름** (`null`, `undefined`, `{}`, `[]`, `Symbol` 포함) | ✅ | 9.1 기준. V8 버전 업데이트로 달라질 수 있음 |
| 같은 생성자, 프로퍼티를 **다른 순서로 추가** | ❌ | Transition Chain 경로가 달라짐 |
| 객체 생성 후 `delete`로 프로퍼티 제거 | ❌ | 히든 클래스가 변경됨, TurboFan 최적화 무효화 |

## 최적화 팁

### 1. 가능한 한 히든 클래스 공유

- **생성자에서 모든 속성 선언** (객체 생성 시점에 모양 확정)
- **항상 같은 순서로 초기화**
- 정적 언어의 클래스처럼 사용 권장

### 2. 객체 초기화 후 히든 클래스 전환 지양

- 객체 생성 후 **프로퍼티 동적 추가 금지** (새 히든 클래스 생성됨)
- **`delete` 연산자 사용 금지** (히든 클래스 변경됨, 최적화 무효)

### 3. 함수 호출 시 같은 객체 유형 사용

- 함수 인자로 다양한 히든 클래스의 객체를 넘기면 [[V8-Inline-Cache|Inline Cache]]가 polymorphic, megamorphic으로 전락

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Inline-Cache|V8 인라인 캐시]]
- [[V8-Ignition-TurboFan|V8 컴파일 파이프라인]]
- [[V8-Array-Internals|V8 배열 내부 구현 (배열판 모양 최적화)]]

## 출처

- [V8 — Fast properties in V8](https://v8.dev/blog/fast-properties)
- [ECMAScript 2024 — Property Descriptor Specification Type](https://tc39.es/ecma262/2024/multipage/ecmascript-data-types-and-values.html#sec-property-descriptor-specification-type)
