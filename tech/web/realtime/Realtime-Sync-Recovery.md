---
tags: [web, realtime, sse, websocket, reconnect, snapshot, cursor, heartbeat, freshness]
status: done
verified_at: 2026-10-06
category: "Web - 실시간"
aliases: ["Realtime Sync Recovery", "실시간 상태 복구", "재연결 복구", "스냅샷과 커서", "Snapshot and Cursor", "연결 상태와 동기화 상태"]
---

# 실시간 동기화와 재연결 복구

실시간 화면의 목표는 연결 유지가 아니라 서버 상태를 정한 시간 안에 화면에 반영하는 것이다. 연결이 열려 있다는 사실과 화면이 최신이라는 사실은 다르다. 끊긴 동안 놓친 변경은 다시 연결해 새 이벤트를 받아도 돌아오지 않는다. 그래서 전송 방식을 고르기 전에 얼마나 늦어도 되는지, 어디까지 받았는지, 놓친 것을 어떻게 되찾을지를 먼저 정한다. 전송 방식별 특성은 [[Realtime-Communication-Comparison|실시간 통신 기술 비교]]에 있다.

## 요구를 세 질문으로 정한다

| 질문 | 정할 것 |
|---|---|
| 얼마나 늦어도 되는가 | 서버 확정에서 화면 반영까지의 마감과 그 마감을 지킬 비율 |
| 누가 언제 보내는가 | 서버 통지, 클라이언트 조회, 양방향 명령과 각각의 빈도 |
| 놓친 것을 어떻게 되찾는가 | 최신 상태 재조회, 이벤트 재생, 중복 허용 범위 |

전송 방식이 맡는 구간은 서버에서 브라우저 수신까지다. 수신 뒤 파싱, 상태 반영, 렌더링이 밀리면 네트워크가 빨라도 화면은 늦다. 브라우저 타이머도 마감을 보장하지 않는다. 비활성 탭에는 최소 지연이 강제되고(Firefox 데스크톱 1초), Chrome은 페이지가 5분 넘게 숨겨져 있고 30초 넘게 소리가 없으며 WebRTC를 쓰지 않는 조건에서 5번 이상 이어진 타이머를 1분에 한 번만 확인한다(MDN, 2026-10-06 확인).

## 데이터를 전달 의미로 나눈다

같은 연결로 흐르는 데이터라도 놓쳤을 때와 늦게 왔을 때의 처리가 다르다.

| 종류 | 예 | 놓쳤을 때 | 늦게 왔을 때 | 밀릴 때 |
|---|---|---|---|---|
| 반드시 전달할 이벤트 | 채팅 메시지, 주문 상태 이력, 알림 | 커서 이후를 재생해 되찾는다 | 순서를 맞춰 반영한다 | 순서를 지키며 묶어 처리한다 |
| 최신 값만 의미 있는 상태 | 커서 위치, 시세, 접속자 수 | 현재 값을 다시 조회한다 | 이미 반영한 버전보다 오래됐으면 버린다 | 중간 값을 합쳐 마지막 값만 반영한다 |
| 명령과 결과 | 저장, 결제 요청, 설정 변경 | 요청 ID로 결과를 조회한다 | 요청 ID로 대기 작업에 연결한다 | 멱등 키로 중복 효과를 막는다 |

최신 값 데이터를 이벤트처럼 모두 재생하면 지나간 커서 위치가 뒤늦게 그려져 화면이 오히려 틀어진다. 반대로 이벤트를 최신 값처럼 합치면 메시지가 사라진다. 같은 진행률도 현재 값(70%)으로 보내면 최신 값 데이터지만 증가분(+10%)으로 보내면 하나도 빠지면 안 되는 이벤트가 된다. 상태를 절대값으로 보내면 재조회만으로 복구되는 범위가 넓어진다. 화면 처리가 밀릴 때의 버리기와 합치기는 [[Browser-Main-Thread-Offloading|메인 스레드 작업 덜어내기]]와 같은 기준이다.

## 스냅샷과 커서로 복구한다

재연결 복구는 현재 상태를 담은 스냅샷과, 그 스냅샷이 어느 지점까지 반영했는지 가리키는 커서를 함께 다룬다.

```text
GET /jobs           → { items: [...], cursor: "901" }   스냅샷과 그 경계
SUBSCRIBE from=901  → 902, 903 ... 재생 → 이후 실시간 이벤트
```

- **스냅샷과 구독 사이의 틈**: 목록을 조회한 뒤 따로 구독을 시작하면 두 시점 사이의 변경이 어디에도 담기지 않는다. 조회 응답에 경계 커서를 함께 받아 그 커서부터 구독한다. 스냅샷을 받은 뒤 현재 커서를 따로 물으면 그 사이 변경을 놓칠 수 있다.
- **구독을 먼저 여는 방식**: 구독을 먼저 열어 이벤트를 버퍼에 모은 뒤 스냅샷을 받고, 스냅샷 버전 이하의 이벤트는 버리고 나머지를 적용한다. 이벤트와 스냅샷의 버전을 같은 기준으로 비교할 수 있어야 하고, 중복 제거와 버퍼 상한을 두어 상한을 넘으면 스냅샷부터 다시 받는다.
- **보존 기간 초과**: 서버는 이벤트 이력을 무한히 보관하지 않는다. 커서가 보존 범위 밖이면 재생 대신 스냅샷부터 다시 받는 경로가 있어야 한다.
- **Kubernetes 사례**: 목록 응답의 `resourceVersion`부터 watch를 시작하면 그 뒤의 변경을 스트림으로 받고, 끊기면 마지막으로 받은 `resourceVersion`부터 다시 watch한다. etcd 3을 쓰는 클러스터는 기본적으로 최근 5분의 변경만 보존하며, 이력이 없으면 클라이언트가 `410 Gone`을 확인하고 로컬 캐시를 비운 뒤 목록을 다시 받아 새 `resourceVersion`부터 watch한다.

SSE의 `Last-Event-ID`는 같은 EventSource가 자동 재연결할 때 이 커서를 서버에 전달하는 표준 수단이지만 위치를 알릴 뿐이다. 서버가 그 뒤의 이벤트를 보관하고 재생해야 빠진 내용이 돌아온다([[Response-Correlation|채널 기반 응답 매칭]]). 채팅의 `lastSequence` 재조회도 같은 구조다([[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]).

## 식별자를 목적별로 나눈다

| 식별자 | 가리키는 것 | 쓰는 곳 |
|---|---|---|
| 이벤트 ID | 한 번 발생한 이벤트 | 같은 이벤트를 두 번 받았을 때 중복 제거 |
| 커서 | 스트림에서 재생을 시작할 위치 | 재연결 뒤 이어 받기 |
| 엔티티 버전 | 문서나 작업 상태의 판 | 늦게 온 옛 상태가 새 상태를 덮지 않게 비교 |
| 요청 ID | 클라이언트 요청과 응답의 짝 | 비동기 응답을 대기 작업에 연결 |
| 멱등 키 | 업무상 한 번만 일어나야 하는 작업 | 재시도해도 효과를 한 번만 반영 |

한 값이 여러 역할을 겸할 수도 있다. 스트림 전체에서 단조 증가하는 이벤트 ID를 커서로 쓰는 계약이 그 예다. 겸용할 때는 값의 유일성 범위(스트림 전체인지 엔티티별인지), 비교 가능성, 보관 기간을 계약에 적고, 그 값이 보장하지 않는 성질에 기대면 경계에서 깨진다. `job-123`의 버전 18을 반영한 뒤 버전 17이 늦게 오면 버린다. 이벤트 ID가 달라 중복 제거를 통과한 옛 상태도 버전 비교가 걸러낸다. 요청 ID 매칭은 [[Response-Correlation|채널 기반 응답 매칭]], 멱등 키는 [[Idempotency-Key|멱등성 키]]에서 다룬다.

## 하트비트와 처리 확인은 다르다

- **Ping과 Pong이 확인하는 범위**: RFC 6455에서 Ping은 연결 유지나 상대가 아직 응답하는지 확인하는 데 쓰고, Ping을 받은 쪽은 이미 Close를 받은 경우가 아니면 Pong으로 답해야 한다. 요청 없이 보낸 Pong은 단방향 하트비트가 된다. 확인되는 것은 그 경로에서 상대의 WebSocket 계층이 응답한다는 사실까지다.
- **브라우저의 비대칭**: WHATWG WebSockets 표준의 `WebSocket` 인터페이스는 Ping과 Pong을 스크립트에 노출하지 않는다. 서버가 보낸 Ping에는 브라우저가 프로토콜 수준에서 Pong으로 답하므로 서버 쪽 생존 확인은 프로토콜 Ping으로 할 수 있다. 브라우저 코드가 서버와 경로를 확인하려면 `{"type":"ping","requestId":"p-1"}` 같은 애플리케이션 메시지를 정의한다.
- **수신 확인은 프로토콜에 없다**: RFC 6455의 기본 프로토콜이 정의한 opcode는 continuation, text, binary, close, ping, pong 여섯 가지이고 메시지 단위 수신 확인이나 재전송 프레임은 없다(예약값은 확장이 정의할 수 있다). `bufferedAmount`는 `send()`로 큐에 넣었지만 아직 네트워크로 보내지 않은 바이트 수라서 0이어도 서버가 처리했다는 뜻이 아니다. 명령이 저장됐는지는 서버가 내구성 저장 뒤 요청 ID와 함께 돌려주는 확인 메시지나 요청 ID로 결과를 조회해 확인한다.
- **응답의 의미를 섞지 않는다**: 하트비트 응답은 직전 명령의 저장도, 화면의 최신성도 뜻하지 않는다. 하트비트 타임아웃은 더 기다릴 수 없다는 판단이지 실패 확정이 아니다. 응답이 유실된 명령은 요청 ID로 결과를 조회하거나 같은 멱등 키로 재시도한다([[Delivery-Semantics|전달 보장]]).

## 전송 방식별 재연결 계약

### 폴링

변경 시점이 간격 Δ 안에 고르게 흩어지고 요청 처리 시간이 Δ보다 충분히 짧다고 가정하면 평균 지연은 약 Δ/2, 최악은 약 Δ이고(앞 요청이 끝난 뒤 기다리면 요청 시간이 더해진다), 클라이언트 N개의 요청은 초당 약 N/Δ다. 이전 요청이 끝난 뒤 다음 요청을 보내고, 실패하면 간격을 늘리고 지터를 더한다([[Retry-Backoff-Jitter|지수 백오프와 지터]]). 롱 폴링은 응답과 다음 요청 사이의 변경을 놓치지 않도록 요청에 커서를 싣는다.

### SSE의 EventSource

- 네트워크 오류(브라우저가 재연결이 소용없다고 판단하면 실패로 닫을 수 있다)나 200 응답 스트림의 정상 종료면 `readyState`를 `CONNECTING`으로 바꾸고 `error` 이벤트를 낸 뒤 재연결 시간만큼 기다려 다시 요청한다. 마지막 이벤트 ID가 있으면 `Last-Event-ID` 헤더에 싣는다. 재연결 시간은 `retry` 필드의 밀리초 값으로 바꿀 수 있다.
- 응답 상태가 200이 아니거나 `Content-Type`이 `text/event-stream`이 아니면 연결을 실패로 처리해 `readyState`를 `CLOSED`로 두고 다시 연결하지 않는다. 배포 중 게이트웨이가 돌려준 502 한 번으로 스트림이 멈출 수 있으므로, `error` 이벤트에서 `readyState`가 `CLOSED`면 애플리케이션이 백오프를 두고 새 `EventSource`를 만든다. 새 `EventSource`는 마지막 이벤트 ID가 빈 문자열로 시작하고 생성자가 요청 헤더를 받지 않으므로, 받은 `lastEventId`를 저장해 두었다가 URL 쿼리(예: `?lastEventId=901`)로 넘긴다. 스냅샷 직후의 첫 구독도 같다. 서버가 재연결을 멈추게 하려면 204를 돌려준다.
- 일부 레거시 프록시는 짧은 유휴 시간 뒤 HTTP 연결을 끊으므로 15초 안팎마다 `:`로 시작하는 주석 줄을 보낼 수 있다. 프록시 버퍼링은 [[Server-Sent-Events|SSE]]의 프록시 절을 따른다.

### WebSocket

WHATWG WebSockets 표준의 `WebSocket` 인터페이스는 재연결을 정의하지 않는다. 닫히면 애플리케이션이 새 객체를 만들고 구독, 인증, 확인받지 못한 명령을 다시 정리한다.

- 일시적 실패(네트워크 단절, 서버 재시작)와 재시도해도 소용없는 실패(인증 만료, 권한 박탈, 계정 전환)를 나눈다. 뒤쪽은 재연결 루프 대신 재인증이나 종료로 보낸다.
- 재연결 지연에 지수 백오프와 지터를 두어 서버 장애 뒤 클라이언트가 한꺼번에 몰리는 재연결 폭주를 막는다.
- 이전 연결의 타이머와 핸들러를 정리해 두 연결이 동시에 상태를 갱신하는 경합을 막는다.
- `WebSocket` 인터페이스는 배압을 지원하지 않아 처리보다 빨리 메시지가 오면 메모리에 쌓이거나 CPU를 100% 쓰게 된다. 스트림 배압을 쓰는 `WebSocketStream`은 비표준이고 한 렌더링 엔진만 지원한다(MDN, 2026-10-06 확인). 받는 쪽에서 최신 값은 합치고 이벤트는 순서를 지키며 묶는다([[Backpressure|배압]]).

### 순서와 재전송을 포기하는 선택

순서를 보장하는 전송에서는 앞 패킷 하나가 유실되면 뒤 데이터가 재전송을 기다린다. 커서 위치처럼 늦은 값이 쓸모없는 데이터는 순서와 재전송을 포기하는 편이 낫다. WebRTC DataChannel은 `ordered`(기본 `true`)를 끄고 `maxRetransmits`나 `maxPacketLifeTime` 가운데 하나만 지정해 비신뢰 모드로 쓸 수 있다. WebTransport는 HTTP/3로 연결되면 신뢰성 있는 스트림과 UDP 같은 비신뢰 datagram을 함께 제공하고, QUIC 위라 한 스트림의 유실이 다른 스트림을 막지 않는다. HTTP/2로 대체 연결되면 `reliable-only`라 이 성질이 없으므로, 비신뢰 전송이 필수면 `requireUnreliable: true`를 준다. 순서 확인이 필요하면 애플리케이션이 시퀀스 번호를 붙인다.

## 연결 상태와 동기화 상태를 나눈다

연결됨 하나로는 사용자가 화면을 믿어도 되는지 알려줄 수 없다. 두 상태를 따로 두고 화면에 반영한다. 아래 이름은 예시다.

| 상태 | 의미 | 화면 처리 예 |
|---|---|---|
| 오프라인 | 연결 없음 | 마지막 동기화 시각 표시, 명령 보류나 차단 |
| 연결됨, 동기화 중 | 재연결 뒤 놓친 구간을 복구하는 중 | 기존 값을 흐리게 두고 복구 표시 |
| 연결됨, 동기화 완료 | 커서까지 따라잡아 최신이 확인됨 | 정상 표시 |
| 오래됨 | 연결은 열렸지만 구독 복구나 재검증이 안 됨 | 자동 재조회나 새로고침 유도 |

## 탭 밖의 실시간

- **페이지 수명주기**: 숨김(hidden), 동결(frozen), 폐기(discarded)는 다른 상태다. 동결된 페이지에서는 타이머와 fetch 콜백이 실행되지 않고, 폐기된 페이지에서는 어떤 JavaScript도 실행되지 않는다. `unload`는 모바일 탭 전환기에서 탭을 닫거나 브라우저 앱을 닫는 흔한 경우에도 발생하지 않으므로 정리 작업을 맡기지 않는다. 숨김으로의 전환이 확실히 관찰할 수 있는 마지막 상태 변화인 경우가 많아 `visibilitychange`에서 상태를 저장하고, 다시 보일 때 연결과 동기화 상태를 확인한 뒤에야 최신으로 표시한다.
- **Push API**: 알림 권한과 푸시 구독, 활성 서비스 워커가 있으면 앱이 포그라운드가 아니거나 로드되지 않았어도 서버 메시지를 받을 수 있다. Chrome과 Edge는 `userVisibleOnly: true` 구독만 허용해 푸시마다 보이는 알림이 필요하고, 메시지는 늦거나 오지 않을 수 있다. 푸시는 변경 알림으로만 쓰고 사용자가 돌아오면 서버 상태를 다시 조회한다(푸시 수락과 기기 도착의 차이는 [[Notification-Broadcast-System|대규모 알림 시스템]]).
- **여러 탭**: HTTP/1.1에서는 SSE 연결이 브라우저와 도메인 조합당 6개로 제한되고, HTTP/2에서는 한 연결 안의 스트림으로 다중화되어 이 한도 대신 서버와 클라이언트가 정한 동시 스트림 수 한도(MDN 기준 기본 100)를 따른다(MDN, 2026-10-06 확인). WHATWG는 shared worker로 `EventSource` 하나를 공유하는 방법을 제시한다. 한 탭이 서버 연결을 맡고 같은 출처의 다른 탭에 Broadcast Channel API로 전달할 수도 있다. 대신 연결 소유권 이양, 늦게 열린 탭의 스냅샷, 계정 전환 시 정리가 새 책임이 된다.

## 측정은 마감 안 성공 비율로 한다

- 평균 10ms라는 관측은 100ms 안에 반영된다는 약속이 아니다. SLI는 기준보다 빨랐던 요청의 비율(지연), 기준 시간보다 최근에 갱신된 데이터의 비율(신선도)처럼 비율로 정의한다([[SLI-SLO|SLI/SLO]], 분포 읽기는 [[Monitoring-Graph-Reading|모니터링 그래프 해석]]).
- 구간을 나눠 잰다: 서버 확정에서 전송까지, 수신에서 상태 반영과 렌더링까지, 재연결 시도에서 따라잡기 완료까지, 최신 여부를 확인하지 못한 채 지난 시간.
- 짧은 브라우저 안 구간은 `performance.now()`로 잰다. `Date.now()`는 시스템 시계 조정과 skew의 영향을 받지만 `performance.now()`는 줄지 않는 단조 시계 기준이다. 다만 Windows 밖의 브라우저에서는 기기 절전 중에 `performance.now()`가 멈추는 것으로 보이므로(MDN, 2026-10-06 확인), 절전을 가로지를 수 있는 구간은 `Date.now()`나 서버 시각으로 잰다. 서버 타임스탬프와 브라우저 시각의 차에는 두 시계의 오차가 섞이므로 종단 지연은 이벤트 ID로 구간을 이어 해석한다.
- 끝내 전달되지 않은 이벤트를 분포에서 빼면 지표가 좋아 보인다. 분모는 서버가 기록한 전달 대상 변경 전체로 두고, 목표 시간 안 적용 비율과 함께 미수신과 복구 실패 수를 센다(클라이언트는 받는 스트림이 연속 번호를 약속한 경우에만 시퀀스 공백으로 누락을 의심할 수 있다. 권한에 따라 일부만 받는 전역 로그에서는 번호가 건너뛰어도 정상일 수 있다).

## 트레이드오프

- 이벤트 재생은 이력을 보존하지만 서버가 로그 보존과 커서 관리를 떠안는다. 최신 상태 재조회는 단순하지만 중간 이력을 잃는다.
- 보존 기간을 늘리면 재생으로 복구되는 단절 시간이 길어지는 대신 저장 비용이 는다. 보존 기간을 넘는 단절을 스냅샷 재조회로 보내는 경계를 정한다.
- 하트비트 주기를 줄이면 단절을 빨리 알지만 트래픽과 모바일 배터리 비용이 늘고, 비활성 탭에서는 타이머 자체가 늦게 돈다.
- 한 탭이 연결을 공유하면 연결 수는 줄지만 소유권 이양과 탭 간 동기화라는 새 실패 지점이 생긴다.

## 검증 시나리오

| 조건 | 확인할 결과 |
|---|---|
| 30초 단절 중 서버 상태 변경 | 재연결 뒤 재생이나 스냅샷으로 화면이 서버와 같아짐 |
| 서버는 명령을 처리했는데 응답 유실 | 요청 ID 조회나 멱등 키 재시도로 효과가 한 번만 반영 |
| 중복 이벤트, 늦은 HTTP 응답 | 버전 비교로 화면이 과거로 돌아가지 않음 |
| 메인 스레드 긴 작업 중 이벤트 폭주 | 큐가 한도 안에 머물고 최신 값으로 회복 |
| 커서가 보존 범위를 벗어남 | 스냅샷 재조회로 전환 |
| 게이트웨이 502로 EventSource가 CLOSED | 애플리케이션이 백오프로 새 연결을 만듦 |
| 탭 전환, 절전, 앱 복귀 | 재확인 전에는 오래된 화면을 최신으로 표시하지 않음 |
| 인증 만료, 계정 전환 | 이전 구독과 재시도 루프가 끝남 |
| CDN과 로드밸런서 경유 | 버퍼링으로 몰려 도착하거나 유휴 타임아웃으로 주기적으로 끊기지 않음 |

## 면접 체크포인트

- 연결 상태와 화면의 최신성이 다른 이유, 재연결만으로 복구되지 않는 구간
- 반드시 전달할 이벤트와 최신 값 데이터의 처리 차이(재생, 합치기, 버전 비교)
- 스냅샷과 구독 사이의 틈을 커서로 막는 방법, 보존 기간을 넘었을 때의 경로
- 이벤트 ID, 커서, 엔티티 버전, 요청 ID, 멱등 키의 역할 구분
- Ping과 Pong이 확인하는 범위, 하트비트 응답이 명령 저장을 뜻하지 않는 이유
- EventSource가 다시 연결하는 경우와 닫힌 채 멈추는 경우
- 평균 지연 대신 마감 안 성공 비율과 신선도로 재는 이유

## 출처

- [브라우저에서 실시간성을 어떻게 보장하나요? — Wonkook Lee](https://blog.wonkooklee.com/docs/api-and-interfaces/browser-realtime/)
- [WHATWG, HTML Standard: Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [WHATWG, WebSockets Standard](https://websockets.spec.whatwg.org/)
- [RFC 6455, The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [MDN, EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [MDN, The WebSocket API (WebSockets)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [MDN, RTCPeerConnection: createDataChannel() method](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel)
- [MDN, WebTransport API](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API)
- [W3C, WebTransport](https://www.w3.org/TR/webtransport/)
- [MDN, Window: setTimeout() method](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)
- [MDN, Document: visibilitychange event](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
- [MDN, Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN, PushManager: subscribe() method](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)
- [MDN, Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [MDN, Performance: now() method](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- [Chrome for Developers, Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [Kubernetes, Kubernetes API Concepts](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [Implementing SLOs — Google SRE Workbook](https://sre.google/workbook/implementing-slos/)

## 관련 문서

- [[Realtime-Communication-Comparison|실시간 통신 기술 비교]]
- [[Server-Sent-Events|Server-Sent Events (SSE)]]
- [[WebSocket|WebSocket]]
- [[Response-Correlation|채널 기반 응답 매칭]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[Delivery-Semantics|전달 보장]]
- [[Idempotency-Key|멱등성 키]]
- [[Retry-Backoff-Jitter|지수 백오프와 지터]]
- [[Backpressure|배압]]
- [[Browser-Main-Thread-Offloading|메인 스레드 작업 덜어내기]]
- [[SLI-SLO|SLI/SLO]]
- [[Monitoring-Graph-Reading|모니터링 그래프 해석]]
- [[Notification-Broadcast-System|대규모 알림 시스템]]
