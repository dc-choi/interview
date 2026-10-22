---
tags: [kubernetes, security, falco, ebpf, cks, runtime-security]
status: done
verified_at: 2026-10-19
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Falco", "Falco 런타임 보안", "Falco Runtime Security"]
---

# Falco 런타임 보안

Falco는 호스트, 컨테이너와 Kubernetes에서 실행 중에 일어나는 이상 행동과 위협 신호를 탐지해 알리는 런타임 보안 도구다. Linux 커널 이벤트와 플러그인이 넘긴 이벤트를 규칙에 대조해 실시간 경보를 낸다. Sysdig가 만들었고 현재 CNCF graduated 프로젝트다. 아래 설치 절차와 드라이버 조건은 2026-10-19 falco.org 문서(버전 메뉴의 최신 항목 v0.45) 기준이며, 버전이 바뀌면 같은 문서를 다시 확인한다.

## 설치 방식을 먼저 정한다

| 방식 | 쓰는 곳과 조건 |
|---|---|
| Kubernetes Operator | Kubernetes 배포의 현재 권장 방식 |
| Kubernetes Helm chart | Operator 전환 기간 동안 완전히 지원된다. 기본 설치는 DaemonSet으로 모든 노드에 Falco를 두며 privileged 권한이 필요하다 |
| 컨테이너 | Falco 패키지 대신 컨테이너 이미지로 실행한다. modern eBPF는 드라이버 설치가 필요 없고, kmod는 `falcosecurity/falco-driver-loader`로 호스트에 드라이버를 먼저 설치해야 하며 이 단계에는 전체 권한이 필요하다. 공식 문서는 최소 권한 실행을 권장한다 |
| 호스트 패키지(DEB, RPM)와 tarball | 노드나 단일 Linux 호스트에 직접 설치한다. 아래 DEB 설치는 드라이버별 systemd unit을 함께 둔다 |

Helm 기본 설치는 다음과 같다. chart 기본값 `driver.kind=auto`는 Falco 바이너리에 포함된 modern eBPF를 먼저 쓰고, 노드 커널에 필요한 BPF 기능이 없을 때만 kernel module로 바꿔 노드에 드라이버를 설치한다.

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update
helm install --replace falco --namespace falco --create-namespace --set tty=true falcosecurity/falco
kubectl get pods -n falco
```

과제나 운영 환경이 설치 방식과 드라이버를 지정하면 그 조건부터 확인한다. 같은 Falco라도 호스트 설치는 systemd unit과 journal을, 클러스터 배포는 DaemonSet Pod를 확인 경로로 쓴다.

## 드라이버: modern eBPF와 kernel module

| 드라이버 | 동작 | 요구 사항 |
|---|---|---|
| modern eBPF probe (기본) | userspace 바이너리에 포함돼 별도 빌드 없이 동작한다. CO-RE(Compile Once Run Everywhere)로 커널 릴리스와 관계없이 동작한다 | BPF ring buffer를 지원하고 BTF를 노출하는 커널. 특정 커널 버전을 요구하지는 않으며 대개 5.8 이상이면 충분하지만, 필요한 기능이 더 오래된 커널에 backport된 경우도 있어 5.8을 최소 지원 버전으로 단정하지 않는다. privileged 대신 필요한 capability만 주고 실행할 수 있다 |
| kernel module (kmod) | `falcoctl driver`가 현재 커널(`uname -r`)용 사전 빌드 모듈을 먼저 찾고, 없으면 현지에서 빌드해 적재한다 | 모듈을 설치하고 적재하는 단계에는 전체 권한이 필요하다. Kernel Events 문서는 kmod를 capabilities로 실행할 수 없다고 적지만, 컨테이너 배포 문서는 호스트에 드라이버를 먼저 설치한 뒤 Falco 컨테이너를 `SYS_PTRACE`와 `/dev/falco*` 장치로 실행하는 최소 권한 예를 든다. 빌드에 대비한 의존성은 Debian과 Ubuntu에서 `dkms`, `make`, `linux-headers-$(uname -r)`, yum 계열에서 `dkms`, `make`, `kernel-devel-$(uname -r)`이다 |

설정에서는 `engine.kind`를 `modern_ebpf`로 두면 modern eBPF probe를 쓴다. 드라이버를 고르기 전에 커널 버전과 BTF 노출 여부를 확인하고, kmod를 쓰면 빌드 의존성과 권한 범위를 함께 검토한다.

## Debian과 Ubuntu 호스트 설치

Falco는 x86_64와 aarch64 Linux에서 동작하고, 번들 플러그인을 포함한 Falco는 GLIBC 2.28 이상이 필요하다.

1. Falco 저장소 서명 키를 키링에 등록한다. apt는 이 키로 저장소 메타데이터(InRelease 또는 Release)의 서명을 확인하고, 서명된 메타데이터에 적힌 체크섬으로 내려받은 패키지가 바뀌지 않았는지 검사한다.
2. `signed-by`로 그 키링을 지정한 저장소를 추가한다.
3. 오래된 Debian(9 이하)이라면 HTTPS 저장소에 접근하도록 `apt-transport-https`를 먼저 설치해야 할 수 있다. 그다음 패키지 목록을 갱신한다.
4. kernel module을 쓸 때만 빌드 의존성을 설치한다. modern eBPF만 쓰면 필요 없다. 대화형 드라이버 선택 창을 쓰려면 `dialog`도 설치할 수 있다.
5. `falco`를 설치한다.

```bash
curl -fsSL https://falco.org/repo/falcosecurity-packages.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/falco-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/falco-archive-keyring.gpg] https://download.falco.org/packages/deb stable main" | \
  sudo tee -a /etc/apt/sources.list.d/falcosecurity.list
sudo apt-get update -y
sudo apt install -y dkms make linux-headers-$(uname -r)   # kmod를 쓸 때만
sudo apt install -y dialog                                 # 대화형 선택 창을 쓸 때
sudo apt-get install -y falco
```

대화형 설치는 Automatic selection(권장), Kmod, Modern eBPF, Manual configuration 중 하나를 고르게 한다. Automatic selection은 환경에 맞는 드라이버를 자동으로 고른다. 비대화형 설치에서는 환경 변수로 정한다.

- `FALCO_DRIVER_CHOICE`: `kmod`나 `modern_ebpf`로 드라이버를 고른다. `none`이면 서비스를 설치하지 않고, 비워 두면 자동 선택이다.
- `FALCOCTL_ENABLED`: `no`로 두면 `falcoctl`의 규칙 자동 갱신을 끈다.
- 대화창 없이 자동 선택을 쓰면서 규칙 자동 갱신만 끄는 명령은 `FALCO_FRONTEND=noninteractive FALCOCTL_ENABLED=no apt-get install -y falco`다. root가 아니면 `sudo FALCO_FRONTEND=noninteractive FALCOCTL_ENABLED=no apt-get install -y falco`처럼 변수를 sudo 뒤에 둔다. 이 방식은 sudoers 규칙이 NOSETENV 없이 ALL 명령을 허용하거나 SETENV 태그 또는 setenv 옵션이 있을 때 통한다. 그 밖의 규칙에서는 기본으로 켜진 env_reset 아래 env_keep에 없는 변수를 넘길 수 없다. sudo 앞에 두면 기본으로 켜진 `env_reset`이 변수를 지운다.

## 서비스와 경보 확인

드라이버마다 systemd unit이 다르다.

| unit | 역할 |
|---|---|
| `falco-modern-bpf.service` | modern eBPF로 Falco 실행 |
| `falco-kmod.service`, `falco-kmod-inject.service` | kmod로 실행. inject unit은 모듈을 적재하고 끝나지만, `falco-kmod.service`가 멈출 때 모듈을 떼어 내도록 active 상태로 남는다 |
| `falco-custom.service` | 플러그인처럼 사용자 구성으로 실행할 때 쓰며, 그대로 쓰지 않고 먼저 고쳐야 한다 |
| `falcoctl-artifact-follow.service` | 규칙 파일 자동 갱신 |

modern eBPF로 설치했다면 서비스 상태를 보고, 민감 파일을 읽어 시험 경보를 만든 뒤 journal에서 경보를 찾는다.

```bash
sudo systemctl status falco-modern-bpf.service
sudo cat /etc/shadow > /dev/null
sudo journalctl _COMM=falco -p warning
```

경보 줄은 이벤트 시각과 우선순위 `Warning` 다음에 `Sensitive file opened for reading by non-trusted program` 문구가 오고 `file=/etc/shadow`, `process=cat`, `user=root` 같은 필드를 담는다. 같은 활동은 syslog에도 남는다. 서비스가 active라는 사실은 탐지와 경보 전달이 된다는 증거가 아니므로, 시험 이벤트의 경보가 실제 수집 경로까지 도착하는지 따로 확인한다.

## 규칙 파일과 갱신

- 기본 규칙은 `/etc/falco/falco_rules.yaml`이다. 사용자 규칙은 `/etc/falco/falco_rules.local.yaml`이나 `/etc/falco/rules.d/`에 둔다. Helm의 `customRules` 값으로 넣은 파일은 `rules.d`에 놓인다.
- `/etc/falco/falco.yaml`의 `rules_files`가 적재 순서를 정한다. 기본 순서는 `falco_rules.yaml`, `falco_rules.local.yaml`, `rules.d`다. 명령행에 `-r`을 한 번이라도 주면 설정 파일의 `rules_files`는 무시된다.
- `falcoctl`은 OCI artifact로 배포되는 규칙 파일을 내려받고 갱신한다. `install` 명령은 기본으로 `/etc/falco`에 내려받는다.

## 규칙의 조건과 경보를 따로 읽는다

2026-10-23 공식 규칙 문서 부분 대조 기준이다. 규칙은 YAML 객체이며 `rule`, `desc`, `condition`, `output`, `priority`를 필수 필드로 둔다. `condition`은 이벤트별 참/거짓 판정이고, `output`은 `%proc.name` 같은 필드 치환으로 경보 내용을 만든다. `priority`는 심각도이며 규칙 실행 순서나 덮어쓰기 우선순위가 아니다.

- macro는 여러 규칙이 재사용할 조건식이다. list는 프로세스명 같은 값의 집합이며 그 자체가 조건식은 아니다.
- `evt.type = execve and (proc.name = cat or proc.name = grep)`는 `execve` 이벤트 가운데 프로세스명이 두 값 중 하나인 경우를 고른다. 파일 읽기나 악성 행위 자체를 판정하는 식은 아니다.
- `container.id != host and proc.name = bash`처럼 이벤트 종류를 제한하지 않으면 해당 셸의 여러 syscall이 조건에 맞을 수 있다. 실행 이벤트만 보려면 `evt.type in (execve, execveat)` 같은 범위를 명시한다.
- list가 다른 list를, macro가 다른 macro를 참조할 때는 참조 대상이 먼저 정의되어야 한다. macro의 list 참조와 rule의 macro 참조에는 같은 선행 정의 조건이 없다.

### 시험 경보가 없을 때 확인할 범위

`Terminal shell in container`는 터미널이 붙은 컨테이너의 셸 실행을 다루는 기본 규칙이다. 운영자가 수행한 정상 디버깅도 탐지할 수 있으므로 경보만으로 침해를 확정하지 않는다. `Read sensitive file untrusted`는 민감 파일 읽기 조건과 신뢰 프로그램 예외를 함께 사용한다. 접근 명령이 실패해도 이 규칙이 반드시 경보를 낸다고 일반화하지 않는다.

운영 점검 제안: 격리된 시험 환경에서 이벤트가 발생한 노드의 Falco를 확인하고, 적재한 규칙 버전과 활성 상태, 조건과 예외, 출력 경로를 순서대로 대조한다. 이벤트 시각, 프로세스와 컨테이너 식별자를 경보와 연결한다. 실제 환경에서 탐지나 전달을 재현한 결과는 아니며 설치와 시험 범위 절의 기존 검증일은 유지한다.

## CKS와의 연결

2026-10-19 Linux Foundation 안내 기준 CKS는 Kubernetes v1.35를 기반으로 하며, CKA 합격이 응시 조건이고 시험 시간은 2시간이다. 영역 가운데 Monitoring, Logging and Runtime Security가 20%다. 같은 날 확인한 허용 자료 안내는 CKS 시험에서 Kubernetes 문서와 함께 Falco 문서(`falco.org/docs`)를 열 수 있다고 적는다.

## 운영 체크포인트

- 설치 방식(호스트, 컨테이너, Helm, Operator)에 따라 상태 확인과 로그 확인 경로를 구분해 말할 수 있는가
- modern eBPF와 kmod의 차이를 빌드 필요 여부, 커널 요구 사항과 권한으로 설명할 수 있는가
- 서비스 실행과 탐지 동작을 따로 검증하는 시험 이벤트를 만들 수 있는가
- 기본 규칙과 사용자 규칙의 위치, 적재 순서와 `-r`의 효과를 알고 있는가

## 출처

- [Falco, Basic Elements of Falco Rules](https://falco.org/docs/concepts/rules/basic-elements/)
- [Falco, Condition Syntax](https://falco.org/docs/concepts/rules/conditions/)
- [Falco, Default Rules](https://falco.org/docs/reference/rules/default-rules/)
- [Falco, The Falco Project](https://falco.org/docs/)
- [Falco, Install on a host (DEB, RPM)](https://falco.org/docs/setup/packages/)
- [Falco, Kernel Events](https://falco.org/docs/concepts/event-sources/kernel/)
- [Falco, Deploy on Kubernetes with Helm](https://falco.org/docs/setup/kubernetes/)
- [Falco, Deploy on Kubernetes with the Operator](https://falco.org/docs/setup/operator/)
- [Falco, Deploy as a container](https://falco.org/docs/setup/container/)
- [falcosecurity/charts, Falco chart README](https://github.com/falcosecurity/charts/tree/master/charts/falco) — `driver.kind=auto`의 드라이버 선택 순서
- [Debian Manpages, apt-secure(8)](https://manpages.debian.org/bookworm/apt/apt-secure.8.en.html) — 저장소 Release 서명 확인
- [Debian Manpages, sudoers(5)](https://manpages.debian.org/bookworm/sudo/sudoers.5.en.html) — `env_reset` 기본 동작과 ALL 규칙의 NOSETENV
- [Debian Manpages, sudo(8)](https://manpages.debian.org/bookworm/sudo/sudo.8.en.html) — 명령행 환경 변수의 제한과 setenv, SETENV, ALL 예외
- [Falco, Try Falco on Linux](https://falco.org/docs/getting-started/falco-linux-quickstart/)
- [Falco, Default and Local Rules Files](https://falco.org/docs/concepts/rules/default-custom/)
- [Linux Foundation, Certified Kubernetes Security Specialist (CKS)](https://training.linuxfoundation.org/certification/certified-kubernetes-security-specialist/)
- [Linux Foundation, Resources Allowed: All LF Certification Programs](https://docs.linuxfoundation.org/tc-docs/certification/certification-resources-allowed)
- [YouTube, NeoKloud, CKS 29 - Monitoring Logging Runtime Security - 06 - Falco Installation](https://www.youtube.com/watch?v=a_GiJ9t4BRc) — 2026-10-11 공개 강의. 설치 절차는 Falco 문서로 대조. 강사는 설치 절차 자체의 출제 가능성을 낮게 봤다(강사 의견이며 공식 출제 범위가 아니다)

## 관련 문서

- [[k8s|Kubernetes 인덱스]]
- [[K8s-CKA-Operations-Practice|CKA 운영 실습]]
- [[K8s-NetworkPolicy|NetworkPolicy]]
- [[Container-Linux-Internals|컨테이너 Linux 내부]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
