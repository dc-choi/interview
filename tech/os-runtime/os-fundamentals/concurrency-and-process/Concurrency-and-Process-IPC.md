---
tags: [os, concurrency, synchronization, ipc, deadlock]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["원자성과 IPC", "동기화와 교착상태", "Synchronization and IPC"]
---

# 원자성, 동기화, IPC

공유 상태의 정합성을 지키려면 한 연산의 경계, 실행 순서와 대기 조건을 명시해야 한다. 프로세스 사이에서는 통신 방식과 격리 경계까지 함께 선택한다.

## 원자성, 경쟁 조건, 임계구역

- **원자적 연산**: 다른 실행 흐름이 중간 상태를 관찰할 수 없는 하나의 단위처럼 수행되는 연산
- **경쟁 조건**: 타이밍이나 실행 순서에 따라 결과가 달라지는 상태
- **임계구역**: 공유 불변식을 깨지 않도록 동시 진입을 제한해야 하는 코드 구간
- **동기화**: 상호배제뿐 아니라 사건 순서, 조건 대기와 메모리 가시성을 조정하는 메커니즘

락으로 감싼 코드 전체가 하드웨어적으로 한 명령이 되는 것은 아니다. 락의 계약을 지키는 참여자에게 임계구역의 상호배제와 happens-before 관계를 제공하는 것이다.

### 올바른 상호배제 설계

1. 동시에 허용된 수보다 많은 실행 흐름이 임계구역에 들어가지 않는다.
2. 진입 가능할 때 참여자들이 영원히 결정하지 못하는 상태에 빠지지 않는다.
3. 정책이 요구하면 대기 시간이 무한히 늘지 않도록 공정성이나 bounded waiting을 제공한다.

상호배제는 safety, 진척과 공정성은 liveness 성질이다. 모든 mutex가 강한 공정성을 보장하는 것은 아니다.

## 동기화 원시 도구

### Mutex

- 한 시점에 소유자 하나가 임계구역에 들어가도록 한다.
- POSIX mutex는 성공적으로 lock한 thread가 소유자가 되며 타입에 따라 재진입과 오류 동작이 달라진다.
- 구현은 사용자 공간의 빠른 경로와 경합 시 커널 대기를 조합할 수 있다. mutex와 spinlock을 같은 것으로 보지 않는다.

### Semaphore

- 정수 permit 수를 표현한다.
- `wait`는 값이 양수이면 감소하고 진행하며 0이면 기다린다. `post/signal`은 값을 증가시키고 대기자를 깨울 수 있다.
- counting semaphore는 최대 N개의 동시 사용을 제한하는 데 적합하다.
- binary semaphore는 값이 0/1이지만 mutex와 달리 일반적으로 소유권 계약이 없다.

### Monitor와 condition variable

- monitor는 공유 상태, 그 상태를 조작하는 상호배제 연산, 조건 대기를 한 추상화로 묶는다.
- condition variable의 wait는 연관 mutex를 원자적으로 놓고 대기하며, 깨어난 뒤 mutex를 다시 얻고 조건 predicate를 재검사해야 한다.
- Java의 `synchronized`는 특정 객체 또는 class monitor를 잠근다. 다른 객체의 monitor를 사용하는 코드까지 모두 막는 것은 아니다.

| 목적 | 적합한 도구 | 핵심 계약 |
|---|---|---|
| 공유 불변식 보호 | mutex | 소유자 한 명, unlock 규칙 |
| N개 자원 수량 제한 | semaphore | permit 감소/증가 |
| 상태 조건을 기다림 | monitor + condition variable | mutex와 predicate 재검사 |
| 매우 짧은 커널 임계구역 | spinlock | 잠들지 않고 반복 확인 |

## 교착상태, 라이브락, 기아

### 교착상태의 필요조건

| 조건 | 설명 |
|---|---|
| 상호배제 | 자원을 동시에 공유할 수 없음 |
| 점유대기 | 자원을 보유한 채 다른 자원을 기다림 |
| 비선점 | 보유자의 협조 없이 자원을 회수할 수 없음 |
| 순환대기 | 참여자들이 원형으로 서로의 자원을 기다림 |

네 조건이 모두 필요하지만 특정 순간에 조건이 가능하다는 사실만으로 실제 교착상태가 확정되는 것은 아니다.

### 처리 전략

- **예방**: 전역 lock 순서, 한 번에 자원 요청, 선점 가능 설계처럼 필요조건 하나를 깨뜨린다.
- **회피**: 최대 자원 요구를 알고 안전 상태만 허용한다. 은행원 알고리즘이 대표적인 교재 모델이다.
- **검출**: wait-for/resource-allocation 정보를 분석한다. 자원 종류마다 인스턴스가 하나면 cycle이 교착상태를 뜻하지만 여러 인스턴스에서는 추가 검사가 필요하다.
- **복구**: 참여자 종료, 자원 선점, 재시작이나 트랜잭션 rollback 중 시스템에 맞는 방법을 고른다.

timeout은 무한 대기를 제한하는 운영 장치이지 교착상태의 증명은 아니다. 느린 I/O나 과부하도 같은 증상을 만들 수 있다.

### 라이브락과 기아

- **라이브락**: 참여자들이 계속 상태를 바꾸지만 유효한 진척이 없다. 동일한 재시도 정책이 서로 충돌할 수 있다.
- **기아**: 시스템 전체는 진행하지만 특정 참여자만 계속 자원을 얻지 못한다.
- lock 순서, 공정한 큐, bounded retry, 지수 backoff와 jitter를 문제 성격에 맞춰 사용한다.

## 프로세스 간 통신

IPC는 서로 다른 주소 공간의 프로세스가 데이터나 사건을 주고받는 메커니즘이다.

| 방식 | 특징 | 주의점 |
|---|---|---|
| pipe/FIFO | 바이트 스트림, 생산자와 소비자 연결 | 메시지 경계를 별도로 정의할 수 있음 |
| message queue | 커널이 메시지 단위를 큐잉 | 크기와 용량 제한, backpressure |
| shared memory | 같은 물리 메모리를 여러 주소 공간에 매핑 | 복사가 적지만 별도 동기화 필요 |
| socket | 로컬 또는 네트워크 endpoint 간 통신 | 스트림/데이터그램 의미가 protocol마다 다름 |
| signal/event | 작은 제어 사건 전달 | 전달 정보와 처리 제약이 큼 |

RPC는 transport 위에 요청/응답, 직렬화와 오류 의미를 얹는 상위 모델이다. regular file도 협업에 쓸 수 있지만 동시 업데이트, flush와 lock 규칙을 직접 설계해야 한다. 같은 프로세스의 thread가 공유 heap으로 통신하는 것은 inter-process communication이 아니다.

## 멀티프로세싱과 멀티스레딩

| 관점 | 여러 프로세스 | 한 프로세스의 여러 스레드 |
|---|---|---|
| 주소 공간 | 기본적으로 분리 | 코드, heap과 여러 자원 공유 |
| 통신 | IPC 필요 | 공유 메모리 접근이 직접적 |
| 격리 | 메모리 손상 범위를 줄임 | 치명적 process 오류는 모든 thread에 영향 가능 |
| 비용 | 주소 공간과 IPC 경계 비용 | 동기화, cache contention 비용 |

프로세스가 분리되어도 공유 파일, socket, supervisor 관계를 통해 장애가 전파될 수 있다. 스레드 하나의 일반 오류가 항상 전체 프로세스를 종료하는 것도 아니다. 언어 런타임과 오류 종류에 따라 다르다.

## 사용자 수준 task와 커널 thread

- **커널 thread/task**: 커널 스케줄러가 직접 실행 대상을 보고 CPU에 배치한다.
- **사용자 수준 task**: 런타임이 자체 큐에서 관리하며 하나 이상의 커널 thread에 매핑한다.
- **1:1, M:N 모델**: 사용자 실행 단위와 커널 실행 단위의 매핑 방식이다. 생성 비용, blocking 처리, 병렬성 제어의 tradeoff가 다르다.

싱글 스레드 이벤트 루프에서도 `await` 사이에 다른 작업이 끼어 논리적 lost update가 생길 수 있다. Worker나 shared memory를 쓰면 실제 data race도 고려한다. 데이터베이스의 dirty read/lost update는 DB transaction isolation과 동시성 제어의 별도 문제다.

## 관련 문서

- [[Concurrency-and-Process-Overview|OS 개요와 동시성]]
- [[Concurrency-and-Process|동시성과 프로세스 (인덱스)]]
- [[Context-Switching|컨텍스트 스위칭과 CPU 스케줄링]]
- [[Concurrency-vs-Parallelism|동시성과 병렬성]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]

## 출처

- 인프런, 널널한 개발자 강사, [원자성, 동기화 그리고 교착상태](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128253)
- 인프런, 감자 강사, [프로세스 간 통신](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100805), [공유자원과 임계구역](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100806), [세마포어](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100807), [모니터](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100808)
- 인프런, 감자 강사, [데드락이란?](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100810), [데드락 해결](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100811)
- [Linux sem_wait(3)](https://man7.org/linux/man-pages/man3/sem_wait.3.html)
- [POSIX pthread_mutex_lock(3p)](https://man7.org/linux/man-pages/man3/pthread_mutex_lock.3p.html)
- [POSIX pthread_cond_wait(3p)](https://man7.org/linux/man-pages/man3/pthread_cond_wait.3p.html)
- [Java Language Specification 17.1, Synchronization](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.1)
- [Linux pipe(7)](https://man7.org/linux/man-pages/man7/pipe.7.html)
- [Linux POSIX shared memory overview](https://man7.org/linux/man-pages/man7/shm_overview.7.html)
