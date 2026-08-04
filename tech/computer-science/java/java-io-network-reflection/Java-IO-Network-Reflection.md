---
tags: [java, io, network, http, reflection, annotation]
status: index
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java IO Network Reflection", "Java I/O 네트워크 리플렉션"]
---

# Java I/O, 네트워크와 runtime metadata

Java backend의 외부 경계는 byte에서 시작한다. text는 charset으로 byte와 변환되고, stream은 file과 socket을 같은 I/O 추상화로 연결한다. HTTP server는 socket 위에 framing과 routing을 쌓으며, reflection과 annotation은 route metadata를 runtime에 읽는 기반이 된다.

```text
Unicode text <-> Charset <-> byte stream
                              |-> file system
                              |-> TCP socket -> HTTP message
                                                  |-> reflection + annotation routing
```

## 학습 지도

- [[Java-Character-Encoding-and-Charset|문자 인코딩과 Charset]]: Unicode, UTF-8, 명시적 encoding contract
- [[Java-Byte-and-Character-Streams|byte stream과 character stream]]: partial read, buffering, decorator, 자원 수명
- [[Java-IO-Serialization-and-Data-Formats|직렬화와 데이터 형식]]: DataStream, Java serialization, JSON와 schema format
- [[Java-Path-Files-and-Copy|Path, Files와 file copy]]: file metadata, traversal, copy 전략
- [[Java-Network-Fundamentals-and-Sockets|네트워크 기초와 Java socket]]: IP/TCP/UDP/DNS, blocking socket server
- [[Java-Socket-Lifecycle-Timeout-and-Protocol|socket 수명, timeout과 application protocol]]: framing, EOF, FIN/RST, shutdown
- [[Java-HTTP-Server-From-Socket-to-Routing|socket에서 HTTP routing까지]]: parser, thread pool, route table과 운영 한계
- [[Java-Reflection|Java reflection]]: metadata 탐색, 동적 호출, module access 경계
- [[Java-Annotations|Java annotation]]: retention, target, inheritance와 metadata 기반 검증

## 현재 기준으로 바로잡을 것

- JDK 18부터 표준 Java API의 기본 charset은 원칙적으로 UTF-8이지만 console I/O와 외부 protocol은 별도 contract다. 호환성에 기대지 말고 경계에서 charset을 명시한다.
- `java.io.File`은 deprecated가 아니다. 다만 `Path`와 `Files`가 더 풍부한 operation, attribute와 오류 정보를 제공하므로 새 code의 기본 선택에 가깝다.
- Java native deserialization은 신뢰하지 않는 입력에 사용하지 않는다. filter는 방어 수단이지 안전 보증이 아니다.
- 직접 만든 HTTP server는 protocol과 framework 내부를 배우는 교육용이다. production server라면 request limit, timeout, TLS, smuggling 방어, backpressure와 graceful shutdown이 필요하다.
- reflection의 `setAccessible(true)`가 모든 private member를 열어주는 것은 아니다. module이 열려 있지 않으면 접근이 거부될 수 있다.

## 강의 범위

김영한 강사의 강의는 이 문서군의 개념 흐름과 구현 예제를 제공했다.

- [강의 소개](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244398)
- [수업 자료](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244405)
- [강의 소스 코드](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244406): MCP 본문 미제공, 내용을 추정하지 않음
- [다음으로](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244518)

## 공식 기준

- [Java SE 26, java.io](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/package-summary.html)
- [Java SE 26, java.net](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/package-summary.html)
- [Java SE 26, java.lang.reflect](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/reflect/package-summary.html)
- [Java SE 26, java.lang.annotation](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/annotation/package-summary.html)

## 관련 문서

- [[Java-Language-Library-and-IO|Java 표준 라이브러리와 I/O]]
- [[Java-Concurrency-Primitives|Java 동시성 프리미티브]]
- [[HTTP|HTTP]]
- [[Spring-Request-Lifecycle|Spring MVC 요청 생명주기]]
