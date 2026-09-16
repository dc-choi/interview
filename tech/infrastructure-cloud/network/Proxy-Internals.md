---
tags: [infrastructure, network, proxy, socket, stream, l4, l7, tunnel]
status: done
category: "Infrastructure - 네트워크"
aliases: ["Proxy Internals", "프락시 동작 구조", "프록시 동작 원리", "애플리케이션 프록시", "소켓 스트림 중계", "L4 프록시와 L7 프록시", "프록시 두 연결"]
verified_at: 2026-09-16
---

# 프락시 동작 구조: 소켓 스트림 중계와 두 개의 연결

프락시(proxy)는 클라이언트와 서버 사이에서 통신을 대리하는 중계자다. 여기까지는 라우터나 스위치도 같아 보이지만, 무엇을 대리하느냐보다 **어떤 데이터 단위를 다루느냐**가 프락시를 다른 장비와 구분한다. 라우터와 스위치는 지나가는 패킷을 개별적으로 처리하고, 애플리케이션 프락시는 유저 모드 프로세스로서 소켓 위의 바이트 스트림을 다룬다. 어느 방향을 대리하는지(포워드와 리버스)는 [[Forward-vs-Reverse-Proxy]], 리버스 프락시의 설정과 운영은 [[Reverse-Proxy]].

한 줄 요약: **라우터는 패킷을 통과시키고, 프락시는 연결을 끊고 새로 만든다. 프락시를 지나는 트래픽은 지나간 것이 아니라 한 번 끝났다가 다시 시작된 것이다.**

## 패킷을 옮기는 장비와 스트림을 중계하는 프락시

| 구분 | 패킷 단위 처리 | 소켓 스트림 단위 처리 |
|---|---|---|
| 대표 장비 | 라우터, L2/L3 스위치, NAT, L4 패킷 포워더 | 애플리케이션 프락시, API Gateway, L7 로드밸런서 |
| 실행 위치 | 하드웨어 또는 커널 네트워크 스택 | 유저 모드 프로세스 |
| 다루는 단위 | 프레임과 패킷을 개별적으로 | `accept()`한 연결 위의 바이트 열 |
| 입출력 관계 | 입력 패킷과 출력 패킷이 대체로 1대 1 | 입력과 출력의 패킷 크기, 개수에 대응 관계가 없다 |
| 연결의 수 | 종단 사이에 하나 | 양쪽에 각각 하나씩, 둘 |
| 내용 해석 | 헤더 중심, 내용 해석은 [[Network-Encapsulation#DPI(Deep Packet Inspection): 내용물까지 검사\|DPI]] 같은 추가 기능 | 프로토콜 파서로 메시지를 재구성 |

HAProxy 문서는 이 차이를 명시적으로 나눈다. 패킷 기반 처리는 "There is a 1-to-1 relation between input and output packets"이고, 프락시가 수행하는 세션 내용 기반 처리는 "there are two distinct connections on each side, and that there is no relation between input and output packets sizes nor counts"다. 같은 문서는 HAProxy 자신에 대해 "it will not see IP packets nor UDP datagrams, will not perform NAT or even less DSR"라고 적는다.

그래서 프락시를 만들거나 고를 때 먼저 정할 것은 방향이나 제품이 아니라 처리 단위다. 패킷 수준의 주소 변환과 전달이 필요하면 NAT, 라우팅, L4 포워딩의 영역이고([[IPv4-NAT-and-Traversal|NAT]]), 요청 내용을 읽고 판단해야 하면 소켓 스트림을 받아 파싱하는 프락시의 영역이다. 경로 위에 둘지 사본만 볼지는 또 다른 축이다. [[Inline-vs-Out-of-Path|인라인과 아웃오브패스]]

## 프락시는 두 개의 연결을 종단한다

```mermaid
flowchart LR
    C[클라이언트] -- 연결 A --> P[프락시 프로세스]
    P -- 연결 B --> S[업스트림 서버]
```

프락시는 연결 A를 `accept()`로 받아 **종단**하고, 별도로 연결 B를 `connect()`로 **직접 개시**한 뒤 두 소켓 사이에서 데이터를 옮긴다. 클라이언트가 보낸 TCP 세그먼트가 그대로 서버에 도착하는 것이 아니라, 프락시가 읽어들인 바이트가 프락시의 새 연결에서 새로 세그먼트화되어 나간다. HAProxy 문서의 표현으로는 "accept a TCP connection from a listening socket, connect to a server and attach these sockets together allowing traffic to flow in both directions"다.

이 구조가 프락시의 거의 모든 성질을 결정한다.

- **TLS를 종단할 수 있는 이유**: 연결 A의 TLS 세션이 프락시에서 끝나므로 프락시가 평문을 얻는다. 연결 B는 평문으로 두거나 프락시가 새로 맺은 TLS로 다시 감쌀 수 있다. [[HTTPS-TLS]]
- **클라이언트 정보가 사라지는 이유**: 서버가 보는 것은 연결 B의 출발지, 즉 프락시의 주소와 포트다. PROXY protocol 명세는 이를 "Relaying TCP connections through proxies generally involves a loss of the original TCP connection parameters such as source and destination addresses, ports, and so on"으로 적는다.
- **버퍼링이 생기는 이유**: 두 연결의 속도가 다르므로 프락시가 중간에 버퍼를 두고 흡수한다. [[Reverse-Proxy|proxy_buffering]]
- **연결 재사용이 가능한 이유**: 연결 B는 프락시가 소유하므로 클라이언트가 끊어도 유지하며 다음 요청에 재사용할 수 있다. [[Connection-Pool|커넥션 풀]]
- **자원이 두 배로 드는 이유**: 활성 연결 하나마다 프락시는 소켓 두 개를 동시에 들고 있다. [[File-Descriptor-Limit|파일 디스크립터 한계]]

## 유저 모드 프로세스라는 제약

애플리케이션 프락시는 커널이 아니라 유저 모드에서 도는 평범한 프로그램이다. 소켓은 파일 디스크립터이고, 프락시는 `read()`와 `write()`로 데이터를 옮긴다. [[Network-Encapsulation#소켓과 스트림: 유저 모드의 출발점|소켓과 스트림]]

여기서 두 가지 비용이 나온다. 첫째, 데이터가 커널 버퍼에서 유저 공간으로 복사됐다가 다시 커널로 돌아간다. 둘째, 연결마다 스레드를 두면 수만 연결에서 컨텍스트 스위치가 감당되지 않는다. 그래서 실무 프락시는 대체로 두 가지 대응을 쓴다.

- **이벤트 기반 다중화**: 한 스레드가 `epoll`이나 `kqueue`로 많은 소켓의 준비 상태를 감시하고 준비된 것만 처리한다. [[Epoll-Kqueue|epoll과 kqueue]]
- **커널 내 복사 생략**: Linux의 `splice(2)`는 "moves data between two file descriptors without copying between kernel address space and user address space"하며, 두 디스크립터 중 하나는 파이프여야 한다. HAProxy는 이를 "TCP splicing to let the kernel forward data between the two sides of a connections thus avoiding multiple memory copies"로 설명한다.

단, 내용을 봐야 하는 처리와 복사 생략은 함께 갈 수 없다. 데이터를 유저 공간으로 가져오지 않으면 파싱도 변형도 할 수 없으므로, 헤더 조작이나 TLS 종료가 필요한 구간에서는 splice 계열 최적화를 쓸 수 없다.

## L4 프락시와 L7 프락시

둘 다 두 연결을 종단한다는 점은 같고, 그 위의 바이트를 어떻게 다루는지가 다르다.

| 구분 | L4 프락시 | L7 프락시 |
|---|---|---|
| 다루는 단위 | 연결 위의 바이트 열 | 파싱된 요청과 응답 메시지 |
| 판단 근거 | 출발지, 목적지, 포트, SNI 같은 연결 수준 정보 | 호스트, 경로, 헤더, 쿠키, 메서드 |
| 할 수 있는 일 | 대상 선택, 연결 수 제한, TLS 통과 | 라우팅, 헤더 조작, 재시도, 캐싱, 압축, rate limit |
| 대가 | 내용을 모른다 | 파싱과 재구성 비용, 프로토콜 호환성 부담 |
| 구현 예 | Nginx `ngx_stream_proxy_module`, HAProxy `mode tcp`, AWS NLB | Nginx `ngx_http_proxy_module`, HAProxy `mode http`, Envoy HTTP filter, AWS ALB |

Envoy의 구조가 이 두 층을 그대로 드러낸다. Envoy는 기본적으로 L3/L4 프락시이고 필터 체인으로 TCP, UDP 등을 처리하며, 그 위에 `HTTP connection manager`라는 네트워크 필터가 raw byte를 HTTP 수준의 메시지와 이벤트로 번역한다. L7 HTTP 필터는 그렇게 만들어진 메시지 위에서 HTTP/1.1과 HTTP/2 같은 하위 프로토콜을 몰라도 동작한다.

L4와 L7은 제품의 등급이 아니라 그 구간에서 쓰는 처리 단위다. 같은 Nginx가 `stream` 블록에서는 L4로, `http` 블록에서는 L7로 동작한다. 대상 선택 기준으로서의 L4와 L7 구분은 [[Load-Balancer]].

## 터널: 중계하되 해석하지 않는다

중계의 세 번째 형태가 터널이다. RFC 9110은 터널을 "acts as a blind relay between two connections without changing the messages"로 정의하고, 한 번 활성화되면 터널은 HTTP 통신의 당사자로 보지 않으며 양쪽 연결이 모두 닫히면 사라진다고 적는다. 같은 문서는 프락시를 "a message-forwarding agent that is chosen by the client"로, 리버스 프락시에 해당하는 게이트웨이를 "an intermediary that acts as an origin server for the outbound connection but translates received requests and forwards them inbound to another server or servers"로 정의한다.

포워드 프락시가 HTTPS 요청을 중계할 때 쓰는 `CONNECT`가 대표적이다. 프락시는 목적지로 TCP 연결을 열고 그 뒤로는 바이트를 그대로 옮기기만 하므로, 두 연결을 종단하는 구조는 유지되면서도 TLS는 클라이언트와 최종 서버 사이에서 끝난다. 그래서 터널 구간의 프락시는 목적지 호스트와 포트, 트래픽 양과 타이밍은 알아도 본문은 읽지 못한다.

## 잃어버린 클라이언트 정보를 되돌리는 방법

| 방법 | 동작 계층 | 적용 범위 | 주의 |
|---|---|---|---|
| `X-Forwarded-For`, `Forwarded` | HTTP 헤더 | HTTP만 | 클라이언트가 위조할 수 있어 신뢰 가능한 프락시 체인에서만 유효 |
| PROXY protocol | TCP 연결 시작 시 헤더 한 번 | 프로토콜 무관 (SMTP, SSH 등 포함) | 수신 측이 반드시 이 프로토콜만 받도록 설정해야 하고, 존재 여부를 추측하면 안 된다 |
| Transparent proxy 바인딩 | 출발지 IP 위장 | L4 | Nginx `proxy_bind ... transparent` 같은 기능과 라우팅 설계가 함께 필요 |

PROXY protocol 명세는 수신 측 설정을 강제한다. "The receiver MUST be configured to only receive the protocol described in this specification and MUST not try to guess whether the protocol header is present or not." 추측을 허용하면 신뢰되지 않은 클라이언트가 출발지 주소를 위조할 수 있기 때문이다. 헤더 표기의 상세는 [[Forward-vs-Reverse-Proxy#X-Forwarded-For 헤더|X-Forwarded-For]].

## 설계 체크포인트

- 이 구간에서 필요한 것이 패킷 수준 전달인지 스트림 수준 해석인지 먼저 정한다. 내용을 보지 않아도 되면 L4로 두는 편이 단순하고 빠르다.
- 타임아웃, 재시도, keep-alive는 연결 A와 연결 B에 각각 존재한다. 한쪽만 조정하고 끝났다고 보지 않는다.
- 업스트림 연결은 프락시가 소유하므로 커넥션 풀 크기, 재사용 정책, 업스트림당 포트와 디스크립터 소비를 함께 계산한다.
- TLS를 어디서 끊을지 정한다. 종단하면 내용 기반 처리가 가능해지고, 터널로 통과시키면 종단 간 기밀성이 유지되지만 L7 기능을 쓸 수 없다.
- 클라이언트 IP가 필요하면 전달 방법과 신뢰 경계를 함께 정한다. 신뢰할 프락시 IP 목록이 없으면 전달받은 값은 근거가 되지 못한다.
- 헤더 조작이나 검사가 필요한 구간에 splice 계열 최적화를 기대하지 않는다. 내용을 보는 것과 복사를 생략하는 것은 함께 성립하지 않는다.
- 프락시는 경로 위에 있으므로 장애가 곧 경로 장애다. 이중화와 장애 시 동작을 [[Inline-vs-Out-of-Path|인라인 장비]]와 같은 기준으로 정한다.

## 면접 체크포인트

- 라우터와 프락시의 처리 단위 차이, 입출력 패킷의 1대 1 관계가 프락시에서는 성립하지 않는 이유
- 프락시가 두 개의 연결을 종단한다는 사실에서 TLS 종료, 클라이언트 IP 소실, 버퍼링, 커넥션 재사용이 함께 따라 나오는 과정
- 유저 모드 프락시의 복사 비용과 `epoll`, `splice` 같은 대응, 그리고 내용 검사와 복사 생략이 양립하지 않는 이유
- L4 프락시와 L7 프락시가 같은 제품 안에서 모드로 갈리는 구조, Envoy에서 HTTP connection manager가 맡는 역할
- 터널(CONNECT)이 프락시와 다른 점과 그때 프락시가 볼 수 있는 정보의 범위
- `X-Forwarded-For`와 PROXY protocol의 적용 범위 차이, 두 방법 모두 신뢰 경계 설정 없이는 위조 가능한 이유

## 출처

- [Proxy의 구조와 작동원리 — 널널한 개발자 TV](https://www.youtube.com/watch?v=dThqHi8-MiQ&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=20)
- [IETF, RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [HAProxy, 3.0 Starter Guide](https://docs.haproxy.org/3.0/intro.html)
- [HAProxy, The PROXY protocol Versions 1 & 2](https://www.haproxy.org/download/2.8/doc/proxy-protocol.txt)
- [Linux man-pages, splice(2)](https://man7.org/linux/man-pages/man2/splice.2.html)
- [Nginx, ngx_stream_proxy_module](https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html)
- [Envoy, What is Envoy](https://www.envoyproxy.io/docs/envoy/latest/intro/what_is_envoy)

## 관련 문서

- [[Forward-vs-Reverse-Proxy|Forward vs Reverse Proxy (방향과 용도)]]
- [[Reverse-Proxy|Reverse Proxy (Nginx 설정과 운영)]]
- [[Load-Balancer|Load Balancer (L4/L7 대상 선택)]]
- [[Network-Encapsulation|캡슐화와 데이터 단위 (소켓 스트림, 세그먼트, 패킷)]]
- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]]
- [[HTTPS-TLS|HTTPS와 TLS Handshake]]
- [[Epoll-Kqueue|epoll과 kqueue (이벤트 기반 다중화)]]
- [[File-Descriptor-Limit|파일 디스크립터 한계]]
- [[Connection-Pool|커넥션 풀]]
- [[IPv4-NAT-and-Traversal|IPv4 NAT와 NAPT]]
- [[인프라네트워크(InfraNetwork)|인프라 네트워크 인덱스]]
