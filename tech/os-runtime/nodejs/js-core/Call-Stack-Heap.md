---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Call Stack Heap"]
verified_at: 2026-09-03
---

### 콜 스택과 힙
- 콜 스택 (Call Stack)
```
함수 호출 프레임을 LIFO(Last In, First Out)로 관리하는 실행 모델.

함수가 호출되면 새로운 실행 컨텍스트가 스택에 push되고, 함수가 반환되면 pop된다.
Node.js의 한 JavaScript 실행 스레드는 한 시점에 한 작업만 실행한다. Worker는 별도 JavaScript 실행 환경을 가진다.
현재 작업이 반환된 뒤 이벤트 루프가 다음 작업과 microtask 처리를 진행한다.
```

- 힙 (Heap)
```
객체, 배열, 함수 같은 JavaScript 객체가 주로 할당되는 V8 관리 메모리다.
값의 실제 배치와 일부 지역 변수의 최적화는 JavaScript 명세가 고정하지 않으며 V8 최적화에 따라 달라진다.
```

## V8 힙 메모리 구조
```
대표적인 V8 allocation space를 단순화한 개념도다. 실제 space는 V8 빌드와 기능 플래그에 따라 달라진다.

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
│            Trusted Space              │  ← 신뢰 경계가 필요한 runtime 객체
└───────────────────────────────────────┘
```

2026-09-03에 확인한 V8 main source에는 Read-only, New, Old, Code, 선택적 Shared, Trusted와 New/Old/Code Large Object Space 등이 선언되어 있다. sandbox가 켜진 경우 Trusted Space는 신뢰 객체를 sandbox 밖에 둔다. 현재 source에는 별도 Map Space가 없으므로 Hidden Class의 저장 위치를 고정된 공간으로 외우지 않는다.

## Garbage Collection (V8 GC)
V8은 **Generational GC** 전략을 사용한다. 대부분의 객체는 금방 죽는다는 "세대 가설"에 기반한다.

### Scavenger (Minor GC) — Young Generation
```
Young generation을 대상으로 하는 GC다. semispace Scavenger 경로를 단순화하면 다음과 같다.

1. 새 객체는 From 반공간에 할당된다.
2. From 반공간이 가득 차면 Scavenge 발생.
3. 도달 가능한 객체를 To 반공간 또는 Old Space로 옮긴다.
4. From과 To를 교체 (swap).
5. 생존 객체는 age와 공간 압력 같은 휴리스틱에 따라 Old Space로 승격될 수 있다.
```

V8의 2017년 Parallel Scavenger 설명은 Halstead 계열 semispace collector와 동적 work stealing을 설명한다. 현재 V8 source는 Scavenger 외 Minor Mark-Sweep 경로도 표시하므로, 모든 실행에서 같은 minor GC 세부 구현이라고 단정하지 않는다.

### Mark-Sweep-Compact (Major GC) — Old Generation
```
Old generation을 포함해 힙을 수집하는 major GC의 개념적 단계다. 실제로 sweep과 compact의 범위는 단편화와 collector 판단에 따라 달라진다.

1. Mark: 루트(전역 객체, 스택)에서 시작하여 도달 가능한 객체를 표시
2. Sweep: 표시되지 않은 객체를 해제
3. Compact: 단편화된 메모리를 압축하여 연속 공간 확보

V8은 Orinoco 이후 concurrent marking, parallel scavenging과 parallel compaction 같은 단계를 사용해 main thread pause를 줄이는 방향으로 발전했다. pause 시간은 힙 상태와 워크로드에 따라 측정한다.
알고리즘 이론과 Tri-color, Incremental, Concurrent, Work Stealing의 차이는
[[GC-Algorithm|GC 알고리즘]] 문서 참고.
```

### GC와 이벤트 루프의 관계
```
GC에는 JavaScript 실행을 멈추는 단계가 있고, concurrent 또는 parallel로 진행되는 단계도 있다. 모든 GC를 하나의 긴 Stop-the-World로 설명하면 부정확하다.
힙과 live object가 커지면 GC 작업과 pause가 늘어 이벤트 루프 지연으로 이어질 수 있으므로 실제 서비스에서 측정한다.
`--max-old-space-size` 플래그로 Old Space 크기를 조절할 수 있다.
```

## 관련 문서
- [[Event-Loop|Event Loop]]
- [[V8|V8 엔진]]
- [[GC-Algorithm|GC 알고리즘]]
- [[Scope]]
- [[Execution-Context|Execution Context]]

## 출처

- [V8 source, AllocationSpace](https://chromium.googlesource.com/v8/v8/+/refs/heads/main/src/common/globals.h)
- [Orinoco: young generation garbage collection — V8](https://v8.dev/blog/orinoco-parallel-scavenger)
- [Concurrent marking in V8](https://v8.dev/blog/concurrent-marking)
- [Node.js, `--max-old-space-size`](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-mib)
