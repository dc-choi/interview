---
tags: [web, network, localhost, loopback, tcp-ip, kernel]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Loopback", "Localhost", "loopback 인터페이스", "127.0.0.1", "::1"]
---

# Loopback · Localhost 동작 원리

`localhost` 또는 `127.0.0.1`에 접속하면 **패킷이 물리 NIC를 거치지 않고 커널 내부에서 처리**된다. OS가 부팅과 동시에 제공하는 **가상 네트워크 인터페이스(loopback, lo)** 를 통해서다. 로컬 개발·테스트·IPC의 기본 통로.

## 핵심 명제

- `localhost` = 호스트명, 자동으로 `127.0.0.1`(IPv4) 또는 `::1`(IPv6)로 해석됨
- `127.0.0.0/8` 전체 대역이 loopback 전용 예약 (`127.0.0.1`~`127.255.255.254`)
- 패킷이 OS 라우팅 테이블에서 loopback 인터페이스로 라우팅 → **NIC·네트워크 드라이버 통과 없음**
- 실제 물리 네트워크를 타지 않으므로 **지연시간 극소·MTU 제한 없음**

## DNS·hosts 해석 경로

`ping localhost` 입력 시 OS가 거치는 해석 단계:

1. `/etc/hosts` (macOS/Linux) 또는 `C:\Windows\System32\drivers\etc\hosts` (Windows) 조회
2. `localhost  127.0.0.1` 항목이 사전 등록되어 있음 — DNS 서버까지 안 감
3. IPv6: `localhost  ::1`

이 등록이 빠지면 `localhost` 해석 실패로 연결 안 됨. 개발 환경에서 "왜 localhost가 안 되지?" 첫 번째 체크 포인트.

## Loopback 인터페이스 (lo)

OS가 부팅 시 자동 생성하는 **소프트웨어 가상 NIC**. 물리 장치(이더넷·Wi-Fi 카드)가 없어도 존재.

```
$ ifconfig lo          # macOS/Linux
lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST>
    inet 127.0.0.1 netmask 0xff000000
    inet6 ::1 prefixlen 128
```

- 주소: `127.0.0.1`/8 (IPv4), `::1`/128 (IPv6)
- 상태: `UP,LOOPBACK,RUNNING` 플래그
- MTU: 일반적으로 65536 이상 (물리 NIC의 1500보다 훨씬 큼 — 외부 전송이 없으므로)

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
- Node.js·Python 등 일부 환경에서 기본이 IPv6로 바뀌어 "왜 127.0.0.1:3000으로 안 되지?" 혼란 자주 발생

## 프로세스 포트 바인딩 — 접근 범위 제어

서버가 포트에 `listen` 할 때 바인딩 주소 선택이 **접근 범위**를 결정.

| 바인딩 주소 | 접근 가능 범위 |
|---|---|
| `127.0.0.1` | 같은 호스트에서만 (loopback만) |
| `::1` | 같은 호스트에서만 (IPv6 loopback만) |
| `0.0.0.0` | 모든 IPv4 인터페이스 (외부 포함) |
| `::` | 모든 IPv6 인터페이스 |
| 특정 NIC IP (`192.168.x.x`) | 해당 NIC로만 |

**보안 관점**: 개발용 서버를 `0.0.0.0`으로 띄우면 **LAN의 다른 기기에서 접근 가능** → 실수로 비공개 API가 노출. 개발 중에는 기본 `127.0.0.1`, 필요할 때만 `0.0.0.0`.

## 디버깅 도구

### 네트워크 인터페이스 확인

```
$ ifconfig lo              # macOS/Linux (BSD 스타일)
$ ip addr show lo          # Linux (iproute2)
$ ipconfig /all            # Windows
```

### 포트 listen 상태 확인

```
$ netstat -tlnp            # Linux: TCP·listen·숫자·PID
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
2. **`ping localhost`** — hosts 파일의 이름 해석이 되는지 (안 되면 hosts 파일 확인)
3. **`lsof -i :포트`** — 서버가 정말 그 포트에 listen 중인지
4. **바인딩 주소 확인** — 서버가 `127.0.0.1`이 아니라 `::1`이나 `0.0.0.0`에 바인딩됐는지
5. **IPv4/IPv6 매칭** — curl은 IPv4 선호, 서버는 IPv6만 listen → 불일치
6. **방화벽/AppArmor/SELinux** — 드물지만 로컬 방화벽이 127.0.0.1을 막기도
7. **프록시 설정** — 브라우저·HTTP 클라이언트에 프록시가 걸려 127.0.0.1이 프록시 경유

## 흔한 함정

- **IPv4/IPv6 불일치** — Node.js 17+ 기본이 IPv6 preferred, 일부 도구는 IPv4 고정 → `127.0.0.1`과 `::1` 혼선. 해결: 서버에 명시적 주소 지정(`0.0.0.0` 또는 `127.0.0.1`)
- **`0.0.0.0`과 `127.0.0.1` 혼동** — `0.0.0.0`은 "바인딩 대상"(모든 인터페이스), `127.0.0.1`은 "접속 대상"(특정 IP). 의미 다름
- **hosts 파일 손상** — `/etc/hosts`에 잘못된 라인이 들어가면 localhost가 이상한 IP로 해석
- **포트 충돌 메시지 오해** — `EADDRINUSE`는 보통 "누가 이 포트를 쓰고 있다"이지 loopback 문제가 아님
- **VPN·Docker 네트워크 간섭** — 가끔 VPN이 loopback 라우팅을 변경. `route get 127.0.0.1`로 확인
- **Docker 컨테이너 내 `localhost`** — 컨테이너 자기 자신. 호스트 서비스에 접근하려면 `host.docker.internal` (macOS/Windows) 또는 `--network=host` 옵션

## 면접 체크포인트

- **localhost가 `127.0.0.1`로 해석되는 경로** — hosts 파일
- **Loopback 인터페이스**의 본질 — 소프트웨어 가상 NIC, 부팅 시 생성
- 패킷이 **NIC를 거치지 않고** 커널 내부에서 처리되는 이유와 속도 이점
- **`127.0.0.0/8` 전체 대역**이 loopback (127.0.0.1이 유일하지 않음)
- **IPv4 `127.0.0.1` vs IPv6 `::1`** 차이
- **`127.0.0.1` vs `0.0.0.0` 바인딩** 의미 차이 (보안 관점)
- localhost 접속 불가 시 **디버깅 순서**

## 출처
- [velog @480 (Matthew / Imweb CTO) — localhost의 동작 원리](https://velog.io/@480/localhost-%EC%9D%98-%EB%8F%99%EC%9E%91-%EC%9B%90%EB%A6%AC)

## 관련 문서
- [[OSI-7-Layer|OSI 7계층과 Internet vs Ethernet]]
- [[HTTPS-TLS|HTTPS / TLS Handshake]]
- [[HTTP-Status-Code|HTTP Status Code]]
