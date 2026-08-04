---
tags: [java, socket, timeout, tcp, shutdown, protocol]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Socket Lifecycle", "Java Socket 수명과 Timeout"]
---

# Java socket 수명, timeout과 application protocol

연결 성공은 network operation의 시작일 뿐이다. production socket은 connect, read, protocol idle, shutdown의 서로 다른 deadline과 EOF/RST를 처리해야 한다. 또한 TCP byte stream 위에 message boundary와 size limit을 정의해야 한다.

## timeout을 한 값으로 뭉치지 않는다

| 단계 | 실패 의미 | Java classic socket 예 |
|---|---|---|
| DNS | name resolution 지연 또는 실패 | resolver와 client policy에 따라 별도 관리 |
| connect | remote endpoint와 연결 성립 실패 | `socket.connect(address, timeout)` |
| read idle | 일정 시간 새 byte가 없음 | `socket.setSoTimeout(timeout)` |
| 전체 request deadline | connect, write, read를 합친 use-case 예산 초과 | 상위 cancellation/deadline orchestration |
| server idle | protocol상 다음 frame을 너무 오래 기다림 | session timer와 close policy |

`SO_TIMEOUT`은 socket read의 대기 제한이지 전체 request deadline이나 write timeout이 아니다. timeout 후 재시도할 때 operation의 멱등성과 이미 전송된 byte를 고려한다.

## 정상 EOF와 exception을 구분한다

- raw `InputStream.read()`는 peer가 output을 정상 종료해 EOF에 도달하면 `-1`을 반환한다.
- `BufferedReader.readLine()`은 더 읽을 line이 없으면 `null`을 반환한다.
- `DataInputStream.readUTF()`처럼 필요한 record를 끝까지 못 읽은 API는 `EOFException`을 던질 수 있다.
- RST, broken pipe와 connection reset은 보통 `SocketException` 계열로 나타나지만 정확한 message와 시점은 OS에 따라 달라질 수 있다.

FIN을 받았다고 application command가 성공한 것은 아니다. response framing과 business acknowledgment가 완료돼야 한다.

## close는 protocol과 transport 양쪽 문제다

TCP는 양방향 byte stream이므로 `shutdownOutput()`으로 한 방향만 EOF를 보내는 half-close가 가능하다. `Socket.close()`는 자원을 해제하지만 unread data, linger option과 process crash에 따라 wire에서 관찰되는 종료가 달라질 수 있다. 모든 close를 완전한 4-way 종료라고 단정하지 않는다.

## server shutdown sequence

```text
stop accepting
-> reject or drain new work
-> signal active sessions
-> wait within deadline
-> force close remaining sockets
-> stop executor
```

shutdown hook은 정상 JVM 종료를 보조하지만 `SIGKILL`, host crash와 abrupt power loss에는 실행되지 않는다. hook 하나에 durability나 cluster membership 정리를 의존하지 않는다. active session collection은 concurrent access와 double close를 안전하게 처리해야 한다.

## chat protocol에서 배우는 framing

예를 들어 `/join`, `/message`, `/users`, `/exit` command를 delimiter로 구분한다면 다음이 protocol contract다.

- charset과 line terminator
- command와 payload escaping
- 최대 line 길이와 최대 connection 수
- 인증 전 허용 command
- unknown command와 malformed input의 응답
- broadcast 중 느린 client가 전체 session을 막지 않게 하는 backpressure

Command pattern은 branching을 객체로 분리하지만 command 수가 적고 변화가 없으면 오히려 간접 비용이 크다. route map과 null object도 실제 extension 압력에 따라 선택한다.

## Node.js와 NestJS로 옮길 때

Node `net.Socket`도 chunk 경계를 message로 보장하지 않는다. `setTimeout()`은 idle event를 발생시킬 뿐 자동으로 connection을 닫지 않으므로 handler에서 정책을 수행한다. NestJS gateway나 WebSocket library를 써도 authentication, payload limit, heartbeat, slow consumer와 graceful shutdown 책임은 남는다.

## 점검 질문

- connect timeout, read idle과 전체 deadline을 구분했는가?
- EOF가 API별로 어떤 signal인지 아는가?
- frame size와 slow client backpressure가 bounded인가?
- graceful drain의 최대 대기 시간과 force-close 조건이 있는가?
- retry 전에 remote가 operation을 수행했을 가능성을 다루는가?

## 출처

- [Java SE 26, Socket](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/Socket.html)
- [Java SE 26, Runtime addShutdownHook](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Runtime.html#addShutdownHook(java.lang.Thread))
- 김영한 강사, [network 자원 정리 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244465), [자원 정리 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244466), [shutdown hook 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244467), [shutdown hook 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244468)
- 김영한 강사, [연결 예외](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244469), [timeout](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244470), [정상 종료](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244471), [강제 종료](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244472), [network 정리와 문제](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244473)
- 김영한 강사, [chat 설계](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244475), [client](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244476), [server 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244477), [server 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244478), [server 3](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244479), [server 4](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244480), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244481)

## 관련 문서

- [[Java-Network-Fundamentals-and-Sockets|Java 네트워크 기초와 socket]]
- [[External-Service-Resilience|Timeout, Retry와 외부 service resilience]]
- [[Graceful-Shutdown|Graceful Shutdown]]
- [[WebSocket|WebSocket]]
