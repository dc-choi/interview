---
tags: [palantir, listeners, streaming, security]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Listener의 수신, 처리와 보안 경계

Listener는 표준 Foundry OAuth나 payload 형식에 맞출 수 없는 외부 시스템의 inbound 연결을 받는다. 외부 코드 변경이 가능하면 공식 public API를 우선 검토한다. 수신 Listener와 외부로 보내는 Source/webhook은 역할이 다르다.

## 수신 방식과 한도

| 방식 | 목적지 | 문서상 상태와 한도 |
| --- | --- | --- |
| HTTPS | Stream | GA, 대략 초당 100 request, 개별 event/request 1MB |
| WebSocket | 자동 생성된 compute module | Beta, 지속적인 양방향 연결 |
| Email | Media set | GA지만 enrollment별 제공 여부 확인, 첨부 포함 40MB, enrollment당 최대 10개 |

HTTPS의 제한보다 높은 처리량은 streaming sync나 public streaming API를 검토한다. 위 수치는 보장된 처리 성능이나 모든 배포 환경의 동일 설정을 뜻하지 않는다.

## 처리 보장 선택

Automate는 낮은 처리량, stateless 작업, 수초 지연과 at-least-once가 허용될 때 적합하다. Streaming pipeline은 높은 처리량과 stateful 처리를 지원하고 선택적으로 exactly-once 처리를 제공한다. 이 옵션을 외부 API 호출까지의 exactly-once 효과로 확대하지 않는다.

HTTPS stream은 몇 분마다 backing dataset에 archive된다. 실시간 반응 대신 역사 분석이 목적이면 이 dataset으로 batch pipeline을 구성할 수 있다. Event 수신, stream 반영과 downstream 업무 변경은 서로 다른 완료 시점이다.

## 인증과 민감 데이터

외부 서비스용 Listener는 각 서비스의 서명 및 검증 프로토콜을 구현한다. Palantir는 그 프로토콜의 적합성과 효과를 일괄 보장하지 않는다. 민감 정보 redaction도 best effort이므로 token이 request body에 남을 수 있다. Listener와 output stream 양쪽의 Project 접근과 markings를 제한한다.

Email은 기본적으로 모든 발신자를 거부한다. 주소나 domain allowlist를 명시해야 하며 AWS SES의 SPF, DKIM, DMARC, spam 및 virus 검사 중 하나라도 실패하면 거부한다. 실행 파일과 script MIME 형식도 차단한다. Provisioning 승인이 끝나고 Active로 전환되어야 처리하며, Rejected 상태는 삭제만 가능하다. 이 검사들이 발신자 업무 권한이나 첨부 내용의 무해성을 증명하는 것은 아니다.

## WebSocket의 실행 주체

외부 서비스용 WebSocket은 전용 subdomain, ingress와 서비스별 인증을 구성한다. 현재 지원 처리 방식은 Listener가 자동 생성한 compute module이다. Module은 기본적으로 자원 권한이 없으므로 입력과 출력을 명시한다. 양방향 응답으로 데이터가 나갈 수 있어 exportable markings도 구성한다. Marking이 있는 데이터를 허용하려면 해당 marking을 해제할 수 있는 사용자가 설정해야 한다.

Foundry 인증 WebSocket은 primary domain을 사용하고 caller의 Listener 및 compute module 권한을 확인한다. 내부 server 주소는 `ws://localhost:5000/`로 고정되며 `0.0.0.0:5000`에서 `/` upgrade를 받아야 한다. Public endpoint path와 client token은 server에 전달되지 않는다. 따라서 client 인증을 해당 사용자의 token으로 내부 자원을 자동 조회하는 구조로 해석하지 않는다.

Client는 upgrade의 `Authorization: Bearer ...` 또는 browser WebSocket subprotocol의 `Bearer-...`를 사용한다. Primary domain ingress와 Listener 활성화는 여전히 필요하다.

## 출처

- [Palantir, Listeners overview](https://www.palantir.com/docs/foundry/data-connection/listeners-overview)
- [Palantir, HTTPS listeners](https://www.palantir.com/docs/foundry/data-connection/listeners-https)
- [Palantir, Event processing](https://www.palantir.com/docs/foundry/data-connection/listeners-event-processing)
- [Palantir, HTTPS security](https://www.palantir.com/docs/foundry/data-connection/listeners-https-security)
- [Palantir, WebSocket listeners](https://www.palantir.com/docs/foundry/data-connection/listeners-websocket)
- [Palantir, WebSocket Foundry authentication](https://www.palantir.com/docs/foundry/data-connection/listeners-websocket-foundry-auth)
- [Palantir, WebSocket security](https://www.palantir.com/docs/foundry/data-connection/listeners-websocket-security)
- [Palantir, Email listeners](https://www.palantir.com/docs/foundry/data-connection/listeners-email)
- [Palantir, Email security](https://www.palantir.com/docs/foundry/data-connection/listeners-email-security)

## 관련 문서

- [[Palantir-Listener-Integration-and-Rotation|서비스 연결과 endpoint 교체]]
- [[Palantir-Webhook-Execution-Contracts|Outbound webhook]]
- [[Palantir-Data-Connectivity|데이터 연결]]

공식 문서 본문을 확인했다. 실제 수신, 서명 검증, 부하와 end-to-end 처리 보장은 시험하지 않았다.
