---
tags: [os, concurrency, deadlock, synchronization]
status: done
verified_at: 2026-10-05
category: "OS&런타임(OS&Runtime)"
aliases: ["교착상태", "데드락", "OS Deadlock", "식사하는 철학자", "Dining Philosophers", "은행원 알고리즘", "Banker's Algorithm", "교착상태 예방"]
---

# 교착상태, 라이브락, 기아

[[Concurrency-and-Process-IPC|원자성, 동기화, IPC]]에서 분리한 교착상태 문서다. DB 트랜잭션의 교착상태와 감지 후 재시도는 [[Lock-Deadlock|DB 데드락]]에서 다룬다.

교착상태는 두 개 이상의 실행 흐름이 서로 상대가 가진 자원을 기다리다 아무도 진행하지 못하는 상태다. 원인은 공유 자원이다. 어떤 자원도 공유하지 않는다면 교착상태는 생기지 않는다. 자원에는 lock과 임계구역 같은 소프트웨어 자원뿐 아니라 CPU, 메모리, 저장 장치, 프린터 같은 하드웨어도 포함된다. 꼬리물기로 교차로가 막혀 누구도 움직이지 못하는 상황과 같고, 풀려면 누군가의 개입이 필요하다.

## 교착상태의 필요조건

| 조건 | 설명 |
|---|---|
| 상호배제 | 자원을 동시에 공유할 수 없음 |
| 점유대기 | 자원을 보유한 채 다른 자원을 기다림 |
| 비선점 | 보유자의 협조 없이 자원을 회수할 수 없음 |
| 순환대기 | 참여자들이 원형으로 서로의 자원을 기다림 |

네 조건이 모두 필요하지만 특정 순간에 조건이 가능하다는 사실만으로 실제 교착상태가 확정되는 것은 아니다.

### 식사하는 철학자로 확인하기

원형 탁자에 철학자와 포크가 같은 수만큼 있고, 먹으려면 양옆의 포크 두 개가 필요하다. 고전 문제는 다섯 명이지만 세 명으로 줄여도 구조는 같다. 모두 동시에 오른쪽 포크를 집으면 각자 하나만 쥔 채 왼쪽 포크를 기다리고, 아무도 양보하지 않아 누구도 먹지 못한다.

| 조건 | 철학자 상황 |
|---|---|
| 상호배제 | 포크 하나는 한 사람만 쓴다 |
| 점유대기 | 오른쪽 포크를 쥔 채 왼쪽 포크를 기다린다 |
| 비선점 | 남이 든 포크를 빼앗을 수 없다 |
| 순환대기 | 각자 옆 사람의 포크를 기다려 대기 관계가 원을 이룬다 |

비유를 볼 때는 순환대기가 실제로 닫히는지 확인한다. 화장실을 잠근 철수가 휴지를 기다리고 영희가 화장실을 기다리는 것만으로는 영희의 단순 대기다. 휴지를 쥔 영희가 화장실을 기다리고 철수가 그 휴지를 기다려야 원이 닫혀 교착상태가 된다.

## 처리 전략

교재는 교착상태를 다루는 방법을 넷으로 나눈다. 어느 것도 비용 없이 해결하지는 못한다.

- **예방**: 시스템을 설계할 때 필요조건 하나가 성립하지 않게 만든다(아래 표). 철학자 문제라면 한 명만 왼쪽 포크부터 집게 해 순환대기를 깬다. 다만 조건을 깨는 설계는 자원을 미리 묶거나 순서를 강제해 제약이 많고 비효율적일 수 있어, 회피와 발생 후 검출, 복구가 함께 연구됐다.
- **회피**: 실행 중에 사용 가능한 자원, 이미 할당된 자원과 앞으로의 최대 요구를 보고 교착상태로 갈 수 있는 할당을 미룬다. 은행원 알고리즘이 대표적인 교재 모델이다(아래).
- **검출과 복구**: 교착상태를 허용하고, wait-for/resource-allocation 정보를 분석해 찾은 뒤 복구한다. 자원 종류마다 인스턴스가 하나면 cycle이 교착상태를 뜻하지만 여러 인스턴스에서는 추가 검사가 필요하다. 복구 방법은 아래 절에 있다.
- **무시**: 교착상태가 드물고 막는 비용이 크다고 보고 운영체제가 따로 처리하지 않는다. 드물게 생기면 재시작하는 편이 실용적이라는 판단이다. 이때 애플리케이션 lock의 교착상태는 개발자가 lock 설계로 막아야 한다.

timeout은 무한 대기를 제한하는 운영 장치이지 교착상태의 증명은 아니다. 느린 I/O나 과부하도 같은 증상을 만들 수 있다.

### 필요조건별 예방 방법과 비용

| 깨뜨릴 조건 | 방법 | 비용과 한계 |
|---|---|---|
| 상호배제 | 읽기 전용 파일처럼 공유 가능한 자원으로 바꾼다 | 프린터나 임계구역의 lock처럼 본질적으로 공유할 수 없는 자원에는 쓸 수 없다 |
| 점유대기 | 시작 전에 필요한 자원을 모두 받거나, 자원을 하나도 갖지 않을 때만 요청하게 한다. 가진 자원을 먼저 놓고 필요한 것을 한꺼번에 다시 요청하는 방식이다 | 받아 놓고 쓰지 않는 동안 자원 활용률이 떨어지고, 인기 있는 자원을 한꺼번에 얻기 어려운 흐름은 기아에 빠질 수 있다. 호출할 코드가 쓸 lock을 미리 알아야 해 캡슐화와도 충돌한다 |
| 비선점 | 추가 자원을 바로 얻지 못하면 가진 자원을 내놓고, 이전 자원과 새 자원을 모두 얻을 수 있을 때 다시 시작한다 | CPU 문맥이나 DB 트랜잭션처럼 상태를 저장하고 되돌릴 수 있는 자원에 맞는다. lock은 강제로 빼앗기 어려워 `tryLock` 실패 시 스스로 놓고 재시도하는 형태가 되며, 같은 재시도가 엇갈리면 라이브락이 생기므로 무작위 지연을 둔다 |
| 순환대기 | 모든 자원에 번호를 매기고 오름차순으로만 요청한다 | 가장 흔히 쓰는 예방책이다. 규약일 뿐이라 한 곳이라도 어기면 깨지고, 코드 전체의 lock 사용을 알아야 순서를 정할 수 있다 |

### 은행원 알고리즘으로 보는 회피

자원을 줄 때마다 할당 뒤에도 모든 프로세스를 끝낼 수 있는 순서가 남는지(안전 상태) 확인하고, 남지 않으면 요청을 미룬다. 은행이 총 자금과 사업가별 대출액을 보고 추가 대출 여부를 정하는 방식에서 이름이 왔다.

- 필요한 값: 총 자원, 프로세스별 최대 요구, 현재 할당, 사용 가능(= 총 자원 − 할당 합), 남은 요구(= 최대 요구 − 현재 할당)
- 안전 판정: 남은 요구 ≤ 사용 가능인 프로세스를 골라 끝났다고 보고 그 할당을 사용 가능에 돌려준다. 이를 반복해 모두 끝낼 수 있으면 안전 상태다.
- 요청 처리: 요청이 남은 요구와 사용 가능 이하이면 할당했다고 가정하고 안전 판정을 돌린다. 불안전해지면 되돌리고 요청한 프로세스를 기다리게 한다.

| 프로세스 | 최대 요구 | 현재 할당 | 남은 요구 |
|---|---:|---:|---:|
| P1 | 9 | 5 | 4 |
| P2 | 6 | 4 | 2 |
| P3 | 4 | 3 | 1 |

총 자원이 14면 사용 가능은 14 − 12 = 2다. P1이 4개를 요청하면 2개로는 줄 수 없어 기다리게 하고, P2의 2개 요청은 받아들인다. 판정 순서 P2(2 ≤ 2, 반납 후 사용 가능 6), P3(1 ≤ 6, 반납 후 9), P1(4 ≤ 9, 반납 후 14)로 모두 끝나므로 안전 상태다.

- 불안전 상태가 곧 교착상태는 아니다. 모든 프로세스가 최대치를 요구하면 막힐 수 있는 상태일 뿐이지만, 회피는 안전 상태를 유지하는 쪽을 택한다.
- 비용: 프로세스마다 최대 요구를 미리 알아야 하고 요청마다 판정을 돌려야 한다. 그래서 회피는 비싸고 비효율적일 수 있고, 발생을 허용한 뒤 검출해 복구하는 방식이 함께 쓰인다.

### 검출 방식의 비용

| 방식 | 판단 기준 | 비용과 부작용 |
|---|---|---|
| 타이머 (가벼운 검출) | 일정 시간 진척이 없으면 교착상태로 간주하고 체크포인트로 롤백 | 구현이 단순하지만 느린 I/O나 과부하로 멈춘 프로세스도 교착상태로 오판해 억울하게 종료할 수 있다 |
| 자원할당 그래프 (무거운 검출) | 할당과 요청 관계를 계속 추적해 cycle이 생기면 원인 프로세스를 종료하고 롤백 | 그래프를 유지하고 검사하는 상시 오버헤드가 있지만 타이머식 오판 종료는 없다. 인스턴스가 여러 개인 자원은 cycle만으로 확정하지 않는다 |

### 복구 방법

| 방법 | 동작 | 고려할 점 |
|---|---|---|
| 모두 종료 | 교착상태에 걸린 흐름을 한꺼번에 강제 종료한다 | 확실하지만 모두의 진행 결과를 잃는다 |
| 하나씩 종료 | 하나를 종료하고 해소됐는지 검사하기를 반복한다 | 우선순위, 진행한 양과 남은 양, 사용 중인 자원, 함께 종료될 흐름 수로 대상을 고르고, 검사를 반복하는 비용이 든다 |
| 자원 선점 | 희생자의 자원을 일시적으로 빼앗아 다른 흐름에 준다 | 비용이 가장 적은 희생자를 고르고 안전한 지점으로 rollback해 다시 시작하게 한다. 같은 흐름이 계속 희생되는 기아를 막으려면 rollback 횟수를 비용에 넣는다 |

종료는 진행한 작업을 잃는 마지막 수단이다. 서버가 원인을 모른 채 멈춘 것처럼 보일 때 인스턴스를 내리고 새로 띄우는 대응도 같은 종류의 복구라, 진행 중 작업과 함께 원인 증거도 사라진다(아래 진단).

## 라이브락과 기아

- **라이브락**: 참여자들이 계속 상태를 바꾸지만 유효한 진척이 없다. 동일한 재시도 정책이 서로 충돌할 수 있다.
- **기아**: 시스템 전체는 진행하지만 특정 참여자만 계속 자원을 얻지 못한다.
- lock 순서, 공정한 큐, bounded retry, 지수 backoff와 jitter를 문제 성격에 맞춰 사용한다.

## 코드에서 생기는 교착상태

두 thread가 lock 두 개를 서로 반대 순서로 중첩해서 잡으면 각자 하나를 쥔 채 상대의 lock을 기다린다.

```java
// thread 1
synchronized (lock1) {
    synchronized (lock2) { /* ... */ }
}

// thread 2: 획득 순서가 반대
synchronized (lock2) {
    synchronized (lock1) { /* ... */ }
}
```

thread 1이 lock1을, thread 2가 lock2를 잡은 뒤 각자 상대의 lock을 요청하면 네 조건이 모두 성립한다. 해결은 조건 하나를 깨는 것이다.

1. **상호배제가 꼭 필요한지 본다**: lock을 남발하지 않았는지, 불변 객체, 스레드별 사본이나 원자적 연산으로 lock 없이 풀 수 있는지 먼저 확인한다.
2. **획득 순서를 통일한다**: 모든 코드가 lock1 다음 lock2 순서로 잡으면 순환대기가 사라진다. 계좌 이체처럼 인자에 따라 lock 쌍이 정해지면 계좌 ID나 lock 주소처럼 고정된 키의 순서로 잡는다.
3. **중첩을 풀 수 있는지 본다**: 첫 lock을 놓은 뒤 두 번째 lock을 잡으면 점유대기가 사라진다. 그 사이 다른 흐름이 상태를 바꿀 수 있으므로 두 자원에 걸친 불변식이 없을 때만 쓴다.
4. **기다림에 상한을 둔다**: `ReentrantLock.tryLock(timeout, unit)`이 실패하면 가진 lock을 놓고 무작위 지연 뒤 처음부터 다시 시도한다. 라이브락과 재시도 비용을 함께 설계한다([[Java-Locks-Monitors-and-Conditions|Java Lock, monitor와 Condition]]).

같은 thread가 이미 가진 lock을 다시 잡는 경우도 있다. Java monitor와 `ReentrantLock`은 재진입을 허용해 막히지 않지만, POSIX normal 타입 mutex는 교착상태가 되고(default 타입은 정의되지 않은 동작) error-checking 타입은 `EDEADLK`를 반환한다.

### 진단

- 재시작 전에 thread dump를 남긴다. JDK는 `jcmd <pid> Thread.print`를 권장하고(`-l`을 주면 `java.util.concurrent` lock 정보 포함), `jstack <pid>`는 stack trace와 함께 Java 수준 교착상태 검출 결과도 출력한다.
- 코드에서 확인하려면 `ThreadMXBean.findDeadlockedThreads()`를 쓴다. Java SE 26 기준 platform thread가 object monitor나 ownable synchronizer를 서로 기다리는 순환을 찾고, virtual thread가 포함된 순환은 찾지 못한다. 비용이 클 수 있는 진단용 API라 동기화 제어에 쓰지 않는다.

## 면접 체크포인트

- 네 필요조건과 각각을 깨는 방법, 그 비용 (lock 순서 통일이 가장 흔한 예방책인 이유)
- 예방과 회피의 차이, 은행원 알고리즘이 미리 알아야 하는 정보
- 검출 뒤 복구에서 모두 종료, 하나씩 종료, 자원 선점의 차이와 기아 위험
- 두 lock을 반대 순서로 잡는 코드가 막히는 과정과 네 가지 해결 방향
- 멈춘 서버를 재시작하기 전에 thread dump를 확보해야 하는 이유

## 출처

- 인프런, 감자 강사, [데드락이란?](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100810), [데드락 해결](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100811)
- 인프런, 널널한 개발자 강사, [원자성, 동기화 그리고 교착상태](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128253)
- YouTube, 쉬운코드, [데드락(교착상태)은 언제 발생하고 어떻게 해결하는가](https://www.youtube.com/watch?v=ESXCSNGFVto)
- [EWD310, Hierarchical Ordering of Sequential Processes — E.W. Dijkstra Archive](https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD310.html)
- [Common Concurrency Problems — Operating Systems: Three Easy Pieces, Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf)
- [Deadlocks 강의 슬라이드 — Operating System Concepts 10th Edition, Silberschatz, Galvin, Gagne](https://www.os-book.com/OS10/slide-dir/PPTX-dir/ch8.pptx)
- [POSIX pthread_mutex_lock(3p)](https://man7.org/linux/man-pages/man3/pthread_mutex_lock.3p.html)
- [Java Language Specification 17.1, Synchronization](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html#jls-17.1)
- [Java SE 26 API, ReentrantLock](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)
- [Java SE 26 API, ThreadMXBean](https://docs.oracle.com/en/java/javase/26/docs/api/java.management/java/lang/management/ThreadMXBean.html)
- [Java SE 26 Troubleshooting Guide, Diagnostic Tools](https://docs.oracle.com/en/java/javase/26/troubleshoot/diagnostic-tools.html)

## 관련 문서

- [[Concurrency-and-Process-IPC|원자성, 동기화, IPC]]
- [[Concurrency-and-Process-Synchronization|동기화 도구: 스핀락, 뮤텍스, 세마포어]]
- [[Concurrency-and-Process|동시성과 프로세스 (인덱스)]]
- [[Lock-Deadlock|DB 데드락]]
- [[Java-Locks-Monitors-and-Conditions|Java Lock, monitor와 Condition]]
