---
tags: [java, string, collection, exception, io, socket]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Library and IO", "Java 표준 라이브러리와 I/O"]
---

# Java 표준 라이브러리와 I/O

문자열과 컬렉션은 값을 표현하고, 예외는 실패를 전달하며, I/O와 socket은 process 밖의 세계와 byte를 주고받는다. 자료구조와 자원 수명을 함께 설계해야 안전한 backend가 된다.

## String, StringBuilder, StringBuffer

- `String`은 immutable이다. 연결이나 치환은 기존 instance를 바꾸지 않고 새 문자열 결과를 만든다.
- compile-time constant 연결은 compiler가 최적화할 수 있고 단순한 몇 번의 `+`는 가독성이 좋다. 반복문에서 동적으로 많은 문자열을 누적할 때 `StringBuilder`를 고려한다.
- `StringBuilder`는 mutable이고 synchronization을 보장하지 않는다. 한 thread 안에서 만드는 임시 문자열에는 보통 적합하다.
- `StringBuffer`는 주요 operation을 synchronized 방식으로 제공한다. 공유 mutable buffer가 정말 필요한지부터 검토하고, synchronization 비용은 측정해 판단한다.
- Unicode를 다룰 때 `length()`는 UTF-16 code unit 수다. 사용자에게 보이는 문자 수나 code point 수와 같지 않을 수 있다.

상세 비교는 [[Java-Backend-Fundamentals|Java 백엔드 면접 기초]]를 참고한다.

## Collection Framework

| 추상화 | 특성 | 대표 구현 |
|---|---|---|
| `List<E>` | 순서와 index, 중복 허용 | `ArrayList`, `LinkedList` |
| `Set<E>` | 중복 원소를 허용하지 않음 | `HashSet`, `TreeSet` |
| `Queue<E>` | 처리 순서를 표현 | `ArrayDeque`, `PriorityQueue` |
| `Map<K,V>` | key와 value 연결 | `HashMap`, `TreeMap` |

- `Collection<E>`은 `List`, `Set`, `Queue` 계열의 root interface다. `Map`은 framework에 속하지만 `Collection`의 subtype은 아니다.
- 변수와 parameter는 가능한 한 `List`, `Set`, `Map` 같은 interface로 선언해 구현 교체 비용을 낮춘다.
- generic은 원소 type을 compile time에 제한하고 불필요한 cast를 줄인다.
- hash 기반 collection의 key는 `equals`와 `hashCode` contract를 지켜야 한다. key로 쓴 객체의 비교 관련 상태를 변경하면 조회가 실패할 수 있다.
- iteration 중 구조 변경은 iterator가 허용한 방식으로 하거나 copy를 사용한다. 일반 collection은 thread-safe가 아니므로 공유 시 동시성 전략이 필요하다.

## 예외 처리

Java의 `Throwable` 아래에는 복구 대상으로 다루는 `Exception`과 보통 application이 처리할 수 없는 `Error`가 있다.

- checked exception은 catch하거나 `throws`로 선언해야 한다. unchecked exception인 `RuntimeException` 계열은 compile-time 강제가 없다.
- `throw`는 exception instance를 발생시키고 `throws`는 method가 밖으로 전달할 수 있는 exception type을 선언한다.
- catch는 실제로 복구하거나 의미 있는 context를 추가할 수 있는 경계에 둔다. 무시하거나 `Exception` 전체를 무분별하게 잡으면 원인과 정상 종료 신호를 숨긴다.
- exception을 변환할 때 cause를 보존한다. 사용자 응답, application log, domain error를 분리하고 secret이나 개인정보를 log에 남기지 않는다.
- `finally`는 성공과 실패 모두에 필요한 정리에 사용한다. `AutoCloseable` 자원은 try-with-resources가 close와 suppressed exception을 더 안전하게 처리한다.

```java
try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
    return reader.readLine();
}
```

계층과 설계 기준은 [[Java-Exception-Record-Collection-Checked-Unchecked|Checked vs Unchecked Exception]]에서 더 자세히 다룬다.

## byte stream과 character stream

| 목적 | 핵심 추상화 | 주의점 |
|---|---|---|
| byte 읽기와 쓰기 | `InputStream`, `OutputStream` | image, compressed data, protocol payload처럼 raw byte 처리 |
| 문자 읽기와 쓰기 | `Reader`, `Writer` | Unicode character와 text 처리 |
| byte와 문자 변환 | `InputStreamReader`, `OutputStreamWriter` | `Charset`을 명시해 encoding 불일치 방지 |
| primitive 값 형식 | `DataInput`, `DataOutput` | binary primitive와 modified UTF 형식, 일반 문자 stream이 아님 |
| buffering | `BufferedInputStream`, `BufferedReader` 등 | 작은 operation의 system call 수를 줄이고 read API를 보강 |

- byte를 text로 해석할 때 platform default encoding에 기대지 말고 UTF-8 등 contract의 charset을 명시한다.
- `FileInputStream`과 `FileOutputStream`은 file byte를 읽고 쓴다. 한 byte씩 반복하기보다 byte array나 buffered wrapper를 사용하고 partial read를 고려한다.
- `DataInputStream`과 `DataOutputStream`은 다른 byte stream을 감싸 primitive 값과 modified UTF 형식을 읽고 쓰는 decorator다.
- `flush`는 buffer의 출력을 아래 stream으로 밀어내지만 durability를 항상 뜻하지 않는다.
- 모든 데이터를 한 번에 메모리에 올리기보다 크기 제한과 streaming을 설계한다. file path는 directory traversal을 막고 upload size를 제한한다.

## socket networking

- `ServerSocket.accept()`는 connection이 들어올 때까지 block하고 연결마다 `Socket`을 반환한다.
- client는 host와 port로 server에 연결하고 server는 port에서 요청을 기다린다. `localhost`와 `127.0.0.1`은 local host를 가리키지만 production bind address와 공개 범위는 별도로 결정한다.
- `Socket`의 input/output stream은 byte stream이다. TCP는 ordered byte stream이지 application message 경계를 보존하는 protocol이 아니다.
- message를 구분하려면 고정 길이 header, length prefix, delimiter 또는 HTTP 같은 상위 protocol을 정의한다.
- connect timeout과 read timeout을 정하고, EOF와 partial read를 처리하며, 사용 후 socket을 닫는다.
- production 통신에서는 TLS, peer authentication, input validation, payload limit과 backpressure를 함께 설계한다.
- thread-per-connection 방식은 단순하지만 동시 연결이 늘면 thread와 memory 비용이 커진다. workload에 따라 executor, non-blocking NIO, virtual thread를 검토한다.

## Node.js와 NestJS에 대응하기

| Java | Node.js와 NestJS |
|---|---|
| `InputStream`과 `OutputStream` | `Readable`과 `Writable` stream |
| `byte[]`, `ByteBuffer` | `Buffer`, `Uint8Array` |
| `Socket`, `ServerSocket` | `net.Socket`, `net.Server` |
| blocking I/O와 NIO를 선택 | event loop 기반 non-blocking I/O가 기본 |

Node stream도 data chunk가 business message 하나와 일치한다고 가정하면 안 된다. Java와 마찬가지로 framing, timeout, error propagation, close, backpressure를 명시해야 한다.

## 면접 체크포인트

- String의 immutability와 builder 선택 기준
- Collection과 Map의 관계, interface type으로 선언하는 이유
- hash key의 `equals`와 `hashCode` contract
- checked와 unchecked exception의 차이와 catch 위치
- byte stream, character stream, charset bridge의 차이
- `DataInput`과 `DataOutput`을 문자 stream으로 분류하면 안 되는 이유
- TCP socket에 message boundary가 없는 의미

## 출처

- [String, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/String.html)
- [StringBuilder, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/StringBuilder.html)
- [StringBuffer, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/StringBuffer.html)
- [Collection, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Collection.html)
- [Map, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Map.html)
- [JLS 11, Exceptions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-11.html)
- [AutoCloseable, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/AutoCloseable.html)
- [java.io, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/package-summary.html)
- [Socket, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/Socket.html)
- [ServerSocket, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/ServerSocket.html)
- [Node.js Streams](https://nodejs.org/api/stream.html)
- [Node.js Buffer](https://nodejs.org/api/buffer.html)
- [Node.js Net](https://nodejs.org/api/net.html)
- 인프런, [문자열 클래스](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13702)
- 인프런, [Collections](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13703)
- 인프런, [예외처리](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13705)
- 인프런, [입력과 출력](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13706)
- 인프런, [네트워킹](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13707)

## 관련 문서

- [[Java-IO-Network-Reflection|Java I/O, network, HTTP와 runtime metadata]]
- [[Java-Generics-and-Collections|Java 제네릭과 컬렉션]]
- [[Java-Standard-Library-Immutability-and-String|Java 불변 객체와 String]]
- [[Java-Standard-Library-Date-and-Time|Java 날짜와 시간]]
- [[Java-Standard-Library-Exception-Handling|Java 예외 처리]]
- [[Java-Language-Object-Model|Java 객체 모델]]
- [[Java-Backend-Fundamentals|Java 백엔드 면접 기초]]
- [[Java-Exception-Record-Collection|Java 예외, Record, 1급 컬렉션]]
- [[Sync-Async-Blocking|동기, 비동기, 블로킹, 논블로킹]]
