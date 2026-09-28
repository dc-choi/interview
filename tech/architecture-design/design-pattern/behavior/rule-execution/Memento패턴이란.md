---
tags: [architecture, design-pattern, behavioral, memento]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Memento Pattern", "메멘토 패턴"]
---

# Memento 패턴이란?

Memento는 객체의 캡슐화를 깨지 않고 나중에 복원할 수 있는 상태 스냅샷을 만드는 행동 패턴이다.

## 역할

- Originator: 현재 상태로 Memento를 만들고 Memento에서 복원한다.
- Memento: 복원에 필요한 상태를 보관한다. Originator는 상태를 읽고 쓰는 넓은 인터페이스를 보고, Caretaker는 보관하고 전달하는 좁은 인터페이스만 본다.
- Caretaker: Memento의 내용은 해석하지 않고 저장 순서와 수명만 관리한다.

```typescript
interface DraftMemento {
  readonly title: string
  readonly body: string
  readonly version: number
}

class Draft {
  private title = ''
  private body = ''
  private version = 0

  createMemento(): DraftMemento {
    return { title: this.title, body: this.body, version: this.version }
  }

  restore(memento: DraftMemento): void {
    this.title = memento.title
    this.body = memento.body
    this.version = memento.version
  }
}
```

위 예시는 Memento를 공개된 읽기 전용 객체로 둔 단순형이다. Caretaker도 `title`과 `body`를 읽을 수 있고, 같은 모양의 객체 리터럴을 만들어 `restore()`에 넘길 수도 있다.

## TypeScript에서 좁은 인터페이스 강제하기

이상적으로는 구현 언어가 두 수준의 정적 접근 제한을 지원해 Originator만 넓은 인터페이스에 접근하게 한다. C++에서는 Originator를 Memento의 friend로 지정한다. TypeScript의 접근 제한자는 `public`, `protected`, `private`뿐이라 특정 클래스에만 멤버를 여는 수단이 없다. `private`와 `readonly`는 타입 검사에서만 적용되고, `private`는 타입 검사 중에도 대괄호 표기 접근을 허용한다([[TS-Class-Type-System|TS 클래스 타입 시스템]]).

런타임에도 경계가 필요하면 Memento를 내용 없는 식별 객체로 만들고, 실제 상태는 모듈 밖으로 내보내지 않은 `WeakMap`에 둔다. `unique symbol` 브랜드는 객체 리터럴로 만든 Memento를 컴파일 단계에서 거부하고([[TypeScript-Type-Compatibility#Brand 타입으로 우회|Brand 타입]]), `WeakMap` 조회 실패는 타입 단언으로 만든 가짜 Memento를 런타임에 걸러낸다. `WeakMap`은 키를 강하게 참조하지 않으므로 Memento를 참조하는 곳이 모두 사라지면 저장된 상태도 가비지 컬렉션 대상이 될 수 있다.

```typescript
declare const draftMementoBrand: unique symbol

/** Caretaker가 보는 좁은 인터페이스다. 보관했다가 Draft에 돌려주는 것만 가능하다. */
export interface DraftMemento {
  readonly [draftMementoBrand]: true
}

interface DraftState {
  readonly title: string
  readonly tags: readonly string[]
}

// 내보내지 않으므로 이 모듈 밖에서는 스냅샷 내용을 읽거나 등록할 수 없다.
const snapshots = new WeakMap<DraftMemento, DraftState>()

export class Draft {
  #title = ''
  #tags: string[] = []

  rename(title: string): void {
    this.#title = title
  }

  addTag(tag: string): void {
    this.#tags.push(tag)
  }

  /**
   * 현재 상태의 스냅샷을 만든다.
   * @returns 내용을 드러내지 않는 Memento
   */
  createMemento(): DraftMemento {
    const memento = Object.freeze({}) as DraftMemento
    snapshots.set(memento, { title: this.#title, tags: [...this.#tags] })
    return memento
  }

  /**
   * Memento에 담긴 상태로 되돌린다.
   * @param memento 이 모듈의 Draft가 만든 Memento
   * @throws {Error} 다른 곳에서 만든 객체를 받은 경우
   */
  restore(memento: DraftMemento): void {
    const state = snapshots.get(memento)
    if (state === undefined) {
      throw new Error('Draft가 만든 Memento가 아니다')
    }
    this.#title = state.title
    // 복원할 때도 복사해야 복원 뒤의 변경이 같은 Memento에 섞이지 않는다.
    this.#tags = [...state.tags]
  }
}
```

같은 모듈의 다른 Draft 인스턴스가 만든 Memento도 복원된다. 인스턴스 단위로 막아야 하면 스냅샷에 만든 Draft의 참조를 함께 저장하고 `restore()`에서 비교한다.

## 설계 체크포인트

- 스냅샷이 가변 객체를 공유하지 않게 한다. 대입은 복사가 아니라 참조 공유다. 원소가 원시값인 배열은 `[...items]` 같은 얕은 복사로 원본과 독립된 사본이 되고, 원소가 가변 객체이면 깊은 복사나 명시적 변환이 필요하다. `structuredClone`은 prototype 체인과 class private 요소를 복제하지 않으므로 클래스 인스턴스인 도메인 객체는 명시적으로 변환한다([[Defensive-Copy-Depth-Collections|방어적 복사의 깊이와 컬렉션]]).
- 복사는 Memento를 만들 때와 복원할 때 모두 한다. 복원에서 Memento의 배열을 그대로 대입하면 복원 뒤 Originator의 변경이 Memento에 반영되어, 같은 Memento로 여러 번 되돌릴 때 잘못된 상태가 된다.
- 속성 수식자 `readonly`와 배열이 아닌 객체 타입에 쓴 `Readonly<T>`는 타입 검사에서 속성 재할당만 막고 중첩된 배열과 객체의 내용 변경은 막지 않는다. 배열 내용까지 막으려면 `readonly T[]`를 쓰되 이것도 타입 검사 단계에서만 적용된다.
- 큰 상태를 자주 복사하면 메모리와 CPU 비용이 커진다. 변경분 저장이나 보존 개수 제한을 검토한다.
- 스키마가 바뀐 오래된 Memento를 복원할 수 있는지 버전 정책을 둔다.
- 비밀번호, 토큰과 개인정보가 스냅샷에 섞이지 않게 한다.

Memento는 한 객체의 상태 복원에 초점을 둔다. Command의 `undo()`는 역연산을 실행할 수도 있고 Memento를 보관해 복원할 수도 있다. Event Sourcing은 도메인 사건을 영속화해 상태를 재구성하는 아키텍처이며 단순 스냅샷과 목적 및 운영 비용이 다르다.

## 출처

- 얄팍한 코딩사전, [Memento 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=245400)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 15. Memento](https://www.youtube.com/watch?v=HxAOB60NDKI)
- [TypeScript Handbook, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html), [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html), [Symbols](https://www.typescriptlang.org/docs/handbook/symbols.html)
- [MDN, WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap), [Shallow copy](https://developer.mozilla.org/en-US/docs/Glossary/Shallow_copy), [The structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)

## 관련 문서

- [[Command패턴이란|Command 패턴]]
- [[Event-Sourcing|Event Sourcing]]
- [[Prototype패턴이란|Prototype 패턴]]
