---
tags: [linux, network, kernel-bypass, dpdk, af-xdp, xdp, tcp-ip, performance]
status: done
verified_at: 2026-11-21
category: "OS&런타임(OS&Runtime)"
aliases: ["Kernel Bypass Networking", "커널 우회 네트워킹", "DPDK", "AF_XDP", "사용자 공간 TCP/IP", "Userspace TCP/IP Stack", "smoltcp"]
---

# 커널 우회 네트워킹: 사용자 공간 TCP/IP, DPDK와 AF_XDP

애플리케이션은 보통 소켓 API로 커널의 TCP/IP 스택을 쓴다. 커널이 연결 상태, 재전송, 혼잡 제어와 버퍼를 맡고, 애플리케이션은 시스템 호출로 데이터를 주고받는다. 연결 수나 패킷률이 아주 커지면 이 편의의 비용인 연결마다 잡히는 커널 메모리, 시스템 호출과 복사, 인터럽트가 먼저 한계가 된다. 커널 우회는 패킷을 커널 스택 대신 애플리케이션 메모리로 바로 보내고 TCP/IP 처리를 사용자 공간에서 하는 방식이다.

## 어디서 한계가 오는가

- **연결마다 고정 비용이 든다.** 커널은 소켓마다 TCP 상태, 큐, 타이머와 파일 객체를 만들고, 쉬는 연결도 이 메모리를 잡는다. 구조체 크기는 커널 버전과 빌드 설정에 따라 다르므로 실제 값은 대상 커널에서 재고, 연결 수에 비례하는 고정 비용이 있다는 점을 용량 계산에 넣는다.
- **프로세스마다 고정 비용이 든다.** 서버를 프로세스 하나씩 띄우면 프로세스마다 주소 공간과 런타임 메모리가 든다. 한 프로세스 안의 맞춤 런타임이 게스트마다 다음 실행 위치와 몇 개의 fd만 저장하면 같은 수의 게스트를 훨씬 적은 메모리로 스케줄링할 수 있다. 가상 스레드나 코루틴이 OS 스레드보다 많은 동시 작업을 감당하는 이유와 같은 구조다([[Async-vs-Threads|비동기와 스레드]]).
- **시스템 호출, 복사와 인터럽트.** 패킷마다 커널과 사용자 공간을 오가고 버퍼를 복사한다. 패킷이 몰리면 인터럽트 처리에 CPU를 빼앗겨 애플리케이션이 진행하지 못하는 livelock에 가까워진다. Linux는 NAPI로 인터럽트 뒤 폴링해 여러 패킷을 묶어 처리하고, busy polling으로 인터럽트 전에 먼저 확인하게 할 수도 있다.
- **주소 공간.** 리스닝 소켓은 (프로토콜, IP, 포트)로 구별되므로 포트 번호만으로는 6만여 개를 넘기 어렵다. 주소를 늘리는 방법으로 Linux에서는 `local` 유형 경로로 대역 전체를 이 호스트에 배정된 목적지로 다룰 수 있다(AnyIP, ip-route(8)의 `local`). 포트와 임시 포트 범위는 [[Transport-Layer-Sockets#포트 하나로 수많은 연결을 받는 이유와 실제 한계|소켓과 포트]]에서 다룬다.

## 패킷을 사용자 공간으로 가져오는 경로

| 경로 | 동작 | 장치와 운영 | 비용 |
|---|---|---|---|
| TUN, TAP | 커널이 만든 가상 인터페이스. TUN은 IP 패킷, TAP은 이더넷 프레임을 사용자 프로세스와 주고받는다 | 일반 인터페이스와 함께 쓴다 | 시스템 호출과 복사를 그대로 거친다. 시험과 개발에 쉽다 |
| AF_XDP | NIC 드라이버 단계의 XDP(eBPF) 프로그램이 받은 프레임을 사용자 공간 메모리 영역(UMEM)으로 바로 보내거나 일반 스택으로 넘긴다(`XDP_PASS`). 소켓은 장치의 특정 수신 큐에 bind한다 | 커널이 장치를 계속 소유하므로 다른 트래픽(SSH 등)은 평소대로 흐른다 | 드라이버가 지원하면 zero-copy, 아니면 copy 모드로 동작한다. busy polling으로 인터럽트 대신 폴링 쪽으로 옮길 수 있다 |
| DPDK | 사용자 공간 poll mode driver(PMD)가 인터럽트 없이 수신, 송신 descriptor를 직접 돌며 패킷을 처리한다 | 대부분의 장치는 커널 드라이버에서 떼어 `vfio-pci`에 묶어야 해 그동안 커널은 그 포트를 네트워크 인터페이스로 쓰지 못한다. 커널 드라이버와 공존하는 bifurcated 드라이버는 예외다 | 폴링 루프가 CPU 코어를 계속 점유한다. 원격 접속이 끊기지 않게 관리용 포트를 따로 둔다 |

## 사용자 공간 TCP/IP 스택

커널을 우회하면 TCP 상태 머신, 재전송과 혼잡 제어를 애플리케이션 쪽 라이브러리가 맡는다. smoltcp(Rust, 힙 할당 없이 동작하는 bare-metal 지향 스택), lwIP(C), F-Stack(DPDK 위에 FreeBSD 스택을 올린 키트), Seastar(자체 네트워크 스택을 가진 런타임), gVisor(사용자 공간에 OS와 네트워크 스택을 다시 구현)가 예다.

- 기능을 확인한다. smoltcp README(2026-11-21 기준)는 SACK, silly window syndrome 회피, TCP timestamp와 PLPMTUD를 구현하지 않았고 혼잡 제어(CUBIC, Reno)는 선택 사항이라고 밝힌다. 손실이 많은 인터넷 경로에서는 커널 스택보다 회복 성능과 공정성이 나쁠 수 있다([[TCP-SACK|SACK]], [[TCP-Congestion-Control|혼잡 제어]]).
- 운영 도구가 그대로 통하지 않는다. `ss`, netfilter, tcpdump 같은 커널 기반 관측과 방화벽은 우회된 트래픽을 보지 못하므로, 관측과 필터를 애플리케이션 쪽에 다시 만든다([[Linux-Netfilter-and-iptables|netfilter와 iptables]]).
- 호환성 비용이 크다. 시스템 호출을 가로채 기존 프로그램을 그대로 돌리려면 POSIX 소켓 동작을 거의 전부 다시 맞춰야 한다. 개념 증명과 범용 런타임 사이의 거리가 멀다.

## 선택 기준

1. 먼저 커널 안에서 해결한다. 연결 재사용, epoll 같은 효율적인 감시, fd 한도와 커널 파라미터 조정, `SO_REUSEPORT`로 리스닝 소켓 나누기, 수평 확장으로 충분한지 본다([[Epoll-Kqueue|epoll과 kqueue]], [[File-Descriptor-Limit|fd 한도]]).
2. 패킷률이나 지연이 커널 경로 자체에 막힐 때 AF_XDP부터 검토한다. 커널이 장치를 소유하므로 운영 위험이 작고, 필요한 트래픽만 골라 우회할 수 있다.
3. 코어를 통째로 폴링에 내줄 수 있고 장치를 전용으로 둘 수 있으며 최대 성능이 필요할 때 DPDK를 쓴다. 소프트웨어로 대량 패킷을 처리하는 네트워크 기능 가상화가 대표적이다([[Network-Functions-Virtualization|NFV]]).

## 사례: VM 한 대에서 웹 서버 1,500만 개

2026-11-18 한 개인 실험 글은 RAM 10GB, CPU 1코어 VM에서 모든 요청에 OK를 돌려주는 웹 서버 1,500만 개를 띄우는 목표로 위 한계를 차례로 확인했다. 수치는 모두 글쓴이 측정이며 커널 버전과 설정을 밝히지 않았고, 재현하지 않았다.

- 서버 프로세스 하나가 약 1.5MB를 써, 1,500만 개를 프로세스로 띄우면 약 20TB가 필요했다. 단일 프로세스 런타임에서 게스트마다 다음 실행 위치와 fd 두 개(16바이트)만 저장하자 스케줄링 상태는 수백 MB였다.
- 소켓만 만드는 코드도 10GB VM에서 1천만 개를 만들기 전에 메모리가 바닥났고, 소켓 하나가 활동과 무관하게 약 3.3KB를 잡았다고 보고했다. 글쓴이가 AI 답변으로 소개한 커널 구조체 크기 표는 옮기지 않는다.
- 커널 스택은 약 250만 서버에서 메모리를 다 썼고, 사용자 공간 TCP/IP 스택(smoltcp)으로 바꾸자 쉬는 서버당 약 620바이트, 활동 중인 서버당 약 1KB로 1,600만 개까지 올렸다. 처리량은 DPDK가 가장 높았고 AF_XDP가 바로 뒤였다.

## 면접 체크포인트

- 동시 연결 수의 실제 한계가 포트 번호가 아니라 fd 한도와 연결당 커널 메모리라는 점을 설명한다.
- TUN/TAP, AF_XDP, DPDK가 패킷을 어디서 가로채고 장치 소유권이 어떻게 다른지 비교한다.
- 폴링이 인터럽트보다 유리한 조건과 CPU 코어를 점유하는 비용을 말한다.
- 사용자 공간 TCP/IP 스택을 쓸 때 잃는 것(빠진 TCP 기능, 커널 관측과 방화벽, 호환성)을 든다.

## 출처

- [15 million web servers on one VM - smoltcp, DPDK, AF_XDP — kapteko](https://kapteko.com/15-million-webservers/) — 2026-11-18 게시, 2026-11-21 본문 대조. 수치는 글쓴이 측정이며, 글쓴이가 AI 답변으로 소개한 커널 구조체 크기 표는 옮기지 않음
- [Linux Kernel Documentation, AF_XDP](https://docs.kernel.org/networking/af_xdp.html)
- [Linux Kernel Documentation, NAPI](https://docs.kernel.org/networking/napi.html)
- [DPDK Documentation, Poll Mode Driver](https://doc.dpdk.org/guides/prog_guide/ethdev/ethdev.html)
- [DPDK Documentation, Linux Drivers](https://doc.dpdk.org/guides/linux_gsg/linux_drivers.html)
- [smoltcp README — GitHub, smoltcp-rs/smoltcp](https://github.com/smoltcp-rs/smoltcp)
- [Linux man-pages, ip-route(8)](https://man7.org/linux/man-pages/man8/ip-route.8.html)
- GeekNews, 2026-11-20 제공 요약: VM 한 대에서 웹 서버 1,500만 개 - smoltcp, DPDK, AF_XDP (토픽 번호 미확인, 원문 식별에 사용)

## 관련 문서

- [[Epoll-Kqueue|epoll과 kqueue (C10K)]]
- [[Transport-Layer-Sockets|소켓과 포트]]
- [[File-Descriptor-Limit|파일 디스크립터 한도]]
- [[Network-Functions-Virtualization|NFV (poll mode 드라이버)]]
- [[Linux-Netfilter-and-iptables|netfilter와 iptables]]
- [[Async-vs-Threads|비동기와 스레드]]
