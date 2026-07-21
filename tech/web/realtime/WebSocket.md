---
tags: [web, network, websocket, realtime]
status: done
verified_at: 2026-07-21
category: "웹&네트워크(Web&Network)"
aliases: ["WebSocket"]
---

# WebSocket

HTTP 위에서 **단일 TCP 연결을 유지하며 양방향 실시간 통신**을 가능하게 하는 프로토콜(RFC 6455). HTTP 요청으로 시작해 `Upgrade` 핸드셰이크 이후에는 HTTP 의미를 벗어나 프레임 단위로 메시지를 교환한다.

## 핵심 명제

- **전이중(Full-Duplex)** — 클라이언트와 서버가 동시에 송, 수신
- **지속 연결** — 한 번 수립하면 명시적 종료 전까지 유지
- **저지연** — 매 메시지마다 HTTP 헤더가 붙지 않으므로 폴링, SSE 대비 오버헤드 낮음
- **HTTP 호환 진입** — 80/443 포트, 기존 프록시 인프라 활용 가능
- **양방향이 필요 없으면 과한 선택** — 서버→클라 단방향 알림은 [[Realtime-Chat-Architecture|SSE]]가 더 단순

## 연결 수명주기

### 1. Opening Handshake

고전적인 opening handshake는 HTTP/1.1 Upgrade 요청으로 시작한다. HTTP/2에서는 별도의 extended CONNECT 방식이 정의돼 있으므로 같은 Upgrade 헤더 흐름으로 일반화하지 않는다.

- `Upgrade: websocket` — 전환 대상 프로토콜. 누락, 다른 값이면 cross-protocol attack으로 간주되어 거부
- `Connection: Upgrade` — hop-by-hop `Upgrade` 헤더를 이 연결에 적용할 옵션으로 표시하고 프로토콜 전환을 요청
- `Sec-WebSocket-Key` — 클라이언트 nonce. 서버가 이 값과 고정 GUID를 SHA-1, base64 처리해 `Sec-WebSocket-Accept`로 응답하면 WebSocket handshake를 이해했다는 것을 확인한다. 서버 신원은 TLS 인증서와 애플리케이션 인증으로 검증한다.
- `Sec-WebSocket-Version: 13` — 프로토콜 버전
- `Sec-WebSocket-Protocol` — 선택적 서브 프로토콜(STOMP, MQTT 등)
- `Origin` — 브라우저가 자동 첨부. CORS 유사 보안 판단에 사용

서버가 `101 Switching Protocols`로 응답하면 이후 커넥션은 WebSocket 프레임으로 전환된다.

### 2. Data Transfer

- 통신 단위는 **메시지**이며 하나 이상의 **프레임**으로 구성
- 프레임 헤더는 opcode(text/binary/ping/pong/close), 마스킹 플래그, 길이 정보를 담는다
- 연결 후 어느 쪽이든 선택적으로 Ping을 보낼 수 있고, 받은 쪽은 연결을 닫는 중이 아니라면 Pong으로 응답해야 한다. 주기, timeout, 누가 Ping을 시작할지는 애플리케이션과 인프라 정책이다.
- 메시지 내용의 해석은 **애플리케이션 책임** — WebSocket 자체는 문자열/바이너리 페이로드만 전달

### 3. Closing Handshake

- 한쪽이 Close 제어 프레임 전송 → 상대가 Close 프레임으로 응답 → TCP FIN
- Close 프레임에는 1000 Normal, 1001 Going Away 같은 허용된 상태 코드를 넣어 종료 원인을 전달할 수 있다. 1006 Abnormal Closure는 프레임으로 전송할 수 없는 예약 값이며, Close 프레임 없이 비정상 종료됐음을 애플리케이션이 관찰할 때 사용한다.

## HTTP와의 차이

| 항목 | HTTP | WebSocket |
|---|---|---|
| 연결 | 지속 연결을 재사용할 수 있지만 요청, 응답 의미 유지 | handshake 후 프레임 연결 유지 |
| 통신 방향 | 클라이언트 → 서버 단방향 시작 | 양방향 |
| 메시지 포맷 | 헤더 + 바디(표준) | 프레임(해석은 앱 책임) |
| 상태 | 무상태 | 연결 유지 = 상태 있음 |
| 캐싱 | HTTP 캐시 활용 | 불가 |

## 한계와 보완

- **프레임 포맷은 얇다** — 애플리케이션이 직접 메시지 구조를 정해야 함 → [[STOMP-Protocol|STOMP]] 같은 서브 프로토콜로 해결
- **프록시, 방화벽 이슈** — 일부 기업 프록시가 `Upgrade`를 막으면 연결 실패 → SSE, Long Polling fallback
- **수평 확장 시 메시지 전달** — 서버 인스턴스가 여러 대면 Pub/Sub 백본이 필요 → [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- **인증** — 브라우저 WebSocket API는 임의의 `Authorization` 헤더 설정을 지원하지 않지만 쿠키와 `Sec-WebSocket-Protocol`은 사용할 수 있다. 비브라우저 client는 추가 헤더를 지원할 수 있다. 쿼리 문자열 토큰은 URL과 로그에 노출될 수 있어 피하고, 핸드셰이크에서 인증과 `Origin`을 검증한 뒤 장기 연결의 권한 만료와 재인증 정책을 둔다.

## 아웃바운드 연결 패턴 — 공개 엔드포인트 없이 수신

사내망처럼 인바운드를 열 수 없는 환경에서 외부 서비스의 이벤트를 받아야 할 때, **서버가 클라이언트가 되어 외부로 WebSocket을 먼저 여는** 역발상 패턴. 방화벽은 대개 아웃바운드를 허용하므로 공개 URL, 인바운드 포트 개방 없이 양방향 채널을 확보한다.

- 대표 구현: **Slack Socket Mode** — 봇이 슬랙에 아웃바운드 WebSocket을 열어 슬래시 커맨드, 이벤트를 수신. 공개 Request URL이 불필요해 사내망 ALB 뒤에서도 동작
- 같은 원리: 웹훅 터널링(ngrok), self-hosted CI 러너의 아웃바운드 롱커넥션, NAT 뒤 IoT 디바이스
- 트레이드오프: 재연결, ping/pong 등 연결 유지 관리가 이쪽 몫이 되고, 수평 확장 시 어느 인스턴스가 연결을 여는지 조정이 필요

## 면접 체크포인트

- 핸드셰이크에서 HTTP → WebSocket으로 전환되는 상태 코드(**101**)와 필수 헤더
- `Sec-WebSocket-Key` / `Sec-WebSocket-Accept`의 역할
- HTTP Long Polling, SSE, WebSocket의 적합 시나리오 차이
- 메시지 포맷이 없는 WebSocket 위에 STOMP, MQTT 같은 서브 프로토콜이 필요한 이유
- 수평 확장에서 Pub/Sub(Redis, Kafka) 백본이 필요한 이유
- 핑, 퐁과 프록시 idle timeout의 관계
- 인바운드를 열 수 없는 환경에서 아웃바운드 WebSocket으로 이벤트를 수신하는 패턴(Slack Socket Mode)

## 출처
- [RFC 6455, The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [Tecoble — WebSocket이란](https://tecoble.techcourse.co.kr/post/2021-08-14-web-socket/)
- [GA가 AI와 함께 만든 오피스 좌석 배치도 — 아임웹 기술 블로그](https://tech.imweb.me/posts/ga-built-office-seatmap/)

## 관련 문서
- [[STOMP-Protocol|STOMP 서브 프로토콜]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[HTTP-Status-Code|HTTP 상태 응답 코드]]
- [[OSI-7-Layer|OSI 7계층]]
