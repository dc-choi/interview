---
tags: [web, accessibility, keyboard, input]
status: done
verified_at: 2026-10-16
category: "웹&네트워크(Web&Network)"
aliases: ["Cross-platform Keyboard", "플랫폼별 키보드 입력"]
---

# 플랫폼별 키보드 입력

웹 앱의 키보드 설계는 키 이름, 생성되는 문자, 조합 키와 기본 편집 동작을 구분한다. Windows의 Ctrl을 Mac의 Command로 치환하는 것만으로 모든 단축키가 맞지는 않는다.

## 입력과 명령을 구분한다

| 구분 | 설계 기준 |
| --- | --- |
| 키 이름 | Windows Backspace와 Mac Delete처럼 같은 동작의 표시명이 다를 수 있다 |
| 조합 키 | Mac Control은 Command와 별개이며 텍스트 편집과 터미널 조작에 쓰인다 |
| 문자 생성 | Option, AltGr와 일부 Ctrl+Alt 조합은 필요한 문자를 입력하는 수단이다 |
| 탐색 | Tab, Home/End, Page Up/Down은 포커스, 커서와 스크롤 중 무엇을 옮기는지 확인한다 |

2026-10-10 발췌의 플랫폼 차이는 Unsung의 2026-10-08 사례 설명과 대조했다. 특정 앱의 예외를 모든 앱의 공통 동작으로 일반화하지 않는다.

## 웹 이벤트의 계약

UI Events 기준 `key`는 입력 의미, `code`는 물리 키 위치를 나타낸다. 문자 기반 명령과 게임의 위치 기반 제어를 구분해서 선택한다. `ctrlKey`, `metaKey`, `altKey`, `shiftKey`는 독립 상태다. 조합 중임을 나타내는 `isComposing`과 실제 텍스트 입력 이벤트도 함께 고려한다.

구현 검토 제안: 편집 가능한 요소에서 전역 단축키가 문자를 가로채지 않는지 확인하고, 실제로 처리할 명령에만 기본 동작 취소를 적용한다. 한글 IME, 비영문 배열, 키보드 전용 탐색과 OS 접근성 설정을 시험한다. 메뉴 표기와 실제 작동도 함께 검증한다.

문서 대조일은 2026-10-16이다. 여러 OS와 물리 키보드 조합의 실행 검증은 하지 않았다.

## 출처

- [Deeper dive: Keyboard differences between Windows and Macs — Unsung, Marcin Wichary](https://unsung.aresluna.org/deeper-dive-keyboard-differences-between-windows-and-macs/)
- [W3C, UI Events](https://www.w3.org/TR/uievents/#events-keyboardevents)

## 관련 문서

- [[Agent-Friendly-Websites|의미와 접근성을 지키는 웹 인터페이스]]
