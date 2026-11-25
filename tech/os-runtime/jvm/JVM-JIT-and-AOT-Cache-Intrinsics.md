---
tags: [runtime, jvm, java, intrinsic, security, memory-safety, vulnerability]
status: done
verified_at: 2026-11-18
category: "OS&런타임(OS&Runtime)"
aliases: ["HotSpot Intrinsic", "HotSpot intrinsic 메모리 안전", "Java4Shell", "CVE-2026-114938"]
---

# HotSpot intrinsic의 메모리 안전 경계와 Java4Shell

HotSpot은 일부 JDK 메서드를 CPU 명령 집합별 기계어 루틴으로 바꿔 실행한다. 이 루틴은 자바의 범위 검사 밖에서 돌므로 성능 최적화가 아니라 메모리 안전의 경계로 본다. C2의 추측 최적화, AOT 캐시와 CRaC는 [[JVM-JIT-and-AOT-Cache|HotSpot JIT 최적화와 AOT 캐시]]에서 다룬다.

## intrinsic은 자바의 메모리 안전 보장 밖에서 돈다

HotSpot은 `java.util.Base64` 같은 일부 JDK 메서드를 바이트코드 대신 CPU 명령 집합별로 손으로 작성한 기계어 루틴(intrinsic)으로 실행한다. 자바 코드의 배열 범위 검사는 이 루틴 안까지 미치지 않으므로 루틴의 계산이 틀리면 자바 프로그램에서도 C 코드와 같은 메모리 오류가 난다. 어느 루틴을 쓸지는 CPU 기능과 VM 플래그가 정한다. OpenJDK 소스(2026-11-18 master 기준)에서 x86은 `UseAVX`가 2 이상이면 `UseBASE64Intrinsics`를 기본으로 켜고, x86 전용 플래그인 `UseAVX`(기본 3, 범위 0~3)가 3보다 작으면 AVX-512 기능을 끈다.

## 사례: Java4Shell

2026-11-17 공개된 Java4Shell(CVE-2026-114938)이 이 경계에서 나왔다. 아래는 발견자 Calif의 공개 글, Oracle이 CNA로 등록한 CVE 레코드, 같은 날 나온 Oracle과 OpenJDK의 보안 권고(2026-11-21 대조)와 CISA 경보 기준이며 공격을 재현할 정보는 옮기지 않는다.

| 항목 | 내용 |
|---|---|
| 원인 | AVX-512 VBMI를 쓰는 x86-64 Base64 디코드 intrinsic이 패딩으로 끝나는 잘못된 입력에서 출력 길이를 음수로 계산하고, 그 길이가 64바이트 쓰기 한 번으로 이어져 할당한 배열 끝 뒤 62바이트까지 힙을 덮어쓴다(Calif). CISA ADP의 분류는 CWE-122(힙 버퍼 오버플로)다. 루틴이 먼저 메모리를 쓴 뒤 자바 코드가 그 입력을 `IllegalArgumentException`으로 거부하므로, 예외가 났을 때는 인접 객체가 이미 손상됐을 수 있다(Calif) |
| 점수 | Oracle의 CVSS 3.1 기본 점수 8.1(공격 복잡도 높음, 인증 없는 네트워크 공격). 구성요소는 Oracle 권고가 Compiler, OpenJDK 권고가 hotspot/compiler로 적는다. Calif가 따로 매긴 CVSS 4.0 점수는 9.2다. CVE 레코드의 CISA SSVC 평가는 2026-11-18과 11-21 조회 모두 악용 관측 없음이었다 |
| 영향 범위 | CVE 레코드와 Oracle 권고는 Oracle Java SE 8u511b33-perf, 17.0.21.0.3, 21.0.13.0.3, 25.0.5.0.3, 27.0.1.0.3과 GraalVM 일부 버전을 영향 버전으로 적는다. Java SE 8은 `8u511b33-perf`만 이 CVE에 들고, 같은 권고의 다른 CVE는 일반 8u511b33도 적는다. OpenJDK 권고의 위험 행렬은 이 CVE를 17, 21, 25, 27 계열에만 표시하고 8과 11에는 표시하지 않는다. Calif는 OpenJDK 17.0.6 이후와 이를 바탕으로 한 배포판을 영향 대상으로, ARM64는 비대상으로 본다 |
| 수정 | Oracle은 2026-11 Critical Security Patch Update(2026-11-17 Rev 1)로, OpenJDK는 같은 날 취약점 권고로 고쳤다. Oracle의 Critical Security Patch Update는 분기별 Critical Patch Update를 보완하는 월간 프로그램이고 Premier Support나 Extended Support 단계의 버전에만 패치를 낸다. 배포판마다 일정이 다르며 Amazon Corretto는 27.0.1.1.4(2026-11-17) 변경 기록에서 이 CVE를 다룬다 |

- **노출은 JDK 버전과 CPU 기능이 함께 정한다.** Calif는 Linux에서 `/proc/cpuinfo`에 `avx512f`, `avx512bw`, `avx512vbmi`, `bmi2`가 모두 있는지로 해당 장비를 가리라고 안내한다. 노드 세대가 섞인 클러스터는 [[JVM-JIT-and-AOT-Cache#기동과 워밍업을 앞당기는 AOT 캐시|AOT 캐시의 기계어]]와 [[JVM-JIT-and-AOT-Cache#워밍업이 끝난 프로세스를 저장하는 CRaC|CRaC]]처럼 노드 풀마다 판정이 달라진다(해석). 패치 전 완화로 Calif는 `-XX:-UseBASE64Intrinsics`와 `-XX:UseAVX=2`를 들고, `UseAVX`는 ARM JVM이 모르는 옵션이라 그대로 주면 기동하지 못한다고 경고한다. 두 플래그는 CVE 레코드, Oracle과 OpenJDK 권고, CISA 경보에 없는 발견자의 제안이고, AVX-512를 통째로 끄면 다른 intrinsic과 벡터화 성능도 함께 낮아질 수 있다(해석).
- **JDK는 재고에서 보이지 않을 수 있다.** CISA는 서드파티 애플리케이션, 컨테이너 이미지와 장비에 번들된 JDK가 소프트웨어 재고에 별도 항목으로 나타나지 않을 수 있다며 내장 설치까지 찾고 인터넷에 노출된 시스템부터 패치하라고 권한다. 즉시 패치할 수 없으면 애플리케이션 경계의 Base64 입력 검증, 입력 크기 제한과 인증 없는 접근 제한을 보완 통제로, 예상 밖 JVM 충돌과 의심스러운 Java 프로세스를 침해 신호로 든다. 경계 검증이 디코더에 닿는 모든 경로를 덮는다는 보장은 없으므로 업데이트를 대신하지 않는다(해석). 애플리케이션 의존성 스캔은 런타임 자체를 보지 않으므로 런타임 버전은 [[Dependency-Vulnerability-Scanning#언어 런타임은 버전 관리와 호스팅 책임으로 대응한다|언어 런타임 절]]처럼 따로 관리한다. 메모리 안전 언어가 보장하지 못하는 범위는 [[Memory-Safety-Vulnerabilities#결함을 줄이는 층: 언어, 퍼징, 코드 분석|메모리 안전성 취약점]]에 있다.

## 확인 질문

- JDK 보안 권고의 영향을 판단할 때 JDK 버전과 함께 노드의 CPU 기능(AVX-512)과 intrinsic 플래그를 확인했는가?
- 컨테이너 이미지와 서드파티 제품에 번들된 JDK까지 찾아 영향 계열(17, 21, 25, 27)과 공급사별 수정 버전을 대조했는가?
- 패치 전 보완 통제로 둔 입력 검증과 크기 제한이 디코더에 닿는 모든 경로를 덮는지, 업데이트 일정은 따로 잡았는가?

## 출처

- [Java4Shell: Write once, RCE everywhere — Calif](https://calif.io/java4shell/) — 2026-11-17 게시. 원인 분류, 영향 CPU와 배포판, 임시 완화 플래그. 2026-11-21 배열 밖 62바이트 덮어쓰기 대조. 공격 재현 정보는 옮기지 않았다
- [CVE Program, CVE-2026-114938](https://www.cve.org/CVERecord?id=CVE-2026-114938) — 2026-11-18 CVE API 레코드로 CNA Oracle의 영향 버전과 CVSS 3.1 벡터, CISA ADP의 CWE-122와 SSVC 대조. 2026-11-21 재조회에서 영향 버전, 점수, CWE와 SSVC 값이 바뀌지 않았음을 확인
- [Oracle, Critical Security Patch Update Advisory - November 2026](https://www.oracle.com/security-alerts/cspunov2026.html) — 2026-11-17 Rev 1. 2026-11-21 Java SE 위험 행렬의 영향 버전, 구성요소, 점수와 공격 조건 주석, 프로그램 주기와 지원 단계 조건, 보고자 대조
- [OpenJDK, OpenJDK Vulnerability Advisory: 2026/11/17](https://openjdk.org/groups/vulnerability/advisories/2026-11-17) — 2026-11-21 릴리스별 영향 버전과 이 CVE가 표시된 계열(17, 21, 25, 27) 대조
- [Java4Shell: OpenJDK Base64 디코더에서 인증 없는 원격 코드 실행 취약점 발견 (CVE-2026-114938) — GeekNews](https://news.hada.io/topic?id=37370) — 2026-11-18 소개 글, 계기 자료. 사실은 위 1차 출처로 대조했다
- [Critical Java Vulnerability Requires Immediate Patching — CISA](https://www.cisa.gov/news-events/alerts/2026/11/17/critical-java-vulnerability-requires-immediate-patching) — 2026-11-17 게시. 번들 JDK 재고, 보완 통제와 침해 신호
- [CHANGELOG.md — GitHub, corretto/corretto-27](https://github.com/corretto/corretto-27/blob/27.0.1.1.4/CHANGELOG.md) — 27.0.1.1.4(2026-11-17)의 CVE-2026-114938 항목
- [vm_version_x86.cpp — GitHub, openjdk/jdk](https://github.com/openjdk/jdk/blob/master/src/hotspot/cpu/x86/vm_version_x86.cpp) — 2026-11-18 master. `UseBASE64Intrinsics` 활성 조건과 `UseAVX` 3 미만의 AVX-512 기능 해제
- [globals_x86.hpp — GitHub, openjdk/jdk](https://github.com/openjdk/jdk/blob/master/src/hotspot/cpu/x86/globals_x86.hpp) — 2026-11-18 master. x86 전용 `UseAVX` 선언, 기본값 3과 범위 0~3

## 관련 문서

- [[JVM-JIT-and-AOT-Cache|HotSpot JIT 최적화와 AOT 캐시]] — C2 최적화, AOT 캐시와 CRaC의 CPU 기능 조건
- [[Memory-Safety-Vulnerabilities|메모리 안전성 취약점]] — 메모리 안전 언어가 보장하지 못하는 범위
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]] — 언어 런타임의 버전 관리
- [[JVM-Architecture|JVM 아키텍처]] — 실행 엔진의 구성
- [[Runtime-Virtual-Patching|런타임 가상 패치]] — Java4Shell에 시험한 Base64 디코더 입력 검사 완화와 Java 에이전트의 로드 시점
