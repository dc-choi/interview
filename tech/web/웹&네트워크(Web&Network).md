---
tags: [web, network]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["웹&네트워크(Web&Network)", "Web & Network"]
---

# 웹&네트워크(Web&Network)

### [[tech/web/http/HTTP-Seminar|HTTP 버전별 진화와 핵심 요소]]

### HTTP 특징
- 비연결성(Connectionless): 클라이언트와 서버가 한번 연결을 맺은 후에 요청에 대한 응답을 마치면 논리적으로는 연결이 되어 있다고 생각하고 실제 물리적인 연결을 끊어버리는 것
- 연결을 끊어버리는 이유: 다수의 클라이언트와 연결을 지속할 경우 많은 리소스가 낭비됨. 그래서 응답을 마친 후 연결을 끊어서 리소스를 줄이고 더 많은 연결을 할 수 있도록 한다.
- 무상태(Stateless): server가 클라이언트의 요청을 받을 시 어떠한 데이터도 유지하지 않아 server는 클라이언트를 식별하지 못한다. 그래서 쿠키와 세션을 사용해서 데이터를 저장한다.

## HTTP & API
- [x] [[tech/web/http/HTTP-Status-Code|Status Code / Header]] / [[tech/web/http/Cookie|Cookie]]
- [x] [[tech/web/http/HTTP-Content-Type|Content-Type · MIME Type (JSON/form-urlencoded/multipart, Accept vs Content-Type)]]
- [x] [[tech/web/http/REST|REST]]
- [x] [[tech/web/http/Rate-Limiting|Rate Limit 정책 설계]]
- [ ] [[HTTP-Versions|HTTP 1.1 / HTTP 2 / HTTP 3]]
- [ ] [[GraphQL]]
- [ ] [[gRPC]]
- [ ] [[Content-Negotiation]]
- [ ] [[Idempotent-Safe-Method|Idempotent / Safe Method]]
- [ ] [[API-Versioning]]
- [ ] [[Pagination-Filtering-Sorting|Pagination / Filtering / Sorting]]

## 네트워크
- [x] [[tech/web/network/HTTPS-TLS|HTTPS / TLS Handshake]]
- [x] [[tech/web/network/OSI-7-Layer|OSI 7계층과 Internet vs Ethernet]]
- [x] [[tech/web/network/Loopback-And-Localhost|Loopback · Localhost 동작 원리 (127.0.0.1·::1, loopback NIC, 커널 내 처리, 디버깅)]]
- [x] [[tech/web/network/Browser-URL-Flow|브라우저 URL 입력 프로세스 (DNS→ARP→TCP/TLS→HTTP→렌더링, Core Web Vitals)]]

## 실시간
- [x] [[tech/web/realtime/WebSocket|WebSocket]]
- [x] [[tech/web/realtime/Realtime-Chat-Architecture|실시간 채팅 아키텍처 (WebSocket + Redis Pub/Sub + 리액티브, 세션 누수·메시지 배칭)]]
- [x] [[tech/web/realtime/STOMP-Protocol|STOMP 서브 프로토콜 (WebSocket 위 pub/sub, Destination·Broker, Spring @MessageMapping)]]
