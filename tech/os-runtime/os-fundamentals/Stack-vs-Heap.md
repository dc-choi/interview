---
tags: [os, memory, stack, heap, fragmentation, memory-pool, stack-overflow, buffer-overflow]
status: done
verified_at: 2026-10-05
category: "OS - 기초"
aliases: ["Stack vs Heap", "스택 vs 힙", "메모리 풀", "메모리 파편화", "스택 오버플로와 버퍼 오버플로"]
---

# 스택 vs 힙 — 크기가 아니라 수명의 문제

스택이 아무리 커져도 힙을 대체할 수 없다. 두 영역의 차이는 용량이 아니라 **수명, 접근 범위, 관리 방식**이기 때문이다. "스택이 커지면 힙이 필요 없나요?"라는 면접 질문은 메모리 구조, 가상 메모리, 함수 호출 구조, 동적 할당, 파편화까지의 이해도를 확인하는 질문이다.

## 비교

| 축 | 스택 | 힙 |
|---|---|---|
| 저장 대상 | 지역 변수, 매개변수, 반환 주소, 스택 프레임 | 동적으로 생성된 객체, 함수 범위를 넘는 데이터 |
| 관리 | 함수 호출/반환에 따라 **자동** | 명시적 해제(`free`, `delete`) 또는 **GC** |
| 수명 | 함수(스코프) 종료와 함께 소멸 | 실행 중 유연하게 결정 |
| 구조 | LIFO (호출 순서로 쌓이고 반환 순서로 사라짐) | 임의 할당, 임의 해제 |
| 스레드 | **스레드마다 개별** 스택 | 프로세스 내 스레드가 **공유** |
| 할당 속도 | 포인터 이동 수준으로 빠름 | 빈 공간 탐색, 메타데이터 갱신 비용 |

## 스택 — 함수 실행에 묶인 자동 관리 공간

함수 안에서 선언한 지역 변수는 함수 실행 중에만 필요하고, 함수가 끝나면 스택 프레임과 함께 사라진다. 언제 없어져도 되는지가 코드 구조상 명확한 데이터에 적합하다. 이 자동성이 장점이자 한계 — 함수가 끝난 뒤에도 계속 써야 하는 데이터를 둘 수 없다.

## 힙 — 함수 범위를 넘어 사는 데이터

로그인 시 생성된 사용자 객체가 여러 함수와 스레드에서 계속 필요하다면 힙이 자연스럽다. 명시적으로 해제하거나 GC가 회수할 때까지 남는다. **힙의 핵심 가치는 큰 데이터를 담는 것이 아니라 수명을 유연하게 관리하는 것.**

## 스택이 무한히 커져도 힙이 필요한 이유

- **수명 구조의 불일치**: 스택은 LIFO지만 실제 프로그램의 데이터 수명은 LIFO가 아니다. 함수 A에서 만든 객체가 함수 B, C와 여러 스레드에서 계속 필요할 수 있고, 이런 데이터는 호출 스택의 생명주기에 묶을 수 없다
- **멀티스레드 공유**: 스레드는 각자 스택을 갖고 힙을 공유한다 ([[Process-Lifecycle|프로세스와 스레드]]). 한 스레드의 스택에 있는 데이터를 다른 스레드가 공유하는 것은 구조적으로 위험하다 — 여러 실행 흐름이 함께 쓰는 객체는 힙에 두고 동기화로 보호하는 것이 정석

## C 코드로 보는 스택과 힙

C 표준은 스택과 힙이라는 영역 대신 저장 기간을 정한다. 지역 변수와 매개변수는 자동 저장 기간, `malloc`으로 만든 객체는 할당 저장 기간이고, 이를 스택과 힙에 배치하는 것은 구현이다([[C-Pointers-and-Dynamic-Memory#저장 기간과 메모리 영역|C 저장 기간]]).

- 함수를 호출할 때마다 새 스택 프레임에 매개변수와 지역 변수가 생긴다. `swap(int a, int b)`의 a, b는 호출자 x, y의 복사본이라 다른 위치에 있고, a와 b를 바꿔도 x와 y는 그대로다. 원본을 바꾸려면 x, y의 주소를 넘긴다.
- 지역 배열의 주소를 반환하면 프레임이 사라진 뒤의 위치를 가리킨다. 호출이 끝난 뒤에도 쓸 데이터는 `malloc`으로 할당해 포인터를 반환하고 해제 책임을 함께 넘긴다.
- GC가 없는 C에서 `free`하지 않은 블록은 프로세스가 끝날 때까지 할당된 채로 남는다(메모리 누수).
- 힙과 스택이 주소 공간 양 끝에서 서로를 향해 자란다는 그림은 단순화다. 성장 방향은 흔한 ABI의 예일 뿐이고, 실제 주소 공간에는 `mmap` 영역과 스레드마다 따로 잡힌 스택이 섞여 있다([[Concurrency-and-Process-Overview#프로세스메모리구조(상세)|프로세스 메모리 구조]]). 두 영역이 맞부딪쳐 서로를 덮어쓰는 식으로 실패하기보다, Linux에서 메인 스레드 스택은 `RLIMIT_STACK` 한도에서, 다른 스레드 스택은 끝의 guard 영역에 닿을 때 SIGSEGV를 받고, 힙 할당 실패는 `malloc`의 NULL 반환이나 OOM killer로 드러난다.

## 스택 오버플로와 버퍼 오버플로

이름은 비슷하지만 원인과 대응이 다른 세 문제다.

| 문제 | 뜻 | 흔한 원인 | 결과 |
|---|---|---|---|
| 스택 오버플로(스택 소진) | 스택 사용량이 한도를 넘음 | 종료 조건이 틀리거나 너무 깊은 재귀, 큰 지역 배열이나 VLA | Linux는 메인 스레드 스택이 `RLIMIT_STACK`에 도달하거나 스레드 스택이 guard 영역에 닿으면 SIGSEGV를 보낸다 |
| 스택 버퍼 오버플로(CWE-121) | 스택에 있는 지역 버퍼의 범위 밖 쓰기 | 폭 없는 `scanf("%s", buf)`, 길이 검사 없는 `strcpy` | 저장된 반환 주소, 프레임 포인터 같은 이웃 값 손상 |
| 힙 버퍼 오버플로(CWE-122) | `malloc`으로 받은 블록의 범위 밖 쓰기 | `malloc(strlen(s))`에 NUL까지 복사, 10칸 블록의 `x[10]` | 이웃 데이터와 함수 포인터 손상 |

- 두 버퍼 오버플로는 메모리 안전성 결함이라 공격자가 실행 흐름을 바꾸는 보안 취약점이 될 수 있다. AddressSanitizer와 Valgrind로 찾는다([[C-Pointers-and-Dynamic-Memory#메모리 오류와 도구|C 메모리 오류와 도구]]).
- 스택 소진은 재귀를 반복으로 바꾸거나 큰 데이터를 힙으로 옮겨 줄인다([[Algorithm-Recursion#Call stack과 비용|재귀의 call stack 비용]]).

## 힙 할당 비용과 메모리 풀

`malloc`, `new`는 빈 공간을 찾고, 관리 정보를 갱신하고, 해제까지 처리해야 해서 스택 할당보다 느리다. 고성능 서버, 게임 서버에서 매 요청마다 동적 할당을 반복하면 병목이 된다.

**메모리 풀**: 큰 메모리 덩어리를 미리 확보해 두고 필요한 만큼 나눠 쓰는 방식. 최대 접속자 100명이 예측되면 사용자 정보 100칸을 미리 잡고, 접속 시 빈 칸을 쓰고 로그아웃 시 반납한다. 할당 호출이 없어 빠르고 파편화도 줄어든다. **크기와 개수가 예측 가능할 때** 특히 효과적.

## 메모리 파편화 (단편화)

OS 분할 방식 관점(가변/고정 분할, 버디 시스템)은 [[Virtual-Memory-Allocation|메모리 할당 방식]] 참조. 힙 관점 요약:

- **내부 파편화** — 할당 단위 때문에 받은 공간 안에서 남는 낭비. 1바이트만 필요해도 할당기의 정렬 단위 이상으로 할당되고(GNU C Library의 `malloc`은 주소를 8의 배수, 64비트 시스템에서는 16의 배수로 맞춘다), 디스크에서도 1바이트 파일이 블록 단위(흔히 4KiB)를 차지한다
- **외부 파편화** — 전체 빈 공간은 충분한데 **연속된 큰 공간이 없어** 할당 실패. 작은 객체의 생성, 삭제가 반복되며 빈 구멍이 흩어진다. 힙을 오래 쓸수록 커지는 문제

## GC 컴팩션 — 흩어진 메모리 정리

Java, V8 같은 런타임의 GC는 참조되지 않는 객체를 회수하고, 일부 전략은 살아 있는 객체를 한쪽으로 모아 연속 빈 공간을 만드는 **컴팩션**으로 외부 파편화를 줄인다. 다만 객체 이동에는 참조 주소 갱신, 스레드 동기화, 일시 정지(STW) 비용이 따른다 — 메모리 효율과 실행 성능의 트레이드오프 (알고리즘별 상세는 [[GC-Algorithm|GC 알고리즘]], [[JVM-GC]]).

## 면접 체크포인트

- 결론 먼저: **스택이 매우 커져도 힙은 필요하다 — 두 영역은 목적과 수명 관리 방식이 다르다**
- 스택과 힙을 빠른 곳/느린 곳으로 외우지 말고 **데이터가 언제 생성되고 언제 사라져야 하는가**를 기준으로 설명
- LIFO 구조와 실제 데이터 수명의 불일치
- 스레드별 스택 vs 공유 힙 — 멀티스레드에서 힙이 필요한 구조적 이유
- 내부 vs 외부 파편화 구분과 각각의 원인
- 메모리 풀이 유효한 조건 (크기, 개수 예측 가능)
- GC 컴팩션의 효과와 비용 (외부 파편화 해소 vs STW, 참조 갱신)
- C의 값 전달 `swap`이 실패하는 이유를 스택 프레임과 복사본으로 설명
- 스택 오버플로(스택 소진)와 스택, 힙 버퍼 오버플로의 원인과 결과 구분

### 사용자 공간 할당기와 커널 할당

`malloc()`은 시스템 콜이 아니라 C 라이브러리의 할당기다. 확보한 영역을 작은 요청들에 나누고 필요하면 `brk`/`mmap` 경로로 커널에 영역을 요청한다. 요청마다 시스템 콜을 하는 것은 아니다. Linux의 익명 매핑은 첫 접근 시 demand-zero 처리를 할 수 있어 예약한 가상 크기와 실제 RSS가 다르다.

`free()`는 우선 할당기에 공간을 돌려준다. 할당기가 재사용을 위해 보관하는 공간은 OS로 즉시 반환되지 않을 수 있으므로 해제 직후 RSS가 줄지 않는다는 사실만으로 누수를 확정하지 않는다.

## 출처

- [Linux, malloc(3)](https://man7.org/linux/man-pages/man3/malloc.3.html)
- [Linux, mallopt(3)](https://man7.org/linux/man-pages/man3/mallopt.3.html)
- [Linux, getrlimit(2)](https://man7.org/linux/man-pages/man2/getrlimit.2.html)
- [Linux, pthread_attr_setguardsize(3)](https://man7.org/linux/man-pages/man3/pthread_attr_setguardsize.3.html)
- [GNU C Library, Aligned Memory Blocks](https://sourceware.org/glibc/manual/latest/html_node/Aligned-Memory-Blocks.html)
- [cppreference, Storage-class specifiers](https://en.cppreference.com/w/c/language/storage_class_specifiers)
- [MITRE CWE, CWE-121: Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)
- [MITRE CWE, CWE-122: Heap-based Buffer Overflow](https://cwe.mitre.org/data/definitions/122.html)

- [스택이 커져도 힙이 필요한 이유와 메모리 파편화 — YouTube 강의](https://www.youtube.com/watch?v=9TSojdIr8Q0&list=PLXvgR_grOs1DEoZFABFCjo7dsXt1BhVih&index=38)
- [인프런, 널널한 개발자, 가상 메모리 개요](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476544)
- [인프런, 널널한 개발자, \[보강\] 가상 메모리 시스템에 대한 보충 설명 (Live 방송 중 편집)](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=479157)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 메모리 할당과 해제](https://www.boostcourse.org/cs112/lecture/119032)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 메모리 교환, 스택, 힙](https://www.boostcourse.org/cs112/lecture/119033)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 파일 쓰기](https://www.boostcourse.org/cs112/lecture/119034)

## 관련 문서

- [[Virtual-Memory-Allocation|메모리 할당 방식 (가변/고정 분할, 버디 시스템, 단편화)]]
- [[Process-Lifecycle|Process lifecycle (프로세스 구조, 스레드)]]
- [[Virtual-Memory|가상 메모리]]
- [[GC-Algorithm|GC 알고리즘 (Mark-Sweep, Compaction)]]
- [[JVM-GC|JVM GC]]
- [[C-Pointers-and-Dynamic-Memory|C 포인터와 동적 메모리 (저장 기간, malloc과 free)]]
- [[Concurrency-and-Process-Overview|OS 개요 (프로세스 메모리 구조)]]
- [[Algorithm-Recursion|재귀 (call stack)]]
