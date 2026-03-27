---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["State 패턴이란?"]
---

# State 패턴이란?
객체의 내부 상태에 따라 동작이 변경되는 패턴. 상태를 별도 객체로 캡슐화하여 상태 전환과 상태별 행위를 관리한다.

## 왜 쓸까?

### 상태별 조건문(if/switch)을 제거
상태마다 별도 클래스를 만들어 조건 분기를 없앤다.

### 새 상태 추가 시 기존 코드 수정 최소화
새로운 상태 클래스를 추가하면 되므로 기존 상태 코드를 건드리지 않는다.

### 상태 전환 로직을 명시적으로 관리
어떤 상태에서 어떤 상태로 전환 가능한지 각 상태 클래스 내부에서 관리한다.

### 상태별 동작을 독립적으로 테스트
각 상태가 독립된 객체이므로 개별 테스트가 쉽다.

## 핵심 개념

### Strategy와의 차이
- Strategy: 클라이언트가 외부에서 알고리즘을 선택/교체
- State: 객체 내부 상태가 자동으로 변경되며 동작이 달라짐. 고정된 접근 방식, 컨텍스트가 진화

### 코드 예시: FailsafeSocket
```typescript
// 오프라인 상태에서는 메시지를 큐에 저장, 온라인이 되면 전송
class OfflineState {
  private queue: string[] = []

  send(message: string) {
    this.queue.push(message) // 큐에 저장
  }

  activate(socket: FailsafeSocket) {
    // 큐에 쌓인 메시지 전송
    this.queue.forEach(msg => socket.send(msg))
    socket.changeState(new OnlineState())
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
