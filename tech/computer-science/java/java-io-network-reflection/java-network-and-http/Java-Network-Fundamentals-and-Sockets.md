---
tags: [java, network, socket, tcp, udp, dns]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Socket Fundamentals", "Java 네트워크와 Socket"]
---

# Java 네트워크 기초와 socket

network application은 host와 transport endpoint 사이에 byte를 주고받는다. IP는 packet을 목적지 host까지 전달하고, TCP와 UDP는 endpoint를 port로 구분한다. DNS는 name을 address 등 resource record로 해석한다. 각 계층이 제공하지 않는 보장은 application protocol이 책임진다.

## 계층별 책임을 과장하지 않는다

| 구성 | 제공하는 것 | 제공하지 않는 것 |
|---|---|---|
| IP | packet addressing와 routing | 연결, 전달 보장, application 구분 |
| TCP | ordered reliable byte stream, congestion control | application message boundary, 무한한 재시도, business delivery 보장 |
| UDP | datagram boundary와 port multiplexing | 순서, 재전송, congestion control을 protocol 자체로 제공하지 않음 |
| DNS | 분산된 name과 resource record 조회 | 단일 database, 영구 불변 IP, application health 보장 |

UDP를 단순히 TCP보다 빠른 protocol이라고 외우지 않는다. handshake와 head-of-line 특성이 다르지만 reliability와 congestion control을 QUIC 같은 상위 protocol이 구현할 수도 있다.

## Java blocking socket의 흐름

```text
server: bind ServerSocket -> accept -> Socket -> input/output
client: resolve host -> connect Socket -> input/output
```

`ServerSocket.accept()`는 connection이 올 때까지 block하고, 반환된 `Socket`이 그 client와의 byte stream을 소유한다. server socket은 새 connection 접수용이고 application data를 직접 읽지 않는다.

```java
try (var server = new ServerSocket(port)) {
    while (!Thread.currentThread().isInterrupted()) {
        Socket socket = server.accept();
        executor.submit(() -> handle(socket));
    }
}
```

예시는 흐름을 보여줄 뿐 production lifecycle 전체는 아니다. task rejection, bounded concurrency, idle timeout, overload, graceful shutdown과 per-client exception isolation을 추가해야 한다.

## accept 전에 TCP 연결은 이미 성립한다

`accept()`가 연결을 만드는 것이 아니다. client가 listen 중인 port로 접속하면 SYN, SYN-ACK, ACK handshake는 server application이 아니라 OS가 끝내고, 완료된 연결은 OS의 accept queue(backlog)에서 기다린다. `accept()`는 그 queue에서 연결 하나를 꺼내 server 쪽 `Socket`을 만들고, 꺼낼 연결이 없으면 block한다.

- client의 `new Socket(host, port)`와 첫 `write()`는 server가 `accept()`하기 전에도 성공한다. 보낸 byte는 server OS의 수신 buffer에서 기다리다가 accept 뒤 읽힌다. JDK 21.0.3 재현에서 client의 connect와 `writeUTF()`가 accept 전에 반환됐고, server는 accept 뒤 그 문자열을 읽었다.
- 그래서 main thread 하나가 첫 client와 `readUTF()`, `writeUTF()`를 반복하는 server에서는 두 번째 client가 연결과 전송에 모두 성공하고도 응답을 기다리며 멈춘다. client 쪽 connect와 write 성공은 server application이 요청을 처리한다는 증거가 아니다.
- `accept()`와 read는 둘 다 block하므로 한 thread가 둘을 맡으면 서로를 막는다. main thread는 accept만 반복하고 연결마다 session을 별도 thread나 bounded executor에 맡긴다.
- accept loop가 멈추거나 느리면 client는 연결에 성공했는데 응답을 못 받아 read timeout으로 끝난다. connect timeout과 read timeout 증상을 구분하는 근거다([[Java-Socket-Lifecycle-Timeout-and-Protocol|timeout 분리]]).

queue 길이도 경계다. `ServerSocket(port)`는 queue 최대 길이 50을 요청하고, `ServerSocket(port, backlog)`의 정확한 의미는 구현별이라 상한을 두거나 무시할 수 있다. Linux의 backlog는 accept를 기다리는 완료 연결 queue 길이이며 `net.core.somaxconn`을 넘으면 조용히 잘린다(Linux 5.4부터 기본 4096, 이전 128). queue가 가득 차면 client가 `ECONNREFUSED`를 받거나 요청이 무시돼 재전송 뒤 성공할 수 있고, 기본값 `tcp_abort_on_overflow=0`에서는 reset 대신 버려져 client 쪽 지연으로 보인다. Tomcat 11 문서 기준 `acceptCount`(기본 100)가 `maxConnections`에 도달한 뒤 쓰는 이 OS queue 길이 설정이며, OS가 무시할 수도 있다([[Servlet-vs-Spring-Container|Servlet container 수용 한계]]).

client는 host 이름을 `InetAddress.getByName()`으로 해석하며 OS resolver 설정에 따라 hosts file과 DNS를 거친다([[Loopback-And-Localhost|loopback과 localhost]]). client의 local port는 OS가 할당한다.

## TCP는 message가 아니라 byte stream이다

한 번 `write()`한 data가 상대의 한 번 `read()`로 그대로 도착한다는 보장은 없다. 다음 중 하나로 framing을 정의한다.

- fixed-size record
- length-prefixed frame
- delimiter와 escaping
- connection close로 끝을 표현
- HTTP처럼 grammar와 length 규칙이 있는 application protocol

delimiter protocol은 payload 안 delimiter, charset, 최대 frame size와 incomplete frame을 처리해야 한다.

`DataOutputStream.writeUTF()`와 `DataInputStream.readUTF()` 쌍은 2 byte 길이 prefix frame이다. socket을 이 stream으로 감싼 echo와 chat 예제가 한 번 보낸 문자열을 한 번에 복원하는 이유다. 다만 형식의 제약이 그대로 protocol 제약이 된다([[Java-IO-Serialization-and-Data-Formats|DataStream 형식]]).

- encode 결과 65,535 byte가 상한이라 큰 JSON이나 긴 message는 쓰는 시점에 `UTFDataFormatException`으로 실패한다.
- modified UTF-8이라 NUL과 emoji 같은 보충 문자가 표준 UTF-8과 다른 byte가 된다. 다른 언어 peer와는 호환을 가정하지 않는다.
- 양쪽 API가 짝이어야 한다. 한쪽이 `writeUTF()`, 다른 쪽이 `BufferedReader.readLine()`이면 길이 byte가 문자에 섞이고 줄 끝을 기다리며 멈출 수 있다.
- `readUTF()`는 frame이 다 올 때까지 block하므로 `setSoTimeout()` 없이 쓰면 느린 peer에 thread가 묶이고, frame 중간에 연결이 끝나면 `EOFException`이 난다.

운영 protocol은 표준 UTF-8 payload와 `writeInt(length)` 같은 명시적 length header를 쓰고, 읽는 쪽은 최대 frame 크기를 넘는 길이를 buffer 할당 전에 거부한다.

## concurrency model을 선택한다

- thread-per-connection은 이해하기 쉽지만 platform thread와 memory가 connection 수에 비례한다.
- bounded executor는 resource 상한을 주지만 queue와 rejection 정책이 필요하다.
- NIO selector는 적은 thread로 많은 connection을 관리하지만 state machine 복잡도가 늘어난다.
- virtual thread는 blocking style을 유지하며 큰 concurrency를 다룰 수 있지만 downstream connection pool과 CPU 같은 실제 병목 상한은 사라지지 않는다.

## resource 정리

socket과 stream의 소유권을 한 lifecycle에 모으고 try-with-resources를 사용한다. 생성의 역순으로 닫히며 close 중 예외는 원래 예외와 분리한다. client 하나의 protocol error가 accept loop 전체를 종료하지 않도록 경계를 둔다.

## 점검 질문

- DNS lookup, connect, request write와 response read timeout을 구분했는가?
- TCP 위 application framing과 최대 message 크기가 있는가?
- accept loop가 session 처리와 분리돼 멈추지 않는가?
- OS accept queue 길이와 overflow 동작을 운영 환경에서 확인했는가?
- executor queue와 active connection 수가 bounded인가?
- handler가 socket을 정확히 한 번 소유하고 닫는가?
- retry가 중복 business operation을 만들지 않는가?

## 출처

- [Java SE 26, Socket](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/Socket.html)
- [Java SE 26, ServerSocket](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/ServerSocket.html)
- [Java SE 26, DataOutputStream](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/DataOutputStream.html)
- [Linux man-pages, listen(2)](https://man7.org/linux/man-pages/man2/listen.2.html)
- [Linux Kernel Documentation, IP Sysctl](https://docs.kernel.org/networking/ip-sysctl.html)
- [Apache Tomcat 11, The HTTP Connector](https://tomcat.apache.org/tomcat-11.0-doc/config/http.html)
- 김영한 강사, [client와 server](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244448), [internet 통신](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244449), [IP](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244450), [TCP와 UDP](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244451), [port](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244452), [DNS](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244453)
- 김영한 강사, [socket 예제](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244455), [socket 분석](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244456), [반복 통신 예제](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244457), [blocking 분석](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244458), [동시 client 처리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244459), [정리와 문제](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244473)
- 김영한 강사, [자원 정리 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244460), [자원 정리 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244461), [자원 정리 3](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244462), [try-with-resources](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244463)
- 인프런, [입력과 출력](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13706), [네트워킹](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13707)

## 관련 문서

- [[TCP|TCP]]
- [[DNS|DNS]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Java-Socket-Lifecycle-Timeout-and-Protocol|Java socket 수명, timeout과 protocol]]
