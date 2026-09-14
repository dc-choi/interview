---
tags: [web, network, routing, routing-table, metric, l3, multihoming]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Routing Table and Interface Selection", "라우팅 테이블과 인터페이스 선택", "네트워크 인터페이스 선택", "라우팅 메트릭", "Route Metric"]
verified_at: 2026-09-14
---

# 라우팅 테이블과 네트워크 인터페이스 선택

유선 LAN과 Wi-Fi를 동시에 연결한 노트북, VPN을 켠 PC, NIC가 여럿인 서버는 패킷을 보낼 때마다 어느 인터페이스로 내보낼지 정해야 한다. 이 결정은 라우터만 하는 일이 아니라 모든 호스트가 자기 **라우팅 테이블**로 수행하는 L3 동작이다. 판단은 두 단계다. 먼저 **longest prefix match**로 목적지에 가장 구체적으로 맞는 경로를 고르고, 같은 prefix의 후보가 여럿이면 **메트릭(metric)** 이 낮은 경로를 택한다.

라우팅 테이블 자체와 CIDR, 기본 경로는 [[Network-Layer]], 라우터끼리 테이블을 채우는 RIP, OSPF, BGP는 [[Routing-Protocols]]에서 다룬다. 이 문서는 호스트 관점의 경로 선택과 OS별 메트릭 산정에 집중한다.

## 정의

| 용어 | 의미 |
|---|---|
| 라우팅 테이블 | 목적지 prefix(네트워크 주소와 서브넷 마스크 또는 prefix length), 게이트웨이(next hop), 출력 인터페이스, 메트릭을 담은 경로 목록 |
| 메트릭 | 그 경로를 쓰는 비용을 나타내는 정수. 낮을수록 우선한다. 링크 속도, hop 수, 지연 중 무엇을 비용으로 볼지는 OS와 프로토콜마다 다르다 |
| 기본 경로 | `0.0.0.0/0`(IPv6는 `::/0`). 더 구체적인 경로가 없을 때 쓰는 마지막 후보이며 이 경로의 게이트웨이가 기본 게이트웨이다 |
| connected route | 인터페이스에 IP를 설정하면 자동으로 생기는 그 서브넷의 직접 연결 경로. 게이트웨이 없이 인터페이스로 바로 보낸다 |

메트릭은 호스트의 인터페이스 선택에서도, 라우팅 프로토콜의 경로 비교에서도 쓰이는 같은 개념이다. RIP의 hop count와 OSPF의 link cost는 라우터 사이의 메트릭이고, 이 문서의 메트릭은 한 호스트 안에서 인터페이스와 경로를 고르는 값이다.

## 동작 원리: 호스트가 출력 인터페이스를 정하는 순서

1. **로컬인가 원격인가**: 목적지 IP를 연결된 각 네트워크의 서브넷 마스크와 비교해 같은 서브넷이면 로컬로 판단한다. 로컬이면 게이트웨이 없이 해당 인터페이스에서 ARP로 직접 전달한다.
2. **longest prefix match**: 라우팅 테이블에서 목적지와 일치하는 경로 중 prefix가 가장 긴 것을 고른다. `192.168.0.0/24` connected route는 `0.0.0.0/0` 기본 경로보다 먼저 잡힌다. 이 단계는 메트릭 비교보다 앞선다.
3. **메트릭 비교**: 같은 prefix의 후보가 여럿이면 메트릭이 낮은 경로를 택한다. 유선과 무선이 각각 기본 경로를 가진 노트북에서 인터넷 트래픽이 어느 쪽으로 나가는지는 이 단계에서 결정된다.
4. **next hop과 출발지 주소 결정**: 선택된 경로의 인터페이스와 게이트웨이가 정해지면 출발지 IP를 고른다. RFC 1122의 strong end-system 모델은 출력 인터페이스와 같은 네트워크의 주소를 쓰도록 요구하고, weak 모델은 인터페이스와 무관한 주소를 허용한다.
5. **링크 계층 주소 해석**: 로컬 목적지 또는 게이트웨이의 MAC을 ARP 또는 Neighbor Discovery로 얻어 프레임을 만든다. 호스트는 반복 계산을 피하려고 목적지별 경로 캐시를 둘 수 있다.

내비게이션에 비유하면 먼저 목적지에 가장 정확히 맞는 지도를 고르고(prefix), 같은 지도 안에 길이 여럿이면 통행료가 싼 길을 택하는(메트릭) 순서다. 순서를 거꾸로 이해하면 메트릭이 낮은 인터페이스가 있는데 왜 특정 대역은 다른 인터페이스로 가는지 설명하지 못한다.

## OS별 메트릭 산정과 확인 명령

```bash
# Windows
route print -4
Get-NetRoute -AddressFamily IPv4
Find-NetRoute -RemoteIPAddress 8.8.8.8

# Linux
ip route show
ip route get 8.8.8.8

# macOS
netstat -rn -f inet
route -n get 8.8.8.8
```

### Windows: 링크 속도 기반 자동 메트릭

Windows는 인터페이스별 자동 메트릭 기능이 기본으로 켜져 있고, 링크 속도에 따라 인터페이스 메트릭을 정한다. 경로 선택에는 인터페이스 메트릭과 경로 메트릭을 더한 값을 쓰며, 같은 prefix에서는 이 합이 가장 낮은 경로가 선택된다. PowerShell `New-NetRoute`로 추가하는 경로의 경로 메트릭 기본값은 256이다.

Windows 10 이후의 자동 메트릭은 무선(WLAN, WWAN)과 그 밖의 인터페이스 표를 따로 둔다 (Microsoft 문서 2026-02 갱신 기준).

| 링크 속도 | 유선 등 기타 | 무선 |
|---|---|---|
| 1 Gb | 25 | 30 |
| 100 Mb | 35 | 45 |
| 10 Mb | 55 | 60 |

같은 속도라도 무선에 더 높은 메트릭을 주므로 유선과 무선을 함께 연결하면 기본적으로 유선이 이긴다. 반이중 무선 인터페이스는 광고 속도의 절반을 유효 속도로 본다. 값을 고정하려면 어댑터의 IP 설정에서 자동 메트릭을 끄고 Interface Metric을 직접 넣거나 `Set-NetIPInterface`로 인터페이스 메트릭을 지정한다. 인터페이스에 메트릭을 지정한 상태에서 게이트웨이를 자동 메트릭으로 두면 게이트웨이가 인터페이스 메트릭을 물려받는다.

### Linux: 경로에 설정된 preference 값

Linux의 metric은 커널이 링크 속도에서 유도하는 값이 아니라 경로에 설정된 preference 값이다. 임의의 32비트 정수이고 낮은 값이 우선하며, DHCP 클라이언트나 NetworkManager, systemd-networkd 같은 설정 도구 또는 관리자가 넣는다. 도구마다 장치 유형별 기본값을 두는 경우가 있으므로 실제 값은 `ip route show`로 확인한다. `ip route get`은 저장된 경로를 나열하는 `show`와 달리 목적지를 실제로 해석해 커널이 고른 경로를 `dev`(출력 장치)와 `src`(출발지 주소)까지 보여준다.

### macOS: 네트워크 서비스 순서

macOS의 `netstat -rn`에는 메트릭 열이 없다. 여러 연결이 활성일 때는 시스템 설정의 네트워크 서비스 순서에서 위에 있는 서비스를 먼저 시도하고 아래로 내려간다. VPN 연결은 순서를 바꿀 수 없고 VPN이 아닌 연결보다 우선한다. 실제로 어느 인터페이스와 게이트웨이가 선택되는지는 `route -n get 목적지` 출력의 `interface`와 `gateway` 행으로 확인한다.

```text
$ route -n get 8.8.8.8
   route to: 8.8.8.8
destination: default
    gateway: 192.168.0.1
  interface: en0
```

## 트레이드오프와 흔한 함정

- **메트릭은 정적 비용이지 실시간 품질이 아니다.** 링크 속도 기반 자동 메트릭은 실제 혼잡, 손실, 게이트웨이 장애를 반영하지 않는다. 유선 게이트웨이가 죽어도 메트릭은 그대로이며, Windows의 Dead Gateway Detection은 TCP 재전송을 근거로 기본 게이트웨이를 바꾸는 별개 기능이다.
- **서로 분리된 망에 기본 게이트웨이를 여럿 두지 않는다.** NAT나 프록시처럼 공인망과 사설망을 잇는 서버의 사설 인터페이스에 기본 게이트웨이를 두면 잘못된 라우팅이 생길 수 있다. 사설 대역은 구체적인 정적 경로로 보내고 기본 경로는 하나만 둔다. 노트북의 유선과 무선처럼 둘 다 같은 인터넷으로 나가는 경우는 메트릭으로 정리하면 된다.
- **VPN이 경로를 끌어간다.** VPN 클라이언트는 더 구체적인 경로나 낮은 메트릭의 기본 경로를 넣어 트래픽을 터널로 보낸다. 사내 대역만 터널로 보내는 split tunneling인지, 전체를 보내는지에 따라 같은 목적지의 경로가 달라진다.
- **출발지 주소와 비대칭 경로.** NIC가 여럿인 서버에서 요청이 들어온 인터페이스와 응답이 나가는 인터페이스가 다르면 방화벽이나 역경로 검증에서 버려질 수 있다. 출력 인터페이스의 주소를 출발지로 쓰는 strong 모델을 전제로 두고, 인터페이스별로 다른 게이트웨이를 써야 하면 출발지 주소 기반 정책 라우팅을 검토한다.
- **가상 인터페이스가 넣는 경로.** 컨테이너나 VM 도구가 만드는 bridge 인터페이스도 기본 경로를 추가할 수 있다. 테이블에 default 행이 여럿 보인다고 그 인터페이스가 선택되는 것은 아니므로 `ip route get`이나 `route get`으로 실제 선택을 확인한다.
- **DNS는 라우팅과 별개다.** 인터페이스마다 다른 DNS 서버를 받으므로, 패킷은 유선으로 나가더라도 이름 해석은 다른 인터페이스의 서버로 갈 수 있다. 접속 문제를 볼 때 경로와 resolver를 나눠 확인한다.

## 운영 체크포인트

1. 테이블을 눈으로 해석하기 전에 `ip route get`, `route -n get`, `Find-NetRoute`로 커널이 고른 인터페이스와 게이트웨이를 본다.
2. 결과가 의도와 다르면 prefix 길이, 메트릭 순서로 어느 단계에서 그 경로가 이겼는지 확인한다.
3. 특정 대역만 다른 인터페이스로 보내야 하면 기본 경로의 메트릭을 건드리기보다 그 대역의 구체적인 경로를 추가한다.
4. 인터페이스 우선순위를 바꿔야 하면 Windows는 인터페이스 메트릭, macOS는 서비스 순서, Linux는 경로 metric을 조정하고 재부팅 뒤에도 유지되는지 확인한다.
5. 테더링으로 다중 연결을 만들고 `route print` 또는 `ip route show`에서 메트릭과 기본 경로가 어떻게 바뀌는지 직접 보면 위 순서를 몸으로 익힐 수 있다.

## 면접 체크포인트

- 라우팅 테이블은 라우터만이 아니라 모든 호스트가 갖고, 호스트도 longest prefix match를 한다는 점
- prefix 길이 비교가 메트릭 비교보다 먼저라는 순서와 그 이유
- 메트릭의 정의와 OS별 산정 차이 (Windows 링크 속도 자동 메트릭, Linux 설정된 preference, macOS 서비스 순서)
- 유선과 무선을 동시에 연결했을 때 인터넷 트래픽이 어느 쪽으로 나가는지와 이를 바꾸는 방법
- 라우팅 프로토콜의 hop count, link cost와 호스트 인터페이스 메트릭이 같은 개념의 다른 층위라는 점
- 기본 게이트웨이를 여러 인터페이스에 두었을 때 생기는 문제와 정적 경로로 푸는 방법

## 출처

- [네트워크 인터페이스 선택 원리와 기준 — YouTube, 널널한 개발자 TV](https://www.youtube.com/watch?v=094pRrSlYKg&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=8)
- [IETF, RFC 1122: Requirements for Internet Hosts, Communication Layers](https://www.rfc-editor.org/rfc/rfc1122.html)
- [Microsoft Learn, The Automatic Metric feature for IPv4 routes](https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/automatic-metric-for-ipv4-routes)
- [Microsoft Learn, New-NetRoute (NetTCPIP)](https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute)
- [man7.org, ip-route(8)](https://man7.org/linux/man-pages/man8/ip-route.8.html)
- [Apple Support, Change the order of the network services your Mac uses](https://support.apple.com/guide/mac-help/change-the-order-of-network-services-mchlp2711/mac)

## 관련 문서

- [[Network-Layer|네트워크 계층, CIDR와 라우팅 테이블]]
- [[Routing-Protocols|정적 라우팅과 RIP, OSPF, BGP]]
- [[Loopback-And-Localhost|Loopback과 localhost의 라우팅]]
- [[Browser-URL-Flow|브라우저 URL 입력 흐름 (라우팅 뒤 ARP)]]
- [[IPv4-NAT-and-Traversal|IPv4 NAT와 NAT 통과]]
- [[네트워크(Network)|네트워크 인덱스]]
