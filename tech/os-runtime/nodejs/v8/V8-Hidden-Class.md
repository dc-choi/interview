---
tags: [runtime, nodejs, v8]
status: done
category: "OS & Runtime"
aliases: ["Hidden Class", "V8 Maps", "JSC Structures", "SpiderMonkey Shapes", "Transition Chain"]
---

# V8 히든 클래스 (Hidden Class)

동일한 구조를 가진 객체가 같은 내부 타입 정보(offset 테이블)를 공유하도록 V8이 런타임에 생성하는 구조. JS는 동적 언어라 프로퍼티 오프셋을 컴파일 시점에 확정할 수 없는데, 이 단점을 극복하기 위한 장치다.

엔진별 명칭:
- **V8**: Maps (내부 용어, 자료구조 Map과 무관)
- **JSC**: Structures
- **SpiderMonkey**: Shapes

## 왜 필요한가

ECMAScript는 객체 프로퍼티를 사전(dictionary) 형태로 정의한다. 각 프로퍼티는 내부 슬롯을 가진다:

- `[[Value]]`: 연결된 값
- `[[Writable]]`: 값 변경 가능 여부
- `[[Enumerable]]`: `for...in` 열거 가능 여부
- `[[Configurable]]`: 삭제·속성 변경 가능 여부

객체 속성 접근 시 키로 사전을 뒤져 Property Attribute를 로드한 뒤 `[[Value]]`를 읽어야 한다.

### 동적 언어의 비용

- 컴파일 시점에 Property Offset(위치를 찾기 위한 값)을 기억해둘 수 없음 → **매 접근마다 동적 탐색**
- 동일 구조 객체를 여러 개 만들면 Property Attribute가 객체마다 반복 생성 → **메모리 낭비**

히든 클래스는 **구조가 같은 객체들이 Property Attribute를 공유**하고, **오프셋 기반 고정 위치 접근**을 가능하게 해 두 문제를 동시에 해결한다.

## 기본 구조

```
[ Object Memory ]              [ Hidden Class (C0) ]           [ Property Information ]
+---------------+              +--------------------+          +---------------------------+
| Pointer to HC | -----------> | Transition Table   |          | [ Property: name ]        |
+---------------+              | (name, height, ...)|          | - Offset: 0               |
| '하정훈'      | (Offset 0)   +--------------------+          | - [[Writable]]: true      |
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

- 객체 메모리는 **히든 클래스 포인터 + 값들**로 구성
- 값 위치는 **Offset**으로 표기 (정적 언어 class의 offset과 동일한 접근 방식)
- Property Attribute는 히든 클래스가 공유 → 같은 구조의 객체가 N개여도 1세트만 저장

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
- 새 히든 클래스는 **새로 생긴 프로퍼티 정보만** 들고 있음 (나머지는 체인 거슬러 올라가 조회)

**같은 순서로 프로퍼티를 추가하면** 다른 객체도 동일 체인을 재사용한다 → [[V8-Inline-Cache|Inline Cache]] 가 잘 먹힘.

반대로 **순서가 다르면** 체인 경로가 갈려 다른 히든 클래스로 분기된다.

## 히든 클래스 공유 조건

| 사례 | 공유? | 이유 |
|---|---|---|
| `class` 생성자로 만든 객체 vs object literal, 프로퍼티 이름·순서 동일 | ❌ | 서로 다른 생성자 — class 전용 생성자 vs 일반 Object 생성자 |
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

- 함수 인자로 다양한 히든 클래스의 객체를 넘기면 [[V8-Inline-Cache|Inline Cache]]가 polymorphic·megamorphic으로 전락

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Inline-Cache|V8 인라인 캐시]]
- [[V8-Ignition-TurboFan|V8 컴파일 파이프라인]]
