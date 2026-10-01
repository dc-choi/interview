---
tags: [java, exception, finally, try-with-resources, autocloseable, resource-management]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Resource Cleanup", "Java 자원 정리", "finally와 try-with-resources"]
---

# Java 자원 정리: finally와 try-with-resources

네트워크 연결, 파일, DB 커넥션 같은 JVM 밖의 자원은 GC가 반납 시점을 보장하지 않으므로 사용한 코드가 명시적으로 닫아야 하고, 놓치면 연결과 file descriptor가 고갈된다. Java에 결정적 소멸자가 없다는 점은 [[Java-Language-Object-Model|Java 객체 모델]], 예외 설계 전반은 [[Java-Standard-Library-Exception-Handling|Java 예외 처리]]에서 다룬다.

## 정리 코드를 try-catch 뒤에 두면 건너뛸 수 있다

정상 흐름 전체를 하나의 try에 담으면 앞 단계가 실패할 때 뒤 단계가 자동으로 건너뛰어지고 catch에는 예외 흐름만 남는다. 그런데 연결 해제 같은 정리 코드를 try-catch 뒤에 두면 catch가 잡은 예외에서만 실행된다.

```java
try {
    client.connect();
    client.send(data);
} catch (NetworkClientException e) {
    log.warn("send failed", e);
}
client.disconnect(); // catch와 맞지 않는 RuntimeException이면 실행되지 않는다
```

catch와 타입이 맞지 않는 예외는 catch를 지나 바로 호출자로 전파되므로 `disconnect()`에 도달하지 않는다. catch를 계속 늘려 막을 수는 없다. 정리 코드를 `finally`에 두면 정상 완료, catch 처리, 잡지 못한 예외 모두에서 실행되며, 잡지 못한 예외는 try와 finally를 거쳐 원래 예외 그대로 호출자에게 전파된다. 이 위치에서 처리할 수 없는 예외는 밖으로 던지고 정리만 보장하려면 catch 없는 `try-finally`를 쓴다.

## finally와 자원 반환

`finally`는 try나 catch의 정상 또는 예외 완료 뒤 실행되는 정리 지점이다. 하지만 JVM 강제 종료, process 중단처럼 실행되지 않을 수 있는 상황도 있으므로 절대 실행되는 hook으로 설명하지 않는다. `System.exit`나 `Runtime.halt`로 프로그램이 끝나면 실행 중이던 thread의 finally는 실행되지 않는다(JLS 12.8).

```java
Connection connection = open();
try {
    return query(connection);
} finally {
    connection.close();
}
```

`finally`에서 `return`하거나 새 exception을 던지면 앞선 결과나 원래 exception을 가릴 수 있으므로 피한다. 여러 자원을 직접 닫는 finally는 첫 close 실패 때문에 다음 close가 실행되지 않는 문제도 만든다. 수동 정리를 고쳐 나가면 다음 실패가 차례로 드러난다.

- 자원 생성까지 try 안으로 옮기면 생성 실패 시 변수가 null이라 finally의 `close()`가 `NullPointerException`을 낸다. 닫기 전에 null을 확인해야 한다.
- finally의 `close()`가 던진 예외는 try의 핵심 예외를 대체하고 원래 예외는 버려진다(JLS 14.20.2). 계좌 이체 실패 예외를 보고 환불하는 호출자가 close 예외만 받으면 보상 로직이 동작하지 않는다.
- close 예외를 finally 안에서 잡아 로그로만 남기면 핵심 예외는 보존된다. 정리 중 난 예외는 당장 복구할 방법이 거의 없으므로 기록해 인지하는 정도면 충분하다. 다만 변수 선언을 try 밖으로 빼야 해 scope가 넓어지고, catch가 끝난 뒤에야 finally가 실행돼 반납이 늦으며, close 누락과 순서 실수 가능성이 남는다.
- 서로 의존하는 자원은 나중에 만든 것을 먼저 닫는다. 나중 자원이 먼저 만든 자원을 참조할 수 있기 때문이며, socket 위에 만든 stream은 stream을 먼저 닫는다.

## try-with-resources

`AutoCloseable` 자원은 Java 7부터 try-with-resources로 관리한다. 위 수동 정리의 문제를 언어가 대신 처리한다.

```java
try (InputStream input = Files.newInputStream(path);
     BufferedInputStream buffered = new BufferedInputStream(input)) {
    return buffered.readAllBytes();
}
```

- 성공과 실패 모두에서 자동으로 `close()`한다.
- 자원은 초기화의 역순으로 닫힌다.
- try body의 exception과 close exception이 함께 발생하면 body exception이 주 exception으로 전파되고 close exception은 suppressed 목록에 보존되며 `getSuppressed()`로 꺼낸다. body가 성공하고 close만 실패하면 close exception이 주 exception이 된다.
- 자원은 try 블록을 벗어나는 즉시 닫히고 그다음 catch와 finally가 실행된다. JLS 14.20.3.2는 catch나 finally가 있는 try-with-resources를 바깥 try가 안쪽 try-with-resources를 감싼 형태로 정의하므로, catch는 자원 초기화나 close 중 예외도 잡을 수 있고 finally에 도달할 때는 모든 자원이 닫혔거나 닫기를 시도한 상태다. 두 자원을 쓰면 `open A, open B, body, close B, close A, catch, finally` 순서로 실행된다.
- 자원 변수의 scope는 try 블록까지이고 암시적으로 final이다. catch에서 참조하면 `cannot find symbol`, 블록 안에서 재대입하면 컴파일 오류다. rollback처럼 실패 처리에 자원이 필요하면 try 블록 안의 중첩 try-catch에서 한다.
- 이미 선언된 final 또는 effectively final 자원도 Java 9부터 resource specification에서 사용할 수 있다.
- `AutoCloseable.close()`는 `Exception`을 선언할 수 있고 여러 번 호출해도 안전하다고 보장하지 않는다. 구체 자원의 계약을 확인한다.
- `Closeable.close()`는 `IOException`을 선언하며 이미 닫힌 stream에 다시 호출해도 효과가 없도록 규정한다.
- `AutoCloseable` Javadoc은 구현 클래스가 `close()`의 throws를 구체 예외로 좁히거나, 닫기가 실패할 수 없으면 아무것도 선언하지 않도록 강하게 권장한다. 자원 변수 타입이 throws를 좁힌 구현 클래스이면 catch 없이 컴파일되지만, 같은 객체를 `AutoCloseable` 타입 변수로 받으면 `unreported exception Exception` 오류가 난다. `close()`가 `InterruptedException`을 던지지 않게 하는 것도 권장 사항이다.

transaction rollback처럼 자원 close 외의 업무 보상은 try-with-resources만으로 해결되지 않는다. transaction manager의 경계와 예외 변환 정책을 함께 설계한다. 위 실행 순서와 컴파일 오류 메시지는 JDK 21.0.3에서 확인했다.

## 면접 체크포인트

- try-catch 뒤에 둔 정리 코드가 실행되지 않는 경우
- finally가 원래 exception을 가릴 수 있는 경우와 그 업무 영향
- try-with-resources의 close 순서와 suppressed exception
- try-with-resources에서 close, catch, finally의 실행 순서
- `close()`의 throws를 좁히면 사용처가 달라지는 이유

## 출처

- [JLS 6.3, Scope of a Declaration](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html#jls-6.3)
- [JLS 12.8, Program Exit](https://docs.oracle.com/javase/specs/jls/se26/html/jls-12.html#jls-12.8)
- [JLS 14.20, The try statement](https://docs.oracle.com/javase/specs/jls/se26/html/jls-14.html#jls-14.20)
- [JLS 14.20.3.2, Extended try-with-resources](https://docs.oracle.com/javase/specs/jls/se26/html/jls-14.html#jls-14.20.3.2)
- [Throwable, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Throwable.html)
- [AutoCloseable, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/AutoCloseable.html)
- [Closeable, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/Closeable.html)
- [Oracle, The Java Tutorials: The try-with-resources Statement](https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html)
- 김영한 강사, [예외 처리 도입3 - 정상, 예외 흐름 분리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212287)
- 김영한 강사, [예외 처리 도입4 - 리소스 반환 문제](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212288)
- 김영한 강사, [예외 처리 도입5 - finally](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212289)
- 김영한 강사, [try-with-resources](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212294)
- 김영한 강사, [자원 정리1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244460)
- 김영한 강사, [자원 정리2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244461)
- 김영한 강사, [자원 정리3](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244462)
- 김영한 강사, [자원 정리4](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244463)

## 관련 문서

- [[Java-Standard-Library-Exception-Handling|Java 예외 처리]]
- [[Java-Language-Object-Model|Java 객체 모델]]
- [[Java-Network-Fundamentals-and-Sockets|Java 네트워크와 Socket]]
