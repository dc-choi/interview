---
tags: [web, realtime, socket-io, websocket, kubernetes, redis]
status: done
verified_at: 2026-11-18
category: "Web - 실시간"
aliases: ["Socket.IO Multi-Pod Operations", "다중 Pod 소켓 서버 운영"]
---

# Socket.IO 서버를 여러 Pod에서 운영하기

소켓 연결은 그 연결을 받은 Pod의 프로세스가 소켓 객체로, 커널이 네트워크 자원으로 붙잡고 있다. 연결 자체를 공유 저장소로 옮길 수 없으므로 여러 Pod 구성에서는 이벤트 발송 요청을 받은 Pod와 수신자의 연결을 가진 Pod가 다를 수 있다. 다중 Pod 소켓 서버의 설계는 이 차이를 메우는 이벤트 전달 경로와, 연결을 끊고 다시 받는 시점을 통제하는 운영 장치로 나뉜다.

## 연결 위치를 다루는 두 방식

| 축 | 위치 레지스트리와 직접 호출 | 모든 Pod 브로드캐스트 |
| --- | --- | --- |
| 동작 | 접속 시 사용자가 어느 서버에 붙었는지 저장소에 기록하고, 발송 때 조회해 그 서버의 내부 API를 호출 | 발송 요청을 받은 Pod가 공유 채널에 이벤트를 쓰고, 모든 Pod가 읽어 자기 연결에만 전달 |
| 장점 | 대상 서버에만 요청을 보낸다 | 위치 정보를 관리하지 않아 구조가 단순하고 Socket.IO adapter 흐름과 맞는다 |
| 비용 | 접속, 해제, 서버 장애, 다른 Pod로의 재접속마다 위치 정보를 실제 연결과 맞춰야 한다. 직접 호출하려면 서버를 개별로 지정할 수 있어야 한다(서버별 큐나 채널로 대신할 수 있다) | 이벤트 하나를 모든 Pod가 읽으므로 Pod 수와 발송량의 곱으로 비용이 는다 |

발표 환경은 서버별 고정 주소를 둘 수 없어 브로드캐스트를 택했다. 브로드캐스트 비용은 미리 계산해 수용 여부를 정한다. 예를 들어 Pod 50개에 500바이트 이벤트를 초당 1,000건 보내면 저장소에서 Pod 전체로 나가는 양은 50 x 500B x 1,000/s = 약 25MB/s다. 이 수준을 감당할 수 있으면 위치 정합성 관리의 복잡도를 브로드캐스트 비용과 바꾼다. 채팅처럼 방 단위 증폭이 큰 경우의 비교와 혼합 기준은 [[Realtime-Chat-Architecture-Delivery-and-Storage|채팅 메시지 전달 경로]]에서 다룬다.

## Socket.IO adapter와 Redis Streams

Adapter는 모든 클라이언트나 그 일부에 이벤트를 브로드캐스트하는 서버 쪽 구성 요소다. 서버가 여러 대면 기본 인메모리 adapter를 다른 구현으로 바꿔야 이벤트가 모든 클라이언트로 라우팅된다. Socket.IO 팀이 관리하는 구현에는 Redis, Redis Streams, MongoDB, Postgres, Cluster와 클라우드 메시징 서비스용 adapter가 있다. 별도 저장소가 필요한 adapter는 그 저장소의 운영 부담도 함께 고른다.

Redis Streams adapter는 Redis stream 하나(기본 `streamName`은 `socket.io`, `streamCount`는 1)로 서버 사이에 브로드캐스트 패킷을 전달한다. 각 서버는 XREAD로 읽으며 기본 `readCount`는 100, `blockTimeInMs`는 5,000이다.

- 소비자 그룹처럼 메시지를 나눠 처리하는 구조가 아니다. 각 Pod가 마지막으로 읽은 항목 ID를 따로 기억하고, 읽어도 항목이 지워지지 않으므로 모든 Pod가 같은 항목을 읽는다.
- 공식 문서는 Redis 서버와의 일시적인 연결 끊김을 처리하고 패킷 손실 없이 stream을 이어 읽는 점을 Pub/Sub 기반 Redis adapter와의 차이로 든다. Pub/Sub은 끊긴 동안의 메시지를 놓칠 수 있다. 이 이어 읽기는 stream으로 전달되는 일반 브로드캐스트에 해당한다.
- stream은 `maxLen` 기본 10,000으로 근사 trimming된다. 끊긴 동안 쌓인 항목이 이 길이를 넘으면 앞부분은 이어 읽을 수 없다고 보는 것이 안전하다(해석).
- adapter 0.3.0(2026-02)부터는 `fetchSockets`, `serverSideEmit` 같은 일시적 요청을 stream 대신 Redis Pub/Sub으로 보내고 시작 시 채널을 구독한다. 발표 환경은 Pub/Sub을 지원하지 않는 Redis 호환 저장소에서 Streams adapter를 골랐지만, 그런 저장소에서 0.3.0 이상을 쓸 수 있는지는 따로 확인해야 한다.
- 발표에서는 위치 기록 로직 없이 쓰면 Pub/Sub adapter도 모든 서버로 브로드캐스트하므로 두 후보의 기능 차이가 작고 끊김 뒤 이어 읽기가 선택 이유였다고 판단했다. 이는 기본 Redis adapter에 해당하며, sharded Redis adapter(Redis 7.0 이상)의 dynamic 구독 모드는 방을 가진 서버에만 알리도록 채널을 나눈다.

HTTP long-polling을 켠 채 여러 서버를 쓰면 adapter와 별개로 sticky session이 필요하다. 클라이언트를 WebSocket 전용 전송으로 두면 sticky session이 필요 없지만, 제한적인 네트워크의 클라이언트가 접속하지 못할 수 있다.

## 어느 Pod에서든 접속을 검증하는 일회용 토큰

1. 앞단 서비스가 사용자와 채널을 정해 소켓 서버의 내부 API로 접속 URL 발급을 요청한다.
2. 요청을 받은 Pod가 일회용 토큰과 사용자, 채널 정보를 Redis에 저장하고 토큰이 든 URL을 반환한다.
3. 클라이언트가 그 URL로 접속하면 접속을 받은 Pod(발급한 Pod와 다를 수 있다)가 토큰을 읽기와 삭제를 한 트랜잭션으로 소비해 검증하고 연결을 채널에 가입시킨다.

Redis에는 접속 검증용 토큰과 Pod 사이 전파용 stream만 두고, 소켓 목록, 채널별 소켓 목록과 소켓별 채널 목록은 각 Pod 메모리에 둔다. 채널은 서비스와 사용자를 조합한 키로 같은 사용자의 휴대폰과 PC 연결을 묶는다. 외부에는 소켓 접속 경로만 열고 발급, 발송, 세션 조회와 강제 종료 같은 내부 API는 사내 도메인으로 분리한다. 각 Pod는 자기 연결만 알기 때문에 세션 조회는 모든 Pod에 물어 응답을 모으는 구조가 되고, 상한 시간(예: 5초)을 둔다.

### 전달 보장과 재접속

기본 전달은 at-most-once로 둘 수 있다. 연결 문제로 이벤트가 유실될 수 있고 재접속해도 누락분을 다시 보내지 않으므로, 클라이언트는 알림 신호를 받으면 실제 데이터를 API로 조회하는 구조가 맞다. 끊기면 URL을 다시 발급받아 새로 접속하는 것을 원칙으로 하면 이전 연결 복구 절차가 필요 없다. 누락 복구가 필요한 데이터는 [[Realtime-Sync-Recovery|실시간 동기화와 재연결 복구]]처럼 커서 기반 재조회로 설계한다.

Socket.IO의 connection state recovery(서버 v4.6.0 이상)는 예기치 않은 끊김 뒤 세션과 놓친 패킷을 복구하려 하지만 항상 성공하지는 않는다. 클라이언트 offset을 초기화하려면 서버가 이벤트를 한 번 이상 보내야 한다. adapter별로 지원이 달라 Redis Streams와 인메모리 adapter는 지원하고 Pub/Sub 기반 Redis adapter는 지원하지 않는다. v2 클라이언트를 받기 위해 `allowEIO3`(기본 `false`)를 켜는 환경에서는 구버전 클라이언트가 이 기능을 지원하는지 따로 확인한다.

## 경로 전체의 유휴 타임아웃과 하트비트

연결은 CDN이나 앞단 프록시, 로드밸런서, 인그레스, 사이드카를 거친다. 앱이 연결을 유지해도 중간 구간이 유휴로 판단하면 끊으므로 모든 구간의 idle timeout을 확인하고, 가장 짧은 구간보다 충분히 짧은 하트비트가 경로 전체를 지나가게 한다.

- Socket.IO 서버의 기본값은 `pingInterval` 25,000ms, `pingTimeout` 20,000ms이며 `pingInterval`은 핸드셰이크의 open 패킷으로 클라이언트에 전달된다.
- Engine.IO v4에서는 서버가 ping을 보내고 클라이언트가 pong으로 답한다. v3에서는 반대였다. 브라우저 타이머가 지연되는 문제 때문에 v4에서 방향을 바꿨으므로, v3 클라이언트를 받는 서버와 부하 시험 스크립트는 클라이언트가 ping을 보내는 흐름을 따라야 한다.
- 소켓 외 내부 HTTP API도 keep-alive 시간을 맞춘다. 인그레스 upstream의 유휴 시간이 300초면 앱 쪽은 그보다 길게(예: 305초) 두어 앱이 먼저 연결을 닫다가 요청과 충돌하는 경우를 줄인다.

## 연결 수 기준 오토스케일과 재분산

연결을 오래 유지하고 발송량은 적은 소켓 서버는 CPU와 메모리보다 연결 수에 비례하는 자원(사이드카의 포트와 메모리, 인그레스 연결 한도)에 먼저 닿을 수 있다. 발표 환경에서는 3만 연결에서도 앱 CPU와 메모리에 여유가 있었다. 그래서 Pod별 소켓 연결 수를 HPA의 사용자 정의 지표로 쓰고 CPU와 메모리는 보조 관측 지표로 둔다. HPA는 Pod별 사용자 정의 지표를 모든 Pod의 평균으로 계산해 목표값과 비교한다.

- 앱이 받는 연결 상한은 HPA 목표보다 높게 둔다(예: 목표 2만, 상한 2만 5천). 연결이 빠르게 늘면 새 Pod가 뜨기 전 목표를 넘으므로 목표를 여유 있게 낮춘다.
- 확장은 빠르게, 축소는 천천히 한다. 줄어드는 Pod의 연결은 모두 재접속해야 하기 때문이다. HPA의 축소 기본 안정화 시간은 300초이며 behavior policy로 `periodSeconds`(최대 1800초) 구간마다 제거할 비율이나 Pod 수를 제한할 수 있다.
- 새 Pod는 이후의 신규 접속만 받고 기존 연결은 원래 Pod에 남는다. 연결에 최대 수명(예: 6시간)을 두고 서버가 닫으면 클라이언트가 URL을 다시 받아 접속하면서 새 Pod로도 분산된다.
- 수명에 지터(예: ±20%면 4.8~7.2시간)를 주어 같은 시기에 접속한 연결의 재접속이 한꺼번에 몰리지 않게 한다. 원리는 [[Retry-Backoff-Jitter|지수 백오프와 지터]]와 같다.

수명 상한은 연결이 실제로 오래 사는 경우에만 동작한다. 모바일 웹처럼 짧은 연결이 자주 생기고 끊기는 트래픽(발표 운영 지표 기준 평균 약 25초, 중앙값 약 6초)에서는 자연 재접속이 재분산을 대신하고, 대신 발급 API와 토큰 저장소의 처리량이 용량 기준이 된다(해석).

## 종료할 때 연결을 나눠 끊기

Pod를 교체하면 그 Pod의 연결은 결국 끊긴다. 수만 개를 한꺼번에 끊으면 URL 재발급, 인증, Redis 접근과 연결 수립이 동시에 몰리므로 드레인 단계에서 종료를 시간에 걸쳐 나눈다. [[Graceful-Shutdown|Graceful Shutdown]]의 일반 절차를 장기 연결에 맞춘 형태다.

1. SIGTERM을 받으면 readiness를 내린다.
2. 라우팅에서 빠지는 동안 들어오는 접속을 처리하도록 짧은 유예(예: 10초) 동안은 신규 접속을 받는다.
3. 이후 신규 접속을 거절하고 기존 연결을 정해진 시간(예: 60초)에 걸쳐 종료한다. 매초 남은 연결 수를 남은 시간으로 나눠 종료 대상을 정하고, 같은 묶음 안에서도 종료 시점을 1초 안에 흩는다. 2만 연결을 60초에 나누면 초당 약 330개다.

전체 절차는 `terminationGracePeriodSeconds` 안에 끝나야 한다. Kubernetes 기본값은 30초이므로 이런 드레인에는 값을 늘려야 한다. 유예 기간이 지나면 남은 프로세스에 KILL 신호가 간다. 발표는 기본 300초 안에 끝나게 구성했다고 말했는데, 이는 사내 플랫폼 설정으로 보이며 확인하지 못했다.

### 배포 방식이 앱 밖에서 연결을 끊는 경우

앱의 드레인 로직은 앱이 닫는 연결만 통제한다. 연결이 지나가는 사이드카 프록시가 설정 갱신으로 연결을 닫으면 앱은 정상이어도 연결이 끊긴다. 발표 환경(사내 Kubernetes 플랫폼, Envoy 사이드카, 동시 연결 10만)에서 같은 조건으로 비교한 결과는 다음과 같다.

| 배포 방식 | 결과 |
| --- | --- |
| 카나리(트래픽 20%, 50%, 100%) | 교체 대상이 아닌 기존 Pod의 사이드카 리스너 설정까지 갱신되고 약 45초 뒤 기존 설정의 연결이 일괄 종료됐다. 10만 연결 전부가 끊기고 Pod 삭제 때 약 8만이 한 번 더 끊겨 누적 약 18만, 발급 API의 429 응답 약 6만 5천 건 |
| 롤링 업데이트 | 기존 Pod의 사이드카 설정이 유지되어 사이드카로 인한 종료 0건, 429 응답 0건, 재접속 95%가 0.2초 안에 완료 |

이 차이는 해당 플랫폼의 배포 구현에서 나온 결과이며 카나리 일반의 성질로 확대하지 않는다. 장기 연결 서버는 배포 전략마다 실제로 끊기는 연결 범위와 재접속 부하를 측정한 뒤 고른다.

## 용량 한계가 앱 밖에서 먼저 오는 경우

발표의 부하 시험(k6로 기존 SDK의 Engine.IO v3 흐름 구현, 앱 컨테이너 CPU 2코어와 메모리 4GB) 기준이다.

- Pod 하나의 연결이 약 2만 8천에서 멈췄다. 앱 메모리는 여유가 있었고, 사이드카가 루프백으로 앱에 연결할 때 쓰는 임시 포트가 소진된 것이었다. Linux `ip_local_port_range`의 기본값 32768~60999는 약 2만 8천 개로 이 수치와 거의 같다. 같은 출발 주소에서 같은 목적지 주소와 포트로 향하는 연결은 출발 포트로만 구분되므로 이 범위가 상한이 된다(해석).
- 포트 범위를 넓히자 약 3만 7천 연결에서 사이드카가 메모리 한도 2GB에 닿아 OOM으로 종료됐다. 같은 시점 앱 메모리는 약 750MB였다.
- 여러 Pod 시험은 약 7만 7천에서 멈췄고 원인은 인그레스의 최대 연결 설정(3만, 인스턴스별 값인지 전체 값인지는 발표에 없다)이었다. 증설 뒤 10만 연결을 5 Pod로, 14만을 6 Pod로 거절 없이 유지했다.
- 10만 연결 상태에서 단건 발송(초당 1만 건까지)과 벌크 발송(채널 1,000개 지정 발송 초당 100회) 모두 도달률 99.9% 이상, 수신 지연 P99 1초 이내 기준을 만족했다.
- 10만 연결을 한 번에 끊었을 때 Pod당 초당 발급 상한 1,000건에서 약 30초 안에 회복했다. 발급 상한을 500으로 둔 조건에서 신규 접속 유예 10초는 거절을 2,300여 건에서 126건으로 줄였고, 상한 1,000에서는 유예 없이도 거절이 없었다. 발급 여유가 적을수록 유예의 효과가 커진다.
- 10만 연결을 약 50시간 유지하며 매시간 발송한 장시간 시험에서 앱 메모리의 지속 증가는 없었고 서버와 클라이언트의 연결 수가 일치했다.

운영 용량은 앱뿐 아니라 사이드카, 인그레스, 발급 경로의 한도를 함께 측정해 정한다. 부하 시험 도구 구성은 [[Load-Test-K6|k6 부하 테스트]]를 따른다.

## 백엔드 전환

기존 소켓 백엔드에서 옮길 때는 접속 URL을 발급하는 앞단에서 사용자 ID 해시로 대상을 나눠 비율을 1%, 20%, 50%, 100%로 올린다. 전환 중에는 두 백엔드의 연결이 공존하므로 발송할 때 양쪽 세션을 확인해 연결이 있는 쪽으로 보낸다.

## 체크포인트

- 연결 위치 관리 비용과 모든 Pod가 읽는 비용을 Pod 수와 발송량으로 계산해 비교했는가
- Pub/Sub adapter와 Streams adapter의 끊김 뒤 동작 차이, stream 길이 상한을 알고 있는가
- 경로의 모든 idle timeout보다 하트비트 간격이 짧은가, 구버전 클라이언트의 ping 방향을 고려했는가
- HPA 지표가 실제 병목 자원(연결 수)을 따르는가, 축소 속도를 제한했는가
- 수명 지터와 드레인 분산으로 재접속을 시간에 흩었는가, 종료 유예 시간 안에 끝나는가
- 배포 방식별로 앱 밖(사이드카, 인그레스)에서 끊기는 연결을 측정했는가

## 출처

- [Socket.IO 서버를 여러 Pod에서 운영하기 — NAVER D2](https://www.youtube.com/watch?v=ElJQpZYFOMo)
- [Socket.IO, Adapter](https://socket.io/docs/v4/adapter/)
- [Socket.IO, Redis Streams adapter](https://socket.io/docs/v4/redis-streams-adapter/)
- [socket.io-redis-streams-adapter 0.3.0 — GitHub Releases](https://github.com/socketio/socket.io-redis-streams-adapter/releases/tag/0.3.0)
- [Socket.IO, Redis adapter](https://socket.io/docs/v4/redis-adapter/)
- [Socket.IO, Using multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/)
- [Socket.IO, Server options](https://socket.io/docs/v4/server-options/)
- [Socket.IO, Connection state recovery](https://socket.io/docs/v4/connection-state-recovery)
- [Socket.IO, Engine.IO protocol](https://socket.io/docs/v4/engine-io-protocol/)
- [Kubernetes, Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes, Pod termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-termination/)
- [Kubernetes, Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Linux kernel, IP Sysctl](https://docs.kernel.org/networking/ip-sysctl.html)

## 관련 문서

- [[WebSocket|WebSocket]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[Realtime-Chat-Architecture-Delivery-and-Storage|채팅 메시지 전달 경로와 이력 저장소]]
- [[Realtime-Sync-Recovery|실시간 동기화와 재연결 복구]]
- [[NestJS-WebSocket-Gateway-Scaling-and-Operations|NestJS WebSocket Gateway 확장과 운영]]
- [[Redis-Streams-PubSub|Redis Streams와 Pub/Sub]]
- [[Graceful-Shutdown|Graceful Shutdown]]
- [[Retry-Backoff-Jitter|지수 백오프와 지터]]
- [[Load-Test-K6|k6 부하 테스트]]
