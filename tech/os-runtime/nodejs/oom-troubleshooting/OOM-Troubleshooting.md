---
tags: [runtime, nodejs, memory, troubleshooting]
status: index
category: "OS & Runtime"
aliases: ["OOM Troubleshooting", "Node.js OOM", "메모리 부족"]
---

# Node.js OOM 트러블슈팅

Node.js 프로세스의 메모리 실패는 하나가 아니다. V8 힙에서 회수할 공간이 없어 종료되는 경우, 네이티브 또는 외부 메모리 할당이 실패하는 경우, 컨테이너와 운영체제의 메모리 압박으로 프로세스가 종료되는 경우를 분리해 진단한다.

## 목차

1. [[OOM-Troubleshooting-Cases|힙 이해와 발생 케이스]] — V8 힙, 외부 메모리와 cgroup 종료의 구분, 대표 누수와 백프레셔 케이스
2. [[OOM-Troubleshooting-Response|대응 방법 & 면접 포인트]] — 증거별 진단, 메모리 예산, 스트림 전환과 모니터링

## 관련 문서
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Stream|스트림]]
- [[Backpressure|배압]]
- [[Debugging-Profiling|디버깅 & 프로파일링]]
