---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["기존 React Native 앱의 Expo Modules 설치"]
---

# 기존 React Native 앱의 Expo Modules 설치

## 자동 설치와 수동 통합

```sh
npx install-expo-modules@latest
```

installer는 expo package와 native infrastructure를 연결한다. 기본 React Native template와 크게 다른 앱은 자동 patch가 실패할 수 있으며 현재 custom project에 수동 통합이 필요하다. SDK57 수동 안내는 RN0.86, iOS deployment target16.4 기준이다. 이전 RN에 최신 native diff를 그대로 적용하지 않는다.

expo는 Modules API와 autolinking 기반을 제공한다. 이후 `expo install <package>`로 호환 SDK dependency를 추가할 수 있지만 native integration과 pods가 완료돼야 runtime에서 사용 가능하다.

## native와 bundling 책임

Android는 Expo/RN Gradle plugin, autolinking과 Application/Activity integration을 template와 대조한다. iOS Podfile에 Expo autolinking/use_expo_modules!를 연결하고 AppDelegate의 Expo delegate 처리를 포함한다. 필요한 delegate methods는 SDK57 template의 실제 파일과 비교한다.

```sh
npx pod-install
npx expo run:ios
```

Babel은 `babel-preset-expo`, Metro는 `expo/metro-config`를 사용하고 Android/iOS의 JS embed command를 Expo CLI에 맞춘다. 이 설정은 package.json main과 Router, environment variable/Expo asset 처리에 필요하다.

## iOS bundle phase 계약

Xcode의 Bundle React Native code and images 단계는 `.xcode.env`, `.xcode.env.local`을 읽어 Node를 결정한다. PROJECT_ROOT는 JS project root이고 Debug는 SKIP_BUNDLING을 켠다. ENTRY_FILE은 `expo/scripts/resolveAppEntry`로 해석하며 CLI_PATH는 `@expo/cli`, BUNDLE_COMMAND는 `export:embed`를 사용해 react-native-xcode.sh로 embed한다.

Debug AppDelegate는 `index` 대신 `.expo/.virtual-metro-entry`를 요청해 package main을 따른다. Release는 binary의 `main.jsbundle`을 읽는다. custom root에서 Node package resolution과 PROJECT_ROOT를 함께 맞춘다.

## 실행 확인과 기본 dependency

`expo-constants`를 설치해 native build에서 `Constants.systemFonts` 등의 값을 읽으면 module linking 확인에 도움이 된다. source import 성공만으로 native installation을 확인하지 않는다.

expo dependency에는 asset, constants, file-system, font와 keep-awake 기반이 포함된다. font는 dev-client/vector-icons 요구를 확인하고 keep-awake는 개발용 선택적 module이다. 사용하지 않는 native module은 package.json의 `expo.autolinking.exclude:["expo-keep-awake"]` 등으로 제외할 수 있다. JS에서 계속 호출하거나 dependent module이 필요로 하는 module을 제외하면 runtime 오류가 생긴다.

일부 web 문서의 수동 native diff는 interactive UI로 제공되므로 실제 적용에서는 지정 SDK의 template/upgrade diff를 확인한다. 빈 heading만 있는 추출 text를 전체 native patch로 간주하지 않는다.

## 출처

- [Expo Documentation, Install Expo modules in an existing React Native project](https://docs.expo.dev/bare/installing-expo-modules)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
