---
tags: [os, jvm]
status: index
category: "OS - JVM"
aliases: ["JVM"]
---

# JVM

JVM 아키텍처, GC 알고리즘, 컨테이너 메모리 — JVM 내부 동작.

## 목차
- [x] [[JVM-Architecture|JVM 아키텍처 (로딩과 초기화 구분, 정의 로더와 타입 동일성, Runtime Data Area, JIT C1/C2, GraalVM)]]
- [x] [[JVM-JIT-and-AOT-Cache|HotSpot JIT 최적화와 AOT 캐시 (추측 최적화와 역최적화, 자동 벡터화, 탈출 분석, AOT 캐시, JDK 26과 27의 기본값 변화)]]
- [x] [[JVM-GC|JVM GC (Young/Old/Metaspace, Minor vs Full GC, G1, ZGC, Shenandoah, pause와 할당 정체 구분)]]
- [x] [[JVM-GC-Memory-Leak|JVM 메모리 누수 (GC root, static과 cache 보유, heap dump 진단)]]
- [x] [[JVM-First-Failure-Diagnosis|JVM 첫 장애 진단 (상시 진단 설정, G1 로그, heap dump와 MAT, hs_err)]]
- [x] [[GC-Algorithm|GC 알고리즘 (Orinoco, Tri-color Marking, Parallel/Incremental/Concurrent, Work Stealing)]]
- [x] [[JVM-Container-Memory|JVM 컨테이너 메모리 (used vs committed, RAMPercentage 함정, G1 uncommit 타이밍, JEP 346)]]
- [x] [[Java-Web|Java 웹 (Servlet 런타임, JSP/SSR, 상태와 JDBC 영속성)]]
