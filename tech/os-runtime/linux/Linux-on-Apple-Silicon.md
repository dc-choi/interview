---
tags: [linux, apple-silicon, asahi, boot, dual-boot, omarchy, arm64]
status: done
verified_at: 2026-11-09
category: "OS&런타임(OS&Runtime)"
aliases: ["Linux on Apple Silicon", "Apple Silicon Linux", "애플 실리콘 리눅스", "Asahi Linux", "Omarchy Mac"]
---

# Apple Silicon Mac에서 Linux 실행: 부트 정책, 지원 범위와 설치 위험

Apple Silicon Mac에는 자체 UEFI가 없다. 이 Mac에서 Linux를 돌리려면 Asahi Linux 프로젝트가 만든 부트 단계와 드라이버가 필요하고, 배포판은 그 위에 사용자 공간과 설치기를 얹고, 필요하면 커널을 따로 패치한다. 새 칩이 나올 때마다 macOS의 동작을 추적해 디스플레이, GPU, 오디오와 무선 장치를 다시 살려야 하므로 지원은 최신 기종일수록 늦다. 설치기가 기종을 받아 준다는 사실과 그 기종에서 외부 모니터나 대기 전환이 실제로 동작한다는 사실은 따로 확인한다. 부트 체인, 드라이버와 보안 모델을 계층별로 보는 관점은 [[Mobile-OS-Porting|모바일 OS 이식]]과 같다.

## 부트 정책은 OS마다 따로 둔다

- **OS별 정책:** Apple Platform Security 문서는 Apple Silicon Mac의 보안 정책을 설치된 OS마다 따로 둔다고 설명한다. 같은 Mac에 보안 수준이 다른 OS를 함께 둘 수 있는 근거다.
- **물리적 확인:** 보안을 크게 낮추는 변경은 전원 버튼을 길게 눌러 들어간 recoveryOS에서만 할 수 있다. 악성코드가 이 신호를 만들 수 없고 물리적으로 접근한 사람만 할 수 있게 하려는 설계다. Asahi 문서는 이 상태(1TR)에서 Machine Owner 자격 증명, 즉 그 Mac에서 처음 만든 macOS 계정으로 인증해야 부트 정책을 바꿀 수 있다고 설명한다. Apple 배포 가이드 기준으로는 처음 Mac을 설정한 사용자 외에 이후 secure token을 받은 사용자도 볼륨 소유자가 될 수 있고, 시동 보안 설정을 바꾸려면 관리자이면서 볼륨 소유자여야 한다.
- **Linux용 컨테이너:** Asahi 방식의 설치기는 macOS로 인식되는 작은 APFS 컨테이너를 만들고, Apple 도구로 그 컨테이너만 Permissive Security로 낮춘 뒤 m1n1을 부트 오브젝트로 등록한다. Asahi는 다른 OS 볼륨의 보안 설정을 바꾸지 않는다고 밝힌다. Apple 문서에 따르면 Permissive Security에서도 부트 체인 전체의 서명 검증은 계속되고, 신뢰하지 않는 OS가 로드되면 일부 복호화 키를 쓸 수 없게 해 그 OS가 신뢰하는 OS의 데이터에 접근하지 못하게 한다.
- **부팅 순서:** Omarchy Mac 매뉴얼 기준으로 iBoot(Apple 펌웨어, recoveryOS에서 정한 부트 정책 집행), m1n1(펌웨어가 남긴 하드웨어 초기화와 device tree 전달), U-Boot(Apple Silicon용 UEFI 구현), 부트로더 Limine, 커널과 initramfs, 루트 파일 시스템 순으로 올라간다. 부팅할 OS는 Mac을 켤 때 전원 버튼을 누르고 있다가 고른다.

## 지원 범위는 칩과 기능 단위로 본다

2026-11-09 확인한 Asahi 문서 기준이다.

| 범위 | 상태 |
|---|---|
| M1, M2 계열 | Fedora Asahi Remix(Fedora Linux 45 기반)는 모든 M1, M2 MacBook, Mac mini, Mac Pro, Mac Studio, iMac을 지원한다고 밝히지만, Asahi M2 기능 표는 Mac Pro(2023)의 설치기를 개발 중(WIP)으로 표시한다. 노트북 표에서 USB-C 외부 디스플레이, Thunderbolt/USB4와 Touch ID는 미지원이고, ProMotion(VRR)과 HDR도 아직 지원하지 않는다 |
| M3 계열 | Fedora Asahi Remix는 M3, M3 Pro, M3 Max에 초기 지원을 제공한다. 기능 표에서 디스플레이 컨트롤러(DCP), Thunderbolt와 DP Alt Mode는 개발 중(WIP)이다. GPU는 M3가 개발 중이고 M3 Pro와 M3 Max는 현재 진행 중인 작업이 없다(TBA). M3 Ultra Mac Studio는 미지원이다 |
| M4 계열과 A18 Pro | 디스플레이 컨트롤러, USB와 Thunderbolt가 TBA다. A18 Pro를 쓰는 MacBook Neo(2026)는 설치기 지원이 no이고 키보드, 트랙패드와 Wi-Fi가 TBA다 |

Asahi 기능 표는 Asahi 커널과 Fedora Asahi Remix 기준이다. 배포판이 자체 커널이나 패치로 더 많은 기능을 켤 수 있으므로 배포판 문서와 Asahi 표를 함께 보고, 차이는 그 배포판의 자기 보고로 읽는다.

## 사례: Omarchy의 Mac 설치기 (2026-11 기준)

Omarchy는 Arch Linux, 타일링 창 관리자 Hyprland와 데스크톱 구성 도구 Quickshell을 묶은 DHH의 배포판이다. 4.5(릴리스 노트 2026-11-04, GitHub 정식 태그 2026-11-05)에서 macOS 앱 형태의 Mac 설치기를 내놓았다. 같은 릴리스에는 첫 ARM ISO(NVIDIA DGX Spark와 N1X 노트북의 예비 지원), 미리 만든 루트 이미지를 풀고 그 기기의 패키지만 더하는 설치 방식(설치 시간을 약 절반으로 줄였다고 밝힘), 50개 언어 UI와 일본어(Mozc), 한국어(Hangul), 중국어 간체(Pinyin), 대만(Zhuyin), 홍콩(Cangjie) 입력기 설정이 함께 들어갔다. 작업 공간별 배치 방식은 [[Desktop-Window-Management|데스크톱 창 관리]]에서 다룬다.

### 설치기가 하는 일

2026-11-09 확인한 설치기 README 기준이다. 직접 설치하지 않았다.

1. **점검:** macOS 15 이상과 관리자 계정이 필요하다. 기종, macOS 버전, 전원, FileVault 상태와 여유 공간을 확인하고, 서명된 카탈로그에 없는 기종은 디스크를 건드리기 전에 멈춘다.
2. **계획:** 채널(stable, rc, edge)의 Ed25519 서명 카탈로그를 검증하고, 카탈로그가 고정한 엔진과 이미지를 크기와 SHA-256으로 확인한 뒤 디스크 배분을 보여 준다. macOS에 약 38GB의 여유를 남기도록 권하고, 백업 확인란에 체크해야 설치 버튼이 열린다. 로컬 Time Machine 스냅샷은 같은 디스크의 복원 지점이라 백업이 아니라고 적는다.
3. **설치:** SMJobBless로 등록한 root 헬퍼가 고정된 Asahi 기반 엔진을 실행해 macOS의 APFS 컨테이너를 줄이고, 부트 파일(stub와 EFI)을 쓰고 시작 권한 단계(authorizing startup)를 거쳐 Omarchy를 설치한다. 앱과 헬퍼는 서로의 코드 서명을 확인하고, 파괴적 단계는 디스크 배치의 digest에 묶인 계획으로만 실행된다.
4. **마무리:** Mac을 끄고 시동 옵션을 불러오는 표시가 나올 때까지 전원 버튼을 길게 눌러 Omarchy를 고르고 계속을 누른 뒤 macOS 계정으로 로그인하면, Omarchy의 Recovery 앱이 시작 소프트웨어를 설치하고 등록한다. 첫 부팅에서 정한 비밀번호로 디스크를 암호화한다.

설치기는 명령줄 스크립트가 아니라 앱이며 `curl | sh` 경로가 없다고 밝힌다. Homebrew로는 `brew install omacom/mac/omarchy`가 설치기 앱을 받는다. README는 모든 설치기 릴리스를 GitHub pre-release로 올리고 2.3.15를 현재 공증된 앱으로 적는다. cask가 받는 2.3.16도 릴리스 노트가 공증 앱으로 적고, 2026-11-09 그 dmg를 `xcrun stapler`와 `spctl`로 검사했을 때 Notarized Developer ID로 통과했다. 서명 주체는 Omarchy 조직이 아니라 개인 개발자 ID이며, Mac 매뉴얼은 서명 신원과 카탈로그 호스팅을 Omarchy 쪽으로 옮기는 일을 이후 작업으로 둔다. 이 cask는 설치 직후 앱을 열려고 임의 Ruby인 기존 `postflight` 블록을 쓰므로 Homebrew가 deprecation 경고를 내고, README는 이를 예상된 경고로 적는다. 탭 신뢰의 범위는 [[Supply-Chain-Security#서드파티 탭과 macOS 실행 검사|서드파티 탭과 macOS 실행 검사]]를 따른다. 제거는 앱의 Remove Omarchy 기능이 맡아 Omarchy 파티션을 지우고 macOS 컨테이너를 다시 늘린다. 다만 설치기 README와 Removal 개발 문서(2026-11-06 수정)는 이 제거 기능을 실제 Mac에서 실행하지 않았다고 적는다. `brew uninstall --zap`은 앱, 헬퍼와 지원 파일만 지우고 디스크의 Omarchy는 남긴다.

### 지원 표시는 문서마다 다르다

- **4.5 릴리스 노트:** M1, M2, M3, Neo MacBook에 네이티브로 설치할 수 있고 M4, M5, M6을 작업 중이라고 적는다.
- **설치기 README:** 서명된 카탈로그가 M1, M2, M3 계열과 MacBook Neo(`apple,j700`)의 보드 35개를 이미지 하나로 받아 준다. 그중 M3 기종과 MacBook Neo는 미시험으로 표시하고, edge 채널에서 실제 하드웨어로 검증한다고 적는다. M3 Ultra Mac Studio와 M4 이후는 받지 않으며, MacBook Neo는 펌웨어 26.6.2에서만 검증된 것으로 기록한다.
- **Mac 매뉴얼:** 첫 릴리스를 MacBook Pro 14형 M1 Pro와 16형 M2 Max에서 검증했다고 적고, M1과 M2만 지원하며 M3, M4는 지원하지 않는다고 적는다. M3 Air는 edge 시험자를 위해 내장 디스플레이와 GPU를 기본 설정으로 켜지만 USB-C와 DisplayPort 외부 디스플레이는 꺼져 있다.

같은 프로젝트 안에서도 설치 가능, 미시험, 지원의 경계가 다르다. 일상 장비로 쓸지는 프로젝트가 실제 하드웨어로 검증했다고 밝힌 기종(M1 Pro, M2 Max 기준기)과 Asahi 기능 표를 기준으로 판단한다(이 문서의 판단). MacBook Neo는 Asahi 문서가 설치기 미지원으로 표시하는 기종이므로 이 기종에서의 동작은 Omarchy 쪽 자기 보고다.

### Asahi 위에 더한 것과 알려진 한계

Mac 매뉴얼의 자기 보고이며 직접 시험하지 않았다.

- **커널:** 모든 Mac이 Asahi 커널 대신 Aurora 커널(`linux-aurora`)을 쓴다. 매뉴얼은 이 커널로 USB4와 DisplayPort Alt Mode 외부 디스플레이, 가변 주사율과 카메라가 동작한다고 적는다. USB-C(USB4, DP Alt Mode) 외부 디스플레이와 가변 주사율은 위 Asahi 표에서 미지원이거나 개발 중인 항목이다(HDMI 포트가 있는 M1, M2 기종의 HDMI 출력은 Asahi도 지원한다).
- **동작 한계:** 내장 키보드와 트랙패드로는 대기 상태에서 깨어나지 않아 덮개를 열거나 전원 버튼을 눌러야 한다. Apple GPU에 지원되는 하드웨어 영상 인코더가 없어 화면 녹화는 CPU로 인코딩하고, 하드웨어 영상 디코딩은 진행 중이다. Wi-Fi 6E Mac은 6GHz에 접속해도 트래픽이 흐르지 않는다. Steam은 FEX를 거쳐 선택 설치한다.
- **디스크 암호화:** 첫 부팅 때 루트를 제자리에서 LUKS로 변환하고, 비밀번호 하나가 디스크, 사용자 계정과 root를 함께 연다. 별도 복구 키가 없어 비밀번호를 잊으면 다시 설치해야 한다.
- **Touch ID:** 설정 메뉴에 실험 기능으로 있고, 상태 페이지는 첫 릴리스 범위 밖으로 둔다. 켜면 Linux와 macOS가 Secure Enclave의 앞으로만 진행하는 재전송 방지 상태를 공유한다. 버그로 이 상태를 잘못 쓰면 FileVault를 켠 macOS는 디스크를 열지 못해 시작하지 않고 Mac을 지우는 DFU 복원이 필요하며, FileVault를 끈 macOS는 키체인과 Touch ID 지문을 초기화한다. 매뉴얼은 켜기 전에 macOS 파티션의 데이터를 백업하라고 한다.

## 설치하지 않고 시험하기

Try Omarchy는 Apple의 Hypervisor framework 위 가상 머신에서 공식 aarch64 Omarchy를 그대로 돌리는 Mac 앱이다(2026-11-09 README). Apple Silicon Mac, macOS 15 이상과 약 15GB의 여유 공간이 필요하고 첫 실행에 약 3GB 이미지를 받는다. 영상 디코딩은 CPU로 하고 Vulkan은 쓸 수 없다. 파티션을 바꾸지 않는 대신 그 Mac의 하드웨어 드라이버를 거치지 않으므로, 데스크톱과 작업 흐름이 맞는지는 볼 수 있어도 네이티브 설치의 하드웨어 지원은 판단할 수 없다(도출).

## 점검 항목

- `sysctl hw.targettype`이 출력하는 보드 코드(예: `J413`)를 소문자로 바꾸고 `apple,`을 붙인 값(`apple,j413`)으로 설치기 카탈로그를 대조한다. `hw.model`은 `Mac14,2` 같은 모델 식별자다. Asahi 기능 표는 칩 계열과 기종 이름, 연도로 나뉘어 있으므로 칩까지 맞춰 찾는다. 같은 마케팅 이름에도 하드웨어가 다른 보드가 있을 수 있다.
- 외부 모니터, Thunderbolt 장치, Touch ID, 대기 전환과 하드웨어 영상 인코딩처럼 필요한 기능이 그 칩에서 동작한다고 표시됐는지, 실제 하드웨어로 검증한 기종인지 본다.
- 설치 전에 macOS 전체를 외부 저장소에 백업한다.
- 디스크 비밀번호를 잊으면 복구 수단이 없는 구성인지, macOS와 Secure Enclave 상태를 공유하는 기능을 켤지 미리 정한다.
- 설치기의 제거 기능과 패키지 관리자 제거가 각각 무엇을 지우는지 구분한다. 설치기의 제거 기능은 개발 문서 기준 실제 Mac에서 실행된 적이 없다(2026-11-06).

## 출처

- GeekNews 제공 발췌, 2026-11-07 Omarchy 4.5 — 원문 식별에 사용
- [Omarchy 4.5 floats, speaks 50 languages, and runs on your Mac — Omarchy News, DHH](https://omarchy.org/news/2026/11/omarchy-4-5/) — 2026-11-04. 2026-11-09 Mac 설치기, ARM ISO, 설치 방식, 언어와 입력기, 지원 기종 표시 대조
- [Omarchy v4.5.0 — omacom/omarchy GitHub Releases](https://github.com/omacom/omarchy/releases/tag/v4.5.0) — 2026-11-05 정식 태그
- [Introducing Omarchy M — Omarchy News, DHH](https://omarchy.org/news/2026/09/introducing-omarchy-m/) — 2026-09-11. Mac 팀의 목표와 macOS 추적을 통한 하드웨어 작업
- [omacom/omarchy-mac-installer — GitHub](https://github.com/omacom/omarchy-mac-installer) — 2026-11-09 README의 지원 기종, 설치 단계, 채널과 제거 대조
- [Omarchy Installer 2.3.16 — omacom/omarchy-mac-installer GitHub Releases](https://github.com/omacom/omarchy-mac-installer/releases/tag/v2.3.16) — 2026-11-06 pre-release. 2026-11-09 공증 표기, dmg sha256과 Gatekeeper 판정 확인
- [Removing an existing Omarchy installation — omacom/omarchy-mac-installer GitHub](https://github.com/omacom/omarchy-mac-installer/blob/main/Development/Removal.md) — 2026-11-06 수정. 2026-11-09 제거 기능의 실제 Mac 미실행 기록 확인
- [omacom/homebrew-mac — GitHub](https://github.com/omacom/homebrew-mac) — 2026-11-09 omarchy cask(2.3.16)의 postflight와 제거 범위 확인
- [Omarchy Mac Manual, Hardware support](https://github.com/omacom/omarchy-mac-pkgs/blob/main/mac-manual/content/12-hardware.md) — 2026-11-09 검증 기종, 동작 표와 M3 Air 상태 대조
- [Omarchy Mac Manual, Status](https://github.com/omacom/omarchy-mac-pkgs/blob/main/mac-manual/content/14-status.md) — 첫 릴리스 제외 범위와 서명 신원, 카탈로그 호스팅 이전 계획
- [Omarchy Mac Manual, Boot chain](https://github.com/omacom/omarchy-mac-pkgs/blob/main/mac-manual/content/10-boot.md) — 부팅 단계와 커널
- [Omarchy Mac Manual, Encryption and passwords](https://github.com/omacom/omarchy-mac-pkgs/blob/main/mac-manual/content/04-security.md) — LUKS 변환, 복구 키 부재와 Touch ID 위험
- [The Omarchy Manual, Welcome to Omarchy!](https://github.com/omacom/omarchy/blob/quattro/manual/01-welcome-to-omarchy.md) — Arch, Hyprland와 Quickshell 구성
- [omacom/try-omarchy — GitHub](https://github.com/omacom/try-omarchy) — 2026-11-09 README의 요구 사항과 제약
- [Apple Platform Security, Startup Disk security policy control for a Mac with Apple silicon](https://support.apple.com/guide/security/startup-disk-security-policy-control-sec7d92dc49f/web) — 2026-11-09 OS별 보안 정책, recoveryOS 진입 조건과 Permissive Security의 키 제한 대조
- [Apple Platform Deployment, Use secure token, bootstrap token, and volume ownership in deployments](https://support.apple.com/guide/deployment/use-secure-and-bootstrap-tokens-dep24dbdcf9e/web) — 2026-11-09 볼륨 소유자의 범위와 시동 보안 설정 변경 조건 대조
- [Asahi Linux Documentation, Apple Silicon Platform Security](https://asahilinux.org/docs/platform/security/) — 2026-11-09 1TR, Machine Owner 자격 증명과 Asahi 컨테이너 구성 대조
- [Asahi Linux Documentation, M2 Series Feature Support](https://asahilinux.org/docs/platform/feature-support/m2/) — 2026-11-09 Mac Pro(2023) 설치기 상태와 HDMI 출력 대조
- [Asahi Linux Documentation, M3 Series Feature Support](https://asahilinux.org/docs/platform/feature-support/m3/) — 2026-11-09 M3 기능 상태
- [Asahi Linux Documentation, M4 Series Feature Support (incl. A18 Pro)](https://asahilinux.org/docs/platform/feature-support/m4/) — 2026-11-09 M4와 MacBook Neo 상태
- [Fedora Asahi Remix, Device support](https://asahilinux.org/fedora/#device-support) — 2026-11-09 기종별 기능 표

## 관련 문서

- [[Mobile-OS-Porting|모바일 OS 이식]] — 부트 체인, 드라이버와 보안 모델의 계층별 점검
- [[Desktop-Window-Management|데스크톱 창 관리]] — Omarchy의 작업 공간별 배치 방식
- [[Supply-Chain-Security#서드파티 탭과 macOS 실행 검사|서드파티 탭과 macOS 실행 검사]] — Homebrew 탭 신뢰와 cask 설치 단계
- [[Linux-Laptop-GPU-Power-Management|Linux 노트북 GPU 전력 관리]] — x86 노트북의 Omarchy 사례와 OS별 전력 구성
- [[Emulation-and-Compatibility-Layers|에뮬레이션과 호환 계층]] — 다른 아키텍처용 프로그램 실행
- [[Agent-Always-On-Mac-Host|상시 실행 Mac 에이전트 호스트]] — Apple Silicon의 FileVault와 재시작
