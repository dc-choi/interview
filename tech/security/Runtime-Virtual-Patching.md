---
tags: [security, virtual-patching, ebpf, linux, runtime-security, vulnerability-management]
status: done
verified_at: 2026-11-25
category: "보안(Security)"
aliases: ["Runtime Virtual Patching", "런타임 가상 패치", "호스트 런타임 완화", "eBPF Live Mitigation", "Shirudo"]
---

# 런타임 가상 패치: 패치 전까지 실행 중인 호스트에서 막기

가상 패치는 취약한 코드를 고치지 않고 알려진 악용 경로를 막는 임시 통제다. 보통은 WAF처럼 서비스 앞단에서 요청을 검사하지만, 같은 원리를 취약한 코드가 도는 호스트 안으로 가져가면 커널 hook이나 애플리케이션 메서드 바로 앞에서 악용 조건을 거절할 수 있다. 이 문서는 완화를 둘 위치, 커널과 프로세스 안에서 도는 완화 코드 자체를 믿을 근거, AI가 만든 완화를 내보내기 전의 확인을 다룬다. 가상 패치의 정의와 본 패치의 단계 배포는 [[Security-as-Enabler#가상 패치로 시간을 벌고 본 패치를 단계적으로 넓힌다|가능하게 하는 보안]], 커널 코드를 재부팅 없이 교체하는 livepatch는 [[Linux-Kernel-CVE-Patching#완화는 수정이 아니다|리눅스 커널 보안 업데이트]]에 있다.

## 완화를 어디에 둘 것인가

| 위치 | 보는 것 | 강점 | 한계 |
|---|---|---|---|
| 앞단(WAF, IPS) | 요청의 바이트와 헤더 | 서비스를 건드리지 않고 여러 서버에 한 번에 적용한다 | 애플리케이션이 입력을 어떻게 해석할지 모르고, 인코딩 우회와 앞단을 거치지 않는 내부 경로(큐, 배치, 파일)를 놓친다 |
| 호스트 커널(eBPF와 LSM hook) | 시스템 콜, 파일, 네트워크, 권한 변경 같은 커널 사건 | 애플리케이션 종류와 무관하게 재시작 없이 붙이고 뗀다 | 커널이 보는 수준의 사건만 판단하고, 커널 기능과 버전이 맞아야 한다 |
| 프로세스 안(Java 에이전트 같은 바이트코드) | 특정 메서드의 인자와 상태 | 취약 조건을 가장 정확하게 검사한다 | 런타임마다 따로 만들고 로드 시점의 제약이 있으며, 애플리케이션과 같은 프로세스에서 돌아 커널이 강제하는 경계가 아니다 |

이 표는 위치별 성격을 정리한 해석이다. 어느 위치든 다음 두 가지는 같다.

- **취약 동작보다 먼저 막아야 한다.** Java4Shell에서는 Base64 디코드 intrinsic이 힙을 먼저 덮어쓴 뒤에 자바 코드가 그 입력을 예외로 거부한다([[JVM-JIT-and-AOT-Cache-Intrinsics#사례: Java4Shell|Java4Shell]]). 예외 처리나 사후 탐지로는 늦으므로 입력 검사가 취약 루틴에 들어가기 전에 있어야 한다(해석).
- **막으면 장애가 될 수 있다.** 동작을 통째로 막으면 서비스가 멈출 수 있어 악용 조건과 정상 요청을 가르는 좁은 조건이 필요하다(OpenAI 발표 글). 처음에는 기록만 남겨 정상 요청에 주는 영향을 보는 원칙은 앞단 가상 패치와 같다.

## 사례: Shirudo (2026-11-23 공개)

OpenAI와 Cisco(Isovalent)가 공개한 오픈소스 프로젝트로, 이름은 일본어로 방패를 뜻한다. Isovalent는 2022년에 공개한 eBPF 보안 플랫폼 Tetragon을 에이전트용으로 다시 쓴 것이라고 소개한다. 아래는 2026-11-25 발표 글, 저장소 README와 문서로 대조한 내용이다.

- **상태와 요구 조건:** 안정 릴리스와 지원 브랜치가 없는 pre-release다. 운영 대상에는 signed-loader ABI와 Shirudo의 커널 패치를 넣은 Linux 커널, TPM 2.0이 필요하고 TPM 없이 도는 모드는 없다. 라이선스는 BSD-2-Clause이고 BPF 프로그램은 BSD와 GPL 이중 라이선스다.
- **완화 단위(upatch):** 커널 hook에서 취약 경로를 막는 BPF upatch와 애플리케이션 코드를 지키는 Java upatch가 있다. Isovalent 글은 완화 방식으로 취약 경로 차단, 취약 코드를 고친 코드로 교체, 공격 탐지용 가시성 추가를 든다.
- **배포:** 운영자 장비가 upatch를 빌드해 운영자의 ML-DSA-87 키로 서명하고 OCI 레지스트리에 올린다. 대상은 상주 데몬 없이 한 번씩 실행하는 명령으로 패키지를 받아 적재하고, 원격 측정 데이터를 OpenTelemetry 수집기로 보낸다.
- **로드 제한:** 부팅 때 initrd에서 `shirudo init`이 가드를 붙인 뒤에는, 커널이 봉인된 `.bpf` 키링으로 서명을 검증한 로더만 사용자 공간에서 BPF를 로드할 수 있다. 그래서 자기 BPF 프로그램을 직접 로드하는 Cilium, Falco, bpftrace는 그대로는 대상에서 돌지 않으며, FAQ는 그 논리를 서명된 upatch로 옮겨 배포하는 길을 안내한다.
- **측정:** 적재된 upatch 집합이 바뀔 때마다 부팅별 TPM 레지스터가 확장되고, `shirudo attest`가 내는 증거를 운영자가 오프라인으로 검증한다.
- **Java4Shell 시험:** 통제된 시험에서 Codex가 만든 완화가 `java.util.Base64$Decoder.decode0`에 입력 검사를 넣었고, Elasticsearch 9.5.5에서 악용 시도의 입력을 거절해 공격이 실패했다(Isovalent가 공개한 로그 기준). 발표 글은 재시작 없이 실행 중인 프로세스에 붙였다고 적고, Isovalent는 이 완화가 효과가 있어 보이며 OpenJDK 패치 전까지의 보호라고 적는다.

발표와 문서 사이에는 확인하지 못한 차이가 있다. 2026-11-25 저장소의 Java upatch 문서는 적재할 때 옵션 파일 `/run/environment.d/shirudo.conf`에 `-javaagent`를 `JAVA_TOOL_OPTIONS`로 덧붙이고, systemd user manager가 이 파일을 읽어 자신이 띄우는 JVM에 넘긴다고 적는다. JVM은 시작할 때 이 값을 읽으므로 이미 실행 중인 JVM은 재시작할 때까지 원래 에이전트로 남는다. user manager가 띄우지 않는 JVM(시스템 서비스, 컨테이너, 그 밖의 로그인)은 이 옵션을 보지 못해 유닛이나 명령줄에 같은 `-javaagent`를 따로 넣어야 하므로, 서버 JVM 다수는 자동 적용 범위 밖일 수 있다(해석). 적재 전에 시작된 user manager는 다시 시작할 때까지 자신이 띄우는 JVM에 에이전트를 넘기지 않는다. 문서 사이트의 예시(Live patch a kernel and a JVM)도 재부팅과 커널, JDK의 재시작 없이라고 소개하면서 Java 쪽은 적재 뒤에 새로 시작하는 JVM에 에이전트가 실리는 것을 보인다. 발표 글의 시험에서 실행 중인 Elasticsearch 프로세스에 어떻게 붙였는지는 이 문서가 읽은 자료(발표 글 둘, README, FAQ, 개념 문서, Java upatch 문서, 예시, 위협 모델)에서 찾지 못했다. 같은 문서는 이 옵션 파일이 봉인되지 않아 root나 JVM을 시작하는 사용자가 에이전트 없이 JVM을 띄울 수 있고, Java upatch는 커널이 강제하는 경계가 아니라 애플리케이션 안의 완화라고 밝힌다. 발표 글은 보안팀이 적용 전에 완화가 애플리케이션에 줄 영향을 관찰하고 운영자가 승인한 뒤 배포한다고 적지만, 같은 날 확인한 upatch 개념 문서에서는 관찰 전용 모드를 찾지 못했다. FAQ는 upatch가 수정된 커널로 바꿀 때까지의 시간을 메울 뿐 커널 업데이트를 대신하지 않는다고 답한다.

## 커널 안에서 도는 완화는 출처부터 검증한다

커널에 코드를 넣는 통로는 공격자에게도 통로가 되므로, 완화를 빠르게 넣는 체계일수록 누가 무엇을 넣었는지를 커널과 하드웨어가 확인하게 해야 한다(해석). Shirudo 문서(2026-11-25)는 이 확인이 어디서 멈추는지 적는다.

- **서명은 출처이지 정확성이 아니다.** 서명은 누가 upatch를 빌드했는지 보여 줄 뿐 그 upatch가 맞다는 뜻이 아니며, 위협 모델도 Shirudo가 확립하는 것은 출처이지 정확성이 아니라고 적는다. 개념 문서는 대상과 같은 커널에서 시험한 뒤 내보내라고 권한다. 서명된 보안 도구에도 취약점이 있을 수 있다는 같은 원리는 [[Supply-Chain-Security#보안 도구의 커널 드라이버도 검토 대상이다|보안 도구의 커널 드라이버]]에 있다.
- **믿고 들어가는 전제:** 커널, 부팅 체인, TPM과 운영자 장비는 신뢰한다고 가정한다. `init`이 실행되기 전에는 아무것도 강제되지 않고, `init`이 실패하면 보호 없이 부팅이 이어진다.
- **남는 위험:** 그 키로 한 번이라도 서명한 로더는 계속 통과하고, 키 폐기는 서명된 설정 이미지로 한다. 레지스트리가 예전에 서명된 색인을 다시 내줄 수 있고, 차단 계수기가 0이어도 시도가 없었다는 뜻은 아니다. Java upatch의 검증은 커널이 아니라 사용자 공간에서 돈다. 위협 모델은 닫지 못한 틈도 따로 적는다. 증명 검증 명령은 고정할 키나 기대 상태를 주지 않으면 값을 보고만 하고 검사하지 않으며, 저장소 색인과 트리 서명은 인증서가 ML-DSA-87인지 확인하는 단계가 없어 다른 알고리즘도 통과할 수 있다(뒤의 것은 코드 경로를 읽은 결과이고 재현하지 않았다고 문서가 밝힌다).

서명 키를 가진 사람은 대상 커널에 코드를 넣을 수 있는 사람이다. 키 보관과 서명 승인은 [[HSM-Key-Custody|HSM과 서명 키 관리]]와 같은 수준으로 다룬다(적용 제안).

## AI가 만든 완화를 내보내기 전에

Isovalent 글은 에이전트가 재현 코드를 쓰고 악용을 검증한 뒤 완화 지점을 고르고 수정을 검증하는 일을 성공할 때까지 반복하며, 배포한 완화의 적중 횟수를 악용 시도의 기록으로 본다고 설명한다. 사람이 승인할 때는 다음을 확인한다(운영 제안).

1. 완화 전에는 재현 코드가 성공하고 완화 뒤에는 실패하는가. 같은 결함에 닿는 다른 입력 경로와 인코딩도 시험했는가.
2. 정상 요청과 기존 테스트를 완화를 켠 상태로 돌려 회귀가 없는가.
3. 실제로 적용된 대상이 어디인가. 재시작해야 적용되는 완화라면 실행 중인 프로세스가 그것을 갖고 있는지 확인했는가. 업데이트의 완료를 실행 중인 워커로 확인하는 원리는 [[Vulnerability-Operations-AI-Agents#사례: nginx HTTP/2와 nginx2root|nginx 사례]]와 같다.
4. 완화마다 대상 CVE, 본 패치 버전과 제거 조건을 기록했는가. 본 패치를 적용하면 완화를 걷어 낸다.
5. 적중 기록을 침해 조사로 이어 가는 경로가 있는가.

에이전트에게 방어 조치를 맡길 때의 권한 경계는 [[AI-Accelerated-Threat-Defense#AI에게 방어를 맡길 때의 권한 경계|AI 방어 자동화의 권한 경계]]를 따른다.

## 점검 질문

- 지금 쓰는 임시 완화는 앞단, 커널, 프로세스 중 어디에 있고, 그 위치가 보지 못하는 입력 경로는 무엇인가?
- 완화 코드를 대상 호스트에 넣을 수 있는 키와 경로를 누가 쥐고 있으며, 지금 무엇이 적재돼 있는지 증명할 수 있는가?
- 이미 쓰는 eBPF 도구(Cilium, Falco 등)가 같은 호스트에서 함께 돌 수 있는가?
- 완화의 만료와 제거를 본 패치 일정에 묶어 두었는가?

## 출처

- [OpenAI and Cisco introduce Shirudo — OpenAI](https://openai.com/index/introducing-shirudo/) — 2026-11-23 게시, 2026-11-25 대조. 목적, 적용 전 영향 관찰과 운영자 승인, 서명과 TPM 기록, Java4Shell 통제 시험
- [Cisco and OpenAI introduce Shirudo — Isovalent](https://isovalent.com/blog/post/cisco-openai-shirudo/) — 2026-11-23 게시, 2026-11-25 대조. Tetragon과의 관계, 운영자와 대상 구조, 완화 유형과 수명주기, Java4Shell 시험 로그
- [shirudo — GitHub, shirudo-dev/shirudo](https://github.com/shirudo-dev/shirudo) — 2026-11-25 README. pre-release 상태, 커널과 TPM 요구, 부팅 시 강제, 서명 로더와 봉인 키링, TPM 측정, 라이선스
- [shirudo Documentation, FAQ](https://docs.shirudo.dev/start/faq.html) — 2026-11-25 대조. 안정 릴리스 없음, 다른 BPF 도구와의 공존, 커널 업데이트를 대신하지 않음, TPM 필수
- [shirudo Documentation, upatch concepts](https://docs.shirudo.dev/upatches/learn/concepts.html) — 2026-11-25 대조. 서명 로더만 허용, 부착 지점 종류, 서명의 의미와 시험 권고
- [shirudo Documentation, Java agent upatches](https://docs.shirudo.dev/upatches/write/java-agents.html) — 2026-11-25 대조. 옵션 파일과 user manager를 거친 JVM 시작 시 적재, 그 밖의 JVM에 필요한 수동 설정, 봉인되지 않은 옵션 파일과 애플리케이션 안 완화의 한계
- [shirudo Documentation, Threat model](https://docs.shirudo.dev/security/threat-model.html) — 2026-11-25 대조. 신뢰 가정, 잔여 위험과 미해결 항목. 처음에는 앞부분만 읽었고 같은 날 뒷부분(잔여 위험 R9 이후와 미해결 항목)을 원문으로 다시 확인했다
- [shirudo Documentation, Live patch a kernel and a JVM](https://docs.shirudo.dev/start/guides/live-patching.html) — 2026-11-25 대조. 적재 뒤 새로 시작한 JVM에 에이전트가 실리는 예시
- OpenAI와 Cisco, 실행 중인 Linux 시스템을 보호하는 오픈소스 런타임 Shirudo 공개 — GeekNews, 2026-11-24 제공 요약. 학습 계기이며 글 주소는 확인하지 못함

## 관련 문서

- [[Security-as-Enabler|가능하게 하는 보안]] — 가상 패치의 정의, 로그 전용 시험과 본 패치의 단계 배포
- [[Linux-Kernel-CVE-Patching|리눅스 커널 보안 업데이트]] — livepatch와 완화의 범위
- [[JVM-JIT-and-AOT-Cache-Intrinsics|HotSpot intrinsic의 메모리 안전 경계와 Java4Shell]] — 시험 대상 취약점과 JVM 플래그 완화
- [[K8s-Falco-Runtime-Security|Falco 런타임 보안]] — eBPF 기반 탐지
- [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격에 대비하는 방어]] — 패치 작성과 적용 사이의 병목
- [[Memory-Safety-Vulnerabilities|메모리 안전성 취약점]] — 설정 완화와 업데이트의 구분
- [[보안(Security)|보안 인덱스]]
