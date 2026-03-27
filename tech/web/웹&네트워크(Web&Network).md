---
tags: [web, network]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["웹&네트워크(Web&Network)", "Web & Network"]
---

# 웹&네트워크(Web&Network)

### [[HTTP-Seminar|HTTP 버전별 진화와 핵심 요소]]

### HTTP 특징
- 비연결성(Connectionless): 클라이언트와 서버가 한번 연결을 맺은 후에 요청에 대한 응답을 마치면 논리적으로는 연결이 되어 있다고 생각하고 실제 물리적인 연결을 끊어버리는 것
- 연결을 끊어버리는 이유: 다수의 클라이언트와 연결을 지속할 경우 많은 리소스가 낭비됨. 그래서 응답을 마친 후 연결을 끊어서 리소스를 줄이고 더 많은 연결을 할 수 있도록 한다.
- 무상태(Stateless): server가 클라이언트의 요청을 받을 시 어떠한 데이터도 유지하지 않아 server는 클라이언트를 식별하지 못한다. 그래서 쿠키와 세션을 사용해서 데이터를 저장한다.

## HTTP & API
- [ ] [[HTTP-Versions|HTTP 1.1 / HTTP 2 / HTTP 3]]
- [x] [[HTTPS-TLS|HTTPS / TLS Handshake]]
- [x] [[OSI-7-Layer|OSI 7계층과 Internet vs Ethernet]]
- [ ] [[REST|REST / GraphQL / gRPC]]
- [x] [[HTTP-Status-Code|Status Code / Header]] / [[Cookie]]
- [ ] [[Content-Negotiation]]
- [ ] [[Idempotent-Safe-Method|Idempotent / Safe Method]]
- [ ] [[API-Versioning]]
- [ ] [[Pagination-Filtering-Sorting|Pagination / Filtering / Sorting]]
- [x] [[Rate-Limiting|Rate Limit 정책 설계]]
- [x] [[WebSocket]]
