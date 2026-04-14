---
tags: [runtime, nodejs, memory, troubleshooting]
status: index
category: "OS & Runtime"
aliases: ["OOM Troubleshooting", "Node.js OOM", "메모리 부족"]
---

# Node.js OOM 트러블슈팅

Node.js의 OOM(Out Of Memory)은 **V8 엔진이 할당받은 힙 메모리가 한계치에 도달했을 때** 발생한다. 시스템 메모리가 남아 있어도 V8 힙 상한을 넘으면 프로세스가 즉시 죽는다.

## 목차

1. [[OOM-Troubleshooting-Cases|힙 이해와 발생 케이스]] — V8 힙 상한선, 4가지 대표 OOM 케이스 (일괄 로드, 누수, 스트림 미사용, 백프레셔)
2. [[OOM-Troubleshooting-Response|대응 방법 & 면접 포인트]] — 스트림 전환, 힙 덤프, 외부 캐시, 인프라 정렬, 모니터링, 면접 Q&A

## 관련 문서
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Stream|스트림]]
- [[Backpressure|배압]]
- [[Debugging-Profiling|디버깅 & 프로파일링]]
