---
tags: [cs, java, interview, equals, hashcode, string, synchronized, serialization]
status: done
verified_at: 2026-09-03
category: "CS&프로그래밍(CS&Programming)"
---

# Java 백엔드 면접 기초 — I/O, 직렬화, JVM과 로깅

## 6. Blocking vs Non-Blocking I/O

### Thread-per-Request (Tomcat 기본)

- 요청마다 스레드 할당 → I/O 대기 중 스레드가 유휴
- 동시 요청 = 스레드 풀 크기 = 메모리(스레드당 1MB+)
- C10K 이상 부담. CPU는 놀고 스레드 풀은 포화

### Non-Blocking (Netty, WebFlux)

- 이벤트 루프 + 셀렉터(`epoll`/`kqueue`/IOCP)
- 소수 스레드로 수만 커넥션 → **I/O 바운드에 강함**
- 리액티브 체인의 학습, 디버깅 비용은 부담

### Project Loom (가상 스레드, JDK 21+)

- OS 스레드와 1:1 매핑 없이 **수백만 가상 스레드**를 JVM이 스케줄링
- `Thread.startVirtualThread()` — Blocking 코드 그대로 쓰면서 Non-Blocking 효과
- 자세한 논의: [[Async-vs-Threads|async/await vs 스레드]]

## 7. 직렬화(Serialization)

### `Serializable`

- 마커 인터페이스. 구현하면 `ObjectOutputStream`으로 바이트 스트림 변환 가능
- **`serialVersionUID`** 명시 권장 — 없으면 직렬화 런타임이 클래스 구성으로 기본값을 계산한다. 이 계산은 컴파일러 구현 차이에 민감하고 클래스가 바뀌면 `InvalidClassException`으로 역직렬화가 실패할 수 있다
- 보안 위험: 역직렬화 가젯 체인 공격(Jackson/XStream CVE 다수) → **신뢰 없는 입력을 역직렬화하지 말 것**

### JSON, ProtoBuf, Avro

- 현대 백엔드 표준은 대부분 **JSON(Jackson/Gson)** 또는 **ProtoBuf/Avro**(스키마 기반)
- Java 기본 직렬화는 버저닝, 언어 호환성 약함 → 마이크로서비스 간 통신에는 부적합
- 필드 이름, 타입 변경 시의 호환성(하위, 상위)은 스키마 규약으로 관리

## 8. JVM, GC, JIT (다른 문서 포인터)

- **JVM 아키텍처**(ClassLoader, Runtime Data Area, JIT C1/C2, GraalVM): [[JVM-Architecture]]
- **JVM GC**(Young/Old/Metaspace, G1, ZGC, Shenandoah): [[JVM-GC]]
- **GC 알고리즘 이론**(Tri-color Marking, Incremental, Concurrent): [[GC-Algorithm]]
- **JIT 컴파일러**(C1/C2, 인라이닝, 탈출분석): Node.js V8과 개념 유사 → [[V8]]
- **TLAB(Thread Local Allocation Buffer)**: [[V8]]의 TLAB 섹션
- **OOM 대응**(힙 덤프, `-XX:+HeapDumpOnOutOfMemoryError`): [[OOM-Troubleshooting]]과 개념 공유
- **APM 툴**: Pinpoint, NewRelic, Datadog — **Java Bytecode Instrumentation**으로 메서드 진입/종료를 후킹

## 9. `System.out.println` 금지

실무 코드에서 `System.out.println`을 사용하면 안 되는 이유.

- **동기 I/O** — 콘솔 출력이 끝날 때까지 스레드 블로킹, 고트래픽에선 심각한 병목
- **레벨 제어 불가** — 로그 레벨(DEBUG/INFO/WARN/ERROR) 구분이 없어 환경별 필터링 불가
- **포맷, 타임스탬프, 스레드 정보 부재** — 디버깅 메타데이터가 남지 않음
- 해결: SLF4J + Logback/Log4j2로 비동기 Appender 사용

## 출처

- [F-Lab — Java 백엔드 개발자 인터뷰 1편](https://f-lab.kr/blog/java-backend-interview-1)
- [F-Lab — Java 백엔드 개발자 인터뷰 2편](https://f-lab.kr/blog/java-backend-interview-2)
- [Java SE 26, Serializable](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/Serializable.html)

## 관련 문서

- [[Java-Backend-Fundamentals|Java 백엔드 면접 기초]]
- [[Java-Backend-Fundamentals-Object-Concurrency|객체 계약, 문자열, 동시성과 컬렉션]]
- [[Java-Backend-Fundamentals-Value-and-Design|값, 불변성, 타입 설계와 호출 전달]]
