---
tags: [reliability, shutdown, messaging]
status: done
verified_at: 2026-10-12
category: "안정성엔지니어링(Reliability)"
aliases: ["Graceful Shutdown", "우아한 종료"]
---

# Graceful Shutdown

프로세스가 종료 신호를 받았을 때, 진행 중인 작업을 안전하게 마무리하고 리소스를 정리한 뒤 종료하는 패턴이다.

## 왜 필요한가

프로세스를 즉시 종료(kill -9)하면:
- 처리 중인 HTTP 요청이 중단되어 클라이언트에 에러 반환
- 미커밋 DB 트랜잭션은 연결 종료 시 보통 rollback되지만, 클라이언트가 결과를 모호하게 받아 같은 작업을 중복 실행할 수 있음
- DB 밖의 API 호출, 메시지 발행과 파일 쓰기까지 한 작업은 일부 부수효과만 끝난 채 중단될 수 있음
- 스케줄러/크론 작업이 중간에 끊겨 재실행 또는 보상 기준이 불명확해질 수 있음
- OS는 로컬 파일 descriptor와 socket을 회수하지만, 사용자 공간에 버퍼링한 로그와 출력은 유실되고 상대 시스템은 연결 종료를 늦게 감지할 수 있음

## 구현 흐름

1. **종료 신호 수신** — `SIGTERM`(정상 종료) 또는 `SIGINT`(Ctrl+C) 포착. 핸들러는 중복 호출에 안전해야 한다. 배포 중 신호가 두 번 오면 정리 로직이 두 번 돈다.
2. **신규 수신 중단** — 배포 도구나 service discovery에서 대상을 deregistration/draining으로 전환하고 새 요청 제거를 확인한 뒤 `close()`로 새 연결 수락을 중단한다. health check 실패는 보조 신호일 뿐, 모든 대상이 unhealthy인 ALB/NLB fail-open에서는 트래픽 제거를 뜻하지 않는다. 메시지 컨슈머와 스케줄러도 이 시점에 새 작업을 더 받지 않도록 멈춘다.
3. **in-flight drain** — 이미 받은 요청과 이미 꺼낸 메시지를 처리 완료까지 기다린다. deadline 안에 끝내지 못할 미착수 메시지는 돌려보낸다(아래 메시지 컨슈머 절). 여기서 흔히 걸리는 것이 keep-alive 커넥션이다. Node 19 미만에서는 `closeIdleConnections()`(v18.2.0 추가)를 함께 호출해야 유휴 커넥션이 끊겼고, 19부터는 `close()`가 반환 전에 유휴 커넥션을 먼저 닫는다. 다만 요청을 보내는 중이거나 응답을 기다리는 커넥션은 그대로 남으므로 강제 종료 타이머는 여전히 필요하다.
4. **리소스 정리** — DB 커넥션 풀, 외부 클라이언트, 파일 핸들을 순서대로 닫는다. 진행 중인 작업이 아직 DB를 쓰므로 **DB는 반드시 마지막**이다.
5. **프로세스 종료** — 정상 정리가 끝나면 `process.exitCode = 0`만 설정해 event loop가 비워진 뒤 자연 종료한다. grace period보다 짧은 deadline을 함께 두고, 그때까지 drain이 끝나지 않은 실패 경로에서만 `process.exit(1)`로 무한 대기를 끊는다.

## Node.js/Express 구현 패턴

종료 시 정리해야 할 리소스:
- **HTTP 서버** — `server.close()`로 새 요청 수락 중단, 기존 요청 완료 대기
- **스케줄러** — `node-schedule`의 `gracefulShutdown()`으로 예약된 작업 정리
- **DB 커넥션** — Prisma의 `$disconnect()`로 커넥션 풀 정리
- **Query Builder** — Kysely의 `destroy()`로 커넥션 반환

정리 순서: 스케줄러와 메시지 컨슈머(새 작업 방지) → HTTP 서버(새 요청 차단) → 진행 중 작업 마무리와 ack, 커밋 → DB(마지막에 정리). 컨슈머 쪽 세부는 아래 메시지 컨슈머와 백그라운드 작업 절을 따른다.

## SIGTERM vs SIGINT

| 신호 | 발생 상황 | 기본 동작 |
|---|---|---|
| `SIGTERM` | `kill <pid>`, Docker stop, K8s Pod 종료 | 종료 (포착 가능) |
| `SIGINT` | Ctrl+C | 종료 (포착 가능) |
| `SIGKILL` | `kill -9` | **즉시 종료 (포착 불가)** |

Docker는 `docker stop` 시 SIGTERM을 먼저 보내고, 대기 시간이 지나도 종료되지 않으면 SIGKILL로 강제 종료한다. 기본 대기 시간은 아래 타임아웃 설정 절 참고.

## Docker + Health Check와의 관계

Docker 자체에는 트래픽을 빼는 기능이 없다. 앞단 로드밸런서나 service discovery에서 대상을 deregistration/draining으로 전환하고 새 요청 제거를 확인한 뒤 소켓을 닫는 순서를 앱과 배포 도구가 함께 만들어야 한다. health check 실패는 정상 대상이 남아 있을 때 후보를 제외하는 신호일 수 있지만, ALB/NLB가 모든 대상 unhealthy 상태에서 fail-open할 수 있으므로 단독 근거가 될 수 없다.

1. **대상 deregistration 시작** — 배포 도구가 먼저 대상 그룹이나 service discovery에서 인스턴스를 빼고 draining 상태를 확인한다. 이 시점에도 리스닝 소켓은 열어 두고 들어오는 요청을 정상 처리한다.
2. **새 요청 제거 확인** — deregistration delay와 라우팅 전파를 기다린다. health check만으로 판단한다면 정상 대상이 남아 있는지와 load balancer의 fail-open 조건을 함께 확인한다.
3. **새 연결 수락 중단** — 새 요청이 제거된 것을 확인한 뒤 `server.close()`로 소켓을 닫는다.
4. **in-flight drain 후 종료** — `docker stop` 타임아웃 안에 끝나야 SIGKILL을 피한다.

SIGTERM을 받자마자 소켓부터 닫으면 아직 옛 라우팅을 들고 있는 로드밸런서가 보낸 요청이 커넥션 거부로 떨어진다. K8s에서 preStop sleep 없이 배포할 때 나는 에러 스파이크와 원인이 같다.

## Kubernetes에서의 종료 순서

K8s 공식 문서 기준으로 Pod 종료는 다음 순서로 진행된다.

1. **삭제 요청** — API server가 Pod에 종료 deadline을 기록하고 Pod가 Terminating 상태로 보인다. grace period는 기본 30초다.
2. **kubelet의 로컬 종료 시작** — `preStop` 훅이 있고 `terminationGracePeriodSeconds`가 0이 아니면 kubelet이 훅을 먼저 실행한다. 훅이 grace period를 넘기면 kubelet은 2초짜리 일회성 연장을 요청한다. 그 다음 각 컨테이너의 PID 1에 SIGTERM을 보낸다.
3. **동시에 진행되는 엔드포인트 상태 갱신** — kubelet이 종료를 시작하는 것과 **동시에** control plane이 EndpointSlice를 갱신한다. 종료 중인 엔드포인트는 `terminating=true`, `ready=false`로 표시되어 일반적인 신규 트래픽 대상에서 제외되지만, 이것만으로 모든 트래픽이 끊겼다고 판단하지 않는다.
4. **grace period 만료** — 그때까지 컨테이너가 살아 있으면 kubelet이 SIGKILL을 보낸다. 이후 Pod는 종료 phase로 전이되고 API server에서 삭제된다.

`ProxyTerminatingEndpoints`(Kubernetes 1.28부터 stable)가 활성화되고 `externalTrafficPolicy: Local`인 경우, 노드의 로컬 엔드포인트가 모두 종료 중이면 kube-proxy는 그중 아직 서빙 가능한 엔드포인트로 트래픽을 전달할 수 있다. 외부 로드밸런서의 health check가 반영될 때까지 drain을 돕는 정상 동작이며, 아래의 라우팅 전파 지연과는 별개의 조건이다.

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

## 메시지 컨슈머와 백그라운드 작업

`server.close()`의 완료 콜백은 HTTP 연결이 모두 끝났다는 뜻일 뿐이다. 큐에서 꺼낸 메시지, 워커가 잡은 job과 응답 뒤에 시작한 비동기 작업은 각자 멈추고 기다리는 절차가 따로 필요하다.

1. **새 작업 수신 중단** — 폴링 루프를 멈춘다. Kafka Java 컨슈머(`KafkaConsumer`, 4.3 문서 기준)는 thread-safe가 아니므로, 종료 신호를 받은 다른 스레드는 종료 플래그를 세우고 `wakeup()`만 호출한 뒤 deadline 안에서 루프 스레드가 끝나기를 기다린다. JVM의 shutdown hook이 바로 반환하면 JVM이 종료되면서 루프 스레드의 마지막 커밋과 `close()`가 잘릴 수 있다. 막혀 있던 `poll()`이나 그 뒤의 블로킹 호출이 `WakeupException`을 던지면 루프 스레드가 정리하고 `close()`한다. 그 호출이 `commitSync()`였다면 커밋이 이 예외로 끊기므로 정리 단계에서 다시 커밋한다. RabbitMQ는 `basic.cancel`로 새 전달을 막는다. 취소 전에 이미 전달된 메시지는 버려지지도 재큐잉되지도 않으므로, deadline 안에 끝낼 메시지는 처리하고 ack하며 손대지 않은 메시지는 `basic.nack`으로 돌려보내거나 채널을 닫아 재큐잉한다. RabbitMQ 4.3 이상의 quorum queue에서는 `basic.nack` 반환은 재전달 횟수에 들어가지 않고 확인되지 않은 메시지를 남긴 채널 종료는 들어가므로 nack을 우선한다. SQS 폴링 워커는 손대지 않은 메시지의 visibility timeout을 0으로 바꿔 바로 돌려보낼 수 있다. BullMQ의 `worker.close()`는 워커가 새 job을 받지 않게 한 뒤 진행 중인 job이 끝나거나 실패할 때까지 기다린다.
2. **처리 성공 뒤 ack와 커밋** — 처리 전에 위치를 저장하고 죽으면 메시지를 잃고(at-most-once), 처리 뒤에 저장하는데 그 사이에 죽으면 다시 처리한다(at-least-once). Kafka에서 커밋하는 offset은 다음에 읽을 위치다. 처리를 다른 스레드에 넘기면서 자동 커밋을 켜 두면 커밋이 처리보다 앞서 레코드를 놓칠 수 있으므로, 자동 커밋을 끄고 처리가 끝난 offset만 커밋한다(파티션 pause와 처리 뒤 커밋은 [[Consumer-Group|컨슈머 그룹]]). 파티션을 빼앗기기 전의 커밋은 `ConsumerRebalanceListener.onPartitionsRevoked`에서 하도록 권고된다. `close()`는 정리에 기본 30초까지 기다리고 자동 커밋을 켠 경우 그 안에서 현재 offset 커밋을 시도한다. 이 기본값은 Kubernetes의 기본 grace period(30초)와 같으므로, preStop과 drain에 쓴 시간을 빼고 남은 예산에 맞춰 `CloseOptions`로 시간을 지정한다. 수동 커밋을 쓰면 처리한 offset을 직접 커밋한 뒤 닫는다. RabbitMQ의 자동 ack 모드는 보내는 즉시 전달에 성공한 것으로 보므로, 전달 도중 연결이 끊기거나 받은 뒤 처리 중에 죽으면 그 메시지는 다시 오지 않는다.
3. **deadline을 넘긴 작업은 다시 온다** — 강제 종료되면 ack하지 않은 작업을 브로커가 다시 내준다. RabbitMQ는 수동 ack에서 확인되지 않은 전달을 채널이나 연결이 닫힐 때 자동으로 재큐잉하고 재전달 표시(문서의 `redeliver` 속성, AMQP 0-9-1 필드명 `redelivered`)를 붙인다. 프로세스 장애도 여기에 포함된다. SQS는 visibility timeout 안에 삭제하지 않은 메시지를 다시 보이게 해 같은 컨슈머나 다른 컨슈머가 받는다. Kafka는 죽은 컨슈머의 heartbeat가 세션 타임아웃 동안 끊기면 그 파티션을 다른 멤버에 넘기고, 새 소유자는 마지막 커밋 위치부터 읽는다. 세션 타임아웃은 classic 그룹 프로토콜에서 컨슈머의 `session.timeout.ms`(기본 45초), consumer 그룹 프로토콜에서 브로커의 `group.consumer.session.timeout.ms`와 그룹 설정 `consumer.session.timeout.ms`가 정한다. 커밋된 offset이 아예 없으면 `auto.offset.reset`(기본 `latest`)을 따르므로 새 소유자가 처리되지 않은 레코드를 건너뛸 수 있다. BullMQ는 lock이 갱신되지 않은 job을 stalled로 보고 대기열로 되돌리며, 기본 `maxStalledCount`(1)를 넘기면 failed로 옮긴다. `worker.close()`에는 자체 타임아웃이 없으므로 앱의 강제 종료 타이머와 함께 쓴다.
4. **중단을 줄일 뿐 완료와 중복 방지는 보장하지 않는다** — 제한 시간을 넘긴 작업은 강제 종료되고, 처리는 끝났지만 ack나 커밋 직전에 끊긴 작업은 한 번 더 처리된다. 컨슈머와 job은 같은 메시지를 두 번 처리해도 결과가 같게 만든다([[At-Least-Once]], [[Idempotent-Consumer|멱등 컨슈머]], [[Idempotency-Key|멱등성 키]]). 같은 메시지에서 계속 죽으면 재전달 상한과 DLQ로 격리한다. RabbitMQ quorum queue는 4.0부터 재전달 상한 기본값이 20이고, 확인되지 않은 메시지를 남긴 채 채널이 닫혀도 횟수에 들어가며, 상한을 넘은 메시지는 DLX가 없으면 버려진다. 그래서 강제 종료가 반복되면 정상 메시지도 사라질 수 있다([[RabbitMQ-Exchange-Routing|RabbitMQ 재시도와 dead letter]]).
5. **요청 밖 비동기 작업은 추적한다** — 응답 뒤에 시작한 Promise나 타이머 작업은 진행 목록에 올려 종료 때 기다리고, 잃으면 안 되는 작업은 처음부터 큐에 넣어 재처리 경로를 둔다. 큐로 옮겨도 워커 프로세스 역시 종료 예산 안에서 끝나야 하므로, SIGTERM 시점에 남은 처리 시간이 예산을 넘는 job은 끊긴다. 워커의 grace period를 가장 긴 job보다 길게 두거나, job을 나누거나 중간 결과를 체크포인트로 남긴다. BullMQ는 기본 `maxStalledCount`가 1이라 두 번째로 멈춘 job은 failed로 옮겨지므로 이 값도 함께 정하고, job 타임아웃 기능을 따로 제공하지 않으므로 처리 함수 안에서 제한 시간을 직접 건다.

SQS 폴링 워커의 종료 골격은 [[SQS-Consumer-Lambda-vs-ECS|SQS 컨슈머 선택]], 처리 중 visibility 연장은 [[SQS-Worker-Reliability|SQS 워커 신뢰성]], kafkajs 기준 Kafka 커밋 설정은 [[MQ-Kafka-Consumer|Kafka 컨슈머]]에서 다룬다.

## 면접 포인트

Q. Graceful shutdown을 왜, 어떻게 구현했는가?
- SIGTERM/SIGINT 핸들러 등록
- 스케줄러와 컨슈머 → HTTP 서버 → 진행 중 작업의 ack와 커밋 → DB 커넥션 순으로 정리
- 라우팅 전파와 drain deadline 안에서 처리 중 요청의 중단을 최소화
- 도입 이유는 중간 종료 위험, 신규 유입 중단, 진행 중 작업 마무리, 재처리와 멱등성 순서로 설명한다

Q. Docker에서 graceful shutdown이 안 되는 경우는?
- PID 1이 셸이면 SIGTERM이 앱까지 전달되지 않는다. exec form, `exec "$@"`, init 프로세스는 [[Container-Entrypoint-Signals|컨테이너 엔트리포인트와 시그널]] 참고.

Q. Graceful shutdown을 넣으면 작업 유실과 중복 처리가 사라지는가?
- 아니다. 제한 시간이 지나면 강제 종료되고, ack나 offset 커밋 전에 끊긴 작업은 다시 전달되므로 멱등 처리가 필요하다.
- 반대로 자동 ack, 처리 스레드에 넘긴 레코드의 자동 커밋, 추적하지 않은 메모리 작업과 DLX나 DLQ 없이 재전달 상한을 넘기는 경우는 유실 경로다.

## 출처

- [Kubernetes 공식 문서, Pod Lifecycle (Termination of Pods)](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)
- [Kubernetes 공식 문서, Container Lifecycle Hooks (PreStop)](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [Kubernetes 공식 문서, Traffic to terminating endpoints](https://kubernetes.io/docs/reference/networking/virtual-ips/#traffic-to-terminating-endpoints)
- [Docker 공식 문서, docker container stop](https://docs.docker.com/reference/cli/docker/container/stop/)
- [Node.js 공식 문서, HTTP (server.close, server.closeIdleConnections)](https://nodejs.org/api/http.html#serverclosecallback)
- [AWS 공식 문서, Application Load Balancer target group health checks](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
- [AWS 공식 문서, Network Load Balancer target group health checks](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html)
- [Apache Kafka 공식 문서, KafkaConsumer (4.3 Javadoc)](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 공식 문서, ConsumerRebalanceListener (4.3 Javadoc)](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html)
- [Apache Kafka 공식 문서, Consumer Configs (4.3)](https://kafka.apache.org/43/configuration/consumer-configs/)
- [Apache Kafka 공식 문서, Group Configs (4.3)](https://kafka.apache.org/43/configuration/group-configs/)
- [Apache Kafka 공식 문서, CloseOptions (4.3 Javadoc)](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/CloseOptions.html)
- [Apache Kafka 공식 문서, Design (Message Delivery Semantics, 4.3)](https://kafka.apache.org/43/design/design/)
- [RabbitMQ 공식 문서, Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ 공식 문서, Consumers (Cancelling a Consumer)](https://www.rabbitmq.com/docs/consumers)
- [RabbitMQ 공식 문서, Quorum Queues (Poison Message Handling)](https://www.rabbitmq.com/docs/quorum-queues)
- [AWS 공식 문서, Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [BullMQ 공식 문서, Graceful shutdown](https://docs.bullmq.io/guide/workers/graceful-shutdown)
- [BullMQ 공식 문서, Stalled Jobs](https://docs.bullmq.io/guide/workers/stalled-jobs)
- [BullMQ 공식 문서, Timeout jobs](https://docs.bullmq.io/patterns/timeout-jobs)
- [worker-options.ts (maxStalledCount 기본값, 2026-10-12 master 기준) — GitHub, taskforcesh/bullmq](https://github.com/taskforcesh/bullmq/blob/master/src/interfaces/worker-options.ts)
- [Java SE 21 공식 문서, Runtime (shutdown hook과 JVM 종료)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Runtime.html)
- [AWS 공식 문서, Amazon SQS ChangeMessageVisibility API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ChangeMessageVisibility.html)
- [Graceful Shutdown, 왜 도입할까요? — YouTube, 개발자 인큐티비](https://www.youtube.com/watch?v=hzTag-rLOrs)

## 관련 문서
- [[Container-Entrypoint-Signals|컨테이너 엔트리포인트와 시그널 (PID 1, exec form, init)]]
- [[Docker]]
- [[Docker-Compose|Docker Compose]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[At-Least-Once|At-Least-Once (재전달과 멱등 처리)]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[SQS-Consumer-Lambda-vs-ECS|SQS 컨슈머 선택 (NestJS 워커의 graceful shutdown)]]
- [[NestJS-Queues|NestJS 큐 (BullMQ)]]
