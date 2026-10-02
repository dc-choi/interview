---
tags: [runtime, v8, gc, memory]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["V8 GC", "Orinoco", "Oilpan", "V8 Pointer Compression"]
---

# V8의 GC와 메모리 관리

GC는 더 이상 도달할 수 없는 관리 대상 객체를 회수한다. 순환 참조 자체가 누수인 것은 아니며, cache, closure, 전역 값이나 native handle을 통해 계속 도달 가능한 객체는 앱이 더 이상 필요하지 않아도 남는다. 객체를 회수하는 문제와 힙의 빈 공간을 OS에 돌려 RSS를 낮추는 문제도 구분한다.

## 세대와 빠른 할당

짧게 사는 객체가 많다는 세대 가설을 이용해 young generation을 자주 회수하고 오래 살아남은 객체를 old generation으로 옮긴다. 세대의 크기, promotion 기준과 collector 선택은 엔진 버전, 빌드와 실행 조건에 따라 달라진다. 옛 글의 두 번 생존, 고정 MiB 값을 모든 V8의 규칙으로 외우지 않는다.

Bump allocation은 미리 확보한 공간 안에서 현재 포인터를 옮겨 빠르게 할당한다. 병렬 작업은 각 작업자가 local allocation buffer를 받아 중앙 경합을 줄일 수 있다. 이 빠른 경로만 보고 모든 객체 할당이 GC와 공간 재확보까지 포함해 O(1)이라고 단정하지 않는다.

## 병렬, 점진과 동시 실행

| 방식 | JS와 GC 작업 관계 | 줄이려는 비용 |
|---|---|---|
| Parallel | JS를 멈춘 동안 GC 작업을 여러 worker가 나눔 | 한 pause 안의 처리 시간 |
| Incremental | main thread의 GC 작업을 작게 나눠 JS와 번갈아 수행 | 긴 연속 pause |
| Concurrent | JS가 실행되는 동안 worker가 일부 GC 작업을 수행 | main thread가 직접 할 작업 |

Orinoco는 이런 기법을 조합한 V8 GC 설계다. Concurrent GC도 root 처리와 최종 동기화 등 정지 구간이 있을 수 있다. pause가 없어졌다는 뜻이 아니다. 코어 수 증가가 이상적으로 그대로 속도 향상이 되는 것도 아니며, 작은 힙에서는 동기화와 작업 분배 비용이 상대적으로 크다.

V8의 parallel scavenger 글은 young 객체의 표시, 복사와 참조 갱신을 작업자가 겹쳐 처리하고 work stealing으로 남은 일을 분배하는 구조를 설명한다. 여러 작업자가 같은 객체를 복사하지 않도록 원자적 claim과 forwarding 정보를 사용한다. 이는 구현 원리이며 특정 버전의 collector를 모든 현재 빌드의 선택으로 단정하지 않는다.

## Write barrier와 remembered set

Young GC가 old generation 전체를 매번 따라가지 않도록 old 객체에서 young 객체로 향하는 참조를 기록한다. JS가 참조를 대입할 때 실행되는 write barrier가 이런 remembered set을 유지한다.

Concurrent/incremental marking 중 JS가 참조를 바꾸는 것도 처리해야 한다. Collector가 참조 그래프를 읽는 동안 바뀐 edge를 빠뜨리지 않도록 barrier와 동기화가 필요하다. GC가 뒷단에서 일한다는 이유로 대입 비용과 mutation pattern이 무관해지는 것은 아니다.

## Mark, sweep과 compaction

루트에서 도달 가능한 객체를 표시한 뒤 죽은 객체의 공간을 sweep해 다시 쓸 수 있게 한다. 단편화된 일부 페이지를 compact하면 살아 있는 객체를 옮기고 참조를 갱신해야 한다. 모든 major GC가 old 객체 전체를 복사하는 것은 아니다.

객체가 이동할 수 있으므로 embedder는 객체 주소를 임의의 C++ 포인터로 오래 붙들기보다 V8의 handle 계약을 따른다. Local/Persistent handle도 루트가 되어 생존에 영향을 준다. Handle 수명 관리가 누수 진단과 연결되는 이유다.

GC 시간을 줄일 때는 allocation rate와 살아남는 크기를 함께 본다. 힙을 키우면 collection 빈도를 줄일 수 있지만 더 큰 live set을 처리하는 pause와 RSS, 컨테이너 한도를 고려해야 한다. 메모리 압박을 감춘 채 한도만 올리는 것은 원인 해결이 아니다.

## 힙, native 메모리와 RSS

| 범위 | 예 |
|---|---|
| 관리되는 힙 | JS 객체, 문자열, 엔진의 관리 대상 metadata |
| Native/외부 메모리 | compiler zone, 일부 ArrayBuffer backing store, native addon 자원 |
| 프로세스 RSS | 실제 resident page, 실행 코드와 스택 등까지 포함 |
| 가상 주소 예약 | cage와 선형 메모리처럼 주소 공간만 먼저 확보한 구간 |

JS heap limit가 전체 프로세스 메모리 한도인 것은 아니다. `heapUsed`가 안정적이어도 Buffer, native 자원이나 코드 관련 메모리로 RSS가 증가할 수 있다. 예약한 주소 범위를 전부 물리 메모리 사용량으로 계산하지 않는다.

Pointer compression은 64비트 환경에서 일부 tagged reference를 cage 기준의 작은 offset으로 표현해 객체 크기와 메모리 대역폭을 줄이는 설계다. 원래 V8 설계의 4GiB cage는 해당 압축 참조 영역의 제약이며 전체 프로세스와 모든 external allocation의 상한이 아니다. 공유/분리 cage와 지원 여부는 빌드 조건이므로 Node.js의 실제 configuration을 확인한다.

V8 sandbox의 더 큰 가상 주소 영역과 pointer-compression cage도 같은 개념이 아니다. 압축 포인터는 공간 효율의 기법이고 sandbox는 메모리 손상 확산을 제한하는 안전 경계다.

## Native 객체와 Oilpan

Oilpan/cppgc는 C++ 객체에 tracing GC를 제공한다. 관리되는 참조를 `Member` 등으로 표현하고 trace 방법과 root 수명을 명시해야 한다. 임의의 C++ 객체가 라이브러리 도입만으로 모두 자동 회수되는 것은 아니다.

JS와 DOM/native 객체가 서로 가리킬 때 한쪽만 조사하면 순환 관계의 생존을 잘못 판단할 수 있다. 통합된 tracing은 양쪽 그래프를 연결해 도달 가능성을 평가한다. Finalizer의 시점과 순서를 업무 계약으로 쓰지 않고 파일, socket 등은 명시적으로 닫는다.

Oilpan pointer compression은 정렬과 heap 위치 정보를 이용한 별도의 native GC 참조 압축 설계다. 공개 글의 절감 비율은 측정한 대상의 값이다. 참조 크기만 아니라 object layout, cache locality와 decode 비용을 함께 본다.

## 메모리 누수 조사

1. 같은 입력과 정리 과정을 반복하며 baseline과 작업 후 heap/RSS 추이를 비교한다.
2. GC 뒤에도 증가하는 객체의 retaining path를 확인한다. Shallow size는 객체 자체, retained size는 그 객체를 제거하면 함께 도달 불가능해질 수 있는 크기다.
3. Cache 크기, listener와 closure, 전역 상태, Persistent handle, external allocation을 나눠 확인한다.
4. 수정 후 같은 작업에서 증가가 멈추는지 확인한다. 한 번의 snapshot이나 GC 직전 최고점만으로 누수를 확정하지 않는다.

Heap snapshot을 생성하는 작업은 자체 메모리와 정지 시간을 사용한다. OOM 직전 프로세스에 추가 부담을 줄 수 있으므로 안전한 재현 환경과 수집 시점을 정한다. Object statistics는 특정 GC 시점의 집계이며 native zone과 전체 RSS를 모두 설명하지 않는다.

## 출처

- [Trash talk: the Orinoco garbage collector — V8](https://v8.dev/blog/trash-talk)
- [Orinoco: young generation garbage collection — V8](https://v8.dev/blog/orinoco-parallel-scavenger)
- [Concurrent marking — V8](https://v8.dev/blog/concurrent-marking)
- [Getting garbage collection for free — V8](https://v8.dev/blog/free-garbage-collection)
- [Optimizing V8 memory consumption — V8](https://v8.dev/blog/optimizing-v8-memory)
- [Pointer Compression in V8 — V8](https://v8.dev/blog/pointer-compression)
- [Tracing from JS to DOM and back again — V8](https://v8.dev/blog/tracing-js-dom)
- [Oilpan library — V8](https://v8.dev/blog/oilpan-library)
- [High-performance garbage collection for C++ — V8](https://v8.dev/blog/high-performance-cpp-gc)
- [Pointer compression in Oilpan — V8](https://v8.dev/blog/oilpan-pointer-compression)
- [Speeding up V8 heap snapshots — V8](https://v8.dev/blog/speeding-up-v8-heap-snapshots)
- [V8, Investigating memory leaks](https://v8.dev/docs/memory-leaks)

## 관련 문서

- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택과 힙]]
- [[GC-Algorithm|GC 알고리즘]]
- [[V8-Embedding-and-Security|임베딩과 안전 경계]]
- [[V8-Profiling-and-Tooling|진단 도구]]
- [[Debugging-Profiling-Memory|Node.js 메모리 진단]]
- [[Buffer-Memory|Buffer와 external memory]]
