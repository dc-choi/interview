---
tags: [os, concurrency, process, kernel, synchronization]
status: index
category: "OS&런타임(OS&Runtime)"
aliases: ["동시성과 프로세스"]
---

# 동시성과 프로세스

운영체제 개요부터 동시성, 원자성, 동기화, 교착상태, IPC까지 프로세스 기반 병행성의 핵심 주제를 다룬다.

## 하위 문서
- [[Concurrency-and-Process-Overview|OS 개요와 동시성]] — 운영체제 개요, 커널/유저 모드, 프로세스 메모리 구조, 단편화, 지역성
- [[Concurrency-and-Process-IPC|원자성, 동기화, IPC]] — 경쟁 조건과 count++ 인터리빙, 임계구역 문제와 세 해결 조건, 인터럽트 비활성화의 한계, 스레드 안전성 확인, 동기화 용어 구분, IPC 선택 기준, 파일 잠금, 이벤트 루프의 논리적 경쟁
- [[Concurrency-and-Process-Synchronization|동기화 도구: 스핀락, 뮤텍스, 세마포어]] — test-and-set과 스핀락의 비용, 뮤텍스 대기 큐와 wakeup/waiting race, 세마포어 초기값과 순서 제어, 뮤텍스와 binary semaphore 차이, 우선순위 역전과 상속
- [[Concurrency-and-Process-Monitor|모니터와 condition variable]] — entry queue와 waiting queue, Mesa와 Hoare 의미론, bounded buffer와 while 재검사, Java monitor와 Condition
- [[Concurrency-and-Process-Deadlock|교착상태, 라이브락, 기아]] — 필요조건, 식사하는 철학자, 네 가지 처리 전략과 조건별 예방 비용, 은행원 알고리즘, 검출과 복구 방법, 코드의 lock 순서 교착상태와 thread dump 진단

## 관련 문서
- [[Process-Lifecycle|프로세스 생명주기]]
- [[Context-Switching|컨텍스트 스위칭과 CPU 스케줄링]]
- [[Virtual-Memory|가상 메모리]]
- [[Storage-and-FileSystem|기억장치와 파일시스템]]
