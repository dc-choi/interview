---
tags: [os, concurrency, synchronization, monitor, condition-variable, producer-consumer]
status: done
verified_at: 2026-10-05
category: "OS&런타임(OS&Runtime)"
aliases: ["모니터", "Monitor", "모니터와 조건 변수", "Condition Variable", "조건 변수", "Bounded Buffer", "Mesa semantics"]
---

# 모니터와 condition variable

[[Concurrency-and-Process-Synchronization|동기화 도구: 스핀락, 뮤텍스, 세마포어]]에서 이어지는 문서다. lock만으로는 다른 흐름이 상태를 바꿀 때까지 기다리는 일을 효율적으로 표현할 수 없어, 모니터가 상호배제에 조건 대기를 더한다.

## 모니터의 구성

모니터는 공유 상태, 그 상태를 다루는 연산, 상호배제와 조건 대기를 한 추상화로 묶는다. 한 번에 한 흐름만 공유 상태를 다뤄야 하면서, 다른 흐름과 협력해 조건이 갖춰질 때까지 기다려야 할 때 쓴다. 구성 요소는 임계구역을 지키는 mutex 하나와 조건마다 두는 condition variable이다.

- `wait(cv, m)`: 자신을 cv의 대기 큐에 넣고 m을 놓은 뒤 잠든다. 놓기와 잠들기가 원자적이라, 다른 흐름이 m을 얻은 뒤 보낸 signal은 이미 잠든 흐름에 전달된다. 깨어나면 m을 다시 얻어야 반환한다. lock을 쥔 채 잠들면 조건을 바꿔 줄 흐름이 임계구역에 들어올 수 없으므로 wait가 mutex를 함께 받는다.
- `signal(cv)`: cv에서 기다리는 흐름 하나를 깨운다. 기다리는 흐름이 없으면 아무 효과가 없다. 값이 남는 세마포어의 signal과 달리 신호가 기억되지 않으므로, 조건은 공유 상태 변수로 표현하고 깨어나면 그 변수를 검사한다.
- `broadcast(cv)`: cv에서 기다리는 흐름을 모두 깨운다.

조건이 갖춰지길 계속 확인하며 도는 방식은 CPU를 낭비하고, lock을 쥔 채 확인하면 상대가 조건을 바꿀 수도 없다. 조건 대기는 확인을 멈추고 잠들었다가 상태를 바꾼 쪽의 신호로 깨어나는 구조다.

## 두 개의 큐

| 큐 | 관리 주체 | 기다리는 것 |
|---|---|---|
| entry queue | mutex | 임계구역 진입(lock 획득) |
| waiting queue | condition variable | 조건 충족 |

signal한 흐름이 계속 실행하는 방식(아래 signal-and-continue)에서 깨어난 흐름은 waiting queue에서 나와 곧바로 실행되지 않고, lock을 다시 얻기 위해 entry queue의 다른 흐름과 경쟁한다. 먼저 깨어난 흐름에 우선권을 줄지 공평하게 경쟁시킬지는 구현에 따라 다르다.

## signal 의미론

| 방식 | signal 뒤 실행 | 특징 |
|---|---|---|
| signal-and-continue (Mesa 의미론) | signal한 흐름이 lock을 쥔 채 계속 실행하고, 깨어난 흐름은 나중에 lock을 다시 얻는다 | signal은 상태가 바뀌었다는 힌트일 뿐 깨어난 흐름이 실행될 때 조건이 유지된다는 보장이 없다. 대부분의 시스템이 이 방식이다 |
| signal-and-wait (Hoare 의미론) | signal한 흐름이 물러나고 깨어난 흐름이 즉시 실행된다 | 보장은 강하지만 구현이 어렵다 |

Java monitor도 signal-and-continue다. notify로 선택된 thread는 notify한 thread가 monitor를 완전히 놓은 뒤에야 lock을 얻는다.

## bounded buffer로 보는 조건 대기

크기가 고정된 버퍼를 생산자와 소비자가 공유한다. 버퍼가 가득 차면 생산자가, 비면 소비자가 기다려야 하고, 그동안 상태를 계속 확인하며 돌지 않아야 한다.

```text
produce(item):                    consume():
  lock(m)                           lock(m)
  while buffer is full:             while buffer is empty:
    wait(notFull, m)                  wait(notEmpty, m)
  put(item)                         item = take()
  signal(notEmpty)                  signal(notFull)
  unlock(m)                         unlock(m)
                                    process(item)
```

- **`while`로 재검사한다**: 생산자가 항목을 넣고 잠든 소비자 C1을 깨워도, C1이 lock을 다시 얻기 전에 entry queue에 있던 소비자 C2가 먼저 들어와 그 항목을 가져갈 수 있다. `if`로 한 번만 검사했다면 C1은 빈 버퍼에서 꺼내려 한다. signal 없이 깨어나는 spurious wakeup도 POSIX와 Java가 허용하므로 깨어난 뒤 조건을 다시 검사한다.
- **condition variable을 조건별로 나눈다**: 하나만 두고 signal로 하나씩 깨우면 소비자가 생산자 대신 다른 소비자를 깨워 모두 잠드는 상황이 생길 수 있다. 나누면 소비자는 생산자만, 생산자는 소비자만 깨운다. 하나로 둔다면 broadcast로 모두 깨워 각자 조건을 재검사하게 한다. 필요 없는 흐름까지 깨워 lock 경쟁이 늘어나는 비용은 감수한다.
- **처리는 lock 밖에서 한다**: 꺼낸 항목의 처리처럼 공유 상태와 무관한 작업은 임계구역에 두지 않는다.

## Java의 모니터

- 모든 객체에는 monitor 하나와 wait set 하나가 있다. `synchronized` 인스턴스 메서드는 `this`, static 메서드는 해당 `Class` 객체의 monitor를, `synchronized (obj)` 블록은 지정한 객체의 monitor를 잠근다. 다른 객체의 monitor를 쓰는 코드까지 막지는 않는다.
- condition variable 연산은 `wait`, `notify`(signal), `notifyAll`(broadcast)에 대응한다. 객체당 wait set이 하나뿐이라 bounded buffer에서는 생산자와 소비자가 같은 집합에서 기다리므로, 보통 `notifyAll`로 모두 깨우고 각자 `while`로 재검사한다.
- 조건별 대기 집합이 필요하면 `Lock`과 여러 `Condition`(`notFull`, `notEmpty`)을 쓴다. `wait`, `notify` 계약과 `Condition` 사용법은 [[Java-Locks-Monitors-and-Conditions|Java Lock, monitor와 Condition]]에, 직접 구현하지 않는 선택지는 [[Java-BlockingQueue-and-Producer-Consumer|Java BlockingQueue와 생산자, 소비자]]에 있다.
- monitor는 세마포어의 오용 위험을 줄이려고 상호배제를 운영체제 호출이 아닌 언어 구성으로 묶은 것이다. 진입과 해제를 런타임이 처리하므로 프로그래머가 `wait`, `signal` 짝을 직접 맞추지 않는다. 같은 객체의 `synchronized` 메서드 `increase`와 `decrease`는 한 스레드가 하나를 실행하는 동안 다른 스레드가 둘 중 어느 것도 실행하지 못하고, 블록이 예외로 끝나도 monitor는 해제된다.
- 직접 조합하기 전에 `java.util.concurrent`에 필요한 동기화 클래스가 있는지 먼저 확인한다([[Java-Concurrency|Java 멀티스레드와 동시성]]).

## 면접 체크포인트

- 모니터를 이루는 mutex와 condition variable의 역할, entry queue와 waiting queue의 차이
- wait가 mutex를 인자로 받고 놓기와 잠들기를 원자적으로 처리해야 하는 이유
- condition variable의 signal과 세마포어 signal의 차이 (대기자가 없을 때 신호가 남는가)
- signal-and-continue와 signal-and-wait의 차이, wait를 `while` 안에서 호출해야 하는 두 가지 이유
- Java monitor가 `notifyAll`을 자주 쓰는 이유와 `Condition`으로 나누는 기준

## 출처

- YouTube, 쉬운코드, [모니터가 동기화에 사용되는 방식과 자바의 모니터](https://www.youtube.com/watch?v=Dms1oBmRAlo)
- 인프런, 감자 강사, [모니터](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100808)
- [Condition Variables — Operating Systems: Three Easy Pieces, Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf)
- [Synchronization Tools 강의 슬라이드 — Operating System Concepts 10th Edition, Silberschatz, Galvin, Gagne](https://www.os-book.com/OS10/slide-dir/PPTX-dir/ch6.pptx)
- [POSIX pthread_cond_wait(3p)](https://man7.org/linux/man-pages/man3/pthread_cond_wait.3p.html)
- [POSIX pthread_cond_broadcast(3p)](https://man7.org/linux/man-pages/man3/pthread_cond_broadcast.3p.html)
- [Java Language Specification 17.1, Synchronization](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html#jls-17.1)
- [Java Language Specification 17.2, Wait Sets and Notification](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html#jls-17.2)
- [Java Language Specification 14.19, The synchronized Statement](https://docs.oracle.com/javase/specs/jls/se26/html/jls-14.html#jls-14.19)
- [Java Language Specification 8.4.3.6, synchronized Methods](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.4.3.6)
- [Java SE 26 API, Condition](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/locks/Condition.html)

## 관련 문서

- [[Concurrency-and-Process-Synchronization|동기화 도구: 스핀락, 뮤텍스, 세마포어]]
- [[Concurrency-and-Process-IPC|원자성, 동기화, IPC]]
- [[Concurrency-and-Process|동시성과 프로세스 (인덱스)]]
- [[Java-Locks-Monitors-and-Conditions|Java Lock, monitor와 Condition]]
- [[Java-BlockingQueue-and-Producer-Consumer|Java BlockingQueue와 생산자, 소비자]]
- [[Java-Memory-Model-and-Monitors|Java Memory Model과 monitor]]
