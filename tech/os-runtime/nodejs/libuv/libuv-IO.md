---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
verified_at: 2026-10-01
aliases: ["libuv IO", "libuv 네트워킹", "libuv DNS"]
---

# libuv 네트워킹과 DNS

TCP와 UDP는 커널의 nonblocking I/O와 이벤트 제공자를 이용하며 완료 처리는 해당 loop 스레드에서 진행한다. 비동기 API가 소켓별 스레드를 만든다는 뜻은 아니다. 공통 stream 계약은 [[libuv-Handles]], 파일과 프로세스 작업은 [[libuv-Filesystem]], [[libuv-Processes]]에서 다룬다.

## TCP 서버와 클라이언트

서버는 `uv_tcp_init → uv_tcp_bind → uv_listen → connection_cb → uv_accept → uv_read_start/uv_write` 순서다. 클라이언트는 init 뒤 `uv_tcp_connect(req, handle, addr, cb)`로 연결하며 성공 callback 뒤 stream I/O를 시작한다.

`uv_tcp_init()`은 아직 소켓을 만들지 않는다. `uv_tcp_init_ex()`의 낮은 8비트는 address family이며 AF_UNSPEC은 기본 init과 같이 생성하지 않는다. 기존 소켓은 `uv_tcp_open()`으로 연결한다. 소켓 타입을 자동 검증하지 않으므로 valid stream socket인지 호출자가 보장해야 한다.

주소는 `uv_ip4_addr/uv_ip6_addr`로 `sockaddr_in/in6`를 채운다. reverse 변환은 `uv_ip4_name/ip6_name`, family 공통 변환은 `uv_ip_name`이다. `getsockname/getpeername` 출력은 충분한 `sockaddr_storage`와 in/out 길이를 사용한다.

bind 성공이 listen/connect 성공을 보장하지 않는다. 포트 충돌이 후속 `uv_listen/uv_tcp_connect`의 `UV_EADDRINUSE`로 드러날 수 있다. Windows에서는 connect 대상 0.0.0.0/::가 localhost로 매핑된다. 이를 외부 서버 주소처럼 사용하지 않는다.

| TCP 옵션 | 의미와 경계 |
|---|---|
| `UV_TCP_IPV6ONLY` | IPv6 bind의 dual stack을 끈다 |
| `UV_TCP_REUSEPORT` | 여러 listener의 같은 포트 bind와 커널 분배(1.49.0+) |
| `uv_tcp_nodelay` | Nagle 알고리즘 비활성화 |
| `uv_tcp_keepalive` | idle delay 이후 기본 probe 설정 |
| `uv_tcp_keepalive_ex` | idle, interval, count를 각각 제어(1.52.0+) |
| `uv_tcp_simultaneous_accepts` | OS가 준비하는 동시 accept를 제어, 기본 활성 |

REUSEPORT는 현재 Linux 3.9+, DragonFlyBSD 3.6+, FreeBSD 12+, Solaris 11.4, AIX 7.2.5+만 지원하며 나머지는 `UV_ENOTSUP`이다. 참여 listener 모두 같은 reuse 정책을 사용해야 한다. simultaneous accepts는 수락률을 높일 수 있지만 multiprocess 분배가 고르지 않을 수 있다.

keepalive의 delay는 초다. 현재 API에서 delay < 1은 `UV_EINVAL`이며 기본 probe는 1초 간격 10회다. `keepalive_ex`도 활성화 시 idle/intvl/cnt 모두 1 이상이며 OS 지원을 확인한다. TCP keepalive는 애플리케이션 응답 deadline을 대신하지 않는다.

### 정상 종료와 reset

`uv_shutdown()`은 pending write를 마친 뒤 송신 측을 닫는다. `uv_tcp_close_reset()`은 SO_LINGER 0을 설정하고 RST로 연결을 종료한다. 두 API를 같은 종료 흐름에서 혼용하는 것은 허용되지 않는다. reset은 피어가 데이터를 받았다는 확인 수단이 아니다.

`uv_socketpair()`(1.41.0+)는 연결된 소켓 두 개를 만들고 `uv_tcp_open`이나 spawn의 stdio로 넘길 수 있다. libuv가 사용할 소켓에는 각 endpoint에 `UV_NONBLOCK_PIPE`를 지정하는 방식이 권장된다.

## UDP는 메시지 단위

UDP는 stream이 아니며 데이터그램 경계를 유지한다. `uv_udp_t`는 수신/소켓 상태, `uv_udp_send_t`는 개별 송신 요청이다. bind port 0은 OS가 포트를 선택한다. 명시적으로 bind하지 않은 send/recv start는 IPv4 all interfaces와 임의 포트에 bind하므로 원하는 family/interface가 있으면 먼저 bind한다.

`uv_udp_init_ex()`의 낮은 8비트는 family, 나머지 비트에는 `UV_UDP_RECVMMSG`를 지정할 수 있다. 기존 datagram socket은 open 가능하며 Unix에서는 raw/netlink처럼 datagram 계약을 만족하는 소켓도 허용한다.

`uv_udp_open()`은 SO_REUSEADDR를 무조건 활성화한다. 의도한 reuse 정책을 직접 정하려면 `uv_udp_open_ex(handle, sock, flags)`(1.52.0+)를 사용한다. 기존 소켓의 실제 타입 유효성은 호출자 책임이다.

### 연결된 UDP

`uv_udp_connect()`는 remote endpoint를 연결 상태로 지정한다. TCP handshake나 전달 보장은 생기지 않는다. 이미 연결된 handle을 재연결하면 `UV_EISCONN`, NULL 주소로 disconnect할 때 미연결이면 `UV_ENOTCONN`이다.

connected handle의 send에는 addr NULL이 필요하다. 주소를 지정하면 `UV_EISCONN`이다. unconnected handle에는 목적지가 필요하며 NULL은 `UV_EDESTADDRREQ`다. peername은 연결된 handle에서만 유효하다.

### 수신 callback을 구분하기

`uv_udp_recv_cb(handle, nread, buf, addr, flags)`에서 sender 주소는 callback 동안만 유효하다. 계속 사용할 주소는 복사한다.

| 상태 | 의미 |
|---|---|
| `nread > 0` | 받은 데이터그램의 바이트 수 |
| `nread == 0`, `addr != NULL` | 실제 빈 데이터그램 |
| `nread == 0`, `addr == NULL` | 읽을 데이터 없음 또는 batch buffer 반환 이벤트 |
| `nread < 0` | 오류, NULL 버퍼 가능 |
| `UV_UDP_PARTIAL` | 버퍼가 작아 메시지가 잘림, 남은 부분은 OS가 폐기 |

stream의 0 바이트 읽기와 UDP의 빈 데이터그램은 다르다. UDP PARTIAL 뒤 추가 read로 나머지를 복구할 수 없다. 일반 수신 buffer는 callback에서 해제하지만 recvmmsg에는 다른 소유권 규칙이 적용된다.

### recvmmsg batch의 소유권

`UV_UDP_RECVMMSG`는 지원 플랫폼에서 여러 메시지를 한 번에 수신하도록 요청한다. 1.37.0 이후 명시적으로 요청해야 하며 `uv_udp_using_recvmmsg()`로 실제 사용 여부를 확인한다. alloc callback은 64KiB 배수 buffer를 준비한다.

`UV_UDP_MMSG_CHUNK`가 붙은 callback의 buf는 큰 buffer의 조각이므로 개별 free하면 안 된다. 정상적으로 끝나면 `nread=0`, addr NULL, `UV_UDP_MMSG_FREE`와 원래 buffer를 받으며 그때 해제한다. 오류로 nread < 0이면 더 이상 chunk가 오지 않으므로 해제 가능하다.

### 송신 queue와 즉시 송신

`uv_udp_send()`는 request를 queue하고 callback에서 성공/실패를 전달한다. request와 전송 본문은 완료까지 유지한다. send queue size/count로 대기 바이트와 요청 수를 구분한다. 송신 성공은 상대가 받은 사실을 보장하지 않는다.

`uv_udp_try_send()`는 즉시 한 데이터그램 전체를 보내거나 음수 오류를 반환한다. stream try_write처럼 메시지 일부를 성공 처리하지 않는다. 지금 못 보내면 `UV_EAGAIN`이다.

`uv_udp_try_send2()`(1.50.0+)는 여러 데이터그램을 보내고 반환값은 **바이트가 아닌 데이터그램 수**다. 첫 메시지부터 실패하면 음수, 일부 보낸 뒤 실패하면 양수 개수다. fully initialized/bound handle이 필요하며 남은 메시지부터 다시 처리한다.

### reuse, multicast와 ICMP

`UV_UDP_REUSEADDR`와 `UV_UDP_REUSEPORT`는 다르다. REUSEADDR는 같은 주소 bind를 허용하지만 플랫폼에 따라 마지막 socket이 트래픽을 가져갈 수 있다. REUSEPORT는 지원 플랫폼에서 여러 socket에 수신 메시지를 분배한다(1.49.0+, TCP와 같은 현재 지원 플랫폼). flag를 조합할 때도 플랫폼 지원을 확인한다.

`UV_UDP_LINUX_RECVERR`는 Linux의 ICMP 오류 보고를 강화하고 다른 플랫폼에서는 no-op이다. API 문장의 flag 표기보다 enum의 정확한 식별자를 사용한다.

broadcast는 `uv_udp_set_broadcast()`로 허용해야 하며 미설정은 EACCES를 유발할 수 있다. `set_ttl/set_multicast_ttl` 범위는 1~255다. multicast는 membership JOIN/LEAVE, source-specific membership, 송수신 interface, local loopback을 각각 설정한다. TTL/loop/interface 설정 전에 handle을 해당 family로 초기화하거나 bind한다.

## DNS와 인터페이스

`uv_getaddrinfo()`와 `uv_getnameinfo()`는 시스템 resolver를 전역 pool에서 실행한다. Node.js의 c-ares 기반 resolve와 같은 경로라고 가정하지 않는다. DNS API 선택은 [[Node.js]]의 상위 API 설명과 연결한다.

`getaddrinfo`의 node 또는 service 하나는 NULL일 수 있지만 둘 다 NULL은 안 된다. hints로 family, socktype, protocol을 제한한다. 제출 반환값이 음수면 callback은 없고, 제출 성공 뒤 callback status가 음수면 결과 res는 NULL이다.

성공 res는 addrinfo 목록이다. 선택한 sockaddr로 connect를 제출한 뒤 `uv_freeaddrinfo()`로 해제한다. NULL 해제는 no-op이다. `getnameinfo`는 req의 host/service에 NUL 종료 결과를 저장한다. 두 API 모두 callback NULL이면 동기로 실행된다(1.3.0+).

`uv_interface_addresses()`는 같은 물리 interface의 여러 IP를 여러 항목으로 반환할 수 있다. `is_internal`은 loopback 여부다. `uv_free_interface_addresses()`로 배열을 해제한다. scoped IPv6의 interface identifier는 Windows가 숫자를 사용하므로 `uv_if_indextoiid()`를 사용한다.

## 출처

- [TCP](https://docs.libuv.org/en/v1.x/tcp.html), [UDP](https://docs.libuv.org/en/v1.x/udp.html)
- [DNS](https://docs.libuv.org/en/v1.x/dns.html), [Miscellaneous utilities](https://docs.libuv.org/en/v1.x/misc.html)
- [Networking guide](https://docs.libuv.org/en/v1.x/guide/networking.html)

## 관련 문서

- [[libuv]], [[libuv-Handles]], [[libuv-Filesystem]], [[libuv-Processes]]
- [[HTTP-Networking]], [[Stream]]
