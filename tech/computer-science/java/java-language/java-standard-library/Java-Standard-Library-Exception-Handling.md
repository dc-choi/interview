---
tags: [java, exception, checked-exception, runtime-exception, finally, try-with-resources, stack-trace]
status: done
verified_at: 2026-10-01
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Exception Handling", "Java 예외 처리"]
---

# Java 예외 처리

예외는 정상 결과와 실패 정보를 분리해 호출 스택을 따라 전달한다. 좋은 예외 처리는 모든 곳에서 잡는 기술이 아니라, 실패를 의미 있는 타입과 문맥으로 표현하고 복구 또는 변환할 수 있는 경계에서 처리하는 설계다.

## 반환 코드가 만든 결합

실패를 `-1`, `null`, boolean 같은 반환값으로만 알리면 호출자가 정상 값과 오류 신호를 매 단계에서 구분해야 한다. 누락하면 다음 로직이 잘못된 값으로 계속 실행된다. 오류 내용이 늘수록 별도 결과 타입이나 예외가 필요하다.

예외를 사용하면 정상 흐름은 정상 값에 집중하고 실패는 가장 가까운 호환 `catch` 또는 호출자에게 전파된다. 다만 validation 실패처럼 예상 가능한 분기를 예외로 할지 명시적 result로 할지는 API 성격과 호출 빈도에 따라 정한다.

## Throwable 계층

```text
Throwable
├── Error
└── Exception
    └── RuntimeException
```

- `Error` 계열은 일반 application이 보통 복구하도록 기대되지 않는 JVM, linkage 등의 심각한 상태를 표현한다.
- `Exception`은 일반 프로그램이 처리할 수 있는 실패의 기반이다.
- `RuntimeException`과 그 하위 타입, `Error`와 그 하위 타입은 unchecked다.
- 나머지 exception class는 checked이며 compiler의 처리 또는 선언 검사를 받는다. 실무에서는 주로 `Exception` 하위이면서 `RuntimeException` 하위가 아닌 타입을 말한다.

unchecked가 복구 불가능하고 checked가 복구 가능하다는 법칙은 없다. JLS도 `RuntimeException`에서 복구 가능할 수 있고 일부 `Error`를 정교한 프로그램이 처리할 수 있음을 인정한다. 차이의 핵심은 compile-time checking이다.

## 기본 전파 규칙

```java
void load() throws IOException {
    throw new IOException("configuration read failed");
}
```

- `throw`는 `Throwable` 객체를 발생시킨다.
- `throws`는 method나 constructor가 밖으로 전달할 수 있는 checked exception 계약을 선언한다.
- checked exception은 잡거나 허용된 상위 타입으로 선언해야 한다.
- unchecked exception은 선언하지 않아도 전파된다. 문서화할 가치가 있는 호출 계약 위반은 Javadoc에 남길 수 있다.
- catch는 위에서 아래로 검사되므로 하위 타입을 먼저 둔다. 상위 타입을 먼저 두어 뒤 catch가 도달 불가능하면 compile error다.

`catch (Exception)`이나 `catch (Throwable)`은 framework 최상위 경계처럼 종료와 기록 정책이 있는 곳 외에는 범위가 너무 넓기 쉽다. 특히 `ThreadDeath`, `VirtualMachineError`, interruption과 취소 신호를 무심코 삼키지 않는다.

## checked와 unchecked 선택

checked exception은 호출자에게 처리 의무를 보이지만 계층 전체의 `throws`와 interface에 결합을 만들 수 있다. unchecked exception은 API를 간결하게 하지만 문서 없는 실패를 숨길 수 있다.

다음 질문으로 선택한다.

1. 호출자가 이 위치에서 의미 있게 복구하거나 다른 대안을 선택할 수 있는가.
2. 실패가 구현 세부사항인가, 공개 contract의 일부인가.
3. interface의 모든 구현이 같은 checked contract를 지켜야 하는가.
4. 실패가 입력 오류, 일시적 외부 장애, 불변식 위반 중 무엇인가.

Spring이 많은 기술 예외를 unchecked로 추상화한다고 해서 모든 checked exception을 일괄 변환하지 않는다. 추상화 경계에서 도메인이나 application 예외로 바꾸고 원인을 보존한다.

```java
try {
    repository.save(order);
} catch (SQLException cause) {
    throw new OrderPersistenceException("order save failed", cause);
}
```

## catch에서 해야 할 일

- 실제 복구, 재시도 판단, fallback 또는 더 높은 수준의 예외 변환 중 하나를 수행한다.
- 메시지에 식별 가능한 업무 문맥을 더하되 token, 비밀번호와 개인정보를 포함하지 않는다.
- 원본 exception을 cause로 연결한다.
- 같은 실패를 여러 계층에서 반복 기록하지 않고 관측 책임이 있는 경계를 정한다.
- `InterruptedException`을 잡고 작업을 끝내지 않을 경우 보통 `Thread.currentThread().interrupt()`로 interrupt 상태를 복원하거나 계약대로 전파한다.
- 외부 입력을 숫자로 바꾸는 경계에서는 `NumberFormatException`을 잡아 입력 오류로 변환한다. `IllegalArgumentException` 하위의 unchecked 예외라 선언 없이 전파되며, `Integer.parseInt("12a")`의 메시지는 `For input string: "12a"`다.

빈 catch, 오류를 정상값으로 위장하는 catch, 원인 없는 새 예외는 진단 정보를 잃는다. 예외 메시지를 사용자에게 그대로 노출하지 말고 외부 응답 코드와 내부 원인을 분리한다.

## 진단 정보 남기기

| 수단 | 남는 정보 | 한계 |
|---|---|---|
| `getMessage()` | detail message | null일 수 있다(`new RuntimeException().getMessage()`). 타입, stack trace와 cause를 잃는다 |
| `toString()` | `클래스명: 메시지` | stack trace와 cause가 없다 |
| `printStackTrace()` | `toString()`, stack frame, `Caused by:` cause chain, `Suppressed:` 목록 | System.err에 직접 쓴다. level, timestamp, trace id와 수집 경로가 없고 여러 thread 출력이 섞인다 |
| logger에 예외 객체 전달 | 메시지, 문맥 값, 전체 stack trace와 cause chain | logging 설정과 수집 파이프라인을 따른다 |

- `printStackTrace()`는 학습 예제의 즉석 진단용이다. 서비스 코드에서는 SLF4J 1.6.0 이후 `log.error("order save failed orderId={}", orderId, e)`처럼 예외를 placeholder 인자 뒤 마지막 인자로 넘기면 stack trace가 함께 남는다. 예외가 마지막 인자가 아니면 일반 객체로 취급돼 stack trace가 빠진다.
- 예외를 전환할 때는 위 `OrderPersistenceException`처럼 `super(message, cause)`나 `super(cause)` 생성자로 원인을 연결한다. cause만 받는 생성자의 detail message는 `cause.toString()`이 된다. cause 생성자가 없는 예외는 `initCause()`로 한 번만 연결할 수 있다.
- 출력에서는 감싼 예외의 stack 뒤에 `Caused by:` 구간이 이어지고, 여러 번 감쌌다면 마지막 `Caused by`가 root cause다. `... 6 more`는 바깥 예외와 겹치는 아래쪽 frame을 생략한 표시다. 원인 없이 새 예외를 던지면 `Caused by`가 사라져 DB가 반환한 오류 코드, SQL state와 메시지가 로그에 남지 않는다.

## 잡히지 않은 예외

잡히지 않은 예외는 호출 스택을 끝까지 거슬러 올라간 뒤 그 thread를 종료시킨다. 종료 직전 JVM은 thread의 `UncaughtExceptionHandler`를 호출한다. 따로 설정하지 않았으면 `ThreadGroup`이 처리를 맡고, default handler도 없으면 `Exception in thread "main" java.lang.ArithmeticException: / by zero`처럼 thread 이름과 stack trace를 System.err에 출력한다.

- 콘솔 예제에서 프로그램 전체가 끝나는 이유는 main이 유일한 non-daemon thread였기 때문이다. `System.exit` 같은 명시적 종료가 없으면 JVM은 non-daemon thread가 모두 끝날 때 종료하며(JLS 12.8), JDK 21 launcher에서 실측한 종료 코드는 1이었다.
- 별도 thread의 예외는 그 thread만 `TERMINATED`로 만들고 main은 계속 실행된다. `ExecutorService.execute`로 실행한 작업의 예외도 worker thread의 handler가 출력한다.
- `submit`으로 제출한 작업의 예외는 `Future`에 담겨 `get()`을 호출할 때 `ExecutionException`으로만 드러난다. 결과를 확인하지 않으면 아무 출력 없이 사라진다([[Java-Executors-Futures-and-Thread-Pools|Executor와 Future]]).
- 웹 서버는 요청 경계에서 예외를 잡아 응답으로 바꾸므로 한 요청의 예외가 서버를 끝내지 않는다. 그 경계에서 기록과 알림이 빠지지 않게 한다([[Spring-Exception-Handling|Spring 예외 처리]]).

## finally와 try-with-resources

`finally`는 성공과 실패 모두에 필요한 정리 지점이고, `AutoCloseable` 자원은 try-with-resources로 관리한다. try-catch 뒤에 둔 정리 코드가 건너뛰어지는 경우, finally의 close 예외가 핵심 예외를 덮는 문제, close와 catch, finally의 실행 순서, suppressed exception과 `close()`의 throws 설계는 [[Java-Standard-Library-Exception-Handling-Resource-Cleanup|Java 자원 정리]]에서 다룬다.

## 예외 계층 설계

application 예외의 상위 타입을 두면 transport, use case와 domain 경계에서 정책을 모을 수 있다. 너무 깊은 계층은 catch 선택을 어렵게 하므로 호출자의 대응이 달라지는 축만 타입으로 나눈다.

- 입력이나 요청 계약 위반
- 찾을 수 없음이나 충돌 같은 domain 결과
- 재시도 가능한 외부 의존성 실패
- 영속성, 통신 같은 infrastructure 실패
- 프로그래밍 불변식 위반

HTTP status와 Java exception을 일대일로 전역 결합하지 않는다. controller나 exception mapper에서 외부 protocol 표현으로 변환하고 내부 cause와 stack trace는 제한된 log와 tracing에 남긴다.

## 면접 체크포인트

- checked와 unchecked의 기준이 복구 가능성이 아니라 compiler 검사라는 점
- `throw`와 `throws`의 차이
- broad catch와 빈 catch가 위험한 이유
- 예외 변환에서 cause를 보존해야 하는 이유와 `Caused by`로 root cause를 읽는 법
- `printStackTrace()`와 `getMessage()`만 남기는 로그의 한계
- 잡히지 않은 예외가 종료시키는 범위와 `submit`에서 예외가 사라지는 이유
- finally와 try-with-resources의 실패 모드([[Java-Standard-Library-Exception-Handling-Resource-Cleanup|Java 자원 정리]])

## 실패의 타입과 선택적 catch

연결 실패와 전송 실패처럼 호출자 대응이 다르면 application 상위 exception 아래 하위 타입을 두고 안전한 문맥 필드를 담는다. 메시지와 cause를 보존하되 전송 payload 전체, token이나 개인정보를 무조건 기록하지 않는다. 내부에서는 타입을 기준으로 분기하고 외부 API에는 안정적인 오류 코드로 변환한다.

`catch (ConnectFailure | SendFailure e)`는 같은 대응의 예외를 묶는다. 서로 상속 관계인 타입은 multi-catch 대안으로 함께 쓸 수 없고 e는 재대입할 수 없다. 대안의 공통 상위 type에 있는 member만 사용할 수 있으므로 하위 타입의 상세 처리가 필요하면 개별 catch를 둔다. 정상 업무를 계속할 수 있는 최상위 경계에서는 broad catch 뒤 내부 정보 없는 응답과 원인 기록을 제공하고, 복구할 수 없는 상태를 정상값으로 위장하지 않는다.

## 출처

- [JLS 11, Exceptions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-11.html)
- [JLS 12.8, Program Exit](https://docs.oracle.com/javase/specs/jls/se26/html/jls-12.html#jls-12.8)
- [JLS 14.20, The try statement](https://docs.oracle.com/javase/specs/jls/se26/html/jls-14.html#jls-14.20)
- [Throwable, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Throwable.html)
- [Thread.UncaughtExceptionHandler, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Thread.UncaughtExceptionHandler.html)
- [ThreadGroup, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/ThreadGroup.html)
- [ExecutorService, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/ExecutorService.html)
- [NumberFormatException, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/NumberFormatException.html)
- [AutoCloseable, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/AutoCloseable.html)
- [Closeable, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/Closeable.html)
- [SLF4J, FAQ](https://www.slf4j.org/faq.html)
- 인프런, [예외처리](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13705)
- 김영한 강사, [예외 포함과 스택 트레이스](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110105)
- 김영한 강사, [예외 처리가 필요한 이유1 - 시작](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212277)
- 김영한 강사, [예외 처리가 필요한 이유2 - 오류 상황 만들기](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212278)
- 김영한 강사, [예외 처리가 필요한 이유3 - 반환 값으로 예외 처리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212279)
- 김영한 강사, [자바 예외 처리1 - 예외 계층](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212280)
- 김영한 강사, [자바 예외 처리2 - 예외 기본 규칙](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212281)
- 김영한 강사, [자바 예외 처리3 - 체크 예외](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212282)
- 김영한 강사, [자바 예외 처리4 - 언체크 예외](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212283)
- 김영한 강사, [예외 처리 도입1 - 시작](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212285)
- 김영한 강사, [예외 처리 도입2 - 예외 복구](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212286)
- 김영한 강사, [예외 처리 도입3 - 정상, 예외 흐름 분리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212287)
- 김영한 강사, [예외 처리 도입4 - 리소스 반환 문제](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212288)
- 김영한 강사, [예외 처리 도입5 - finally](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212289)
- 김영한 강사, [예외 계층1 - 시작](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212290)
- 김영한 강사, [예외 계층2 - 활용](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212291)
- 김영한 강사, [실무 예외 처리 방안1 - 설명](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212292)
- 김영한 강사, [실무 예외 처리 방안2 - 구현](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212293)
- 김영한 강사, [try-with-resources](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212294)
- 김영한 강사, [예외 처리 정리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212295)

## 관련 문서

- [[Java-Standard-Library-Exception-Handling-Resource-Cleanup|Java 자원 정리]]
- [[Java-Exception-Record-Collection-Checked-Unchecked|Checked vs Unchecked Exception]]
- [[Java-Language-Library-and-IO|Java 표준 라이브러리와 I/O]]
- [[Java-Standard-Library-Date-and-Time|Java 날짜와 시간]]
