---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Worker Threads vs Cluster vs child_process", "워커 스레드 선택 기준"]
---

### 워커 스레드 vs Cluster vs child_process 비교와 선택 기준
Worker Threads를 Cluster, child_process와 비교하고 어떤 상황에 무엇을 선택할지 결정 기준을 정리한다.

## Cluster 모듈과의 비교
```
┌──────────────────┬──────────────────────────┐
│    Cluster       │     Worker Threads       │
├──────────────────┼──────────────────────────┤
│ 프로세스 기반     │ 스레드 기반               │
│ 메모리 공유 불가  │ SharedArrayBuffer로 공유   │
│ IPC 통신         │ postMessage 통신          │
│ 포트 공유 가능    │ 포트 공유 불가             │
│ 수평 확장 (서버)  │ 병렬 연산 (CPU 작업)       │
└──────────────────┴──────────────────────────┘

Cluster: HTTP 서버를 멀티 코어로 확장할 때 (로드 밸런싱)
Worker Threads: CPU 집약적 연산을 병렬화할 때
```

## child_process vs Worker Threads 비교

| 항목 | child_process | Worker Threads |
|------|---------------|----------------|
| 단위 | 프로세스 | 스레드 |
| 메모리 공유 | 불가 (IPC) | SharedArrayBuffer |
| 통신 비용 | 높음 (직렬화) | 중간 (structured clone) |
| 격리 수준 | 완전 격리 | 같은 프로세스 |
| 외부 언어 | 가능 (Python, Rust 등) | 불가 (JS/TS만) |
| 충돌 영향 | 메인 무관 | 메인에 영향 가능 |
| 리소스 제어 | cgroup 가능 | 제한적 |

child_process는 완전히 독립된 프로세스를 생성하므로 격리 수준이 높다. 워커 프로세스가 크래시해도 메인 프로세스에 영향이 없으며, exec()이나 spawn()으로 Python, Rust 등 다른 언어로 작성된 프로그램을 실행할 수 있다. 다만 프로세스 생성 비용이 크고, IPC를 통한 통신은 직렬화/역직렬화 오버헤드가 있다.

Worker Threads는 같은 프로세스 내의 스레드이므로 SharedArrayBuffer를 통해 메모리를 직접 공유할 수 있어 통신 비용이 낮다. 하지만 같은 프로세스 내에 있으므로 워커 스레드의 심각한 에러(segfault 등)가 메인 프로세스에 영향을 줄 수 있다.

## 3종 통합 매트릭스 — Worker / child_process / Cluster

| 축 | Worker Threads | child_process | Cluster |
|----|----------------|---------------|---------|
| 단위 | 스레드 (같은 프로세스) | 별개 프로세스 | 별개 프로세스 (포크) |
| 메모리 공유 | SharedArrayBuffer, MessagePort | ✗ 완전 독립 | ✗ 완전 독립 |
| 시작 비용 | 중간 (수 ms) | 높음 (수십 ms) | 높음 (수십 ms) |
| 통신 | postMessage, structured clone | stdio, IPC, 직렬화 | IPC + 자동 라운드로빈 |
| 격리 | 부분 (같은 프로세스 충돌 위험) | 완전 격리 | 완전 격리 |
| 메모리 사용 | 낮음 | 높음 (프로세스 통째) | 높음 (코어 수만큼) |
| 에러 전파 | 부분적 (segfault 위험) | 메인 무관 | 메인 무관 |
| 외부 언어 실행 | ✗ JS/TS만 | ✅ Python, Rust 등 | ✗ Node만 |
| 포트 공유 | ✗ | ✗ | ✅ 자동 |
| 사용 케이스 | CPU 집약적 연산 | 외부 명령, 다른 언어, 안정성 | HTTP 서버 멀티코어 활용 |

## 선택 결정 기준

```
┌─ 외부 명령 / 다른 언어 / 강한 격리 필요 → child_process (spawn, fork, exec)
├─ HTTP 서버 멀티코어 로드 분산              → Cluster (또는 PM2, k8s 인스턴스 N개)
├─ CPU 집약적 JS 연산 병렬화                 → Worker Threads (+ piscina pool)
└─ 단순 비동기 I/O                           → 그냥 이벤트 루프 + libuv
```

운영, 배포 관점 추가: **컨테이너 오케스트레이터(k8s)** 환경에선 Cluster보다 **인스턴스 N개 수평 확장**이 단순. 한 인스턴스가 한 코어 쓰고 k8s가 코어 수만큼 인스턴스를 띄우는 패턴이 표준 ([[Single-vs-Multi-Thread]] 사례 참조).
