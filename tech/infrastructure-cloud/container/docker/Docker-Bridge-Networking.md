---
tags: [infrastructure, docker, networking, bridge, veth, netfilter, nat]
status: done
category: "Infrastructure - Container"
aliases: ["Docker Bridge Networking", "도커 브리지 네트워킹"]
verified_at: 2026-09-30
---

# Docker Bridge Networking

Linux의 Docker bridge network는 container마다 network namespace를 만들고 virtual Ethernet pair로 host bridge에 연결한다. Docker는 address, route, embedded DNS, forwarding과 firewall/NAT 규칙을 함께 관리한다.

## 기본 구조

```text
container process
  -> eth0 in container network namespace
  -> veth pair
  -> Linux bridge on host
  -> host routing and netfilter
  -> physical interface or another container
```

- 같은 user-defined bridge의 container는 내부 IP로 직접 통신하고 container 이름을 DNS로 해석할 수 있다.
- 서로 다른 bridge network는 기본적으로 분리된다. 통신시키려면 network 연결 또는 명시적 routing 정책이 필요하다.
- Docker Desktop에서는 Linux container와 bridge가 macOS/Windows host가 아니라 내부 Linux VM에 있다. host의 `ip link`만 보고 bridge가 없다고 결론 내리지 않는다.

## 기본 network와 driver

`docker network ls`에는 기본으로 `bridge`, `host`, `none` 세 network가 있다.

| network | 동작 | 쓰임 |
|---|---|---|
| default `bridge` | `--network` 없이 띄운 container가 모두 붙는다. container 이름 해석이 없다(legacy `--link` 제외) | 단순 실험. Docker 문서는 legacy detail로 보고 production에 권장하지 않는다 |
| user-defined bridge | 내장 DNS로 container 이름을 해석하고 network 단위로 격리한다. 실행 중에 `docker network connect`, `disconnect`가 가능하다 | 단일 host의 일반적인 멀티 container 구성 |
| `host` | host network stack을 그대로 쓰고 container IP가 없다. `-p`, `-P`는 경고와 함께 무시된다 | 격리보다 성능이나 넓은 port 범위가 중요한 특수한 경우 |
| `none` | loopback만 만든다 | 외부 통신이 필요 없는 배치를 완전히 격리 |

- default bridge에서 빼려면 container를 멈추고 다시 만들어야 한다. 같은 bridge의 container는 IP로 통신할 수 있지만 IP는 재생성 때 바뀔 수 있어 이름 해석이 되는 user-defined network를 쓴다.
- Docker Desktop은 4.34 이상에서 설정으로 host networking을 켤 수 있고 L4(TCP, UDP)에서만 동작한다. 설정을 켜지 않으면 host network는 macOS나 Windows host가 아니라 내부 Linux VM의 network다.
- `docker network inspect NETWORK`의 `Subnet`, `Gateway`, `Containers`로 대역과 붙은 container의 IP를 확인한다.
- ECS task의 network mode(bridge, host, awsvpc, none)는 이름이 같아도 ECS task definition 설정이다([[ECS]]).

## 패킷 경로

### 같은 bridge의 container 간 통신

송신 container의 `eth0`에서 나온 frame이 veth를 지나 host bridge에서 목적 container의 veth로 전달된다. 이 경로는 외부 공개와 별개이며 `EXPOSE`나 `-p`가 필요하지 않다.

### container에서 외부로 나가기

packet은 bridge에서 host routing 경로로 올라온 뒤 forwarding된다. 기본 NAT gateway mode에서는 host가 source address를 변환해 외부로 내보내고 conntrack이 응답 흐름을 연결한다.

### host port로 들어오기

`-p 8080:3000`은 host port 8080을 container port 3000에 publish한다. Docker가 firewall/NAT 경로를 구성해 packet을 container 쪽으로 전달한다. `EXPOSE 3000`만으로는 publish되지 않는다.

container port는 container마다 독립이라 여러 container가 모두 80을 써도 되지만 host port는 host 전역 자원이라 같은 bind address와 port를 두 번 publish할 수 없다. 한 container에 `-p 8080:80 -p 8443:443`처럼 여러 port를 매핑할 수 있다.

host 자체가 목적지인 packet은 보통 `INPUT` 경로를 보지만 bridge container로 전달되는 packet은 host 관점에서 `FORWARD` 경로를 지난다. 방화벽 규칙을 잘못된 chain에 넣으면 명령은 성공해도 traffic에는 적용되지 않는다.

## netfilter, iptables와 nftables

netfilter는 Linux kernel의 packet 처리 hook framework다. 대표 hook은 prerouting, input, forward, output, postrouting이며 routing 결정과 packet의 출발 위치에 따라 경로가 달라진다.

`iptables`와 `nft`는 이 framework의 ruleset을 구성하는 user-space 도구다. iptables를 netfilter 자체와 같은 것으로 보거나 NAT table을 일반적인 연결 매핑 자료구조와 같은 것으로 보면 안 된다.

Docker Engine은 전통적으로 iptables backend를 사용한다. Docker 29에서 nftables backend가 추가됐지만 2026-08-04 공식 문서 기준 experimental이다. overlay network 규칙이 아직 iptables에서 이전되지 않아 daemon이 Swarm mode로 동작할 때는 nftables backend 자체를 활성화할 수 없다. 운영 중인 backend를 먼저 확인하고 ruleset을 조사한다.

- iptables backend의 사용자 선행 정책은 `DOCKER-USER` chain을 활용한다.
- nftables backend에는 동일한 `DOCKER-USER` chain이 없다. 별도 table/base chain과 hook priority로 정책 순서를 정한다.
- Docker가 관리하는 table과 chain을 직접 수정하면 다음 network 변경이나 daemon 재시작 때 사라질 수 있다.
- Docker의 firewall rule 생성을 끄면 bridge networking과 port publishing이 깨질 수 있다.

## publish 보안 경계

host IP를 생략한 `-p 8080:3000`은 기본적으로 host의 모든 address에 bind될 수 있다. local 개발용 서비스는 `-p 127.0.0.1:8080:3000`처럼 bind address를 명시한다. 외부 공개 여부는 Docker rule만 보지 말고 cloud security group, host firewall, reverse proxy와 application authentication까지 끝에서 끝으로 확인한다.

DB처럼 외부에 열되 접근 source를 제한해야 하는 port는 iptables backend에서 `DOCKER-USER` chain 맨 앞에 부정 규칙을 넣는다(`iptables -I DOCKER-USER -i <외부 interface> ! -s 192.0.2.0/24 -j DROP`). 이 chain에 오는 packet은 이미 DNAT된 뒤라 container IP와 container port만 보이므로 원래 목적지 address나 host port로 거르려면 `-m conntrack --ctorigdst`, `--ctorigdstport`를 쓴다. conntrack 매칭은 성능을 떨어뜨릴 수 있다. publish된 port의 traffic은 ufw 같은 host 방화벽 설정을 거치기 전에 Docker 규칙으로 빠지므로 host 방화벽만으로 막았다고 판단하지 않는다.

container IP는 runtime detail이라 재생성 시 바뀔 수 있다. service discovery에는 user-defined network의 DNS name을 사용하고 외부 consumer에는 published port나 gateway를 제공한다.

멀티 container 구성에서는 edge(reverse proxy나 frontend)만 publish하고 API와 DB는 publish하지 않는다. API의 DB host 값은 container 이름으로 두어 내장 DNS를 쓴다. 더 나누려면 frontend용과 backend용 network를 따로 만들고 API container만 `docker network connect`로 두 network에 붙인다. 서로 다른 user-defined network의 container끼리는 기본적으로 통신하지 않으므로 DB가 보이는 범위가 backend network로 좁아진다.

publish하지 않은 내부 서비스는 host에서 직접 부를 수 없으므로 같은 network에 붙인 일회성 container로 확인한다. debug image는 조직이 승인한 것만 쓴다.

```bash
docker run --rm --network app-network <curl이 든 승인된 image> curl -sS http://api:8080/health
```

이 수동 구성의 긴 명령과 실행 순서를 파일 하나의 선언으로 옮긴 것이 [[Docker-Compose]]다.

## 진단 순서

```bash
docker network inspect NETWORK
docker inspect --format '{{json .NetworkSettings.Networks}}' CONTAINER
docker inspect --format '{{.State.Pid}}' CONTAINER
nsenter -t PID -n ip addr
nsenter -t PID -n ip route
bridge link
ss -lntp
```

1. application이 container 내부의 기대 port와 address에 listen하는지 확인한다. `127.0.0.1`만 listen하면 다른 namespace에서 접근할 수 없다.
2. container가 의도한 network와 subnet/gateway를 받았는지 확인한다.
3. 이름 해석과 같은 bridge 내 직접 연결을 검사한다.
4. host의 IP forwarding, route와 bridge link를 확인한다.
5. 실제 firewall backend와 NAT/filter ruleset을 확인한다.
6. 경계마다 `tcpdump`로 packet이 어디까지 도착하는지 좁힌다.

| 증상 | 자주 놓치는 원인 |
|---|---|
| host에서는 되지만 다른 장비에서 실패 | loopback에만 publish, host/cloud firewall |
| container 이름이 해석되지 않음 | default bridge 사용, 서로 다른 network |
| port publish는 보이지만 연결 거부 | process 미기동, 다른 port, loopback listen |
| 외부 통신만 실패 | default route, forwarding, NAT/firewall backend |
| custom rule이 무시됨 | 잘못된 hook/chain, Docker rule보다 늦은 priority |
| container 기동 시 port 할당 실패 | 로컬 DB나 다른 container가 같은 host port를 이미 사용 |

port 충돌은 host 쪽 bind 문제라 왼쪽 host port를 바꾸거나(`-p 3307:3306`) 점유 process를 정리한다. 오른쪽 container port를 바꾸려면 애플리케이션의 listen port도 함께 바꿔야 한다. host port를 바꿔도 host의 client(DB GUI 도구, 브라우저)만 새 port로 접속하고 같은 network의 다른 container는 계속 이름과 container port로 접속한다. 점유 process는 `ss -lntp`나 `lsof -i :3306`으로 찾는다. 오류 문구는 환경과 버전마다 달라 `port is already allocated`, `address already in use`, Docker Desktop의 `Ports are not available` 등으로 나타난다.

## 직접 재현 — netns, veth, bridge

`ip`(iproute2)는 `ip <객체> <동작>` 형식으로 `link`(interface 상태, MTU), `addr`(IP 주소), `route`, `neigh`(ARP), `netns`를 다룬다. 구형 명령은 `ifconfig`가 `ip addr`과 `ip link`, `route`가 `ip route`, `arp`가 `ip neigh`, `netstat`이 `ss`로 대응한다.

```bash
ip netns add ns1
ip link add veth-host type veth peer name veth-ns1   # veth는 항상 쌍으로 생긴다
ip link set veth-ns1 netns ns1
ip addr add 10.10.10.1/24 dev veth-host
ip netns exec ns1 ip addr add 10.10.10.2/24 dev veth-ns1
ip link set veth-host up
ip netns exec ns1 ip link set veth-ns1 up
ip netns exec ns1 ip link set lo up                  # 새 namespace에는 loopback만 있다
ip netns exec ns1 ping -c 1 10.10.10.1
ip netns del ns1
```

Docker bridge와 같은 모양으로 가려면 `ip link add br0 type bridge`로 bridge를 만들고 host 쪽 veth를 `ip link set veth-host master br0`로 붙인 뒤 gateway 주소를 host veth 대신 bridge에 준다. namespace 안에 그 gateway로 가는 default route를 두고 host에서 `net.ipv4.ip_forward=1`과 `iptables -t nat -A POSTROUTING -s 10.10.10.0/24 ! -o br0 -j MASQUERADE`를 설정하면 외부로 나간다. Docker는 이 bridge, 대역, veth pair, 주소, route와 NAT 규칙을 `docker network create`와 container 연결 시점에 자동으로 구성한다.

이해 확인: 이 구성에 `docker run -p`가 더하는 것은 무엇인가(DNAT와 forward 허용 규칙). 다른 bridge에 붙은 namespace끼리는 왜 통신하지 못하는가.

## 출처

- [Docker Docs, bridge network driver](https://docs.docker.com/engine/network/drivers/bridge/)
- [Docker Docs, port publishing and mapping](https://docs.docker.com/engine/network/port-publishing/)
- [Docker Docs, packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/)
- [Docker Docs, nftables backend](https://docs.docker.com/engine/network/firewall-nftables/)
- [Docker Docs, Docker with iptables](https://docs.docker.com/engine/network/firewall-iptables/)
- [Linux manual, network namespaces](https://man7.org/linux/man-pages/man7/network_namespaces.7.html)
- [Docker Docs, host network driver](https://docs.docker.com/engine/network/drivers/host/)
- [Docker Docs, none network driver](https://docs.docker.com/engine/network/drivers/none/)
- [Docker Docs, docker network connect](https://docs.docker.com/reference/cli/docker/network/connect/)
- [Linux manual, ip-netns(8)](https://man7.org/linux/man-pages/man8/ip-netns.8.html)
- [Linux manual, veth(4)](https://man7.org/linux/man-pages/man4/veth.4.html)
- [Docker가 쉬워지는 운영체제 이야기, NAT](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476800)
- [Docker가 쉬워지는 운영체제 이야기, netfilter와 chain](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476826)
- [Docker가 쉬워지는 운영체제 이야기, iptables](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476827)
- [Docker가 쉬워지는 운영체제 이야기, Linux network internals](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476828)
- [Docker가 쉬워지는 운영체제 이야기, network inspect](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=477031)
- [Docker가 쉬워지는 운영체제 이야기, 리눅스 네트워크 관리 명령 소개](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476829)
- [Docker가 쉬워지는 운영체제 이야기, 리눅스 Namespace](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476558)
- [Docker가 쉬워지는 운영체제 이야기, PostgreSQL 이미지와 도커 볼륨](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=477029)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, Container 포트 연결을 위한 포트 매핑 및 통신 실습](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416098)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, Docker Network의 기본 3가지 Network 기초 과정](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416105)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, 사용자 정의 Docker Network를 활용한 멀티 컨테이너 통신 실습](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416525)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, 쿠버네티스 철학을 근간 선언적 관리를 위한 Docker Compose](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416526)
- [비전공자도 이해할 수 있는 Docker 입문/실전, Docker로 MySQL 실행시켜보기 1](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227905)
- [비전공자도 이해할 수 있는 Docker 입문/실전, Docker로 PostgreSQL 실행시켜보기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227908)
- [비전공자도 이해할 수 있는 Docker 입문/실전, 웹 프론트엔드 프로젝트(Next.js)를 Docker로 배포하기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227923)
- [비전공자도 이해할 수 있는 Docker 입문/실전, 웹 프론트엔드 프로젝트(HTML, CSS, Nginx)를 Docker로 배포하기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227924)

## 관련 문서

- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
- [[Docker|Docker]]
- [[IPv4-NAT-and-Traversal|IPv4 NAT와 traversal]]
- [[Transport-Layer|Transport Layer]]
