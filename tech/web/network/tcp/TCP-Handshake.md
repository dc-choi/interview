---
tags: [web, network, tcp, handshake]
status: done
category: "Web - 네트워크"
aliases: ["TCP Handshake", "3-way Handshake", "4-way Handshake"]
---

# TCP Handshake (3-way, 4-way)

TCP가 **신뢰성 있는 연결**을 만들고 끊는 의식. 연결 수립은 보통 **3-way**, 정상 종료는 보통 4개 세그먼트지만 ACK와 FIN을 합치면 3개가 될 수도 있다. 면접 단골이자 네트워크 최적화의 기초. 헤더 필드(시퀀스/승인 번호, 플래그)의 의미는 [[TCP-Header]].

## 연결 지향 (Connection Oriented)

TCP가 말하는 "연결"은 케이블 같은 **물리적 연결**이 아니라 두 종단이 서로를 식별하며 상태를 유지하는 **논리적 연결**이다. 전화로 치면 전화선에 꽂힌 것이 물리적 연결, 실제 통화 중인 상태가 논리적 연결이다.

왜 상태를 유지하나? 패킷 교환에서는 한 호스트가 여러 상대와 동시에 패킷을 주고받으므로, "누가 보낸 몇 번째 패킷"인지 식별할 기준이 없으면 재조립이 불가능하다. 그래서 TCP는 (출발지 IP, 출발지 포트, 목적지 IP, 목적지 포트)로 연결을 구분하고, 핸드셰이크로 그 연결 상태를 만들고 끊는다.

## 3-way Handshake (연결 수립)

```
Client                           Server
  │                                │
  ├── SYN (seq=x) ────────────────→│   (1) 연결 요청
  │                                │
  │←─────── SYN+ACK (seq=y, ack=x+1) ──┤   (2) 요청 수락 + 나도 요청
  │                                │
  ├── ACK (seq=x+1, ack=y+1) ────→│   (3) 서버 요청 수락
  │                                │
  └─── 연결 수립 완료 ──────────────┘
```

### 각 단계 의미
1. **SYN**: 클라이언트 "연결하고 싶다" + 초기 시퀀스 번호 `x` 전달
2. **SYN-ACK**: 서버 "좋다" (ACK=x+1) + 자기도 "연결하자" (SYN=y) 동시 전달
3. **ACK**: 클라이언트 "확인" (ACK=y+1) 전달 → 양방향 합의 완성

### 왜 3번인가 (2번, 4번은 왜 안 되나)

**2번만 하면**:
- 서버는 "연결됐다"고 판단하지만 클라이언트가 그 응답을 받았는지 모름
- 구 SYN(오래된 지연 패킷)이 서버에 도착하면 **유령 연결** 수립 위험

**4번 이상**:
- SYN-ACK를 **두 번**(SYN + ACK)으로 나눌 수 있지만, **합쳐도 정합성 OK**
- 네트워크 왕복 줄이는 최적화

3번이 **"양쪽이 상대의 시퀀스 번호를 확인했다"**를 증명하는 최소값.

### 상태 전이

| 단계 | 클라이언트 상태 | 서버 상태 |
|---|---|---|
| 시작 전 | CLOSED | LISTEN |
| SYN 전송 후 | SYN_SENT | LISTEN |
| SYN-ACK 수신 후 | ESTABLISHED | SYN_RCVD |
| ACK 전송 후 | ESTABLISHED | SYN_RCVD |
| ACK 수신 후 | ESTABLISHED | ESTABLISHED |

**능동 개방 vs 수동 개방**: 먼저 SYN을 보내 적극적으로 연결을 거는 쪽이 능동 개방(Active Open, 요청자), `listen()`으로 들어와 요청을 기다리는 쪽이 수동 개방(Passive Open, 수신자)이다. 클라이언트, 서버 중 어느 쪽이든 능동 개방을 할 수 있다(요청자/수신자로 부르는 이유).

### 핸드셰이크가 실제로 합의하는 것

3-way handshake는 인사 절차가 아니라 이 연결에서 쓸 규칙을 정하는 자리다. 여기서 정해진 값은 연결 내내 유지되고, SYN에서 빠진 옵션은 나중에 켤 수 없다.

| 합의 항목 | 정하는 것 | 제약 |
|---|---|---|
| 초기 시퀀스 번호(ISN) | 재조립 기준점, 오래된 연결의 지연 세그먼트 구분 | 양쪽이 각자 정해 교환 |
| MSS | 세그먼트 하나에 담을 payload 상한 | SYN 세그먼트에서만 보낼 수 있고 다른 세그먼트에서는 금지 |
| Window Scale | 광고 윈도우의 64KB 한계를 넘기는 배율 | 초기 SYN에서만, shift count 상한 14(2^30 = 1 GiB) |
| SACK-Permitted | 선택 재전송 사용 여부 | SYN에서 양쪽이 제시해야 발효 |
| Timestamps | RTT 측정과 순환 시퀀스 번호 보호 | 상대의 초기 SYN에 있을 때만 SYN-ACK에 담을 수 있고, 협상되면 RST 외 모든 세그먼트에 실림 |

공통 규칙이 하나 있다. **옵션은 제안이지 약속이 아니고, 양쪽이 모두 제시해야 발효된다.** RFC 7323의 표현으로 "This option is an offer, not a promise; both sides MUST send Window Scale options in their <SYN> segments to enable window scaling in either direction"다. 그래서 중간 장비가 SYN의 옵션을 지우면 연결은 정상 수립되지만 윈도우 스케일링이나 SACK 없이 동작해 처리량만 조용히 떨어진다. 필드 구조는 [[TCP-Header#Options — 기능 확장|TCP 옵션]], 협상된 값이 전송량으로 이어지는 과정은 [[TCP-Flow-Error-Control|흐름 제어]].

### 연결 수립은 신원 확인이 아니다

handshake가 증명하는 것은 상대가 그 주소에서 실제로 응답했고 양쪽이 서로의 시퀀스 번호를 확인했다는 사실뿐이다. 그 주소 뒤에 누가 있는지, 경로 중간에 무엇이 끼어 있는지는 검증하지 않는다. TCP는 그 자체로 기밀성도 상대 인증도 제공하지 않아서, 경로상의 관측자는 평문을 읽을 수 있고 ISN을 예측할 수 있는 off-path 공격자는 세그먼트를 끼워 넣을 수 있다. RFC 9293이 ISN 예측 위험을 별도로 지적하는 이유다. 상대의 신원과 내용 보호는 인증서로 서버를 검증하고 키를 합의하는 [[HTTPS-TLS|TLS handshake]]에서 따로 얻으며, 연결이 맺어졌다는 사실 자체는 신뢰의 근거가 되지 못한다.

## 4-way Handshake (연결 종료)

```
Client                           Server
  │                                │
  ├── FIN (seq=u) ────────────────→│   (1) 종료 요청
  │                                │
  │←─────── ACK (ack=u+1) ─────────┤   (2) 알았다 (아직 보낼 거 있음)
  │                                │
  │                                │   ... 서버 잔여 데이터 전송 ...
  │                                │
  │←─────── FIN (seq=v) ──────────┤   (3) 나도 종료
  │                                │
  ├── ACK (ack=v+1) ──────────────→│   (4) 확인
  │                                │
  └─── 연결 종료 ────────────────── ┘
```

### 각 단계 의미
1. **FIN**: 클라이언트 "더 이상 보낼 것 없다"
2. **ACK**: 서버 "알았다" — 하지만 서버는 **아직 보낼 것 있을 수 있음** → half-closed 상태
3. **FIN**: 서버 "나도 보낼 것 다 보냈다"
4. **ACK**: 클라이언트 "확인"

### 왜 4번인가
서버가 FIN을 받은 즉시 자기 전송까지 끝낼 준비가 안 됐으면 (2) ACK와 (3) FIN을 분리하므로 보통 4개 세그먼트가 필요하다. 이미 끝낼 준비가 됐다면 ACK와 FIN을 한 FIN+ACK 세그먼트로 합칠 수 있어 3개로 끝날 수도 있다.

### Half-Close (우아한 종료)

이론상 종료는 FIN으로 시작하지만, 실제로 캡처하면 첫 FIN이 **FIN+ACK**로 나간다. TCP가 최초 SYN을 제외한 연결 성립 이후의 모든 세그먼트에 ACK 비트를 세팅해 지금까지 받은 데이터의 확인 번호를 함께 싣기 때문이다(RFC 9293 §3.1). Half-Close를 쓰지 않고 `close()`로 닫아도 첫 FIN은 FIN+ACK로 관측된다.

**Half-Close**는 이 표기의 원인이 아니라 종료 절차가 (2)ACK와 (3)FIN으로 나뉘는 이유다 — 연결을 한 번에 닫지 않고 **전송 스트림과 수신 스트림 중 한쪽만 먼저 닫는** 방식이다.

먼저 닫는 쪽(Active Closer)은 "나는 더 보낼 게 없지만 받는 귀는 열어둔다. 여기까지 받았으니 남은 것 있으면 마저 보내라"는 뜻으로 FIN을 보낸다(이 FIN 역시 위 이유로 ACK 비트가 함께 켜진다). 상대(Passive Closer)는 남은 데이터를 마저 전송한 뒤 자신의 FIN을 보낸다. 덕분에 종료 중에도 미전송 데이터가 유실되지 않는다.

소켓 API에서 `shutdown(fd, SHUT_WR)`은 전송만 닫고 애플리케이션이 상대 FIN 전까지 계속 수신하게 한다. `close()`는 애플리케이션의 해당 파일 디스크립터에 대한 송수신 접근을 끝내지만, 기본 TCP 종료 자체는 전송 큐의 데이터를 보낸 뒤 FIN으로 닫는 graceful close다. 연결을 즉시 파기하는 ABORT/RST와는 다르다. 수신을 계속 처리해야 할 때 `shutdown(fd, SHUT_WR)`을 명시적으로 쓰는 이유다.

### TIME_WAIT 상태
마지막 ACK를 보낸 능동 종료 측은 **2 MSL(Maximum Segment Lifetime)** 동안 `TIME_WAIT` 유지. 이유:
- 마지막 ACK가 유실됐을 때 서버가 FIN 재전송 → 응답 가능
- 지연 중인 패킷이 **다음 연결에 잘못 섞이지 않도록** 대기

운영 이슈: 고빈도 연결, 소켓 생성 시 `TIME_WAIT` 누적 → 포트 고갈. `SO_REUSEADDR`, keep-alive 활용.

### CLOSE_WAIT 누적과 종료 타임아웃

종료 과정의 상태는 운영 장애로 직결된다.

- **CLOSE_WAIT 누적**: FIN을 받은 수동 종료 측 애플리케이션이 `close()`, `shutdown()`을 **명시적으로 호출하지 않으면** 소켓이 CLOSE_WAIT에 머물러 파일 디스크립터와 포트를 계속 점유한다. 많이 쌓이면 디스크립터 고갈로 서버가 멈춘다 — 흔한 커넥션 누수 버그. (TIME_WAIT가 능동 종료 측 문제라면, CLOSE_WAIT는 수동 종료 측 애플리케이션 버그)
- **FIN_WAIT_2 타임아웃**: 상대의 마지막 FIN을 기다리는 상태. 커널 파라미터 `tcp_fin_timeout`으로 한도를 둔다.
- **TIME_WAIT 재사용**: 2MSL 대기는 지연 패킷이 다음 연결에 섞이는 것을 막는 안전장치라 본래 줄이면 안 되지만, 고빈도 단명 연결에서 포트가 마르면 `tcp_tw_reuse` 등으로 재사용한다.

## HTTPS는 더 많은 왕복

HTTPS는 3-way handshake **+ TLS handshake** (TLS 1.2: 2 RTT, TLS 1.3: 1 RTT) 추가.

대륙 간 통신 (왕복 100ms 가정):
- 평문 HTTP: 3-way + 요청/응답 = 2 RTT = **200ms**
- HTTPS (TLS 1.2): 3-way + TLS + 요청/응답 = 4 RTT = **400ms**
- HTTPS (TLS 1.3): 3-way + TLS + 요청/응답 = 3 RTT = **300ms**

**Connection Keep-Alive**로 재사용하면 이후 요청은 handshake 생략 → 매우 효율.

## 성능 최적화

### Connection Pooling
재사용으로 handshake 오버헤드 제거. Node.js `http.Agent`, Java `HttpClient`, DB 커넥션 풀.

### HTTP/2, HTTP/3
- HTTP/2: **한 연결에서 multiplexing** → 연결 수 감소
- HTTP/3: **QUIC** 기반, UDP 위에서 0-RTT, 1-RTT 핸드셰이크 ([[HTTP-3|HTTP/3, QUIC]])

### TCP Fast Open (TFO)
첫 SYN에 payload 포함 → 데이터 전송 시작 전까지 RTT 절감. 지원 환경 제한적.

### DNS + Connect 미리 하기
- **`<link rel="preconnect">`** — 브라우저가 미리 handshake 수행
- **DNS prefetch**

## 흔한 면접 질문

- **Q. 왜 3-way handshake인가?**
  A. 양쪽이 상대의 시퀀스 번호 수신을 확인해야 하기 때문. 2번이면 한쪽 확인 부재, 4번 이상은 불필요.
- **Q. 3-way와 4-way의 비대칭 이유?**
  A. 종료 시 서버가 잔여 데이터 전송을 완료할 시간이 필요해서 FIN과 ACK를 분리.
- **Q. TIME_WAIT이 긴 이유?**
  A. 지연 패킷 방지 + 마지막 ACK 재전송 대비.
- **Q. 네트워크 통신이 왜 성능에 큰 영향을 주나?**
  A. 대륙 간 최소 수백 ms 왕복. handshake 여러 번이면 초 단위 지연. 연결 재사용, 압축, 최소 왕복이 성능 핵심.

## 면접 체크포인트

- 3-way handshake의 3단계와 각 단계의 의미
- 왜 3번인지 (2번, 4번 안 되는 이유)
- 4-way handshake가 비대칭인 이유 (half-closed)
- TIME_WAIT 상태와 2 MSL 대기
- Half-Close와 `shutdown` vs `close`, 4-way가 ACK/FIN을 분리하는 실질적 이유
- CLOSE_WAIT 누적의 원인(수동 종료 측이 close 미호출)과 증상(디스크립터 고갈)
- HTTPS에서 handshake가 추가로 늘어나는 만큼의 비용
- Connection Pooling, HTTP/2, HTTP/3가 handshake 비용을 줄이는 원리
- handshake에서 협상되는 MSS, WSCALE, SACK, Timestamps와 옵션이 양쪽 제시로만 발효된다는 점
- TCP 연결 수립이 신원 확인이 아닌 이유와 TLS가 별도로 필요한 이유

## 출처
- [매일메일 — 3-way handshake](https://www.maeil-mail.kr/question/76)
- [F-Lab — CS 면접: 네트워크](https://f-lab.kr/blog/cs-interview-network)
- [RFC 9293 — TCP, Header Format](https://www.rfc-editor.org/rfc/rfc9293.html#name-header-format)
- [RFC 9293 — SEGMENT ARRIVES in SYN-SENT state](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.10.7.3)
- [RFC 9293 — Maximum Segment Size Option](https://www.rfc-editor.org/rfc/rfc9293.html#name-specific-option-definitions)
- [RFC 7323 — TCP Extensions for High Performance](https://www.rfc-editor.org/rfc/rfc7323.html)
- [TCP 연결이라는 착각에 대해 — 널널한 개발자 TV](https://www.youtube.com/watch?v=DC9FfKSgisg&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=26)

## 관련 문서
- [[TCP-Header|TCP 헤더 구조 (시퀀스/승인 번호, 플래그, 윈도우, 체크섬)]]
- [[TCP-Flow-Error-Control|TCP 흐름 제어와 오류 제어 (슬라이딩 윈도우, ARQ)]]
- [[OSI-7-Layer|OSI 7계층]]
- [[HTTPS-TLS|HTTPS, TLS Handshake]]
- [[HTTP-Seminar|HTTP 버전별 진화]]
- [[Connection-Pool|Connection Pool]]
- [[Browser-URL-Flow|브라우저 URL 입력 프로세스]]
