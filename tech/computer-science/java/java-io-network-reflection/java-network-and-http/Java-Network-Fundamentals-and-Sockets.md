---
tags: [java, network, socket, tcp, udp, dns]
status: done
verified_at: 2026-08-04
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

## TCP는 message가 아니라 byte stream이다

한 번 `write()`한 data가 상대의 한 번 `read()`로 그대로 도착한다는 보장은 없다. 다음 중 하나로 framing을 정의한다.

- fixed-size record
- length-prefixed frame
- delimiter와 escaping
- connection close로 끝을 표현
- HTTP처럼 grammar와 length 규칙이 있는 application protocol

delimiter protocol은 payload 안 delimiter, charset, 최대 frame size와 incomplete frame을 처리해야 한다.

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
- executor queue와 active connection 수가 bounded인가?
- handler가 socket을 정확히 한 번 소유하고 닫는가?
- retry가 중복 business operation을 만들지 않는가?

## 출처

- [Java SE 26, Socket](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/Socket.html)
- [Java SE 26, ServerSocket](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/ServerSocket.html)
- 김영한 강사, [client와 server](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244448), [internet 통신](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244449), [IP](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244450), [TCP와 UDP](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244451), [port](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244452), [DNS](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244453)
- 김영한 강사, [socket 예제](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244455), [socket 분석](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244456), [반복 통신 예제](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244457), [blocking 분석](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244458), [동시 client 처리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244459)
- 김영한 강사, [자원 정리 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244460), [자원 정리 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244461), [자원 정리 3](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244462), [try-with-resources](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244463)

## 관련 문서

- [[TCP|TCP]]
- [[DNS|DNS]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Java-Socket-Lifecycle-Timeout-and-Protocol|Java socket 수명, timeout과 protocol]]
