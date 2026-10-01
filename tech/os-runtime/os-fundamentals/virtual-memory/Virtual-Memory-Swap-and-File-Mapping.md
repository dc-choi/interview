---
tags: [os, memory, swap, mmap, tmpfs]
status: done
verified_at: 2026-10-01
category: "OS&런타임(OS&Runtime)"
aliases: ["스왑과 파일 메모리 매핑"]
---

# 스왑과 파일 메모리 매핑

## 스왑과 지연의 교환

Linux는 익명 페이지를 swap 파일/파티션으로 내보내 여유 RAM을 만들 수 있다. 필요할 때 다시 읽는 swap-in은 저장소 I/O와 대기를 일으킨다. 깨끗한 파일 기반 페이지는 swap에 쓰지 않고 버렸다가 원본에서 다시 읽을 수 있다.

Swap은 순간적인 메모리 초과를 흡수할 수 있지만 OOM 방지를 보장하거나 RAM을 대체하지는 않는다. 지속적인 swap I/O가 응답 시간 요구를 깨면 메모리 증설, 힙 상한과 동시 작업 수 조정이 필요하다. JVM의 큰 힙을 훑는 작업도 페이지 접근 지연의 영향을 받는다. 서비스의 지연 목표와 호스트/컨테이너의 메모리 제한을 먼저 확인한다.

## 페이징 단위와 상주 메모리

Page-in/page-out은 페이지 단위 이동을 가리킨다. Windows의 페이징 파일과 Linux의 swap은 OS별 저장 수단이다. 모든 커널 메모리를 내보낼 수 있는 것은 아니며, 접근 시 fault를 처리할 수 없는 맥락에서 쓰는 메모리는 상주해야 한다.

페이지 크기는 아키텍처와 OS 설정의 계약이다. 4 KiB로 고정하지 말고 Linux에서는 `getconf PAGESIZE` 같은 방법으로 확인한다. 매핑 offset의 정렬과 huge page 여부도 구분한다.

## 파일을 주소 공간에 매핑하기

`mmap()`은 파일의 바이트 범위를 프로세스 가상 주소 공간에 연결한다. 파일 offset은 페이지 크기에 맞게 정렬해야 한다. `MAP_SHARED`의 수정은 공유 매핑과 원본 파일에 반영되는 경로를 가지며, 영속화 시점을 제어하려면 `msync()` 등 해당 API의 계약을 확인한다. `MAP_PRIVATE`는 Copy-on-Write로 변경을 분리하고 파일에 그대로 저장하지 않는다.

파일 매핑과 익명 매핑은 backing이 다르다. 메모리 접근처럼 보여도 첫 접근이나 회수 뒤에는 fault와 저장소 I/O가 발생할 수 있다.

## tmpfs의 용량과 수명

Linux `tmpfs`는 메모리 기반 파일시스템이며 필요하면 페이지를 swap에 내보낼 수 있다. RAM 장치처럼 쓴다고 디스크 I/O가 없는 것으로 가정하지 않는다. 크기와 inode 한도를 정하고 사용량을 감시한다. tmpfs 내용은 unmount하거나 재부팅하면 사라져 영구 저장소가 아니다.

읽기 위주 파일은 이미 page cache의 이득을 받으므로 tmpfs로 옮기기만 하면 더 빨라진다고 단정하지 않는다. 영속성이 필요 없는 임시 쓰기와 실제 부하로 비교한다.

## 출처

- [Linux Kernel, Concepts overview](https://docs.kernel.org/admin-guide/mm/concepts.html)
- [Linux Kernel, Tmpfs](https://docs.kernel.org/filesystems/tmpfs.html)
- [Linux, mmap(2)](https://man7.org/linux/man-pages/man2/mmap.2.html)
- [인프런, 널널한 개발자, RAM 부족해도 살아남는 방법 - 메모리 스왑](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476551)
- [인프런, 널널한 개발자, 가상 메모리 개요](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476544)
- [인프런, 널널한 개발자, 파일 주소 공간과 RAM 드라이브: 고성능 시스템의 핵심 원리](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476554)
- [인프런, 널널한 개발자, Overlay 파일 시스템 구조](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476557)

## 관련 문서

- [[Virtual-Memory-Paging|페이징과 스레싱]]
- [[JVM-Container-Memory|JVM 컨테이너 메모리]]
- [[Storage-and-FileSystem-Files|파일 쓰기와 영속화]]
