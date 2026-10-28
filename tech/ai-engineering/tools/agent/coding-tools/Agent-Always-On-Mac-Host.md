---
tags: [ai, agent, coding-agent, macos, operations, security, terminal-multiplexer]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["Always-On Mac Agent Host", "상시 실행 Mac 에이전트 호스트", "맥미니 에이전트 서버", "Corgi"]
---

# 상시 실행 Mac 에이전트 호스트의 전원, 재시작과 원격 접근

Mac mini 같은 데스크톱 Mac에서 코딩 에이전트를 계속 돌리려면 잠자기, 정전 뒤 재시작, 디스크 암호화, 원격 접속, 세션 유지와 확장 설치를 각각 정해야 한다. 한 설정이 다른 조건을 대신하지 않는다. 잠자기를 막아도 재부팅 뒤 복구는 따로 남고, 원격 접속 경로가 있어도 재시작 뒤의 디스크 잠금은 누군가 풀어야 하며 그 경로가 잠금 중에도 살아 있는지는 따로 확인해야 한다.

이 문서는 2026-10-20 Apple 지원 문서(macOS Sequoia 15, Tahoe 26), 같은 날 확인한 macOS 26.6.2 매뉴얼 페이지, Tailscale과 Claude Code 공식 문서를 대조한 기준이다. 실제 장비에서 설정을 바꿔 시험한 기록은 아니다.

## 잠자기를 막는 설정과 깨우는 설정은 다르다

데스크톱 Mac의 전원 옵션은 Apple 메뉴 > System Settings > Energy에 있다. 기종에 따라 일부 옵션이 없을 수 있다.

| 옵션 | 하는 일 |
|---|---|
| Prevent automatic sleeping when the display is off | 디스플레이가 꺼져도 자동으로 잠들지 않게 한다 |
| Start up automatically after a power failure | 전원이 끊겼다 돌아오면 Mac을 다시 켠다 |
| Wake for network access | 잠든 상태에서 공유 자원 요청이 오면 깨운다. 잠자기를 막는 설정이 아니다 |
| Low Power Mode | Apple은 서버처럼 항상 켜 둔 컴퓨터의 에너지 사용을 줄이는 옵션으로 설명한다 |

macOS 26에는 Start up when power is connected(Never, After power failure, Always)가 더 있다. Apple 안내 기준 macOS 26.5 이상, 2024년 이후 Mac mini(Mac Studio는 2025년 이후, iMac은 2024년 이후)에서 쓸 수 있다. Apple은 잠자기를 늦추거나 막으면 전력 소비가 늘 수 있다고 안내한다.

터미널에서는 `pmset`이 같은 설정을 다룬다. 매뉴얼 기준 `womp`는 Wake for network access와 같고 `autorestart`는 정전 뒤 자동 재시작이다. 프로세스는 power assertion으로 이 설정을 일시적으로 덮어쓸 수 있다. 특정 작업 동안만 잠자기를 막으려면 `caffeinate`로 그 명령을 감싼다. 이 assertion은 그 명령이 실행되는 동안만 유지되고, `-s` 옵션은 AC 전원에서만 유효하다.

## 재시작 뒤 복구는 FileVault와 함께 정한다

FileVault를 켜면 부팅 중에 사용자 자격 증명이 필요하다. 매뉴얼은 계정이 비밀번호로 인증하기 전까지 데이터 볼륨이 잠겨 쓸 수 없다고 설명한다. 정전처럼 예기치 않게 재시작되면 누군가 잠금을 풀기 전에는 그 볼륨에 있는 사용자 작업이 시작되지 않는다(문서에서 도출한 운영 결과). 소프트웨어 업데이트로 인한 재시작이 이 잠금을 건너뛰는지는 공식 문서로 확인하지 못했다. FileVault를 켜면 자동 로그인도 쓸 수 없다.

| 선택 | 무인 복구 | 감수할 점 |
|---|---|---|
| FileVault 유지, 재시작 뒤 직접 잠금 해제 | 사람이 개입해야 함 | Apple silicon과 macOS 26 이상에서는 Remote Login이 켜져 있고 네트워크에 연결돼 있으면 SSH로 잠금을 풀 수 있다 |
| FileVault 유지, 계획된 재시작에 `fdesetup authrestart` | 그 한 번의 볼륨 잠금 해제만 건너뜀 | 잠금 해제 키를 메모리와 지원 기종의 SMC에 보관하므로 매뉴얼이 보호 수준 저하를 경고한다. FileVault가 켜져 있어 자동 로그인은 꺼져 있으므로 로그인 세션에서 시작하는 작업은 누군가 로그인해야 시작된다(도출, 미시험). 명령으로 시작한 재시작에 쓰는 기능이라 예기치 않은 정전에는 해당하지 않는다(도출). 지원 여부는 `fdesetup supportsauthrestart`로 먼저 확인하며, true여도 FileVault가 켜져 있어야 동작한다 |
| FileVault 해제, 관리자가 아닌 계정으로 자동 로그인 | 정전 뒤에도 가능 | Apple silicon과 T2 Mac에서 볼륨 키를 하드웨어 UID만 보호한다. Apple은 자동 로그인이 재시작만으로 누구나 Mac에 접근하게 한다고 경고하고 관리자 계정에는 쓰지 말라고 한다 |

SSH 잠금 해제에는 제약이 있다. 매뉴얼은 macOS의 OpenSSH가 시스템과 계정의 설정 파일을 모두 데이터 볼륨에 두므로 잠금이 풀리기 전에는 평소의 인증 방식과 셸을 쓸 수 없고 비밀번호 인증만 가능하며, 해제 뒤 데이터 볼륨을 마운트하는 동안 SSH 연결이 잠깐 끊긴다고 설명한다. 잠금 해제 뒤 로그인 세션과 사용자 에이전트가 어떻게 시작되는지, 잠금 해제 전 Wi-Fi 연결이 유지되는지는 확인하지 못했다.

**잠금 해제 전에는 이 Mac의 Tailscale에 기대지 않는다.** Apple Platform Security는 사용자, 조직이나 서드파티 앱이 설치한 데몬이 데이터 볼륨에 있다고 설명하고, Tailscale의 App Store와 Standalone 변종은 로그인 전에 실행되지 않는다. 따라서 이 Mac에 설치한 Tailscale로는 잠금 해제용 SSH에 닿지 못할 가능성이 높다(공식 문서에서 도출, 미시험). 같은 LAN, 공유기나 다른 상시 장비의 VPN처럼 잠금 중에도 살아 있는 경로를 마련하고, 비밀번호 인증 SSH를 인터넷에 직접 열지 않는다. 잠긴 Mac은 스스로 재시작을 알리지 못하므로 재시작 감지는 Mac 밖에서 한다.

다음은 선택 기준에 관한 제안이다. 장비가 놓인 곳의 물리적 접근 통제, 저장한 자격 증명과 고객 자료의 민감도, 재시작 뒤 몇 시간 멈춰도 되는지를 함께 본다. FileVault 유지를 기본으로 두고, 끄는 선택은 위험을 받아들인 예외로 기록한다. 관리자가 아닌 계정으로 자동 로그인해도 그 계정에 저장된 Claude 로그인, Git 토큰, SSH 키와 동기화 세션은 재시작만으로 노출되므로 권한을 좁힌 토큰을 쓰고 분실 때 회수 절차를 준비한다. 외부에서 호스트 장애를 감지하는 방법은 [[Self-Hosting-Small-Server|소형 서버 셀프호스팅]]과 함께 본다.

## 원격 접속은 서버 측 조건을 확인한다

macOS의 SSH 서버는 System Settings > General > Sharing > Remote Login에서 켜고, Allow access for에서 Only these users로 계정을 좁힐 수 있다. Apple은 원격 로그인을 허용하면 보안이 약해질 수 있다고 안내한다.

Tailscale SSH는 WireGuard 위에서 Tailscale node key로 연결을 인증하고, tailnet 정책이 허용할 때만 두 기기의 연결을 승인한다(2026-10-20 문서 기준). 대상 기기는 `tailscale set --ssh`로 직접 옵트인해야 한다.

- **정책 조건:** 정책 파일에 port 22 네트워크 접근 규칙과 `ssh` 규칙이 둘 다 있어야 한다. `ssh` 규칙의 action은 `accept` 또는 재인증을 요구하는 `check`이고, check 주기 기본값은 12시간이다. 정책을 고치지 않은 tailnet은 사용자가 소유한 기기에 check mode로 접속하는 기본 SSH 정책을 쓰며, 이 기본 규칙은 root와 root가 아닌 사용자 접속을 모두 허용하므로 필요하면 `users`를 좁힌다.
- **macOS 변종:** macOS에서 Tailscale SSH 서버가 될 수 있는 것은 open source `tailscaled` 변종뿐이다. App Store와 Standalone 앱은 SSH 서버가 될 수 없고 로그인 전에 실행되지도 않는다. Tailscale은 `tailscaled` 변종을 숙련된 관리자가 관리하는 무인 설치에만 권한다. 앱 변종을 쓴다면 tailnet 위에서 macOS Remote Login으로 접속하는 구성이 된다.
- 메시 VPN의 구조, 접근 제어와 key expiry는 [[VPN-and-Private-Network#메시 VPN (오버레이 네트워크)|메시 VPN]], SSH의 서버와 사용자 인증은 [[SSH-Authentication|SSH 인증]]을 따른다.

## 세션 유지는 끊김과 재부팅을 나눠 본다

| 방식 | 견디는 것 | 견디지 못하는 것 |
|---|---|---|
| `tmux` | 클라이언트 분리와 SSH 타임아웃. 모든 상태를 tmux 서버 프로세스 하나에 둔다 | 그 서버 프로세스가 죽으면 세션도 사라진다 |
| Claude Code Remote Control | 호스트 Mac의 잠자기와 네트워크 단절(다시 온라인이 되면 자동 재연결) | 컴퓨터나 `claude` 프로세스가 끝나면 오프라인이 된다. 깨어 있는데 네트워크가 약 10분 넘게 끊기면 서버 모드 프로세스는 종료하고, 대화형 세션은 복구될 때까지 재시도한다 |
| Claude Code background session(agent view, research preview) | 터미널 종료와 분리. 별도 supervisor 프로세스가 실행한다 | 잠자는 동안 진행이 멈췄다가 깨어나면 재개하고, 종료나 재시작에서는 멈춘다 |
| Corgi(에이전트용 터미널 멀티플렉서) | 분리와 SSH 끊김. 다시 접속하면 실행 중인 에이전트와 개발 서버로 돌아온다. 충돌이나 재부팅 뒤에는 저장한 화면 배치와 출력을 복원하고, 기록된 에이전트 대화는 휴면 상태로 돌아와 그 창에 초점이 가면 이어진다 | 다른 창은 새 셸로 시작하며 임의 프로세스의 메모리 상태는 복원하지 못한다. 탭이나 창을 닫으면 그 안의 프로세스도 끝난다 |

Claude Code 문서는 원격 머신의 터미널에서 `claude`를 실행할 때 SSH 연결이 끊긴 뒤에도 세션이 남도록 `tmux`나 `screen` 안에서 실행하라고 권한다. Remote Control은 바깥으로 나가는 HTTPS 요청만 하고 Mac의 인바운드 포트를 열지 않는다. 기능별 제약은 [[Claude-Code-Customization#원격 제어 — 실행 위치 분리|Claude Code 원격 제어]]를 따른다.

Corgi 행은 2026-10-27 공식 저장소 문서(main 8ea591038f, MIT) 기준이며, README의 설치 대상은 Apple Silicon macOS와 amd64 Linux다. Corgi는 창에서 실행된 Claude Code와 Codex를 알아보고 그 설정에 자체 훅을 추가한다(Codex는 `/hooks`에서 한 번 신뢰를 요구). 문서는 로그와 복구 파일에 대화와 터미널 내용이 들어갈 수 있다고 경고한다. 상시 실행 장비에서는 이 훅 추가를 에이전트 설정의 변경으로 기록하고, 복구 파일과 로그 위치를 백업과 공유 범위에서 확인한다(운영 제안).

네 방식 모두 실행 중인 프로세스를 재부팅 너머로 넘기지 못한다. 화면과 대화를 되살려도 진행 중이던 명령과 개발 서버는 다시 띄워야 한다. 재부팅 뒤 다시 띄울 작업, 중간 결과를 남길 위치와 재개 뒤 확인할 출력은 미리 적어 둔다(운영 제안). 상태 표시와 완료 판정의 구분은 [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]]을 따른다.

## 확장과 업데이트는 소유자를 정한다

- **플러그인:** Claude Code 공식 문서는 설치한 플러그인이 사용자 권한으로 임의 코드를 실행할 수 있다고 경고하고, Anthropic은 플러그인에 든 MCP 서버, 파일과 소프트웨어를 통제하지 않으며 의도대로 동작하는지나 바뀌지 않는지 검증할 수 없다고 밝힌다. 상시 실행 장비에서는 설치와 업데이트가 그 장비에서 돌 코드의 변경이므로 [[Claude-Code-Customization#플러그인 — 확장을 묶어 설치하는 단위|플러그인 보안 경계]]의 검토 절차와 [[Agent-Skills|에이전트 스킬]]의 설치 원칙을 따르고, marketplace마다 자동 업데이트 설정을 확인한다. 2026-10-20 문서 기준 커뮤니티와 일반 서드파티 marketplace는 자동 업데이트가 기본으로 꺼져 있다. 다만 claude.ai에서 추가한 marketplace는 기본으로 켜지며, 조직의 플러그인 라이브러리도 이 경로에 포함된다. 조직이 발행한 marketplace는 보안 분류상 서드파티이므로, 서드파티라는 분류만으로 자동 업데이트가 꺼져 있다고 판단하지 않는다.
- **업데이트:** Homebrew cask로 설치한 Claude Code는 기본으로 자동 업데이트되지 않고, `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE`를 `1`로 두면 옵트인할 수 있다([[Claude-Code-Fundamentals|Claude Code 기초]]). 상시 실행 장비에서는 누가 언제 업데이트하고 재시작할지 정한다.
- **동기화 폴더:** Google Drive for desktop은 Sync status 타일로 최근 동기화한 파일과 현재 동기화 활동을 보여 준다. Drive에는 일일 업로드 한도가 있고, 한도 등으로 업로드하지 못한 파일은 나중에 자동으로 다시 시도하며 그래도 안 되면 하루 기다린 뒤 Drive for desktop을 다시 시작하라고 안내한다. 폴더에 파일이 보인다는 사실만으로 업로드가 끝났다고 판단하지 않는다(운영 제안).

## 운영 점검

- 잠자기 방지와 정전 뒤 자동 시동을 각각 켰고, 깨우기 설정을 잠자기 방지로 오해하지 않았는가
- 재시작 뒤 누가 어떤 경로로 FileVault 잠금을 푸는지, 또는 FileVault를 끈 위험을 받아들였는지 기록했는가
- 잠금 해제용 SSH 경로가 이 Mac의 Tailscale에 기대지 않고, 재시작을 Mac 밖에서 감지하는가
- 자동 로그인을 쓴다면 관리자가 아닌 계정이고, 그 계정의 토큰 권한과 회수 절차를 정했는가
- SSH 접근을 특정 사용자와 tailnet 정책으로 좁혔는가
- 재부팅 뒤 다시 띄울 에이전트 작업과 확인할 출력이 정해져 있는가
- 세션 관리 도구가 에이전트 설정에 추가한 훅과, 대화 내용이 남는 로그와 복구 파일의 위치를 알고 있는가
- 플러그인의 실행 구성요소를 읽은 뒤 설치했고 업데이트 담당자가 있는가

## 출처

- [Apple Support, Change Energy settings on a Mac desktop computer (macOS Tahoe 26)](https://support.apple.com/guide/mac-help/mchlp1168/26/mac/26)
- [Apple Support, Change Energy settings on a Mac desktop computer (macOS Sequoia 15)](https://support.apple.com/guide/mac-help/mchlp1168/15.0/mac/15.0)
- [Apple Support, Set sleep and wake settings for your Mac](https://support.apple.com/guide/mac-help/mchle41a6ccd/26/mac/26)
- [Apple Support, Turn on a Mac mini, Mac Studio, or iMac without pressing its power button](https://support.apple.com/en-us/125517)
- [Apple Platform Security, Volume encryption with FileVault in macOS](https://support.apple.com/guide/security/volume-encryption-with-filevault-sec4c6dc1b6e/web)
- [Apple Platform Security, Managing FileVault in macOS](https://support.apple.com/guide/security/managing-filevault-sec8447f5049/web)
- [Apple Platform Security, Role of Apple File System](https://support.apple.com/guide/security/role-of-apple-file-system-seca6147599e/web)
- [Apple Support, Change Users & Groups settings on Mac](https://support.apple.com/guide/mac-help/mtusr001/26/mac/26)
- [Apple Support, Allow a remote computer to access your Mac](https://support.apple.com/guide/mac-help/mchlp1066/26/mac/26)
- macOS 26.6.2 매뉴얼 페이지 pmset(1), caffeinate(8), fdesetup(8), apple_ssh_and_filevault(7) — 2026-10-20 로컬 `man`으로 확인
- [Tailscale Docs, Tailscale SSH](https://tailscale.com/kb/1193/tailscale-ssh)
- [Tailscale Docs, Syntax reference for the tailnet policy file](https://tailscale.com/kb/1337/policy-syntax)
- [Tailscale Docs, Three ways to run Tailscale on macOS](https://tailscale.com/kb/1065/macos-variants)
- [OpenBSD, tmux(1)](https://man.openbsd.org/tmux.1)
- [tmux Wiki, Getting Started](https://github.com/tmux/tmux/wiki/Getting-Started)
- [Claude Code Docs, Continue local sessions from any device with Remote Control](https://code.claude.com/docs/en/remote-control)
- [Claude Code Docs, Manage multiple agents with agent view](https://code.claude.com/docs/en/agent-view)
- [Corgi — GitHub, tals](https://github.com/tals/corgi) — README와 `docs/reference.md`, 2026-10-27 main 8ea591038f 기준. 분리와 복구 범위, 에이전트 훅 추가, 로그와 복구 파일의 내용 대조. 설치와 실행은 하지 않음
- [Corgi - 여러 AI 코딩 에이전트를 한눈에 관리하는 터미널 도구 — GeekNews](https://news.hada.io/topic?id=35971) — 학습 계기
- [Claude Code Docs, Plugin security and trust](https://code.claude.com/docs/en/plugins/security)
- [Claude Code Docs, Install and manage plugins](https://code.claude.com/docs/en/discover-plugins)
- [Claude Code Docs, Advanced setup](https://code.claude.com/docs/en/setup)
- [Google Drive Help, Use Google Drive for desktop](https://support.google.com/drive/answer/10838124?hl=en)
- [Google Drive Help, Fix problems in Drive for desktop](https://support.google.com/drive/answer/2565956?hl=en&co=GENIE.Platform%3DDesktop)

## 관련 문서

- [[VPN-and-Private-Network|VPN과 사설 네트워크]] — 메시 VPN, 접근 제어와 key expiry
- [[SSH-Authentication|SSH 인증]] — 서버 신원과 사용자 신원
- [[Claude-Code-Customization|Claude Code 커스터마이즈]] — 원격 제어 방식과 플러그인 보안 경계
- [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]] — 상태 표시와 완료 판정
- [[Agent-Skills|에이전트 스킬]] — 외부 스킬 설치의 신뢰
- [[Self-Hosting-Small-Server|소형 서버 셀프호스팅]] — 운영 범위와 외부 관측 경로
