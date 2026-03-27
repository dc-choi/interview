---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Call Stack Heap"]
---

### 콜 스택 과 힙
- 콜 스택 (Call Stack)
```
원시 타입 값과 함수 호출의 실행 컨텍스트를 저장하는 곳.
LIFO(Last In, First Out) 구조로 동작한다.

함수가 호출되면 새로운 실행 컨텍스트가 스택에 push되고, 함수가 반환되면 pop된다.
Node.js는 단일 콜 스택을 사용하므로 한 번에 하나의 함수만 실행 가능하다.
스택이 비어야 이벤트 루프가 다음 콜백을 꺼내 실행할 수 있다.
```

- 힙 (Heap)
```
객체, 배열, 함수와 같이 크기가 동적으로 변할 수 있는 참조 타입 값을 저장하는 곳.
비구조화된 메모리 영역으로, V8 엔진이 관리한다.
```

## V8 힙 메모리 구조
```
V8의 힙은 여러 영역으로 나뉜다:

┌───────────────────────────────────────┐
│            New Space (Young Gen)      │  ← 새로 할당된 객체. 크기가 작고 GC가 빈번함
│  ┌─────────────┬─────────────┐        │
│  │  Semi-space  │  Semi-space  │       │  ← 두 개의 반공간으로 구성 (From / To)
│  └─────────────┴─────────────┘        │
├───────────────────────────────────────┤
│            Old Space (Old Gen)        │  ← Young Gen에서 살아남은 객체가 승격(promote)됨
├───────────────────────────────────────┤
│            Large Object Space         │  ← 크기가 큰 객체 전용
├───────────────────────────────────────┤
│            Code Space                 │  ← JIT 컴파일된 코드 저장
├───────────────────────────────────────┤
│            Map Space                  │  ← Hidden Class(Map) 저장
└───────────────────────────────────────┘
```

## Garbage Collection (V8 GC)
V8은 **Generational GC** 전략을 사용한다. 대부분의 객체는 금방 죽는다는 "세대 가설"에 기반한다.

### Scavenger (Minor GC) — Young Generation
```
New Space에서 동작한다. 매우 빈번하게 실행되며 빠르다.

1. 새 객체는 From 반공간에 할당된다.
2. From 반공간이 가득 차면 Scavenge 발생.
3. 살아있는 객체만 To 반공간으로 복사 (Cheney's algorithm).
4. From과 To를 교체 (swap).
5. 두 번 살아남은 객체는 Old Space로 승격(promote).
```

### Mark-Sweep-Compact (Major GC) — Old Generation
```
Old Space에서 동작한다. 덜 빈번하지만 더 오래 걸린다.

1. Mark: 루트(전역 객체, 스택)에서 시작하여 도달 가능한 객체를 표시
2. Sweep: 표시되지 않은 객체를 해제
3. Compact: 단편화된 메모리를 압축하여 연속 공간 확보

V8은 Incremental Marking과 Concurrent Marking으로 메인 스레드 블로킹을 최소화한다.
```

### GC와 이벤트 루프의 관계
```
GC가 실행되면 메인 스레드가 일시 정지(Stop-the-World)된다.
따라서 힙 메모리가 커지면 GC 시간이 늘어나 이벤트 루프가 지연될 수 있다.
--max-old-space-size 플래그로 Old Space 크기를 조절할 수 있다.
```

## 관련 문서
- [[Event-Loop|Event Loop]]
- [[V8|V8 엔진]]
- [[Scope]]
- [[Execution-Context|Execution Context]]
