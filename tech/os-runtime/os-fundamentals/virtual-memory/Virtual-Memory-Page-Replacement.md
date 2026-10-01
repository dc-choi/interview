---
tags: [os, memory, page-replacement, thrashing]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["페이지 교체와 워킹셋"]
---

# 페이지 교체와 워킹셋

## 페이지 교체 정책

### Random
- 무작위 선택. 구현은 단순하지만 지역성을 반영하지 않아 활성 page를 고를 수 있다.

### FIFO
- 메모리에 들어온 지 가장 오래된 페이지를 교체
- 구현이 간단하고 성능도 괜찮아 변형해서 많이 사용
- 단점: 자주 쓰이는 페이지가 먼저 들어왔다는 이유로 교체될 수 있음
- **빌레이디의 역설**: 프레임을 늘렸는데 Page Fault가 증가할 수 있는 현상. FIFO가 대표 사례지만 FIFO에만 한정되지 않으며, stack property가 없는 교체 알고리즘에서 발생할 수 있다. LRU와 optimal 같은 stack algorithm에서는 발생하지 않는다.

### Optimum
- 앞으로 가장 오랫동안 참조되지 않을 페이지를 선택. 실제 실행 중에는 미래의 참조 순서를 알 수 없어 온라인 교체 정책으로 구현할 수 없음
- 다른 알고리즘과 성능 비교 시 참조용

### LRU (Least Recently Used)
- 마지막 참조 시점이 가장 오래된 페이지를 선택. 참조 패턴에 시간 지역성이 있으면 Optimum에 근접한 성능을 낼 수 있음
- 단점: 정확한 LRU는 모든 참조 순서를 추적해야 하므로 구현 비용이 큼
- 실제 구현 시 접근 비트를 사용하여 LRU에 근접하게 구현

### Clock (클락 알고리즘)
- LRU를 접근 비트 하나만으로 근사 구현
- 페이지를 원형으로 연결하고 **클락 핸드**(포인터)가 시계 방향으로 이동
- 페이지가 참조되면 하드웨어나 운영체제가 접근 비트를 1로 설정
- Page Fault 발생 시:
  - 핸드가 가리킨 페이지의 접근 비트가 1이면 0으로 지우고 다음 페이지를 검사
  - 접근 비트가 0이면 교체 대상으로 선택
- 교체 대상이 항상 swap으로 기록되는 것은 아니다. 깨끗한 파일 기반 페이지는 버리고 원본에서 다시 읽을 수 있고, 수정된 페이지나 익명 페이지는 상태에 따라 writeback 또는 swap이 필요하다

### Enhanced Clock (향상된 클락)
- 접근 비트 + 변경 비트를 함께 확인
- 교체 우선순위: (접근=0, 변경=0) > (접근=0, 변경=1) > (접근=1, 변경=0) > (접근=1, 변경=1)

### 2차 기회 페이지 교체 (FIFO 개선)
- FIFO 방식에서 자주 사용되는 페이지에 한 번 더 기회를 줌
- 페이지 접근 시 참조 비트를 1로 설정한다. 교체 스캔에서 큐 앞 페이지의 비트가 1이면 비트를 0으로 지우고 뒤로 보내며, 비트가 0인 페이지를 교체한다
- 성능은 참조 패턴과 구현 비용에 따라 달라진다. 2차 기회는 낮은 메타데이터 비용으로 최근 참조를 반영하는 근사 정책이다.

하드웨어 접근 비트가 없더라도 소프트웨어 fault, 샘플링이나 다른 메타데이터로 교체 정책을 구현할 수 있으므로 FIFO만 가능한 것은 아니다.

## 스레싱과 워킹셋

### 스레싱 (Thrashing)
- 멀티프로그래밍의 정도가 높아질수록 물리 메모리에 올릴 프로세스가 많아짐
- Page Fault가 빈번하게 발생하고 CPU가 작업하는 시간보다 swap 시간이 길어짐
- 고전적 multiprogramming 제어에서는 낮은 CPU 사용률을 보고 더 많은 프로세스를 admit하면 워킹셋 경쟁이 심해져 fault가 더 늘어나는 악순환이 생길 수 있다. 현대 스케줄러가 항상 이런 방식으로 동작하는 것은 아니다
- 근본 원인: 동시에 필요한 워킹셋 합이 사용 가능한 메모리를 지속적으로 초과하거나 메모리 할당, 교체 정책이 부하와 맞지 않아 page fault와 회수가 반복됨

### 소프트웨어적 해결
- 프로세스 실행 시 일정량의 페이지를 할당
- Page Fault가 많이 발생하면 → 페이지를 더 할당
- Page Fault가 너무 적으면 → 페이지를 과하게 할당한 것으로 판단하여 회수

### 워킹셋 (Working Set)
- 워킹셋은 프로세스가 최근 일정 참조 구간 또는 시간 창에서 사용한 페이지 집합으로, 현재 resident page 전체와 같지 않다
- 운영체제는 최근 참조 정보나 근사 지표를 이용해 활성 페이지를 추정하고 충분한 프레임을 유지하려 한다
- 여러 프로세스의 워킹셋 합이 물리 메모리를 크게 넘으면 잦은 회수와 page fault로 스레싱이 발생할 수 있다. 반드시 컨텍스트 스위치마다 워킹셋 전체를 입출력하는 것은 아니다

### 교체 정책 계산 예

빈 프레임 3개에 `A B C A C D A D C A B`를 참조하면 FIFO는 6회, LRU와 Optimum은 각각 5회 fault가 난다. 처음 A/B/C는 모두 fault이며 D에서 FIFO는 먼저 들어온 A를, LRU와 Optimum은 B를 교체한다. 이후 A에서 FIFO만 추가 fault가 나고 마지막 B에서는 모두 fault가 난다. 이 참조열에서의 결과이며 LRU가 모든 입력에서 최적이라는 뜻은 아니다.

## 출처

- 인프런, 감자 강사, [페이지 교체정책](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100839), [스레싱과 워킹셋](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100840)
- [Linux Kernel, Concepts overview](https://docs.kernel.org/admin-guide/mm/concepts.html)
- [Operating Systems: Three Easy Pieces, page replacement policy](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf)

## 관련 문서

- [[Virtual-Memory-Paging|가상 메모리와 페이징]]
- [[Virtual-Memory-Swap-and-File-Mapping|스왑과 파일 메모리 매핑]]
