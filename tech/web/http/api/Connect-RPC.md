---
tags: [web, network, api, rpc, connect, grpc, protobuf, contract-first]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
aliases: ["Connect RPC", "Connect Protocol", "Buf Connect"]
---

# Connect RPC

Connect는 Protobuf 서비스 계약으로 브라우저와 gRPC 호환 HTTP API를 만드는 라이브러리 계열이다. 자체 Connect 프로토콜과 gRPC, gRPC-Web 지원을 구분해야 한다. 하나의 `.proto`에서 메시지와 RPC를 정의하고 지원 언어의 클라이언트와 서버 코드를 생성한다.

핵심은 외부에는 REST, 내부에는 gRPC라는 위치 규칙보다 **계약, 직렬화와 전송을 나누어 선택하는 것**이다. 같은 서비스 계약을 브라우저의 JSON 호출, curl 진단과 기존 gRPC 클라이언트에 제공할 수 있다. 기존 REST API가 자동으로 같은 계약으로 바뀌거나 모든 클라이언트의 기능이 같아지는 것은 아니다.

## 계약과 wire format 분리

| 층 | 역할 | 확인할 조건 |
| --- | --- | --- |
| Protobuf 계약 | 서비스 메서드, 요청과 응답 메시지 정의 | 필드 번호, 이름과 타입 변경의 호환성 |
| 코드 생성 | 지원 언어의 메시지 타입과 서비스 코드를 생성 | 필요한 언어, 런타임과 생성 플러그인 지원 |
| 직렬화 | Protobuf binary 또는 ProtoJSON 사용 | 양쪽의 codec 지원과 payload 크기 |
| 프로토콜 | Connect, gRPC 또는 gRPC-Web의 HTTP 규칙 적용 | 서버 지원, HTTP 버전과 streaming 유형 |

Connect 서버는 Content-Type으로 요청 프로토콜을 구분한다. Go와 Node 서버처럼 여러 프로토콜을 지원하는 구현에서는 같은 비즈니스 로직을 서로 다른 wire 규칙으로 노출할 수 있다. 브라우저용 `@connectrpc/connect-web`은 Connect와 gRPC-Web transport를 제공하며 native gRPC transport와는 다르다.

Buf의 `buf generate`는 `.proto`에 플러그인을 적용해 메시지 코드와 Connect 서비스 코드를 생성하는 도구다. Buf 도구, Protobuf 스키마와 Connect 런타임은 각각 다른 책임을 갖는다. 단일 스키마를 유지해도 생성 코드의 배포와 버전 호환성 관리는 필요하다.

## 브라우저와 curl에서 쓰기 쉬운 이유

Connect unary RPC는 보통 `POST /<package>.<service>/<method>`로 호출한다. JSON일 때 Content-Type은 `application/json`, binary일 때 `application/proto`다. unary 본문에는 gRPC 방식의 메시지 프레이밍을 덧붙이지 않아 일반 HTTP 도구로 JSON을 읽고 보낼 수 있다.

아래는 공식 데모의 unary 호출 형식이다. 명령 예시이며 이 문서 작성 시 실제 API 호출 결과를 검증한 것은 아니다.

```bash
curl --header 'Content-Type: application/json' \
  --header 'Connect-Protocol-Version: 1' \
  --data '{"sentence":"Hello"}' \
  https://demo.connectrpc.com/connectrpc.eliza.v1.ElizaService/Say
```

- 브라우저는 `fetch`로 JSON unary 요청을 보낼 수 있다. 생성 클라이언트는 타입 검사와 RPC 오류 처리를 돕는다.
- Connect를 지원하는 서버에는 별도 gRPC 변환 프록시 없이 직접 연결할 수 있다. 서버가 native gRPC만 제공하면 Connect를 설치한 브라우저 클라이언트만으로 바로 연결되지는 않는다.
- JSON 호출을 제공해도 binary Protobuf를 제거할 필요는 없다. binary 지원 여부와 codec 설정은 양쪽 구현에서 확인한다.
- 다른 origin의 POST에는 CORS와 preflight 처리가 필요하다. 인증과 권한 검사도 그대로 남는다. 프록시 제거는 이 조건들을 제거한다는 뜻이 아니다.

## REST와 같은 것은 아니다

Connect는 HTTP와 JSON을 쓰기 쉬운 RPC다. 자원을 중심으로 URI와 HTTP 메서드를 설계하는 [[REST|REST]]와 달리 경로가 서비스와 메서드에서 나온다. JSON으로 호출된다는 이유만으로 REST라고 부르지 않는다.

부작용 없는 unary 메서드를 `NO_SIDE_EFFECTS`로 표시하고 서버와 클라이언트가 GET을 지원하도록 구성하면 HTTP 캐시를 활용할 수 있다. 모든 RPC가 GET 또는 CDN 캐싱 대상이 되는 것은 아니며 인증, 캐시 헤더와 메시지의 URL 길이를 따로 설계한다.

## streaming은 별도 조건으로 판단

| 범위 | 지원과 제한 |
| --- | --- |
| Connect 프로토콜 | unary, server/client/bidirectional streaming을 정의 |
| HTTP 버전 | 양방향 streaming은 HTTP/2 필요. 다른 형태는 HTTP/1.1도 가능 |
| Go와 Node 서버 | 세 가지 streaming 형태를 지원하되 HTTP 경로와 런타임 조건 확인 |
| 브라우저 Connect transport | 확인한 `connect-web` 구현은 unary와 server streaming 지원. client/bidirectional streaming은 지원하지 않음 |
| streaming 본문 | JSON codec도 binary envelope를 포함하며 단일 JSON 문서가 아님 |

위 범위는 2026-10-02 공식 문서와 `connect-es`의 브라우저 transport 소스 대조 기준이다. 프로토콜이 네 가지 RPC를 정의한다는 사실을 모든 브라우저의 지원으로 확대하지 않는다.

streaming 응답은 메시지 전송을 시작한 뒤 오류가 날 수 있어 HTTP 200만으로 성공을 판정하지 않는다. 종료 메시지의 오류를 읽어야 한다. 프록시 buffering, timeout과 양방향 경로의 HTTP/2 지원도 확인한다. unary를 curl로 쉽게 진단할 수 있다는 장점을 streaming 전체에 적용하지 않는다.

## 단일 스키마의 비용

Protobuf binary에서는 필드 번호가 중요하지만 ProtoJSON은 필드와 enum 이름도 wire에 포함한다. 이름 변경, 필드 삭제와 unknown field 처리의 호환성은 두 형식에서 같지 않다. `int64`는 JSON에서 문자열로, `bytes`는 base64 문자열로 표현하는 규칙도 고려해야 한다.

따라서 스키마 하나를 쓴다는 사실만으로 API 진화가 안전해지지는 않는다. JSON과 binary를 모두 노출하면 두 경로의 소비자와 codec 설정을 확인하고 [[Schema-Evolution|스키마 진화]] 규칙을 적용한다. 생성 타입도 업무 규칙, 권한과 런타임 입력 검증을 대신하지 않는다.

## 선택 조건

- 브라우저와 다언어 서비스가 같은 RPC 계약을 사용하고 기존 gRPC 클라이언트를 유지해야 할 때 검토한다.
- unary API를 일반 HTTP 도구로 진단하면서 Protobuf 계약과 binary 선택지를 유지하고 싶을 때 유리하다.
- 공개 자원 API, OpenAPI 도구와 HTTP 메서드 의미가 주요 요구라면 REST를 계속 비교한다.
- 브라우저의 양방향 streaming이 필수이면 Connect 프로토콜의 지원만 보고 결정하지 않는다. 실제 브라우저 transport와 WebSocket 같은 대안의 기능을 비교한다.
- 기존 프레임워크에 연결할 때 지원 서버 어댑터, 인증, 관측과 배포 경로를 확인한다. NestJS를 쓴다는 사실만으로 native gRPC transport가 Connect endpoint를 제공한다고 가정하지 않는다.

특정 프로젝트에서 Connect를 채택했다는 기록은 아니다. API 선택은 [[API-Comparison|API 방식 비교]]의 클라이언트, 계약과 운영 조건으로 판단한다.

## 이해 확인

1. 같은 `.proto`로 브라우저와 gRPC 클라이언트를 지원하려면 서버가 무엇을 지원해야 하며, JSON과 binary 호환성은 왜 따로 확인해야 하는가?
2. unary JSON을 curl로 호출할 수 있다는 사실이 브라우저의 양방향 streaming 지원을 보장하지 않는 이유는 무엇인가?

## 출처

- [단일 스키마와 Connect RPC에 관한 리포스트 — Threads](https://www.threads.com/@oploworks/post/Dd9Mz3xEcai) — 정리 계기, 기능 사실은 아래 공식 자료로 대조
- [Connect, Introduction](https://connectrpc.com/docs/introduction/)
- [Connect, Multi-Protocol Support](https://connectrpc.com/docs/multi-protocol/)
- [Connect, Connect Protocol Reference](https://connectrpc.com/docs/protocol/)
- [Connect, cURL & other clients](https://connectrpc.com/docs/curl-and-other-clients/)
- [Connect, Choosing a protocol](https://connectrpc.com/docs/web/choosing-a-protocol/)
- [Connect, CORS](https://connectrpc.com/docs/cors/)
- [Connect, Streaming](https://connectrpc.com/docs/go/streaming/)
- [Connect, Implementing services](https://connectrpc.com/docs/node/implementing-services/)
- [connect-web Connect transport 구현 — Connect 공식 저장소](https://github.com/connectrpc/connect-es/blob/main/packages/connect-web/src/connect-transport.ts)
- [Buf, Generating code](https://buf.build/docs/generate/)
- [Protocol Buffers, ProtoJSON Format](https://protobuf.dev/programming-guides/json/)

## 관련 문서

- [[gRPC|gRPC와 Protobuf 계약]]
- [[REST|REST와 자원 중심 API]]
- [[API-Comparison|API 방식 선택]]
- [[API-Documentation|계약 우선 API 문서화]]
- [[HTTP-2|HTTP/2 전송 조건]]
- [[Schema-Evolution|JSON과 Protobuf 스키마 진화]]
