---
tags: [infrastructure, network, proxy, socket, stream, l4, l7, tunnel]
status: done
category: "Infrastructure - 네트워크"
aliases: ["Proxy Internals", "프락시 동작 구조", "프록시 동작 원리", "애플리케이션 프록시", "소켓 스트림 중계", "L4 프록시와 L7 프록시", "프록시 두 연결"]
verified_at: 2026-11-17
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

애플리케이션 프락시는 커널이 아니라 유저 모드에서 도는 평범한 프로그램이다. 소켓은 파일 디스크립터이고 프락시는 `read()`와 `write()`로 데이터를 옮긴다. [[Network-Encapsulation#소켓과 스트림: 유저 모드의 출발점|소켓과 스트림]]

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
| PROXY protocol | TCP 연결 시작 시 헤더 한 번 | 프로토콜 무관 (SMTP, SSH 등 포함) | 수신 측이 반드시 이 프로토콜만 받도록 설정해야 하고 존재 여부를 추측하면 안 된다 |
| Transparent proxy 바인딩 | 출발지 IP 위장 | L4 | Nginx `proxy_bind ... transparent` 같은 기능과 라우팅 설계가 함께 필요 |

PROXY protocol 명세는 수신 측 설정을 강제한다. "The receiver MUST be configured to only receive the protocol described in this specification and MUST not try to guess whether the protocol header is present or not." 추측을 허용하면 신뢰되지 않은 클라이언트가 출발지 주소를 위조할 수 있기 때문이다. 헤더 표기의 상세는 [[Forward-vs-Reverse-Proxy#X-Forwarded-For 헤더|X-Forwarded-For]].

## 연결 단위 인증과 업스트림 연결 고정

업스트림 연결 재사용은 HTTP가 stateless라는 전제에 기댄다. RFC 9110은 각 요청 메시지를 독립적으로 해석할 수 있고 연결과 메시지의 관계가 해석에 영향을 주지 않는다고 정의하며, 많은 구현이 이 성질 덕분에 프락시 연결을 재사용하거나 요청을 여러 서버로 분산한다고 적는다. 그래서 서버는 연결이 보호되고 특정 에이전트 전용이 아니면 같은 연결의 두 요청이 같은 사용자 에이전트에서 왔다고 가정하면 안 된다(MUST NOT). 같은 절(3.3)은 RFC 4559 같은 비표준 확장이 이 요구를 어겨 보안과 상호운용성 문제를 낳았다고 지적한다. 새 인증 방식에 대한 고려사항(16.4.2)은 연결에 기반하거나 묶인 인증을 명세 범위 밖으로 두고, 그 연결을 인증된 사용자 외에는 쓸 수 없도록 보장하지 않으면 본질적으로 결함이 있다고 본다.

RFC 4559의 `Negotiate`(SPNEGO로 Kerberos나 NTLM을 협상)와, 스스로를 RFC 4559와 비슷한 방식으로 설명하고 보안 고려사항을 RFC 4559 6절에 맡기는 NTLM over HTTP(MS-NTHT)가 그 예다. 서버가 `401`과 `WWW-Authenticate: Negotiate`로 응답하면 보안 컨텍스트가 완성될 때까지 토큰 교환이 이어질 수 있고, 클라이언트는 `401`을 받기 전에 첫 토큰을 `Authorization` 헤더에 담아 먼저 보낼 수도 있다. RFC 4559의 보안 고려사항은 클라이언트와 서버 사이의 HTTP 프락시가 인증된 연결을 서로 다른 인증 클라이언트 사이에서 공유하지 않아야 하며, 지키지 않으면 서버가 보안 컨텍스트의 연결 관계를 잃는다고 적는다.

리버스 프락시는 이런 백엔드 앞에서 업스트림 연결 공유를 깨고 클라이언트 연결 A마다 전용 연결 B를 고정해야 한다. 고정에는 수명 관리 질문 두 가지가 따른다.

- **언제 고정하는가:** 백엔드의 `WWW-Authenticate: NTLM`이나 `Negotiate` 도전을 본 뒤에 고정하면 그런 백엔드로 가는 연결에서만 전용 자원이 생기지만, 클라이언트가 도전 전에 먼저 보낸 자격증명 요청은 공유 풀에서 처리될 수 있다. Traefik은 PR #13902에서 이 경우 인증된 업스트림 소켓이 공유 풀에 남아 다른 클라이언트 연결에 넘어가 신원을 물려줄 수 있다는 점을 변경 이유로 들었다. 요청의 `Authorization` 헤더를 보고 고정하면 자격증명이 공유 풀에 섞이지 않지만, 인증하지 않은 클라이언트도 헤더 하나로 전용 자원을 만들 수 있다. 어느 쪽이든 아래 해제가 함께 있어야 한다.
- **언제 푸는가:** 클라이언트 연결이 닫히면 전용 transport와 유휴 업스트림 연결, 이를 처리하는 goroutine이나 작업 스레드를 바로 해제해야 한다. Traefik처럼 클라이언트 연결마다 transport와 풀을 따로 만드는 구현에서는 호스트당 유휴 연결 상한 같은 풀 설정이 이 자원 전체를 묶어 주지 않는다(PR #14144의 코드 주석). 해제가 유휴 타임아웃에만 맡겨지면 짧은 연결을 빠르게 반복하는 것만으로 메모리, 파일 디스크립터와 업스트림 연결이 쌓인다.

### 사례: Traefik의 전용 transport 누수 (2026-11 권고 기준)

Traefik은 NTLM이나 Kerberos(`Negotiate`) 자격증명을 담은 요청을 공유 백엔드 풀에 닿기 전에 연결 단위 전용 transport로 보내도록 바꿨다(PR #13902 사전 인증 연결 격리와 FastProxy용 #13914, v3.7.14 릴리스 노트에 수록). 권고는 이 동작이 v2.11.58과 v3.7.14부터라고 적는다. 연결 단위 인증의 자격증명이 공유 풀에서 처리되지 않게 하려는 변경이다. 그런데 클라이언트 연결이 닫혀도 전용 transport를 놓아 주는 처리가 없었고, 이 결함이 보안 권고 GHSA-xv5x-242w-7hf7(High, CVSS 3.1 7.5, 가용성 영향만, CVE 미할당)로 공개됐다.

- **원인:** 요청의 `Authorization` 헤더가 `NTLM`이나 `Negotiate` 방식이면 유효한 자격증명이나 백엔드 도전 없이도 전용 transport가 할당되고, 클라이언트 연결이 닫혀도 그 transport와 유휴 백엔드 연결, goroutine이 유휴 연결 타임아웃까지 남았다. v3 계열은 FastProxy 경로에도 같은 패턴이 있었다.
- **영향:** 인증하지 않은 클라이언트가 짧은 연결을 많이 열어 Traefik 프로세스의 메모리, 파일 디스크립터와 백엔드 연결을 고갈시킬 수 있다. NTLM이나 Kerberos 백엔드를 구성했는지와 무관하다.
- **버전:** 영향 범위는 v2 `>= v2.11.58, <= v2.11.60`, v3 `>= v3.7.14, <= v3.7.16`이고 수정 버전은 v2.11.61과 v3.7.17이다. 권고는 v3.6 이하의 v3 계열과 v2.11.57 이하는 백엔드 도전을 받은 뒤에만 transport를 전용으로 두어 영향이 없다고 적는다. 권고는 우회책을 제시하지 않는다.
- **수정 범위:** 수정(PR #14144, v3 FastProxy는 #14158)은 클라이언트 연결이 닫히거나 hijack될 때 전용 transport를 해제하고 유휴 백엔드 연결을 닫는 처리를 더했다. #14144의 변경은 헤더를 보고 전용 transport를 할당하는 조건 자체를 바꾸지 않는다. #14158은 클라이언트 연결이 닫힐 때 아직 사용 중이던 백엔드 연결은 해제 뒤 풀로 돌아가 유휴 타임아웃에 닫힌다고 적는다.
- **판단:** 인증 설정이 아니라 실행 중인 버전으로 대상 여부를 정한다. 권고에는 재현 명령이나 합격 기준 수치가 없다. 패치 뒤 점검은 `NTLM` 방식과 토큰을 담은 `Authorization` 헤더로 짧은 연결을 반복하되 응답을 끝까지 받은 뒤 연결을 닫고, 연결이 닫힌 직후 유휴 연결 타임아웃보다 충분히 이른 시점에 프로세스의 디스크립터와 백엔드 연결 수가 돌아오는지 보는 운영 점검으로 둔다. 타임아웃 뒤에 보면 영향 버전도 자원이 돌아와 구분되지 않는다. 이 점검은 문서 기반 제안이며 실제로 실행한 기록은 아니다.

## 설계 체크포인트

- 이 구간에서 필요한 것이 패킷 수준 전달인지 스트림 수준 해석인지 먼저 정한다. 내용을 보지 않아도 되면 L4로 두는 편이 단순하고 빠르다.
- 타임아웃, 재시도, keep-alive는 연결 A와 연결 B에 각각 존재한다. 한쪽만 조정하고 끝났다고 보지 않는다.
- 업스트림 연결은 프락시가 소유하므로 커넥션 풀 크기, 재사용 정책, 업스트림당 포트와 디스크립터 소비를 함께 계산한다.
- NTLM이나 `Negotiate` 같은 연결 단위 인증 백엔드가 있으면 업스트림 연결을 전용으로 고정하는 조건과 클라이언트 연결 종료 때의 해제를 함께 확인한다.
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
- 연결 단위 인증이 업스트림 연결 재사용과 충돌하는 이유, 전용 연결의 할당 시점(도전 뒤와 요청 헤더 기준)의 트레이드오프와 해제가 빠졌을 때의 자원 고갈 위험

## 출처

- [Proxy의 구조와 작동원리 — 널널한 개발자 TV](https://www.youtube.com/watch?v=dThqHi8-MiQ&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=20)
- [IETF, RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [HAProxy, 3.0 Starter Guide](https://docs.haproxy.org/3.0/intro.html)
- [HAProxy, The PROXY protocol Versions 1 & 2](https://www.haproxy.org/download/2.8/doc/proxy-protocol.txt)
- [Linux man-pages, splice(2)](https://man7.org/linux/man-pages/man2/splice.2.html)
- [Nginx, ngx_stream_proxy_module](https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html)
- [Envoy, What is Envoy](https://www.envoyproxy.io/docs/envoy/latest/intro/what_is_envoy)
- [IETF, RFC 4559: SPNEGO-based Kerberos and NTLM HTTP Authentication in Microsoft Windows](https://www.rfc-editor.org/rfc/rfc4559)
- [Microsoft, MS-NTHT 1.3 Overview](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-ntht/3f2e7732-30ea-4de2-a1b1-29af933c7996)
- [Microsoft, MS-NTHT 5.1 Security Considerations for Implementers](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-ntht/816231a1-39c0-41bc-91af-1e1420bcd7a2)
- [Per-connection backend transport leak from unauthenticated Negotiate/NTLM headers (GHSA-xv5x-242w-7hf7) — Traefik GitHub Security Advisory](https://github.com/traefik/traefik/security/advisories/GHSA-xv5x-242w-7hf7)
- [Isolate preauthenticated NTLM and Kerberos backend connections (#13902) — Traefik GitHub](https://github.com/traefik/traefik/pull/13902)
- [Fix backend connection leak for NTLM and Kerberos authentication (#14144) — Traefik GitHub](https://github.com/traefik/traefik/pull/14144)
- [Fix FastProxy backend connection leak for NTLM and Kerberos (#14158) — Traefik GitHub](https://github.com/traefik/traefik/pull/14158)
- [Traefik v3.7.14 — GitHub Releases](https://github.com/traefik/traefik/releases/tag/v3.7.14)
- [Traefik v3.7.17 — GitHub Releases](https://github.com/traefik/traefik/releases/tag/v3.7.17)
- [Traefik v2.11.61 — GitHub Releases](https://github.com/traefik/traefik/releases/tag/v2.11.61)

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
