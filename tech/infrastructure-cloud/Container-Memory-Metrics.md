---
tags: [kubernetes, container, memory, cgroup, observability, troubleshooting]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Container Memory Metrics", "컨테이너 메모리 지표", "usage vs working set", "Page Cache와 OOM"]
verified_at: 2026-07-16
---

# 컨테이너 메모리 지표 해석 — usage, working set, RSS, page cache

컨테이너의 메모리 지표는 애플리케이션 힙 하나가 아니다. cgroup의 memory usage는 프로세스 RSS에 파일 I/O가 쌓아 올린 page cache까지 포함하므로, usage/limit이 99%에 붙어 있어도 OOM 없이 멀쩡히 도는 상황이 생긴다. 반대로 이 구성을 모르면 누수가 아닌 것을 누수로 의심해 코드만 뒤지게 된다. 지표를 구성 성분으로 분해해서 읽는 것이 컨테이너 메모리 트러블슈팅의 출발점이다.

## 지표의 구성 — usage는 합계다

- **usage** = RSS + page cache (+ 커널 계정 메모리). cgroup이 그 컨테이너에 과금한 전체.
- **RSS**: 프로세스가 점유한 물리 메모리. JVM이라면 committed heap + metaspace + thread stack + native가 모두 들어간다 ([[JVM-Container-Memory]]).
- **page cache**: 컨테이너 안에서 읽고 쓴 파일이 RAM에 캐시된 것. 프로세스 밖(커널)에 있어 런타임 GC로는 해제되지 않지만, 파일 I/O를 일으킨 컨테이너의 cgroup에 과금된다.
- **working set** = usage - inactive file cache. 커널이 즉시 회수하기 어려운 부분만 남긴 값으로, 실제 메모리 압박을 반영하는 실효 지표에 가깝다 (kubelet 축출 판단도 이 계열 — 단, 커널 OOM 판정과 완전히 일치하지는 않는다).

## usage 99%인데 OOM이 없는 이유

- page cache는 **회수 가능(reclaimable)** 메모리다. cgroup 한도에 다다르면 커널은 프로세스를 죽이기 전에 비활성 파일 캐시부터 회수하고, 회수로 해결되는 동안은 OOM Kill이 일어나지 않는다.
- 따라서 usage가 limit에 붙어 있어도 그 상당 부분이 cache라면 working set에는 여유가 있고 서비스는 정상 동작한다.
- 위험 판단과 알람은 usage가 아니라 **working set과 RSS** 기준으로 건다. usage 기준 알람은 cache까지 포함해 오탐과 알람 피로를 만든다.

## 전형적 패턴 — 고원은 누수가 아닐 수 있다

- 배포 직후 낮았다가 1~2주에 걸쳐 limit 근처까지 올라간 뒤 **고원(Plateau)을 유지**하는 패턴: 파일 로그 등이 cache를 서서히 쌓고, 런타임의 committed 메모리가 상한까지 올라간 뒤 유지되는 조합이 흔한 원인이다.
- 진짜 누수는 working set과 RSS가 계속 우상향한다. **고원 + working set 안정 = 구성 성분 문제**로 먼저 의심한다.
- 대표 범인은 컨테이너 내부 파일 로그다. FILE appender가 컨테이너 안에 로그 파일을 쓰면 그만큼 page cache가 자란다. 로그를 stdout으로 내보내고 별도 에이전트(fluent-bit 등)가 수집하는 구조라면 내부 파일 로그는 불필요한데, 다른 프로젝트 설정을 관성적으로 복사해 남는 경우가 많다.

## 진단 절차 — cgroup 실측으로 성분을 확인한다

uptime이 긴 pod 하나에 들어가 확인한다 (cgroup v1 기준 경로. v2는 memory.current와 memory.stat의 file/anon 항목으로 대응).

- /sys/fs/cgroup/memory/memory.limit_in_bytes 와 memory.usage_in_bytes — 한도와 사용량
- /sys/fs/cgroup/memory/memory.stat 의 cache, rss, total_inactive_file — 성분 분해
- 컨테이너 내부 로그 파일 존재 확인 (예: /tmp 아래 로그와 롤링 압축 파일)
- ps로 현재 런타임 옵션(힙 상한 등) 확인

대시보드에서는 1주 구간으로 다섯 가지를 함께 본다: usage/limits 비율, working_set/limits 비율, usage - working_set(대략 page cache), 런타임 committed(JVM이면 Heap Committed), Full GC 후 잔여 힙.

## 사례

- JVM 기반 계산 서비스: JVM 튜닝 후에도 limit 3G에서 usage 99.6% — 실측은 rss 약 1.74G + cache 약 1.02G로, 힙 누수가 아니라 Logback FILE appender가 만든 cache 약 1GiB가 limit을 채우고 있었다. FILE appender 제거와 limit 3.5G 조정 후 cache는 약 5MiB로 떨어지고 usage는 30%대로 하락, 7일 이상 지난 뒤에도 60%대 고원으로 안정 (SSG 프로모션 서비스). 같은 사례의 런타임 축(커밋 정책)은 [[JVM-Container-Memory]] 참고.

## 면접 체크포인트

- usage, working set, RSS, page cache의 관계식과 각각의 의미
- usage 99%인데 OOM이 없는 메커니즘 (회수 가능 캐시, working set 기준 판단)
- 고원 패턴과 우상향 패턴으로 구성 문제와 누수를 구분하는 법
- 컨테이너 내부 파일 로그가 메모리 지표를 오염시키는 경로와 표준 대안 (stdout + 수집 에이전트)
- 메모리 알람을 어떤 지표에 걸어야 하는가 (usage가 아니라 working set)

## 출처

- [돌아오지 않는 메모리를 찾아서 — SSG TECH BLOG](https://medium.com/ssgtech/%EB%8F%8C%EC%95%84%EC%98%A4%EC%A7%80-%EC%95%8A%EB%8A%94-%EB%A9%94%EB%AA%A8%EB%A6%AC%EB%A5%BC-%EC%B0%BE%EC%95%84%EC%84%9C-6988f6d55066)
- [Node-pressure Eviction — Kubernetes Docs](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/) (working set 기준 축출, inactive_file 제외)
- [Memory Resource Controller — Linux Kernel Docs](https://docs.kernel.org/admin-guide/cgroup-v1/memory.html) (한도 도달 시 회수 후 OOM, memory.stat 항목)

## 관련 문서

- [[JVM-Container-Memory|JVM 컨테이너 메모리 (used vs committed, RAMPercentage 함정)]]
- [[K8s-Resource-Right-Sizing|K8s Resource Right-Sizing (P95 역산, working_set 기준)]]
- [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정 (같은 자원, 다른 값)]]
- [[Container-Monitoring|컨테이너 모니터링 (cAdvisor, 수집 구조)]]
- [[OOM-Troubleshooting-Response|Node.js OOM 트러블슈팅 대응]]
- [[Virtual-Memory-Paging|가상 메모리와 페이징]]
