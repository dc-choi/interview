---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["기존 React Native 앱의 Expo Prebuild 채택"]
---

# 기존 React Native 앱의 Expo Prebuild 채택

## 채택 범위와 선행 조건

Prebuild 채택은 단순 Expo package 설치와 다르다. 기존 `android/ios` 사용자 정의를 config와 plugin으로 옮겨 재생성 가능한 상태를 만드는 작업이다. React Native 버전은 대응 Expo SDK가 있는 조합이어야 한다. 신규 프로젝트보다 native custom 변경이 많은 앱에서 이관 비용이 커진다.

## entry와 도구 구성

호환 `expo` 버전을 설치한 뒤 root registration을 바꾼다.

```ts
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

`AppRegistry.registerComponent`와 app name을 직접 등록하던 방식 대신 Expo registration을 사용한다. Metro는 Expo config를 기반으로 구성하고 package scripts는 Expo run/start로 연결한다. Prebuild는 `expo-modules-core` native linking도 추가한다.

## 사용자 정의 이관 순서

1. 기존 native 파일/설정의 변경을 Git에 보존하고 inventory를 만든다.
2. name, icon, splash 등 built-in app config로 표현할 수 있는 값을 이동한다.
3. 라이브러리별 추가 native 설정은 package plugin 또는 검증한 community plugin으로 표현한다.
4. 나머지 설정은 local config plugin, 코드는 local native module에 옮긴다.
5. 생성 결과를 이전 native 요구사항과 비교한다.

Expo Tools의 Preview Modifier는 native 파일별 plugin 결과를 조사하는 보조 수단이다. 생성이 성공했다는 사실이 모든 custom 동작 보존을 뜻하지 않는다.

```sh
npx expo prebuild --clean
npx expo run:android
npx expo run:ios
```

clean은 기존 native 폴더를 삭제하므로 이전 요구사항의 이관 전에 실행하지 않는다. 이후 생성 폴더와 `.expo`는 local/generated 데이터로 제외하고 top-level `expo` 바깥의 불사용 설정도 정리한다.

## 채택 뒤의 선택

EAS Build, EAS Update, web과 dev-client는 독립적으로 추가할 수 있다. 이관을 끝내지 못한 native 앱도 Expo Modules/CLI를 수동 통합해 사용할 수 있으므로 Prebuild를 강제로 먼저 채택할 필요는 없다.

## 출처

- [Expo Documentation, Adopt Prebuild](https://docs.expo.dev/guides/adopting-prebuild)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
