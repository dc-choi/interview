---
tags: [web, network, localhost, loopback, tcp-ip, kernel]
status: done
verified_at: 2026-11-21
category: "웹&네트워크(Web&Network)"
aliases: ["Loopback", "Localhost", "loopback 인터페이스", "127.0.0.1", "::1", "Reverse Tunnel", "로컬 공유 터널"]
---

# Loopback, Localhost 동작 원리

`localhost` 또는 loopback IP에 접속하면 **패킷이 물리 NIC를 거치지 않고 커널 내부에서 처리**된다. OS가 제공하는 **가상 네트워크 인터페이스(loopback, Linux의 `lo`, macOS의 `lo0`)** 를 통해서다. 로컬 개발, 테스트, IPC의 기본 통로.

## 핵심 명제

- `localhost`는 특별 용도 호스트명이며 RFC 6761은 이름 해석 API가 IPv4 `127.0.0.1` 또는 IPv6 `::1` 같은 loopback 주소를 반환하도록 권고한다
- `127.0.0.0/8` 전체 대역이 IPv4 loopback 용도로 예약돼 있다
- 패킷이 OS 라우팅 테이블에서 loopback 인터페이스로 라우팅 → **NIC, 네트워크 드라이버 통과 없음**
- 실제 물리 네트워크를 타지 않아 지연이 짧지만, loopback 인터페이스에도 운영체제가 정한 유한한 MTU가 있다

## DNS, hosts 해석 경로

`localhost`는 RFC 6761의 특별 용도 이름이다. 이름 해석 API와 라이브러리는 일반 DNS 질의를 보내지 않도록 권고된다. 많은 시스템은 아래 hosts 파일에도 매핑을 두지만, 실제 조회 순서는 운영체제와 resolver 설정에 따라 달라진다.

- macOS/Linux: `/etc/hosts`
- Windows: `C:\Windows\System32\drivers\etc\hosts`
- 일반적인 매핑: `127.0.0.1 localhost`, `::1 localhost`

따라서 hosts 항목이 없다는 사실만으로 해석 실패를 단정하지 않는다. `getent hosts localhost`, `dscacheutil -q host -a name localhost`, `Resolve-DnsName localhost`처럼 해당 OS의 resolver 결과를 먼저 확인한다.

## Loopback 인터페이스

OS가 부팅 시 자동 생성하는 **소프트웨어 가상 NIC**. 물리 장치(이더넷, Wi-Fi 카드)가 없어도 존재.

```
$ ifconfig lo0         # macOS
lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST>
    mtu 16384
    inet 127.0.0.1 netmask 0xff000000
    inet6 ::1 prefixlen 128

$ ip addr show lo      # Linux
```

- 주소: `127.0.0.1`/8 (IPv4), `::1`/128 (IPv6)
- 상태: `UP,LOOPBACK,RUNNING` 플래그
- MTU: 운영체제와 설정에 따라 다름. 예를 들어 macOS와 Linux의 기본값이 서로 다를 수 있으므로 실제 인터페이스에서 확인한다

## 패킷이 커널 내부에서 처리되는 경로

앱이 `http://127.0.0.1:3000`으로 요청을 보낼 때 실제 흐름:

1. **소켓 호출** — 앱이 connect(127.0.0.1:3000)
2. **TCP/IP 스택 진입** — 커널이 목적지 주소 확인
3. **라우팅 테이블 조회** — `127.0.0.0/8` 매칭 → loopback 인터페이스로 전달
4. **NIC 드라이버 통과 없이** — loopback 드라이버가 패킷을 그대로 수신 큐로 복사
5. **커널이 수신 처리** — 목적 포트(3000)에 listen 중인 프로세스로 전달
6. **앱이 수신** — 서버가 요청 처리, 응답 역방향 동일 경로

**물리 네트워크 이벤트가 전혀 없다** — 네트워크 케이블 뽑혀 있어도 동작. Wi-Fi 꺼져 있어도 동작.

## IPv6 Localhost — `::1`

- IPv4 `127.0.0.1`의 IPv6 대응
- 주소는 정확히 하나 (`::1`) — IPv4처럼 대역이 아님
- 애플리케이션이 `localhost`로 바인딩할 때 `::1`과 `127.0.0.1` 중 어느 쪽으로 listen할지 설정 주의
- resolver가 `::1`을 먼저 반환하는 환경에서 서버가 IPv4에만 listen하면 연결이 실패할 수 있다

## 프로세스 포트 바인딩 — 접근 범위 제어

서버가 포트에 `listen` 할 때 바인딩 주소 선택이 **접근 범위**를 결정.

| 바인딩 주소 | 접근 가능 범위 |
|---|---|
| `127.0.0.1` | 같은 호스트에서만 (loopback만) |
| `::1` | 같은 호스트에서만 (IPv6 loopback만) |
| `0.0.0.0` | 모든 IPv4 인터페이스 (외부 포함) |
| `::` | 모든 IPv6 인터페이스. IPv4 연결도 받을지는 OS와 `IPV6_V6ONLY` 설정에 따라 다름 |
| 특정 NIC IP (`192.168.x.x`) | 해당 NIC로만 |

**보안 관점**: 개발용 서버를 `0.0.0.0`으로 띄우면 **LAN의 다른 기기에서 접근 가능** → 실수로 비공개 API가 노출. 개발 중에는 기본 `127.0.0.1`, 필요할 때만 `0.0.0.0`.

### 로컬 서비스를 외부에 공유하는 터널

휴대폰, 동료나 webhook을 보내는 외부 서비스가 개발 중인 앱에 접속해야 할 때는 `0.0.0.0` 바인딩과 공유기 포트 개방 대신 역방향 터널을 쓸 수 있다. 로컬의 터널 에이전트가 터널 서비스의 edge로 암호화된 연결을 먼저 열어 두고(outbound), 방문자가 공개 HTTPS 주소로 접속하면 edge가 그 요청을 터널 안의 스트림으로 내려보내 에이전트가 로컬 포트로 넘긴다. 인터넷에서 들어오는 연결을 로컬에서 받지 않으므로 NAT 뒤에서도 동작하고, 방화벽이 edge로 나가는 연결만 허용하면 들어오는 연결은 모두 막아 둘 수 있다. 나가는 포트는 서비스마다 다르다. Cloudflare Tunnel(`cloudflared`)은 7844 포트(http2는 TCP, quic은 UDP), Kiri Share(`kiri share 3000`)는 443 포트로 edge에 연결한다(2026-11-21 각 공식 문서 확인). 나가는 연결까지 막은 망에서는 이 포트와 목적지를 먼저 열어야 한다.

- 접근 정책을 따로 걸지 않으면 주소를 아는 누구나 접속한다. 인증 없는 개발 서버, 디버그 화면과 관리 API가 함께 열리므로 공유할 것만 열고 끝나면 닫는다. Cloudflare는 Tunnel로 공개한 앱 앞에 Access 정책을 두면 정책에 맞는 사용자만 들어오고, 정책 없이 공개하면 인터넷의 누구나 접근한다고 안내한다. Kiri Share 문서는 공유 주소가 공개라고 명시한다.
- 트래픽이 터널 사업자의 edge를 지난다. 계정, 동시 링크 수, 속도와 월 전송량 한도, 일부 플랜의 방문자 안내 페이지 같은 조건을 확인한다. Kiri Share는 GitHub 계정 로그인을 요구하고 플랜마다 동시 링크 수, 속도와 월 전송량 한도를 두며, 월 한도를 다 쓰면 다음 달까지 링크가 멈춘다. 방문자 안내 페이지는 비용과 카드 없이 공유할 수 있다고 홍보하지만, 플랜별 수치와 유료 플랜 여부를 밝힌 가격 페이지는 2026-11-21 찾지 못했다(`runkiri.com/pricing`은 첫 페이지와 같은 내용을 돌려준다). 무료 범위를 가정하지 않고 `kiri share status`로 계정의 한도를 확인한다.
- 방문자 안내 페이지가 앱보다 먼저 뜰 수 있다. Kiri는 이 페이지를 헤더 `kiri-skip-warning: 1`로 건너뛰게 하지만 어떤 요청에 붙는지는 문서에 없으므로, 헤더를 고칠 수 없는 webhook 발신자는 실제 전달로 확인한다(운영 제안).
- 주소가 실행마다 바뀌면 webhook 등록을 다시 해야 한다. 고정 이름을 예약할 수 있는지 확인한다.

## 디버깅 도구

### 네트워크 인터페이스 확인

```
$ ifconfig lo0             # macOS
$ ifconfig lo              # Linux (net-tools)
$ ip addr show lo          # Linux (iproute2)
$ ipconfig /all            # Windows
```

### 포트 listen 상태 확인

```
$ netstat -tlnp            # Linux: TCP, listen, 숫자, PID
$ ss -tlnp                 # Linux 현대
$ lsof -iTCP -sTCP:LISTEN  # macOS/Linux
$ lsof -i :3000            # 3000 포트를 누가 쓰는지
```

### 연결 테스트

```
$ curl http://127.0.0.1:3000
$ nc -zv 127.0.0.1 3000    # Netcat으로 포트 연결성 체크
$ ping 127.0.0.1           # loopback 인터페이스 자체 확인
```

## 실무 디버깅 체크리스트

"localhost 접속이 안 된다" 할 때 순서대로:

1. **`ping 127.0.0.1`** — loopback 인터페이스 자체 살아있는지 (거의 항상 됨)
2. **`ping localhost`** — resolver가 loopback 주소를 반환하는지 확인하고, 실패하면 resolver 설정과 hosts 파일 확인
3. **`lsof -i :포트`** — 서버가 정말 그 포트에 listen 중인지
4. **바인딩 주소 확인** — 서버가 `127.0.0.1`이 아니라 `::1`이나 `0.0.0.0`에 바인딩됐는지
5. **IPv4/IPv6 매칭** — `curl -4`와 `curl -6`으로 나눠 서버의 listen 주소와 비교
6. **방화벽/AppArmor/SELinux** — 드물지만 로컬 방화벽이 127.0.0.1을 막기도
7. **프록시 설정** — 브라우저, HTTP 클라이언트에 프록시가 걸려 127.0.0.1이 프록시 경유

## 흔한 함정

- **IPv4/IPv6 불일치** — Node.js 17+의 `dns.lookup()`은 resolver가 준 주소 순서를 기본적으로 재정렬하지 않는다. 환경에 따라 `::1` 또는 `127.0.0.1`이 먼저 올 수 있으므로 서버와 클라이언트 주소를 명시해 확인한다
- **`0.0.0.0`과 `127.0.0.1` 혼동** — `0.0.0.0`은 "바인딩 대상"(모든 인터페이스), `127.0.0.1`은 "접속 대상"(특정 IP). 의미 다름
- **hosts 파일 손상** — `/etc/hosts`에 잘못된 라인이 들어가면 localhost가 이상한 IP로 해석
- **포트 충돌 메시지 오해** — `EADDRINUSE`는 보통 "누가 이 포트를 쓰고 있다"이지 loopback 문제가 아님
- **VPN, Docker 네트워크 간섭** — 가끔 VPN이 loopback 라우팅을 변경. `route get 127.0.0.1`로 확인
- **Docker 컨테이너 내 `localhost`** — 컨테이너 자기 자신. 호스트 서비스 접근 방법은 Docker Desktop의 `host.docker.internal`이나 Linux의 host networking 등 실행 환경에 맞게 선택

## 면접 체크포인트

- **localhost가 loopback 주소로 해석되는 경로** — 특별 용도 이름 처리와 OS resolver 설정, hosts 파일
- **Loopback 인터페이스**의 본질 — 소프트웨어 가상 NIC, 부팅 시 생성
- 패킷이 **NIC를 거치지 않고** 커널 내부에서 처리되는 이유와 속도 이점
- **`127.0.0.0/8` 전체 대역**이 loopback (127.0.0.1이 유일하지 않음)
- **IPv4 `127.0.0.1` vs IPv6 `::1`** 차이
- **`127.0.0.1` vs `0.0.0.0` 바인딩** 의미 차이 (보안 관점)
- localhost 접속 불가 시 **디버깅 순서**

## 출처
- [IETF, RFC 6761: Special-Use Domain Names](https://www.rfc-editor.org/rfc/rfc6761.html)
- [IANA, IPv4 Special-Purpose Address Space](https://www.iana.org/assignments/iana-ipv4-special-registry)
- [Node.js, DNS](https://nodejs.org/api/dns.html)
- [Cloudflare One docs, Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/) — outbound 전용 연결 모델, 2026-11-21 확인
- [Cloudflare One docs, Tunnel with firewall](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/) — cloudflared의 7844 포트(TCP, UDP)와 나가는 연결 허용 목록, 2026-11-21 확인
- [Cloudflare One docs, Publish a self-hosted application to the Internet](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/) — Access 정책이 없으면 공개 앱에 누구나 접근한다는 안내, 2026-11-21 확인
- [Kiri Docs, Kiri Share](https://docs.runkiri.com/share/) — 연결 구조, 로그인, 이름 예약, 플랜 한도와 월 한도 소진 시 정지, 2026-11-21 확인
- [Kiri Docs, Kiri Cloud](https://docs.runkiri.com/kiri-cloud/) — 공유에만 필요한 계정과 플랜 구성, 2026-11-21 확인
- [Kiri, Kiri Share 소개 페이지](https://runkiri.com/share/) — 첫 방문 안내 페이지, 2026-11-21 확인
- [Kiri, Kiri Share warning page](https://runkiri.com/share/warning/) — 방문자 안내 페이지의 무료 홍보 문구와 건너뛰기 헤더, 2026-11-21 확인
- GeekNews, 2026-11-20 제공 요약: Kiri - 무료 ngrok 대안을 내장한 경량 Docker Desktop 대체재 (토픽 번호 미확인, 원문 식별에 사용)
- [velog @480 (Matthew / Imweb CTO) — localhost의 동작 원리](https://velog.io/@480/localhost-%EC%9D%98-%EB%8F%99%EC%9E%91-%EC%9B%90%EB%A6%AC)

## 관련 문서
- [[OSI-7-Layer|OSI 7계층과 Internet vs Ethernet]]
- [[Routing-Table-and-Interface-Selection|호스트 라우팅 테이블과 인터페이스 선택]]
- [[Network-Encapsulation|캡슐화와 커널 송신 경로]]
- [[HTTPS-TLS|HTTPS / TLS Handshake]]
- [[HTTP-Status-Code|HTTP Status Code]]
- [[Docker-Core-Desktop|Docker Desktop의 Linux VM 경계와 호환 엔진]] — Kiri Share를 내장한 Kiri 엔진과 라이선스
