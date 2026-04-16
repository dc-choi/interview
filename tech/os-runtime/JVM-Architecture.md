---
tags: [runtime, jvm, java, classloader, bytecode, jit, runtime-data-area]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["JVM Architecture", "JVM 구조", "ClassLoader", "Runtime Data Area"]
---

# JVM 아키텍처

Java 소스 → `.class` 바이트코드 → JVM이 **ClassLoader로 로드**, **Runtime Data Area에 배치**, **Execution Engine이 해석·JIT 컴파일** → 호스트 OS에서 실행. "Write Once, Run Anywhere"의 실체는 JVM이 플랫폼별로 구현되어 같은 바이트코드를 흡수한다는 점이다. GC는 이 중 Heap 관리 부분만 담당하며 자세한 내용은 [[JVM-GC|JVM GC]].

## 전체 구성

```
[.java] → javac → [.class bytecode]
                        ↓
                  [ClassLoader Subsystem]
                        ↓
                  [Runtime Data Area]
                        ↓
                  [Execution Engine]  ↔  [Native Interface/Library]
                        ↓
                     [OS / CPU]
```

- **ClassLoader**: 바이트코드를 메모리로 불러와 검증·초기화
- **Runtime Data Area**: 로드된 클래스와 실행 상태가 사는 메모리 영역
- **Execution Engine**: 바이트코드를 해석/컴파일하여 CPU 명령으로 수행
- **Native Interface(JNI)**: 네이티브 라이브러리(C/C++) 연동

## ClassLoader Subsystem

### 로딩 3단계

1. **Loading** — `.class` 파일을 읽어 `Class<?>` 객체를 Method Area에 적재
2. **Linking**
   - **Verify** — 바이트코드 검증(스택 오버/언더플로, 타입 규칙 등)
   - **Prepare** — static 필드를 **기본값**으로 초기화(0, null, false)
   - **Resolve** — 심볼릭 참조를 실제 참조로 치환(지연 가능)
3. **Initialization** — `<clinit>` 실행: static 초기화 블록·static 필드 대입

### 로더 계층

| 로더 | 역할 | 위치 |
|---|---|---|
| **Bootstrap ClassLoader** | `java.*` 핵심 클래스 | JVM 내장, 네이티브 |
| **Platform ClassLoader**(Extension, JDK 8 이전) | `java.xml.*`, `java.sql.*` 등 | `jmods` (JDK 9+ 모듈) |
| **Application ClassLoader** | 클래스패스·모듈패스의 앱 클래스 | 사용자 코드 |
| **Custom ClassLoader** | 플러그인·핫리로딩·격리 | 프레임워크(Tomcat·Spring·OSGi) |

### Delegation Model

자식 로더는 **먼저 부모에게** 로딩을 위임. 부모가 못 찾으면 자식이 로드.
- 같은 클래스를 중복 로드하지 않도록 보장
- Java 코어 클래스를 임의 대체할 수 없게 함(보안)
- Tomcat 등은 **부모 위임 역전**으로 웹앱별 라이브러리 격리

### 클래스 동일성

**같은 클래스라도 다른 ClassLoader가 로드하면 다른 타입**. 서로 `ClassCastException`. 이 특성이 핫 스왑·플러그인 시스템의 기초이자 디버깅 함정.

## Runtime Data Area

JVM이 실행 중 사용하는 메모리 영역. GC 대상/비대상, 스레드 공유/스레드별로 구분.

### 스레드 공유 영역

- **Heap** — 객체·배열 인스턴스. **GC 대상**. Young/Old 세대 분리 → [[JVM-GC]]
- **Method Area (Metaspace)** — 클래스 메타데이터·메서드 바이트코드·static 변수·런타임 상수 풀
  - JDK 8+: PermGen 폐지, **Metaspace(네이티브 메모리)** 로 이동
  - 힙과 별도라 `-XX:MaxMetaspaceSize`로 제한 안 걸면 네이티브 메모리 먹음

### 스레드별 영역

- **JVM Stack** — 메서드 호출 프레임(지역변수 배열, 피연산자 스택, 프레임 데이터)
  - 메서드 진입 시 push, 반환 시 pop
  - 크기 한계 초과 시 **StackOverflowError** (무한 재귀·거대 지역 배열)
  - 기본 스레드당 1MB(OS·JVM 설정)
- **PC Register** — 현재 실행 중 바이트코드 명령의 주소
- **Native Method Stack** — JNI로 호출된 네이티브 코드의 스택

## Execution Engine

### 1. Interpreter

바이트코드를 한 줄씩 해석하여 실행. 시작은 빠르지만 반복 실행되는 hot 코드에는 비효율.

### 2. JIT (Just-In-Time) Compiler

자주 실행되는 바이트코드를 **네이티브 기계어로 컴파일**하여 캐시. 이후 호출은 네이티브 속도.

- **C1 (Client Compiler)** — 빠른 컴파일, 가벼운 최적화. 시작 시간 우선
- **C2 (Server Compiler)** — 느리지만 깊은 최적화. 장기 실행 처리량 우선
- **Tiered Compilation** (JDK 7+) — C1로 빠르게 시작 → 핫한 메서드만 C2로 재컴파일
- 주요 최적화: **inlining**, **loop unrolling**, **escape analysis**, **dead code elimination**, **lock coarsening**

### 3. GC (Garbage Collector)

Heap 관리. 자세한 내용은 [[JVM-GC|JVM GC]].

### AOT · GraalVM Native Image

- **AOT(Ahead-of-Time)** — 실행 전 미리 네이티브로 컴파일. JDK 9+ `jaotc` (실험적)
- **GraalVM Native Image** — 바이트코드 + 종속성을 **단일 네이티브 바이너리**로. 기동 수십 ms, 메모리 낮음 → 서버리스·CLI 선호. 반면 동적 리플렉션·동적 클래스 로딩 제약

## 기동 순서 · Lazy Loading

JVM은 **필요한 순간까지 로딩을 미룬다**.
- `main` 클래스만 먼저 로드
- `new`·static 접근·리플렉션 등 **first touch**에 해당 클래스 로드·초기화
- → 초기 기동 빠름, 하지만 "첫 요청이 느린" warmup 현상의 원인

## 네이티브 연동

- **JNI(Java Native Interface)** — C/C++ 함수 호출. 성능·OS API 접근 용도. 메모리 누수·ABI 호환 이슈로 신중
- **Project Panama** (JDK 19+ `java.lang.foreign`) — JNI의 현대적 대체. 정적 안전·성능 개선
- JNA(Java Native Access)·JNR 같은 라이브러리가 JNI를 래핑

## 성능 튜닝 포인트

### 시작 시간

- **Tiered Compilation** 기본 유지(끄면 warm-up 급증)
- **CDS(Class Data Sharing)** / **AppCDS** — 로드된 클래스 메타데이터를 아카이브 → 여러 JVM 인스턴스가 공유
- **GraalVM Native Image** — 서버리스·CLI에서 기동 극단 축소

### JIT 프로파일 유지

- **Warmup 요청** — 배포 직후 일정 요청을 흘려 C2 컴파일 유도
- **Blue-Green 전환 시** 새 인스턴스는 JIT 프로파일이 비어 있음 → 초반 P99 튐

### Metaspace 관리

- 동적 프록시·ClassLoader 누수가 많은 프레임워크는 Metaspace 모니터링 필수
- `-XX:MaxMetaspaceSize`로 상한 두고 OOM으로 조기 감지

### Stack 크기

- `-Xss`로 스레드 스택 조정. 재귀 깊은 앱은 증가, 경량 I/O 다중 스레드는 축소해 메모리 절약

## 모니터링 도구

- **JVisualVM / JConsole** — JMX 기반. 스레드·힙·메모리·MBean
- **Java Flight Recorder (JFR)** — 저오버헤드 상시 프로파일링(JDK 내장)
- **jstack / jmap / jstat** — CLI 진단
- **APM**(Datadog·NewRelic·Pinpoint) — Java Bytecode Instrumentation으로 메서드 후킹

## 흔한 실수

- **ClassLoader 누수** — 웹앱 재배포 시 이전 클래스·인스턴스가 해제 안 되어 Metaspace 폭증(톰캣 고전 문제)
- **동적 프록시 남용** — CGLIB·javassist로 런타임 클래스 폭증
- **ClassLoader 다른 Class로 캐스팅** → 동일 이름인데 `ClassCastException`
- **`-Xss`를 과도히 늘림** → 수만 스레드에서 메모리 초과
- **JIT이 붙지 않는 벤치마크로 성능 판단** — `java -Xcomp` 또는 JMH 같은 제대로 된 도구 필요

## 면접 체크포인트

- JVM의 4대 컴포넌트(ClassLoader·Runtime Data Area·Execution Engine·Native Interface)
- ClassLoader 3단계(Loading·Linking·Initialization)와 Linking의 Verify/Prepare/Resolve
- Delegation Model의 목적과 역전(Tomcat) 사유
- 스레드 공유 영역(Heap·Method Area)과 스레드별 영역(Stack·PC·Native Stack) 구분
- Interpreter + JIT(C1/C2) + Tiered Compilation의 관계
- GraalVM Native Image가 기동 시간을 줄이는 원리와 제약
- "같은 클래스라도 다른 ClassLoader면 다른 타입"이 의미하는 바

## 출처
- [daddyprogrammer — 기술 용어 및 개념 정리](https://daddyprogrammer.org/post/2058/tech-terms-concept/)

## 관련 문서
- [[JVM-GC|JVM GC (Young/Old/Metaspace, Minor vs Full GC, G1·ZGC)]]
- [[GC-Algorithm|GC 알고리즘 이론]]
- [[Java-Backend-Fundamentals|Java 백엔드 면접 기초]]
- [[Compile-and-Runtime|컴파일과 런타임]]
- [[V8|V8 엔진 (JIT · Generational GC)]]
- [[Spring|Spring 개요]]
- [[Servlet-vs-Spring-Container|Servlet Container vs Spring Container]]
