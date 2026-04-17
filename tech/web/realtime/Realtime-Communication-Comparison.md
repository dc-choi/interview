---
tags: [web, realtime, websocket, sse, long-polling, webrtc, webtransport]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Realtime Communication Comparison", "실시간 통신 비교"]
---

# 실시간 통신 기술 비교 (WebSocket vs SSE vs Long Polling vs WebRTC vs WebTransport)

"실시간"이라는 한 단어로 묶이지만 다섯 기술의 **통신 방향·전송 계층·사용 사례**가 전부 다르다. 상황에 맞는 선택이 아키텍처 비용을 좌우.

## 한눈에 비교

| 기술 | 방향 | 프로토콜 | 주 용도 | 구현 복잡도 |
|---|---|---|---|---|
| **Long Polling** | 양방향 유사 (요청/응답 반복) | HTTP/1.1 | 레거시·저기능 클라 지원 | 낮음 |
| **Server-Sent Events** | 서버 → 클라 (단방향) | HTTP/1.1 (chunked) | 알림·피드·스트림 | 낮음 |
| **WebSocket** | 양방향 (full-duplex) | HTTP Upgrade → WS 프레임 | 채팅·게임·협업 | 중간 (재연결·확장) |
| **WebRTC** | P2P (클라↔클라) | UDP + STUN/TURN/ICE | 화상 통화·저지연 스트리밍 | 높음 (시그널링) |
| **WebTransport** | 양방향 + 단방향 스트림 | HTTP/3 (QUIC) | 차세대 실시간, 현재 실험적 | 중간 |

## Long Polling

클라이언트가 서버에 **요청을 보내고 응답을 오랫동안 대기**. 이벤트 발생 시 응답 내려주고 클라가 바로 다시 요청.

```
Client → GET /poll
Server: (대기, 이벤트 기다림)
    이벤트 발생
Server → 200 OK (이벤트 데이터)
Client → GET /poll  (즉시 재요청)
```

**장점**: HTTP만으로 구현, 방화벽·프록시 호환성 최고.
**단점**: 요청·응답 왕복 오버헤드, **많은 커넥션 = 서버 부하 큼**, 진정한 실시간 아님 (응답 복귀 → 재요청 간극).

**사용**: WebSocket 미지원 환경의 fallback, 레거시 시스템.

## Server-Sent Events (SSE)

**서버 → 클라이언트 단방향** 스트리밍. 하나의 HTTP 응답에 `Transfer-Encoding: chunked`로 이벤트를 계속 흘려보냄.

```
Content-Type: text/event-stream

event: newMessage
data: {"user":"dc","msg":"hello"}

event: newMessage
data: {"user":"lee","msg":"world"}
```

**장점**:
- 표준 HTTP → **방화벽·프록시 호환성 좋음**
- 브라우저 `EventSource` API로 구현 단순
- **자동 재연결** 내장 (Last-Event-ID)
- 서버 → 클라 단방향이 충분한 경우 WebSocket보다 가벼움

**단점**:
- **단방향만** — 클라 → 서버는 별도 HTTP 요청
- 바이너리 전송 불가 (UTF-8 텍스트만)
- 일부 오래된 브라우저 미지원 (IE)
- **HTTP/1.1 연결 제한** (브라우저 도메인당 6개)

**사용**: 알림 푸시, 뉴스·주식·스포츠 피드, LLM 스트리밍 응답, 실시간 대시보드.

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
- 텍스트·바이너리 모두 지원

**단점**:
- **HTTP 외부** → 방화벽·프록시가 막는 경우 있음
- 재연결·재인증·heartbeat 직접 구현
- 수평 확장 시 **세션 상태 분산** 문제 ([[STOMP-Protocol]] · Redis Pub/Sub 활용)
- LB가 sticky session 필요 or 브로커 기반

**사용**: 채팅, 실시간 게임, 협업 편집, 트레이딩 터미널.

## WebRTC

클라이언트 간 **P2P 통신**. 서버는 시그널링(연결 수립 중개)만 담당하고 실제 데이터는 클라 간 직접.

**구성 요소**:
- **STUN**: NAT 뒤의 공인 IP 발견
- **TURN**: P2P 불가 시 릴레이
- **ICE**: 여러 경로 중 최적 선택
- **시그널링 서버**: SDP(세션 설명) 교환 (WebSocket·HTTP 등으로 구현)

**장점**:
- **초저지연** (서버 경유 없음)
- 음성·영상·데이터 채널 모두 지원
- 브라우저 네이티브

**단점**:
- **시그널링 서버 필요** (WebRTC 단독 아님)
- NAT·방화벽 관통이 100% 보장 안 됨 → TURN 릴레이 비용
- 구현 복잡 (SDP·ICE·Codec 협상)
- 대규모 브로드캐스트에 부적합 (각 peer가 자원 부담)

**사용**: 1:1 or 소규모 화상 통화, 저지연 P2P 스트리밍, 원격 데스크톱.

## WebTransport

HTTP/3(QUIC) 기반 **차세대 양방향 통신**. UDP 위에서 신뢰성·순서 보장 여부를 스트림별로 선택.

**특징**:
- 양방향 **+ 서버·클라 단방향 스트림**
- **Head-of-Line Blocking 없음** (QUIC 스트림)
- 신뢰성·순서 보장을 **스트림별 선택** (신뢰 필요 없는 게임 데이터는 unreliable)
- 기본 TLS 암호화

**장점**: 성능·유연성 최고.
**단점**:
- **아직 실험적** — Safari 미지원, Node.js 기본 지원 부재
- HTTP/3 인프라 필요
- 실무 사례 적음

**사용**: 당장 도입은 이르지만, 저지연 게임·스트리밍 차세대 후보.

## 선택 가이드

| 요구 | 추천 |
|---|---|
| 서버 → 클라 단방향 (알림·피드) | **SSE** |
| 양방향 실시간 (채팅·게임) | **WebSocket** |
| 레거시 호환·무조건 HTTP만 | **Long Polling** |
| 저지연 P2P (화상 통화·원격) | **WebRTC** |
| HTTP/3 환경 + 미래 대비 | **WebTransport** |
| LLM 응답 스트리밍 | **SSE** (chunked + event stream) |
| 브라우저·모바일 푸시 | **SSE** 또는 WebSocket |
| 대규모 채팅 서비스 | **WebSocket + STOMP/Redis Pub/Sub** |

## 성능·확장성 비교

**지연시간**: WebSocket ≈ WebRTC < WebTransport < SSE < Long Polling
**서버 부하 (동시 커넥션)**: Long Polling(최대) > WebSocket ≈ SSE > WebRTC(서버는 시그널만)
**방화벽 호환**: Long Polling > SSE > WebSocket > WebRTC > WebTransport

## 브라우저 한계

- 도메인당 **최대 6개 HTTP/1.1 커넥션** → SSE·Long Polling 여러 개 열 수 없음
- HTTP/2·HTTP/3는 이 한계 없음 → SSE를 HTTP/2로 올리는 게 현대 권장
- 모바일 백그라운드에선 WebSocket·SSE 끊기 쉬움 → Push Notification 별도 필요

## 실무 함정

- **WebSocket 하나 열고 재연결 안 만듦** — 네트워크 끊기면 복구 불가
- **SSE로 쌍방향 시도** — 설계 오류
- **WebRTC를 1:N 브로드캐스트에** — SFU/MCU 서버 필요
- **Long Polling을 "간단한 실시간"으로** — 서버 커넥션 폭발

## 면접 체크포인트

- 5가지 기술의 통신 방향과 프로토콜 구분
- SSE가 WebSocket보다 가벼운 이유
- WebSocket 수평 확장에 왜 Redis Pub/Sub 같은 게 필요한가
- WebRTC에 시그널링 서버가 필요한 이유
- Long Polling이 왜 서버 부하가 큰가
- LLM 응답 스트리밍에 SSE를 쓰는 이유

## 출처
- [ricki-lee (Medium) — 웹 소켓 vs SSE vs 롱 폴링 vs WebRTC vs 웹 트랜스포트](https://ricki-lee.medium.com/웹-소켓-vs-server-sent-events-vs-롱-폴링-vs-webrtc-vs-웹-트랜스포트-25bb6be64904)

## 관련 문서
- [[WebSocket|WebSocket]]
- [[STOMP-Protocol|STOMP Protocol]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[HTTP-Chunked-Transfer|HTTP Chunked Transfer (SSE 내부)]]
