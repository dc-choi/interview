---
tags: [terminal, editor, emacs, rendering]
status: done
verified_at: 2026-11-25
category: "OS&런타임(OS&Runtime)"
aliases: ["터미널과 편집기의 입력 및 렌더링 계층"]
---

# 터미널과 편집기의 입력 및 렌더링 계층

터미널 에뮬레이터는 프로그램의 입출력과 화면 상태를 연결하고, 텍스트 편집기는 문서를 바꾸는 명령과 버퍼를 제공한다. 빠른 화면 표시, 익숙한 키 바인딩과 확장 가능한 편집은 서로 다른 요구다.

## 계층 나누기

- PTY는 실행 중인 프로그램과 터미널을 연결한다.
- 터미널 파서는 제어 시퀀스를 해석하고 화면 상태를 갱신한다.
- 렌더러는 글자와 이미지를 화면에 그린다. GPU 사용만으로 파싱과 앱 자체의 연산이 모두 빨라지는 것은 아니다.
- 편집기는 파일 버퍼, 커서와 편집 명령을 관리한다. modal 편집과 modeless 편집은 입력을 명령으로 해석하는 방식이 다르다.

## 바이트에서 화면 상태까지

PTY를 오가는 것은 바이트뿐이고 색과 커서의 의미는 읽는 쪽인 에뮬레이터가 정한다. 셸은 바이트를 내보낼 뿐 화면을 직접 그리지 않는다. 출력 경로는 파싱, 상태 갱신, 렌더링의 세 단계다. 앞의 두 단계는 입력이 바이트이고 결과가 상태인 결정적 처리라 창과 폰트 없이 바이트열을 넣고 결과 그리드를 비교하는 테스트를 만들 수 있다. 렌더러는 상태를 읽기만 하는 소비자로 두면 교체할 수 있고, 상태가 틀리면 어떤 렌더러를 붙여도 틀린 화면이 나온다.

| 바이트 부류 | 예 | 효과 |
|---|---|---|
| 출력 가능 문자 | ASCII, UTF-8 문자 | 커서 위치의 셀에 쓰고 커서를 옮긴다 |
| C0 제어 문자 | LF 0x0A, CR 0x0D, BS 0x08, HT 0x09, BEL 0x07 | 글자를 쓰지 않고 커서나 장치 동작을 바꾼다 |
| CSI | `ESC [` + 숫자 parameter + final byte. `ESC [ 1 ; 31 m`(SGR, 굵게와 빨강), `ESC [ 2 J`(화면 지우기) | 커서, 속성, 화면 내용을 바꾼다 |
| OSC, DCS | `ESC ]`, `ESC P`로 시작하고 ST로 끝나는 문자열. xterm은 OSC 종료에 BEL도 받는다 | 창 제목, 클립보드, 장치 제어처럼 문자열 payload를 나른다 |

키 입력의 인코딩도 터미널 모드에 따라 달라진다. 위 화살표는 일반 cursor key 모드에서 `CSI A`(`ESC [ A`), DECCKM(application cursor keys) 모드에서 `SS3 A`(`ESC O A`)를 보낸다. 화면도 하나가 아니다. `CSI ? 1049 h`는 커서를 저장하고 alternate screen buffer를 지운 뒤 그쪽으로 전환한다. 전체 화면 프로그램이 이 모드를 쓰고 끝나면 주 화면으로 돌아오므로, 상태 모델이 두 화면을 구분하지 못하면 편집기를 닫은 뒤 화면이 깨진다.

## 파서는 상태 기계로 만든다

Paul Flo Williams가 정리한 DEC ANSI 호환 파서 모델은 ground, escape, csi entry, csi param, csi intermediate, csi ignore, dcs 계열, osc string 같은 상태와 바이트마다 정해진 전이와 action으로 파서를 정의한다. 바이트 하나씩 처리하므로 read 단위가 시퀀스 중간에서 끊겨도 파서 상태만 보존하면 이어서 처리한다. 문자열 분할이나 정규식으로 시퀀스를 자르는 방식은 이 경계에서 실패한다.

- CAN(0x18)과 SUB(0x1A)는 어느 상태에서든 진행 중인 시퀀스를 취소하고 ground로 돌아간다. ESC는 어느 상태에서든 진행 중인 시퀀스를 버리고 escape 상태로 간다.
- 형식이 틀린 CSI는 csi ignore 상태에서 final byte까지 소비한 뒤 control function을 dispatch하지 않고 ground로 돌아간다.
- Parameter는 16개까지만 저장하면 되고 넘는 parameter는 조용히 무시한다.
- 파서는 dispatch까지만 하고, 그 동작이 그리드와 커서에 무엇을 하는지는 상태 계층이 맡는다.

CR로 같은 줄을 덮어쓰는 진행률 표시와 커서 이동이 섞인 빌드 로그는 ANSI 색상 코드만 정규식으로 지워서는 최종 화면을 재현하지 못한다. 로그 뷰어도 상태 기계로 끝까지 해석해야 한다.

## 출력은 제어 언어다

파일을 `cat`으로 출력만 해도 그 안의 시퀀스가 커서를 위로 옮기고 줄을 지우거나 전경색을 배경색과 같게 바꿔 실패한 줄을 숨길 수 있다. 파일이 실행된 것이 아니라 터미널이 받은 바이트를 명령으로 해석한 결과다. 원인은 렌더러가 아니라 바이트가 파서로 들어오는 경계에 있고, 표준 문법을 따르더라도 어떤 시퀀스에 화면 밖 자원에 닿는 권한을 줄지는 구현과 호스트의 정책이다. 외부 기여자 코드를 빌드한 CI 로그처럼 남이 쓴 바이트를 해석해 보여 주는 곳에서는 다음을 점검한다.

- OSC 52(Manipulate Selection Data)는 선택 영역과 클립보드를 쓰고, 두 번째 parameter가 `?`이면 선택 데이터를 호스트로 돌려보내 읽기도 한다. 쓰기(SetSelection)와 읽기(GetSelection) 허용을 따로 정한다. xterm은 `allowWindowOps` 기본값이 false이고 기본 `disallowedWindowOps` 목록에 두 동작이 들어 있어 기본 설정에서 막지만, 다른 터미널의 기본값은 각각 확인한다.
- 상태 질의에 대한 응답, 클립보드 읽기 결과와 창 제목 같은 값이 입력 채널로 되돌아가 명령처럼 실행되지 않는지 확인한다.
- 하이퍼링크 시퀀스는 표시 텍스트와 실제 주소가 다를 수 있으므로 허용할 scheme을 제한한다.
- Parameter 수와 OSC 문자열 길이에 상한을 두고, 무작위 바이트를 넣는 퍼징으로 멈춤, 무한 루프와 경계 초과를 찾는다. 입력이 바이트이고 결과가 상태인 코어일수록 퍼저를 붙이기 쉽다. 견고한 파서가 허용 정책을 대신하지는 않는다.

## 코어와 호스트의 경계

임베드용 터미널 코어의 범위는 세 가지로 나뉜다. 파서만 담으면 가볍지만 그리드, 스크롤백과 리플로우처럼 가장 어려운 정확성 문제를 호스트가 다시 구현한다. 상태까지 담으면 호스트는 바이트를 넣고 상태를 읽기만 하며 렌더링 방식은 자유롭게 고른다. 렌더러까지 담으면 바로 쓰기 편하지만 GPU API, 폰트 스택과 창 시스템이 코어에 들어와 이식성이 떨어진다. 한 가지 설계 기준은 모든 호스트에서 똑같이 옳아야 하는 출력 해석, 상태와 모드에 따른 키 인코딩을 코어에 두고, 호스트마다 달라도 되는 렌더링, 원시 입력 이벤트 수집과 PTY 연결을 호스트에 두는 것이다. 키 인코딩을 호스트에 두면 호스트가 현재 DECCKM 같은 모드를 따로 알아야 한다. 아래 Kwi 사례도 libghostty-vt에 파싱과 상태를 맡기고 렌더링은 Qt로 따로 한다. 코어를 C ABI로 내보낼 때의 규칙은 [[Library-ABI-Stability|라이브러리 ABI 안정성]]에 있다.

## 확장성과 공통 명령 체계

Emacs는 1976년 MIT의 TECO 편집 매크로에서 시작한 계보와 이후 GNU Emacs 등을 구분해서 본다. 사용자가 명령을 확장할 자유는 생산성을 높이지만, 공통 키와 설정을 잃으면 다른 사람의 환경에서 작업하기 어려워진다. 2026년 50주년은 이 초기 계보의 기준이지 GNU Emacs의 모든 구현이 1976년에 나왔다는 뜻이 아니다.

에이전트에게 원하는 결과를 말로 지시하는 방식이 늘면 이 확장성의 의미도 달라진다. 편집 속도, 설정 확장과 Lisp의 표현력 같은 편집기의 이점은 직접 타이핑할 때의 이점이라 그 비중이 줄고, 예전이라면 시도하지 않았을 재구현의 비용은 토큰 비용으로 내려간다. 웹 기반 그리기 도구를 Emacs 안에 다시 구현한 excali-mode.el과 Rust 터미널 에뮬레이터를 붙인 cooked.el이 그런 예로 꼽힌다. 다만 그렇게 만든 도구가 어떻게 동작하는지는 만든 사람도 설명하지 못할 수 있다. 모든 앱을 각자 취향대로 맞춰 만드는 흐름은 위의 공통 키와 설정 문제를 앱 전체로 넓힌다(해석). 이 문단은 오랜 Emacs 사용자의 개인 에세이(저자와 작성일 미표기)의 관점이며 두 사례의 저장소와 동작은 확인하지 않았다.

## 작은 편집기의 역할

NetBSD의 atto 매뉴얼은 modeless 화면 편집기, UTF-8과 Emacs 계열 조작을 설명한다. vi의 모드 전환에 익숙하지 않은 사용자에게 다른 진입점을 제공한다. 기본 구문 강조도 언어 전체를 이해하는 IDE 분석과 구분한다.

제공된 2026-10-30 발췌의 기본 시스템 추가, 48KB와 C 코드 2,000줄 미만은 해당 공지의 주장이다. 이번에는 매뉴얼의 기능을 대조했으며 바이너리 크기, 빌드 옵션과 추가 커밋은 확인하지 않았다. 작은 설치 크기와 복구 환경에서의 의존성 충족도 별도 조건이다.

## 파서와 GPU 렌더러의 재사용

Kwi의 2026-11-01 KDE 발표는 libghostty-vt를 파싱과 상태 관리에, Qt Scene Graph의 Vulkan/OpenGL을 렌더링에 사용한다. KDE 통합에는 Kirigami와 KPty를 활용한다. 화면 읽기와 Wayland 소수 배율도 설계 대상이다.

개발자 측정의 Konsole 대비 3~35배 속도는 특정 렌더링 작업의 결과다. 모든 셸 명령, 배터리 시간이나 사람의 작업 생산성이 같은 비율로 좋아진다는 뜻은 아니다. 이름은 한국어 귀신의 로마자 표기에서 유래한다. 실제 기기 성능과 접근성 사용성은 이번에 시험하지 않았다.

## 출처

- [Computer History Museum, Emacs 보존 자료](https://softwarepreservation.computerhistory.org/emacs/) — 초기 TECO 계보 확인
- [NetBSD, atto(1)](https://man.netbsd.org/atto.1) — 편집 모델과 기능 확인
- [Introducing Kwi — KDE Blogs](https://blogs.kde.org/2026/11/01/introducing-kwi/) — 구조와 개발자 측정 조건 확인
- [VT100.net, A parser for DEC's ANSI-compatible video terminals](https://vt100.net/emu/dec_ansi_parser) — Paul Flo Williams의 파서 상태와 전이 확인
- [XTerm, Control Sequences](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html) — Patch #411(2026-08-23) 판의 OSC 52, DECCKM, 1049 모드 확인
- [XTerm, xterm(1) manual page](https://invisible-island.net/xterm/manpage/xterm.html) — `allowWindowOps`와 `disallowedWindowOps` 기본값 확인
- [왜 터미널 에뮬레이터의 핵심은 화면 그리기가 아닌가 — 길리랩](https://www.youtube.com/watch?v=r47F1-yDBsw) — 파서, 상태, 렌더러 경계와 보안 점검 항목
- GeekNews 제공 발췌, 2026-10-29 Emacs 50주년, 2026-10-30 atto, 2026-11-02 Kwi — atto 추가 시점과 크기는 추가 검증 대상
- [Emacs In the Age Of Magic — Command Line Systems](https://commandlinesystems.com/magic.txt) — 저자와 작성일 표기 없음, 2026-11-16 이점 소멸 주장, 두 재구현 사례의 서술과 맺음말 대조
- [마법의 시대에 Emacs는 어디로 가는가 — GeekNews](https://news.hada.io/topic?id=37038) — 2026-11-16 접속 시 브라우저 확인 페이지로 요약 미열람, 위 원문으로 대조

## 관련 문서

- [[Library-ABI-Stability|라이브러리 ABI 안정성]] — libghostty-vt 1.0의 안정 C ABI와 채택 사례
- [[런타임(Runtime)|런타임 인덱스]]
- [[OpenBSD-Platform|BSD 플랫폼]]
