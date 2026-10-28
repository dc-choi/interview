---
tags: [openbsd, os, virtualization, security, compatibility]
status: done
verified_at: 2026-10-27
category: "OS&런타임(OS&Runtime)"
aliases: ["OpenBSD", "OpenBSD Platform", "OpenBSD 8.0"]
---

# OpenBSD: 보안 우선 설계와 호환성의 경계

OpenBSD는 기본 설정의 보안을 앞세우는 BSD 계열 운영체제다. 보안을 위해 일부러 막아 둔 기능이 다른 소프트웨어의 이식 범위를 정하기도 하므로, 무엇이 되는지와 함께 무엇이 의도적으로 안 되는지를 본다. 아래는 2026-10-20 출시된 8.0 기준이다.

## 8.0의 플랫폼 변화

| 영역 | 변화 |
|---|---|
| 가상화(vmm, vmd) | guest VM당 최대 64 vCPU의 MP 지원, guest의 x2APIC 모드, virtio 장치의 MSI/MSI-X 인터럽트 |
| arm64 | 최대 절전(hibernate) 지원 |
| amd64 | 커널 가상 주소 공간을 4G에서 512G로 확대 |
| 도구 체인 | LLVM/Clang 22.1.6(패치 포함). Clang 22로 동작하지 않는 loongson 아키텍처 지원 종료 |
| 보안 구성 요소 | OpenSSH 10.6과 LibreSSL 4.4.0. ssh(1)에 ML-DSA-44와 Ed25519를 묶은 하이브리드 서명 `ssh-mldsa44-ed25519`의 실험적 지원 |

SSH에 양자 내성 알고리즘이 들어온 순서와 기본 목록의 확인 방법은 [[Application-Layer-Protocols#양자 내성 알고리즘은 키 교환부터 들어왔다|SSH 절]]에서 다룬다.

## 프로그램이 스스로 권한을 줄이는 구조

OpenBSD는 프로그램이 `pledge()`로 쓸 하위 시스템을 선언하고 `unveil()`로 볼 파일 경로를 허용 목록으로 좁히게 한다. 선언 밖의 하위 시스템을 쓰면 대부분 잡을 수 없는 `SIGABRT`로 종료된다. Linux의 루트 디렉터리 격리와의 비교는 [[Linux-Root-Directory-Isolation|루트 디렉터리 격리]]에 둔다.

## Wine 이식 초안과 보안 제약

2026-10-18 openbsd-ports 메일링 리스트에 Windows 호환 계층 Wine의 새 port(`emulators/wine`) 초안이 올라왔다. 검토와 시험을 요청한 단계이며 2026-10-27 기준 커밋 여부는 확인하지 않았다.

- 64비트 Windows 프로그램 수십 개를 시험해 대부분 동작했다고 보고됐다. 일부 게임은 vkd3d-proton을 더해야 한다.
- WoW64가 동작하지 않아 32비트 Windows 프로그램은 실행되지 않는다. 실행 파일이 32비트인지 `file(1)`로 먼저 확인하라고 안내한다.
- 시스템이 gsbase 설정을 허용하지 않아 `%gs` 접두사가 붙은 명령을 소프트웨어로 흉내 내는 우회를 넣었다.
- Wine 자체 테스트는 X 서버 접근이 필요하고 일부가 멈춰 비활성화했다.
- Windows 프로그램 실행은 사용자 책임이며 권한 없는 별도 계정을 쓰라고 권하고, `unveil(2)`로 가두는 방법을 검토하고 있다.

보안을 위해 막아 둔 기능(여기서는 gsbase 설정)이 호환 계층의 구현 방식과 지원 범위를 정하는 사례다. 32비트 지원이 막힌 구체적 원인은 포트 초안에 설명돼 있지 않아 추정하지 않는다.

## 확인 질문

- 실행하려는 Windows 프로그램은 64비트인가
- vmm guest에 필요한 vCPU 수와 virtio 장치가 8.0 지원 범위 안인가
- 이전 OpenSSH 실험 구현으로 만든 양자 내성 서명 키가 남아 있는가

## 출처

- [OpenBSD 8.0 — OpenBSD](https://www.openbsd.org/80.html) — 2026-10-27 가상화, arm64, amd64, 도구 체인과 OpenSSH 항목 대조
- [emulators/wine — openbsd-ports, Thomas Frohwein](https://marc.info/?l=openbsd-ports&m=179236125692175&w=2)
- [Wine ported to OpenBSD, runs modern Windows games — OSnews](https://www.osnews.com/story/146195/wine-ported-to-openbsd-runs-modern-windows-games/)
- [OpenBSD manual pages, pledge(2)](https://man.openbsd.org/pledge), [unveil(2)](https://man.openbsd.org/unveil)
- [OpenBSD 8.0 출시 - 가상 머신당 최대 64 vCPU와 arm64 최대 절전 모드 지원 — GeekNews](https://news.hada.io/topic?id=35692)
- [Wine의 OpenBSD 이식판 공개 - 64비트 Windows 앱과 게임 실행 — GeekNews](https://news.hada.io/topic?id=35645)

## 관련 문서

- [[Linux-Root-Directory-Isolation|루트 디렉터리 격리]]
- [[Application-Layer-Protocols|DHCP, 원격 접속, 파일과 메일 프로토콜]]
- [[OS&런타임(OS&Runtime)|OS&런타임 인덱스]]
