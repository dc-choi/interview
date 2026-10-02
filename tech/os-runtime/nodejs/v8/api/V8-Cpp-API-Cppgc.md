---
tags: [runtime, v8, cpp, cppgc, garbage-collection]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["V8 cppgc", "V8 CppHeap", "V8 TracedReference"]
---

# C++ 객체 그래프와 cppgc

Cppgc는 C++ 객체 사이의 참조를 추적해 관리하는 GC 라이브러리다. JS wrapper의 handle만 보관하는 방식과 달리 C++ 객체 그래프 자체를 GC가 이해하도록 선언한다. 기준은 V8 15.7.0 candidate API다.

## 객체 생성과 Trace

GC 대상 타입은 `GarbageCollected<T>` 계열을 올바른 상속 위치에 두고 `MakeGarbageCollected()`로 생성한다. 일반 `new`로 만든 객체를 사후에 같은 관리 객체로 취급하지 않는다. Mixin은 직접 할당하는 완성 타입이 아니다.

객체의 `Trace(Visitor*)`는 관리 대상 참조를 모두 방문한다. 상속 구조에서는 기반 클래스의 trace도 이어야 한다. 다형적 객체는 필요한 virtual trace와 override 계약을 지킨다. 필드를 선언만 하고 trace에서 누락하면 살아 있는 native 참조를 GC가 보지 못할 수 있다.

| 참조 | 역할 |
|---|---|
| `Member<T>` | 같은 관리 객체 그래프 안의 강한 edge |
| `WeakMember<T>` | 대상 생존을 강제하지 않는 edge |
| `Persistent<T>` | GC 객체 그래프 밖에서 유지하는 root |
| `WeakPersistent<T>` | 외부에서 보관하는 약한 root |
| Ephemeron | key 생존 조건에 따라 value를 강하게 추적하는 관계 |

약한 참조도 올바르게 trace한다. Weak callback에서 liveness를 확인할 때는 `LivenessBroker` 등 제공된 절차를 따른다. 약한 key와 value를 단순한 독립 strong edge로 바꾸면 원하지 않는 객체 보존이 생긴다.

## GC와 동시성

Atomic, incremental과 concurrent tracing은 서로 다른 실행 조건이다. Concurrent trace에서 안전하게 읽을 수 없는 상태라면 mutator thread로 넘기는 API를 사용한다. Trace callback이나 write barrier에서 GC 대상 할당과 그래프 변경을 임의로 수행하지 않는다.

공개 managed pointer가 처리하는 barrier를 내부 상수나 `HeapConsistency` API로 직접 흉내 내지 않는다. Doxygen에 internal class가 노출됐다는 사실은 embedder가 그 구현에 의존해도 된다는 의미가 아니다.

Compaction을 활성화하는 custom space는 이동 가능한 참조 slot을 기록하는 추가 조건을 갖는다. Custom space ID의 유일성과 연속성도 생성 시점에 맞춘다. 객체가 이동할 수 있는데 raw pointer만 외부에 남기는 구조를 피한다.

## 스레드와 root 수명

일반 persistent root의 생성과 소멸은 같은 스레드 조건을 따른다. Cross-thread 이름이 붙은 참조도 객체의 thread-safe 접근이나 힙 종료 보호를 자동으로 제공하지 않는다. 해당 `subtle` API는 직접 사용하지 말라는 경고가 있으므로 일반적인 공유 포인터 대체재로 채택하지 않는다.

Weak reference를 강하게 잠갔다고 대상의 필드 접근에 mutex가 생기는 것은 아니다. 대상의 생존, 힙 자체의 생존과 동시 변경에 대한 동기화는 각각 확인한다. Raw pointer 추출, 역참조와 release 연산에도 별도의 thread 제약이 있다.

## JS와 C++ 그래프 연결

`CppHeap`과 JS wrapper를 연결할 때 C++에서 JS로 향하는 edge도 trace해야 한다. `TracedReference`는 일반 `Global`과 소멸 의미가 다르다. 소멸자가 참조 정리를 모두 수행한다고 가정하지 않는다.

`JSVisitor` 등의 계약으로 살아 있는 JS 참조를 추적하고, C++ 객체가 더 이상 보유하지 않는 edge는 명시적으로 정리한다. Droppable reference의 회수 조건과 무효화 이후 접근 제한을 지킨다. 이미 회수된 대상을 handle 모양만 보고 사용하지 않는다.

Wrapper와 native 객체를 별개 root로 오래 보관하면 그래프 연결이 맞아도 수명이 불필요하게 늘 수 있다. 명시적 자원 종료와 GC 회수의 역할을 나누고, leak 진단에서는 양쪽의 retaining edge를 확인한다.

## GC 억제와 진단

`NoGarbageCollectionScope`는 제한된 범위에서 GC 관련 동작을 지연시키는 조건을 제공하지만 이미 진행 중인 모든 단계를 없애는 전역 정지 장치가 아니다. 범위를 길게 유지하면 메모리 사용이 늘 수 있다.

`DisallowGarbageCollectionScope`는 GC가 발생하면 오류로 드러내기 위한 강한 계약이다. 메모리 부족을 해결하는 보호 장치로 쓰지 않는다. 강제 GC와 stack state 지정 API도 testing과 실제 운영 용도를 구분한다.

Heap snapshot의 이름 callback에서는 GC 할당이나 힙 변경을 피한다. 이름 포인터가 요구된 기간 동안 살아 있어야 하며 임시 이름이 필요하면 복사하는 API를 사용한다. Testing heap의 단계별 GC와 compaction 요청은 알고리즘 검증용이지 production scheduling 정책이 아니다.

보수적인 stack scan을 끈 구성은 stack에 관리 객체 포인터가 없다는 task 경계를 필요로 한다. 실제 포인터가 남아 있는데 `kNoHeapPointers`를 지정하지 않는다. Platform이 필요한 non-nestable task를 지원하지 않으면 embedder가 수집을 진행해야 하는 조건도 확인한다.

Prefinalizer는 dead 판정 뒤 destructor 전에 생성 스레드에서 실행되며 객체 그래프에 접근할 수 있다. 일반 destructor와 같은 접근 계약으로 취급하지 않는다. `subtle::FreeUnreferencedObject()`를 사용해도 destructor가 즉시 실행된다는 보장은 없고, 다른 참조가 남으면 use-after-free가 된다. 이런 저수준 조작을 정상적인 객체 소유권 정리의 기본 경로로 삼지 않는다.

## 출처

- [V8, cppgc Heap](https://v8.github.io/api/head/classcppgc_1_1Heap.html)
- [V8, cppgc Visitor](https://v8.github.io/api/head/classcppgc_1_1Visitor.html)
- [V8, cppgc namespace](https://v8.github.io/api/head/namespacecppgc.html)
- [V8, cppgc subtle namespace](https://v8.github.io/api/head/namespacecppgc_1_1subtle.html)
- [V8, CppHeap](https://v8.github.io/api/head/classv8_1_1CppHeap.html)
- [V8, TracedReference](https://v8.github.io/api/head/classv8_1_1TracedReference.html)
- [V8, JSVisitor](https://v8.github.io/api/head/classv8_1_1JSVisitor.html)
- [V8, cppgc prefinalizer header](https://v8.github.io/api/head/prefinalizer_8h.html)

## 관련 문서

- [[V8-Cpp-API]]
- [[V8-GC-and-Memory]]
- [[V8-Cpp-API-Handles-and-Exceptions]]
- [[V8-Cpp-API-Profiling]]
