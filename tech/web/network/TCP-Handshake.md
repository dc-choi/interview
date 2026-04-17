---
tags: [web, network, tcp, handshake]
status: done
category: "Web - 네트워크"
aliases: ["TCP Handshake", "3-way Handshake", "4-way Handshake"]
---

# TCP Handshake (3-way · 4-way)

TCP가 **신뢰성 있는 연결**을 만들고 끊는 의식. 연결 시 **3-way**, 종료 시 **4-way**. 면접 단골이자 네트워크 최적화의 기초.

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

### 왜 3번인가 (2번·4번은 왜 안 되나)

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
| SYN-ACK 수신 후 | SYN_SENT | SYN_RCVD |
| ACK 전송 후 | ESTABLISHED | SYN_RCVD |
| ACK 수신 후 | ESTABLISHED | ESTABLISHED |

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
3-way와 달리 **(2)와 (3)을 합칠 수 없음** — 서버가 받은 FIN 즉시 자기도 끝낼 준비가 안 됐을 수 있으므로 2단계 분리.

### TIME_WAIT 상태
마지막 ACK 전송 후 클라이언트는 **2 MSL(Maximum Segment Lifetime)** 동안 `TIME_WAIT` 유지. 이유:
- 마지막 ACK가 유실됐을 때 서버가 FIN 재전송 → 응답 가능
- 지연 중인 패킷이 **다음 연결에 잘못 섞이지 않도록** 대기

운영 이슈: 고빈도 연결·소켓 생성 시 `TIME_WAIT` 누적 → 포트 고갈. `SO_REUSEADDR`·keep-alive 활용.

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

### HTTP/2·HTTP/3
- HTTP/2: **한 연결에서 multiplexing** → 연결 수 감소
- HTTP/3: **QUIC** 기반, UDP 위에서 0-RTT·1-RTT 핸드셰이크

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
  A. 대륙 간 최소 수백 ms 왕복. handshake 여러 번이면 초 단위 지연. 연결 재사용·압축·최소 왕복이 성능 핵심.

## 면접 체크포인트

- 3-way handshake의 3단계와 각 단계의 의미
- 왜 3번인지 (2번·4번 안 되는 이유)
- 4-way handshake가 비대칭인 이유 (half-closed)
- TIME_WAIT 상태와 2 MSL 대기
- HTTPS에서 handshake가 추가로 늘어나는 만큼의 비용
- Connection Pooling·HTTP/2·HTTP/3가 handshake 비용을 줄이는 원리

## 출처
- [매일메일 — 3-way handshake](https://www.maeil-mail.kr/question/76)
- [F-Lab — CS 면접: 네트워크](https://f-lab.kr/blog/cs-interview-network)

## 관련 문서
- [[OSI-7-Layer|OSI 7계층]]
- [[HTTPS-TLS|HTTPS · TLS Handshake]]
- [[HTTP-Seminar|HTTP 버전별 진화]]
- [[Connection-Pool|Connection Pool]]
- [[Browser-URL-Flow|브라우저 URL 입력 프로세스]]
