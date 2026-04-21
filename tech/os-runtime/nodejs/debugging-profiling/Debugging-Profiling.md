---
tags: [runtime, nodejs]
status: index
category: "OS & Runtime"
aliases: ["디버깅", "프로파일링"]
---

# 디버깅 & 프로파일링

Node.js 애플리케이션의 문제 진단과 성능 분석을 위한 도구와 기법을 정리한다. 증상(기능 이상/레이턴시/메모리 증가/CPU 과다)에 따라 적절한 도구를 선택하는 것이 핵심이다.

## 목차

1. [[Debugging-Profiling-Tools|도구 선택과 디버깅]] — 진단 도구 선택 가이드, Inspector 기반 디버깅, 원격 디버깅, 라이브 디버깅 워크플로
2. [[Debugging-Profiling-Memory|프로파일링 & 메모리 진단]] — V8 프로파일러, Linux Perf, Heap Snapshot, GC 추적, Flame Graph

## 관련 문서
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Stream|스트림]]
- [[OOM-Troubleshooting|OOM 트러블슈팅]]
- [[Node.js]]
