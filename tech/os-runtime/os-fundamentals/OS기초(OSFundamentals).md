---
tags: [os, fundamentals]
status: index
category: "OS - 기초"
aliases: ["OS Fundamentals"]
---

# OS 기초(OS Fundamentals)

프로세스, 동시성, 파일시스템, 가상 메모리, 컨텍스트 스위칭 — OS의 기본 개념.

## 동시성 & 프로세스
- [x] [[Concurrency-and-Process|동시성과 프로세스 (커널, 동기화, 모니터, 데드락, IPC)]]
- [x] [[Concurrency-and-Process-Overview|동시성과 프로세스 — Overview]]
- [x] [[Concurrency-and-Process-IPC|원자성, 임계구역 문제, 프로세스 간 통신 (IPC)]]
- [x] [[Concurrency-and-Process-Synchronization|동기화 도구 (test-and-set, 스핀락, 뮤텍스, 세마포어, 우선순위 역전)]]
- [x] [[Concurrency-and-Process-Monitor|모니터와 condition variable (Mesa와 Hoare 의미론, bounded buffer, Java monitor)]]
- [x] [[Concurrency-and-Process-Deadlock|교착상태, 라이브락, 기아 (식사하는 철학자, 조건별 예방 비용, 은행원 알고리즘, 검출과 복구, 코드 교착상태 진단)]]
- [x] [[Concurrency-vs-Parallelism|동시성, 병렬성 (구조 vs 실행, Actor/CSP 채널, 런타임별 선택, 스레드 수와 Amdahl의 법칙)]]

## 프로세스 & 스케줄링
- [x] [[Process-Lifecycle|Process lifecycle (PCB, 상태 전이, 시스템 콜과 인터럽트 흐름, fork/exec, 좀비, 쓰레드, 컴파일)]]
- [x] [[Thread-Models|스레드 종류와 스레딩 모델 (멀티프로그래밍부터 멀티프로세싱까지, 하드웨어 스레드와 SMT, OS 스레드, 1:1, N:1, M:N, 그린 스레드와 virtual thread)]]
- [x] [[Context-Switching|Context switching (수행 주체, CPU와 I/O 버스트, 스케줄러와 디스패처, 선점과 비선점, 스케줄링 목표)]]
- [x] [[Context-Switching-Scheduling-Algorithms|CPU 스케줄링 알고리즘 (FIFO, SJF, SRTF, 우선순위, RR, 다단계 큐, MLFQ, 에이징)]]
- [x] [[System-Time-and-Clock-Sync|시스템 시간과 시계 동기화 (Unix time, FILETIME, 윤초, 2038년, NTP 지연과 오프셋, 분산 시스템 시각, tz database)]]
- [x] [[Sleep-and-Timing|Sleep과 타이밍 (대기와 준비 전이, 타이머 해상도, 단조 증가 카운터, sleep 기반 동기화의 경쟁 상태, 지터와 난수)]]

## 메모리 & 스토리지
- [x] [[Stack-vs-Heap|스택 vs 힙 (수명, LIFO 한계, 스레드 공유, C 저장 기간, 스택 소진과 버퍼 오버플로, 메모리 풀, 파편화, GC 컴팩션)]]
- [x] [[Virtual-Memory|Virtual memory (세그멘테이션, 페이징, 디맨드 페이징, 페이지 교체)]]
- [x] [[Virtual-Memory-Allocation|Virtual Memory — 할당]]
- [x] [[Virtual-Memory-Paging|Virtual Memory — 페이징]]
- [x] [[Storage-and-FileSystem|기억장치와 파일시스템 (HDD, SSD, 파일시스템, RAID)]]
- [x] [[Storage-and-FileSystem-Devices|저장 장치와 주변장치]]
- [x] [[Storage-and-FileSystem-Files|파일시스템 구조]]
- [x] [[Storage-and-FileSystem-Performance|디스크 접근 시간과 RAID]]
