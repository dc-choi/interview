---
tags: [kubernetes, container, memory, cgroup, observability, troubleshooting]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Container Memory Metrics", "컨테이너 메모리 지표", "usage vs working set", "Page Cache와 OOM"]
verified_at: 2026-07-21
---

# 컨테이너 메모리 지표 해석 — usage, working set, RSS, page cache

컨테이너의 메모리 지표는 애플리케이션 힙 하나가 아니다. cgroup의 memory usage는 프로세스 RSS에 파일 I/O가 쌓아 올린 page cache까지 포함하므로, usage/limit이 99%에 붙어 있어도 OOM 없이 멀쩡히 도는 상황이 생긴다. 반대로 이 구성을 모르면 누수가 아닌 것을 누수로 의심해 코드만 뒤지게 된다. 지표를 구성 성분으로 분해해서 읽는 것이 컨테이너 메모리 트러블슈팅의 출발점이다.

## 지표의 구성 — usage는 합계다

- **usage**: cgroup에 계정된 anonymous memory, file cache, 일부 커널 메모리 등을 합친 값. 단순한 프로세스 RSS 산술식과 완전히 같지는 않다.
- **RSS**: 프로세스 주소 공간 중 현재 물리 메모리에 resident인 페이지. JVM에서는 실제로 접근된 힙 페이지와 resident한 metaspace, thread stack, code cache, native allocation 등이 포함될 수 있다. Heap Committed 전체가 곧 RSS는 아니다 ([[JVM-Container-Memory]]).
- **page cache**: 컨테이너 안에서 읽고 쓴 파일이 RAM에 캐시된 것. 프로세스 밖(커널)에 있어 런타임 GC로는 해제되지 않지만, 파일 I/O를 일으킨 컨테이너의 cgroup에 과금된다.
- **working set**: cAdvisor 계열에서 usage에서 inactive file cache를 빼 계산하는 지표. inactive 여부는 회수 가능성을 추정하는 휴리스틱이므로 working set 전체가 unreclaimable memory라는 뜻은 아니며 커널 OOM 판정과도 일치하지 않는다.

## usage 99%인데 OOM이 없는 이유

- inactive file cache는 흔히 회수 가능한 후보라서 usage가 limit에 가까워도 OOM이 나지 않는 상황을 설명할 수 있다. 다만 active, dirty, mapped 상태, cgroup memory protection, swap과 전체 pressure에 따라 회수 성공과 순서가 달라지며 커널은 항상 충분히 회수할 수 있는 것이 아니다.
- Kubernetes와 cAdvisor가 `inactive_file`을 빼는 것은 회수 가능성에 대한 가정이다. cache 비중만으로 서비스를 정상 판정하지 말고 `memory.events`, PSI, reclaim 지연, OOM/throttling과 애플리케이션 지연을 확인한다.
- 위험 판단은 **usage-to-limit, working set, anonymous/RSS와 file cache 구성, cgroup 이벤트**를 함께 본다. usage 하나만 경보하면 cache 때문에 오탐이 날 수 있지만, cgroup 한도와 OOM은 계정된 usage와 reclaim 결과에 연계되므로 usage를 버려서도 안 된다.

## 전형적 패턴 — 고원은 누수가 아닐 수 있다

- 배포 직후 낮았다가 1~2주에 걸쳐 limit 근처까지 올라간 뒤 **고원(Plateau)을 유지**하는 패턴: 파일 로그 등이 cache를 서서히 쌓고, 런타임의 committed 메모리가 상한까지 올라간 뒤 유지되는 조합이 흔한 원인이다.
- 누수는 GC 후 live set, anonymous/RSS와 working set 추세로 의심하되 항상 계속 우상향하는 모양만 보이지는 않는다. GC, allocator, cgroup limit이나 재시작 때문에 계단식 증가 또는 한도 근처 고원으로 보일 수 있다. 반대로 고원과 안정된 working set만으로 누수가 없다고 확정하지 않는다.
- 대표 범인은 컨테이너 내부 파일 로그다. FILE appender가 컨테이너 안에 로그 파일을 쓰면 그만큼 page cache가 자란다. 로그를 stdout으로 내보내고 별도 에이전트(fluent-bit 등)가 수집하는 구조라면 내부 파일 로그는 불필요한데, 다른 프로젝트 설정을 관성적으로 복사해 남는 경우가 많다.

## 진단 절차 — cgroup 실측으로 성분을 확인한다

uptime이 긴 pod 하나에 들어가 확인한다 (cgroup v1 기준 경로. v2는 memory.current와 memory.stat의 file/anon 항목으로 대응).

- /sys/fs/cgroup/memory/memory.limit_in_bytes 와 memory.usage_in_bytes — 한도와 사용량
- /sys/fs/cgroup/memory/memory.stat 의 cache, rss, total_inactive_file — 성분 분해
- 컨테이너 내부 로그 파일 존재 확인 (예: /tmp 아래 로그와 롤링 압축 파일)
- ps로 현재 런타임 옵션(힙 상한 등) 확인

대시보드에서는 충분한 기간의 usage/limit, working_set/limit, anonymous/RSS와 file cache, 런타임 committed와 GC 후 live set, 재시작/OOM을 함께 본다. cgroup v2에서는 `memory.current`, `memory.stat`, `memory.events`의 `high`, `max`, `oom`, `oom_kill`와 memory PSI도 확인하고, 회수 전후와 재시작 시점의 변화를 연관 분석한다.

## 사례

- JVM 기반 계산 서비스: JVM 튜닝 후에도 limit 3G에서 usage 99.6% — 실측은 rss 약 1.74G + cache 약 1.02G로, 힙 누수가 아니라 Logback FILE appender가 만든 cache 약 1GiB가 limit을 채우고 있었다. FILE appender 제거와 limit 3.5G 조정 후 cache는 약 5MiB로 떨어지고 usage는 30%대로 하락, 7일 이상 지난 뒤에도 60%대 고원으로 안정 (SSG 프로모션 서비스). 같은 사례의 런타임 축(커밋 정책)은 [[JVM-Container-Memory]] 참고.

## 면접 체크포인트

- usage, working set, RSS, page cache의 관계식과 각각의 의미
- usage 99%인데 OOM이 없는 메커니즘 (회수 가능 캐시, working set 기준 판단)
- 고원 패턴과 우상향 패턴으로 구성 문제와 누수를 구분하는 법
- 컨테이너 내부 파일 로그가 메모리 지표를 오염시키는 경로와 표준 대안 (stdout + 수집 에이전트)
- 메모리 알람을 어떤 복합 신호에 걸어야 하는가 (usage-to-limit, working set, anonymous/RSS, `memory.events`, PSI, restart와 GC)

## 출처

- [돌아오지 않는 메모리를 찾아서 — SSG TECH BLOG](https://medium.com/ssgtech/%EB%8F%8C%EC%95%84%EC%98%A4%EC%A7%80-%EC%95%8A%EB%8A%94-%EB%A9%94%EB%AA%A8%EB%A6%AC%EB%A5%BC-%EC%B0%BE%EC%95%84%EC%84%9C-6988f6d55066)
- [Node-pressure Eviction — Kubernetes Docs](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/) (working set 기준 축출, inactive_file 제외)
- [Memory Resource Controller — Linux Kernel Docs](https://docs.kernel.org/admin-guide/cgroup-v1/memory.html) (한도 도달 시 회수 후 OOM, memory.stat 항목)
- [Linux kernel — proc filesystem, VmRSS and resident set fields](https://docs.kernel.org/filesystems/proc.html)
- [Linux cgroup v2 memory controller](https://docs.kernel.org/admin-guide/cgroup-v2.html)

## 관련 문서

- [[JVM-Container-Memory|JVM 컨테이너 메모리 (used vs committed, RAMPercentage 함정)]]
- [[K8s-Resource-Right-Sizing|K8s Resource Right-Sizing (P95 역산, working_set 기준)]]
- [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정 (같은 자원, 다른 값)]]
- [[Container-Monitoring|컨테이너 모니터링 (cAdvisor, 수집 구조)]]
- [[OOM-Troubleshooting-Response|Node.js OOM 트러블슈팅 대응]]
- [[Virtual-Memory-Paging|가상 메모리와 페이징]]
