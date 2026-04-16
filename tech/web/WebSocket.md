---
tags: [web, network, websocket, realtime]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["WebSocket"]
---

# WebSocket

HTTP 위에서 **단일 TCP 연결을 유지하며 양방향 실시간 통신**을 가능하게 하는 프로토콜(RFC 6455). HTTP 요청으로 시작해 `Upgrade` 핸드셰이크 이후에는 HTTP 의미를 벗어나 프레임 단위로 메시지를 교환한다.

## 핵심 명제

- **전이중(Full-Duplex)** — 클라이언트와 서버가 동시에 송·수신
- **지속 연결** — 한 번 수립하면 명시적 종료 전까지 유지
- **저지연** — 매 메시지마다 HTTP 헤더가 붙지 않으므로 폴링·SSE 대비 오버헤드 낮음
- **HTTP 호환 진입** — 80/443 포트·기존 프록시 인프라 활용 가능
- **양방향이 필요 없으면 과한 선택** — 서버→클라 단방향 알림은 [[Realtime-Chat-Architecture|SSE]]가 더 단순

## 연결 수명주기

### 1. Opening Handshake

클라이언트가 HTTP/1.1 이상에서 다음 헤더로 업그레이드를 요청한다.

- `Upgrade: websocket` — 전환 대상 프로토콜. 누락·다른 값이면 cross-protocol attack으로 간주되어 거부
- `Connection: Upgrade` — 전송 완료 후에도 연결 유지
- `Sec-WebSocket-Key` — 임의 난수. 서버가 이 키 + 고정 GUID를 SHA-1 해시해 `Sec-WebSocket-Accept`로 응답하여 유효 WS 서버임을 증명
- `Sec-WebSocket-Version: 13` — 프로토콜 버전
- `Sec-WebSocket-Protocol` — 선택적 서브 프로토콜(STOMP·MQTT 등)
- `Origin` — 브라우저가 자동 첨부. CORS 유사 보안 판단에 사용

서버가 `101 Switching Protocols`로 응답하면 이후 커넥션은 WebSocket 프레임으로 전환된다.

### 2. Data Transfer

- 통신 단위는 **메시지**이며 하나 이상의 **프레임**으로 구성
- 프레임 헤더는 opcode(text/binary/ping/pong/close)·마스킹 플래그·길이 정보를 담는다
- 핸드셰이크 후 양쪽은 주기적으로 **ping/pong**을 주고받아 좀비 커넥션을 감지
- 메시지 내용의 해석은 **애플리케이션 책임** — WebSocket 자체는 문자열/바이너리 페이로드만 전달

### 3. Closing Handshake

- 한쪽이 Close 제어 프레임 전송 → 상대가 Close 프레임으로 응답 → TCP FIN
- 상태 코드(1000 Normal, 1001 Going Away, 1006 Abnormal 등)로 종료 원인을 명시

## HTTP와의 차이

| 항목 | HTTP | WebSocket |
|---|---|---|
| 연결 | 요청마다 수립(Keep-Alive로 완화) | 한 번 수립 후 유지 |
| 통신 방향 | 클라이언트 → 서버 단방향 시작 | 양방향 |
| 메시지 포맷 | 헤더 + 바디(표준) | 프레임(해석은 앱 책임) |
| 상태 | 무상태 | 연결 유지 = 상태 있음 |
| 캐싱 | HTTP 캐시 활용 | 불가 |

## 한계와 보완

- **프레임 포맷은 얇다** — 애플리케이션이 직접 메시지 구조를 정해야 함 → [[STOMP-Protocol|STOMP]] 같은 서브 프로토콜로 해결
- **프록시·방화벽 이슈** — 일부 기업 프록시가 `Upgrade`를 막으면 연결 실패 → SSE·Long Polling fallback
- **수평 확장 시 메시지 전달** — 서버 인스턴스가 여러 대면 Pub/Sub 백본이 필요 → [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- **인증** — 초기 핸드셰이크에서만 쿠키·헤더 전달 가능. 이후 프레임에는 표준 인증 수단이 없으므로 토큰을 핸드셰이크 쿼리·서브 프로토콜로 전달하고 서버가 검증

## 면접 체크포인트

- 핸드셰이크에서 HTTP → WebSocket으로 전환되는 상태 코드(**101**)와 필수 헤더
- `Sec-WebSocket-Key` / `Sec-WebSocket-Accept`의 역할
- HTTP Long Polling·SSE·WebSocket의 적합 시나리오 차이
- 메시지 포맷이 없는 WebSocket 위에 STOMP·MQTT 같은 서브 프로토콜이 필요한 이유
- 수평 확장에서 Pub/Sub(Redis·Kafka) 백본이 필요한 이유
- 핑·퐁과 프록시 idle timeout의 관계

## 출처
- [Tecoble — WebSocket이란](https://tecoble.techcourse.co.kr/post/2021-08-14-web-socket/)

## 관련 문서
- [[STOMP-Protocol|STOMP 서브 프로토콜]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[HTTP-Status-Code|HTTP 상태 응답 코드]]
- [[OSI-7-Layer|OSI 7계층]]
