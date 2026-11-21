---
tags: [security, container, linux-kernel, sandbox, seccomp, microvm, vulnerability]
status: done
verified_at: 2026-11-09
category: "보안(Security)"
aliases: ["Shared-Kernel Container Escape", "공유 커널 컨테이너 탈출", "공유 커널 격리", "nginx2root SCTP", "SCTP 모듈 차단"]
---

# 공유 커널 컨테이너에서 호스트로의 탈출

컨테이너는 호스트 커널을 함께 쓰므로 그 커널의 로컬 권한 상승 결함 하나가 컨테이너 탈출이 된다. VM은 게스트 커널을 따로 두어 공격자가 가상화 경계를 한 번 더 넘어야 하지만, 호스트 커널이 게스트의 데이터를 계속 처리하는 경계는 남는다. 하이퍼바이저와 호스트 커널 경로를 포함한 VM 격리는 [[VM-Guest-to-Host-Escape|VM 게스트에서 호스트로의 탈출]], 컨테이너의 namespace, cgroup과 시스템 콜 표면은 [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]에서 다룬다.

## 공유 커널 컨테이너에서 microVM으로 옮기는 이유

컨테이너는 호스트 커널을 함께 쓰므로 그 커널의 로컬 권한 상승 결함 하나가 컨테이너 탈출로 이어지면 같은 호스트의 다른 워크로드, 자격 증명과 네트워크까지 닿을 수 있다. OpenAI는 2026-11-04 Linux 커널 로컬 권한 상승 948건의 발견 결과를 공개하며, 단기와 중기에는 최신 패치가 없는 운영체제의 낮은 권한 계정을 자원이 많은 공격자에게 사실상 루트로 보고 샌드박스와 Firecracker, gVisor 같은 격리로 피해 범위를 줄이라고 권했다(발견 경과는 [[Coordinated-Vulnerability-Disclosure#대량 발견은 재현, 경로 검증과 패치를 붙여 보고한다|대량 발견의 보고]]).

Replit의 2026-11-04 글은 자율 에이전트가 늘며 이런 경계가 충분하지 않다고 보고, 호스트 커널을 공유하던 Docker 컨테이너 실행 환경을 샌드박스마다 커널을 둔 microVM 기반으로 다시 만든 사례다. 2026-11-09 대조했고 수치와 성과는 자체 보고다.

- **커널을 샌드박스마다 둔다:** 샌드박스마다 자체 Linux 커널을 가진 microVM을 Cloud Hypervisor(Firecracker와 rust-vmm 구성요소를 공유)와 KVM으로 띄운다. 게스트 커널이 뚫려도 공격자는 가상화 경계를 한 번 더 넘어야 하고, 사용자가 VM 안에서 Docker를 써도 공유 호스트의 권한을 내주지 않는다.
- **VM 안에도 층을 둔다:** 지원 서비스마다 microVM을 주는 대신 최소한의 runc 컨테이너로 나누고(오버헤드 대비 이득이 작다는 판단), namespace, seccomp, 장치 접근과 capability를 역할별로 정해 사용자 프로세스가 감시 에이전트의 권한을 물려받지 않게 한다. VMM은 capability가 없는 비특권 계정으로 돌린다. eBPF로 프로세스 실행, 파일 접근과 네트워크 활동을 관찰하고 Linux 보안 모듈(LSM) 훅으로 금지 동작을 막는다. 어느 LSM인지는 밝히지 않았다.
- **게스트 커널을 줄인다:** 배포판 설정 대신 tinyconfig에서 시작해 Bluetooth, 무선, USB와 디스플레이 드라이버를 빼고, 필요한 드라이버는 내장하며 모듈 적재를 끈다. 2026-06-01~11-04 공개된 Linux CNA CVE 6,211건 중 5,969건(96.1%)을 피했다고 집계했는데 내역은 공개 전 반영된 수정 4,375건과 설정으로 제외된 676건이고 나머지 근거는 글에 없다. Linux 커널 CNA는 수정이 stable 트리에 들어간 뒤 CVE를 자동 배정하므로, 앞의 수는 갱신 주기의 효과이고 표면 축소의 직접 효과는 설정 제외분으로 읽는다(해석).
- **이전과 속도:** 수억 개 프로젝트를 데이터 손실과 중단 없이 옮겼다고 밝혔지만 이전 절차는 공개하지 않았다. 고객 볼륨 연결과 지원 서비스 설정을 포함한 샌드박스 확보는 warm pool로 약 500ms라고 적는다.

VM 안에 남길 통제와 호스트 쪽 다층 방어는 [[VM-Guest-to-Host-Escape#에이전트 샌드박스의 다층 방어|에이전트 샌드박스의 다층 방어]]를 따른다.

## 사례: nginx 워커에서 SCTP 커널 결함으로 호스트 root까지

2026-11-21 Xint 공개 글과 nginx2root 사이트, LWN 보도, oss-security 논의, moby, Docker Engine, containerd와 CRI-O의 기본 seccomp 프로필 소스, Kubernetes와 커널 문서, man 페이지를 대조했다. 같은 날 커널 수정 커밋과 메인라인 병합 기록, kernel.org 릴리스, stable과 linux-cve-announce 메일링 리스트로 수정 상태를 확인했다. 이 결함은 2026-11-21 기준 CVE 번호가 없어 영향 범위를 발견자 설명과 수정 커밋의 Fixes 태그에 기댄다.

- **연결 구조:** Xint는 nginx 원격 코드 실행 결함으로 워커 권한의 명령 실행을 얻은 뒤([[Vulnerability-Operations-AI-Agents#사례: nginx HTTP/2와 nginx2root|nginx 사례]]), 별도의 Linux SCTP 커널 결함으로 호스트 root를 얻었다. nginx를 Docker 컨테이너에서 돌린 구성에서도 호스트 root 셸을 얻었고, 호스트의 모든 컨테이너가 그 커널을 함께 쓰므로 호스트와 그 위 모든 컨테이너의 장악으로 본다(Xint). 공개 글은 그 컨테이너의 seccomp, capability와 특권 설정을 밝히지 않았으므로 모든 Docker 배포의 결과로 일반화하지 않는다(해석).
- **커널 결함의 상태:** SCTP 송신 경로에서 해제 후 사용이나 이중 해제로 이어지는 결함이며 Linux 4.15(2018)에서 들어왔다(Xint, LWN). 송신이 기다리는 동안 그 association이 다른 소켓으로 옮겨지고, 기다리던 송신이 옮겨진 association을 해제하는 구조다(Xint). 2026-11-18 공개 시점에 커널 수정이 없다고 했고, 2026-11-18~19 oss-security 논의도 수정 전이라고 적으며 수정이 몇 주 안에 나온다는 nginx2root 사이트 문구를 인용했다. 2026-11-21 브라우저로 연 nginx2root 사이트도 같은 문구를 유지한다. nginx를 고쳐도 이 결함은 남으므로 다른 경로로 얻은 낮은 권한의 실행도 같은 결함에 닿을 수 있다(해석).
- **수정 커밋과 배포 상태(2026-11-21):** Xint를 운영하는 Theori 소속 작성자가 올리고 Xint Code가 찾았다고 적은 커밋 `f2540da93a11`(sctp: do not free a new asoc peeled off while sendmsg slept)이 같은 구조를 고친다. `sctp_sendmsg()`가 새 association을 만든 뒤 `sctp_wait_for_sndbuf()`에서 소켓 잠금을 풀고 기다리는 사이 다른 스레드가 그 association을 새 소켓으로 떼어 내면(peeloff), 실패한 송신이 다른 소켓의 association을 해제해 이중 해제나 해제 후 사용이 생긴다. 커밋은 권한 없는 사용자가 닿을 수 있다고 적고, Fixes 태그는 Linux 4.15에 들어간 커밋을 가리키며 stable 반영을 요청했다. 11-16 netdev의 net 트리에 들어가 11-19 메인라인에 병합됐지만(net-7.4-rc4 pull) 이 수정을 담은 태그 릴리스는 아직 없다(최신 7.4-rc3). 11-18 메일링 리스트 답장에서 한 커널 기여자가 Xint 글로 이 패치를 쉽게 특정할 수 있다고 지적했지만, Xint는 이 커밋을 직접 지목하지 않았으므로 같은 결함이라는 판단은 해석이다. kernel.org의 최신 stable과 longterm 릴리스(7.3.5, 6.18.64, 6.12.118은 11-17, 6.6.162 이하는 11-06)는 병합 전에 나와 변경 기록에 이 수정이 없고, stable 메일링 리스트에 백포트 검토 패치도 없으며, linux-cve-announce에도 CVE가 없다(11-20 공지된 SCTP CVE 세 건은 다른 결함이다). Linux 커널 CNA는 수정이 stable에 들어간 뒤 CVE를 배정하므로, 배포판 커널의 수정 공지가 나올 때까지 아래 모듈 차단을 유지하고 수정 여부는 배포판 공지로 판정한다(운영 제안).
- **도달 조건:** SCTP에 닿는지는 커널, 사용 가능한 모듈과 컨테이너 제한에 달려 있다. 많은 배포판이 SCTP 모듈을 기본으로 설치하고, 프로그램이 SCTP 소켓을 처음 열 때 커널이 모듈을 자동으로 적재한다(Xint). 적재는 호스트 커널이 하므로 컨테이너 안의 소켓 생성도 호스트에 모듈을 올릴 수 있다(해석).
- **모듈 적재 차단:** SCTP가 필요 없는 호스트는 `/etc/modprobe.d/` 아래 `.conf` 파일에 `install sctp /bin/false`를 둔다(Xint). `install`은 modprobe가 모듈을 넣는 대신 지정한 명령을 실행하게 하는 지시어다(modprobe.d(5)). 이 줄은 이미 적재된 모듈을 내리지 않고 커널에 내장된 SCTP도 끄지 못한다(Xint). 적용 전에 SCTP를 쓰는 서비스가 있는지 확인하고, 적용 뒤에는 `lsmod`로 `sctp` 적재 여부를, 커널 설정의 `CONFIG_IP_SCTP`(`y`면 내장)로 내장 여부를 본다. 적재됐지만 쓰이지 않는 모듈은 `modprobe -r sctp`로 내린 뒤 `lsmod`로 다시 확인한다. 쓰이는 모듈은 강제 옵션 없이 내려가지 않고(rmmod(8)) 배포판 커널이 모듈 제거를 지원하지 않을 수도 있으므로(modprobe(8)), 내려가지 않거나 내장이면 커널 수정과 재부팅 계획으로 넘긴다(운영 제안).
- **기본 seccomp 프로필은 SCTP를 거르지 않는다:** 2026-11-21 소스로 대조한 기본 프로필 가운데 `socket()`의 세 번째 인자인 프로토콜로 SCTP를 거르는 것은 없다. moby/profiles의 현재 기본 프로필(main)은 첫 인자인 주소 체계를 허용 목록으로 거른다(`{"index": 0, "value": 3, "op": "SCMP_CMP_LT"}`와 개별 값의 `SCMP_CMP_EQ` 규칙, 40번 AF_VSOCK은 목록에 없다). Docker Engine 28.0.0 태그의 프로필은 `{"index": 0, "value": 40, "op": "SCMP_CMP_NE"}`로 AF_VSOCK만 막는다. containerd(main)의 기본 프로필도 주소 체계만 허용 목록으로 거르고, CRI-O가 쓰는 podman common 기본 프로필은 프로토콜 인자를 netlink 감사(NETLINK_AUDIT)에만 본다. 그래서 AF_INET과 AF_INET6 위의 SCTP 소켓 생성은 이 프로필들로 막히지 않고, Kubernetes에서 kubelet의 `seccompDefault`로 `RuntimeDefault`를 켜도 이 경로는 남는다. `seccompDefault`를 켜지 않으면 프로필을 지정하지 않은 파드는 `Unconfined`로 돈다(Kubernetes 문서). 배포된 버전의 프로필과 실제 컨테이너에서는 시험하지 않았다.
- **사용자 정의 프로필은 `socketcall`과 32비트 ABI도 다룬다:** x86-64와 ARM에는 `socketcall`이 없지만 x86-32에서는 `socketcall`이 소켓 API의 전통적인 진입점이었고 Linux 4.3부터 직접 호출이 추가됐다(socketcall(2)). seccomp BPF는 포인터를 따라가지 못해 시스템 호출 인자 값만 평가하므로(커널 문서), 인자를 메모리로 넘기는 `socketcall`에서는 프로토콜을 거를 수 없다. 위 기본 프로필들은 모두 `socketcall`을 조건 없이 허용한다. 그래서 `socket`의 프로토콜 인자로 SCTP를 거부하는 규칙을 만들면 32비트 호환 실행이 필요 없는 컨테이너에서 `socketcall`이나 32비트 ABI도 함께 막고, 실제 컨테이너에서 SCTP 소켓 생성이 실패하는지로 확인한다(운영 제안). 호스트의 모듈 차단은 시스템 호출 경로와 관계없이 그 호스트의 모든 컨테이너에 함께 적용된다(해석).

## 확인 질문

1. 신뢰하지 않는 코드를 실행하는 서비스가 공유 커널 컨테이너에서 microVM으로 옮기면 커널 권한 상승 결함의 피해 범위는 어떻게 달라지고, VM 안에는 어떤 통제를 남겨야 하는가?
2. 컨테이너 안 웹 서버 워커의 원격 코드 실행이 호스트 root가 되려면 무엇이 더 필요한가? SCTP 모듈 적재 차단과 컨테이너 seccomp 프로필은 각각 어디까지 막고 무엇을 남기는가?
3. 수정 커밋은 메인라인에 들어갔지만 발견자가 그 커밋을 지목하지 않았고 CVE와 stable 릴리스도 아직 없는 커널 결함에서, 수정 여부와 완화를 풀 시점은 무엇으로 판정하는가?

## 출처

- [Inside Replit's New Sandbox Engine, Part 1: The Path to MicroVMs — Replit Frontier](https://frontier.replit.com/sandbox-engine-microvms-part-1/) — 2026-11-04 게시, 2026-11-09 구조, VM 안의 계층, 커널 설정, CVE 집계 방식과 이전 범위 대조. 자체 보고
- [A thousand fewer paths to root — OpenAI](https://openai.com/index/a-thousand-fewer-paths-to-root/) — 2026-11-04 게시, 2026-11-09 공식 한국어 페이지로 저권한 계정과 격리 권고 대조
- [The Linux Kernel documentation, CVEs](https://docs.kernel.org/process/cve.html) — 2026-11-09 수정 반영 뒤 자동 배정 원칙 확인
- [NGINX2Root: New Remote Code Execution Vulnerabilities in nginx Require Urgent Patching — Xint](https://xint.io/blog/nginx2root-remote-code-execution) — 2026-11-18 게시, 2026-11-21 SCTP 결함의 유형과 구조, 도입 버전, 수정 상태, 컨테이너 구성의 공개 범위와 모듈 차단의 한계 대조. 공격 재현 정보는 옮기지 않았다
- [NGINX2Root — Xint](https://nginx2root.com/) — 2026-11-21 브라우저로 열람. 커널 패치가 몇 주 안에 나온다는 FAQ와 Docker 구성에 대한 답변 대조
- [NGINX2Root: Remote Code Execution vulnerabilities in nginx — LWN.net](https://lwn.net/Articles/1108362/) — 2026-11-18 게시, 커널 수정 미제공 상태와 모듈 차단 권고 대조
- [Another (?) Linux kernel SCTP vuln undisclosed — oss-security](https://openwall.com/lists/oss-security/2026/11/18/19) — 2026-11-18 게시, nginx2root 사이트의 수정 예정 문구 인용과 modprobe.d 차단 제안
- [Re: Another (?) Linux kernel SCTP vuln undisclosed — oss-security](https://openwall.com/lists/oss-security/2026/11/19/2) — 2026-11-19 게시, 커널 미수정 상태. 2026-11-21까지 같은 스레드에 후속 글 없음
- [sctp: do not free a new asoc peeled off while sendmsg slept — GitHub, torvalds/linux](https://github.com/torvalds/linux/commit/f2540da93a113d3f0a70fd0961e00eb849ce8342) — 2026-11-21 결함 설명, 발견 주체, Fixes 태그와 stable 요청 대조
- [Merge tag 'net-7.4-rc4' — GitHub, torvalds/linux](https://github.com/torvalds/linux/commit/1e575bda30acc0bf01f799cee798d4a1c100d538) — 2026-11-19 메인라인 병합과 포함된 SCTP 수정 목록
- [The Linux Kernel Archives](https://www.kernel.org/) — 2026-11-21 최신 stable과 longterm 릴리스의 날짜와 변경 기록에 이 수정이 없음을 확인
- [lore.kernel.org, stable](https://lore.kernel.org/stable/?q=%22peeled+off+while+sendmsg+slept%22) — 2026-11-21 패치 제목 검색. 원래 패치 스레드와 11-18 답장(Xint 글로 이 패치를 특정할 수 있다는 지적)만 있고 백포트 검토 패치는 없음
- [lore.kernel.org, linux-cve-announce](https://lore.kernel.org/linux-cve-announce/) — 2026-11-21 11-15 이후 SCTP 검색에서 이 결함의 CVE 공지 없음
- [seccomp/default.json — GitHub, moby/profiles](https://github.com/moby/profiles/blob/main/seccomp/default.json) — 2026-11-21 main 기준 `socket()`의 주소 체계 허용 목록, 프로토콜 인자 미검사와 `socketcall` 무조건 허용 확인
- [profiles/seccomp/default.json — GitHub, moby/moby v28.0.0](https://github.com/moby/moby/blob/v28.0.0/profiles/seccomp/default.json) — 2026-11-21 Docker Engine 28.0.0 태그의 `socket()` 규칙(AF_VSOCK만 거부) 확인
- [contrib/seccomp/seccomp_default.go — GitHub, containerd/containerd](https://github.com/containerd/containerd/blob/main/contrib/seccomp/seccomp_default.go) — 2026-11-21 main 기준 주소 체계만 보는 `socket()` 규칙과 `socketcall` 허용 확인
- [internal/config/seccomp/seccomp.go — GitHub, cri-o/cri-o](https://github.com/cri-o/cri-o/blob/main/internal/config/seccomp/seccomp.go) — 2026-11-21 main 기준 podman common 기본 프로필을 가져와 namespace 생성 호출만 조정하는 부분 확인
- [common/pkg/seccomp/seccomp.json — GitHub, containers/container-libs](https://github.com/containers/container-libs/blob/main/common/pkg/seccomp/seccomp.json) — 2026-11-21 main 기준 프로토콜 인자를 NETLINK_AUDIT에만 보는 `socket()` 규칙 확인
- [Kubernetes, Restrict a Container's Syscalls with seccomp](https://kubernetes.io/docs/tutorials/security/seccomp/) — 2026-11-21 `seccompDefault`를 켜지 않은 파드의 `Unconfined` 기본값 대조
- [The Linux Kernel documentation, Seccomp BPF](https://docs.kernel.org/userspace-api/seccomp_filter.html) — 2026-11-21 BPF 필터가 포인터를 따라가지 못하고 인자 값만 평가한다는 설명 대조
- [man7.org, socketcall(2)](https://man7.org/linux/man-pages/man2/socketcall.2.html) — 2026-11-21 x86-32의 `socketcall`과 Linux 4.3의 직접 호출 대조
- [man7.org, modprobe.d(5)](https://man7.org/linux/man-pages/man5/modprobe.d.5.html) — 2026-11-21 `install` 지시어의 동작 대조
- [man7.org, modprobe(8)](https://man7.org/linux/man-pages/man8/modprobe.8.html) — 2026-11-21 `-r`의 동작과 커널의 모듈 제거 미지원 가능성 대조
- [man7.org, rmmod(8)](https://man7.org/linux/man-pages/man8/rmmod.8.html) — 2026-11-21 쓰이는 모듈 제거에 강제 옵션이 필요하다는 설명 대조
- [nginx2root - nginx 원격 코드 실행 취약점 5개와 Linux 커널 권한 상승 취약점 — GeekNews](https://news.hada.io/topic?id=37438) — 2026-11-19 소개 글, 계기 자료. 사실은 위 출처로 대조했다

## 관련 문서

- [[VM-Guest-to-Host-Escape|VM 게스트에서 호스트로의 탈출]] — 하이퍼바이저 밖 호스트 커널 경로, 호스트 패치와 롤링 재부팅, 에이전트 샌드박스 다층 방어
- [[Vulnerability-Operations-AI-Agents#사례: nginx HTTP/2와 nginx2root|nginx HTTP/2와 nginx2root]] — SCTP 단계 앞의 nginx 결함과 기능별 완화
- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
- [[Linux-Kernel-CVE-Patching|리눅스 커널 보안 업데이트]] — 배포판 커널의 수정 상태와 라이브 패치
- [[Memory-Safety-Vulnerabilities#원격 코드 실행의 권한은 워커 계정에서 시작한다|원격 코드 실행과 워커 계정]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개]]
