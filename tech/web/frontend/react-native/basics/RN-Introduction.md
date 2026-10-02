---
tags: [react-native, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 시작과 문서 읽기"]
---

# React Native 시작과 문서 읽기

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 무엇을 개발하는가

React Native는 React로 UI를 선언하고 Android와 iOS의 네이티브 기능을 사용하는 앱 개발 프레임워크다. JavaScript 로직과 React 컴포넌트 조합을 재사용하되, 화면은 플랫폼에 맞는 네이티브 뷰로 구성한다.

웹 개발 경험을 가져올 수 있지만 React Native를 브라우저 DOM 위의 앱으로 이해하면 안 된다. DOM 태그와 브라우저 API 대신 Core Components와 React Native API를 사용한다. React, Android, iOS 경험은 도움이 되지만 입문 문서의 필수 전제는 JavaScript 기본 문법이다.

## 선행 지식과 읽는 순서

- 변수, 함수, 모듈 import/export, 객체와 배열, 조건식 등 JavaScript 기초를 먼저 이해한다.
- React가 처음이면 컴포넌트, JSX, props, state를 익힌다. 이미 React를 사용한다면 해당 설명을 복습하고 Core Components로 넘어간다.
- 첫 학습은 소개, Core Components, React 기초, 입력과 스크롤, 목록 순으로 연결된다.
- 개발 환경 설치는 Introduction과 다른 주제다. 새 프로젝트 생성과 네이티브 도구 설치는 환경 설정 문서를 따른다.
- 순서대로 읽는 방식과 필요한 기능만 찾아 읽는 방식 모두 가능하다. 플랫폼 전용 설명과 API의 플랫폼 배지를 함께 확인한다.

## Snack으로 동작을 탐색하기

Snack Player는 Expo가 제공하는 편집 가능한 React Native 예제 실행 도구다. 브라우저에서 예제를 수정하고 Android와 iOS 같은 플랫폼의 결과를 살펴볼 수 있다. 로컬 도구 설치를 끝내기 전에도 JSX와 컴포넌트 조합을 탐색할 수 있다.

```tsx
import {Text, View} from 'react-native';

const App = () => (
  <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
    <Text>Hello, React Native!</Text>
  </View>
);

export default App;
```

`View`는 자식을 배치하고 `Text`는 문자열을 표시한다. 스타일 객체에서 `flex`, `justifyContent`, `alignItems`를 바꾸면 컨테이너의 크기와 자식 배치를 비교할 수 있다.

Snack에서 되는 예제가 자체 네이티브 라이브러리, 권한, 릴리스 서명까지 검증한다는 뜻은 아니다. 제품 개발에서는 선택한 프레임워크와 프로젝트 환경에서 예제를 옮겨 실행하고 실제 기기 검증을 이어간다.

## 문서 표현과 확인 범위

Android, iOS, Web 탭에는 해당 배경을 가진 개발자를 위한 별도 설명이 있다. 한 탭의 비유를 모든 플랫폼의 동작 계약으로 확대하지 않는다. 메뉴 경로는 Android Studio > Preferences처럼 상위 메뉴에서 하위 메뉴로 읽는다.

시작 시점에는 화면을 하나 만들 수 있는지, 텍스트 수정이 렌더링에 반영되는지, 플랫폼별 차이를 어디서 확인하는지까지 익히면 된다. 네이티브 프로젝트 생성, 빌드와 배포는 별도의 단계다.

## 출처

- [React Native, Getting Started](https://reactnative.dev/docs/getting-started)

## 관련 문서

- [[RN-Core-Components]]
- [[RN-React-Fundamentals]]
- [[RN-Project-Setup]]
- [[Expo]]
