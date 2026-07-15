---
tags: [os, storage, filesystem, directory]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["파일시스템 구조", "FAT와 디스크 할당"]
verified_at: 2026-07-15
---

# 파일시스템 구조

## 파일시스템

### FAT(FileAllocationTable)
- 파일의 위치를 알려주는 테이블
- FAT는 특정 파일시스템 계열의 자료구조다. 모든 파일시스템이 FAT를 쓰는 것은 아니며 NTFS, APFS, ext4는 각자 다른 메타데이터 구조와 할당 방식을 사용한다.

### 파일삭제와복원
- 일반 삭제는 파일 데이터 블록을 즉시 덮어쓰지 않고 디렉토리 엔트리, inode, 할당 비트맵 같은 메타데이터를 갱신해 공간을 재사용 가능 상태로 만든다.
- 복원 가능성은 파일시스템, 저널링, TRIM, 이후 쓰기 여부에 따라 달라진다.

### 부팅 레이아웃
- 레거시 BIOS/MBR에서는 디스크 첫 섹터의 MBR 부트 코드를 실행한다.
- UEFI 시스템은 NVRAM의 `BootOrder`가 가리키는 UEFI 실행 파일을 로드한다. 따라서 모든 시스템이 MBR 부트로더를 거친다고 일반화하면 안 된다.

### 포맷
- 저장장치에 선택한 파일시스템의 메타데이터 구조를 초기화하는 작업. FAT 계열은 FAT를 만들고, ext4는 superblock, inode와 block bitmap 같은 자체 구조를 만든다.
- **빠른 포맷**: 파일시스템 메타데이터를 새로 만들고 기존 데이터 영역은 보통 그대로 둠
- **느린 포맷**: 전체 영역 검사나 0 쓰기를 수행할 수 있어 데이터 복구 가능성을 낮춤. OS와 옵션에 따라 동작이 다름

## 파일시스템 상세

### 파일 메타데이터와 파일 디스크립터
- 파일 내용과 메타데이터의 저장 방식은 파일시스템마다 다르다. ext4 같은 inode 기반 파일시스템은 이름을 디렉터리 엔트리에, 권한, 크기, 블록 포인터를 inode에, 실제 내용을 데이터 블록에 둔다.
- Unix 계열의 파일 디스크립터는 프로세스별 파일 디스크립터 테이블의 비음수 정수 인덱스다.
- 파일 디스크립터는 커널의 open file description 또는 file object를 참조하고, 그 객체가 dentry와 inode로 이어진다. 파일 디스크립터 자체가 디스크에 저장되는 파일 컨트롤 블록은 아니다.

### 파일 구조 종류

| 구조 | 설명 | 장점 | 단점 |
|------|------|------|------|
| 순차 파일 | 데이터가 순차적으로 저장 (카세트테이프) | 공간 낭비 없음, 구조 단순 | 특정 지점 이동 어려움, 삽입/수정/삭제 느림 |
| 직접 파일 | 해시 함수로 레코드 저장 위치 결정 | 데이터 접근이 빠름 | 해시 함수 선정 중요, 저장 공간 낭비 가능 |
| 인덱스 파일 | 위 두 가지 장점을 결합 (재생 목록) | 순차 접근 + 인덱스로 직접 접근 | 인덱스 관리 오버헤드 |

## 디렉토리

- 관련 파일을 하나로 묶기 위해 등장. 자식 디렉토리를 가질 수 있음
- 디렉토리도 파일이지만 파일 데이터 대신 **파일 정보**를 담고 있음
- `.`: 현재 디렉토리 / `..`: 상위 디렉토리 (루트는 둘 다 자기 자신)
- 최상위: Unix `/`, Windows `C:\`
- 기본 디렉토리 계층은 트리 구조다. 하드 링크는 보통 디렉토리에 금지되고, 심볼릭 링크나 바로가기가 경로 순환처럼 보이는 구조를 만들 수 있다.

## 파일과 디스크

디스크 공간을 일정한 크기의 **블록**(1~8KB)으로 나누고 주소를 할당하여 관리.

### 연속 할당
- 블록을 디스크에 연속적으로 저장. 파일의 시작만 알면 전체 블록을 찾을 수 있음

### 불연속 할당 — 연결 할당
- 각 블록이 다음 블록 위치를 가리키는 연결 구조를 사용한다. FAT 계열은 이 연결 정보를 별도 테이블에 둔다.

### 불연속 할당 — 인덱스 할당 (I-Node)
- inode가 파일 메타데이터와 데이터 블록 포인터를 가진다.
- 직접 포인터, 단일/이중/삼중 간접 포인터를 활용해 작은 파일과 큰 파일을 함께 처리한다.
- Unix에서 **I-Node**라는 이름으로 사용

### 블록 크기 트레이드오프
- 작으면 → 관리할 블록 수 증가
- 크면 → 내부 단편화 발생

### 여유 공간 관리
- 파일시스템은 bitmap, free-space tree, list 등 설계에 맞는 구조로 빈 블록을 추적한다.
- 일반 삭제는 디렉토리 엔트리, inode, 할당 메타데이터를 갱신해 공간을 재사용 가능 상태로 만든다.
- 복원 가능성은 파일시스템, 저널링, TRIM, 이후 쓰기 여부에 따라 달라진다.

## 출처

- [exFAT File System Specification — Microsoft](https://learn.microsoft.com/en-us/windows/win32/fileio/exfat-specification)
- [ext4 Data Structures and Algorithms — Linux Kernel 공식 문서](https://docs.kernel.org/filesystems/ext4/index.html)
- [UEFI Boot Manager — UEFI Specification](https://uefi.org/specs/UEFI/2.11/03_Boot_Manager.html)
- [open(2) — Linux manual page](https://www.man7.org/linux/man-pages/man2/open.2.html)
- [Overview of the Linux Virtual File System — Linux Kernel 공식 문서](https://docs.kernel.org/filesystems/vfs.html)

## 관련 문서
- [[Storage-and-FileSystem|기억장치와 파일시스템 (목차)]]
- [[Storage-and-FileSystem-Devices|저장 장치와 주변장치]]
- [[Storage-and-FileSystem-Performance|디스크 접근 시간과 RAID]]
- [[Linux-File-System|리눅스 파일 시스템]]
