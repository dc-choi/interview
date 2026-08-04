---
tags: [java, io, stream, buffer, resource-lifecycle]
status: done
verified_at: 2026-08-04
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

## 자원 수명과 예외

`AutoCloseable` 자원은 try-with-resources로 소유권을 표현한다. 자원은 선언의 역순으로 닫히고, 업무 처리 예외와 close 예외가 동시에 나면 close 예외는 suppressed exception으로 보존된다.

- callee가 받은 stream을 닫을지 caller가 닫을지 API contract로 정한다.
- close를 `finally`에서 수동 구현할 때 핵심 예외를 close 예외로 덮어쓰지 않는다.
- 모든 `IOException`을 하나로 뭉개지 말고 retry 가능성, invalid input, permission과 disk full 같은 운영 분류를 남긴다.

## Node.js로 옮길 때

Java stream과 Node.js `Readable`/`Writable` 모두 chunk가 application message 하나라는 보장은 없다. 다만 Node stream은 event loop와 backpressure protocol이 중심이고, Java의 전통 `java.io` stream은 blocking 호출이 기본이다. 양쪽 모두 size limit, error propagation, close와 cancellation을 명시한다.

## 점검 질문

- binary와 text 중 무엇이며 charset은 어디서 결정되는가?
- partial read와 EOF를 올바르게 처리하는가?
- 한 번에 읽는 API 앞에 신뢰 가능한 크기 상한이 있는가?
- stream 소유자와 close 책임이 분명한가?
- buffer 크기와 성능 주장을 실제 workload로 측정했는가?

## 출처

- [Java SE 26, InputStream](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/InputStream.html)
- [Java SE 26, InputStreamReader](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/InputStreamReader.html)
- [Java SE 26, AutoCloseable](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/AutoCloseable.html)
- 김영한 강사, [stream 시작 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244417), [stream 시작 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244418), [InputStream과 OutputStream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244419)
- 김영한 강사, [한 byte씩 쓰기](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244420), [buffer 활용](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244421), [BufferedOutputStream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244422), [BufferedInputStream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244423), [한 번에 쓰기](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244424), [I/O 기본 1 정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244425)
- 김영한 강사, [문자 시작](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244427), [stream을 문자로](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244428), [Reader와 Writer](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244429), [BufferedReader](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244430), [기타 stream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244431), [I/O 기본 2 정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244432)

## 관련 문서

- [[Java-Character-Encoding-and-Charset|Java 문자 인코딩과 Charset]]
- [[Stream|Node.js Stream]]
- [[File-System|Node.js File System]]
