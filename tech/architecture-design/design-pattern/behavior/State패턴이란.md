---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["State 패턴이란?"]
---

# State 패턴이란?
객체의 내부 상태에 따라 동작이 변경되는 패턴. 상태를 별도 객체로 캡슐화하여 상태 전환과 상태별 행위를 관리한다.

## 왜 쓸까?

### 상태별 조건문을 줄인다
상태마다 별도 클래스를 두어 커지는 조건 분기를 분산할 수 있다. 작고 안정적인 상태 머신은 `switch`나 전이 테이블이 더 명확할 수 있다.

### 새 상태 추가 시 영향 범위를 제한한다
새 상태의 행동은 별도 객체에 둘 수 있지만 전이 규칙, 생성 팩토리와 상태 타입 목록은 함께 바뀔 수 있다.

### 상태 전환 로직을 명시적으로 관리
상태 객체나 Context 중 한곳에 전이 책임을 명시적으로 둔다. 전이를 상태에 분산하면 국소적인 이해가 쉽고, Context나 전이 표에 모으면 전체 흐름을 보기 쉽다.

### 상태별 동작을 독립적으로 테스트
각 상태가 독립된 객체이므로 개별 테스트가 쉽다.

## 핵심 개념

### Strategy와의 차이
- Strategy: 클라이언트가 외부에서 알고리즘을 선택/교체
- State: 현재 상태가 Context의 행동과 다음 전이에 영향을 준다. 상태 전환이 반드시 자동인 것은 아니다.

### 코드 예시: FailsafeSocket
```typescript
// 오프라인 상태에서는 메시지를 큐에 저장, 온라인이 되면 전송
class OfflineState {
  private queue: string[] = []

  send(message: string) {
    this.queue.push(message) // 큐에 저장
  }

  activate(socket: FailsafeSocket) {
    const queued = [...this.queue]
    this.queue = []
    socket.changeState(new OnlineState())
    queued.forEach(msg => socket.send(msg))
  }
}

class OnlineState {
  send(message: string) {
    // 직접 전송
  }
}
```

### 상태 머신
상태 전이를 명시적으로 정의:
- IDLE → PROCESSING (작업 시작)
- PROCESSING → COMPLETED (성공)
- PROCESSING → FAILED (실패)
- FAILED → PROCESSING (재시도)

## 실 사용 사례
1. TCP 연결: CLOSED → LISTEN → ESTABLISHED → CLOSE_WAIT
2. 주문 시스템: 대기 → 결제완료 → 배송중 → 완료
3. 게임 캐릭터: 대기 → 이동 → 공격 → 피격
4. 비동기 컴포넌트 초기화: QueuingState → InitializedState

## 출처

- 얄팍한 코딩사전, [State 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=242756)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994

## 관련 문서

- [[Strategy패턴이란|Strategy 패턴]]
- [[Memento패턴이란|Memento 패턴]]
