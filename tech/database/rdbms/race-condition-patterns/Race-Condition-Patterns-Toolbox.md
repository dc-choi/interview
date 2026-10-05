---
tags: [database, concurrency, race-condition, patterns]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["Race Condition 도구 선택", "동시성 도구 플로차트", "경쟁 재현 실험", "Race Condition 재현"]
---

# Race Condition 도구 선택과 체크포인트

층위 구분 없이 동시성 문제를 만났을 때 도구를 고르는 기준. 먼저 원자적 조건부 변경과 제약을 검토한다. 읽은 상태로 계산해야 하면 충돌률, 수정 확률과 잠금 보유 시간을 기준으로 낙관적/비관적 제어를 비교한다.

## 도구 선택 플로차트

```
동시성 문제 발견
  ↓
이 작업이 DB UPDATE 한 줄로 원자화 가능?
  ├─ YES → UPDATE ... WHERE condition 활용 (끝)
  └─ NO
      ↓
    한 프로세스 안의 async?
      ├─ YES → async-mutex 또는 큐
      └─ NO (여러 서버)
          ↓
        같은 DB에서 처리?
          ├─ YES → DB 락 (Pessimistic, Optimistic, Unique Index)
          └─ NO (여러 리소스)
              ↓
            분산 락 + Saga + 상태 키 조합
```

## 흔한 실수

- **모든 문제에 분산 락** → 불필요한 성능 저하, 복잡도
- **낙관적 락만 쓰고 경쟁 심한 리소스** → 재시도 폭증
- **긴 transaction과 잠금 대기** → 커넥션 풀 고갈 위험. transaction 종료, lock wait timeout과 실패 후 rollback 경계를 관리한다
- **Redlock TTL 만료 감지 안 함** → 이중 작업 수행
- **단일 스레드 Node.js니까 race 없다고 착각** → 이벤트 루프 interleaving으로 충분히 발생

## 면접 체크포인트

- 3가지 층위(프로세스, DB, 분산)의 구분과 적합한 도구
- 원자적 DB 연산이 왜 첫 번째 선택지인가
- Pessimistic vs Optimistic Lock 트레이드오프
- Redlock의 한계 (TTL, fencing token)
- Transactional Outbox가 해결하는 race condition
- async-mutex `runExclusive` vs `acquire/release` 선택 기준
- Semaphore(N)가 Mutex와 다른 쓰임새 (동시 허용 개수 제어)
- `count++` 한 줄이 race를 일으키는 이유와, 재현 실험이 매번 통과해도 안전하다고 할 수 없는 이유
- 스레드를 모두 시작한 뒤 `join()`해야 하는 이유와 시작 barrier의 역할

## 관련 문서
- [[Race-Condition-Patterns|Race Condition 패턴 (인덱스)]]
- [[Race-Condition-Patterns-Process|층위 1: 프로세스 내부]]
- [[Race-Condition-Patterns-DB-Distributed|층위 2와 3: DB 락, 분산 락]]
- [[Race-Condition-Patterns-OS-Sync|OS 수준 동기화 기초]]

## 중복 요청과 자원 경쟁

멱등성은 같은 요청의 재실행을 한 효과로 만들고 동시성 제어는 서로 다른 요청이 같은 자원을 변경할 때 불변식을 지킨다. 요청 key의 UNIQUE만으로 재고 초과가 막히지는 않고 재고 lock만으로 같은 결제 요청의 중복 효과가 막히지도 않는다. 두 조건을 각각 설계한다.

## 경쟁 재현 실험

경쟁 조건은 실행이 실제로 겹칠 때만 드러난다. 실험이 겹침을 만들지 못하면 안전하지 않은 코드도 매번 통과한다. 스레드든 HTTP 요청이든 같은 원칙을 적용한다.

- **모두 시작한 뒤 모두 기다린다**: 같은 루프에서 `start()` 직후 `join()`하면 앞 스레드가 끝나야 다음 스레드가 시작해 실행이 직렬화된다. 시작 루프와 대기 루프를 나눈다.
- **모두 끝난 뒤 결과를 읽는다**: 메인 스레드도 다른 스레드와 동시에 실행되므로 `join()` 없이 출력하면 일부만 반영된 값을 볼 수 있다. 성공한 `join()`은 그 스레드의 모든 동작이 이후 읽기보다 먼저 일어났음(happens-before)을 보장한다.
- **겹침을 만든다**: 작업이 스레드 생성과 시작 간격보다 짧으면 앞 스레드가 이미 끝나 겹치지 않는다. `count++` 한 번만 하는 스레드 100개에서 기대값 100이 그대로 나오기 쉬운 이유다. 공통 시작 barrier(`CountDownLatch`)로 동시에 출발시키고, 스레드당 반복 횟수를 늘리고, 여러 번 실행해 결과 분포를 본다.
- **sleep은 재현 확률을 높일 뿐이다**: 임계 연산 앞에 `sleep`을 넣으면 여러 스레드가 함께 잠들어 있다가 타이머와 스케줄링에 따라 비슷한 시점에 몰려 깨어나므로 겹침이 늘어난다. 깨어나는 시점은 실행마다 달라 결과도 매번 다르다. 순서를 맞추려고 넣은 sleep은 그 자체가 경쟁 조건이다([[Sleep-and-Timing|Sleep과 타이밍]]).
- **최종 불변식으로 판정한다**: 합계, 성공 건수, 잔여 재고처럼 끝난 뒤의 불변식을 확인한다. 예외가 없었다거나 몇 번 통과했다는 사실은 안전성의 증거가 아니다.
- **수정 뒤 같은 실험을 반복한다**: 단일 카운터를 `AtomicInteger.incrementAndGet()`으로 바꾸면 반복해도 기대값이 유지된다.

```java
static int count = 0;

public static void main(String[] args) throws InterruptedException {
    CountDownLatch start = new CountDownLatch(1);
    List<Thread> threads = new ArrayList<>();
    for (int i = 0; i < 100; i++) {
        Thread t = new Thread(() -> {
            try {
                start.await();          // 모두 같은 시점에 출발
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            for (int j = 0; j < 10_000; j++) {
                count++;                // read, add, write
            }
        });
        threads.add(t);
        t.start();
    }
    start.countDown();
    for (Thread t : threads) {
        t.join();                       // 시작 루프와 분리해 직렬화를 피한다
    }
    System.out.println(count);          // 1,000,000보다 작게 나올 수 있다
}
```

`Runnable.run()`은 checked 예외를 선언하지 않으므로 lambda 안에서 `InterruptedException`을 처리하고, `main`은 `throws`로 넘길 수 있다.

## 출처
- [인프런, 2PC 란 무엇인가?](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=324544)
- [인프런, Lock 을 활용하여 주문로직이 1번만 수행되도록 변경하기](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=323878)
- [인프런, Orchestration - 실패상황 테스트](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=337627)
- [인프런, Orchestration - 현재구조의 문제점과 해결방법](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=337628)
- [인프런, TCC 구현하기(2) - 동시성문제 해결하기](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=325074)
- [인프런, 동일한 주문인지 알 수 있도록 주문로직 수정하기](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=323829)
- [YouTube, 쉬운코드, 자바 스레드로 OS에서 배우는 Race condition을 재현하기](https://www.youtube.com/watch?v=mFBcfaPwPeQ)
- [Java SE 26 API, Thread](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Thread.html)
- [Java SE 26 API, CountDownLatch](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/CountDownLatch.html)
- [Java SE 26 API, Runnable](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Runnable.html)
- [Java SE 26 API, AtomicInteger](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html)
- [Java Language Specification 17.4.5, Happens-before Order](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html#jls-17.4.5)
