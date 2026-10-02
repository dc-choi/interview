---
tags: [expo, react-native, ui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 시작 화면과 앱 아이콘"]
---

# Expo 시작 화면과 앱 아이콘

## 시작 화면 구성과 검증

Splash screen은 native 앱 시작부터 content 준비까지 표시되는 launch UI다. `expo-splash-screen` config plugin으로 image/background/dark variant를 구성하고 runtime API로 숨기는 시점을 제어한다. font/data 준비를 기다릴 때 자동 숨김을 막고 성공 또는 오류 종료 경로에서 해제한다.

Splash image는 PNG가 필요하며 1024x1024 투명 이미지를 권장한다. 앱 아이콘과 달리 splash image의 투명 배경은 허용되는 설계다.

```json
{
  "expo": {
    "plugins": [["expo-splash-screen", {
      "image": "./assets/images/splash-icon.png",
      "backgroundColor": "#232323",
      "imageWidth": 200,
      "dark": { "image": "./assets/images/splash-dark.png", "backgroundColor": "#000000" }
    }]]
  }
}
```

plugin의 `android`/`ios` 하위 옵션으로 플랫폼별 image, backgroundColor, imageWidth/resizeMode 등을 설정할 수 있다. app config 변경은 Prebuild를 통해 native 프로젝트에 적용해야 한다. native 파일을 수동 관리하는 프로젝트는 라이브러리 설치 문서에 따라 직접 적용한다.

실제 시작 화면은 preview/production build에서 검증한다. Expo Go는 app icon을 표시하고 dev-client도 자체 splash를 포함해 결과가 다를 수 있다. SDK52 이하 iOS launch cache 이슈의 `npx expo run:ios --no-build-cache`를 SDK57 공통 필수 단계로 만들지 않는다.

## 앱 아이콘 우선순위

공통 `expo.icon`은 PNG 파일을 가리킨다. `ios.icon`, `android.icon`, Android adaptive icon은 플랫폼별 구성을 제공한다. generated Expo 프로젝트는 build 도구가 필요한 크기를 생성하지만 native 프로젝트를 수동 관리하면 각 크기 resource를 직접 준비할 수 있다.

```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/icon-foreground.png",
        "backgroundColor": "#ffffff",
        "monochromeImage": "./assets/images/icon-monochrome.png"
      }
    },
    "ios": { "icon": "./assets/app.icon" }
  }
}
```

## Android adaptive icon

foreground와 background layer를 OS가 다양한 mask 모양으로 조합한다. backgroundImage를 쓰면 foreground와 동일한 치수를 준비한다. Android13 이상 themed icon에는 monochromeImage를 제공한다. adaptiveIcon 설정은 일반 Android icon 설정보다 우선하며 구형 기기용 `android.icon`도 준비할 수 있다.

launcher mask와 wallpaper에 따라 잘리는 영역을 확인하고 Android의 adaptive icon design 범위를 지킨다. 최소 크기 안내만으로 모든 adaptive layout 계약을 충족했다고 판단하지 않는다.

## iOS PNG와 Icon Composer

SDK54 이상은 Icon Composer가 만든 `.icon` 디렉터리를 `ios.icon`으로 지정할 수 있다. dark appearance 등은 Composer에서 구성하므로 PNG variants를 중복 제공할 필요가 없다.

PNG 방식도 지원한다. 정확한 정사각형의 1024x1024를 권장하며 rounded corner나 transparent pixels를 직접 넣지 않는다. OS가 mask를 적용한다. `ios.icon` 객체에 `light`, `dark`, `tinted` 경로를 지정하면 공통 icon보다 우선한다. splash와 app icon의 투명도 요구를 혼동하지 않는다.

## 출처

- [Expo Documentation, Splash screen and app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon)

## 관련 문서

- [[Expo-Home-Fonts]]
- [[Expo-Home-Release-Build]]
