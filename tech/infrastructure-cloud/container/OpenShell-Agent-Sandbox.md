---
tags: [infrastructure, container, agent, sandbox, landlock, seccomp, egress, credential, nvidia]
status: done
verified_at: 2026-10-27
category: "Infrastructure - Container"
aliases: ["OpenShell", "NVIDIA OpenShell", "OpenShell Agent Sandbox", "에이전트 샌드박스 런타임"]
---

# OpenShell: supervisor가 중개하는 에이전트 sandbox

에이전트에게 파일 읽기, 패키지 설치, API 호출과 자격 증명 사용을 허용하면서 데이터, 비밀과 네트워크 접근은 정책 범위로 묶는 런타임이다. 에이전트와 같은 경계 안에 있는 구성 요소에는 판단을 맡기지 않는다. 경계 밖의 신뢰 구성 요소(supervisor)가 모든 외부 요청을 결정하고 자격 증명을 붙인다.

2026-10-27 확인한 v0.1.5(2026-10-20)의 공식 문서와 저장소 README를 기준으로 정리했다. 2026-10-28에도 이 버전의 정책과 지원 조건을 대조했다. 공식 지원표는 stable과 pre-release를 구분하지만, 버전 번호만으로 배포 적합성을 판단하지 않는다. NVIDIA가 Apache 2.0으로 공개했고 주 언어는 Rust다. 설치와 차단 시험은 하지 않았다.

## 구성 요소

| 구성 요소 | 위치 | 역할 |
|---|---|---|
| Gateway | 제어 평면 | 사용자 인증, 샌드박스 수명주기, 정책과 설정 전달, provider 연결 |
| Compute driver | Docker, Podman, Kubernetes, MicroVM | workload와 별도 supervisor를 만들고, 둘 사이의 보호 채널과 네트워크 차단막을 구성 |
| Supervisor | 경계 밖(신뢰) | 정책 판정, DNS 해석, 승인된 연결 개설, 자격 증명 주입 |
| Sandbox | 경계 안(에이전트와 공유) | 에이전트 process 소유, 요청한 실행 파일 식별, TCP와 DNS 요청을 supervisor로 전달. 정책 판단은 하지 않음 |

경계 안의 sandbox는 gateway 서명 키, gateway JWT와 provider 자격 증명을 갖지 않는다. supervisor가 경계를 확인하기 전에는 에이전트를 시작하지 않고, supervisor 연결이 끊기면 에이전트를 멈춘다. 같은 supervisor process만 다시 연결해 재개할 수 있다.

## 요청 하나가 나가는 경로

1. 에이전트가 TCP 연결이나 DNS 조회를 연다.
2. sandbox가 seccomp user notification으로 이를 가로채고, 신뢰할 수 있는 `/proc` 정보로 호출한 실행 파일을 식별한다.
3. 요청이 상호 인증된 HTTP/2 채널로 supervisor에 간다. 채널은 Docker와 Podman에서 Unix socket, Kubernetes에서 mTLS를 쓰는 TCP, MicroVM에서 vsock이다.
4. supervisor가 정책을 확인하고 허용된 자격 증명을 붙인다.
5. 허용되면 supervisor가 실제 연결을 열고 트래픽을 중계한다.

공식 설계는 이 채널을 workload의 유일한 egress로 두고, 나머지는 런타임별 차단막으로 막는다. 아래는 문서에 적힌 경로이며 실제 우회 차단을 시험한 결과가 아니다.

| 런타임 | supervisor 위치 | 직접 egress 차단 |
|---|---|---|
| Docker, Podman | 별도 컨테이너 | workload 컨테이너의 network를 끔(`network=none`) |
| Kubernetes | 별도 Pod | NetworkPolicy가 supervisor 서비스만 허용. CNI가 NetworkPolicy를 강제해야 함 |
| MicroVM | host process | 공식 아키텍처는 guest에 network device가 없다고 설명. libkrun의 NIC 없는 socket 경로(TSI)까지 차단하는지는 이번에 구현으로 확인하지 못함 |

같은 버전의 보안 모범 사례 문서에는 network namespace와 veth를 거쳐 proxy로 가는 설명이 남아 있어 아키텍처 문서와 다르다. 배포한 버전의 실제 경로는 차단돼야 할 요청을 보내 확인한다(문서 간 불일치).

## 정책의 층과 적용 시점

정책은 YAML이며 네트워크 목적지, port와 실행 파일은 허용 규칙이 없으면 거부한다. 허용된 endpoint 안의 L7 규칙은 아래 `enforcement` 설정에 따라 차단하거나 기록만 한다. 적용 우선순위는 관리자의 global policy, 샌드박스에 저장된 정책, 이미지에 포함된 정책, 기본 제한 정책 순이다. global policy는 각 샌드박스 정책을 대체하고, 활성 중에는 샌드박스 정책 변경과 제안 승인을 막는다.

| 층 | 강제 수단 | 변경 |
|---|---|---|
| 파일시스템 | Landlock LSM | 생성 시 고정. 바꾸려면 재생성 |
| 프로세스 | 비root 단일 신원, capability 없음, seccomp | 생성 시 고정 |
| 네트워크 | proxy와 OPA 정책 엔진. 목적지, port, 실행 파일, HTTP 메서드와 경로 | 실행 중 변경 가능 |
| 자격 증명 | 네트워크 정책과 provider의 endpoint binding | provider 연결과 해제로 변경 |

- **실행 파일 단위 허용:** 네트워크 규칙마다 `binaries` 목록이 필요하다. 처음 관찰한 SHA256으로 실행 파일을 고정하고 이후 digest가 다르면 거부한다. `/**` 같은 넓은 glob은 이 효과를 없앤다.
- **L7 검사는 선언해야 한다:** `protocol` 필드가 없는 endpoint는 host, port와 실행 파일만 확인하고 HTTP 메서드와 경로는 제한하지 않는다. 읽기만 허용하려면 `protocol: rest`와 `rules` 또는 `access: read-only`를 쓴다.
- **L7 기본값은 audit이다:** L7 규칙의 `enforcement` 기본값은 `audit`이라 위반을 기록만 하고 전달한다. 차단하려면 `enforce`로 바꾼다. 문서는 audit으로 규칙을 확인한 뒤 enforce로 바꾸라고 권한다.
- **Landlock 기본값은 best_effort다:** 지정한 경로를 하나도 적용하지 못하거나 추가 파일시스템 정책을 강제하지 못하면 해당 정책 규칙 없이 시작하고 high severity 기록만 남긴다. 반드시 막아야 하면 `hard_requirement`로 둔다. 이 설정과 무관하게 내부 채널과 bootstrap 파일을 보호하는 기준선은 유지된다.
- **내부 주소 차단:** 정책이 연결을 허용한 뒤에도 proxy가 DNS를 해석해, 정확한 hostname으로 선언하지 않은 endpoint(wildcard, hostless, policy advisor로 추가한 규칙)가 사설 IP로 향하면 거부한다. loopback, link-local(`169.254.0.0/16`, 클라우드 메타데이터 포함)과 `0.0.0.0`은 `allowed_ips`로도 열 수 없다.

## 자격 증명은 placeholder로만 준다

에이전트의 환경 변수에는 실제 값 대신 불투명한 placeholder가 들어간다. 에이전트가 placeholder를 담아 HTTP 요청을 보내면 proxy가 전달 직전에 실제 값으로 바꾼다.

- **두 검사를 모두 통과해야 한다:** 네트워크 정책이 그 실행 파일과 목적지를 허용해야 하고, provider의 credential binding이 요청의 host, port와 path를 포함해야 한다. 정책은 허용하지만 binding 밖이면 403 `credential_endpoint_mismatch`로 거부한다.
- **치환 위치:** header, Basic auth, query, URL path, opt-in한 요청 body와 WebSocket 텍스트, AWS SigV4 서명이다. cookie, 응답 내용과 binary frame은 바꾸지 않는다.
- **HTTP를 읽어야 치환한다:** proxy는 샌드박스마다 만든 임시 CA로 TLS를 종료하고, 그 CA를 `SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE` 같은 trust store 환경 변수로 주입한다. `tls: skip`이나 HTTP가 아닌 터널에서는 치환과 L7 검사를 하지 않는다.
- **실패 시 닫힌다:** 알 수 없거나 만료된 placeholder는 upstream으로 보내지 않고 실패시킨다.

MCP 계층에서 같은 원리를 쓰는 구성은 [[MCP-Security-Boundaries|MCP 보안 경계]]를 참고한다.

## 권한 확장 요청과 형식 검증

- **policy advisor:** 기본으로 꺼져 있다. 켜면 차단된 에이전트가 host, port, 실행 파일과 HTTP 메서드, 경로로 좁힌 네트워크 규칙을 제안할 수 있다. 제안이 스스로 정책을 바꾸지는 않고 기본적으로 사람의 검토를 기다린다. 승인된 규칙은 재시작 없이 적용된다. 파일시스템, Landlock과 프로세스 설정은 제안할 수 없고, 자동 승인은 위험 검사에서 지적이 없을 때만 동작하는 opt-in이다.
- **policy prover:** SMT solver로 두 가지를 확인한다. proposal risk check는 새 규칙이 클라우드 메타데이터 주소나 provider 자격 증명의 새 목적지 같은 위험한 접근을 더하는지 보고, boundary check는 정책이 관리자가 정한 최대 정책을 넘지 않는지 본다. 하나를 통과해도 다른 하나를 통과했다는 뜻은 아니다. 보장 범위는 prover 모델이 표현하는 정책 기능에 한정되며, boundary check는 GraphQL이나 MCP 규칙이 있으면 그 규칙을 무시하지 않고 검사할 수 없다고 보고한다.

## 실행 조건과 제약

- **플랫폼:** Linux, Apple Silicon macOS, Windows WSL 2(실험)에서 Docker, Podman 또는 host 가상화가 필요하다.
- **커널:** Landlock ABI 3 이상(Linux 6.2에서 도입)과 seccomp user notification의 중첩 필터, `SECCOMP_IOCTL_NOTIF_ADDFD`가 필요하다. 커널 버전만으로 판단하지 않고 시작 전에 실제로 시험하며, 필수 ABI, 내부 채널과 bootstrap 보호 기준선 또는 seccomp 검사를 통과하지 못하면 시작을 거부한다. `best_effort`는 이 기준선을 생략하는 옵션이 아니라 추가 파일시스템 정책의 적용 실패를 허용하는 설정이다. macOS에서는 이 커널 기능이 host가 아니라 Docker Desktop의 Linux VM에서 동작한다.
- **GPU:** `--gpu`로 요청한다. Docker와 Podman은 CDI device, Kubernetes는 `nvidia.com/gpu`, MicroVM은 PCI 주소로 GPU 하나를 붙인다. Kubernetes의 Pod user namespace 격리는 기본 꺼짐이며, GPU와 함께 켜면 NVIDIA device plugin 호환성이 확인되지 않았다는 경고가 나온다.
- **MicroVM:** libkrun 기반이다. VM mount를 쓰면 침해된 guest kernel이 지정한 원본 디렉터리 밖의 host 파일에도 gateway 사용자의 권한 범위에서 접근할 수 있어 opt-in이 필요하다.
- **텔레메트리:** 익명 운영 지표를 기본으로 수집한다. `OPENSHELL_TELEMETRY_ENABLED=false`(Helm은 `server.telemetryEnabled=false`)로 끈다.

## 도입 점검

다음은 위 문서에서 도출한 점검안이다.

- 허용한 endpoint 하나하나가 유출 경로가 될 수 있다는 점은 공식 문서도 지적한다. 신뢰 도메인으로의 소량 유출은 허용 목록만으로 막지 못하므로 요청 기록과 차단 기록을 함께 본다.
- `audit`, `best_effort` 기본값을 운영 요구에 맞춰 `enforce`, `hard_requirement`로 바꿨는지 확인한다.
- 다른 실행 파일, 메타데이터 주소, binding 밖 목적지로의 요청을 실제로 보내 거부되는지 시험한다. MicroVM에서도 NIC 유무만 보지 않고 supervisor를 우회하는 TCP와 DNS egress가 차단되는지 시험한다.
- 런타임이 바뀌면 차단막의 구현도 바뀐다. Kubernetes에서는 CNI의 NetworkPolicy 강제 여부를 먼저 확인한다([[K8s-NetworkPolicy|NetworkPolicy]]).

일반적인 실행 격리 점검은 [[Agent-Execution-Isolation|에이전트 실행 격리]]를, 대기 중인 에이전트를 스냅샷으로 내리는 다른 접근은 [[K8s-Agent-Substrate|Agent Substrate]]를 따른다.

## 출처

- [OpenShell — NVIDIA](https://github.com/NVIDIA/OpenShell) — 2026-10-27 README와 릴리스 목록(v0.1.5, 2026-10-20) 대조
- [libkrun — containers](https://github.com/containers/libkrun) — 2026-10-28 NIC 없이 host socket 연결을 제공하는 TSI 설명 대조. OpenShell에서의 비활성화 여부는 미검증
- [NVIDIA OpenShell, Architecture](https://docs.nvidia.com/openshell/v0.1.5/about/architecture)
- [NVIDIA OpenShell, Sandbox Policies](https://docs.nvidia.com/openshell/v0.1.5/how-it-works/policies/overview)
- [NVIDIA OpenShell, Policy Schema Reference](https://docs.nvidia.com/openshell/v0.1.5/how-it-works/policies/schema)
- [NVIDIA OpenShell, Providers](https://docs.nvidia.com/openshell/v0.1.5/how-it-works/providers/overview)
- [NVIDIA OpenShell, Policy Advisor](https://docs.nvidia.com/openshell/v0.1.5/how-it-works/policies/advisor)
- [NVIDIA OpenShell, Policy Prover](https://docs.nvidia.com/openshell/v0.1.5/how-it-works/policies/prover)
- [NVIDIA OpenShell, Security Best Practices](https://docs.nvidia.com/openshell/v0.1.5/security/best-practices)
- [NVIDIA OpenShell, Support Matrix](https://docs.nvidia.com/openshell/v0.1.5/about/support-matrix)
- [NVIDIA OpenShell, Sandbox Runtimes](https://docs.nvidia.com/openshell/v0.1.5/how-it-works/sandboxes/runtimes)
- [OpenShell - AI 에이전트의 파일과 네트워크 접근을 제어하는 NVIDIA 런타임 — GeekNews](https://news.hada.io/topic?id=35833) — 소개 글과 Hacker News 의견 번역

## 관련 문서

- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[AI-Training-Environment-Containment|AI 학습 환경의 격리]]
- [[K8s-Agent-Substrate|Agent Substrate]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
- [[K8s-NetworkPolicy|NetworkPolicy]]
