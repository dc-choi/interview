---
tags: [os, cpu-scheduling, scheduling-algorithm, interview, sched-ext]
status: done
verified_at: 2026-10-27
category: "OS&런타임(OS&Runtime)"
aliases: ["CPU Scheduling Algorithms", "CPU 스케줄링 알고리즘", "스케줄링 알고리즘", "SRTF", "MLFQ", "Multilevel Queue", "sched_ext"]
---

# CPU 스케줄링 알고리즘

스케줄링 알고리즘은 준비 큐에서 기다리는 task 가운데 다음에 CPU를 받을 대상을 고르는 기준이다. 스케줄러가 언제 개입하는지(선점과 비선점), 고른 task를 누가 실행 상태로 올리는지(디스패처)는 [[Context-Switching|컨텍스트 스위칭과 CPU 스케줄링]]에서 다룬다.

## FIFO (First In First Out)
- 먼저 들어온 프로세스를 먼저 처리
- 장점: 단순하고 직관적
- 단점: 실행 시간이 짧은 프로세스가 긴 프로세스 뒤에 대기, IO 작업 시 계속 대기
- 비선점 FCFS는 대화형 시스템의 기본 정책으로는 불리하지만 배치 큐 같은 곳에 쓸 수 있다. POSIX/Linux의 실시간 `SCHED_FIFO`는 우선순위와 선점 규칙이 있는 별도 정책이므로 교재의 단순 FCFS와 구분한다.

## SJF (Shortest Job First)
- Burst Time이 짧은 프로세스를 먼저 실행
- 모든 작업의 실행 시간을 미리 알고 같은 시점에 준비된 비선점 모델에서는 평균 대기 시간을 최소화한다.
- 문제점:
  1. 프로세스가 얼마나 실행될지 예측하기 어려움
  2. Burst Time이 긴 프로세스는 아주 오랫동안 실행되지 않을 수 있음 (기아 현상)

## SRTF (Shortest Remaining Time First)
- SJF에 선점을 더한 방식이다. 새 작업이 준비 큐에 들어올 때마다 남은 CPU burst가 가장 짧은 작업을 다시 고르고, 실행 중인 작업보다 짧으면 선점한다. Preemptive SJF, STCF라고도 부른다.
- 예: 남은 burst가 10, 5, 16인 P1, P2, P3가 함께 준비되면 P2, P1 순으로 실행한다. P1이 4만큼 실행돼 6이 남았을 때 burst 3인 P4가 도착하면 P1을 멈추고 P4를 먼저 실행한다.
- 작업이 서로 다른 시각에 도착하면 짧은 작업이 긴 작업 뒤에 갇히지 않아 SJF보다 평균 반환 시간을 줄일 수 있다. 다음 burst 길이를 미리 알 수 없어 예측값을 써야 하고, 긴 작업이 계속 밀리는 기아 문제는 SJF와 같다.

## 우선순위 스케줄링
- 각 task에 우선순위를 두고 가장 높은 task에 CPU를 준다. 같은 우선순위끼리는 FIFO나 RR로 나눈다.
- 비선점형은 더 높은 우선순위 task가 도착해도 실행 중인 task가 끝나거나 대기에 들어갈 때까지 기다리고, 선점형은 즉시 교체한다.
- 숫자의 방향은 시스템마다 다르다. 교재 예제는 작은 정수를 높은 우선순위로 쓰고, Linux 실시간 정책의 `sched_priority`는 1(낮음)부터 99(높음)까지이며, nice 값은 -20이 가장 높고 +19가 가장 낮다.
- SJF는 다음 CPU burst 예측값이 짧을수록 우선순위를 높게 주는 우선순위 스케줄링으로 볼 수 있다.
- 낮은 우선순위 task가 계속 밀리는 기아가 대표 문제이며 아래 에이징으로 완화한다.

## RR (Round Robin)
- FIFO의 단점을 해결. 프로세스에게 **타임 슬라이스(타임 퀀텀)** 만큼만 CPU를 할당
- 할당 시간이 지나면 강제로 CPU를 뺏고 큐의 맨 뒤로 이동
- 컨텍스트 스위칭 오버헤드가 추가되므로 평균 대기시간이 비슷하면 FIFO보다 느림
- 타임 슬라이스가 크면 → FIFO와 비슷
- 타임 슬라이스가 작으면 → 컨텍스트 스위칭이 많아져 오버헤드 증가
- 실제 시간 할당과 선점 규칙은 운영체제, 스케줄링 클래스, 우선순위, 부하와 하드웨어에 따라 달라져 고정된 Windows/Unix 값으로 일반화할 수 없다.

## 다단계 큐 (Multilevel Queue)
- 준비 큐를 여러 개로 나누고 프로세스를 성격(대화형, 배치 등)이나 우선순위에 따라 한 큐에 배정한다. 큐마다 다른 알고리즘을 쓸 수 있다.
- 설계 변수는 큐의 개수, 큐별 알고리즘, 프로세스를 어느 큐에 넣을지 정하는 방법, 큐 사이의 스케줄링이다. 큐 사이는 상위 큐가 비어야 하위 큐를 실행하는 고정 우선순위가 대표적이며, 큐마다 CPU 시간 비율을 나눠 주는 방식도 있다.
- 배정이 고정되므로 고정 우선순위에서는 하위 큐가 기아에 빠질 수 있다. 실행 특성을 보고 프로세스를 큐 사이로 옮기는 피드백을 더한 것이 아래 MLFQ다.
- Linux `sched(7)`도 개념적으로 static priority마다 실행 가능 스레드 목록을 두고 비어 있지 않은 가장 높은 목록의 맨 앞 스레드를 고른다. 더 높은 static priority 스레드가 준비되면 실행 중인 스레드를 선점하며, 실시간 정책 스레드는 일반 스레드보다 항상 우선한다.

## MLFQ (Multi Level Feedback Queue)
- 교육용으로 널리 쓰이는 피드백 큐 모델이다. 실제 운영체제는 CFS 계열, EEVDF, 우선순위와 실시간 클래스 등 고유 구현을 사용하므로 MLFQ가 모든 현대 OS의 공통 구현이라고 단정하지 않는다.
- CPU 처리량이 중요한 프로세스 → 타임 슬라이스를 크게
- IO 응답속도가 중요한 프로세스 → 타임 슬라이스를 짧게
- 우선순위 큐를 여러 개 준비:
  - 우선순위 높음 → 타임 슬라이스 작음
  - 우선순위 낮음 → 타임 슬라이스 큼
- 타임 슬라이스를 초과하여 강제로 CPU를 뺏기면 → 우선순위가 낮은 큐로 이동 (타임 슬라이스가 커짐)
- 운영체제는 타임 슬라이스 초과 여부로 프로세스의 특성(CPU bound vs IO bound)을 판단

## 기아 해결 — 에이징(Aging)
- SJF, 우선순위 스케줄링의 고질적 문제: 긴 작업, 낮은 우선순위 프로세스가 **영원히 대기**할 수 있음
- **에이징**: 대기 시간이 길어질수록 우선순위를 **점진적으로 상향**시켜 언젠가는 실행되게 보장
- MLFQ에도 일정 주기마다 모든 프로세스를 상위 큐로 승격시키는 보완책으로 사용

## 정책을 교체할 수 있게 만든 Linux sched_ext

교과서의 알고리즘은 정책 하나를 고정해 비교하지만, Linux는 scheduling class의 동작을 BPF 프로그램으로 정의하는 sched_ext를 둔다. BPF 스케줄러가 load되어 실행되는 동안에만 쓰이며 Linux 7.3 문서 기준 다음 성질을 가진다.

- `SCX_OPS_SWITCH_PARTIAL`을 켜지 않으면 `SCHED_NORMAL`, `SCHED_BATCH`, `SCHED_IDLE`, `SCHED_EXT` task가 모두 sched_ext로 가고, 켜면 `SCHED_EXT` 정책 task만 간다. 실시간 정책(`SCHED_FIFO`, `SCHED_RR`)은 이 목록에 없다.
- 오류를 감지하거나 실행 가능한 task가 멈추거나(stall) SysRq-S를 누르면 BPF 스케줄러를 내리고 모든 task를 기본 fair class로 되돌린다. 잘못 만든 정책이 시스템 전체를 멈추지 않게 하는 안전장치다.
- cgroup의 `cpu.max`, `cpu.weight`, `cpu.idle` 설정은 BPF 스케줄러에 전달되지만 어떻게 반영할지는 각 스케줄러가 정하고 무시할 수도 있다.

2026-10-18 출시된 Linux 7.3은 sub-scheduler 기능을 완성했다. cgroup마다 자기 BPF 스케줄러를 붙여 그 cgroup의 프로세스를 관리하게 할 수 있고(`CONFIG_EXT_SUB_SCHED`), 부모 스케줄러는 CPU별 enqueue와 선점 같은 권한을 자식에게 넘길 수 있다. 워크로드마다 다른 정책을 한 시스템에서 시험할 수 있게 됐지만, 정책을 바꾸면 지연과 처리량의 분포가 바뀌므로 아래 평균 대기 시간 같은 지표를 실제 부하에서 다시 잰다.

## 평균 대기 시간 계산과 슬라이스 선택

모든 작업이 0초에 준비되고 문맥 전환 비용은 0이라고 가정한다. 비선점 대기 시간은 시작 시각이며, 선점되는 작업은 준비 큐에서 다시 기다린 시간도 더한다.

| 작업과 순서 | 각 작업 대기 시간 | 평균 |
|---|---|---|
| FIFO, 실행 시간 25, 5, 4초 | 0, 25, 30초 | 55/3 = 약 18.33초 |
| SJF, 실행 시간 4, 5, 25초 | 0, 4, 9초 | 13/3 = 약 4.33초 |
| RR, 실행 시간 25, 4, 10초, 슬라이스 10초 | 14, 10, 14초 | 38/3 = 약 12.67초 |

RR 예의 완료 시각은 39, 14, 24초이며 `대기 시간 = 완료 시각 - 도착 시각 - CPU 실행 시간`으로도 확인된다. 같은 작업의 FIFO 평균은 18초다. RR이 모든 부하에서 평균 대기 시간을 줄인다는 뜻은 아니다.

CPU를 오래 쓰는 작업 뒤에서 I/O 작업이 기다리면 장치가 유휴 상태로 남을 수 있다. 짧은 슬라이스는 I/O 작업이 다음 I/O를 빨리 시작하게 하지만 선점 비용을 늘린다. MLFQ는 관찰한 CPU 사용 특성에 따라 우선순위와 슬라이스를 조정해 이 상충을 다룬다. 타임 슬라이스 만료가 같은 작업의 실제 문맥 전환을 반드시 뜻하지는 않는다.

## 면접 체크포인트

- SJF와 SRTF의 차이(선점 여부)와 SRTF가 유리해지는 조건(도착 시각이 다른 작업)
- 다음 CPU burst 길이를 미리 알 수 없다는 SJF 계열의 근본 한계
- RR 타임 슬라이스 크기의 상충: 응답 시간과 문맥 전환 비용
- 다단계 큐와 MLFQ의 차이(고정 배정과 피드백 이동), 기아와 에이징
- 우선순위 숫자의 방향이 시스템과 정책마다 다르다는 점

## 출처

- [OSTEP, Scheduling: Introduction](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf)
- [OSTEP, Scheduling: The Multi-Level Feedback Queue](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-mlfq.pdf)
- [Operating System Concepts 10th, 5장 CPU Scheduling 강의 슬라이드](https://www.os-book.com/OS10/slide-dir/index.html)
- 인프런, 감자 강사, [FIFO](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100770), [SJF](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100771), [RR](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100772), [MLFQ](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100773)
- YouTube, 쉬운코드, [CPU 스케줄러, 선점과 비선점, 디스패처](https://www.youtube.com/watch?v=LgEY4ghpTJI)
- [Linux kernel scheduler documentation](https://docs.kernel.org/scheduler/)
- [Linux sched(7)](https://man7.org/linux/man-pages/man7/sched.7.html)
- [Linux kernel v7.3, Documentation/scheduler/sched-ext.rst](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/Documentation/scheduler/sched-ext.rst?h=v7.3) — 2026-10-27 대상 정책, 복귀 조건, cgroup 설정 전달과 `CONFIG_EXT_SUB_SCHED` 대조
- [Kernelnewbies, Linux 7.3](https://kernelnewbies.org/Linux_7.3)
- [The 7.3 kernel has been released — LWN.net](https://lwn.net/Articles/1101143/)
- [Linux 7.3 출시 - 스케줄링 개선과 새로운 파일 접근 격리 기능 — GeekNews](https://news.hada.io/topic?id=35635)

## 관련 문서

- [[Context-Switching|컨텍스트 스위칭과 CPU 스케줄링]]
- [[Process-Lifecycle|프로세스 생명주기]]
- [[Thread-Models|스레드 종류와 스레딩 모델]]
- [[Sleep-and-Timing|Sleep과 타이밍 (대기 후 준비 큐 복귀와 스케줄링 지연)]]
