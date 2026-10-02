---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Worker Threads vs Cluster vs child_process", "워커 스레드 선택 기준"]
---

# 워커 스레드 vs Cluster vs child_process 비교와 선택 기준
Worker Threads를 Cluster, child_process와 비교하고 어떤 상황에 무엇을 선택할지 결정 기준을 정리한다.

## Cluster 모듈과의 비교
```
┌──────────────────┬──────────────────────────┐
│    Cluster       │     Worker Threads       │
├──────────────────┼──────────────────────────┤
│ 프로세스 기반     │ 스레드 기반               │
│ 메모리 공유 불가  │ SharedArrayBuffer로 공유   │
│ IPC 통신         │ postMessage 통신          │
│ 포트 공유 가능    │ 수동 구성, 버전/플랫폼 제약 │
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
| 격리 수준 | 별도 주소 공간. 권한과 외부 자원은 별도 통제 | 같은 프로세스, 별도 JS 힙 |
| 외부 프로그램 실행 목적 | 적합 (Python, Rust 실행파일 등) | JS 계산 분리용. 내부에서 Wasm/애드온 사용 가능 |
| 충돌 영향 | 메인 무관 | 메인에 영향 가능 |
| 리소스 제어 | cgroup 가능 | 제한적 |

child_process는 완전히 독립된 프로세스를 생성하므로 격리 수준이 높다. 워커의 주소 공간에서 난 크래시는 일반적으로 부모를 직접 종료하지 않지만, 부모는 실패한 작업과 IPC 종료를 처리해야 한다.  exec()이나 spawn()으로 Python, Rust 등 다른 언어로 작성된 프로그램을 실행할 수 있다. 다만 프로세스 생성 비용이 크고, IPC를 통한 통신은 직렬화/역직렬화 오버헤드가 있다.

Worker Threads는 같은 프로세스 내의 스레드이므로 SharedArrayBuffer를 통해 메모리를 직접 공유할 수 있어 통신 비용이 낮다. 하지만 같은 프로세스 내에 있으므로 워커 스레드의 심각한 에러(segfault 등)가 메인 프로세스에 영향을 줄 수 있다.

## 3종 통합 매트릭스 — Worker / child_process / Cluster

| 축 | Worker Threads | child_process | Cluster |
|----|----------------|---------------|---------|
| 단위 | 스레드 (같은 프로세스) | 별개 프로세스 | 별개 프로세스 (포크) |
| 메모리 공유 | SharedArrayBuffer, MessagePort | ✗ 완전 독립 | ✗ 완전 독립 |
| 시작 비용 | 측정 필요, 스레드와 V8 초기화 | 프로그램 초기화 비용 | Node.js 프로세스 초기화 비용 |
| 통신 | postMessage, structured clone | stdio, IPC, 직렬화 | IPC + 자동 라운드로빈 |
| 격리 | 같은 프로세스, native crash 공유 | 별도 주소 공간 | 별도 주소 공간 |
| 메모리 사용 | 낮음 | 높음 (프로세스 통째) | 높음 (코어 수만큼) |
| 에러 전파 | 부분적 (segfault 위험) | 메인 무관 | 메인 무관 |
| 주요 실행 대상 | JS, 필요하면 Wasm/애드온 | 외부 실행파일, Node.js | Node.js 서버 복제 |
| 포트 공유 | Node.js v26.8.1 기준 수동, handle 전달 또는 `reusePort` | 수동, `sendHandle` | ✅ 자동 |
| 사용 케이스 | CPU 집약적 연산 | 외부 명령, 다른 언어, 안정성 | HTTP 서버 멀티코어 활용 |

## 선택 결정 기준

```
┌─ 외부 명령 / 다른 언어 / 강한 격리 필요 → child_process (spawn, fork, exec)
├─ HTTP 서버 멀티코어 로드 분산              → Cluster (또는 PM2, k8s 인스턴스 N개)
├─ CPU 집약적 JS 연산 병렬화                 → Worker Threads (+ piscina pool)
└─ 단순 비동기 I/O                           → 그냥 이벤트 루프 + libuv
```

컨테이너에서는 외부 오케스트레이터의 복제와 내부 cluster 중 감독 책임이 단순한 쪽을 고른다. Pod 수가 반드시 코어 수와 같을 필요는 없다. CPU quota, 메모리, 대기 시간과 장애 격리 단위를 기준으로 정한다.

Worker Threads도 생성 비용이 있으므로 짧은 작업마다 만들지 않고 풀을 검토한다. 메시지 복사, transferable buffer의 소유권 이전, SharedArrayBuffer와 Atomics의 동기화 비용은 서로 다르다. 단순 네트워크 I/O를 워커로 옮기는 것만으로 빨라지지 않는다.

## 출처

- [Node.js Learn, Comparing Node.js concurrency models](https://nodejs.org/en/learn/concurrency/comparing-nodejs-concurrency-models)
- [Node.js, Worker threads](https://nodejs.org/api/worker_threads.html)

- [Node.js, Transferring TCP handles to other threads](https://nodejs.org/api/net.html#transferring-tcp-handles-to-other-threads)
- [Node.js, `subprocess.send()`](https://nodejs.org/api/child_process.html#subprocesssendmessage-sendhandle-options-callback)
