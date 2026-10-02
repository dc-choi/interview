---
tags: [expo, expo-integrations, user-interface]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo rich text 편집기 선택과 데이터 형식"]
---

# Expo rich text 편집기 선택과 데이터 형식

rich text 표시와 편집은 다른 문제다. Markdown renderer, HTML renderer/WebView와 nested Text는 표시를 해결하지만 selection/format/image/mention을 편집하는 모델까지 제공하지 않는다. Expo guide는 universal default editor가 없다고 설명한다.

## Native editor와 형식

react-native-enriched-markdown은 Markdown output과 Android/iOS/macOS/web을 지원하고 native Kotlin/Swift SDK도 제공한다. react-native-enriched-html은 HTML input/display와 Android/iOS/web이며 New Architecture가 필요하다. react-native-live-markdown은 TextInput 대체로 keystroke마다 live formatting한다. Expo Modules로 native editor를 감싸면 platform API와 공통 input/output format을 직접 통합해야 한다. Lexical native port는 진행 중 effort이며 완성된 공용 지원으로 가정하지 않는다.

rich document는 AST node/list-item처럼 구조를 갖는다. Markdown/HTML/AST 변환에서 지원되지 않는 node, whitespace와 embedded asset 식별을 보존해야 한다. 출력 형식을 먼저 정한 뒤 native editor와 data storage를 연결한다.

## WebView 기반 접근

@10play/tentap-editor는 ready-made 기본 editor다. Quill/Lexical/Slate를 감싸는 custom WebView는 web editor의 확장성을 얻지만 native component를 editor 안에 직접 넣을 수 없고 message passing/mentions/images/keyboard bridge를 구현해야 한다. Expo DOM component도 web editor를 native 안에 넣는 같은 경계를 갖는다.

긴 content를 매 keystroke마다 전부 serialize해 JS↔WebView에 보내면 입력 지연이 커진다. editor를 uncontrolled로 유지하고 필요한 change/delta/최종 save를 보내는 흐름이 유리하다. native selection/context menu/IME UX의 차이를 실제 기기에서 확인한다.

## TextInput을 직접 확장할 때의 한계

nested styled TextInput도 callback은 plain string을 주므로 bold 'aa' 뒤 normal 'aa'에서 a를 추가한 string만으로 insertion format을 알 수 없다. onSelectionChange를 조합해도 newline/list marker 삽입이 selection을 바꿔 full editor 구현이 어렵다. source의 onTextChange 표현과 실제 RN onChangeText prop을 구분한다.

요구가 단순하면 visible Markdown marker와 별도 preview를 사용하거나 selected chunk만 raw marker로 보여주는 hybrid를 선택할 수 있다. native editor는 platform text UX, WebView는 web-only 기능, plain TextInput은 최소 formatting 요구에 적합하다. legacy markdown-editor의 미유지와 rn-text-editor beta 상태를 안정적인 범용 구현으로 소개하지 않는다.

## 출처

- [Expo Documentation, Edit rich text](https://docs.expo.dev/guides/editing-richtext)

## 관련 문서

- [[Expo-Integrations-Controlled-Input]]
- [[Expo-Integrations-Keyboard]]
- [[Expo-Integrations-Local-First]]
