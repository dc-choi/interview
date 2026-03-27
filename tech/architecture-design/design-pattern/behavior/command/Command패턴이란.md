---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["Command 패턴이란?"]
---

# Command 패턴이란?
실행할 작업의 모든 정보를 객체로 캡슐화하는 패턴. 요청의 매개변수화, 대기열 처리, 실행 취소를 가능하게 한다.

## 왜 쓸까?

### 실행 지연
즉시 실행하지 않고 나중에 실행할 수 있다.

### 직렬화
명령을 저장하거나 네트워크로 전송할 수 있다.

### 실행 취소(Undo)
역연산을 구현하여 작업을 되돌릴 수 있다.

### 이력 관리
모든 작업을 기록하여 추적할 수 있다.

### 매크로
여러 명령을 하나로 묶어 실행할 수 있다.

## 핵심 개념

### 4가지 구성 요소
- Command: 실행 정보를 담은 객체 (execute, undo 메서드)
- Client: Command를 생성하는 주체
- Invoker: Command를 실행하는 주체 (큐, 스케줄러 등)
- Target (Receiver): Command가 실제 작업을 수행하는 대상

### 코드 예시
```typescript
interface Command {
  execute(): void
  undo(): void
  serialize?(): string
}

class AddItemCommand implements Command {
  constructor(
    private cart: ShoppingCart,
    private item: CartItem
  ) {}

  execute() {
    this.cart.addItem(this.item)
  }

  undo() {
    this.cart.removeItem(this.item.id)
  }

  serialize() {
    return JSON.stringify({
      type: 'ADD_ITEM',
      item: this.item
    })
  }
}

// Invoker
class CommandHistory {
  private history: Command[] = []

  execute(command: Command) {
    command.execute()
    this.history.push(command)
  }

  undoLast() {
    const command = this.history.pop()
    command?.undo()
  }
}
```

## 실 사용 사례
1. Redux: Action 객체 = Command, Reducer = Target, Store.dispatch = Invoker
2. CQRS: Command(쓰기)와 Query(읽기) 분리
3. 텍스트 에디터: Undo/Redo 기능
4. 작업 큐: BullMQ, SQS에서 직렬화된 명령 처리
5. Git: commit, revert, cherry-pick
