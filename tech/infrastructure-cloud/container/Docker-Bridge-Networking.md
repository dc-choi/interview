---
tags: [infrastructure, docker, networking, bridge, veth, netfilter, nat]
status: done
category: "Infrastructure - Container"
aliases: ["Docker Bridge Networking", "도커 브리지 네트워킹"]
verified_at: 2026-08-04
---

# Docker bridge networking

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

## 패킷 경로

### 같은 bridge의 container 간 통신

송신 container의 `eth0`에서 나온 frame이 veth를 지나 host bridge에서 목적 container의 veth로 전달된다. 이 경로는 외부 공개와 별개이며 `EXPOSE`나 `-p`가 필요하지 않다.

### container에서 외부로 나가기

packet은 bridge에서 host routing 경로로 올라온 뒤 forwarding된다. 기본 NAT gateway mode에서는 host가 source address를 변환해 외부로 내보내고 conntrack이 응답 흐름을 연결한다.

### host port로 들어오기

`-p 8080:3000`은 host port 8080을 container port 3000에 publish한다. Docker가 firewall/NAT 경로를 구성해 packet을 container 쪽으로 전달한다. `EXPOSE 3000`만으로는 publish되지 않는다.

host 자체가 목적지인 packet은 보통 `INPUT` 경로를 보지만 bridge container로 전달되는 packet은 host 관점에서 `FORWARD` 경로를 지난다. 방화벽 규칙을 잘못된 chain에 넣으면 명령은 성공해도 traffic에는 적용되지 않는다.

## netfilter, iptables와 nftables

netfilter는 Linux kernel의 packet 처리 hook framework다. 대표 hook은 prerouting, input, forward, output, postrouting이며 routing 결정과 packet의 출발 위치에 따라 경로가 달라진다.

`iptables`와 `nft`는 이 framework의 ruleset을 구성하는 user-space 도구다. iptables를 netfilter 자체와 같은 것으로 보거나 NAT table을 일반적인 연결 매핑 자료구조와 같은 것으로 보면 안 된다.

Docker Engine은 전통적으로 iptables backend를 사용한다. Docker 29에서 nftables backend가 추가됐지만 2026-08-04 공식 문서 기준 experimental이며 Swarm overlay network에는 적용되지 않는다. 운영 중인 backend를 먼저 확인하고 ruleset을 조사한다.

- iptables backend의 사용자 선행 정책은 `DOCKER-USER` chain을 활용한다.
- nftables backend에는 동일한 `DOCKER-USER` chain이 없다. 별도 table/base chain과 hook priority로 정책 순서를 정한다.
- Docker가 관리하는 table과 chain을 직접 수정하면 다음 network 변경이나 daemon 재시작 때 사라질 수 있다.
- Docker의 firewall rule 생성을 끄면 bridge networking과 port publishing이 깨질 수 있다.

## publish 보안 경계

host IP를 생략한 `-p 8080:3000`은 기본적으로 host의 모든 address에 bind될 수 있다. local 개발용 서비스는 `-p 127.0.0.1:8080:3000`처럼 bind address를 명시한다. 외부 공개 여부는 Docker rule만 보지 말고 cloud security group, host firewall, reverse proxy와 application authentication까지 끝에서 끝으로 확인한다.

container IP는 runtime detail이라 재생성 시 바뀔 수 있다. service discovery에는 user-defined network의 DNS name을 사용하고 외부 consumer에는 published port나 gateway를 제공한다.

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

## 출처

- [Docker Docs, bridge network driver](https://docs.docker.com/engine/network/drivers/bridge/)
- [Docker Docs, port publishing and mapping](https://docs.docker.com/engine/network/port-publishing/)
- [Docker Docs, packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/)
- [Docker Docs, nftables backend](https://docs.docker.com/engine/network/firewall-nftables/)
- [Linux manual, network namespaces](https://man7.org/linux/man-pages/man7/network_namespaces.7.html)
- [Docker가 쉬워지는 운영체제 이야기, NAT](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476800)
- [Docker가 쉬워지는 운영체제 이야기, netfilter와 chain](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476826)
- [Docker가 쉬워지는 운영체제 이야기, iptables](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476827)
- [Docker가 쉬워지는 운영체제 이야기, Linux network internals](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476828)
- [Docker가 쉬워지는 운영체제 이야기, network inspect](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=477031)

## 관련 문서

- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
- [[Docker|Docker]]
- [[IPv4-NAT-and-Traversal|IPv4 NAT와 traversal]]
- [[Transport-Layer|Transport Layer]]
