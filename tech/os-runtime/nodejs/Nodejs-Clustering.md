---
tags: [nodejs, runtime, cluster, pm2, scaling, multi-core]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Node.js Clustering", "Node.js PM2 Cluster", "Node.js 멀티코어 활용"]
---

# Node.js 클러스터링 · 멀티코어 활용

Node.js는 단일 프로세스가 이벤트 루프 하나만 돌리므로 **멀티코어 장비의 잉여 코어를 놀린다.** 클러스터링은 동일 애플리케이션을 **프로세스 단위로 복제**해 각 코어에 배치, 공통 포트를 공유하며 요청을 분산하는 기법이다.

## 왜 필요한가

- **싱글 스레드 모델의 한계**: JS 실행은 메인 스레드 1개 → CPU 4개 장비에서 최대 25% 활용
- **이벤트 루프 블로킹 격리**: 한 워커가 느린 연산으로 멎어도 다른 워커는 계속 요청 처리
- **장애 격리**: 한 워커가 죽어도 매니저가 재시작 → 가용성↑
- **배포 무중단**: rolling restart로 워커를 하나씩 교체

세션 유지나 공유 상태가 필요하다면 Redis 같은 외부 저장소가 필수 — 워커 간 메모리는 격리된다.

## 두 가지 주요 방식

### 1. 내장 `cluster` 모듈

Node.js가 기본 제공. 마스터가 워커를 `fork()`하고 **동일 포트를 공유**한다(커널이 round-robin으로 소켓 전달, Windows는 워커가 accept 경쟁).

```js
import cluster from 'node:cluster';
import os from 'node:os';
import http from 'node:http';

if (cluster.isPrimary) {
  for (let i = 0; i < os.availableParallelism(); i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.error(`worker ${worker.process.pid} died, restarting`);
    cluster.fork();
  });
} else {
  http.createServer((req, res) => res.end('ok')).listen(3000);
}
```

- 장점: 외부 의존 없음, 앱이 자체 감독
- 단점: 재시작·모니터링·로그 집계·graceful shutdown을 직접 구현해야 함

### 2. PM2(Process Manager 2)

프로덕션에서 가장 흔한 선택. 프로세스 감독·로그 집계·무중단 reload·모니터링 대시보드까지 제공.

```bash
pm2 start app.js -i max          # 가용 코어 수만큼 워커
pm2 reload app                   # 0-downtime reload
pm2 logs
pm2 monit
```

- `-i max` 또는 `-i 0`: 코어 수 자동 감지
- `pm2 reload`: 워커를 하나씩 교체해 다운타임 없이 재기동
- `ecosystem.config.js`로 환경별 설정·cron restart·maxMemory 지정

## 컨테이너 시대의 선택

| 모델 | 장점 | 단점 |
|---|---|---|
| **1 컨테이너 = 1 Node 프로세스** | K8s HPA로 수평 확장, 단순 | 코어 수만큼 파드 필요 |
| **1 컨테이너 = N 워커(cluster/PM2)** | 파드 수↓, 컨텍스트 스위칭 비용↓ | 컨테이너 OOM이 전 워커 동반 사망 |

K8s 환경에서는 **Pod 수평 확장을 우선**하고, 컨테이너 내부는 프로세스 1개가 일반적이다. 클러스터링은 단일 VM·베어메탈이나 legacy PaaS에서 더 가치가 크다.

## 구조적 주의점

- **상태 공유 불가** — 세션·캐시는 Redis. 메모리 기반 세션은 워커 간 일관성 깨짐
- **WebSocket sticky** — 워커마다 연결 집합이 다르므로 로드밸런서 sticky 또는 [[Realtime-Chat-Architecture|Pub/Sub 백본]] 필요
- **graceful shutdown** — SIGTERM 수신 시 새 연결 거부 + 기존 요청 완료 후 종료
- **로그 섞임** — stdout을 여러 워커가 공유하면 라인 단위 atomic이 아닐 수 있음. 로거에 PID·워커 ID 포함
- **CPU bound 작업은 여전히 블로킹** — 클러스터링은 동시에 여러 요청을 분산할 뿐, 한 요청의 CPU 점유 문제는 Worker Threads로 해결

## Worker Threads와의 차이

| 축 | Cluster (프로세스) | Worker Threads |
|---|---|---|
| 메모리 공간 | 독립 | 공유 가능(SharedArrayBuffer) |
| IPC 비용 | 직렬화 필요, 상대적 고비용 | 메시지·SharedArrayBuffer, 저비용 |
| 장애 격리 | 강함 | 한 워커 크래시가 프로세스 전체 영향 가능 |
| 용도 | **I/O 동시성 확장** | **CPU 집약 연산 오프로드** |

둘은 대체가 아니라 보완 관계. 자세한 비교는 [[Worker-Threads|워커 스레드]].

## 성능 측정 체크리스트

- 워커 수와 코어 수의 관계 — 초과하면 컨텍스트 스위칭 비용이 이익을 상쇄
- GC·이벤트 루프 지연(`@opencensus/nodejs-base`·`perf_hooks.monitorEventLoopDelay`)
- 부하 테스트는 k6·artillery로 RPS 증가 시 P99/P999 지연 곡선 확인
- 로깅·트레이싱 오버헤드 제외 후 측정

## 흔한 안티패턴

- **코어 수보다 많은 워커**: `-i 32`를 4코어 장비에 적용 → 오히려 느려짐
- **메모리 세션 + 클러스터**: 로그인 세션이 워커별로 나뉘어 "랜덤 로그아웃"
- **shared 상태를 전역 변수로**: 한 워커만 업데이트되고 나머지는 오래된 값을 씀
- **무제한 재시작 루프**: 워커가 부팅 실패로 즉사하면 PM2가 무한 재시작. `max_restarts`·exponential backoff 설정

## 면접 체크포인트

- Node.js가 멀티코어를 직접 활용하지 못하는 이유
- `cluster` 모듈 vs Worker Threads의 용도 차이
- K8s 환경에서 파드 확장 vs 컨테이너 내 클러스터 선택 기준
- 클러스터링 시 세션·WebSocket·로그에서 생기는 이슈
- PM2 `reload`가 무중단인 이유(워커 순차 교체)

## 출처
- [요즘IT — Node.js 병렬처리를 위한 PM2·Docker 기반 실험](https://yozm.wishket.com/magazine/detail/1556/)

## 관련 문서
- [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드]]
- [[Worker-Threads|워커 스레드]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[libuv|libuv]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
