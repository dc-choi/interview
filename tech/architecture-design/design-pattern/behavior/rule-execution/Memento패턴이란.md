---
tags: [architecture, design-pattern, behavioral, memento]
status: done
category: "Architecture & Design"
aliases: ["Memento Pattern", "메멘토 패턴"]
---

# Memento 패턴이란?

Memento는 객체의 캡슐화를 깨지 않고 나중에 복원할 수 있는 상태 스냅샷을 만드는 행동 패턴이다.

## 역할

- Originator: 현재 상태로 Memento를 만들고 Memento에서 복원한다.
- Memento: 복원에 필요한 상태를 보관한다.
- Caretaker: Memento의 내용은 해석하지 않고 저장 순서와 수명만 관리한다.

```typescript
type DraftMemento = Readonly<{
  title: string
  body: string
  version: number
}>

class Draft {
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

## 설계 체크포인트

- 스냅샷이 가변 객체를 공유하지 않도록 값 복사와 불변성을 점검한다.
- 큰 상태를 자주 복사하면 메모리와 CPU 비용이 커진다. 변경분 저장이나 보존 개수 제한을 검토한다.
- 스키마가 바뀐 오래된 Memento를 복원할 수 있는지 버전 정책을 둔다.
- 비밀번호, 토큰과 개인정보가 스냅샷에 섞이지 않게 한다.

Memento는 한 객체의 상태 복원에 초점을 둔다. Command의 `undo()`는 역연산을 실행할 수도 있고 Memento를 보관해 복원할 수도 있다. Event Sourcing은 도메인 사건을 영속화해 상태를 재구성하는 아키텍처이며 단순 스냅샷과 목적 및 운영 비용이 다르다.

## 출처

- 얄팍한 코딩사전, [Memento 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=245400)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994

## 관련 문서

- [[Command패턴이란|Command 패턴]]
- [[Event-Sourcing|Event Sourcing]]
- [[Prototype패턴이란|Prototype 패턴]]
