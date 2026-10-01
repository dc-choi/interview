---
tags: [java, socket, timeout, tcp, shutdown, protocol]
status: done
verified_at: 2026-09-30
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

## 연결 단계 실패의 예외 분류

| 상황 | 대표 예외 | 의미와 대응 |
|---|---|---|
| host 이름을 IP로 해석하지 못함 | `UnknownHostException` | 연결 시도 전에 실패한다 |
| 대상 port에서 listen하는 process가 없음 | `ConnectException: Connection refused` | 상대 TCP가 SYN에 RST로 응답했다. 대표 원인은 server 미기동이나 잘못된 port다 |
| 이미 사용 중인 port로 `new ServerSocket(port)` | `BindException: Address already in use` | 이전 실행 process가 남아 port를 점유하는지 확인한다 |
| SYN에 응답이 없고 connect timeout을 지정하지 않음 | `ConnectException` 계열, message는 OS마다 다름 | `new Socket(host, port)`와 `connect(endpoint)`는 Java 쪽 기한 없이 OS의 SYN 재전송이 끝날 때까지 기다린다. Linux 기본값은 kernel 문서 기준 약 2분이다 |
| 지정한 connect timeout 초과 | `SocketTimeoutException` | `socket.connect(new InetSocketAddress(host, port), timeoutMillis)`. 실패하면 socket은 닫힌다 |
| 연결 후 응답이 없음 | `SocketTimeoutException` | `setSoTimeout(millis)`를 설정했을 때만 난다. 기본값 0은 무한 대기이고, timeout 뒤에도 socket은 유효하다 |

JDK 21.0.3, macOS 재현에서 앞의 세 경우는 표의 message 그대로였다. message 문자열이 아니라 예외 타입과 발생 단계로 분기한다.

timeout이 없는 외부 호출은 장애를 번지게 한다. 주문 server가 카드 승인 server를 timeout 없이 호출하면 특정 승인 server의 응답 지연이 주문 server의 thread를 계속 점유해 주문 전체 장애로 이어진다. 서비스 간 호출이 많은 MSA에서는 연쇄 장애 가능성이 더 크다. 상대가 느리거나 멈출 수 있다고 가정하고 connect timeout과 read timeout을 모두 설정한다. 재시도와 격리는 [[External-Service-Resilience|외부 service resilience]]에서 다룬다.

## 정상 EOF와 exception을 구분한다

- raw `InputStream.read()`는 peer가 output을 정상 종료해 EOF에 도달하면 `-1`을 반환한다.
- `BufferedReader.readLine()`은 더 읽을 line이 없으면 `null`을 반환한다.
- `DataInputStream.readUTF()`처럼 필요한 record를 끝까지 못 읽은 API는 `EOFException`을 던질 수 있다.
- RST, broken pipe와 connection reset은 보통 `SocketException` 계열로 나타나지만 정확한 message와 시점은 OS에 따라 달라질 수 있다.

FIN을 받았다고 application command가 성공한 것은 아니다. response framing과 business acknowledgment가 완료돼야 한다.

## RST로 끊긴 연결

RST는 연결 상태를 버리고 더 이상 유지하지 않겠다는 신호이며 그 연결은 다시 쓸 수 없다. 흔한 원인은 다음과 같다.

- 상대가 `close()`로 수신 방향까지 닫은 뒤 data가 도착했다. RFC 9293은 close 뒤에 새 data가 오거나 읽지 않은 수신 data가 남은 채 close하면 data 손실을 알리려고 RST를 보내도록 권고한다(SHOULD).
- 상대가 받은 data를 다 읽지 않고 닫았다. JDK 21.0.3 재현에서 server가 client의 요청 byte를 읽지 않은 채 close하자 client의 read는 EOF가 아니라 `Connection reset`이었다.
- 방화벽이나 중간 장비가 연결을 강제로 끊었거나, 이미 사라진 연결로 segment가 도착했다.

FIN을 받은 뒤 계속 data를 보내는 것 자체는 TCP 규칙 위반이 아니다. FIN은 보낸 쪽의 송신 방향만 닫으므로 half-close에서 반대 방향 전송은 정상이다. 같은 재현에서 server가 `shutdownOutput()`만 하면 client는 EOF(`-1`)를 받은 뒤에도 보낸 byte가 server에 정상 수신됐다. RST가 나는 이유는 상대의 full close다.

| 시점 | JDK 21.0.3, macOS에서 본 예외 |
|---|---|
| RST를 받은 뒤 read | `SocketException: Connection reset` |
| RST를 받은 뒤 다시 write | `SocketException: Broken pipe` |
| 내 socket을 `close()`한 뒤 read나 write | `SocketException: Socket closed` |

Javadoc은 연결이 끊긴 것을 감지하면 socket에 buffer된 byte를 버릴 수 있다고 적는다. RST로 끝난 연결에는 받지 못한 data가 있을 수 있다.

대응은 단순하게 수렴시킨다. `SocketException`, `ConnectException`, `EOFException`, `UnknownHostException`은 모두 `IOException` 하위이므로 연결 경계에서 `IOException`을 잡아 원인을 기록하고 자원을 닫는 것으로 정상 종료와 강제 종료를 같은 정리 경로로 모은다. 다르게 동작해야 하는 경우만 세부 타입으로 분기하고, 반복되는 예외는 원인을 찾아 보강한다. 재시도는 연결 성립 전 실패와 전송 도중 reset을 구분한다. 후자는 remote가 이미 operation을 수행했을 수 있다.

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

### session 자원 소유와 block된 thread 깨우기

- 흔한 누수는 read loop가 `EOFException`으로 catch에 빠지면서 뒤에 둔 close 코드를 건너뛰는 경우다. finally나 try-with-resources로 닫는다. finally에서 직접 닫는다면 자원마다 null을 확인해 따로 닫고, close 예외는 기록만 해 다음 close를 막지 않는다. stream을 먼저, socket을 마지막에 닫는다.
- session thread만 자원을 닫는다면 try-with-resources로 충분하다. 생성자로 받은 `Socket`도 Java 9부터 effectively final 변수를 resource로 선언할 수 있다. 하지만 server 종료 thread도 session을 닫아야 하면 자원 수명이 한 try block에 갇히지 않는다. session에 두 번째 호출을 무시하는 멱등 `close()`를 두고(`closed` flag와 동기화), session manager가 add, remove, closeAll을 동기화해 제공한다.
- classic socket의 `accept()`나 read에 block된 platform thread는 `Thread.interrupt()`로 깨어나지 않는다. Javadoc이 interrupt로 깨어나는 경우를 channel 기반 socket과 virtual thread로 한정하며, JDK 21.0.3 재현에서도 interrupt 뒤 platform thread는 계속 block돼 있었다. 같은 read를 하던 virtual thread는 interrupt 즉시 socket이 닫히며 `SocketException: Closed by interrupt`로 깨어났다. interrupt는 중단 가능한 대기에만 반응하는 취소 요청이다([[Java-Concurrency-Primitives#협력적 취소와 종료|협력적 취소와 종료]]). 다른 thread가 `ServerSocket.close()`나 `Socket.close()`를 호출하면 block된 thread가 `SocketException: Socket closed`를 받는다. accept loop와 session loop는 종료 중의 이 예외를 정상 종료 경로로 처리한다.
- hook은 session을 모두 닫은 뒤 `ServerSocket`을 닫는다. hook은 살아 있는 다른 thread와 동시에 실행되고, shutdown sequence가 끝나 JVM이 종료되면 다른 thread의 finally와 try-with-resources도 실행되지 않는다. 고정 시간 sleep으로 session thread의 정리를 기다리기보다 thread join이나 executor 종료를 deadline 안에서 기다리고, Javadoc 권고대로 hook은 빨리 끝낸다.

## chat protocol에서 배우는 framing

예를 들어 `/join`, `/message`, `/users`, `/exit` command를 delimiter로 구분한다면 다음이 protocol contract다.

- charset과 line terminator
- command와 payload escaping
- 최대 line 길이와 최대 connection 수
- 인증 전 허용 command
- unknown command와 malformed input의 응답
- broadcast 중 느린 client가 전체 session을 막지 않게 하는 backpressure

Command pattern은 branching을 객체로 분리하지만 command 수가 적고 변화가 없으면 오히려 간접 비용이 크다. route map과 null object도 실제 extension 압력에 따라 선택한다.

### 양방향 client는 방향별 thread로 나눈다

console 입력을 기다리는 `Scanner.nextLine()`과 server message를 기다리는 `readUTF()`는 둘 다 block된다. thread 하나가 입력을 기다리는 동안에는 도착한 message를 출력하지 못하므로, chat client는 `readUTF()`를 반복해 출력하는 수신 thread와 console 입력을 `writeUTF()`로 보내는 송신 thread를 나누고 socket, stream과 두 thread를 client 객체 하나가 소유한다. server 쪽의 핵심은 session이 받은 message를 session manager가 모든 session에 전파하는 구조다.

- 종료 경로를 하나로 모은다. 수신 thread는 `IOException`(server 종료, reset)에서, 송신 thread는 `IOException`이나 입력 고갈(`NoSuchElementException`)에서 같은 `client.close()`를 부른다. 두 thread가 거의 동시에 부를 수 있으므로 앞 절의 session처럼 `synchronized`와 `closed` flag로 정리를 한 번만 수행한다.
- read에 block된 thread는 종료 flag를 다시 확인하지 못하므로, flag 대신 그 thread가 기다리는 자원을 닫아 깨운다. socket은 이 방식이 동작한다. 다른 thread가 socket을 닫으면 `readUTF()`가 `SocketException`으로 끝난다.
- console 입력은 환경에 따라 다르다. JDK 21.0.3, macOS 재현에서 pipe로 연결된 stdin은 다른 thread가 `System.in.close()`를 호출한 직후 `nextLine()`이 `NoSuchElementException: No line found`로 깨어났다. pseudo-terminal stdin에서는 `System.in.close()` 호출 자체가 block됐고 입력(EOF)이 들어온 뒤에야 둘 다 풀렸다. terminal에서는 lock을 잡은 `close()` 안의 `System.in.close()`가 다른 thread의 종료까지 멈출 수 있다.
- 그래서 입력 thread를 반드시 깨울 수 있다고 가정하지 않는다. socket 정리를 먼저 끝내고, 입력 thread는 daemon으로 두거나 process 종료로 마무리한다. JVM shutdown은 시작된 non-daemon thread가 모두 끝나면 시작되므로 block된 daemon thread는 종료를 막지 않는다. `System.in` 소유 규칙은 [[Java-Byte-and-Character-Streams#콘솔 입력 Scanner와 System.in 소유권|Scanner와 System.in 소유권]]에 있다.

## Node.js와 NestJS로 옮길 때

Node `net.Socket`도 chunk 경계를 message로 보장하지 않는다. `setTimeout()`은 idle event를 발생시킬 뿐 자동으로 connection을 닫지 않으므로 handler에서 정책을 수행한다. NestJS gateway나 WebSocket library를 써도 authentication, payload limit, heartbeat, slow consumer와 graceful shutdown 책임은 남는다.

## 점검 질문

- connect timeout, read idle과 전체 deadline을 구분했는가?
- EOF가 API별로 어떤 signal인지 아는가?
- frame size와 slow client backpressure가 bounded인가?
- graceful drain의 최대 대기 시간과 force-close 조건이 있는가?
- retry 전에 remote가 operation을 수행했을 가능성을 다루는가?
- block된 입력 thread를 깨우지 못해도 정리와 process 종료가 끝나는가?

## 출처

- [Java SE 26, Socket](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/Socket.html)
- [Java SE 26, ServerSocket](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/ServerSocket.html)
- [Java SE 26, ConnectException](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/ConnectException.html)
- [Java SE 26, BindException](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/BindException.html)
- [Java SE 26, UnknownHostException](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/UnknownHostException.html)
- [Java SE 26, Runtime addShutdownHook](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Runtime.html#addShutdownHook(java.lang.Thread))
- [Java SE 26, Runtime](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Runtime.html)
- [Java SE 26, Thread](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Thread.html)
- [Java SE 26, Scanner](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Scanner.html)
- [RFC 9293, Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293)
- [Linux Kernel Documentation, IP Sysctl](https://docs.kernel.org/networking/ip-sysctl.html)
- 김영한 강사, [socket 예제](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244455), [동시 client 처리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244459)
- 김영한 강사, [network 자원 정리 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244465), [자원 정리 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244466), [shutdown hook 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244467), [shutdown hook 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244468)
- 김영한 강사, [연결 예외](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244469), [timeout](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244470), [정상 종료](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244471), [강제 종료](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244472), [network 정리와 문제](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244473)
- 김영한 강사, [chat 설계](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244475), [client](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244476), [server 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244477), [server 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244478), [server 3](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244479), [server 4](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244480), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244481)

## 관련 문서

- [[Java-Network-Fundamentals-and-Sockets|Java 네트워크 기초와 socket]]
- [[External-Service-Resilience|Timeout, Retry와 외부 service resilience]]
- [[Graceful-Shutdown|Graceful Shutdown]]
- [[WebSocket|WebSocket]]
