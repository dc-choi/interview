---
tags: [java, network, socket, tcp, http, routing]
status: index
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Network and HTTP", "Java 네트워크와 HTTP"]
---

# Java 네트워크와 HTTP

TCP는 message가 아니라 byte stream을 전달한다. IP, TCP/UDP와 DNS가 무엇을 보장하고 무엇을 남기는지 정리한 뒤, connect와 read, protocol idle, shutdown의 서로 다른 deadline을 나누고, 그 위에 HTTP framing과 routing을 직접 쌓아 framework가 숨긴 계층을 확인한다.

- [[Java-Network-Fundamentals-and-Sockets|네트워크 기초와 Java socket]]: IP/TCP/UDP/DNS의 계층별 책임, blocking socket server와 concurrency model 선택
- [[Java-Socket-Lifecycle-Timeout-and-Protocol|socket 수명, timeout과 application protocol]]: connect/read/idle timeout 분리, 정상 EOF와 FIN/RST, shutdown sequence, chat protocol framing
- [[Java-HTTP-Server-From-Socket-to-Routing|socket에서 HTTP routing까지]]: parser, thread pool, route table과 운영 한계

## 함께 볼 문서

- [[Java-IO-Network-Reflection|Java I/O 네트워크 리플렉션]]
