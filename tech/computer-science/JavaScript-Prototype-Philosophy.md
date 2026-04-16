---
tags: [cs, javascript, prototype, oop, philosophy, language-design]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["JavaScript Prototype Philosophy", "JS가 프로토타입을 선택한 이유", "Prototype vs Class"]
---

# JavaScript가 프로토타입을 선택한 이유

JS의 `class`가 ES6에 추가됐지만 내부 모델은 여전히 **프로토타입**이다. 이 선택은 기술적 우연이 아니라 **객체를 고정 분류가 아닌 유사성·맥락으로 다룬다**는 철학적 세계관의 산물. Self 언어·인지심리학·철학이 맞물린 결과를 이해하면 JS의 동적 특성(prototype chain·this 동적 바인딩·lexical scope)이 일관된 그림으로 보인다. 프로토타입의 기술적 동작은 [[Prototype-OOP]] 참조.

## 두 가지 객체 세계관

| 측면 | 클래스 기반 (Java·C++) | 프로토타입 기반 (JS·Self·Lua) |
|---|---|---|
| 철학적 뿌리 | 플라톤 이데아 — "추상 본질 → 구체 인스턴스" | 비트겐슈타인 가족 유사성 — "구체에서 출발하는 유사성" |
| 우선순위 | 타입 정의 → 인스턴스 생성 | 객체 생성 → 다른 객체 파생 |
| 분류 방식 | 공유 속성으로 엄밀히 분류 | 원형(prototype)과의 유사성 |
| 설계 단계 | 컴파일 타임에 구조 고정 | 런타임에 구조 진화 |
| 유연성 | 낮음 (변경 어려움) | 높음 (메서드 추가·삭제 자유) |
| 학습 곡선 | 초기 설계 부담 | 예측 불가능성 |

## 클래스의 철학 — 플라톤

플라톤은 "참새·비둘기·독수리는 개별 존재이지만 모두 **'새'라는 이데아**의 복사본"이라 봤다. 클래스 기반 OOP가 정확히 이 구조 — `class Bird` 라는 추상 정의를 먼저 두고 인스턴스는 그 복사본.

이 세계관은 **안정적이고 예측 가능한 시스템** 설계에 유리. 대규모 정적 타입 언어(Java·C#)가 이 모델을 채택한 이유.

## 프로토타입의 철학 — 비트겐슈타인·Rosch

비트겐슈타인은 **"게임"의 정의**를 반박으로 사용했다. 모든 게임이 공유하는 단일 속성이 존재하는가? 아니. 경쟁이 있는 것도 있고 없는 것도 있고, 규칙이 있거나 없거나, 혼자 하거나 여럿이 하거나. "게임"은 **가족 유사성(family resemblance)** 으로 묶인 집합.

인지심리학자 Eleanor Rosch는 이를 **프로토타입 이론**(1970년대)으로 구체화. 사람은 대상을 분류할 때 속성 목록을 체크하지 않고 **가장 전형적인 예시(원형)와의 유사성**으로 판단한다. "참새는 전형적 새, 타조는 주변부 새".

**Self 언어**(Xerox PARC, 1987)는 이 이론을 프로그래밍으로 구현:
- 클래스 없음. 모든 것이 구체 객체
- 객체를 복제(cloning)해 파생
- 메서드·슬롯을 런타임에 추가·삭제
- 메시지 위임(delegation)으로 상속 대체

JS는 Self의 직계 영향 — Brendan Eich가 10일 만에 만든 언어의 기반에 Self 철학이 깔림.

## JS 문법에 숨어있는 프로토타입 철학

### Prototype Chain

```ts
const proto = { greet() { return 'hi'; } };
const obj = Object.create(proto);
obj.greet();  // 'hi' — obj에 메서드가 없으면 proto로 찾아 올라감
```

객체는 **독립된 존재**. 필요할 때 다른 객체(proto)에 "위임"해서 기능을 빌려옴. 클래스 계층처럼 고정되지 않고 **런타임에 proto를 바꿀 수 있음** (`Object.setPrototypeOf`).

### 동적 `this` 바인딩

```ts
function say() { return this.name; }

const a = { name: 'Alice', say };
const b = { name: 'Bob',   say };

a.say();   // 'Alice'
b.say();   // 'Bob' — 같은 함수, 다른 this
```

`this`는 **"누가 이 함수를 호출했는가"** 로 결정. 클래스의 `this`는 정의 시점에 고정이지만, JS는 **수신자(receiver)에 따라 동적**.

비트겐슈타인의 "단어의 의미는 **사용되는 문맥**에서 결정된다"와 정확히 일치.

### Lexical Scope · Hoisting

변수의 의미는 **선언 위치의 스코프**에서 결정 — 즉 "코드 텍스트의 위치"라는 맥락이 의미를 정함. "단어의 의미는 문맥에서 온다"의 프로그래밍 구현.

### 객체 확장의 자유

```ts
const user = { name: 'Alice' };
user.greet = function() { return `Hi, ${this.name}`; };
user.role = 'admin';
```

클래스는 정의 시점에 멤버가 고정되지만, JS 객체는 **언제든 속성 추가·제거** 가능. 현실 세계의 "존재는 고정된 형상이 아니라 변화하는 관계망"이라는 세계관.

## ES6 `class` — 문법적 설탕일 뿐

```ts
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}
```

내부는 여전히 프로토타입:
```ts
// 위 class는 대략 아래와 동치
function Animal(name) { this.name = name; }
Animal.prototype.speak = function() { return `${this.name} makes a sound`; };
```

**표면만 바뀜**. 프로토타입 체인·동적 바인딩·런타임 확장 모두 그대로. 더글라스 크록포드 등은 `class` 도입이 "JS의 진짜 강점(유연성)을 숨긴다"고 비판.

## 각 모델의 장단점

**프로토타입의 장점**
- 런타임 유연성 — 맥락에 맞춘 진화
- 초기 설계 부담 작음
- 메타프로그래밍(프록시·리플렉션)과 궁합 좋음
- 프레임워크(React·Vue)의 반응형 시스템 기반

**프로토타입의 단점**
- 예측 불가능성 (런타임에 객체 구조가 바뀔 수 있음)
- 학습 곡선 — 체인·this·closure의 누적 복잡도
- 대규모 프로젝트에서 구조 추적 어려움 → TypeScript로 보완

**클래스의 장점**
- 명시적 구조 — IDE·정적 분석 친화
- 대규모 팀 협업에 안정적
- 성능 최적화 용이 (V8의 hidden class)

**클래스의 단점**
- 표현력 제한 — 초기 설계 변경 비용 큼
- 다이나믹·메타프로그래밍에 적합하지 않음

## 실무에서 이 철학이 드러나는 순간

- **`Object.create(proto)`** 를 쓰면 바로 프로토타입 위임
- **React Hooks**의 `useContext`·`useReducer` 는 "맥락이 의미를 결정"하는 JS 철학 위에 자연스럽게 얹힘
- **Mixin·Composition** 패턴 — 클래스 상속 대신 객체 조합
- **Reactive 프레임워크의 Proxy** — 런타임 객체 변화 감지
- **TypeScript** 는 이 유연성에 **정적 타입 레이어**를 덧붙여 두 세계의 장점을 취함

## 자주 헷갈리는 포인트

- **`class` = 클래스 기반 OOP** 오해 — JS의 class는 프로토타입 위 설탕. 동작은 프로토타입
- **`prototype` 속성 vs `[[Prototype]]`** — 함수의 `prototype` 속성 ≠ 인스턴스의 숨겨진 `[[Prototype]]`(= `__proto__`). 둘은 연결되지만 같은 것이 아님
- **`__proto__` vs `Object.getPrototypeOf()`** — 전자는 비표준 별칭, 후자가 표준
- **상속이 강력한 도구가 아님** — 프로토타입이든 클래스든, 깊은 상속은 피하고 **합성**을 선호하는 게 현대 모범
- **프로토타입 체인이 느리다** 오해 — V8의 hidden class 최적화 덕에 실제로 매우 빠름. 단, 동적으로 shape가 바뀌면 최적화가 깨짐
- **프로토타입 = 오래된 방식** 오해 — React·Vue·Node.js 내부는 프로토타입 철학 위에 설계됨. 최신

## 면접 체크포인트

- **프로토타입 vs 클래스 기반 OOP**의 철학적 차이 (이데아 vs 가족 유사성)
- **Self 언어** 가 JS에 준 영향
- JS의 동적 특성(동적 `this`·런타임 확장·lexical scope)이 모두 **"맥락이 의미를 결정"** 한다는 원칙의 구현임을 설명 가능
- **ES6 `class`가 문법적 설탕**이라는 사실과 내부 동작
- 프로토타입·클래스 각각의 **장단점과 언제 유리한가**
- TypeScript가 **두 세계를 어떻게 조화**시키는가 (정적 타입 + 프로토타입 유연성)

## 출처
- [medium @limsungmook — 자바스크립트는 왜 프로토타입을 선택했을까](https://medium.com/@limsungmook/%EC%9E%90%EB%B0%94%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%B8%EB%8A%94-%EC%99%9C-%ED%94%84%EB%A1%9C%ED%86%A0%ED%83%80%EC%9E%85%EC%9D%84-%EC%84%A0%ED%83%9D%ED%96%88%EC%9D%84%EA%B9%8C-997f985adb42)

## 관련 문서
- [[tech/computer-science/js/Prototype-OOP|Prototype 기반 OOP (기술 동작)]]
- [[tech/computer-science/js/Hoisting|호이스팅]]
- [[tech/computer-science/js/Scope|스코프]]
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트]]
- [[Types-As-Proofs|Types as Proofs]]
