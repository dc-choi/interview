---
tags: [expo, react-native, app]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 범용 앱의 시작 구조와 학습 범위"]
---

# Expo 범용 앱의 시작 구조와 학습 범위

## 범용 앱 예제의 역할

StickerSmash는 Android/iOS/web에서 사진을 고르고 emoji sticker를 겹쳐 이동/확대한 뒤 결과를 저장하는 예제다. React component/state, Router, Flexbox, platform media UI, Modal/FlatList, gestures와 native/web capture의 경계를 연속된 기능으로 익힌다.

Learn은 직접 코드 작성, AI agent 지시, EAS build/update/submit, CI/CD 자동화의 네 흐름으로 나뉜다. 처음 앱 구현은 rendering/state/platform 동작을, EAS는 own native binary와 distribution을, CI/CD는 검증된 흐름의 재현 가능한 자동화를 다룬다. 예제 완료를 해당 전체 분야의 숙련으로 간주하지 않는다.

## SDK57 프로젝트 준비

Node.js LTS, terminal이 있는 macOS/Linux/Windows PowerShell 또는 WSL2, editor와 지원 device 환경이 필요하다. 직접 작성 tutorial은 React/TypeScript의 기본 이해를 전제로 한다.

```sh
npx create-expo-app@latest StickerSmash
# 생성기의 SDK 선택에서는 57 선택
cd StickerSmash
npm run reset-project
npx expo start
```

기본 template은 TypeScript, Expo CLI/Router와 platform support를 포함한다. tutorial asset archive의 images를 `assets/images`에 준비한다. reset script는 `src`의 boilerplate components/constants/hooks 등을 `example`로 옮기고 `src/app/index.tsx`, `_layout.tsx`를 남기는 현재 tutorial 경로다. Home next-steps의 과거 `app-example` 설명과 섞지 않고 actual generated script를 확인한다.

기기의 QR로 앱을 열고 `W`로 web을 연다. iOS 실기기의 Expo Go는 CLI와 같은 Expo 계정이 필요하며 설치 자체는 현재 environment guide의 SDK57 조건을 따른다. development build가 필요한 library는 Go로 우회하지 않는다.

## React Native 화면의 기초

View/Text는 DOM div/text 대신 native screen을 구성한다. styles는 JavaScript object와 StyleSheet로 정의하며 hex/RGBA/HSL/named colors를 사용할 수 있다. `flex: 1`은 부모의 남은 영역을 차지하고 alignItems/justifyContent는 cross/main axis alignment를 정한다.

```tsx
import { Text, View, StyleSheet } from 'react-native';

export default function Index() {
  return <View style={styles.container}><Text style={styles.text}>Home screen</Text></View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#25292e', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff' },
});
```

저장하면 연결된 앱에 Fast Refresh가 반영한다. 개발용 Tools button은 developer menu shortcut이며 production에 포함되지 않는다. menu의 Tools button 설정으로 숨겨도 shake/`M` 등 menu 접근은 남는다.

## 확인 순서

각 platform에서 초기 route, background/text style과 refresh를 확인한 뒤 navigation과 image flow를 추가한다. browser에서 보였다는 것만으로 device permission/native behavior를 확인했다고 판단하지 않는다. 실행하지 않은 상태의 예제 문서는 실제 검증 완료 기록이 아니다.

## 출처

- [Expo Documentation, Overview of Expo and EAS tutorials](https://docs.expo.dev/tutorial/overview)
- [Expo Documentation, Tutorial: Using React Native and Expo](https://docs.expo.dev/tutorial/introduction)
- [Expo Documentation, Create your first app](https://docs.expo.dev/tutorial/create-your-first-app)

## 관련 문서

- [[Expo-Learn-App-Navigation]]
- [[Expo-Home-Environment]]
