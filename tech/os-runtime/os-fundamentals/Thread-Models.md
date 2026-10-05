---
tags: [os, thread, threading-model, smt, virtual-thread, interview]
status: done
verified_at: 2026-10-05
category: "OS&런타임(OS&Runtime)"
aliases: ["Thread Models", "Threading Models", "스레드 종류", "스레딩 모델", "하드웨어 스레드", "그린 스레드", "User Thread vs Kernel Thread"]
---

# 스레드 종류와 스레딩 모델

스레드라는 같은 단어가 계층마다 다른 대상을 가리킨다. CPU 코어가 함께 품는 **하드웨어 스레드**, 커널이 만들고 스케줄링하는 **OS 스레드**, 언어와 런타임이 제공하는 **사용자 수준 스레드**다. 수식어 없이 스레드라고 하면 보통 OS 스레드 또는 OS 스레드와 1:1로 대응하는 언어의 스레드를 뜻한다. 스레드 수나 전환 비용을 이야기할 때는 어느 계층의 스레드인지 먼저 맞춘다.

## 스레드가 필요해진 배경

| 실행 방식 | 동작 | 목표 | 남은 한계 |
|---|---|---|---|
| 유니프로그래밍 | 메모리에 프로그램 하나만 올려 끝날 때까지 실행 | — | 실행 중인 프로그램이 I/O를 기다리는 동안 CPU가 논다 |
| 멀티프로그래밍 | 메모리에 여러 프로그램을 올려 두고, 실행 중인 프로그램이 I/O를 기다리면 다른 프로그램을 실행 | CPU 사용률 | 한 프로세스가 CPU를 오래 쓰면 다른 프로세스는 계속 기다린다 |
| 멀티태스킹(시분할) | CPU 시간을 짧은 time slice로 나눠 여러 프로세스가 번갈아 실행 | 응답 시간, 여러 프로그램이 동시에 도는 듯한 사용자 경험 | 한 프로세스 안의 여러 작업은 동시에 진행할 수 없고, 여러 프로세스로 나누면 전환과 데이터 공유 비용이 크다 |
| 멀티스레딩 | 한 프로세스 안에 실행 흐름(스레드)을 여럿 둔다 | 한 프로세스의 여러 작업을 함께 진행하고 멀티코어를 활용 | 공유 메모리 동기화가 필요하다 |
| 멀티프로세싱 | 둘 이상의 프로세서나 코어(멀티프로세서 하드웨어)가 동시에 실행 | 실제 병렬 실행 | 병렬화할 수 없는 구간이 속도 향상의 상한을 정한다 |

스레드가 실행 단위가 되면서 프로세스는 주소 공간과 자원을 소유하는 단위, 스레드는 CPU에서 스케줄링되는 단위로 역할이 나뉜다. 같은 프로세스의 스레드는 코드, 데이터, 힙을 공유하고 스택, 스택 포인터, 프로그램 카운터 같은 실행 문맥은 각자 가진다 ([[Process-Lifecycle#쓰레드|프로세스와 쓰레드]], [[Stack-vs-Heap|스택과 힙]]). 멀티태스킹의 대상도 프로세스에서 스레드로 넓어져, 여러 프로세스의 여러 스레드가 잘게 나뉜 CPU 시간을 나눠 쓴다.

### 세 축을 따로 판별하기

시분할, 프로세스당 스레드 수, 코어 수는 서로 독립된 축이다. 아래 표는 해당 프로세스만 실행된다고 가정한 판별 연습이며, 실제 시스템에서는 다른 프로세스와 커널 스레드도 함께 실행된다.

| 구성 | 한 코어를 시분할로 나눠 씀 | 한 프로세스에 스레드 여럿 | 둘 이상의 코어가 동시에 실행 |
|---|---|---|---|
| 싱글 코어, 단일 스레드 프로세스 2개 | O | X | X |
| 싱글 코어, 스레드 2개인 프로세스 1개 | O | O | X |
| 듀얼 코어, 단일 스레드 프로세스 2개 | X (코어마다 하나씩) | X | O |
| 듀얼 코어, 스레드 2개인 프로세스 1개 | X | O | O |
| 듀얼 코어, 스레드 2개인 프로세스 2개 | O | O | O |

멀티스레딩이 병렬 실행을 보장하지는 않는다(두 번째 행). 병렬 실행은 실행 가능한 스레드와 놀고 있는 코어가 함께 있어야 생긴다 ([[Concurrency-vs-Parallelism|동시성과 병렬성]]).

## 하드웨어 스레드

코어는 메모리에서 데이터를 기다리는 동안(memory stall) 연산 자원을 놀린다. 코어 하나에 실행 문맥을 둘 이상 두고, 한 명령 흐름이 메모리를 기다리는 동안에도 다른 흐름의 명령으로 코어를 계속 쓰게 하는 것이 하드웨어 스레드다. 교재는 이를 칩 멀티스레딩(CMT)이라 부르고, Intel은 Hyper-Threading이라는 이름으로 물리 코어마다 실행 문맥 두 개를 노출해 코어 하나를 논리 코어 두 개처럼 쓰게 한다.

- OS는 하드웨어 스레드 하나하나를 논리 CPU로 보고 스케줄링한다. 쿼드 코어에 코어당 하드웨어 스레드가 2개면 OS에는 논리 프로세서 8개로 보인다.
- 스케줄링이 두 단계가 된다. OS는 소프트웨어 스레드를 어느 논리 CPU에 올릴지 정하고, 코어는 자신의 하드웨어 스레드 중 무엇을 실행할지 정한다. 실행 가능한 스레드를 논리 CPU에 나누는 일은 고정 배분이 아니라 OS의 부하 분산(push, pull migration)과 processor affinity가 맡는다.
- 같은 코어의 논리 CPU 둘은 물리 코어 하나를 나눠 쓰므로 보통 물리 코어 두 개만큼의 처리량을 내지 못한다. Linux는 같은 코어를 공유하는 CPU 목록을 `/sys/devices/system/cpu/cpuN/topology/core_cpus_list`로 보여 준다.
- CPU-bound 작업의 스레드 수를 정할 때 출발점으로 쓰는 프로세서 수가 물리 코어인지 논리 CPU인지, affinity와 컨테이너 CPU 제한이 반영된 값인지 확인한다 ([[Thread-Pool-Sizing|스레드 풀 사이징]]).

## OS 스레드

커널이 만들고 관리하며 CPU 스케줄링의 대상이 되는 스레드다. 네이티브 스레드, 커널 스레드, 커널 수준 스레드, OS 수준 스레드라고도 부른다. CPU에서 실제로 실행되는 것은 OS 스레드이므로 언어 수준의 어떤 스레드든 실행되려면 결국 OS 스레드 위에 올라가야 한다.

- 한 OS 스레드에서 사용자 코드와 커널 코드가 번갈아 실행된다. 시스템 콜을 호출하면 같은 스레드가 trap으로 커널 모드에 들어가 커널 스택에서 커널 코드를 실행하고, 끝나면 사용자 모드로 돌아온다 ([[Concurrency-and-Process-Overview|OS 개요와 커널, 유저 모드]]).
- OS 스레드 사이의 전환은 커널이 수행하므로 모드 전환과 커널 코드 실행 비용이 든다 ([[Context-Switching|컨텍스트 스위칭]]).
- Linux는 스레드를 별도 자료형으로 두지 않는다. `clone()`에 `CLONE_THREAD`를 주어 같은 스레드 그룹에 속한 task를 만들고, `getpid()`는 그룹 공통의 TGID를, `gettid()`는 스레드마다 다른 TID를 돌려준다.
- 용어 주의: 커널 스레드는 커널 내부 작업만 수행하는 스레드를 가리키기도 한다. Linux의 `kthread_create()` 계열이 만드는 kthread가 그 예이며, `ps`의 상태 코드 `I`는 유휴 커널 스레드를 뜻한다.

## 사용자 수준 스레드

언어나 라이브러리가 제공하는 스레드 추상화다. 문서마다 두 가지 뜻으로 쓰므로 맥락을 확인한다.

1. 프로그래밍 수준의 스레드 API 전반. 교재는 POSIX Pthreads, Windows threads, Java threads를 사용자 스레드 라이브러리 예로 든다. 이 뜻에서는 OS 스레드와 1:1로 연결된 Java platform thread도 사용자 스레드다.
2. 커널이 모르는 채 사용자 공간 런타임이 직접 스케줄링하는 스레드. 아래 N:1, M:N 모델의 사용자 스레드만 가리킨다.

그린 스레드도 같은 혼동이 있다. 초기 Java가 모든 Java 스레드를 OS 스레드 하나에 올리던(M:1) 구현에서 쓰인 이름이고, 교재도 Solaris Green Threads를 M:1의 예로 든다. 문서에 따라 런타임이 스케줄링하는 사용자 수준 스레드 전반을 그린 스레드라고 부르기도 한다.

## 매핑 모델: 1:1, N:1, M:N

사용자 수준 스레드는 OS 스레드에 연결돼야 실행되므로, 둘을 어떻게 대응시키는지가 런타임 설계의 핵심 선택이다.

| 모델 | 구조 | 전환 | 한 스레드의 블로킹 시스템 콜 | 멀티코어 | 예 |
|---|---|---|---|---|---|
| 1:1 | 사용자 스레드마다 OS 스레드 하나 | 커널이 전환 | 그 스레드만 대기 | 활용 | Linux NPTL, Windows 스레드, Java platform thread |
| N:1 | 여러 사용자 스레드가 OS 스레드 하나를 공유 | 사용자 공간에서 전환, 커널 진입 없음 | OS 스레드가 막혀 전부 대기 | 활용 못 함 | 초기 Java 그린 스레드, GNU Portable Threads |
| M:N | M개 사용자 스레드를 N개 OS 스레드에 배치 | 런타임 스케줄러가 전환 | 런타임이 그 스레드만 내려놓거나 다른 OS 스레드로 진행을 이어 가야 함 | 활용 | Go goroutine, Java virtual thread |

- **1:1**: 관리와 스케줄링을 OS에 맡기므로 구현이 단순하고 멀티코어를 그대로 쓴다. 대신 스레드 생성과 전환마다 커널이 개입하고 스레드마다 스택과 커널 자원이 필요해, 오버헤드 때문에 프로세스당 스레드 수가 제한되기도 한다. 요청마다 스레드를 새로 만들면 생성 지연이 요청마다 붙고, 유입이 처리 속도를 넘으면 스레드 수, 전환 비용과 메모리가 함께 불어나 서버 전체가 응답하지 못할 수 있다. 그래서 상한 있는 스레드 풀로 재사용한다 ([[Java-Executors-Futures-and-Thread-Pools|Executor와 스레드 풀]]).
- **N:1**: 전환이 사용자 공간에서 끝나 빠르지만, 한 스레드가 블로킹 시스템 콜을 부르면 OS 스레드가 멈춰 전체가 멈춘다. 이 모델의 런타임은 I/O를 논블로킹으로 바꿔 대기를 피해야 한다 ([[Sync-Async-Blocking|동기, 비동기, 블로킹, 논블로킹]]). OS 스레드가 하나라 병렬 실행이 없다.
- **M:N**: 두 모델의 장점을 노리지만 런타임 구현이 복잡하다. OS의 스레드 라이브러리로는 드물고, 지금은 주로 언어 런타임이 구현한다. Go 런타임은 `GOMAXPROCS`로 Go 코드를 동시에 실행하는 OS 스레드 수를 제한하되, 시스템 콜에서 막힌 스레드는 이 한도에 세지 않아 다른 goroutine이 계속 실행된다.
- **경쟁 조건은 어느 매핑 모델에서도 생길 수 있다.** 1:1과 M:N은 여러 코어에서 실제로 동시에 실행되고, N:1도 런타임이 전환 지점에서 다른 스레드로 넘어가면 공유 상태의 확인 후 갱신(check-then-act)이 깨질 수 있다. 단일 스레드 이벤트 루프에서 `await` 사이에 다른 요청이 끼어드는 것과 같은 구조다 ([[Thread-vs-Event-Loop#동시성 정확성의 세 축|동시성 정확성의 세 축]]).

## Java의 platform thread와 virtual thread

- Platform thread는 보통 OS가 스케줄링하는 커널 스레드에 1:1로 대응하며 큰 스택과 OS가 관리하는 자원을 가진다.
- Virtual thread(Java 21, JEP 444)는 JDK가 스케줄링하는 사용자 모드 스레드다. JDK 스케줄러가 virtual thread를 소수의 platform thread(carrier)에 올리고(mount), carrier는 다시 OS가 스케줄링하는 M:N 구조다. 스케줄러의 기본 병렬도는 가용 프로세서 수다.
- JEP 444는 초기 Java의 그린 스레드가 OS 스레드 하나를 공유하는 M:1이었고, 이후 OS 스레드를 감싼 platform thread(1:1)에 성능에서 밀렸다고 정리한다.
- Lock과 I/O 대기는 virtual thread가 carrier에서 내려와(unmount) carrier를 다른 virtual thread에 넘길 수 있는 대표 지점이다. 다만 파일 시스템 연산처럼 OS 제약 때문에 carrier까지 붙잡는 블로킹도 있다. 내려올 수 없는 상태를 pinning이라 하며 native method나 foreign function을 실행하는 동안이 대표적이다. Java 21에서 23까지는 `synchronized` 안의 블로킹도 pinning이었지만 JDK 24의 JEP 491이 이를 대부분 없앴다.
- JEP 444 기준 virtual thread 스케줄러는 일정 CPU 시간을 쓴 스레드를 강제로 선점하는 time sharing을 구현하지 않는다. 애플리케이션이 직접 양보할 필요는 없지만, CPU를 오래 쓰는 virtual thread는 그동안 carrier를 내주지 않는다. Java SE 27 문서도 virtual thread를 긴 CPU 집약 작업용으로 의도하지 않았다고 적는다.
- OS는 virtual thread의 존재를 모른다. OS 수준 모니터링에는 virtual thread 수보다 적은 OS 스레드만 보인다. 희소 자원 제한과 풀링 여부는 [[Thread-Pool-Sizing|스레드 풀 사이징]]의 virtual thread 절을 따른다.

## 언어의 스레드 API가 OS 스레드가 되는 경로

커널이 관리하는 하드웨어와 시스템 자원은 시스템 콜을 거쳐 쓴다. C 라이브러리는 시스템 콜 번호와 인자를 약속된 위치에 두고 trap 명령을 실행하는 코드를 감싸 두고, 언어 런타임은 그 위에 다시 자신의 API를 얹는다. 그래서 개발자는 시스템 콜을 직접 부르지 않고도 파일, 소켓, 스레드를 다룬다.

Linux의 OpenJDK(HotSpot)에서 platform thread를 시작하는 경로는 다음과 같다.

1. `Thread.start()`가 native method `start0()`를 호출한다.
2. JVM이 OS 스레드를 만들며, Linux 구현은 `pthread_create()`를 호출한다.
3. glibc의 NPTL은 `clone` 계열 시스템 콜로 같은 스레드 그룹의 새 task를 만든다.
4. 커널 스케줄러가 새 task를 다른 task와 같은 방식으로 스케줄링한다.

Virtual thread의 `start()`는 이 경로를 타지 않고 실행 작업을 JDK 스케줄러에 제출한다. `run()`을 직접 호출하면 새 스레드 없이 현재 스레드에서 실행될 뿐이다 ([[Java-Threads-Lifecycle-and-Cancellation|Java 스레드 생명 주기]]).

## 면접 체크포인트

- 하드웨어 스레드, OS 스레드, 사용자 수준 스레드가 각각 무엇을 가리키는지, 하이퍼스레딩이 켜진 쿼드 코어에서 OS가 보는 CPU 수
- CPU에서 실제로 실행되는 단위가 OS 스레드라는 점과 사용자 스레드가 OS 스레드에 연결돼야 하는 이유
- 1:1, N:1, M:N의 블로킹 시스템 콜 처리, 멀티코어 활용, 전환 비용 차이
- 그린 스레드(M:1)와 Java virtual thread(M:N)의 차이, virtual thread가 CPU 집약 작업에 맞지 않는 이유
- 멀티스레딩이면 항상 병렬 실행인가 (싱글 코어 반례)
- `Thread.start()`가 OS 스레드를 만드는 경로와 `run()` 직접 호출의 차이
- N:1이나 단일 스레드 런타임에서도 경쟁 조건이 생기는 이유

## 출처

- [YouTube, 쉬운코드, 프로세스, 스레드, 멀티태스킹, 멀티스레딩, 멀티프로세싱, 멀티프로그래밍](https://www.youtube.com/watch?v=QmtYKZC0lMU)
- [YouTube, 쉬운코드, 스레드 종류 총정리 (하드웨어 스레드, OS 스레드, 유저 스레드, 그린 스레드)](https://www.youtube.com/watch?v=vorIqiLM7jc)
- [YouTube, 쉬운코드, 인터럽트와 시스템 콜, 유저 모드와 커널 모드](https://www.youtube.com/watch?v=v30ilCpITnY)
- [YouTube, 쉬운코드, 스레드 풀을 쓰는 이유와 사용 팁](https://www.youtube.com/watch?v=B4Of4UgLfWc)
- [Operating System Concepts 10th 강의 슬라이드 4장, 5장 — Silberschatz, Galvin, Gagne](https://www.os-book.com/OS10/slide-dir/index.html)
- [Mechanism: Limited Direct Execution — OSTEP](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf)
- [What Is Hyper-Threading? — Intel](https://www.intel.com/content/www/us/en/gaming/resources/hyper-threading.html)
- [OpenJDK, JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [OpenJDK, JEP 491: Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)
- [Java SE 27, Thread](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/lang/Thread.html)
- [Thread.java — OpenJDK jdk 저장소](https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/lang/Thread.java)
- [os_linux.cpp — OpenJDK jdk 저장소](https://github.com/openjdk/jdk/blob/master/src/hotspot/os/linux/os_linux.cpp)
- [Linux man-pages, pthreads(7)](https://man7.org/linux/man-pages/man7/pthreads.7.html)
- [Linux man-pages, clone(2)](https://man7.org/linux/man-pages/man2/clone.2.html)
- [Linux man-pages, ps(1)](https://man7.org/linux/man-pages/man1/ps.1.html)
- [Linux kernel, Driver Basics (kthread)](https://docs.kernel.org/driver-api/basics.html)
- [Linux kernel ABI, sysfs-devices-system-cpu](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-devices-system-cpu)
- [Go runtime, Environment Variables (GOMAXPROCS)](https://pkg.go.dev/runtime#hdr-Environment_Variables)

## 관련 문서

- [[Process-Lifecycle|프로세스 생명주기와 상태 전이]]
- [[Context-Switching|컨텍스트 스위칭과 CPU 스케줄링]]
- [[Concurrency-vs-Parallelism|동시성과 병렬성]]
- [[Async-vs-Threads|async/await vs 스레드 (가상 스레드)]]
- [[Java-Threads-Lifecycle-and-Cancellation|Java 스레드 생명 주기와 취소]]
- [[Thread-Pool-Sizing|스레드 풀 사이징]]
- [[Sync-Async-Blocking|동기, 비동기, 블로킹, 논블로킹]]
