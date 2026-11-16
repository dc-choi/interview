---
tags: [terminal, editor, emacs, rendering]
status: done
verified_at: 2026-11-02
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
- GeekNews 제공 발췌, 2026-10-29 Emacs 50주년, 2026-10-30 atto, 2026-11-02 Kwi — atto 추가 시점과 크기는 추가 검증 대상
- [Emacs In the Age Of Magic — Command Line Systems](https://commandlinesystems.com/magic.txt) — 저자와 작성일 표기 없음, 2026-11-16 이점 소멸 주장, 두 재구현 사례의 서술과 맺음말 대조
- [마법의 시대에 Emacs는 어디로 가는가 — GeekNews](https://news.hada.io/topic?id=37038) — 2026-11-16 접속 시 브라우저 확인 페이지로 요약 미열람, 위 원문으로 대조

## 관련 문서

- [[Library-ABI-Stability|라이브러리 ABI 안정성]] — libghostty-vt 1.0의 안정 C ABI와 채택 사례
- [[런타임(Runtime)|런타임 인덱스]]
- [[OpenBSD-Platform|BSD 플랫폼]]
