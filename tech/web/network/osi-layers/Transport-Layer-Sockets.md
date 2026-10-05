---
tags: [web, network, osi, l4, socket, port, tcp, udp, demultiplexing, framing]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Transport Layer Sockets", "소켓과 포트", "소켓 식별", "Socket Identification", "다중화와 역다중화", "Multiplexing and Demultiplexing", "리스닝 소켓", "Listening Socket", "바이트 스트림과 메시지 지향", "Byte Stream vs Message Oriented", "메시지 프레이밍"]
verified_at: 2026-10-05
---

# 소켓과 포트: 연결 식별, 역다중화, 메시지 경계

IP가 패킷을 목적지 호스트까지 보내면, 전송 계층은 그 호스트 안의 어느 소켓으로 넘길지 정한다. 여러 소켓의 데이터를 모아 IP 계층으로 내려보내는 일이 다중화(multiplexing), 받은 데이터를 맞는 소켓에 나눠 주는 일이 역다중화(demultiplexing)다. 포트 범위와 TCP, UDP 비교는 [[Transport-Layer]], 계층별 캡슐화는 [[Network-Encapsulation]].

한 줄 요약: **서버 포트 하나가 연결 하나는 아니다. 연결은 양 끝의 IP와 포트 네 값으로 구별되고, 전송 프로토콜까지 더한 다섯 값이 통신 세션을 가른다.**

## 소켓이라는 말의 두 의미

TCP, UDP, IP의 명세는 IETF가 RFC로 발행하고, 소켓 API는 운영체제가 애플리케이션에 주는 프로그래밍 인터페이스다. 같은 단어가 두 세계에서 다른 것을 가리킨다.

| 관점 | 소켓이 가리키는 것 | 식별 |
|---|---|---|
| TCP 명세 (RFC 9293) | 주소. IP 주소와 TCP 포트를 이은 것 | 연결은 소켓 한 쌍(로컬 소켓, 원격 소켓)으로 정의된다 |
| 소켓 API (Linux, BSD 계열, Windows) | 애플리케이션이 커널의 네트워크 기능을 쓰는 통신 종단 객체. Linux에서는 파일 디스크립터로 다룬다 | 같은 로컬 주소를 여러 소켓 객체가 함께 가질 수 있다 |

- RFC 9293의 용어 정의에서 socket은 "the concatenation of an Internet Address with a TCP port", connection은 "A logical communication path identified by a pair of sockets", port는 "The portion of a connection identifier used for demultiplexing connections at an endpoint"다.
- RFC 9293이 대체한 RFC 793은 "a socket may be simultaneously used in multiple connections"라고 적었다. 웹 서버의 `203.0.113.10:443` 하나가 수많은 연결의 한쪽 끝이 되는 상황이 이 뜻이다.
- UDP 명세(RFC 768)에는 socket이라는 단어가 없다. 그래도 포트로 프로세스를 구분하는 구조가 같아 소켓 API는 UDP에도 같은 추상화(`SOCK_DGRAM`)를 쓴다.
- 명세의 소켓(주소)은 여러 연결이 공유하고, API의 소켓(객체)은 연결마다 하나씩 생긴다. 둘을 섞으면 구현이 같은 IP와 포트를 가진 소켓을 여러 개 만들어 명세를 어긴다는 오해가 생긴다. 의미를 나눠 보면 두 관점은 모순되지 않는다.

## 포트 공간은 전송 프로토콜마다 따로 있다

- 포트는 TCP, UDP, SCTP 같은 전송 프로토콜마다 별도인 16비트 번호 공간이다. RFC 6335 이후 IANA는 신청한 전송 프로토콜에만 번호를 할당하고, 다른 프로토콜의 같은 번호는 Reserved로 둔다.
- 그래서 한 호스트에서 TCP 소켓과 UDP 소켓이 같은 번호에 동시에 bind할 수 있다. DNS는 53/udp와 53/tcp를 함께 쓰며, RFC 7766은 일반적인 DNS 구현이 UDP와 TCP를 모두 지원해야 한다고 정한다.
- 같은 프로토콜 안에서는 하나의 로컬 (주소, 포트) 쌍에 IP 소켓 하나만 bind할 수 있고(ip(7)), 두 번째 bind는 `EADDRINUSE`로 실패한다. `SO_REUSEADDR`, `SO_REUSEPORT` 같은 옵션이 이 규칙의 예외를 만든다([[Epoll-Kqueue#다중 프로세스 accept와 thundering herd|SO_REUSEPORT로 리스닝 소켓 나누기]]).
- 통신 세션을 가르는 값은 5-tuple(전송 프로토콜, 출발지 IP, 출발지 포트, 목적지 IP, 목적지 포트)이다. RFC 6335는 양 끝의 IP와 포트 조합이 한 전송 프로토콜의 세션을 유일하게 식별한다고 설명하고, RFC 6056은 임시 포트를 고를 때 결과 5-tuple이 유일해야 한다고 정한다.

## 서버와 클라이언트 소켓의 수명

```c
/* 서버: 프로토콜 결정 → 로컬 주소 결정 → 대기 → 연결마다 새 소켓 */
int ls = socket(AF_INET, SOCK_STREAM, 0);
bind(ls, (struct sockaddr *)&local, sizeof local);   /* 예: 0.0.0.0:8080 */
listen(ls, SOMAXCONN);
int cs = accept(ls, NULL, NULL);

/* 클라이언트: bind 없이 connect하면 커널이 임시 포트를 고른다 */
int s = socket(AF_INET, SOCK_STREAM, 0);
connect(s, (struct sockaddr *)&server, sizeof server);
```

- `socket()`이 프로토콜을, `bind()`가 로컬 IP와 포트를 정한다. 서버는 클라이언트가 찾아올 번호를 미리 알려야 하므로 직접 bind한다. 어느 인터페이스에서 받을지는 bind 주소가 정한다([[Loopback-And-Localhost#프로세스 포트 바인딩 — 접근 범위 제어|바인딩 주소와 접근 범위]]).
- `listen()`은 소켓을 연결 요청을 받는 passive 소켓으로 만든다(listen(2)). RFC 9293의 passive OPEN 가운데 원격 소켓을 비워 두고 아무 호출이나 기다리는 형태와 같은 개념이다.
- `accept()`는 대기 큐에서 연결 하나를 꺼내 새 연결 소켓과 새 파일 디스크립터를 만든다. 새 소켓은 LISTEN 상태가 아니고 원래 리스닝 소켓은 영향을 받지 않는다(accept(2)). 3-way handshake는 `accept()` 호출 전에 커널이 끝내며, 큐 길이와 overflow 동작은 [[Java-Network-Fundamentals-and-Sockets|accept 전에 성립하는 연결과 backlog]].
- accept한 소켓의 로컬 포트는 리스닝 소켓과 같다. 로컬 IP는 리스닝 소켓을 특정 IP에 bind했으면 그 IP이고, `0.0.0.0` 같은 와일드카드로 bind했으면 클라이언트가 실제로 접속한 로컬 IP로 정해진다. 클라이언트 둘을 붙이면 accept된 두 소켓의 `getsockname()`은 같은 로컬 IP와 포트를 돌려주고 `getpeername()`만 다르다. `0.0.0.0`에 bind한 리스닝 소켓에 `127.0.0.1`로 접속하면 accept된 소켓의 `getsockname()`은 `127.0.0.1`과 리스닝 포트를 돌려준다(macOS 26.6.2, Python 3.14.7 재현). 서버는 연결마다 새 포트를 열지 않는다.
- 클라이언트가 bind하지 않은 소켓으로 `connect()`하면 커널이 임시 포트를 골라 자동으로 bind한다(ip(7)). 임시 포트 범위와 OS별 기본값은 [[Transport-Layer#웰노운 포트 vs 임시 포트|웰노운 포트와 임시 포트]].

## 수신 측 역다중화: 헤더마다 다음 단계를 고르는 값이 있다

| 단계 | 보는 값 | 고르는 대상 |
|---|---|---|
| L2 | 이더넷 EtherType (`0x0800` IPv4, `0x86DD` IPv6) | L3 프로토콜 |
| L3 | IPv4 Protocol, IPv6 Next Header (6 TCP, 17 UDP) | 전송 프로토콜 |
| L4 UDP | 목적지 IP와 목적지 포트 | 그 주소에 bind된 UDP 소켓 |
| L4 TCP | 출발지와 목적지의 IP, 포트 네 값. 맞는 연결이 없으면 목적지 IP와 포트 | 연결 소켓, 없으면 LISTEN 소켓 |

- IP 계층은 Protocol 값으로 상위 프로토콜을 고르고 출발지와 목적지 주소를 함께 넘긴다(RFC 1122의 개념적 RECV 인터페이스). 전송 계층은 이 주소로 체크섬의 가상 헤더를 계산하고 소켓을 찾는다. IPv6 Next Header는 IPv4 Protocol과 같은 번호를 쓰며, 확장 헤더가 있으면 그 사슬의 마지막 Next Header가 전송 프로토콜을 가리킨다(RFC 8200). 필드 위치는 [[IPv4-Header]], EtherType은 [[Physical-DataLink-Layer#프레임 구조|L2 프레임 구조]].
- **UDP**는 목적지 포트(와 bind한 주소)로 소켓을 찾는다. 연결이 없으므로 한 소켓이 여러 상대의 데이터그램을 받는다. 다만 `connect()`한 UDP 소켓은 지정한 상대가 보낸 데이터그램만 받는다(connect(2)). 받을 소켓이 없으면 ICMP Port Unreachable을 보내도록 권고한다(RFC 1122, SHOULD).
- **TCP**는 먼저 네 값이 모두 맞는 연결을 찾는다. 같은 서버 포트에 붙은 연결 소켓들은 로컬 IP와 포트가 같으므로 상대의 IP와 포트까지 봐야 구별된다. 맞는 연결이 없으면 원격 소켓을 비워 둔 LISTEN 소켓이 받는다. LISTEN 상태는 SYN을 받으면 SYN-ACK를 보내며 비어 있던 원격 주소를 채우고, ACK가 실린 세그먼트에는 RST로 답한다(RFC 9293 3.10.7.2). 맞는 상태가 아예 없으면 RST를 보내고(3.10.7.1), 이때 클라이언트의 `connect()`는 `ECONNREFUSED`로 실패한다(connect(2)).
- SYN 플래그가 켜진 세그먼트는 리스닝 소켓으로 간다는 설명은 근사다. 클라이언트가 받는 SYN-ACK에도 SYN이 켜져 있지만 SYN-SENT 상태의 연결 소켓이 받는다. 기준은 플래그 하나가 아니라 네 값에 맞는 연결 상태가 있느냐다. RFC 793도 같은 로컬 소켓에 대기가 여럿이면 원격 소켓까지 지정한 대기를 비워 둔 대기보다 먼저 고른다고 적었다.

다중화는 반대 방향이다. 여러 소켓이 쓴 데이터에 각자의 출발지와 목적지 포트를 담은 헤더를 붙여 하나의 IP 계층으로 내려보낸다. RFC 9293의 표현으로 "TCP uses port numbers to identify application services and to multiplex distinct flows between hosts"다.

## 포트 하나로 수많은 연결을 받는 이유와 실제 한계

- 서버 쪽은 모든 연결이 같은 로컬 포트를 공유하고 상대 주소로 구별된다. 그래서 동시 연결 수는 포트 번호 개수(65,536)가 아니라 파일 디스크립터 한도와 커널 메모리 같은 자원이 정한다([[Epoll-Kqueue|epoll과 fd 고갈]]). accept 큐는 아직 꺼내지 않은 연결의 대기 한도라 동시 연결 수와는 다른 축이다.
- 클라이언트 쪽은 다르다. 같은 출발지 IP에서 같은 목적지 IP와 포트로 여는 연결은 출발지 포트만 바꿀 수 있어서 임시 포트 범위가 동시 연결 수의 상한이 된다. Linux 기본 범위 32768~60999면 28,232개다. 먼저 닫은 쪽에서는 닫힌 연결도 TIME_WAIT 동안 그 4-tuple을 붙잡는다([[TCP-Handshake#TIME_WAIT 상태|TIME_WAIT]]).
- 목적지가 다르면 같은 출발지 포트를 다시 써도 5-tuple이 유일하다. Linux의 `connect()`는 공유할 수 있는 포트를 고를 수 있고(ip(7)), `IP_BIND_ADDRESS_NO_PORT`를 켜면 bind로 출발지 IP만 정한 뒤 포트 선택을 `connect()`로 미뤄 4-tuple이 유일한 한 출발지 포트를 공유한다. 할당 정책은 OS마다 다르므로 다른 OS에서 같은 동작을 가정하지 않는다.
- 완화책은 연결 재사용(keep-alive, [[Connection-Pool|커넥션 풀]]), 출발지 IP나 목적지 IP를 늘려 4-tuple 공간 넓히기, 임시 포트 범위 조정이다. NAPT 장비와 프록시도 여러 내부 흐름을 적은 수의 출발지 주소로 내보내므로 같은 한계를 공유한다([[IPv4-NAT-and-Traversal]], [[Proxy-Internals]]).

## 스트림 소켓과 데이터그램 소켓: 메시지 경계

| | TCP (`SOCK_STREAM`) | UDP (`SOCK_DGRAM`) |
|---|---|---|
| 데이터 모델 | 바이트 스트림. 쓰기 단위의 경계를 보존하지 않는다 | 메시지 지향. 보낸 데이터그램 단위 그대로 받는다 |
| 송신 한 번 | 커널 버퍼에 쌓여 다른 쓰기와 합쳐지거나 여러 세그먼트로 나뉜다 | 데이터그램 하나 |
| 수신 한 번 | 도착한 바이트를 요청 크기 안에서 돌려준다 | 데이터그램 하나만 돌려준다 |
| 큰 메시지 | MSS에 맞춰 커널이 나눈다 | 한 번에 보낼 수 없으면 `EMSGSIZE`로 실패하고, 나누는 일은 애플리케이션 몫이다 |
| 경계 복원 | 애플리케이션 프로토콜이 맡는다 | 프로토콜이 보존한다 |

- TCP가 경계를 모르는 것은 명세가 그렇게 정했기 때문이다. RFC 9293은 PUSH가 설정되지 않은 SEND의 데이터를 이후 SEND와 합쳐 보낼 수 있다고 하고, PSH 비트가 "not a record marker"라고 명시한다. Nagle 알고리즘도 짧은 세그먼트를 합친다. 그래서 `this`, `is`, `TCP`를 세 번 보내도 수신자는 한 번의 읽기로 `thisisTCP`를 받을 수 있다. 같은 실험을 UDP로 하면 수신 호출 세 번이 `this`, `is`, `UDP`를 따로 돌려준다(macOS 26.6.2, Python 3.14.7 재현).
- UDP 수신 호출 한 번은 데이터그램 하나만 돌려준다. 버퍼보다 큰 데이터그램은 잘리고 나머지는 버려지며 `MSG_TRUNC`가 표시된다(udp(7)). 4바이트 버퍼로 10바이트 데이터그램을 읽으면 앞 4바이트만 남고 다음 읽기에는 아무것도 없다(같은 재현). 수신 버퍼는 예상 최대 데이터그램보다 크게 잡는다.
- UDP 데이터그램 크기의 이론적 상한은 UDP Length와 IPv4 Total Length가 16비트인 데서 나온다. IPv4에서 IP 헤더 20바이트와 UDP 헤더 8바이트를 빼면 데이터는 최대 65,507바이트다. OS가 이보다 낮은 상한을 두기도 해서, macOS 26.6.2 기본값(`net.inet.udp.maxdgram` 9216)에서는 9,217바이트부터 송신이 `EMSGSIZE`로 실패했다(같은 재현). 원자적으로 보낼 수 없는 크기면 `send()`는 `EMSGSIZE`를 돌려주고 메시지를 보내지 않는다(send(2)). Linux는 UDP에도 Path MTU Discovery를 적용해, 알고 있는 경로 MTU를 넘는 쓰기에 `EMSGSIZE`를 돌려줄 수 있다(udp(7)). 큰 데이터그램은 IP 단편화로 이어지기 쉬우므로 실무에서는 경로 MTU 안에서 보낸다([[Network-Encapsulation#크기 제한: MTU, MSS와 단편화|MTU와 단편화]]).
- 경계 보존과 신뢰성은 별개 축이다. TCP는 신뢰성 있는 바이트 스트림, UDP는 신뢰성 없는 메시지 전송이고, SCTP는 신뢰성을 주면서 사용자 메시지를 단위째, 스트림 안에서 순서대로 전달한다(도착 순 전달도 선택 가능, RFC 9260). 소켓 타입에도 신뢰성과 경계 보존을 함께 갖는 `SOCK_SEQPACKET`이 있다(socket(2)). 바이트 스트림 프로토콜은 stream-oriented나 byte-oriented라고도 부른다.

## 바이트 스트림 위의 메시지 프레이밍

| 방식 | 경계를 아는 법 | 장점 | 주의 |
|---|---|---|---|
| 고정 길이 | 정해진 바이트 수마다 자른다 | 파싱이 가장 단순하다 | 짧은 메시지는 채움 낭비가 생기고, 정한 길이보다 긴 메시지는 담지 못한다 |
| 길이 접두사 | 앞의 길이 필드를 읽고 그만큼 더 읽는다 | 본문에 어떤 바이트가 와도 된다 | 상한 검증 없이 거대한 길이 값을 믿으면 메모리를 고갈시킬 수 있다 |
| 구분자 | CRLF처럼 약속한 바이트열이 나올 때까지 읽는다 | 사람이 읽기 쉽고 텍스트 프로토콜에 맞다 | 본문에 구분자가 나오면 이스케이프가 필요하고, 끝을 찾을 때까지 스캔해야 한다 |

- HTTP/1.1은 시작 줄과 헤더 줄을 CRLF로 끝내고 빈 줄로 헤더의 끝을 알린 뒤, 본문 길이를 `Content-Length` 또는 chunked 전송으로 정한다. 본문이 올 수 있는 응답에 둘 다 없으면 서버가 연결을 닫을 때까지가 본문이고, 둘 다 없는 요청은 본문이 없다. chunked는 청크마다 크기를 앞에 붙이므로 구분자와 길이 접두사를 함께 쓰는 셈이다(RFC 9112).
- 경계 규칙이 모호하면 보안 문제가 된다. `Transfer-Encoding`과 `Content-Length`가 함께 온 메시지는 `Transfer-Encoding`이 우선하지만, RFC 9112는 이런 메시지가 request smuggling이나 response splitting 시도일 수 있어 오류로 다뤄야 한다고 본다. 앞단 프록시와 뒤의 서버가 경계를 다르게 해석하면 한 요청 안에 다른 요청을 숨길 수 있다([[HTTP-Chunked-Transfer|chunked 전송과 request smuggling]]).
- HTTP/2는 모든 프레임 앞에 9바이트 헤더를 두고 그 안의 24비트 Length로 경계를 정한다. 수신자가 `SETTINGS_MAX_FRAME_SIZE`로 늘리기 전에는 페이로드가 16,384바이트보다 큰 프레임을 보내지 못하게 해 길이 상한도 함께 둔다(RFC 9113). 버전별 차이는 [[versions|HTTP 버전]].
- TCP 위의 프로토콜을 익힐 때는 그 프로토콜이 메시지 경계를 어떻게 정하는지부터 확인한다. 파서가 조각난 메시지에서 깨지는 버그와 경계 해석 차이로 생기는 보안 문제를 같은 지점에서 볼 수 있다.

## 흔한 오해

- **서버는 연결마다 새 포트를 연다**: accept한 소켓은 리스닝 소켓의 로컬 포트를 그대로 쓴다. 새로 생기는 것은 포트가 아니라 소켓 객체와 파일 디스크립터다.
- **포트가 65,536개라 서버의 동시 연결도 그 이하다**: 서버 쪽은 상대 주소로 연결을 구별하므로 아니다. 같은 목적지로 연결을 여는 클라이언트 쪽에서만 임시 포트 수가 직접적인 상한이 된다.
- **소켓은 곧 포트다**: 명세의 소켓은 IP와 포트의 조합이고, API의 소켓은 커널 객체다. 한 포트를 여러 소켓이 공유하고(accept, `SO_REUSEPORT`) 한 프로세스가 여러 포트를 쓸 수 있다.
- **포트 번호로 서비스를 단정할 수 있다**: RFC 6335는 포트 번호가 연결의 두 끝점에만 의미가 있어 관찰한 번호로 서비스를 추론하는 일이 늘 믿을 만하지는 않다고 지적한다. 예를 들어 8080은 IANA에 HTTP Alternate(`http-alt`)로 등록된 번호이고 특정 서버 제품에 배정된 포트가 아니다.

## 면접 체크포인트

- RFC의 socket(IP와 포트의 조합)과 소켓 API의 소켓(커널 객체)의 차이, 연결이 소켓 한 쌍으로 정의된다는 점
- accept한 소켓의 로컬 포트와 서버 포트 하나로 수많은 연결을 받는 원리
- 수신 측 역다중화 순서(EtherType, Protocol 또는 Next Header, 포트와 4-tuple)와 UDP, TCP의 소켓 선택 차이, 다중화와 역다중화의 방향
- LISTEN 소켓이 SYN을 받는 조건, RST와 `ECONNREFUSED`가 나는 경우, UDP의 Port Unreachable
- TCP와 UDP의 포트 공간이 별개라는 점과 DNS의 53/udp, 53/tcp
- 클라이언트 임시 포트 고갈이 같은 목적지에서 생기는 이유와 완화책
- TCP 바이트 스트림과 UDP 메시지 경계의 차이, 경계와 신뢰성이 독립된 축이라는 점, UDP 잘림과 `EMSGSIZE`
- 고정 길이, 길이 접두사, 구분자 프레이밍의 장단점과 HTTP/1.1, HTTP/2의 경계 규칙, request smuggling과의 관계

## 출처

- [IETF, RFC 9293: Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293.html)
- [IETF, RFC 793: Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc793.html)
- [IETF, RFC 768: User Datagram Protocol](https://www.rfc-editor.org/rfc/rfc768.html)
- [IETF, RFC 6335: IANA Procedures for the Management of the Service Name and Transport Protocol Port Number Registry](https://www.rfc-editor.org/rfc/rfc6335.html)
- [IETF, RFC 6056: Recommendations for Transport-Protocol Port Randomization](https://www.rfc-editor.org/rfc/rfc6056.html)
- [IETF, RFC 1122: Requirements for Internet Hosts, Communication Layers](https://www.rfc-editor.org/rfc/rfc1122.html)
- [IETF, RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200.html)
- [IETF, RFC 7766: DNS Transport over TCP, Implementation Requirements](https://www.rfc-editor.org/rfc/rfc7766.html)
- [IETF, RFC 9260: Stream Control Transmission Protocol](https://www.rfc-editor.org/rfc/rfc9260.html)
- [IETF, RFC 9112: HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112.html)
- [IETF, RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html)
- [IANA, Service Name and Transport Protocol Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml)
- [Linux man-pages, socket(2)](https://man7.org/linux/man-pages/man2/socket.2.html)
- [Linux man-pages, accept(2)](https://man7.org/linux/man-pages/man2/accept.2.html)
- [Linux man-pages, listen(2)](https://man7.org/linux/man-pages/man2/listen.2.html)
- [Linux man-pages, connect(2)](https://man7.org/linux/man-pages/man2/connect.2.html)
- [Linux man-pages, send(2)](https://man7.org/linux/man-pages/man2/send.2.html)
- [Linux man-pages, ip(7)](https://man7.org/linux/man-pages/man7/ip.7.html)
- [Linux man-pages, udp(7)](https://man7.org/linux/man-pages/man7/udp.7.html)
- [Linux man-pages, tcp(7)](https://man7.org/linux/man-pages/man7/tcp.7.html)
- [Linux man-pages, IP_BIND_ADDRESS_NO_PORT(2const)](https://man7.org/linux/man-pages/man2/IP_BIND_ADDRESS_NO_PORT.2const.html)
- [Linux Kernel Documentation, IP Sysctl](https://docs.kernel.org/networking/ip-sysctl.html)
- [YouTube, 쉬운코드, RFC 스펙에서 정의한 Socket, Port, TCP connection 개념](https://www.youtube.com/watch?v=X73Jl2nsqiE)
- [YouTube, 쉬운코드, 표준 스펙과 차이가 있는 실제 소켓, 포트 개념](https://www.youtube.com/watch?v=WwseO8l8rZc)
- [YouTube, 쉬운코드, 소켓 식별 예제로 보는 segment, datagram, packet, frame, multiplexing, demultiplexing](https://www.youtube.com/watch?v=eveNtda0_yk)
- [YouTube, 쉬운코드, byte-stream protocol vs message-oriented protocol](https://www.youtube.com/watch?v=lLb2lMQpKbY)

## 관련 문서

- [[Transport-Layer|전송 계층 (포트 범위, TCP와 UDP 비교)]]
- [[Network-Encapsulation|캡슐화와 데이터 단위 (스트림, 세그먼트, 패킷, 프레임)]]
- [[TCP-Handshake|TCP Handshake (LISTEN, TIME_WAIT)]]
- [[IPv4-Header|IPv4 헤더 (Protocol 필드)]]
- [[Java-Network-Fundamentals-and-Sockets|Java 소켓 기초 (accept와 backlog)]]
- [[Loopback-And-Localhost|Loopback과 바인딩 주소]]
- [[Epoll-Kqueue|epoll과 kqueue (SO_REUSEPORT, EMFILE)]]
- [[IPv4-NAT-and-Traversal|IPv4 NAT와 NAPT]]
- [[Proxy-Internals|프락시 동작 구조 (두 연결 종단)]]
- [[OSI-7-Layer|OSI 7계층 전체 지도]]
