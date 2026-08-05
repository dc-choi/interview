---
tags: [reliability, shutdown]
status: done
verified_at: 2026-08-05
category: "안정성엔지니어링(Reliability)"
aliases: ["Graceful Shutdown", "우아한 종료"]
---

# Graceful Shutdown

프로세스가 종료 신호를 받았을 때, 진행 중인 작업을 안전하게 마무리하고 리소스를 정리한 뒤 종료하는 패턴이다.

## 왜 필요한가

프로세스를 즉시 종료(kill -9)하면:
- 처리 중인 HTTP 요청이 중단되어 클라이언트에 에러 반환
- DB 트랜잭션이 반쯤 실행된 상태로 남아 데이터 정합성 훼손
- DB 커넥션 풀이 정리되지 않아 커넥션 누수
- 스케줄러/크론 작업이 중간에 끊겨 불완전한 상태 발생
- 파일 핸들, 소켓 등 리소스 누수

## 구현 흐름

1. **종료 신호 수신** — `SIGTERM`(정상 종료) 또는 `SIGINT`(Ctrl+C) 포착. 핸들러는 중복 호출에 안전해야 한다. 배포 중 신호가 두 번 오면 정리 로직이 두 번 돈다.
2. **신규 수신 중단** — 헬스 체크를 실패로 전환하고 로드밸런서가 라우팅에서 뺄 때까지 기다린 뒤 `close()`로 새 연결 수락을 중단한다(전파 대기 근거는 아래 Docker, K8s 절). 메시지 컨슈머와 스케줄러도 이 시점에 새 작업을 더 받지 않도록 멈춘다.
3. **in-flight drain** — 이미 받은 요청과 이미 꺼낸 메시지를 처리 완료까지 기다린다. 여기서 흔히 걸리는 것이 keep-alive 커넥션이다. Node 19 미만에서는 `closeIdleConnections()`(v18.2.0 추가)를 함께 호출해야 유휴 커넥션이 끊겼고, 19부터는 `close()`가 반환 전에 유휴 커넥션을 먼저 닫는다. 다만 요청을 보내는 중이거나 응답을 기다리는 커넥션은 그대로 남으므로 강제 종료 타이머는 여전히 필요하다.
4. **리소스 정리** — DB 커넥션 풀, 외부 클라이언트, 파일 핸들을 순서대로 닫는다. 진행 중인 작업이 아직 DB를 쓰므로 **DB는 반드시 마지막**이다.
5. **프로세스 종료** — `process.exit(0)`. drain이 끝나지 않아도 강제 종료할 타이머를 함께 걸어 무한 대기를 막는다.

## Node.js/Express 구현 패턴

종료 시 정리해야 할 리소스:
- **HTTP 서버** — `server.close()`로 새 요청 수락 중단, 기존 요청 완료 대기
- **스케줄러** — `node-schedule`의 `gracefulShutdown()`으로 예약된 작업 정리
- **DB 커넥션** — Prisma의 `$disconnect()`로 커넥션 풀 정리
- **Query Builder** — Kysely의 `destroy()`로 커넥션 반환

정리 순서: 스케줄러(새 작업 방지) → HTTP 서버(새 요청 차단) → DB(마지막에 정리)

## SIGTERM vs SIGINT

| 신호 | 발생 상황 | 기본 동작 |
|---|---|---|
| `SIGTERM` | `kill <pid>`, Docker stop, K8s Pod 종료 | 종료 (포착 가능) |
| `SIGINT` | Ctrl+C | 종료 (포착 가능) |
| `SIGKILL` | `kill -9` | **즉시 종료 (포착 불가)** |

Docker는 `docker stop` 시 SIGTERM을 먼저 보내고, 대기 시간이 지나도 종료되지 않으면 SIGKILL로 강제 종료한다. 기본 대기 시간은 아래 타임아웃 설정 절 참고.

## Docker + Health Check와의 관계

Docker 자체에는 트래픽을 빼는 기능이 없다. 앞단 로드밸런서가 health check 결과로 인스턴스를 라우팅에서 제외하므로, **트래픽이 빠진 뒤에 소켓을 닫는** 순서를 앱이 직접 만들어야 한다.

1. **health check 실패로 전환** — 배포 도구가 먼저 인스턴스를 빼 주면 가장 안전하고, 그럴 수 없으면 SIGTERM을 받은 앱이 헬스 엔드포인트만 실패로 바꾼다. 이 시점에도 리스닝 소켓은 열어 두고 들어오는 요청을 정상 처리한다.
2. **로드밸런서가 트래픽 제거** — unhealthy 판정에는 실패 임계값 × 체크 주기만큼 지연이 있다. 이 시간을 기다리는 것이 K8s의 preStop sleep과 같은 역할이다.
3. **새 연결 수락 중단** — 라우팅에서 빠진 뒤에 `server.close()`로 소켓을 닫는다.
4. **in-flight drain 후 종료** — `docker stop` 타임아웃 안에 끝나야 SIGKILL을 피한다.

SIGTERM을 받자마자 소켓부터 닫으면 아직 옛 라우팅을 들고 있는 로드밸런서가 보낸 요청이 커넥션 거부로 떨어진다. K8s에서 preStop sleep 없이 배포할 때 나는 에러 스파이크와 원인이 같다.

## Kubernetes에서의 종료 순서

K8s 공식 문서 기준으로 Pod 종료는 다음 순서로 진행된다.

1. **삭제 요청** — API server가 Pod에 종료 deadline을 기록하고 Pod가 Terminating 상태로 보인다. grace period는 기본 30초다.
2. **kubelet의 로컬 종료 시작** — `preStop` 훅이 있고 `terminationGracePeriodSeconds`가 0이 아니면 kubelet이 훅을 먼저 실행한다. 훅이 grace period를 넘기면 kubelet은 2초짜리 일회성 연장을 요청한다. 그 다음 각 컨테이너의 PID 1에 SIGTERM을 보낸다.
3. **동시에 진행되는 엔드포인트 제거** — kubelet이 종료를 시작하는 것과 **동시에** control plane이 그 Pod를 EndpointSlice에서 제거할지 평가한다. 종료 중인 엔드포인트는 `ready`가 false가 되어 로드밸런서가 사용하지 않는다.
4. **grace period 만료** — 그때까지 컨테이너가 살아 있으면 kubelet이 SIGKILL을 보낸다. 이후 Pod는 종료 phase로 전이되고 API server에서 삭제된다.

### readiness 실패 전파 지연과 preStop sleep

3번이 문제의 핵심이다. 엔드포인트 제거는 SIGTERM 전달 **이후에** 일어나는 것이 아니라 **병행**한다. 그리고 EndpointSlice 갱신이 각 노드의 kube-proxy나 ingress, 외부 로드밸런서의 라우팅 규칙에 반영되기까지는 전파 시간이 걸린다.

즉 앱이 SIGTERM을 받자마자 리스닝 소켓을 닫으면, 아직 옛 라우팅 정보를 들고 있는 클라이언트가 보낸 요청이 갈 곳을 잃는다. 커넥션 거부나 502로 나타나고, 배포할 때마다 짧은 에러 스파이크가 찍히는 전형적인 원인이다.

여기서 `preStop`의 성질이 해법이 된다. 공식 문서는 preStop 훅이 종료 신호와 비동기로 실행되지 않으며 **훅이 끝나야 TERM 신호를 보낼 수 있다**고 명시한다. 따라서 preStop에 짧은 sleep을 두면 그 시간만큼 SIGTERM 전달이 늦춰지고, 앱은 라우팅 전파가 끝날 때까지 계속 서빙한다. K8s는 이 용도로 `Sleep` 핸들러를 제공한다.

sleep 길이는 엔드포인트 전파에 걸리는 실제 시간을 기준으로 잡는다. 근거 없이 길게 잡으면 배포만 느려진다.

### terminationGracePeriodSeconds와의 관계

주의할 함정이 있다. **grace period 카운트다운은 preStop 훅 실행 전에 이미 시작된다.** 공식 문서가 드는 예가 그대로 함정이다. grace period가 60초, preStop이 55초, 컨테이너가 정상 종료에 10초를 쓴다면 합이 65초라서 컨테이너는 정상 종료를 마치기 전에 죽는다.

따라서 예산 배분은 이렇게 계산한다.

```text
terminationGracePeriodSeconds >= preStop sleep + drain 최대 시간 + 리소스 정리 시간 + 여유
```

- preStop sleep을 늘렸으면 `terminationGracePeriodSeconds`도 같이 늘려야 한다. 하나만 바꾸면 drain 시간이 잘려나간다.
- 애플리케이션 강제 종료 타이머는 grace period보다 **짧게** 잡는다. 그래야 SIGKILL로 죽는 대신 앱이 스스로 정리하고 나갈 수 있고, 로그도 남는다.
- 오래 걸리는 배치성 작업을 요청 처리 경로에 두면 이 예산 안에 들어오지 않는다. 큐로 분리하는 것이 정석이다.

## 타임아웃 설정

graceful shutdown에도 제한 시간을 두어야 한다. 무한 대기하면 배포가 멈출 수 있다.

- Docker: `docker stop`은 기본적으로 SIGTERM을 보내고, Linux 컨테이너 기준 10초(Windows 컨테이너는 30초)를 기다린 뒤 SIGKILL로 강제 종료한다. `-t`로 조정하고 `-1`이면 타임아웃 없이 기다린다. Compose에서는 `stop_grace_period`로 서비스별 대기 시간을 지정한다.
- K8s: `terminationGracePeriodSeconds` (기본 30초)
- 애플리케이션 레벨: `setTimeout`으로 강제 종료 타이머 설정

## 면접 포인트

Q. Graceful shutdown을 왜, 어떻게 구현했는가?
- SIGTERM/SIGINT 핸들러 등록
- 스케줄러 → HTTP 서버 → DB 커넥션 순으로 정리
- 배포 시 처리 중인 요청 중단 없이 무중단 전환

Q. Docker에서 graceful shutdown이 안 되는 경우는?
- PID 1이 셸이면 SIGTERM이 앱까지 전달되지 않는다. exec form, `exec "$@"`, init 프로세스는 [[Container-Entrypoint-Signals|컨테이너 엔트리포인트와 시그널]] 참고.

## 출처

- [Kubernetes 공식 문서, Pod Lifecycle (Termination of Pods)](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)
- [Kubernetes 공식 문서, Container Lifecycle Hooks (PreStop)](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [Docker 공식 문서, docker container stop](https://docs.docker.com/reference/cli/docker/container/stop/)
- [Node.js 공식 문서, HTTP (server.close, server.closeIdleConnections)](https://nodejs.org/api/http.html#serverclosecallback)

## 관련 문서
- [[Container-Entrypoint-Signals|컨테이너 엔트리포인트와 시그널 (PID 1, exec form, init)]]
- [[Docker]]
- [[Docker-Compose|Docker Compose]]
- Zero-downtime deployment (작성 예정: `Zero-Downtime-Deployment`)
