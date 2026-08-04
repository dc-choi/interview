---
tags: [web, realtime, polling, websocket, sse, long-polling, webrtc, webtransport]
status: done
verified_at: 2026-08-04
category: "웹&네트워크(Web&Network)"
aliases: ["Realtime Communication Comparison", "실시간 통신 비교"]
---

# 실시간 통신 기술 비교

실시간이라는 한 단어로 묶이지만 Polling, Long Polling, SSE, WebSocket, WebRTC와 WebTransport는 **통신 방향, 연결 수명과 사용 사례**가 다르다. 상황에 맞는 선택이 아키텍처 비용을 좌우한다.

## 한눈에 비교

| 기술 | 방향 | 프로토콜 | 주 용도 | 구현 복잡도 |
|---|---|---|---|---|
| **Polling** | 클라 → 서버 요청 반복 | HTTP | 주기적 상태 확인 | 낮음 |
| **Long Polling** | 클라 요청, 서버 지연 응답 | HTTP | 레거시, 저기능 클라 지원 | 낮음 |
| **Server-Sent Events** | 서버 → 클라 (단방향) | HTTP 응답 스트림 | 알림, 피드, 스트림 | 낮음 |
| **WebSocket** | 양방향 (full-duplex) | HTTP Upgrade → WS 프레임 | 채팅, 게임, 협업 | 중간 (재연결, 확장) |
| **WebRTC** | P2P (클라↔클라) | UDP + STUN/TURN/ICE | 화상 통화, 저지연 스트리밍 | 높음 (시그널링) |
| **WebTransport** | 양방향 + 단방향 스트림 | HTTP/3 (QUIC) | 신뢰성 있는 스트림과 datagram 조합 | 중간 |

## Polling

클라이언트가 일정 간격으로 요청해 최신 상태를 확인한다. 구현과 장애 복구가 단순하고 연결을 오래 유지하지 않아도 되지만, 변경이 없어도 요청하며 최악의 경우 폴링 간격만큼 갱신이 늦어진다. 간격을 줄이면 지연은 줄고 트래픽과 서버 부하는 늘어난다.

초 단위 실시간성이 필요하지 않은 대시보드, 작업 상태와 대기 순번 확인에 적합하다. 많은 클라이언트가 같은 시점에 몰리지 않도록 jitter를 주고, 변화가 없을 때 간격을 늘리는 backoff를 적용할 수 있다.

## Long Polling

클라이언트가 서버에 **요청을 보내고 응답을 오랫동안 대기**. 이벤트 발생 시 응답 내려주고 클라가 바로 다시 요청.

```
Client → GET /poll
Server: (대기, 이벤트 기다림)
    이벤트 발생
Server → 200 OK (이벤트 데이터)
Client → GET /poll  (즉시 재요청)
```

**장점**: HTTP만으로 구현하며 방화벽과 프록시 호환성이 높다.
**단점**: 응답 뒤 재요청하는 왕복 비용, 이벤트가 잦을 때 일반 Polling과 비슷해지는 요청 비용, 연결 타임아웃 관리가 필요하다.

**사용**: WebSocket 미지원 환경의 fallback, 레거시 시스템.

## Server-Sent Events (SSE)

**서버 → 클라이언트 단방향** 스트리밍. 하나의 HTTP 응답에 `text/event-stream` 형식으로 이벤트를 계속 흘려보낸다. HTTP/1.1에서는 보통 chunked 전송을 사용하고, HTTP/2와 HTTP/3에서는 각 버전의 프레임을 사용한다.

```
Content-Type: text/event-stream

event: newMessage
data: {"user":"dc","msg":"hello"}

event: newMessage
data: {"user":"lee","msg":"world"}
```

**장점**:
- 표준 HTTP → **방화벽, 프록시 호환성 좋음**
- 브라우저 `EventSource` API로 구현 단순
- **자동 재연결** 내장 (Last-Event-ID)
- 서버 → 클라 단방향이 충분한 경우 WebSocket보다 가벼움

**단점**:
- **단방향만** — 클라 → 서버는 별도 HTTP 요청
- 바이너리 전송 불가 (UTF-8 텍스트만)
- 일부 레거시 브라우저는 `EventSource`를 지원하지 않음
- HTTP/1.1에서는 브라우저의 origin별 연결 한도와 경쟁할 수 있음

**사용**: 알림 푸시, 뉴스, 주식, 스포츠 피드, LLM 스트리밍 응답, 실시간 대시보드.

## WebSocket

**양방향 전이중(full-duplex) 통신**. HTTP Upgrade 핸드셰이크로 프로토콜 전환 후 TCP 위에서 WS 프레임 주고받음.

```
클라: HTTP GET /ws  Upgrade: websocket
서버: 101 Switching Protocols
... (그 후 양방향 프레임 통신)
```

**장점**:
- 진정한 실시간 양방향
- 저지연 (프레임당 오버헤드 작음)
- 텍스트, 바이너리 모두 지원

**단점**:
- HTTP Upgrade 뒤 별도 WebSocket 프레임을 사용하므로 방화벽, 프록시 호환성을 확인해야 함
- 재연결, 재인증, heartbeat 직접 구현
- 수평 확장 시 **세션 상태 분산** 문제 ([[STOMP-Protocol]], Redis Pub/Sub 활용)
- 연결을 유지할 라우팅과 서버 간 메시지를 공유할 브로커 또는 Pub/Sub 백본이 필요

**사용**: 채팅, 실시간 게임, 협업 편집, 트레이딩 터미널.

## WebRTC

클라이언트 간 **P2P 연결**을 목표로 한다. 서버가 시그널링을 중개하고 직접 연결에 실패하면 TURN 서버가 실제 데이터를 릴레이할 수 있다.

**구성 요소**:
- **STUN**: NAT 뒤의 공인 IP 발견
- **TURN**: P2P 불가 시 릴레이
- **ICE**: 여러 경로 중 최적 선택
- **시그널링 서버**: SDP(세션 설명) 교환 (WebSocket, HTTP 등으로 구현)

**장점**:
- 직접 연결이 성립하면 중간 애플리케이션 서버를 거치지 않아 지연을 줄일 수 있음
- 음성, 영상, 데이터 채널 모두 지원
- 브라우저 네이티브

**단점**:
- **시그널링 서버 필요** (WebRTC 단독 아님)
- NAT, 방화벽 관통이 100% 보장 안 됨 → TURN 릴레이 비용
- 구현 복잡 (SDP, ICE, Codec 협상)
- 대규모 브로드캐스트에 부적합 (각 peer가 자원 부담)

**사용**: 1:1 또는 소규모 화상 통화, 저지연 P2P 스트리밍, 원격 데스크톱.

## WebTransport

HTTP/3(QUIC) 기반 양방향 통신 API다. 신뢰성과 순서가 필요한 스트림, 전달을 보장하지 않는 datagram을 한 세션에서 함께 제공한다.

**특징**:
- 양방향 **+ 서버, 클라 단방향 스트림**
- 한 스트림의 패킷 손실이 다른 스트림을 막는 TCP 수준의 Head-of-Line Blocking을 격리함
- 양방향, 단방향 stream과 unreliable datagram 지원
- 기본 TLS 암호화

**장점**: 신뢰성 요구가 다른 데이터 흐름을 하나의 보안 세션에서 조합할 수 있다.
**단점**:
- 2026-08-04 기준 W3C Candidate Recommendation 단계이므로 대상 클라이언트와 서버의 지원 범위를 검증해야 함
- HTTP/3 인프라와 인증서, 세션 운영이 필요
- WebSocket보다 운영 사례와 도구 선택지가 적음

**사용**: 지원 환경이 확인된 저지연 게임, 스트리밍과 신뢰성 요구가 다른 여러 데이터 흐름.

## 선택 가이드

| 요구 | 추천 |
|---|---|
| 분, 초 단위 주기적 상태 확인 | **Polling** |
| 서버 → 클라 단방향 (알림, 피드) | **SSE** |
| 양방향 실시간 (채팅, 게임) | **WebSocket** |
| HTTP 호환을 유지하면서 이벤트 대기 | **Long Polling** |
| 저지연 P2P (화상 통화, 원격) | **WebRTC** |
| HTTP/3 환경 + 미래 대비 | **WebTransport** |
| LLM 응답 스트리밍 | **SSE** (`text/event-stream`) |
| 포그라운드 앱의 지속 업데이트 | **SSE** 또는 WebSocket |
| 대규모 채팅 서비스 | **WebSocket + STOMP/Redis Pub/Sub** |

## 성능, 확장성 비교

성능은 연결 수, 이벤트 빈도, 메시지 크기와 인프라에 따라 달라진다. Polling은 주기만큼 지연되고 요청 수가 늘며, Long Polling은 대기 연결과 재요청 비용이 생긴다. SSE와 WebSocket은 이벤트 지연을 줄이는 대신 장기 연결 용량, 재연결과 배포 시 drain을 운영해야 한다. 절대 순위보다 워크로드를 측정해 선택한다.

## 브라우저 한계

- HTTP/1.1에서는 origin별 연결 한도가 낮으므로 SSE와 Long Polling 연결 수를 설계에 포함해야 함
- HTTP/2와 HTTP/3는 한 연결에서 스트림을 다중화하므로 제약의 형태가 달라지지만, 서버와 중간 장비의 동시 스트림 한도는 여전히 확인해야 함
- 모바일 백그라운드에선 WebSocket, SSE 끊기 쉬움 → Push Notification 별도 필요

## 실무 함정

- **WebSocket 하나 열고 재연결 안 만듦** — 네트워크 끊기면 복구 불가
- **SSE로 쌍방향 시도** — 설계 오류
- **WebRTC를 1:N 브로드캐스트에** — SFU/MCU 서버 필요
- **Long Polling을 무조건 단순한 실시간 대안으로 간주** — 대기 요청과 타임아웃 용량을 계산하지 않으면 병목 발생

## 면접 체크포인트

- 각 기술의 통신 방향과 프로토콜 구분
- Polling과 Long Polling의 요청 수명, 지연과 부하 차이
- SSE가 WebSocket보다 가벼운 이유
- WebSocket 수평 확장에 왜 Redis Pub/Sub 같은 게 필요한가
- WebRTC에 시그널링 서버가 필요한 이유
- Long Polling이 왜 서버 부하가 큰가
- LLM 응답 스트리밍에 SSE를 쓰는 이유

## 출처
- [RFC 6202 — HTTP Long Polling and Streaming](https://www.rfc-editor.org/rfc/rfc6202)
- [RFC 6455 — The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [Server-sent events — WHATWG HTML Standard](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [WebTransport — W3C Candidate Recommendation](https://www.w3.org/TR/webtransport/)
- [ricki-lee (Medium) — 웹 소켓 vs SSE vs 롱 폴링 vs WebRTC vs 웹 트랜스포트](https://ricki-lee.medium.com/웹-소켓-vs-server-sent-events-vs-롱-폴링-vs-webrtc-vs-웹-트랜스포트-25bb6be64904)
- [웹에서 서버 이벤트를 전달하는 방법에 관한 모든 것 — 코딩하는기술사](https://www.youtube.com/watch?v=Xq3PmcK52vI)

## 관련 문서
- [[WebSocket|WebSocket]]
- [[STOMP-Protocol|STOMP Protocol]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[Virtual-Waiting-Room-Architecture|가상 대기열 아키텍처]]
- [[Server-Sent-Events|Server-Sent Events (SSE)]]
- [[HTTP-Chunked-Transfer|HTTP Chunked Transfer]]
