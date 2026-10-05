---
tags: [linux, netfilter, iptables, nftables, firewall, nat, conntrack, container]
status: done
verified_at: 2026-10-06
category: "OS&런타임(OS&Runtime)"
aliases: ["Linux Netfilter and iptables", "netfilter", "iptables", "리눅스 방화벽", "netfilter hook"]
---

# Linux netfilter와 iptables — hook, table, chain과 규칙 운영

netfilter는 Linux kernel의 IP stack에 걸린 packet 처리 framework다. stack의 정해진 지점(hook)에서 등록된 처리를 호출하고, 그 결과로 packet을 통과시키거나 버리거나 주소를 바꾼다. `iptables`와 `nft`는 이 framework에 ruleset을 올리는 user-space 도구다. Linux 기반 공유기의 NAT와 방화벽, 서버의 host 방화벽, Docker의 port publish가 모두 이 구조 위에서 동작한다. Docker 전용 chain과 firewall backend 차이는 [[Docker-Bridge-Networking]]에서 다룬다.

## 네트워크 계층에서의 위치

- user mode process는 socket으로 데이터를 주고받고, kernel의 protocol stack(TCP/IP)이 stream을 segment와 packet으로 나누며, device driver가 NIC를 구동한다. netfilter hook은 이 중 IP 계층의 경로 위에 있다.
- veth, bridge 같은 가상 장치는 실제 하드웨어 없이 driver 계층의 역할을 소프트웨어로 수행한다. 컨테이너 networking은 이 가상 장치와 netfilter 규칙의 조합이다.
- interface가 여러 개인 Linux host에서 IP forwarding(`net.ipv4.ip_forward`)을 켜면 한 interface로 들어온 packet을 다른 interface로 보낸다. 여기에 netfilter 규칙을 더하면 router와 방화벽이 된다.
- netfilter는 packet 경로 한가운데서 통과 여부를 판정하는 inline 구조다. 받기만 하고 보내지 않으면 차단이고, 조건 없이 모두 보내면 우회다. 그래서 규칙 오류가 곧 통신 장애가 된다([[Inline-vs-Out-of-Path]]).

## hook 다섯 개와 packet 경로

| hook | kernel 상수 | 지나는 packet | iptables built-in chain |
|---|---|---|---|
| prerouting | `NF_INET_PRE_ROUTING` | 수신 직후, routing 결정 전 | PREROUTING |
| input | `NF_INET_LOCAL_IN` | 목적지가 이 host인 packet | INPUT |
| forward | `NF_INET_FORWARD` | 이 host를 거쳐 다른 곳으로 가는 packet | FORWARD |
| output | `NF_INET_LOCAL_OUT` | 이 host의 process가 만든 packet | OUTPUT |
| postrouting | `NF_INET_POST_ROUTING` | 송신 interface가 정해진 뒤 나가기 직전 | POSTROUTING |

- 이 host로 들어오는 packet: prerouting, input을 지나 TCP가 재조립한 뒤 socket에 도착한다.
- 통과 packet: prerouting, forward, postrouting.
- 이 host가 보내는 packet: output, postrouting.
- 자기 자신에게 보내는 loopback packet: output과 postrouting을 지나 `lo`로 나간 뒤 수신 경로로 다시 들어와 prerouting과 input을 지난다. 다만 nat table은 새 연결을 만드는 packet에서만 참조되므로 이 연결의 목적지 변환은 nat OUTPUT에서 이미 정해진다.

## hook, table, chain, rule의 계층

hook은 호출 시점이고, table은 목적별로 chain을 묶은 단위다. chain은 순서 있는 rule 목록이고, rule은 매칭 조건과 처리 target으로 이뤄진다. iptables에는 다섯 table이 있고 커널 설정과 module에 따라 실제로 존재하는 table이 다르다.

| table | 용도 | built-in chain |
|---|---|---|
| filter(기본) | 통과와 차단 | INPUT, FORWARD, OUTPUT |
| nat | 주소와 port 변환. 새 연결을 만드는 packet에서만 참조 | PREROUTING, INPUT, OUTPUT, POSTROUTING |
| mangle | 특수한 packet 변경 | PREROUTING, INPUT, FORWARD, OUTPUT, POSTROUTING |
| raw | 연결 추적 예외 설정. conntrack보다 먼저 호출 | PREROUTING, OUTPUT |
| security | SELinux 같은 MAC 규칙. filter 다음에 호출 | INPUT, OUTPUT, FORWARD |

- rule의 매칭 조건은 출발지와 목적지 주소, protocol(`-p`), port, 입력과 출력 interface(`-i`, `-o`)처럼 header와 경로 정보이고 `!`로 부정할 수 있다.
- chain은 위에서 아래로 평가한다. 매칭되지 않으면 다음 rule로 가고, 매칭되면 target이 packet의 운명을 정한다. ACCEPT면 그 chain의 평가를 끝내고 다음 단계로 보내고, DROP이면 그 자리에서 버리며 뒤에 있는 rule은 보지 않는다. LOG처럼 기록만 하고 다음 rule로 넘어가는 비종료 target도 있어서, 거부할 packet을 기록하려면 LOG rule을 거부 rule보다 앞에 둔다.
- built-in chain 끝까지 매칭이 없으면 chain policy(`-P`, ACCEPT 또는 DROP)가 적용된다. 사용자 정의 chain(`-N`)은 같은 table의 다른 chain에서 jump해야 실행되고, RETURN target은 호출한 chain의 다음 rule로 돌아가게 한다.
- 같은 hook에 여러 table이 걸리면 우선순위 순서로 호출된다. nftables 기준 raw -300, conntrack -200, mangle -150, dstnat -100, filter 0, security 50, srcnat 100이다. nftables는 iptables와 달리 미리 정의된 chain이 없어 base chain을 만들 때 hook과 priority를 직접 정한다.

## target의 의미

| target | 동작 | 쓰는 위치와 조건 |
|---|---|---|
| ACCEPT | 통과 | 모든 chain |
| DROP | 응답 없이 버림. 상대는 timeout까지 기다린다 | 모든 chain |
| REJECT | 오류 packet을 돌려주고 버림. 기본은 ICMP port-unreachable, TCP만 매칭하는 rule에서는 `--reject-with tcp-reset` | INPUT, FORWARD, OUTPUT chain과 거기서만 호출되는 사용자 chain |
| DNAT | 목적지 주소와 port 변경 | nat의 PREROUTING, OUTPUT |
| SNAT | 출발지를 `--to-source`로 지정한 주소로 변경 | nat의 POSTROUTING, INPUT |
| MASQUERADE | 출발지를 나가는 interface의 주소로 변경하고 interface가 내려가면 연결을 잊음 | nat의 POSTROUTING. 동적 IP 환경용이고 고정 IP면 SNAT |

- DROP은 상대가 응답 없이 timeout까지 기다리게 하고, REJECT는 즉시 실패를 알려 진단이 빠르다. 외부 노출면과 내부 운영의 진단 편의를 함께 보고 고른다.
- conntrack 상태가 INVALID인 packet에는 REJECT를 무분별하게 쓰지 말고 DROP한다(iptables-extensions의 경고).

## conntrack과 stateful 규칙

conntrack은 연결 상태를 추적해 packet을 NEW, ESTABLISHED, RELATED, INVALID, UNTRACKED로 나눈다. 이 host가 먼저 연결한 서버의 응답만 받고 외부가 먼저 여는 연결은 막는 규칙이 이 상태 추적으로 만들어진다.

```bash
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp -s 10.0.0.10 --dport 22 -m conntrack --ctstate NEW \
  -m comment --comment "ops: SSH from bastion only" -j ACCEPT
iptables -P INPUT DROP   # 원격 접속 허용 rule을 먼저 넣은 뒤 policy를 바꾼다
```

AWS security group이 응답 방향을 따로 열지 않아도 되는 것도 같은 stateful 원리이고, subnet 단위 NACL은 stateless라 반대 방향 규칙이 필요하다([[RDS-Security-Group#SG vs NACL 차이|SG vs NACL]]).

### conntrack 표가 가득 차면

conntrack 항목은 kernel 메모리의 표에 있고 개수 상한이 있다. 상한에 다다르면 새 연결은 추적 항목을 만들지 못해 packet이 버려지고, 연결을 시작한 쪽은 DROP과 마찬가지로 응답 없이 연결 timeout을 겪는다. 애플리케이션 로그에는 연결 timeout만 남아 원인이 연결 경로에 있는 host의 kernel 표라는 단서가 잘 드러나지 않는다.

| sysctl(`net.netfilter.`) | 의미 |
|---|---|
| `nf_conntrack_count` | 현재 할당된 항목 수(읽기 전용) |
| `nf_conntrack_max` | 허용 항목 수의 상한. 기본값은 `nf_conntrack_buckets`와 같다 |
| `nf_conntrack_tcp_timeout_time_wait` | 닫힌 TCP 연결의 TIME_WAIT 항목을 유지하는 시간. 기본 120초 |
| `nf_conntrack_tcp_timeout_established` | 수립된 연결의 항목을 유지하는 시간. 기본 432000초(5일) |

표의 기본값은 kernel 문서 기준이며 kube-proxy 같은 도구가 노드에서 바꿔 둘 수 있으므로 실제 값은 해당 host의 sysctl로 확인한다.

- 동시에 열린 연결이 적어도 짧은 연결을 계속 맺고 끊으면 닫힌 연결의 항목이 쌓인다. 닫힌 연결도 TIME_WAIT 항목으로 기본 120초 남으므로, 초당 1,000개의 연결을 새로 맺고 닫으면 TIME_WAIT 항목만 어림잡아 12만 개가 유지된다(생성 속도에 유지 시간을 곱한 추정). 이 곱이 상한에 가까워지면 표가 찬다. conntrack의 TIME_WAIT 항목은 그 연결을 추적하는 host마다 생기며, 능동 종료 쪽 소켓에 남는 TCP의 TIME_WAIT([[TCP-Handshake#TIME_WAIT 상태|TIME_WAIT 상태]])와는 다른 표다.
- 상한에 다다르면 kernel은 다른 항목을 먼저 비워 자리를 만들려 하고(early drop), 그래도 자리가 없으면 packet을 버리며 `nf_conntrack: table full, dropping packet` 경고를 횟수 제한을 두고 kernel 로그에 남긴다. 최근 kernel은 초기 network namespace가 아닌 곳(컨테이너, 파드)에서는 `nf_conntrack: table full in netns <번호>, dropping packet`으로 남기므로 로그는 `table full`로 찾는다.
- node_exporter의 conntrack collector는 기본으로 켜져 있고 `node_nf_conntrack_entries`(count)와 `node_nf_conntrack_entries_limit`(max)를 내보낸다(`/proc/sys/net/netfilter/`가 없는 host에서는 아무것도 수집하지 않는다). 둘의 비율에 알림을 두면 연결 오류보다 먼저 알 수 있다. `/proc/net/stat/nf_conntrack`의 drop과 early drop 통계도 `node_nf_conntrack_stat_drop`, `node_nf_conntrack_stat_early_drop`으로 본다.
- 원인이 연결 생성 속도라면 상한을 올리는 것은 증상 완화다. 연결 풀과 keep-alive로 연결을 재사용해 생성 속도를 낮춘다. 정상적인 동시 연결이 많아 상한이 부족한 경우에는 상한 상향이 해법이 될 수 있다. 진단 과정의 예는 [[Root-Cause-Investigation-Loop#사례: Redis 연결 timeout과 conntrack 표 포화|원인 조사 사례]]에 있다.

## 조회와 편집

```bash
iptables -t nat -L -n -v --line-numbers   # 번호, packet과 byte counter, 숫자 주소
iptables -S INPUT                          # 규칙을 명령 형태로 출력
iptables -I INPUT 3 <rule>                 # 3번 위치에 삽입(번호를 빼면 맨 앞)
iptables -A INPUT <rule>                   # chain 끝에 추가
iptables -D INPUT 5                        # 5번 삭제(같은 rule 명세로도 삭제 가능)
```

- `-n`은 주소와 port를 이름으로 역조회하지 않아 DNS가 느리거나 막힌 상황에서도 바로 출력된다.
- `-v`의 counter로 rule이 실제로 매칭되는지 확인한다. 잘못된 chain에 넣은 rule은 명령이 성공해도 counter가 오르지 않는다.
- 같은 packet을 먼저 잡는 차단 rule 뒤에 `-A`로 허용 rule을 붙이면 허용 rule에는 도달하지 않는다. 위치가 중요한 rule은 `-I`와 번호로 넣고 `--line-numbers`로 확인한다.

## 영속화와 backend

- iptables 규칙은 kernel 메모리에 있어 재부팅하면 사라진다. `iptables-save`로 저장하고 부팅 때 `iptables-restore`로 복원한다. Debian 계열은 `iptables-persistent` package가 `/etc/iptables/rules.v4`, `rules.v6`을 복원한다.
- 요즘 배포판의 `iptables`는 nf_tables kernel API를 쓰는 `iptables-nft`인 경우가 많다. `iptables -V` 출력의 `(nf_tables)`와 `(legacy)`로 확인한다. Debian은 10 Buster부터 nftables가 기본이고 `iptables`가 `iptables-nft`를 가리킨다. RHEL 9는 `iptables-nft` package를 deprecated로 두고 일반적인 경우 firewalld, 복잡하고 성능이 중요한 경우 `nft`를 권한다.
- iptables-nft는 rule 추가와 삭제가 원자적이다. legacy는 현재 ruleset을 읽어 고친 뒤 통째로 다시 올리므로 동시에 실행하면 한쪽 변경이 사라질 수 있다(`--wait`로 일부 완화). 두 도구는 서로 다른 kernel API의 ruleset을 조회하므로, 섞어 쓰면 한쪽 도구에서 다른 쪽 규칙이 보이지 않는다. 한 backend로 통일한다.

## 규칙 운영 규율

- 규칙은 만들기보다 유지가 어렵다. 만든 사람이 떠나면 존재 이유를 아는 사람이 없고, 이유를 모른 채 지우면 장애가 난다. `-m comment --comment`로 목적과 요청 근거를 rule마다 남긴다(주석은 최대 256자).
- `iptables-save` 결과나 nft ruleset 파일을 버전 관리하고 변경을 리뷰한다.
- Docker가 관리하는 table과 chain은 직접 고치지 않는다. iptables backend에서는 Docker 규칙보다 먼저 평가되는 `DOCKER-USER` chain에 사용자 정책을 둔다([[Docker-Bridge-Networking#netfilter, iptables와 nftables|Docker의 backend별 차이]]).
- host 방화벽, cloud security group과 NACL, 라우터 ACL, 물리 방화벽이 논리적으로 맞물려야 한다. 한 층만 열어서는 통신이 되지 않고, 한 층만 믿으면 다른 층의 누락이 노출로 이어진다([[Network-Perimeter-Security]]).

## 컨테이너 traffic은 namespace마다 다른 hook을 지난다

network namespace는 network device, routing table과 firewall rule을 따로 가진다. 그래서 같은 packet이 host와 container에서 서로 다른 hook을 지난다.

| 흐름 | host network namespace | container network namespace |
|---|---|---|
| 외부에서 published port로 들어옴 | PREROUTING(DNAT), FORWARD, POSTROUTING 뒤 bridge와 veth로 전달 | prerouting, input을 지나 socket에 도착하는 일반 수신 |
| container가 외부로 나감 | bridge에서 올라와 PREROUTING, FORWARD, POSTROUTING(출발지 변환) 뒤 물리 interface로 | output, postrouting을 지나 veth로 송신 |

- bridge network의 container로 가는 traffic은 host 입장에서 자기 것이 아니라 통과 traffic이다. host의 INPUT이나 OUTPUT에 넣은 규칙은 명령이 성공해도 적용되지 않는다. 특정 container에 TCP 3000만 허용하고 나머지를 막으려면 host의 FORWARD 경로(iptables backend의 Docker에서는 `DOCKER-USER`)나 container namespace의 INPUT에 둔다.
- Docker의 iptables backend는 nat table에서 masquerading과 port mapping을 구현하고, filter FORWARD에서 `DOCKER-USER`를 Docker 규칙보다 먼저 거친다.
- 명령을 외우기보다 packet이 어느 namespace의 어느 hook을 지나는지 먼저 그린다. 진단 순서와 `tcpdump` 위치는 [[Docker-Bridge-Networking#진단 순서|Docker 진단 순서]]에 있다.

## 면접 체크포인트

- netfilter hook 다섯 개와 들어오는 packet, 통과 packet, 나가는 packet의 경로
- hook, table, chain, rule의 관계와 first-match 평가, chain policy
- DROP과 REJECT의 차이, SNAT과 MASQUERADE의 차이
- conntrack이 stateful 규칙을 가능하게 하는 방식
- conntrack 표가 가득 찰 때 클라이언트에 보이는 증상, 짧은 연결이 표를 채우는 이유와 감시 지표
- 컨테이너 traffic 규칙을 host INPUT에 넣으면 효과가 없는 이유
- 재부팅 뒤 규칙이 사라지는 이유와 iptables-legacy, iptables-nft를 섞으면 생기는 문제

## 출처

- [iptables(8)](https://man7.org/linux/man-pages/man8/iptables.8.html) (table별 built-in chain, target 평가, `-I`, `-D`, `-n`, `--line-numbers`, `-P`)
- [iptables-extensions(8)](https://man7.org/linux/man-pages/man8/iptables-extensions.8.html) (REJECT, SNAT, MASQUERADE, conntrack, comment)
- [xtables-nft(8)](https://man7.org/linux/man-pages/man8/xtables-nft.8.html), [xtables-legacy(8)](https://man7.org/linux/man-pages/man8/xtables-legacy.8.html)
- [Linux man-pages, network_namespaces(7)](https://man7.org/linux/man-pages/man7/network_namespaces.7.html)
- [nftables wiki, Netfilter hooks](https://wiki.nftables.org/wiki-nftables/index.php/Netfilter_hooks) (hook 경로와 priority)
- [Linux Kernel Docs, IP Sysctl](https://docs.kernel.org/networking/ip-sysctl.html) (`ip_forward`)
- [Linux Kernel Docs, Netfilter Conntrack Sysfs variables](https://docs.kernel.org/networking/nf_conntrack-sysctl.html) (`nf_conntrack_max`, `nf_conntrack_count`, TCP timeout 기본값)
- [nf_conntrack_core.c — Linux GitHub](https://github.com/torvalds/linux/blob/master/net/netfilter/nf_conntrack_core.c) (`__nf_conntrack_alloc()`의 early drop과 table full 경고)
- [Kubernetes Documentation, kube-proxy](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/) (`--conntrack-max-per-core`, `--conntrack-min`, established timeout 기본값 변경)
- [node_exporter — prometheus/node_exporter](https://github.com/prometheus/node_exporter) (conntrack collector 기본 활성), [conntrack_linux.go — prometheus/node_exporter](https://github.com/prometheus/node_exporter/blob/master/collector/conntrack_linux.go) (지표 이름과 읽는 파일)
- [loopback.c — Linux GitHub](https://github.com/torvalds/linux/blob/master/drivers/net/loopback.c), [ip_input.c — Linux GitHub](https://github.com/torvalds/linux/blob/master/net/ipv4/ip_input.c) (loopback 송신이 수신 경로의 prerouting hook으로 다시 들어옴)
- [Debian Wiki, iptables](https://wiki.debian.org/iptables), [nftables](https://wiki.debian.org/nftables)
- [Red Hat, RHEL 9 Configuring firewalls and packet filters, Getting started with nftables](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/getting-started-with-nftables_firewall-packet-filters)
- [Docker Docs, Packet filtering and firewalls with iptables](https://docs.docker.com/engine/network/firewall-iptables/)
- [인프런, 널널한 개발자, 공유기 작동원리 (NAT 기술)](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476800)
- [인프런, 널널한 개발자, Linux 시스템의 netfilter와 Chain](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476826)
- [인프런, 널널한 개발자, iptables](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476827)
- [인프런, 널널한 개발자, 리눅스 네트워크 시스템 Internals (핵심은 흐름)](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=476828)

## 관련 문서

- [[Docker-Bridge-Networking|Docker bridge networking (veth, DOCKER-USER, nftables backend)]]
- [[Container-Linux-Internals|Linux 컨테이너 내부 구조 (namespace, cgroup)]]
- [[IPv4-NAT-and-Traversal|IPv4 NAT, NAPT와 NAT 통과]]
- [[Inline-vs-Out-of-Path|Inline vs Out-of-Path 보안 장비]]
- [[RDS-Security-Group|Security Group (stateful)과 NACL]]
- [[Linux-File-System|Linux 파일 시스템]]
- [[Root-Cause-Investigation-Loop|근본 원인 조사 루프 (conntrack 표 포화 사례)]]
