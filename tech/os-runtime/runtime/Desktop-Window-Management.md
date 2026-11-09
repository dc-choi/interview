---
tags: [desktop, window-manager, wayland, hyprland, macos, accessibility]
status: done
verified_at: 2026-11-09
category: "OS&런타임(OS&Runtime)"
aliases: ["Desktop Window Management", "데스크톱 창 관리", "타일링 창 관리자", "Tiling Window Manager", "창 테두리 도구", "Window Sweaters", "JankyBorders"]
---

# 데스크톱 창 관리: 배치 방식과 외부 창 장식 도구

데스크톱의 창 관리는 창을 어디에 어떤 크기로 둘지 정하는 배치와, 테두리나 제목 표시줄처럼 창 둘레를 그리는 장식으로 나눠 볼 수 있다. 누가 이 일을 맡는지는 OS의 창 시스템 구조가 정한다. Wayland에서는 컴포지터가 디스플레이 서버이므로 배치 방식은 컴포지터(타일링 창 관리자 Hyprland 같은)와 그 위의 셸이 정한다. 소스를 확인한 macOS 창 테두리 도구 Window Sweaters(JankyBorders 파생)는 대상 창을 고치지 않고 테두리용 창을 따로 띄워 대상 창을 따라가게 하며, 비공개 창 서버 API를 쓰고, 권한이 있으면 손쉬운 사용(Accessibility) API도 쓴다. 그래서 기능과 함께 권한, OS 업데이트에 따른 동작 변화와 배포 경로를 확인한다.

## 배치 방식

| 방식 | 창을 놓는 규칙 | 얻는 것 | 치르는 비용 |
|---|---|---|---|
| 타일링 | 창 관리자가 작업 공간을 나눠 창을 겹치지 않게 둔다. Omarchy의 기본 dwindle은 창이 늘면 각 창을 줄여서라도 모두 보이게 한다 | 키보드로 배치하고 가려진 창이 없다 | 창이 많을수록 각 창이 작아진다 |
| 스크롤링 | 창을 옆으로 나란히 이어 붙여 화면 가장자리 밖까지 둔다 | 창 크기를 유지한 채 여러 창을 연다 | 화면 밖의 창은 이동해야 보인다 |
| 플로팅 | 창이 자유롭게 겹치고 위치와 크기를 사용자가 정한다 | macOS, Windows와 같은 방식으로 조작한다 | 정리를 사람이 맡고 창이 서로 가린다 |

얻는 것과 비용은 각 방식의 정의에서 도출한 비교다.

### 작업 공간마다 다른 방식을 쓰는 사례: Omarchy 4.5

Arch Linux와 Hyprland 기반 배포판 Omarchy는 4.5(2026-11-04 릴리스 노트)에서 `Super + L`이 작업 공간을 타일링, 스크롤링, 플로팅 사이에서 바꾸게 했다. 2026-11-09 확인한 매뉴얼 기준 동작은 다음과 같다.

- `Super + L`은 현재 작업 공간을 dwindle, scrolling, floating 순으로 바꾸고 `Super + Alt + L`은 반대 순서로 바꾼다. 선택은 작업 공간마다 따로 저장돼 재시작 뒤에도 남고, 상단 바가 사각형, 원, 삼각형으로 방식을 표시한다.
- 플로팅 작업 공간에서는 창마다 테마 색의 제목 표시줄(최소화, 최대화, 닫기)이 붙고, 고정한 앱, 실행 중인 앱과 전체 앱 격자를 보여 주는 독이 나타난다. `Super + M`은 포커스 창을 독으로 최소화한다.
- 개별로 띄운 창이나 늘 플로팅으로 열리는 앱의 창은 작업 공간을 타일링으로 되돌려도 떠 있다.
- 기본 방식은 Appearance > Workspace Layout에서 바꾼다. 바꾸면 창이 없는 작업 공간만 새 기본값을 따르고, 창이 있는 작업 공간은 원래 방식을 유지한다.

릴리스 노트는 이 모드를 타일링에 아직 익숙하지 않은 macOS, Windows 사용자의 진입로로 소개한다. 같은 릴리스는 `Super + Q`, `Super + A`, `Super + M` 같은 새 기본 단축키가 사용자 정의 바인딩과 충돌할 수 있다고 적으므로, 업그레이드할 때 단축키 변경 목록을 확인한다.

## macOS의 외부 창 장식 도구

Window Sweaters는 다른 앱의 창 둘레에 뜨개질 무늬 테두리를 그리는 macOS 메뉴 막대 앱이다(GPL-3.0). JankyBorders에서 파생했으며, 2026-11-09 확인한 저장소 소스 기준 동작은 다음과 같다.

- **별도 테두리 창:** 비공개 SkyLight 함수(`SLSNewWindow`, `SLSSetWindowShape` 등)로 대상 창마다 테두리 창을 만들고, 창 서버가 보내는 생성, 삭제, 이동, 크기 변경, 순서 변경 이벤트를 받아 대상 창을 따라간다. 대상 앱의 창 내용은 바꾸지 않는다. 크기를 조절하는 동안에는 테두리를 숨겼다가 끝나면 다시 그린다.
- **포커스 추적:** 시작할 때 손쉬운 사용 권한을 조용히 확인(`AXIsProcessTrusted`)해 이미 허용돼 있으면 `kAXFocusedWindowAttribute`로 포커스 창을 찾고, 권한이 없거나 실행 중 철회되면 창 서버(SkyLight) 경로로 대신한다. 소스는 권한 요청 경로를 호출하지 않고 테스트도 요청 0회를 확인한다. README는 macOS가 손쉬운 사용 권한을 물으면 허용하라고 안내한다. JankyBorders README는 손쉬운 사용 API에 기대지 않아 비슷한 도구보다 빠르다고 밝히지만, 소스에는 같은 무음 확인과 손쉬운 사용 경로가 있고 권한 없이 `ax_focus=on`을 명시한 경우에만 권한을 요청한 뒤 종료한다. 같은 계열이라도 권한이 없을 때의 처리가 다르다.
- **사용자 설정:** README는 37개 앱에 손으로 고른 색과 무늬의 맞춤 테두리가 있다고 적는다. 소스의 내장 목록은 별칭을 빼면 37개 앱이고 전용 무늬(`atelier-*`)는 35개이며, Codex는 ChatGPT와 같은 색과 무늬를, Discord는 공용 `checker` 무늬를 쓴다. 나머지 앱은 아이콘에서 뽑은 색으로 무늬를 만든다. 앱별로 끌 수 있고 이 선택은 재시작 뒤에도 남는다. `~/Library/Application Support/Knit Borders/`의 `apps.conf`와 `charts/`로 색과 PNG 무늬를 바꾸며, 시작할 때 `~/.config/window-sweaters/sweatersrc`나 `~/.sweatersrc`가 있으면 그 셸 스크립트를 실행한다.
- **지원 범위:** README는 macOS 13 이상의 Apple Silicon과 Intel Mac을 대상으로 하고, Apple Silicon의 macOS 26에서 시험했으며 이전 macOS와 Intel Mac은 같은 수준으로 시험하지 않았다고 적는다. 비공개 창 API를 쓰므로 시스템 업데이트가 동작에 영향을 줄 수 있다고 밝히지만, 2026-11-09 기준 최신인 macOS 27(Golden Gate)에 대한 언급은 없다. JankyBorders README의 대상은 macOS 14.0 이상이다.

## 권한, 서명과 설치 경로

- **손쉬운 사용 권한:** Apple은 손쉬운 사용 기능으로 Mac에 접근하고 제어하려는 외부 앱에 사용자가 Privacy & Security에서 직접 권한을 줘야 하고, 알고 신뢰하는 앱에만 주라고 안내한다. 이 권한은 앱을 지워도 따로 남으므로 제거할 때 Accessibility 목록에서도 지운다(Window Sweaters README).
- **시작 스크립트:** 앱이 시작할 때마다 실행하는 사용자 스크립트는 셸 설정 파일처럼 지속되는 실행 경로가 된다. 소스 기준으로 앱은 설정 인자 없이 시작할 때만 이 스크립트를 실행하며, `~/.config/window-sweaters/sweatersrc`가 있으면 `~/.sweatersrc`는 보지 않는다. 실행 비트가 없으면 앱이 스스로 붙이고, 앱 프로세스가 fork한 자식에서 60초 `alarm`을 건 뒤 `/usr/bin/env sh -c`로 실행한다. 파일 내용과 쓰기 권한을 관리한다. 앱에 준 권한이 이 자식 프로세스에까지 미치는지는 확인하지 않았다.
- **서명과 공증:** 빌드 스크립트는 ad-hoc 서명(`codesign --sign -`)만 하며, 스크립트 주석도 이것이 Developer ID 서명이나 배포용 공증이 아니라고 적는다. 직접 받은 ZIP을 macOS가 막으면 README는 Privacy & Security의 Open Anyway로 여는 방법을 안내한다. Apple은 이렇게 연 앱을 보안 설정의 예외로 저장한다고 설명한다.
- **Homebrew 경로:** README는 `brew trust saragordic/tap` 다음에 `brew install --cask saragordic/tap/window-sweaters`를 안내한다. 첫 명령은 탭 전체를 신뢰한다. 탭 README는 Homebrew가 신뢰하지 않은 서드파티 탭의 cask를 불러오지 않으므로 첫 명령이 필수라고 적지만, Homebrew Tap Trust 문서는 탭 이름을 붙인 설치가 그 항목만 신뢰한다고 설명한다(직접 시험하지 않음). cask(1.5.0 기준)는 sha256을 고정한 GitHub 릴리스 ZIP을 받고, 설치 뒤 `xattr -dr com.apple.quarantine`으로 quarantine 속성을 지워 Gatekeeper 확인 없이 열리게 한다. 이 단계는 `must_succeed: false`라서 실패하면 확인 창이 남는다. 저장소에 CI 빌드 워크플로가 없고 1.5.0 ZIP의 digest로 조회한 GitHub attestation도 없어(2026-11-09), 릴리스 ZIP과 소스의 일치를 보여 주는 provenance가 없다. 탭 신뢰와 quarantine의 일반 원칙은 [[Supply-Chain-Security#서드파티 탭과 macOS 실행 검사|서드파티 탭과 macOS 실행 검사]]에서 다룬다.
- **직접 빌드:** Command Line Tools와 Python 3로 소스를 빌드하면(`./scripts/build-app.sh`, `python3 scripts/install-local.py`) 산출물의 출처를 스스로 통제한다. 대신 업데이트도 직접 맡는다.

## 점검 항목

- 배치 방식을 바꿀 때 기본값과 작업 공간별 설정 중 무엇이 바뀌는지, 기존 단축키와 충돌하는지 확인한다.
- 창 관리나 장식 도구가 어떤 API(비공개 창 서버 API, 손쉬운 사용 API)를 쓰고 어떤 권한을 요구하는지 설치 전에 본다.
- 비공개 API에 기대는 도구는 OS 업데이트 뒤 동작을 다시 확인하고, 문제가 생기면 끄는 방법(메뉴 막대의 일시 중지, 앱별 끄기, 종료)을 알아 둔다.
- 서명과 공증 여부, 설치 경로가 quarantine 속성을 지우는지를 확인한다.
- 제거할 때 앱, 설정 폴더와 손쉬운 사용 권한을 각각 정리한다. Homebrew의 `--zap`은 설정 폴더까지 지운다.

## 출처

- GeekNews 제공 발췌, 2026-11-06 Window Sweaters — 원문 식별에 사용
- [saragordic/window-sweaters — GitHub](https://github.com/saragordic/window-sweaters) — 2026-11-09 README, NOTICE, 빌드 스크립트, 소스(`src/main.c`, `src/windows.c`, `src/apps.c`, `src/misc/extern.h`, `src/misc/ax.h`, `src/misc/helpers.h`, `src/border.c`, `src/events.c`)와 테스트(`tests/ax_focus.c`) 확인. 최신 릴리스는 1.5.0(2026-09-18)
- [saragordic/homebrew-tap — GitHub](https://github.com/saragordic/homebrew-tap) — 2026-11-09 README와 window-sweaters cask 확인
- [FelixKratz/JankyBorders — GitHub](https://github.com/FelixKratz/JankyBorders) — 2026-11-09 README의 대상 macOS와 손쉬운 사용 API 미사용 설명, 소스(`src/main.c`, `src/misc/ax.h`, `src/windows.c`)의 권한 확인과 포커스 경로 확인
- [Omarchy 4.5 floats, speaks 50 languages, and runs on your Mac — Omarchy News, DHH](https://omarchy.org/news/2026/11/omarchy-4-5/) — 2026-11-04. 플로팅 작업 공간, 독과 바뀐 단축키
- [The Omarchy Manual, Navigation](https://github.com/omacom/omarchy/blob/quattro/manual/04-navigation.md) — 2026-11-09 dwindle, scrolling, floating의 정의와 작업 공간별 설정 대조
- [Wayland, Wayland Architecture](https://wayland.freedesktop.org/architecture.html) — 컴포지터가 디스플레이 서버인 구조
- [Apple Mac User Guide, Allow accessibility apps to access your Mac](https://support.apple.com/guide/mac-help/allow-accessibility-apps-to-access-your-mac-mh43185/mac) — 2026-11-09 권한 부여 절차와 주의 문구 대조, 가이드 버전 목록의 최신 항목(macOS 27 Golden Gate) 확인
- [Apple Support, Safely open apps on your Mac](https://support.apple.com/en-us/102445) — 2026-11-09 공증되지 않은 앱의 Open Anyway 예외 대조
- [Homebrew Documentation, Tap Trust](https://docs.brew.sh/Tap-Trust) — 2026-11-09 탭 이름을 붙인 설치와 탭 전체 신뢰의 범위 대조

## 관련 문서

- [[Terminal-and-Editor-Interfaces|터미널과 편집기의 입력 및 렌더링 계층]] — 개발 데스크톱의 다른 인터페이스 계층
- [[Supply-Chain-Security#서드파티 탭과 macOS 실행 검사|서드파티 탭과 macOS 실행 검사]] — Homebrew 탭 신뢰와 cask의 quarantine 처리
- [[Linux-on-Apple-Silicon|Apple Silicon Mac에서 Linux 실행]] — Omarchy의 Mac 설치기와 지원 범위
