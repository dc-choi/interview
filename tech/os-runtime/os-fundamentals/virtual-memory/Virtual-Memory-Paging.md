---
tags: [os, virtual-memory, paging, segmentation, page-replacement]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["가상 메모리와 페이징", "Paging and Segmentation"]
---

# 가상 메모리와 페이징

## 가상 메모리

프로세스는 물리 메모리 배치를 직접 다루지 않고 자신에게 부여된 가상 주소 공간을 사용한다. 사용 가능한 가상 주소가 0에서 시작한다거나 전체 범위가 매핑된다고 가정할 수는 없으며, null page 보호, ABI, ASLR과 운영체제 정책에 따라 실제 매핑 범위가 달라진다.

- 프로세스는 메모리 관리자를 통해 메모리에 접근
- 메모리 관리자가 가상 주소를 물리 주소로 변환 = **동적 주소 전환**
- 가상 주소 공간 크기는 아키텍처와 운영체제의 주소 폭, 프로세스 ABI와 설정으로 제한된다. 물리 메모리와 swap의 단순 합이 아니다.
- 실제로 접근 가능한 양은 주소 공간 한도뿐 아니라 커밋 정책, 물리 메모리, swap, 파일 매핑과 자원 제한의 영향을 받는다.

## 세그멘테이션

가변 분할 방식을 사용. 프로그램을 함수/모듈 등 세그먼트로 구성.

### 동작 방식
1. CPU가 논리주소를 전달
2. 메모리 관리자가 세그먼트 번호를 알아냄
3. 세그먼트 테이블 베이스 레지스터로 물리 메모리의 세그멘테이션 테이블을 찾음
4. 세그먼트 번호를 인덱스로 **base address**와 segment limit을 확인
5. segment 내부 offset이 `limit` 이상이면 범위를 벗어난 접근으로 fault
6. offset이 limit보다 작고 권한 검사를 통과하면 base + offset으로 주소 계산

다른 주소 공간으로 전환할 때는 주소 변환 관련 레지스터와 상태를 바꿔야 한다. 같은 주소 공간의 스레드 전환은 이를 그대로 공유할 수 있고, 실제 비용과 segmentation 사용 방식은 아키텍처와 운영체제 구현에 따라 다르다.

### 장단점
- 장점: 코드/데이터/힙/스택을 모듈로 나눠 관리 가능, 공유와 메모리 접근 보호가 편리
- 단점: **외부 단편화** 발생

## 페이징

고정 분할 방식을 사용. 외부 단편화 해결을 위해 고안.

### 핵심 개념
- **페이지**: 논리주소공간을 일정 크기로 균일하게 나눈 것
- **프레임**: 물리주소공간을 페이지 크기와 동일하게 나눈 것
- **페이지 테이블**: 페이지 번호 → 프레임 번호 매핑

### 동작 방식
1. CPU가 논리주소를 전달
2. 메모리 관리자가 페이지 번호와 오프셋을 알아냄
3. 페이지 테이블 베이스 레지스터로 페이지 테이블을 찾음
4. 페이지 번호를 인덱스로 프레임 번호를 확인
5. 물리 주소 = 프레임 번호 × 페이지 크기 + 오프셋 (프레임 시작 주소 + 오프셋)
6. present/valid 조건을 만족하지 않으면 page fault가 발생하고, 운영체제가 demand-zero, 파일 매핑, swap, 잘못된 주소 등 원인에 따라 처리

### 세그멘테이션과의 차이

| 비교 | 세그멘테이션 | 페이징 |
|------|-------------|--------|
| 크기 | 가변 (bound 주소 필요) | 고정 (bound 불필요) |
| 단편화 | 외부 단편화 | 마지막 page/frame과 page 크기 선택에서 내부 단편화 가능 |
| 논리 구분 | 세그먼트 자체가 논리 영역을 표현 | 페이지 자체에는 의미가 없지만 OS가 mapping과 region으로 코드/데이터/힙 등을 구분 |
| 공유/권한 | 논리 세그먼트 단위로 표현하기 쉬움 | 현대 MMU에서 페이지 단위 공유와 권한 설정 가능 |

### 페이지 테이블 크기 문제
- 프로세스마다 페이지 테이블을 가지므로 프로세스가 많을수록 메모리 사용 증가
- 페이지 테이블은 물리 메모리와 커널 회계 자원을 소비한다. 계층형 table은 mapping이 없는 큰 가상 주소 구간의 하위 table을 만들지 않아 비용을 줄인다.

## 페이지드 세그멘테이션

세그멘테이션 + 페이징의 장점을 결합.

### 동작 방식
1. 가상주소를 세그먼트 번호와 segment 내부 offset으로 나눔
2. 메모리 접근 권한(읽기/쓰기/실행) 검사 → 위반 시 protection fault를 발생시키고 운영체제가 처리. 복구, 사용자 공간 신호 전달 또는 프로세스 종료 여부는 원인과 처리기에 따라 달라짐
3. segment table entry에서 해당 segment page table의 base와 limit을 얻고 segment offset 범위를 검사
4. segment offset을 page number와 page offset으로 나눠 page table에서 frame을 찾은 뒤 물리 주소 계산

### 메모리 접근 권한

| 영역 | 읽기 | 쓰기 | 실행 |
|------|------|------|------|
| 코드 | O | X | O |
| 데이터 | O | O/X | X |
| 스택/힙 | O | O | X |

주소 변환 정보가 TLB에 없으면 다단계 page-table walk로 여러 메모리 접근이 필요할 수 있다. TLB hit에서는 이 walk를 생략한다. 현대 64비트 범용 OS는 대체로 paging을 중심으로 주소 변환과 페이지 단위 보호, 공유를 구현하며 segmentation 사용 방식은 아키텍처별로 다르다.

## 디맨드 페이징

많은 workload는 실행 시간과 메모리 참조가 일부 코드와 데이터에 집중되는 지역성을 보이지만 90:10 같은 비율은 경험적 설명일 뿐 모든 프로그램의 고정 법칙이 아니다.

### 지역성 이론
- **공간의 지역성**: 현재 위치에서 가까운 데이터에 접근할 확률이 높음
- **시간의 지역성**: 최근 접근한 데이터에 다시 접근할 확률이 높음
- 제어 흐름과 데이터 배치가 지역성에 영향을 줄 수 있지만 `goto` 사용 자체가 cache locality 위반을 뜻하지는 않는다. 구조적 제어 흐름을 권장하는 주된 이유는 가독성과 검증 가능성이다.

Demand paging은 가상 페이지를 실제로 접근할 때 page fault를 통해 물리 메모리에 적재하는 방식이다. 미리 조만간 쓸 페이지를 판단해 올리는 정의가 아니며, 회수되는 페이지도 모두 swap으로 이동하지 않는다. 깨끗한 파일 기반 페이지는 버렸다가 원본에서 다시 읽을 수 있고 익명 또는 수정 페이지는 조건에 따라 swap이나 writeback이 필요하다.

### 페이지 테이블 엔트리 (PTE) 구성

| 비트 | 역할 |
|------|------|
| 접근 비트 | 메모리에 올라온 뒤 읽기, 쓰기 또는 실행 참조가 있으면 설정될 수 있음. 정확한 동작은 아키텍처와 OS에 따라 다름 |
| 변경 비트 | 메모리에 올라온 후 쓰기 작업이 있었으면 1 |
| present/valid 비트 | 보통 현재 매핑이 유효하고 물리 메모리에 resident인지 나타냄. 정확한 비트 의미는 아키텍처와 OS에 따라 다름 |
| 권한 비트 | 읽기/쓰기/실행 접근 권한 검사 |

### Page Fault
- 주소 변환이나 접근 권한을 즉시 만족할 수 없을 때 CPU가 발생시키는 동기 예외다.
- 원인은 demand-zero, 파일 매핑, Copy-on-Write, swap-in, 권한 위반 등 다양하다. 모든 page fault가 swap I/O를 일으키지는 않는다.
- 디스크 I/O가 필요한 major fault에서는 task가 대기할 수 있다. demand-zero나 Copy-on-Write 같은 minor fault는 I/O 없이 처리할 수 있고, 권한 위반이나 잘못된 주소는 시그널과 종료로 이어질 수 있다.

### 대표 참조 시나리오
1. **resident mapping**: PTE와 TLB를 통해 물리 frame에 접근
2. **demand-zero/Copy-on-Write**: OS가 새 frame을 할당하거나 공유 page를 복사해 I/O 없이 복구
3. **file-backed/swap-backed**: 필요한 page를 파일 또는 swap에서 읽으며 task가 대기할 수 있음. clean file-backed page는 버렸다가 원본 파일에서 다시 읽을 수 있음
4. **unmapped/protection violation**: 합법적인 mapping이 아니면 복구하지 못하고 프로세스에 fault 신호 전달

## 페이지 교체 정책

정책별 동작, 계산 예와 근사 LRU는 [[Virtual-Memory-Page-Replacement#페이지 교체 정책|페이지 교체와 워킹셋]]에 정리한다.

### Optimum

미래 참조를 아는 비교 기준이며 실제 online 정책과 구분한다. [[Virtual-Memory-Page-Replacement#Optimum|상세 설명]]을 참고한다.

## 스레싱과 워킹셋

워킹셋 경쟁과 회수 지연, RAM 증설의 판단은 [[Virtual-Memory-Page-Replacement#스레싱과 워킹셋|스레싱과 워킹셋]]에 정리한다.

### 주소 변환과 회수의 확인 예

페이지 크기 4096바이트, 가상 주소 5000이면 페이지 번호는 1, 오프셋은 904다. 페이지 1이 프레임 3에 매핑되었다면 물리 주소는 `3 × 4096 + 904 = 13192`다. 세그멘테이션의 base는 바이트 주소이고 페이징의 프레임 번호는 순번이라 식이 다르다.

합법적인 접근의 page fault를 처리하려는데 여유 프레임이 부족하면 OS가 회수를 수행한다. 깨끗한 파일 페이지는 버리고 다시 읽을 수 있으며 익명/dirty 페이지에는 swap이나 writeback이 필요할 수 있다. 이후 mapping/PTE와 필요한 TLB 상태를 갱신하고 접근을 재개한다. 모든 fault를 swap-in으로 설명하지 않는다.

동시에 필요한 워킹셋이 메모리보다 커 스레싱이 난다면 RAM 증설이 임계점을 늦출 수 있다. 반면 작업에 충분한 RAM이 있는데도 저장소나 CPU가 병목이면 증설만으로 해결되지 않는다. resident 크기뿐 아니라 회수와 fault, swap I/O를 함께 확인한다.

## 관련 문서
- [[Virtual-Memory-Allocation|메모리 개요와 할당 방식]]
- [[Virtual-Memory|가상 메모리 (인덱스)]]
- [[Concurrency-and-Process|동시성과 프로세스]]
- [[Context-Switching|컨텍스트 스위칭과 CPU 스케줄링]]

## 출처

- 인프런, 널널한 개발자 강사, [가상 메모리 소개](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128257)
- 인프런, 감자 강사, [가상메모리 개요](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100834), [세그멘테이션](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100835), [페이징](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100836), [페이지드 세그멘테이션](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100837)
- 인프런, 감자 강사, [디맨드 페이징](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100838), [페이지 교체정책](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100839), [스레싱과 워킹셋](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100840)
- [Linux kernel page tables](https://docs.kernel.org/mm/page_tables.html)
- [Linux kernel page table checks](https://docs.kernel.org/mm/page_table_check.html)
- [Linux kernel memory management concepts](https://docs.kernel.org/admin-guide/mm/concepts.html)
- [Operating Systems: Three Easy Pieces, page replacement policy](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf)
- [Operating Systems: Three Easy Pieces, segmentation](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-segmentation.pdf)
- [Operating Systems: Three Easy Pieces, paging](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf)
