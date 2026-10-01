---
tags: [java, io, stream, buffer, resource-lifecycle]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Streams", "Java 바이트 문자 스트림"]
---

# Java byte stream과 character stream

Java I/O의 중심은 source에서 sink로 흐르는 단방향 stream이다. binary data는 `InputStream`과 `OutputStream`, text는 `Reader`와 `Writer`를 사용한다. character stream도 실제 file이나 socket 경계에서는 charset을 통해 byte로 변환된다.

## 핵심 추상화

| 목적 | 추상화 | 대표 구현 또는 wrapper |
|---|---|---|
| raw byte 읽기 | `InputStream` | `FileInputStream`, `BufferedInputStream` |
| raw byte 쓰기 | `OutputStream` | `FileOutputStream`, `BufferedOutputStream` |
| character 읽기 | `Reader` | `InputStreamReader`, `BufferedReader` |
| character 쓰기 | `Writer` | `OutputStreamWriter`, `BufferedWriter` |
| primitive binary | `DataInput`, `DataOutput` | `DataInputStream`, `DataOutputStream` |

`InputStreamReader`와 `OutputStreamWriter`는 byte와 character 사이의 bridge다. charset을 명시해 같은 byte를 같은 문자로 해석하게 한다.

## read는 요청한 만큼 채운다는 보장이 없다

`InputStream.read(byte[])`의 반환값은 실제 읽은 byte 수이며 EOF에서는 `-1`이다. file과 socket 모두 partial read가 가능하므로 buffer 전체가 유효하다고 가정하지 않는다.

```java
int read;
while ((read = input.read(buffer)) != -1) {
    output.write(buffer, 0, read);
}
```

단일 byte를 읽는 `read()`가 `int`를 반환하는 이유도 `0..255`와 EOF `-1`을 함께 표현하기 위해서다.

## buffering의 목적과 한계

- 작은 operation을 모아 Java와 native I/O 경계 호출 횟수를 줄인다.
- `BufferedReader`는 `readLine()` 같은 편의 기능을 제공한다.
- buffer가 클수록 무조건 빠른 것은 아니다. OS page cache, storage, record 크기와 memory 압력을 포함해 실제 workload로 측정한다.
- `flush()`는 Java-side buffer를 아래 stream으로 전달하지만 storage durability를 보장하지 않는다.
- `readAllBytes()`와 `Files.readAllLines()`는 간단하지만 입력 크기만큼 heap을 사용할 수 있다. 크기가 외부 입력이면 상한부터 둔다.

## 호출 횟수가 가르는 네 가지 입출력 방식

10MB(10 * 1024 * 1024 byte) file을 8KB buffer로 다룬 강의 실험이다. 수치는 강의 환경(M2 MacBook Pro) 실측이라 절대값보다 크기 순서를 본다.

| 방식 | 쓰기 | 읽기 | 핵심 |
|---|---|---|---|
| 1 byte씩 `write(int)`, `read()` | 약 14초 | 약 5초 | 호출마다 system call이 일어나 약 천만 번 반복한다 |
| 직접 buffer(`byte[8192]`를 채워 `write(buf, 0, len)`, `read(buf)`) | 약 14~17ms | 약 1~5ms | 호출 횟수가 buffer 크기만큼 줄어 약 1000배 빨라진다 |
| `BufferedOutputStream`, `BufferedInputStream`에 1 byte씩 | 약 0.1초 | 직접 buffer보다 느림 | 코드는 1 byte 방식처럼 단순하지만 호출마다 method와 lock 비용이 붙는다 |
| 한 번에(`write(byte[])`, `readAllBytes()`) | 약 7~13ms | 약 4ms | 가장 간단하지만 file 크기만큼 heap을 쓴다 |

JDK 21.0.3, Apple Silicon Mac 로컬 재현(1회 측정)도 같은 순서였다. 쓰기는 15.2초, 15ms, 102ms, 3ms, 읽기는 4.5초, 1ms, 94ms, 2ms였다.

- 1 byte 방식이 느린 이유는 OS와 disk도 자체 buffering을 하지만 system call 자체가 무겁기 때문이다. Java와 OS 경계를 넘는 호출 횟수를 줄여야 근본적으로 빨라진다.
- 직접 buffer 구현에서 index 증가를 빠뜨리면 비정상적으로 빠른 잘못된 결과가 나온다. 결과가 기대보다 크게 좋으면 먼저 의심한다. 가득 찬 buffer를 쓴 뒤 index를 0으로 돌리고, 마지막에 남은 부분을 따로 쓴다.
- buffer를 1에서 2, 10, 100으로 키울수록 빨라지다가 강의 실험에서는 약 8KB 전후부터 개선이 미미했다. 강의는 이를 disk와 file system의 기본 처리 단위(4KB, 8KB)로 설명하며 4KB~16KB를 흔한 선택으로 든다. 실제 workload로 측정해 정한다.
- `readAllBytes()`는 Java 9부터 제공된다. Javadoc은 대량 data를 읽는 용도가 아니라고 명시하고, 배열을 할당할 수 없으면 `OutOfMemoryError`가 난다. 1GB, 10GB 같은 file은 부분 읽기로 memory 사용량을 제어한다.
- 작은 file은 한 번에, 크고 성능이 중요한 file은 byte 배열 단위 호출로, 그 밖의 일반적인 경우는 코드가 단순한 Buffered stream으로 처리한다.

## Buffered stream의 내부 동작과 호출당 lock

- `BufferedOutputStream.write()`는 내부 `buf`에 쌓다가 가득 차면 아래 stream의 `write(byte[], off, len)`을 한 번 호출한다. buffer 최대 크기 이상을 한 번에 쓰면 buffer를 비운 뒤 바로 아래 stream에 쓴다. `flush()`는 덜 찬 buffer도 내보내고, `close()`는 `FilterOutputStream` 계약대로 `flush()` 뒤 아래 stream의 `close()`를 호출한다.
- `BufferedInputStream.read()`는 buffer가 비었을 때만 아래 stream에서 최대 buffer 크기까지 채우고 이후 buffer에서 1 byte씩 돌려준다. 기본 buffer는 8192 byte다. 현재 OpenJDK source의 `BufferedOutputStream`은 기본 생성자를 virtual thread에서 호출하면 512 byte로 시작해 8192 byte까지 늘리고, platform thread에서는 8192 byte로 시작한다.
- 호출마다 lock을 잡는다. JDK 21 source는 subclass가 아닐 때 내부 lock을 쓰고, JDK 24와 25 update source와 현재 OpenJDK master는 `synchronized` method를 쓴다. 어느 쪽이든 1 byte 호출마다 lock 획득과 해제가 반복되며, 강의는 직접 buffer와의 차이를 이 동기화 비용으로 설명한다.
- JDK에는 동기화 없는 Buffered stream이 없다. hot path에서는 Buffered stream도 byte 배열 단위로 호출하거나 buffer를 직접 다룬다.

## wrapper를 조합하는 decorator 구조

```java
try (var reader = new BufferedReader(
        new InputStreamReader(input, StandardCharsets.UTF_8))) {
    String line;
    while ((line = reader.readLine()) != null) {
        handle(line);
    }
}
```

기본 stream이 실제 자원에 연결되고 보조 stream이 buffering, charset 변환과 typed operation을 추가한다. wrapper 순서가 의미를 만들며 가장 바깥 자원을 닫으면 보통 아래 자원까지 전파된다.

- chain에서는 마지막에 감싼 가장 바깥 stream 하나만 닫는다. 바깥 `close()`가 flush 뒤 안쪽 `close()`를 연쇄 호출한다.
- 반대로 안쪽 `FileOutputStream`만 닫으면 buffer에 남은 byte가 전달되지 않는다. JDK 21.0.3에서 100 byte를 `BufferedOutputStream`에 쓰고 안쪽 stream만 닫자 file 크기는 0이었고, 뒤늦게 바깥을 닫으면 `IOException: Stream Closed`가 났다.
- `FileOutputStream`은 file이 이미 있으면 truncate하고 새로 쓴다. 끝에 이어 쓰려면 `new FileOutputStream(path, true)`, 문자 file은 Java 11부터 `new FileWriter(path, charset, true)`를 쓴다. 한 줄씩 append하는 저장소라면 file이 아직 없을 때의 조회를 빈 목록으로 볼지 오류로 볼지도 정한다.

## 자원 수명과 예외

`AutoCloseable` 자원은 try-with-resources로 소유권을 표현한다. 자원은 선언의 역순으로 닫히고, 업무 처리 예외와 close 예외가 동시에 나면 close 예외는 suppressed exception으로 보존된다.

- callee가 받은 stream을 닫을지 caller가 닫을지 API contract로 정한다.
- close를 `finally`에서 수동 구현할 때 핵심 예외를 close 예외로 덮어쓰지 않는다.
- 모든 `IOException`을 하나로 뭉개지 말고 retry 가능성, invalid input, permission과 disk full 같은 운영 분류를 남긴다.

## 콘솔 입력 Scanner와 System.in 소유권

`java.util.Scanner`는 source를 delimiter(기본은 공백) 기준 token으로 나누고 정규식으로 타입별 값을 parse한다. `nextInt()`는 token 하나만 읽고 뒤의 줄바꿈은 남긴다.

- `Scanner.close()`는 source가 `Closeable`이면 source도 닫는다. helper마다 `new Scanner(System.in)`을 만들고 닫으면 첫 호출이 `System.in`을 닫아 이후 입력을 읽지 못한다. JDK 21.0.3에서 닫힌 뒤의 `System.in.read()`는 `IOException: Stream closed`였다.
- 닫지 않아도 호출마다 Scanner를 새로 만들면 앞 Scanner가 미리 읽어 둔 입력을 잃을 수 있다. pipe로 `5`와 `7`을 한 번에 넣은 재현에서 두 번째 Scanner는 `NoSuchElementException`으로 실패했고, 입력이 1초 간격으로 들어오면 성공했다.
- Java SE 25 이후 `System.in` Javadoc은 한 번 감싼 뒤에는 wrapper만 쓰라고 하고 `new Scanner(System.in, System.getProperty("stdin.encoding"))`처럼 `stdin.encoding` charset을 안내한다. program 진입점에서 Scanner 하나를 만들어 전달하고 입력이 완전히 끝난 뒤에만 닫는다. file이나 String을 감싼 Scanner는 try-with-resources로 닫는다.
- 형식이 틀린 token에서 `nextInt()`는 `InputMismatchException`을 던지고 그 token을 소비하지 않는다. 예외만 잡고 다시 `nextInt()`를 부르면 같은 token에서 무한 반복하므로 `hasNextInt()`로 먼저 검사하거나 `next()`로 버린다.
- `nextInt()` 뒤의 `nextLine()`은 같은 줄의 나머지인 빈 문자열을 반환한다. 숫자와 문장을 섞어 받으면 줄 단위로 읽고 `Integer.parseInt`로 변환하는 식으로 읽기 방식을 통일한다.
- 입력이 고갈되면 `NoSuchElementException`, 닫힌 Scanner를 쓰면 `IllegalStateException`이 난다.
- 입력이 많으면 정규식 기반 Scanner보다 `BufferedReader.readLine()` 뒤 직접 parse하는 편이 빠르다는 것이 통설이다. 실제 입력 크기로 측정해 판단한다.

## Node.js로 옮길 때

Java stream과 Node.js `Readable`/`Writable` 모두 chunk가 application message 하나라는 보장은 없다. 다만 Node stream은 event loop와 backpressure protocol이 중심이고, Java의 전통 `java.io` stream은 blocking 호출이 기본이다. 양쪽 모두 size limit, error propagation, close와 cancellation을 명시한다.

## 점검 질문

- binary와 text 중 무엇이며 charset은 어디서 결정되는가?
- partial read와 EOF를 올바르게 처리하는가?
- 한 번에 읽는 API 앞에 신뢰 가능한 크기 상한이 있는가?
- stream 소유자와 close 책임이 분명한가?
- buffer 크기와 성능 주장을 실제 workload로 측정했는가?
- stream chain을 가장 바깥에서 닫고, 기존 file을 truncate할지 append할지 명시했는가?
- `System.in`을 감싼 wrapper를 하나만 만들고 program 도중에 닫지 않는가?

## 출처

- [Java SE 26, InputStream](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/InputStream.html)
- [Java SE 26, InputStreamReader](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/InputStreamReader.html)
- [Java SE 26, AutoCloseable](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/AutoCloseable.html)
- [Java SE 26, FilterOutputStream](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/FilterOutputStream.html)
- [Java SE 26, FileOutputStream](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/FileOutputStream.html)
- [Java SE 26, FileWriter](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/FileWriter.html)
- [Java SE 26, Scanner](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Scanner.html)
- [Java SE 26, System](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/System.html)
- [BufferedOutputStream.java — OpenJDK](https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/io/BufferedOutputStream.java)
- [BufferedInputStream.java — OpenJDK](https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/io/BufferedInputStream.java)
- [BufferedOutputStream.java, JDK 21 update — OpenJDK](https://github.com/openjdk/jdk21u/blob/master/src/java.base/share/classes/java/io/BufferedOutputStream.java)
- 김영한 강사, [stream 시작 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244417), [stream 시작 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244418), [InputStream과 OutputStream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244419)
- 김영한 강사, [한 byte씩 쓰기](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244420), [buffer 활용](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244421), [BufferedOutputStream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244422), [BufferedInputStream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244423), [한 번에 쓰기](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244424), [I/O 기본 1 정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244425)
- 김영한 강사, [문자 시작](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244427), [stream을 문자로](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244428), [Reader와 Writer](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244429), [BufferedReader](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244430), [기타 stream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244431), [I/O 기본 2 정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244432)
- 김영한 강사, [회원 관리 예제2 - 파일에 보관](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244435)
- 인프런, [배열](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13683), [조건문](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13685)

## 관련 문서

- [[Java-Character-Encoding-and-Charset|Java 문자 인코딩과 Charset]]
- [[Stream|Node.js Stream]]
- [[File-System|Node.js File System]]
