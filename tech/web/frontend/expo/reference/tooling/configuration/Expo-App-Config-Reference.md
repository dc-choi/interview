---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo app config 공통 필드"]
---

# Expo app config 공통 필드

## 설정 경계

정적 app.json/app.config.json에서는 `expo` 아래에 설정을 둔다. 동적 app.config.js/app.config.ts에서는 객체를 만들며 환경 변수를 평가할 수 있다. 네이티브 설정은 Prebuild/config plugin 또는 수동 native project 변경과 빌드를 통해 반영된다. JS에서 값을 읽는 것과 설치된 바이너리 설정이 바뀌는 것은 다르다.

```js
export default {
  expo: {
    name: 'Example', slug: 'example', version: '1.0.0',
    scheme: 'example', runtimeVersion: { policy: 'fingerprint' },
    ios: { bundleIdentifier: 'com.example.app' },
    android: { package: 'com.example.app' },
  },
};
```

## 식별과 버전

`name`은 표시 이름, `description`은 앱 설명, `slug`는 계정 내 URL용 프로젝트 이름, `owner`는 소유 계정이다. owner 생략 시 현재 사용자 계정을 사용한다. `currentFullName`과 `originalFullName`은 자동 생성하므로 직접 설정하지 않는다. 전자는 계정 이동/이름 변경에 따라 바뀔 수 있고 후자는 기존 서비스 식별에 사용된다.

`sdkVersion`은 package.json의 Expo 버전과 맞아야 한다. `version`은 iOS의 CFBundleShortVersionString과 Android의 versionName에 대응한다. `ios.buildNumber`와 `android.versionCode`는 별도 빌드 식별자다.

`runtimeVersion`은 네이티브 코드와 OTA update의 호환성 식별자다. 명시 문자열 또는 `nativeVersion`, `sdkVersion`, `appVersion`, `fingerprint` policy를 쓴다. 플랫폼별 runtimeVersion을 지정하면 공통 값을 덮어쓴다. 표시 버전과 runtime 정책의 변경 조건을 혼동하지 않는다.

## 화면과 실행 대상

`platforms` 기본값은 ios/android이며 react-dom 설치 시 web도 기본 포함된다. `orientation`은 default/portrait/landscape다. `userInterfaceStyle`은 light/dark/automatic이며 기본 light다. Android에서 이 설정은 expo-system-ui가 필요하다.

`backgroundColor`는 React View 뒤의 root 색이며 iOS에는 expo-system-ui가 필요하다. 플랫폼별 색이 공통 값을 덮어쓴다. `primaryColor`는 Android multitasker 색이다. `icon`은 공통 앱 아이콘이며 1024 × 1024 PNG를 권장한다. 플랫폼별 icon이 우선한다.

`scheme`은 소문자로 시작하는 URL scheme 또는 배열이며 build-time 설정이다. Expo Go에는 효과가 없다. 플랫폼별 scheme은 공통 scheme과 합쳐진다. `developmentClient.silentLaunch`는 development client의 추가 안내를 숨기는 설정이다.

## 추가 설정과 native 반영

`extra`는 `Constants.expoConfig.extra`로 앱에 노출된다. 공개 가능한 설정만 넣는다. `locales`는 권한 대화상자와 지역화 문자열을 구성하며 ios/android별 문자열을 나눌 수 있다. `plugins`는 Prebuild 과정에 적용할 config plugin 목록이다. 일반 앱 실행 중에 native 파일을 변경하는 plugin 목록이 아니다.

`githubUrl`은 프로젝트 페이지의 공개 소스 링크다. `buildCacheProvider`는 원격 빌드 캐시 provider이며 이전 `experiments.buildCacheProvider`를 대신한다. `_internal.pluginHistory`는 도구 내부의 실행 기록이므로 앱 기능 설정처럼 직접 관리하지 않는다.

`androidStatusBar`는 deprecated다. 새 구성에는 expo-status-bar plugin을 확인하고 edge-to-edge와 SDK별 제한을 따로 검토한다. 스키마에 남은 legacy 필드의 존재만으로 현재 플랫폼에서 효력이 있다고 판단하지 않는다.

세부 설정은 [[Expo-App-Config-Platforms]], [[Expo-App-Config-Updates-Web]]에서 이어진다.

## 출처

- [Expo Documentation, app.json / app.config.js](https://docs.expo.dev/versions/latest/config/app)

## 관련 문서

- [[Expo-Configuration-Reference]]

- [[Expo]]
