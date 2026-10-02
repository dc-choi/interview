---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Text의 중첩, 줄바꿈과 글꼴 확대

React Native 0.87 기준이다.

## Text 안의 layout

Text는 문자열을 담고, 중첩 Text의 범위별 style을 native attributed text로 표현한다. View 자식은 Flexbox block이지만 Text 안은 inline text flow와 줄바꿈을 따른다. 문자열을 View 바로 아래에 두지 않는다.

fontFamily 등 상속은 Text subtree 안에서 제한적으로 일어난다. root View에 font를 줘 앱 전체에 상속시키는 CSS 방식은 아니다. 공통 text component에서 기본 style과 props를 전달하고 필요한 곳에서 중첩 override한다. fontFamily는 CSS fallback 목록이 아니라 단일 이름이다.

## 길이와 확대

numberOfLines=0은 줄 제한을 해제한다. ellipsizeMode는 제한과 함께 동작하며 Android 여러 줄에서는 tail만 올바르게 동작하는 조건을 확인한다. adjustsFontSizeToFit/minimumFontScale은 공간에 맞춰 줄이는 정책이고 allowFontScaling/maxFontSizeMultiplier는 접근성 확대 정책이다. 사용자 큰 글꼴을 임의로 끄는 것과 구분한다.

iOS dynamicTypeRamp, lineBreakStrategyIOS와 Android hyphenation/textBreakStrategy는 플랫폼별 배치 정책이다. 한글 어절, 작은 화면과 큰 글꼴로 잘림을 확인한다.

## 선택과 event

selectable은 native copy/paste를 허용하고 selectionColor, iOS suppressHighlighting은 선택/누름 feedback에 영향을 준다. onPress/In/Out/LongPress와 responder callback, 접근성 action을 구성할 수 있다. id/nativeID, role/accessibilityRole의 우선순위는 다른 core view와 맞춘다.

onTextLayout은 `nativeEvent.lines`로 각 줄의 x/y/width/height, ascender/descender/capHeight/xHeight를 제공한다. onLayout의 container rectangle과 같은 값은 아니다. ref는 raw text node가 아니라 element이며 text node는 childNodes로 접근한다.

## 출처

- [React Native, text](https://reactnative.dev/docs/text)

## 관련 문서

- [[RN-Native-Nodes]]
- [[RN-Text-Input]]
- [[RN-Accessibility]]
