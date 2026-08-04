---
tags: [architecture, design-pattern, creational, prototype]
status: done
verified_at: 2026-08-04
category: "Architecture & Design"
aliases: ["Prototype Pattern", "프로토타입 패턴"]
---

# Prototype 패턴이란?

GoF Prototype은 원형 객체에게 자신의 복제본 생성을 위임하는 생성 패턴이다. 클라이언트는 구체 클래스를 몰라도 복제 계약을 통해 새 객체를 만들 수 있다.

```typescript
interface Prototype<T> {
  clone(): T
}

class Campaign implements Prototype<Campaign> {
  constructor(
    readonly name: string,
    readonly rules: readonly Rule[],
  ) {}

  clone(): Campaign {
    return new Campaign(this.name, this.rules.map((rule) => rule.clone()))
  }
}
```

## 복제 의미를 계약으로 정한다

- 얕은 복사는 중첩 객체 참조를 공유한다.
- 깊은 복사는 필요한 객체 그래프를 새로 만들지만 비용과 식별성 문제가 생긴다.
- DB Entity, 열린 연결, 스트림과 Lock처럼 복제하면 안 되는 자원도 있다.
- 복제 후 ID, 생성 시각과 도메인 이벤트를 유지할지 새로 만들지 정한다.

복제가 생성자보다 싸다고 가정하지 않는다. 실제 비용과 객체 의미를 측정한다. 복잡한 도메인 객체는 범용 복사보다 명시적인 `clone()`이나 새 객체 생성 Factory가 안전하다.

## JavaScript 프로토타입과 구분

JavaScript의 prototype chain은 객체가 다른 객체에 프로퍼티 탐색을 위임하는 언어 메커니즘이다. 객체를 복제해 생성하는 GoF Prototype과 이름은 같지만 같은 개념이 아니다.

`structuredClone()`은 HTML 표준의 구조화 복제 알고리즘을 사용하며 지원되는 값의 그래프를 복제한다. 모든 클래스의 도메인 의미, 메서드와 자원까지 보존하는 범용 `clone()`은 아니다. 전개 구문 `{ ...value }`는 한 단계의 enumerable own property만 복사한다.

## 출처

- 얄팍한 코딩사전, [Prototype 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=245402)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [WHATWG HTML 표준, Structured cloning](https://html.spec.whatwg.org/multipage/structured-data.html#structured-cloning)

## 관련 문서

- [[Prototype-Mechanism|JavaScript 프로토타입 동작 원리]]
- [[JS-Value-vs-Reference|원시 값과 참조 값]]
- [[Memento패턴이란|Memento 패턴]]
