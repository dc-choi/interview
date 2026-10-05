---
tags: [os, context-switching, cpu-scheduling]
status: done
verified_at: 2026-10-05
category: "OS&런타임(OS&Runtime)"
aliases: ["Context Switching", "컨텍스트 스위칭"]
---

# Context Switching과 CPU 스케줄링

## 컨텍스트 스위칭

CPU에서 실행 중인 task 또는 thread의 레지스터와 스케줄링 상태를 저장하고 다른 task의 상태를 복원하는 작업이다. 서로 다른 프로세스 사이에서는 주소 공간 전환도 추가될 수 있다.

전환을 일으키는 계기와 전환을 수행하는 주체는 구분한다. 계기는 타이머 인터럽트, 블로킹 시스템 콜, 더 높은 우선순위 task의 준비처럼 다양하지만, OS 스레드 사이의 전환은 언제나 커널 모드에서 커널 코드가 수행한다. 애플리케이션 입장에서 이 시간은 자신의 코드가 실행되지 않는 간접 비용이므로 전환이 잦을수록 CPU가 낭비된다. 사용자 공간 런타임이 자기 스레드끼리 바꾸는 전환은 [[Thread-Models|스레드 종류와 스레딩 모델]]에서 다룬다.

### 동작 과정
1. 실행 중인 프로세스의 작업 내용을 PCB에 저장
2. 실행될 프로세스의 PCB 내용대로 CPU를 다시 세팅

### PCB에서 변경되는 값
- 프로세스 상태
- 프로그램 카운터
- 레지스터 정보
- 메모리 정보

### 발생 조건
- time slice 만료 뒤 스케줄러가 다른 runnable task를 선택한 경우
- I/O 요청 등으로 현재 task가 block하거나 명시적으로 yield한 경우
- interrupt나 wakeup 뒤 더 높은 우선순위 또는 정책상 다른 runnable task가 선택되어 preempt된 경우

I/O 요청과 interrupt는 스케줄러 진입점이 될 수 있지만 실제 context switch를 항상 일으키지는 않는다. 비동기 I/O가 현재 task를 block하지 않거나 interrupt 처리 뒤 같은 task가 계속 선택되면 task switch 없이 복귀한다. 시스템 콜과 인터럽트가 상태 전이와 전환으로 이어지는 구체적인 흐름은 [[Process-Lifecycle#프로세스 상태|프로세스 상태]]에서 다룬다.

### 프로세스 vs 스레드 — 왜 스레드 스위칭이 더 빠른가

동일 프로세스의 스레드 전환은 주소 공간을 유지할 수 있어 보통 프로세스 간 전환보다 가볍지만, 레지스터 저장, 스케줄러 실행, 캐시와 분기 예측기 영향 같은 비용은 여전히 있다.

| 구분 | 프로세스 스위칭 | 스레드 스위칭 (동일 프로세스) |
|---|---|---|
| 제어 블록 | 프로세스/task 상태와 주소 공간 전환 | thread/task의 레지스터, 스택 포인터, 스케줄링 상태 전환 |
| 가상 주소 공간 | 변경 (페이지 테이블 Base 교체) | 공유 (변경 없음) |
| MMU/page table 기준 | 다른 주소 공간이면 전환 | 같은 주소 공간이면 유지 가능 |
| TLB | 주소 공간 태그가 없으면 무효화 비용. ASID/PCID 지원 시 일부 엔트리 유지 가능 | 보통 같은 주소 공간 엔트리 재사용 가능 |
| CPU 캐시 | 작업 집합 차이로 miss가 늘 수 있음 | 작업 집합에 따라 캐시 영향 발생 가능 |

- **MMU(Memory Management Unit)**: 가상 주소 → 물리 주소 매핑 회로
- **TLB(Translation Lookaside Buffer)**: 가상/물리 주소 매핑을 캐싱하는 하드웨어. flush되면 초기 몇 회 접근이 메모리까지 내려가 느려진다.
- 다른 주소 공간으로 전환할 때 페이지 테이블 기준이 바뀐다. 다만 현대 CPU의 ASID/PCID 같은 주소 공간 태그를 사용하면 TLB 전체 flush를 피하고 해당 주소 공간의 엔트리를 구분해 재사용할 수 있다.
- 동일 프로세스 내 스레드는 주소 공간이 같아 TLB, 페이지 테이블 Base를 유지할 수 있다.

## CPU 스케줄링

운영체제 스케줄러는 실행 가능한 thread 또는 task에 CPU 시간을 배분한다. 프로세스는 자원 격리 단위이고, 실제 스케줄링 단위는 운영체제 모델에 따라 thread/task다. 유니프로그래밍, 멀티프로그래밍, 멀티태스킹, 멀티스레딩, 멀티프로세싱의 차이는 [[Thread-Models#스레드가 필요해진 배경|스레드가 필요해진 배경]]에서 다룬다.

### 핵심 고려사항
1. **어떤 실행 가능 task에게** CPU를 줄 것인가?
2. **얼마의 시간 동안** CPU를 사용하게 할 것인가?

### CPU 버스트와 I/O 버스트

프로세스 실행은 CPU에서 명령을 연속으로 실행하는 **CPU 버스트**와 I/O를 요청하고 결과를 기다리는 **I/O 버스트**가 번갈아 이어지는 주기이며, 마지막 CPU 버스트에서 종료한다. CPU 버스트 길이를 재면 짧은 버스트가 대부분이고 긴 버스트는 드물다.

- **CPU-bound** 프로세스는 긴 CPU 버스트가 적게 나오고(영상 인코딩, 대량 수치 계산), **I/O-bound** 프로세스는 짧은 CPU 버스트가 자주 나온다(DB와 외부 API 응답을 기다리는 일반적인 API 서버).
- 짧은 작업을 먼저 고르는 스케줄러가 CPU 버스트 하나를 작업 하나처럼 다루면 I/O-bound 작업이 자주 실행돼 다음 I/O를 빨리 시작하고, 그 I/O를 기다리는 동안 CPU-bound 작업이 CPU를 쓴다. CPU와 I/O 장치가 함께 바빠지는 겹침이 생긴다.
- 병목 진단과 스레드 수의 출발 공식은 [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]와 [[Thread-Pool-Sizing|스레드 풀 사이징]]에서 다룬다.

### 스케줄러와 디스패처

교재는 두 역할을 나눈다. **CPU 스케줄러**는 준비 큐에서 다음에 실행할 task를 고르고, **디스패처**는 고른 task에 실제로 CPU 코어를 넘긴다. 디스패처의 일은 컨텍스트 스위칭, 사용자 모드로의 전환, 그 task가 재개할 위치로의 점프이며, 한 task를 멈추고 다른 task를 실행하기까지 걸리는 시간을 **dispatch latency**라 한다. 디스패처는 전환마다 실행되므로 빨라야 한다. 많은 문서는 두 역할을 묶어 스케줄러라고 부른다.

### 선점형과 비선점형

스케줄링 결정은 task가 다음 상황에 놓일 때 일어날 수 있다.

| 상황 | 예 | 비선점형 | 선점형 |
|---|---|---|---|
| 실행 → 대기 | I/O 요청, lock 대기 | 다음 task 선택 | 다음 task 선택 |
| 종료 | `exit` | 다음 task 선택 | 다음 task 선택 |
| 실행 → 준비 | 타이머 인터럽트로 time slice 만료 | 개입하지 않음 | 다른 task로 교체 가능 |
| 대기 → 준비 | I/O 완료로 더 높은 우선순위 task가 깨어남 | 개입하지 않음 | 실행 중인 task를 밀어낼 수 있음 |

- **비선점형(협력형)**: task가 끝나거나, 대기에 들어가거나, 스스로 양보(`yield`)할 때만 CPU를 넘긴다. OS는 시스템 콜이나 잘못된 연산으로 생긴 trap이 와야 제어권을 되찾으므로, 시스템 콜 없이 무한 루프를 도는 프로그램 하나가 시스템 전체를 붙잡을 수 있다. 초기 Mac OS와 Xerox Alto가 이 방식을 썼다.
- **선점형**: 타이머 인터럽트로 OS가 주기적으로 제어권을 되찾아, task가 협조하지 않아도 강제로 교체한다. 응답성이 좋아지는 대신 공유 데이터를 갱신하던 도중에 교체될 수 있어 경쟁 조건이 생기므로 임계 구역과 lock 같은 동기화가 필요하다 ([[Concurrency-and-Process|동시성과 프로세스]]). Windows, macOS, Linux를 포함한 현대 범용 OS는 사실상 모두 선점형이다.
- **런타임의 협력형 실행**: 이벤트 루프 콜백과 코루틴은 실행 주체가 스스로 양보해야 다른 작업이 진행되는 협력형이다. 양보 없이 긴 CPU 작업을 하면 같은 스레드의 다른 작업이 모두 멈춘다 ([[Thread-vs-Event-Loop|Thread vs Event Loop]]). OS 스레드 수준의 선점과 런타임 수준의 협력형 실행은 층이 다르다.

다음에 실행할 task를 고르는 기준인 FIFO, SJF, SRTF, 우선순위, RR, 다단계 큐, MLFQ와 평균 대기 시간 계산은 [[Context-Switching-Scheduling-Algorithms|CPU 스케줄링 알고리즘]]에서 다룬다.

### 스케줄링 목표

| 목표 | 설명 |
|------|------|
| 리소스 사용률 | CPU, IO 디바이스의 사용률을 높임 |
| 오버헤드 최소화 | 스케줄링 계산이 너무 복잡하거나 컨텍스트 스위칭이 너무 잦으면 안 됨 |
| 공평성 | 모든 프로세스에게 CPU가 공평하게 할당 (시스템에 따라 의미가 다름) |
| 처리량 | 같은 시간 내에 더 많은 처리 |
| 대기시간 | 작업 요청 후 실제 작업까지의 대기가 짧을수록 좋음 |
| 응답시간 | 대화형 시스템에서 사용자 요청에 빠른 반응 |

처리량과 응답시간은 서로 상반되는 관계. 일반 사용자 시스템은 밸런스가 중요.

## 다중큐

- 준비 상태와 대기 상태는 큐 자료구조로 관리
- **준비 큐**: 프로세스의 우선순위에 따라 여러 큐에 배치. CPU 스케줄러가 적당한 프로세스를 선택하여 실행
- **대기 큐**: IO 작업 종류에 따라 분류 (HDD 큐, 네트워크 큐 등). IO 완료 인터럽트 발생 시 큐에서 꺼냄
- 실제 큐에는 커널이 스케줄링 대상을 표현하는 task, thread 또는 scheduling entity가 연결된다. PCB라는 교재 모델과 구체 자료구조를 동일시하지 않는다.

## 면접 체크포인트

- 컨텍스트 스위칭을 일으키는 계기와 수행 주체(커널)를 구분해 설명할 수 있는가
- 같은 프로세스의 스레드 전환이 프로세스 전환보다 가벼운 이유와, ASID/PCID가 있을 때 TLB 비용이 어떻게 달라지는가
- 비선점형과 선점형이 갈리는 스케줄링 결정 시점, 협력형 OS의 무한 루프 문제와 타이머 인터럽트의 역할
- 선점이 경쟁 조건을 만드는 이유와 이벤트 루프 같은 런타임 수준 협력형 실행과의 차이
- 스케줄러와 디스패처의 역할 차이, dispatch latency
- CPU 버스트 분포가 I/O-bound 작업을 자주 실행시키는 스케줄링으로 이어지는 이유

## 관련 문서
- [[Context-Switching-Scheduling-Algorithms|CPU 스케줄링 알고리즘]]
- [[Process-Lifecycle|프로세스 생명주기]]
- [[Thread-Models|스레드 종류와 스레딩 모델]]
- [[Concurrency-and-Process|동시성과 프로세스]]
- [[Virtual-Memory|가상 메모리]]
- [[Sleep-and-Timing|Sleep과 타이밍 (대기 후 준비 큐 복귀와 스케줄링 지연)]]

## 출처

- [OSTEP, Scheduling: Introduction](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf)
- [OSTEP, Mechanism: Limited Direct Execution](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf)
- [Operating System Concepts 10th, 5장 CPU Scheduling 강의 슬라이드](https://www.os-book.com/OS10/slide-dir/index.html)

- 인프런, 감자 강사, [컨텍스트 스위칭](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100763), [CPU스케줄링 개요](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100767), [다중큐](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100768), [스케줄링 목표](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100769)
- YouTube, 쉬운코드, [컨텍스트 스위칭](https://www.youtube.com/watch?v=Xh9Nt7y07FE), [CPU bound, IO bound와 스레드 개수](https://www.youtube.com/watch?v=qnVKEwjG_gM), [CPU 스케줄러, 선점과 비선점, 디스패처](https://www.youtube.com/watch?v=LgEY4ghpTJI)
- [Linux kernel scheduler documentation](https://docs.kernel.org/scheduler/)
- [Linux sched(7)](https://man7.org/linux/man-pages/man7/sched.7.html)
- [Linux scheduler monitor semantics](https://docs.kernel.org/trace/rv/monitor_sched.html)
- [Linux kernel TLB documentation](https://docs.kernel.org/arch/x86/tlb.html)
