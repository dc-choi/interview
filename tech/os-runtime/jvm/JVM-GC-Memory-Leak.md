---
tags: [runtime, jvm, gc, memory-leak, heap-dump, java]
status: done
verified_at: 2026-10-07
category: "OS&런타임(OS&Runtime)"
aliases: ["JVM Memory Leak", "Java 메모리 누수", "unintentional retention", "GC가 막지 못하는 누수"]
---

# JVM 메모리 누수 — GC가 막지 못하는 도달 가능한 객체

GC가 있어도 Java에는 메모리 누수가 생긴다. GC가 해결하는 것은 도달할 수 없게 된 객체의 회수이고, 더 쓰지 않는 객체를 애플리케이션이 계속 참조하는 문제는 GC가 판단하지 못한다. Oracle 문제 해결 가이드도 누수를 애플리케이션이 의도치 않게 Java 객체나 클래스의 참조를 유지해 GC가 회수하지 못하는 상태로 정의한다. 수집기와 heap 구조는 [[JVM-GC]]에 있다.

## 도달 가능성이 회수를 정한다

- 추적형 GC는 GC root에서 참조를 따라 도달할 수 있는 객체를 살리고, 도달할 수 없는 객체만 회수 후보로 삼는다. GC root에는 실행 중인 thread의 stack frame이 가진 지역 변수와 parameter, 클래스의 static field, JNI 참조 등이 있다([[GC-Algorithm]]의 루트 집합).
- root에서 도달할 경로가 없는 객체는 회수 후보가 된다. 서로만 참조하는 순환 구조도 root에서 끊기면 회수될 수 있다. 기준은 참조 횟수가 아니라 도달 경로다([[Call-Stack-Heap#Garbage Collection (V8 GC)|JS 엔진의 같은 원리]]).
- C의 누수는 도달할 수 없게 됐는데 free하지 않은 메모리다. GC는 이 종류를 없앤다. Java의 누수는 더 쓰지 않는데 여전히 도달 가능한 객체가 쌓이는 것(unintentional retention)이고, GC는 이것을 구분하지 못한다.

### null 대입과 실제 회수 시점은 다르다

2026-10-07 Java SE 25의 도달 가능성 정의와 `System.gc()` 계약을 대조했다.

1. `a = null`은 변수 `a`가 가진 참조 하나를 끊는다. 객체를 직접 해제하는 명령이 아니다.
2. 다른 변수나 컬렉션을 통해 그 객체에 강하게 도달할 수 있으면 회수 대상이 되지 않는다. 강한 참조가 없어져도 soft, weak, phantom reference의 처리 규칙을 별도로 고려한다.
3. 회수 가능한 상태와 실제 회수가 끝난 시점은 다르다. `System.gc()`도 JVM에 회수 노력을 요청하는 호출이므로 특정 객체의 즉시 회수를 보장하는 동기화 수단으로 쓰지 않는다.

메모리 누수를 판단할 때는 null을 대입했는지가 아니라 남은 도달 경로와 GC 뒤 live set을 확인한다. 파일과 소켓 해제는 아래의 명시적 자원 정리 규칙을 따른다.

## static이 누수 경로가 되는 방식

static field는 그 클래스와 class loader가 살아 있는 동안 계속 도달 가능하다. 그래서 static에서 이어지는 객체 그래프는 모든 GC를 살아남는다. add만 하는 static List나 Map, 만료 없는 static cache가 static 남용을 실제 누수로 만드는 전형적인 경로다. 요청별 상태는 static 대신 instance와 DI container의 lifecycle로 관리한다([[Java-Language-Class-Members-and-Memory|static 멤버와 메모리]]). 웹앱 재배포 때 class loader 자체가 남아 Metaspace가 늘어나는 경우는 [[JVM-Architecture#흔한 실수|ClassLoader 누수]]다.

## 전형적인 원인

| 원인 | 참조를 붙잡는 경로 | 대응 |
|---|---|---|
| 크기 제한과 만료가 없는 cache | 오래 사는 Map이 key와 value를 계속 참조 | 최대 크기와 TTL을 둔다 |
| 등록만 하고 해제하지 않은 listener, callback | 이벤트 발행자가 구독자 목록을 유지 | 수명이 끝날 때 해제한다 |
| thread pool에서 `remove()` 없이 남긴 ThreadLocal | 재사용되는 thread가 값을 계속 보유 | `finally`에서 `remove()`한다([[Servlet-vs-Spring-Container]]) |
| 오래 사는 non-static inner, 익명 클래스 인스턴스 | 숨은 바깥 인스턴스 참조 | 바깥 상태가 필요 없으면 static nested class([[Java-Standard-Library-Nested-and-Local-Classes]]) |
| 배열 기반 컬렉션에서 제거한 슬롯 | 쓰지 않는 위치에 남은 참조 | 제거한 위치를 null로 지운다([[Java-Generics-and-Collections-Array-and-Linked-List]]) |

닫지 않은 stream과 socket은 heap보다 file descriptor와 native 자원을 먼저 고갈시킬 수 있다. 이런 자원은 GC 시점에 맡기지 말고 try-with-resources로 닫는다([[File-Descriptor-Limit]]).

## 증상과 진단

- old GC 뒤에 남는 live set의 바닥값이 계속 올라가는 톱니 모양이 신호다([[Monitoring-Graph-Reading#메모리|메모리 그래프 읽기]]). GC 빈도와 시간이 늘고 결국 `OutOfMemoryError: Java heap space`가 난다.
- `Java heap space`가 곧 누수라는 뜻은 아니다. 지정했거나 기본으로 정해진 heap 크기가 애플리케이션에 부족한 설정 문제일 수 있다. 오래 실행되는 애플리케이션에서 사용량이 계속 늘 때 누수를 의심한다. finalizer 대기열을 처리하는 thread가 따라가지 못해 같은 오류가 날 수도 있다. finalization은 JDK 18에서 제거 예정으로 deprecated됐다(JEP 421).
- heap dump는 `jcmd <pid> GC.heap_dump filename=heap.hprof`, `jmap -dump:format=b,file=heap.hprof <pid>`, 또는 `-XX:+HeapDumpOnOutOfMemoryError`로 얻는다. 시간 간격을 두고 두 번 이상 떠서 늘어난 객체를 비교하고, 분석 도구에서 retained size가 큰 객체와 GC root까지의 경로(dominator tree, path to GC roots)를 확인한다.
- 장애 중에는 dump를 남기고 재시작으로 시간을 번 뒤 분석한다. dump는 heap만큼 크고 요청 데이터와 secret 같은 민감 정보를 담으므로 저장 위치와 접근을 제한한다.

## 대응 원칙

- cache에는 최대 크기와 만료를 둔다. `WeakHashMap`은 key가 일반 참조로 더 쓰이지 않으면 entry가 사라지게 하는 특수 용도이지 범용 cache가 아니다. value는 강한 참조로 잡히므로 value가 자기 key를 직접이나 간접으로 참조하면 key가 회수되지 않는다.
- null 대입은 오래 사는 객체의 field나 static 컬렉션 슬롯처럼 root에서 계속 도달 가능한 참조를 끊을 때 의미가 있다. 곧 scope를 벗어날 지역 변수에는 보통 필요 없다.
- 수정 뒤에는 같은 부하에서 old GC 후 잔여 heap이 평탄해지는지 확인한다.

## 면접 체크포인트

- GC가 있는데도 Java에 메모리 누수가 생기는 이유
- GC root의 예와 static field가 누수 경로가 되는 방식
- `OutOfMemoryError: Java heap space`만으로 누수를 단정할 수 없는 이유
- heap dump로 누수 원인을 좁히는 순서(두 시점 비교, retained size, GC root 경로)

## 출처

- [Oracle Java SE 25 Docs, java.lang.ref Reachability](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ref/package-summary.html#reachability)
- [Oracle Java SE 25 Docs, System.gc()](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/System.html#gc())
- [Oracle Java SE 25, Troubleshooting Guide, Troubleshoot Memory Leaks](https://docs.oracle.com/en/java/javase/25/troubleshoot/troubleshooting-memory-leaks.html)
- [Oracle Java SE 25 Docs, WeakHashMap](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/WeakHashMap.html)
- [JEP 421 — Deprecate Finalization for Removal (OpenJDK)](https://openjdk.org/jeps/421)
- [인프런, Java 프로그래밍이란?](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13675)
- [인프런, Java 프로그램의 실행 구조](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13678)
- [인프런, 객체와 메모리](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13691)
- [인프런, 패키지와 static](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13693)

## 관련 문서

- [[JVM-GC|JVM GC (heap 구조, 수집기, OOM 패턴)]]
- [[JVM-Container-Memory|JVM 컨테이너 메모리 (used, committed, RSS)]]
- [[GC-Algorithm|GC 알고리즘 이론 (Tri-color Marking)]]
- [[Closure#lifetime과 memory|JS closure의 lifetime과 memory]]
- [[Monitoring-Graph-Reading|모니터링 그래프 읽기]]
