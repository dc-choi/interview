---
tags: [os, memory, swap, mmap, tmpfs]
status: done
verified_at: 2026-11-17
category: "OS&런타임(OS&Runtime)"
aliases: ["스왑과 파일 메모리 매핑", "이중 매핑 링 버퍼", "Double-Mapped Ring Buffer"]
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

## 같은 페이지를 두 번 매핑하는 링 버퍼

링 버퍼는 끝에 닿으면 처음으로 돌아가 메모리를 다시 쓴다. 그래서 끝에 걸친 레코드는 뒤쪽 조각과 앞쪽 조각으로 나뉘고, 읽고 쓰는 쪽은 두 조각을 복사해 잇거나 나뉜 경우를 따로 처리해야 한다. 가상 메모리는 같은 물리 페이지를 여러 가상 주소에 연결할 수 있으므로, 데이터 영역을 가상 주소 공간에 연달아 두 번 매핑하면 이 처리가 필요 없어진다. 마지막 데이터 페이지 다음 주소가 다시 첫 데이터 페이지라서 끝을 넘겨 읽어도 레코드가 연속으로 보인다. 이 문서는 커널 주석의 표현(double-mapped)을 따라 이 배치를 이중 매핑이라 부른다.

Linux의 BPF 링 버퍼(`BPF_MAP_TYPE_RINGBUF`)가 이 방식을 쓴다. 크기가 2의 거듭제곱인 원형 버퍼이고 각 데이터 페이지가 두 번 매핑된다. 커널 안에서도, 사용자 공간이 `mmap()`한 영역에서도 같은 배치라 생산자와 소비자의 구현이 함께 단순해진다(커널 문서와 `kernel/bpf/ringbuf.c`의 주석, 2026-11-17 확인).

- 물리 메모리는 한 벌이고 가상 주소 범위만 데이터 영역의 두 배를 쓴다(`bpf_ringbuf_area_alloc()`이 데이터 페이지를 한 번만 할당해 페이지 배열에 두 번 넣고 `vmap()`한다).
- BPF 링 버퍼는 `max_entries`가 2의 거듭제곱이 아니거나 페이지 크기에 정렬돼 있지 않으면 생성을 거부한다(`ringbuf_map_alloc()`). 매핑이 페이지 단위이므로 이 기법을 쓰는 다른 버퍼도 크기가 페이지 크기의 배수여야 한다(뒤 문장은 이 문서의 해석).
- 이중 매핑을 써도 시작 위치는 비트 마스크로 구하고(`rb->mask`), 없어지는 것은 끝에 걸친 레코드를 나누는 처리다. 마스크 계산은 [[Low-Latency-Audio#단일 생산자, 단일 소비자 링 버퍼|단일 생산자, 단일 소비자 링 버퍼]]에 있다.

## tmpfs의 용량과 수명

Linux `tmpfs`는 메모리 기반 파일시스템이며 필요하면 페이지를 swap에 내보낼 수 있다. RAM 장치처럼 쓴다고 디스크 I/O가 없는 것으로 가정하지 않는다. 크기와 inode 한도를 정하고 사용량을 감시한다. tmpfs 내용은 unmount하거나 재부팅하면 사라져 영구 저장소가 아니다.

읽기 위주 파일은 이미 page cache의 이득을 받으므로 tmpfs로 옮기기만 하면 더 빨라진다고 단정하지 않는다. 영속성이 필요 없는 임시 쓰기와 실제 부하로 비교한다.

## 출처

- [Linux Kernel, Concepts overview](https://docs.kernel.org/admin-guide/mm/concepts.html)
- [Linux Kernel, Tmpfs](https://docs.kernel.org/filesystems/tmpfs.html)
- [Linux, mmap(2)](https://man7.org/linux/man-pages/man2/mmap.2.html)
- [Linux Kernel, BPF ring buffer](https://docs.kernel.org/bpf/ringbuf.html)
- [kernel/bpf/ringbuf.c — Linux kernel source](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/kernel/bpf/ringbuf.c) — `bpf_ringbuf_area_alloc()`의 이중 매핑 주석과 `ringbuf_map_alloc()`의 크기 검사, 2026-11-17 master 트리 확인
- [인프런, 널널한 개발자, RAM 부족해도 살아남는 방법 - 메모리 스왑](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476551)
- [인프런, 널널한 개발자, 가상 메모리 개요](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476544)
- [인프런, 널널한 개발자, 파일 주소 공간과 RAM 드라이브: 고성능 시스템의 핵심 원리](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476554)
- [인프런, 널널한 개발자, Overlay 파일 시스템 구조](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476557)

## 관련 문서

- [[Virtual-Memory-Paging|페이징과 스레싱]]
- [[JVM-Container-Memory|JVM 컨테이너 메모리]]
- [[Storage-and-FileSystem-Files|파일 쓰기와 영속화]]
- [[Low-Latency-Audio|저지연 오디오]]
